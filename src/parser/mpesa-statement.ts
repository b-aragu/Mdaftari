/**
 * M-Pesa Statement Parser
 * 
 * Parses M-Pesa PDF statements to extract transactions
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source from local package
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

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

            // Try to preserve some structure by checking transforms
            let lastY = 0;
            const pageLines: string[] = [];
            let currentLine = '';

            for (const item of textContent.items as any[]) {
                const y = item.transform ? item.transform[5] : 0;

                // If Y position changed significantly, it's a new line
                if (lastY !== 0 && Math.abs(y - lastY) > 5) {
                    if (currentLine.trim()) {
                        pageLines.push(currentLine.trim());
                    }
                    currentLine = item.str;
                } else {
                    currentLine += ' ' + item.str;
                }
                lastY = y;
            }

            if (currentLine.trim()) {
                pageLines.push(currentLine.trim());
            }

            fullText += pageLines.join('\n') + '\n';
        }

        // Debug: log first 2000 chars to see structure

        return parseStatementText(fullText);
    } catch (error: any) {
        const errorMessage = error?.message?.toLowerCase() || '';
        const errorName = error?.name || '';

        // Check for various password-related error patterns
        const isPasswordError =
            errorName === 'PasswordException' ||
            errorMessage.includes('password') ||
            errorMessage.includes('encrypted') ||
            errorMessage.includes('need a password') ||
            errorMessage.includes('incorrect password');

        if (isPasswordError) {
            throw new Error('PASSWORD_REQUIRED');
        }

        console.error('PDF parsing error:', error);
        throw error;
    }
}

/**
 * Parse extracted text into structured data
 * M-Pesa statement format:
 * - Receipt No: UA4FL2U92P (letters + numbers)
 * - Completion Time: 2026-01-04 10:40:37 (YYYY-MM-DD HH:MM:SS)
 * - Details: Merchant Payment to 5603042 - NYANGARESI RAGIRA WYCLIFFE
 * - Transaction Status: Completed
 * - Paid In: amount or empty
 * - Withdrawn: amount or empty  
 * - Balance: running balance
 */
