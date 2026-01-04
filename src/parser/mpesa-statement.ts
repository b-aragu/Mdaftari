/**
 * M-Pesa Statement Parser
 * 
 * Parses M-Pesa PDF statements to extract transactions
 */

import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface StatementTransaction {
    receiptNo: string;
    date: Date;
    details: string;
    counterparty: string;
    type: 'received' | 'sent' | 'paybill' | 'buygoods' | 'withdrawal' | 'deposit' | 'other';
    paidIn: number;
    paidOut: number;
    balance: number;
    selected?: boolean;
    expectedAmount?: number;
}

export interface ParsedStatement {
    customerName: string;
    phoneNumber: string;
    periodStart: Date;
    periodEnd: Date;
    transactions: StatementTransaction[];
    summary: {
        totalPaidIn: number;
        totalPaidOut: number;
    };
}

/**
 * Parse M-Pesa PDF statement
 * @param file - PDF file to parse
 * @param password - Optional password (usually National ID for M-Pesa statements)
 */
export async function parseMpesaStatement(file: File, password?: string): Promise<ParsedStatement> {
    const arrayBuffer = await file.arrayBuffer();

    try {
        const pdf = await pdfjsLib.getDocument({
            data: arrayBuffer,
            password: password || undefined,
        }).promise;

        let fullText = '';

        // Extract text from all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(' ');
            fullText += pageText + '\n';
        }

        return parseStatementText(fullText);
    } catch (error: any) {
        // Check if it's a password error
        if (error.name === 'PasswordException') {
            throw new Error('PASSWORD_REQUIRED');
        }
        throw error;
    }
}

/**
 * Parse extracted text into structured data
 */
function parseStatementText(text: string): ParsedStatement {
    const transactions: StatementTransaction[] = [];

    // Extract header info
    const phoneMatch = text.match(/(?:Mobile|Phone)[:\s]*(\d{10,12})/i);
    const nameMatch = text.match(/(?:Name|Customer)[:\s]*([A-Z\s]+)/i);
    const periodMatch = text.match(/(\d{1,2}\s+\w+\s+\d{4})\s*[-–to]+\s*(\d{1,2}\s+\w+\s+\d{4})/i);

    // Transaction patterns - M-Pesa format
    // Receipt No pattern: typically starts with letters followed by numbers
    const receiptPattern = /([A-Z]{2,4}[A-Z0-9]{6,10})/g;

    // Date pattern: DD/MM/YYYY HH:MM:SS or similar
    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AP]M)?)/gi;

    // Amount pattern: numbers with optional commas and decimals
    const amountPattern = /(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;

    // Split text into lines and look for transaction rows
    const lines = text.split(/\n|\r/);

    for (const line of lines) {
        const receiptMatch = line.match(/([A-Z]{2,4}[A-Z0-9]{6,10})/);
        if (!receiptMatch) continue;

        const receiptNo = receiptMatch[1];

        // Try to extract date
        const dateMatch = line.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(\d{1,2}:\d{2})/);
        let date = new Date();
        if (dateMatch) {
            const dateParts = dateMatch[1].split(/[\/\-]/);
            const timeParts = dateMatch[2].split(':');
            // Assume DD/MM/YYYY format
            date = new Date(
                parseInt(dateParts[2]) < 100 ? 2000 + parseInt(dateParts[2]) : parseInt(dateParts[2]),
                parseInt(dateParts[1]) - 1,
                parseInt(dateParts[0]),
                parseInt(timeParts[0]),
                parseInt(timeParts[1])
            );
        }

        // Extract transaction type and counterparty
        const { type, counterparty, details } = extractTransactionInfo(line);

        // Extract amounts
        const amounts = extractAmounts(line);

        transactions.push({
            receiptNo,
            date,
            details: details || line.substring(0, 100),
            counterparty,
            type,
            paidIn: amounts.paidIn,
            paidOut: amounts.paidOut,
            balance: amounts.balance,
            selected: false,
        });
    }

    // Calculate summary
    const totalPaidIn = transactions.reduce((sum, t) => sum + t.paidIn, 0);
    const totalPaidOut = transactions.reduce((sum, t) => sum + t.paidOut, 0);

    return {
        customerName: nameMatch?.[1]?.trim() || 'Unknown',
        phoneNumber: phoneMatch?.[1] || '',
        periodStart: periodMatch ? parseDate(periodMatch[1]) : new Date(),
        periodEnd: periodMatch ? parseDate(periodMatch[2]) : new Date(),
        transactions,
        summary: {
            totalPaidIn,
            totalPaidOut,
        },
    };
}

/**
 * Extract transaction type and counterparty from details
 */
