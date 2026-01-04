/**
 * Mdaftari Parser Module
 * 
 * Unified parser interface that auto-detects message source
 * and routes to the appropriate parser.
 */

export type {
    ParsedTransaction,
    ParseResult,
    TransactionType,
    Counterparty,
    MobileMoneyProvider,
    MessageParser,
} from './types';

export { parseMpesaMessage, isMpesaMessage } from './mpesa';
export { parseAirtelMessage, isAirtelMessage } from './airtel';

import { parseMpesaMessage, isMpesaMessage } from './mpesa';
import { parseAirtelMessage, isAirtelMessage } from './airtel';
import type { ParseResult } from './types';

/**
 * Parse a mobile money message, auto-detecting the source
 * 
 * @param message - Raw SMS message text
 * @returns ParseResult with extracted transaction data
 */
export function parseMessage(message: string): ParseResult {
    const trimmed = message.trim();

    if (!trimmed) {
        return {
            success: false,
            error: 'Please paste a mobile money message',
        };
    }

    // Try to detect source and parse
    if (isMpesaMessage(trimmed)) {
        return parseMpesaMessage(trimmed);
    }

    if (isAirtelMessage(trimmed)) {
        return parseAirtelMessage(trimmed);
    }

    // If no provider detected, try M-Pesa first (most common in Kenya)
    const mpesaResult = parseMpesaMessage(trimmed);
    if (mpesaResult.success) {
        return mpesaResult;
    }

    // Try Airtel as fallback
    const airtelResult = parseAirtelMessage(trimmed);
    if (airtelResult.success) {
        return airtelResult;
    }

    // Neither parser succeeded
    return {
        success: false,
        error: 'Could not parse message. Please ensure this is a valid M-Pesa or Airtel Money confirmation message.',
    };
}

/**
 * Validate that a transaction code is unique (not already in ledger)
 * This is a utility function - actual duplicate check happens in storage layer
 */
export function isValidTransactionCode(code: string): boolean {
    // M-Pesa: 8-10 alphanumeric characters
    // Airtel: 10-20 alphanumeric characters
    return /^[A-Z0-9]{8,20}$/i.test(code);
}
