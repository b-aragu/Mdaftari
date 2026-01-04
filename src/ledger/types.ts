/**
 * Ledger Types for Mdaftari
 * 
 * These types define the core data structures for tracking
 * payments, debts, and worker splits.
 */

import type { ParsedTransaction } from '../parser/types';

/** Unique identifier type */
export type UUID = string;

/** Sync status for offline-first operation */
export type SyncStatus = 'pending' | 'synced' | 'failed' | 'conflict';

/**
 * A worker in the system
 * Workers can be paid by contractors and track their own ledger
 */
export interface Worker {
    id: UUID;
    name: string;
    phone: string;
    createdAt: Date;
    updatedAt: Date;
    syncStatus: SyncStatus;
    /** ID of the contractor who manages this worker */
    contractorId: UUID;
}

/**
 * A confirmed transaction in the ledger
 * Once confirmed, this record becomes immutable
 */
export interface Transaction {
    id: UUID;
    /** The parsed data from the mobile money message */
    parsedData: ParsedTransaction;
    /** Expected total amount for this job/payment */
    expectedAmount?: number;
    /** Notes or description */
    notes?: string;
    /** When the user confirmed this transaction */
    confirmedAt: Date;
    /** When this record was created */
    createdAt: Date;
    syncStatus: SyncStatus;
    /** User who created this transaction */
    userId: UUID;
}

/**
 * A ledger entry linking a transaction to a worker
 * Tracks how much was paid and how much is owed
 */
export interface LedgerEntry {
    id: UUID;
    /** Reference to the transaction */
    transactionId: UUID;
    /** Reference to the worker (null for contractor's own records) */
    workerId: UUID | null;
    /** Amount paid in this entry */
    amountPaid: number;
    /** Amount still owed after this entry */
    amountOwed: number;
    /** Running total paid to this worker */
    cumulativePaid: number;
    /** Running total owed to this worker */
    cumulativeOwed: number;
    /** When this entry was created */
    createdAt: Date;
    /** Ledger entries are immutable once created */
    readonly immutable: true;
    syncStatus: SyncStatus;
}

/**
 * Payment split configuration
 * Defines how a payment should be split among workers
 */
export interface PaymentSplit {
    workerId: UUID;
    workerName: string;
    /** Percentage of payment (0-100) */
    percentage: number;
    /** Fixed amount (alternative to percentage) */
    fixedAmount?: number;
    /** Calculated amount for this payment */
    calculatedAmount: number;
}

/**
 * Summary of a worker's balance
 */
export interface WorkerBalance {
    workerId: UUID;
    workerName: string;
    totalExpected: number;
    totalPaid: number;
    totalOwed: number;
    lastPaymentDate?: Date;
}

/**
 * User roles in the system
 */
export type UserRole = 'contractor' | 'worker';

/**
 * User profile
 */
export interface User {
    id: UUID;
    phone: string;
    name?: string;
    role: UserRole;
    createdAt: Date;
    /** For workers, the contractor they're linked to */
    linkedContractorId?: UUID;
}

/**
 * Item in the sync queue for offline changes
 */
export interface SyncQueueItem {
    id: UUID;
    /** Type of operation */
    operation: 'create' | 'update' | 'delete';
    /** Entity type */
    entityType: 'transaction' | 'worker' | 'ledgerEntry';
    /** The data to sync */
    data: unknown;
    /** Number of sync attempts */
    attempts: number;
    /** Last attempt timestamp */
    lastAttempt?: Date;
    /** Error message from last attempt */
    lastError?: string;
    createdAt: Date;
}