function extractTransactionInfo(text: string): { type: StatementTransaction['type']; counterparty: string; details: string } {
    const lowerText = text.toLowerCase();

    // Received money patterns
    if (lowerText.includes('received from') || lowerText.includes('funds received')) {
        const nameMatch = text.match(/(?:received from|from)\s+([A-Z][A-Z\s]+?)(?:\s+\d|$)/i);
        return {
            type: 'received',
            counterparty: nameMatch?.[1]?.trim() || 'Unknown',
            details: extractDetails(text, 'received'),
        };
    }

    // Sent money patterns
    if (lowerText.includes('sent to') || lowerText.includes('customer transfer to')) {
        const nameMatch = text.match(/(?:sent to|transfer to)\s+([A-Z][A-Z\s]+?)(?:\s+\d|$)/i);
        return {
            type: 'sent',
            counterparty: nameMatch?.[1]?.trim() || 'Unknown',
            details: extractDetails(text, 'sent'),
        };
    }

    // PayBill patterns
    if (lowerText.includes('paybill') || lowerText.includes('pay bill')) {
        const nameMatch = text.match(/(?:paybill|pay bill)\s+(?:to\s+)?([A-Z0-9][A-Z0-9\s]+?)(?:\s+Ksh|$)/i);
        return {
            type: 'paybill',
            counterparty: nameMatch?.[1]?.trim() || 'Business',
            details: extractDetails(text, 'paybill'),
        };
    }

    // Buy Goods patterns
    if (lowerText.includes('buy goods') || lowerText.includes('merchant')) {
        const nameMatch = text.match(/(?:buy goods|merchant)\s+(?:from\s+)?([A-Z][A-Z\s]+?)(?:\s+\d|$)/i);
        return {
            type: 'buygoods',
            counterparty: nameMatch?.[1]?.trim() || 'Merchant',
            details: extractDetails(text, 'buygoods'),
        };
    }

    // Withdrawal patterns
    if (lowerText.includes('withdraw') || lowerText.includes('agent withdrawal')) {
        return {
            type: 'withdrawal',
            counterparty: 'Agent',
            details: extractDetails(text, 'withdrawal'),
        };
    }

    // Deposit patterns
    if (lowerText.includes('deposit') || lowerText.includes('agent deposit')) {
        return {
            type: 'deposit',
            counterparty: 'Agent',
            details: extractDetails(text, 'deposit'),
        };
    }

    return {
        type: 'other',
        counterparty: 'Unknown',
        details: text.substring(0, 100),
    };
}

/**
 * Extract details string
 */
function extractDetails(text: string, type: string): string {
    // Clean up the text
    return text
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 150);
}

/**
 * Extract amounts from transaction line
 */
function extractAmounts(text: string): { paidIn: number; paidOut: number; balance: number } {
    const amounts: number[] = [];
    const amountPattern = /(?:Ksh|KES)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi;

    let match;
    while ((match = amountPattern.exec(text)) !== null) {
        const amount = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(amount) && amount > 0) {
            amounts.push(amount);
        }
    }

    // Heuristic: last amount is usually balance, others are paid in/out
    const balance = amounts.length > 0 ? amounts[amounts.length - 1] : 0;

    // Check if this is money in or out based on context
    const lowerText = text.toLowerCase();
    const isIncoming = lowerText.includes('received') ||
        lowerText.includes('deposit') ||
        lowerText.includes('paid in');

    if (isIncoming && amounts.length >= 2) {
        return { paidIn: amounts[0], paidOut: 0, balance };
    } else if (amounts.length >= 2) {
        return { paidIn: 0, paidOut: amounts[0], balance };
    }

    return { paidIn: 0, paidOut: 0, balance };
}

/**
 * Parse date string like "09 Mar 2024"
 */
function parseDate(dateStr: string): Date {
    const months: Record<string, number> = {
        jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
        jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    };

    const match = dateStr.match(/(\d{1,2})\s+(\w{3})\s+(\d{4})/i);
    if (match) {
        const day = parseInt(match[1]);
        const month = months[match[2].toLowerCase()] ?? 0;
        const year = parseInt(match[3]);
        return new Date(year, month, day);
    }

    return new Date();
}

/**
 * Get unique counterparties from transactions
 */
export function getUniqueCounterparties(transactions: StatementTransaction[]): string[] {
    const counterparties = new Set(
        transactions
            .map(t => t.counterparty)
            .filter(c => c && c !== 'Unknown' && c !== 'Agent')
    );
    return Array.from(counterparties).sort();
}

/**
 * Filter transactions by counterparty
 */
export function filterByCounterparty(
    transactions: StatementTransaction[],
    counterparty: string
): StatementTransaction[] {
    if (!counterparty || counterparty === 'all') {
        return transactions;
    }
    return transactions.filter(t =>
        t.counterparty.toLowerCase().includes(counterparty.toLowerCase())
    );
}

/**
 * Filter transactions by type
 */
export function filterByType(
    transactions: StatementTransaction[],
    type: StatementTransaction['type'] | 'all'
): StatementTransaction[] {
    if (type === 'all') {
        return transactions;
    }
    return transactions.filter(t => t.type === type);
}