function parseStatementText(text: string): ParsedStatement {
    const transactions: StatementTransaction[] = [];

    // Extract header info
    const phoneMatch = text.match(/Mobile\s*Number[:\s]*(\d{10,12})/i);
    const nameMatch = text.match(/Customer\s*Name[:\s]*([A-Z\s]+?)(?=\s+\d|Mobile|$)/i);
    const periodMatch = text.match(/Statement\s*Period[:\s]*(\d{1,2}\s+\w+\s+\d{4})\s*[-–]\s*(\d{1,2}\s+\w+\s+\d{4})/i);

    // Find DETAILED STATEMENT section
    const detailedIndex = text.indexOf('DETAILED STATEMENT');
    if (detailedIndex === -1) {
        console.warn('Could not find DETAILED STATEMENT section');
        return {
            customerName: nameMatch?.[1]?.trim() || 'Unknown',
            phoneNumber: phoneMatch?.[1] || '',
            periodStart: periodMatch ? parseDate(periodMatch[1] || '') : new Date(),
            periodEnd: periodMatch ? parseDate(periodMatch[2] || '') : new Date(),
            transactions: [],
            summary: { totalPaidIn: 0, totalPaidOut: 0 },
        };
    }

    // Get text after DETAILED STATEMENT, skip header row
    const detailedText = text.substring(detailedIndex);
    const lines = detailedText.split('\n');

    // Pattern to detect a line that starts with a receipt number
    // Format: "UA4FL2U92P   2026-01-04 10:40:37   Merchant Payment to..."
    const transactionLinePattern = /^([A-Z]{2,}[A-Z0-9]{5,})\s+(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})\s+(.*)$/;

    // Amount pattern: number with optional comma separators and decimals
    const amountPattern = /^-?[\d,]+\.\d{2}$/;

    let currentTransaction: {
        receiptNo: string;
        date: Date;
        detailParts: string[];
        amounts: number[];
    } | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Skip header row
        if (trimmed.includes('Receipt No.') || trimmed.includes('Completion Time') || trimmed === 'DETAILED STATEMENT') {
            continue;
        }

        // Check if this line starts a new transaction
        // Format: "RECEIPT   DATE TIME   Description..."
        const txMatch = trimmed.match(transactionLinePattern);
        if (txMatch) {
            // Save previous transaction if exists
            if (currentTransaction) {
                const tx = finalizeTransaction(currentTransaction);
                if (tx) transactions.push(tx);
            }

            // Start new transaction
            const restOfLine = txMatch[3] || '';
            currentTransaction = {
                receiptNo: txMatch[1],
                date: new Date(txMatch[2].replace(' ', 'T')),
                detailParts: restOfLine ? [restOfLine] : [],
                amounts: [],
            };

            // Check if there are amounts at the end of this line
            const words = restOfLine.split(/\s+/);
            for (const word of words) {
                if (amountPattern.test(word)) {
                    const amount = parseFloat(word.replace(/,/g, ''));
                    if (!isNaN(amount)) {
                        currentTransaction.amounts.push(amount);
                    }
                }
            }
            continue;
        }

        // If we have a current transaction, collect additional data
        if (currentTransaction) {
            // Check for amounts on standalone lines
            if (amountPattern.test(trimmed)) {
                const amount = parseFloat(trimmed.replace(/,/g, ''));
                if (!isNaN(amount)) {
                    currentTransaction.amounts.push(amount);
                }
                continue;
            }

            // Check for lines starting with status (e.g., "Completed   -20.00   1,566.31")
            // These lines contain the amounts we need!
            if (trimmed.startsWith('Completed') || trimmed.startsWith('Pending') || trimmed.startsWith('Failed')) {
                // Extract all amounts from this line
                const words = trimmed.split(/\s+/);
                for (const word of words) {
                    if (amountPattern.test(word)) {
                        const amount = parseFloat(word.replace(/,/g, ''));
                        if (!isNaN(amount)) {
                            currentTransaction.amounts.push(amount);
                        }
                    }
                }
                continue;
            }

            // Everything else is continuation of details
            currentTransaction.detailParts.push(trimmed);
        }
    }

    // Don't forget the last transaction
    if (currentTransaction && currentTransaction.receiptNo && currentTransaction.date) {
        const tx = finalizeTransaction(currentTransaction);
        if (tx) transactions.push(tx);
    }

    // Calculate summary
    const totalPaidIn = transactions.reduce((sum, t) => sum + t.paidIn, 0);
    const totalPaidOut = transactions.reduce((sum, t) => sum + t.paidOut, 0);

        receiptNo: t.receiptNo,
        paidIn: t.paidIn,
        paidOut: t.paidOut,
        counterparty: t.counterparty
    })));

    return {
        customerName: nameMatch?.[1]?.trim() || 'Unknown',
        phoneNumber: phoneMatch?.[1] || '',
        periodStart: periodMatch ? parseDate(periodMatch[1] || '') : new Date(),
        periodEnd: periodMatch ? parseDate(periodMatch[2] || '') : new Date(),
        transactions,
        summary: { totalPaidIn, totalPaidOut },
    };
}

/**
 * Finalize a transaction from collected parts
 * Returns all transactions - filtering is done in the UI based on mode
 */
function finalizeTransaction(data: {
    receiptNo: string;
    date: Date;
    detailParts: string[];
    amounts: number[];
}): StatementTransaction | null {
    const details = data.detailParts.join(' ').trim();
    const { type, counterparty } = extractTransactionInfo(details);

    // Parse amounts: 
    // - If 2 amounts: first is paidIn/withdrawn, second is balance
    // - If 1 amount: it's the balance, check details for money direction
    let paidIn = 0;
    let paidOut = 0;
    let balance = 0;

    if (data.amounts.length >= 2) {
        const amount = data.amounts[0];
        balance = data.amounts[data.amounts.length - 1];

        if (amount > 0) {
            paidIn = amount;
        } else {
            paidOut = Math.abs(amount);
        }
    } else if (data.amounts.length === 1) {
        balance = data.amounts[0];
    }

    // Return all transactions - UI will filter by mode (collections = paidIn, payments = paidOut)
    // Only skip if there's no meaningful data
    if (paidIn <= 0 && paidOut <= 0 && balance <= 0) {
        return null;
    }

    return {
        receiptNo: data.receiptNo,
        date: data.date,
        details,
        counterparty,
        type,
        paidIn,
        paidOut,
        balance: Math.abs(balance),
        selected: false,
    };
}

/**
 * Extract amounts from word array
 */
