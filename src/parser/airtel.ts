/**
 * Airtel Money Message Parser
 * 
 * Parses Airtel Money message formats and extracts transaction details.
 * Structure similar to M-Pesa but with different message formats.
 */

import type { ParseResult, ParsedTransaction, TransactionType, Counterparty } from './types';

/**
 * Regex patterns for Airtel Money message parsing
 */
const PATTERNS = {
    // Transaction ID - Airtel uses different format
    transactionId: /(?:Transaction\s+ID|TxnId|Ref)[:.]?\s*([A-Z0-9]{10,20})/i,

    // Amount patterns
    amount: /(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)/i,
    amountReceived: /received\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)/i,
    amountSent: /sent\s+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)/i,

    // Balance
    balance: /(?:balance|bal)[:\s]+(?:KES|Ksh)\.?\s*([\d,]+(?:\.\d{2})?)/i,

    // Date and time
    dateTime: /on\s+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(?:at\s+)?(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)/i,

    // Counterparty
    phoneNumber: /(?:0|\+?254)(\d{9})/,
    fromName: /from\s+([A-Za-z\s]+?)(?:\s+on|\s+KES|\s+Ksh)/i,
    toName: /to\s+([A-Za-z\s]+?)(?:\s+on|\s+KES|\s+Ksh)/i,

    // Type detection
    isReceived: /(?:received|credited)/i,
    isSent: /(?:sent|transferred|debited)/i,
    isWithdraw: /(?:withdraw|withdrawn|cash\s+out)/i,
};

/**
 * Parse amount string to number
 */
function parseAmount(amountStr: string): number {
    const cleaned = amountStr.replace(/[,\s]/g, '');
    const amount = parseFloat(cleaned);
    return isNaN(amount) ? 0 : amount;
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string, timeStr: string): Date {
    const dateParts = dateStr.split(/[\/\-]/);
    const day = parseInt(dateParts[0] ?? '1', 10);
    const month = parseInt(dateParts[1] ?? '1', 10);
    let year = parseInt(dateParts[2] ?? '2024', 10);

    if (year < 100) {
        year = year > 50 ? 1900 + year : 2000 + year;
    }

    let hours = 0;
    let minutes = 0;

    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?/i);
    if (timeMatch) {
        hours = parseInt(timeMatch[1] ?? '0', 10);
        minutes = parseInt(timeMatch[2] ?? '0', 10);

        const meridiem = timeMatch[4];
        if (meridiem) {
            if (meridiem.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            } else if (meridiem.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
        }
    }

    return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Detect transaction type from message
 */
function detectTransactionType(message: string): TransactionType {
    if (PATTERNS.isReceived.test(message)) return 'received';
    if (PATTERNS.isWithdraw.test(message)) return 'withdraw';
    if (PATTERNS.isSent.test(message)) return 'sent';
    return 'received';
}

/**
 * Extract counterparty information
 */
function extractCounterparty(message: string, type: TransactionType): Counterparty {
    const counterparty: Counterparty = {};

    const phoneMatch = message.match(PATTERNS.phoneNumber);
    if (phoneMatch?.[1]) {
        counterparty.phone = `0${phoneMatch[1]}`;
    }

    if (type === 'received') {
        const nameMatch = message.match(PATTERNS.fromName);
        if (nameMatch?.[1]) {
            counterparty.name = nameMatch[1].trim();
        }
    } else {
        const nameMatch = message.match(PATTERNS.toName);
        if (nameMatch?.[1]) {
            counterparty.name = nameMatch[1].trim();
        }
    }

    return counterparty;
}

/**
 * Calculate parser confidence
 */
function calculateConfidence(transaction: Partial<ParsedTransaction>): number {
    let score = 0;

    if (transaction.transactionCode) score += 0.25;
    if (transaction.amount && transaction.amount > 0) score += 0.25;
    if (transaction.dateTime) score += 0.2;
    if (transaction.counterparty?.name || transaction.counterparty?.phone) score += 0.15;
    if (transaction.balance !== undefined) score += 0.1;
    if (transaction.type) score += 0.05;

    return Math.round(score * 100) / 100;
}

/**
 * Parse an Airtel Money message
 */
export function parseAirtelMessage(message: string): ParseResult {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
        return {
            success: false,
            error: 'Empty message provided',
        };
    }

    // Extract transaction ID
    const idMatch = trimmedMessage.match(PATTERNS.transactionId);
    if (!idMatch?.[1]) {
        return {
            success: false,
            error: 'Could not find transaction ID. Message may not be a valid Airtel Money confirmation.',
        };
    }

    const transactionCode = idMatch[1];
    const type = detectTransactionType(trimmedMessage);

    // Extract amount
    let amountMatch: RegExpMatchArray | null = null;
    if (type === 'received') {
        amountMatch = trimmedMessage.match(PATTERNS.amountReceived);
    } else if (type === 'sent') {
        amountMatch = trimmedMessage.match(PATTERNS.amountSent);
    }

    if (!amountMatch) {
        amountMatch = trimmedMessage.match(PATTERNS.amount);
    }

    const amount = amountMatch?.[1] ? parseAmount(amountMatch[1]) : 0;

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
        dateTime = new Date();
    }

    // Extract balance
    const balanceMatch = trimmedMessage.match(PATTERNS.balance);
    const balance = balanceMatch?.[1] ? parseAmount(balanceMatch[1]) : undefined;

    // Extract counterparty
    const counterparty = extractCounterparty(trimmedMessage, type);

    const transaction: ParsedTransaction = {
        transactionCode,
        amount,
        currency: 'KES',
        type,
        counterparty,
        dateTime,
        balance,
        rawMessage: trimmedMessage,
        source: 'airtel',
        confidence: 0,
    };

    transaction.confidence = calculateConfidence(transaction);

    const needsVerification: (keyof ParsedTransaction)[] = [];
    if (!dateTimeMatch) needsVerification.push('dateTime');
    if (!counterparty.name && !counterparty.phone) needsVerification.push('counterparty');

    return {
        success: true,
        transaction,
        needsVerification: needsVerification.length > 0 ? needsVerification : undefined,
    };
}

/**
 * Check if a message looks like an Airtel Money message
 */
export function isAirtelMessage(message: string): boolean {
    const trimmed = message.trim().toLowerCase();
    return trimmed.includes('airtel') && PATTERNS.transactionId.test(message.trim());
}
