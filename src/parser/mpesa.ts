/**
 * M-Pesa Message Parser
 * 
 * Parses various M-Pesa message formats and extracts transaction details.
 * All parsing happens client-side for privacy.
 */

import type { ParseResult, ParsedTransaction, TransactionType, Counterparty } from './types';

/**
 * Regex patterns for M-Pesa message parsing
 * These cover the main message formats used in Kenya
 */
const PATTERNS = {
    // Transaction code - always at the start (e.g., "DT85TH896", "QFK3R5U7X8")
    transactionCode: /^([A-Z0-9]{8,10})\s+Confirmed/i,

    // Amount patterns
    amountReceived: /received\s+Ksh?([\d,]+(?:\.\d{2})?)/i,
    // FIX: M-Pesa format is "Ksh733.88 sent to NAME" not "sent to NAME Ksh733.88"
    amountSent: /Ksh?([\d,]+(?:\.\d{2})?)\s+sent\s+to/i,
    amountPaid: /paid\s+to\s+.+?\s+Ksh?([\d,]+(?:\.\d{2})?)/i,
    // NEW: Handle format "Ksh120.00 paid to NAME"
    amountPaidBefore: /Ksh?([\d,]+(?:\.\d{2})?)\s+paid\s+to/i,
    amountWithdrawn: /(?:withdraw|withdrawn)\s+Ksh?([\d,]+(?:\.\d{2})?)/i,
    amountGeneric: /Ksh?([\d,]+(?:\.\d{2})?)/i,

    // Balance after transaction
    balance: /(?:New\s+)?(?:M-PESA\s+)?balance\s+is\s+Ksh?([\d,]+(?:\.\d{2})?)/i,

    // Transaction cost
    transactionCost: /Transaction\s+cost[,:]?\s*Ksh?([\d,]+(?:\.\d{2})?)/i,

    // Date and time patterns
    dateTime: /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*(?:AM|PM)?)/i,

    // Counterparty patterns
    receivedFrom: /from\s+([A-Za-z0-9\s\-\.]+?)(?:\s+on\s+|\s+New)/i,
    sentTo: /sent\s+to\s+([A-Za-z0-9\s\-\.]+?)\s+(?:\d+\s+)?(?:for|on|Ksh)/i,
    // NEW: Handle "paid to NAME." pattern - capture name before period or 'on'
    paidTo: /paid\s+to\s+([A-Za-z0-9\s\-\.]+?)(?:\.|,)?\s+(?:on|for|New|at)/i,
    phoneNumber: /(?:0|\+?254)(\d{9})/,
    paybillNumber: /(?:Paybill|Business)\s+(?:number\s+)?(\d{5,7})/i,
    tillNumber: /(?:Till|Buy\s+Goods)\s+(?:number\s+)?(\d{5,8})/i,
    accountNumber: /Account\s+(?:Number|No\.?)?\s*:?\s*([A-Za-z0-9]+)/i,

    // Type detection
    isReceived: /you\s+have\s+received/i,
    isSent: /sent\s+to/i,
    isPaidTo: /paid\s+to/i,
    isPaybill: /(?:pay\s+bill|paybill|paid\s+to.*?paybill)/i,
    // Only match buy_goods if it has 'Till number' or 'Buy Goods' context, not just 'till' anywhere
    isBuyGoods: /(?:buy\s+goods|till\s+number|paid\s+to.*?till\s+number)/i,
    isWithdraw: /(?:withdraw|withdrawn)/i,
    isDeposit: /(?:deposit|deposited)/i,
    isAirtime: /(?:airtime|bought.*?worth)/i,
};

/**
 * Parse amount string to number
 * Handles formats like "3,500.00" or "3500"
 */
function parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
}

/**
 * Parse date string to Date object
 * Handles formats like "31/7/13" or "25/12/2023"
 */