function extractAmountsFromArray(words: string[]): { paidIn: number; paidOut: number; balance: number } {
    const amounts: number[] = [];

    for (const word of words) {
        // Match numbers with optional commas and decimals
        const cleanWord = word.replace(/[^\d,\.]/g, '');
        if (/^\d{1,3}(,\d{3})*(\.\d{2})?$/.test(cleanWord) || /^\d+(\.\d{2})?$/.test(cleanWord)) {
            const amount = parseFloat(cleanWord.replace(/,/g, ''));
            if (!isNaN(amount) && amount > 0) {
                amounts.push(amount);
            }
        }
    }

    // Last 3 amounts are typically: Paid In, Withdrawn, Balance
    // Or last 2 might be: amount and balance
    if (amounts.length >= 3) {
        return {
            paidIn: amounts[amounts.length - 3] || 0,
            paidOut: amounts[amounts.length - 2] || 0,
            balance: amounts[amounts.length - 1] || 0,
        };
    } else if (amounts.length === 2) {
        return {
            paidIn: amounts[0] || 0,
            paidOut: 0,
            balance: amounts[1] || 0,
        };
    } else if (amounts.length === 1) {
        return { paidIn: 0, paidOut: 0, balance: amounts[0] || 0 };
    }

    return { paidIn: 0, paidOut: 0, balance: 0 };
}

/**
 * Extract transaction type and counterparty from details
 * Format: Extract name and phone number, display as "NAME PHONE"
 * Example: "Customer Payment to Small Business to - 2547******275 ALPHONCE MUSEE" 
 *       -> counterparty: "ALPHONCE MUSEE 2547******275"
 */
function extractTransactionInfo(text: string): { type: StatementTransaction['type']; counterparty: string; details: string } {
    const lowerText = text.toLowerCase();

    // Determine transaction type
    let type: StatementTransaction['type'] = 'other';
    if (lowerText.includes('received') || lowerText.includes('funds received')) {
        type = 'received';
    } else if (lowerText.includes('sent') || lowerText.includes('transfer to')) {
        type = 'sent';
    } else if (lowerText.includes('paybill') || lowerText.includes('pay bill')) {
        type = 'paybill';
    } else if (lowerText.includes('buy goods') || lowerText.includes('merchant')) {
        type = 'buygoods';
    } else if (lowerText.includes('withdraw')) {
        type = 'withdrawal';
    } else if (lowerText.includes('deposit')) {
        type = 'deposit';
    } else if (lowerText.includes('airtime')) {
        type = 'other';
    }

    // Extract counterparty: look for phone number and name
    // Phone patterns: 07******, 2547******, +2547****** (with optional * masking)
    const phonePattern = /(\+?254[\d*]{6,12}|07[\d*]{6,10})/;
    const phoneMatch = text.match(phonePattern);
    const phone = phoneMatch ? phoneMatch[1] : '';

    // Extract name: look for name words (can be mixed case like "John ngechu")
    // Names typically come after phone number or at the end
    // Pattern: words that are mostly letters, capitalized or mixed case
    const words = text.split(/\s+/);
    const nameWords: string[] = [];

    // Strategy: Find consecutive word groups that look like names
    // Names are alphabetic words, can be mixed case
    let foundPhone = false;
    for (let i = 0; i < words.length; i++) {
        const word = words[i] || '';

        // Skip if it looks like a phone number
        if (phonePattern.test(word)) {
            foundPhone = true;
            continue;
        }

        // After we find phone, collect name words
        // Name words: mostly letters, at least 2 chars, starts with letter
        if (foundPhone && /^[A-Za-z][A-Za-z]+$/.test(word) && word.length >= 2) {
            // Skip common words that aren't names
            const skipWords = ['to', 'from', 'for', 'the', 'and', 'of', 'in', 'at'];
            if (!skipWords.includes(word.toLowerCase())) {
                nameWords.push(word);
                if (nameWords.length >= 3) break;
            }
        }
    }

    // If no names found after phone, try finding from the end (backwards)
    if (nameWords.length === 0) {
        for (let i = words.length - 1; i >= 0; i--) {
            const word = words[i] || '';
            // Name words: alphabetic, at least 2 chars
            if (/^[A-Za-z][A-Za-z]+$/.test(word) && word.length >= 2) {
                const skipWords = ['to', 'from', 'for', 'the', 'and', 'of', 'in', 'at', 'completed', 'pending', 'failed', 'page'];
                if (!skipWords.includes(word.toLowerCase())) {
                    nameWords.unshift(word);
                    if (nameWords.length >= 3) break;
                }
            } else if (nameWords.length > 0) {
                // Stop if we hit a non-name after collecting some names
                break;
            }
        }
    }

    const name = nameWords.length > 0 ? nameWords.join(' ') : 'Unknown';

    // Format: "NAME PHONE" or just "NAME" if no phone
    const counterparty = phone ? `${name} ${phone}` : name;

    return {
        type,
        counterparty,
        details: text.replace(/\s+/g, ' ').trim().substring(0, 150),
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
