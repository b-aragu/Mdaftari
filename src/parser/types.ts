/**
 * Parser Types for Mdaftari
 * Strong typing for all parsed transaction data
 */

/** Supported mobile money providers */
export type MobileMoneyProvider = 'mpesa' | 'airtel';

/** Transaction types that can be detected from messages */
export type TransactionType =
    | 'received'      // Money received
    | 'sent'          // Money sent to person
    | 'paybill'       // Payment to paybill number
    | 'buy_goods'     // Payment to till number
    | 'withdraw'      // ATM or agent withdrawal
    | 'deposit'       // Agent deposit
    | 'airtime';      // Airtime purchase

/** Counterparty information extracted from message */
export interface Counterparty {
    /** Name of the person/business (if available) */
    name?: string;
    /** Phone number (if available) */
    phone?: string;
    /** Business identifier like paybill or till number */
    identifier?: string;
}

/**
 * Parsed transaction data
 * This is the core data structure extracted from mobile money messages
 */
export interface ParsedTransaction {
    /** Unique transaction code from the provider (e.g., "DT85TH896") */
    transactionCode: string;

    /** Transaction amount in KES */
    amount: number;

    /** Currency - always KES for Kenyan mobile money */
    currency: 'KES';

    /** Type of transaction */
    type: TransactionType;

    /** Information about the other party in the transaction */
    counterparty: Counterparty;

    /** Date and time of the transaction */
    dateTime: Date;

    /** Account balance after transaction (if available) */
    balance?: number;

    /** Transaction cost/fee (if available) */
    transactionCost?: number;

    /** The original raw message text */
    rawMessage: string;

    /** Source provider of the message */
    source: MobileMoneyProvider;

    /** 
     * Parser confidence score (0-1)
     * 1.0 = All fields parsed successfully
     * 0.5+ = Core fields parsed, some optional fields missing
     * <0.5 = Low confidence, manual verification strongly recommended
     */
    confidence: number;
}

/** Result of parsing a message */
export interface ParseResult {
    /** Whether parsing was successful */
    success: boolean;

    /** Parsed transaction data (if successful) */
    transaction?: ParsedTransaction;

    /** Error message (if unsuccessful) */
    error?: string;

    /** Fields that need manual verification */
    needsVerification?: (keyof ParsedTransaction)[];
}

/** Parser function signature */
export type MessageParser = (message: string) => ParseResult;