function parseDate(dateStr: string, timeStr: string): Date {
    const parts = dateStr.split('/').map(Number);
    const day = parts[0] ?? 1;
    const month = parts[1] ?? 1;
    const year = parts[2] ?? 2024;

    // Handle 2-digit years
    const fullYear = year < 100 ? (year > 50 ? 1900 + year : 2000 + year) : year;

    // Parse time
    let hours = 0;
    let minutes = 0;

    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
        hours = parseInt(timeMatch[1] ?? '0', 10);
        minutes = parseInt(timeMatch[2] ?? '0', 10);

        const meridiem = timeMatch[3];
        if (meridiem) {
            if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
        }
    }

    return new Date(fullYear, month - 1, day, hours, minutes);
}

/**
 * Detect transaction type from message content
 */
function detectTransactionType(message: string): TransactionType {
    if (PATTERNS.isReceived.test(message)) return 'received';
    if (PATTERNS.isPaybill.test(message)) return 'paybill';
    if (PATTERNS.isBuyGoods.test(message)) return 'buy_goods';
    if (PATTERNS.isWithdraw.test(message)) return 'withdraw';
    if (PATTERNS.isDeposit.test(message)) return 'deposit';
    if (PATTERNS.isAirtime.test(message)) return 'airtime';
    if (PATTERNS.isSent.test(message)) return 'sent';
    if (PATTERNS.isPaidTo.test(message)) return 'sent'; // 'paid to' without paybill/till context = person-to-person

    return 'received'; // Default fallback
}

/**
 * Extract counterparty information from message
 */
function extractCounterparty(message: string, type: TransactionType): Counterparty {
    const counterparty: Counterparty = {};

    // Extract phone number
    const phoneMatch = message.match(PATTERNS.phoneNumber);
    if (phoneMatch?.[1]) {
        counterparty.phone = `0${phoneMatch[1]}`;
    }

    // Extract business identifiers
    if (type === 'paybill') {
        const paybillMatch = message.match(PATTERNS.paybillNumber);
        if (paybillMatch?.[1]) {
            counterparty.identifier = paybillMatch[1];
        }
    } else if (type === 'buy_goods') {
        const tillMatch = message.match(PATTERNS.tillNumber);
        if (tillMatch?.[1]) {
            counterparty.identifier = tillMatch[1];
        }
    }

    // Extract name based on transaction type
    if (type === 'received') {
        const fromMatch = message.match(PATTERNS.receivedFrom);
        if (fromMatch?.[1]) {
            counterparty.name = fromMatch[1].trim();
        }
    } else if (type === 'sent' || type === 'paybill' || type === 'buy_goods') {
        // All outgoing payment types - try to extract recipient name
        // Try 'sent to' pattern first
        let toMatch = message.match(PATTERNS.sentTo);
        if (toMatch?.[1]) {
            counterparty.name = toMatch[1].trim();
        } else {
            // Try 'paid to' pattern
            toMatch = message.match(PATTERNS.paidTo);
            if (toMatch?.[1]) {
                counterparty.name = toMatch[1].trim();
            }
        }
    }

    return counterparty;
}

/**
 * Extract transaction amount based on type
 */
function extractAmount(message: string, type: TransactionType): number {
    let match: RegExpMatchArray | null = null;

    switch (type) {
        case 'received':
            match = message.match(PATTERNS.amountReceived);
            break;
        case 'sent':
            // Try 'Ksh X paid to' format first (more specific)
            match = message.match(PATTERNS.amountPaidBefore);
            if (!match) {
                match = message.match(PATTERNS.amountSent);
            }
            if (!match) {
                match = message.match(PATTERNS.amountPaid);
            }
            break;
        case 'paybill':
        case 'buy_goods':
            match = message.match(PATTERNS.amountPaidBefore);
            if (!match) {
                match = message.match(PATTERNS.amountPaid);
            }
            break;
        case 'withdraw':
            match = message.match(PATTERNS.amountWithdrawn);
            break;
        default:
            match = message.match(PATTERNS.amountGeneric);
    }

    if (!match) {
        match = message.match(PATTERNS.amountGeneric);
    }

    return match?.[1] ? parseAmount(match[1]) : 0;
}

/**
 * Calculate parser confidence based on extracted fields
 */
function calculateConfidence(transaction: Partial<ParsedTransaction>): number {
    let score = 0;
    const weights = {
        transactionCode: 0.25,
        amount: 0.25,
        dateTime: 0.2,
        counterparty: 0.15,
        balance: 0.1,
        type: 0.05,
    };

    if (transaction.transactionCode) score += weights.transactionCode;
    if (transaction.amount && transaction.amount > 0) score += weights.amount;
    if (transaction.dateTime) score += weights.dateTime;
    if (transaction.counterparty?.name || transaction.counterparty?.phone || transaction.counterparty?.identifier) {
        score += weights.counterparty;
    }
    if (transaction.balance !== undefined) score += weights.balance;
    if (transaction.type) score += weights.type;

    return Math.round(score * 100) / 100;
}

/**
 * Parse an M-Pesa message and extract transaction details
 * 
 * @param message - The raw M-Pesa SMS message text
 * @returns ParseResult with success status and extracted data
 */
export function parseMpesaMessage(message: string): ParseResult {
    const trimmedMessage = message.trim();

    // Check for empty message
    if (!trimmedMessage) {
        return {
            success: false,
            error: 'Empty message provided',
        };
    }

    // Extract transaction code (required)
    const codeMatch = trimmedMessage.match(PATTERNS.transactionCode);
    if (!codeMatch?.[1]) {
        return {
            success: false,
            error: 'Could not find transaction code. Message may not be a valid M-Pesa confirmation.',
        };
    }

    const transactionCode = codeMatch[1];

    // Detect transaction type
    const type = detectTransactionType(trimmedMessage);

    // Extract amount
    const amount = extractAmount(trimmedMessage, type);
    if (amount <= 0) {
        return {
            success: false,
            error: 'Could not extract transaction amount',
        };
    }

    // Extract date and time
    const dateTimeMatch = trimmedMessage.match(PATTERNS.dateTime);
    let dateTime: Date;

    if (dateTimeMatch?.[1] && dateTimeMatch?.[2]) {
        dateTime = parseDate(dateTimeMatch[1], dateTimeMatch[2]);
    } else {
        // Use current date if not found, but flag for verification
        dateTime = new Date();
    }

    // Extract balance
    const balanceMatch = trimmedMessage.match(PATTERNS.balance);
    const balance = balanceMatch?.[1] ? parseAmount(balanceMatch[1]) : undefined;

    // Extract transaction cost
    const costMatch = trimmedMessage.match(PATTERNS.transactionCost);
    const transactionCost = costMatch?.[1] ? parseAmount(costMatch[1]) : undefined;

    // Extract counterparty
    const counterparty = extractCounterparty(trimmedMessage, type);

    // Build transaction object
    const transaction: ParsedTransaction = {
        transactionCode,
        amount,
        currency: 'KES',
        type,
        counterparty,
        dateTime,
        balance,
        transactionCost,
        rawMessage: trimmedMessage,
        source: 'mpesa',
        confidence: 0,
    };

    // Calculate confidence
    transaction.confidence = calculateConfidence(transaction);

    // Determine fields needing verification
    const needsVerification: (keyof ParsedTransaction)[] = [];

    if (!dateTimeMatch) needsVerification.push('dateTime');
    if (!counterparty.name && !counterparty.phone && !counterparty.identifier) {
        needsVerification.push('counterparty');
    }
    if (transaction.confidence < 0.7) {
        needsVerification.push('amount');
    }

    return {
        success: true,
        transaction,
        needsVerification: needsVerification.length > 0 ? needsVerification : undefined,
    };
}

/**
 * Check if a message looks like an M-Pesa message
 */
export function isMpesaMessage(message: string): boolean {
    const trimmed = message.trim().toLowerCase();
    return (
        (trimmed.includes('m-pesa') || trimmed.includes('mpesa')) &&
        PATTERNS.transactionCode.test(message.trim())
    );
}
