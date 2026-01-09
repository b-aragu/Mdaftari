/**
 * Storage Operations for Mdaftari
 * 
 * CRUD operations for all entities with offline-first support.
 */

import { getDatabase, generateId, closeDatabase } from './db';
import type { Transaction, Worker, LedgerEntry, SyncQueueItem, UUID } from '../ledger/types';
import type { ParsedTransaction } from '../parser/types';

// ============================================================
// TRANSACTION OPERATIONS
// ============================================================

/**
 * Save a new transaction to the database
 */
export async function saveTransaction(
    parsedData: ParsedTransaction,
    userId: UUID,
    expectedAmount?: number,
    notes?: string
): Promise<Transaction> {
    const db = await getDatabase();

    // Check for duplicate transaction code
    const existing = await db.getFromIndex(
        'transactions',
        'by-transaction-code',
        parsedData.transactionCode
    );

    if (existing) {
        throw new Error(`Transaction ${parsedData.transactionCode} already exists`);
    }

    const transaction: Transaction = {
        id: generateId(),
        parsedData,
        expectedAmount,
        notes,
        confirmedAt: new Date(),
        createdAt: new Date(),
        syncStatus: 'pending',
        userId,
    };

    await db.add('transactions', transaction);

    // Add to sync queue
    await addToSyncQueue('create', 'transaction', transaction);

    return transaction;
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(id: UUID): Promise<Transaction | undefined> {
    const db = await getDatabase();
    return db.get('transactions', id);
}

/**
 * Get all transactions for a user
 */
export async function getTransactionsByUser(userId: UUID): Promise<Transaction[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('transactions', 'by-user', userId);
}

/**
 * Get all pending transactions (not synced)
 */
export async function getPendingTransactions(): Promise<Transaction[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('transactions', 'by-sync-status', 'pending');
}

/**
 * Check if a transaction code already exists
 */
export async function transactionCodeExists(code: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFromIndex('transactions', 'by-transaction-code', code);
    return existing !== undefined;
}

/**
 * Batch check which receipt numbers already exist in the database
 * Returns a Set of codes that already exist
 */
export async function getExistingReceiptNumbers(codes: string[]): Promise<Set<string>> {
    const db = await getDatabase();
    const existingCodes = new Set<string>();

    for (const code of codes) {
        const existing = await db.getFromIndex('transactions', 'by-transaction-code', code);
        if (existing) {
            existingCodes.add(code);
        }
    }

    return existingCodes;
}

/**
 * Update a transaction's expected amount and notes
 */
export async function updateTransaction(
    id: UUID,
    updates: {
        expectedAmount?: number;
        notes?: string;
    }
): Promise<Transaction> {
    const db = await getDatabase();
    const transaction = await db.get('transactions', id);

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    const updatedTransaction: Transaction = {
        ...transaction,
        expectedAmount: updates.expectedAmount ?? transaction.expectedAmount,
        notes: updates.notes ?? transaction.notes,
        syncStatus: 'pending',
    };

    await db.put('transactions', updatedTransaction);
    await addToSyncQueue('update', 'transaction', updatedTransaction);

    // Update associated ledger entries if expected amount changed
    if (updates.expectedAmount !== undefined) {
        const entries = await db.getAllFromIndex('ledgerEntries', 'by-transaction', id);
        for (const entry of entries) {
            const amountOwed = Math.max(0, updates.expectedAmount - entry.amountPaid);
            const updatedEntry: LedgerEntry = {
                ...entry,
                amountOwed,
                cumulativeOwed: amountOwed,
                syncStatus: 'pending',
            };
            await db.put('ledgerEntries', updatedEntry);
            await addToSyncQueue('update', 'ledgerEntry', updatedEntry);
        }
    }

    return updatedTransaction;
}

/**
 * Delete a transaction and its associated ledger entries
 */
export async function deleteTransaction(id: UUID): Promise<void> {
    const db = await getDatabase();
    const transaction = await db.get('transactions', id);

    if (!transaction) {
        throw new Error('Transaction not found');
    }

    // Delete associated ledger entries first
    const entries = await db.getAllFromIndex('ledgerEntries', 'by-transaction', id);
    for (const entry of entries) {
        await db.delete('ledgerEntries', entry.id);
        await addToSyncQueue('delete', 'ledgerEntry', { id: entry.id });
    }

    // Delete the transaction
    await db.delete('transactions', id);
    await addToSyncQueue('delete', 'transaction', { id });
}

// ============================================================
// WORKER OPERATIONS
// ============================================================

/**
 * Add a new worker
 */
export async function addWorker(
    name: string,
    phone: string,
    contractorId: UUID
): Promise<Worker> {
    const db = await getDatabase();

    const worker: Worker = {
        id: generateId(),
        name,
        phone,
        createdAt: new Date(),
        updatedAt: new Date(),
        syncStatus: 'pending',
        contractorId,
    };

    await db.add('workers', worker);
    await addToSyncQueue('create', 'worker', worker);

    return worker;
}

/**
 * Get a worker by ID
 */
export async function getWorker(id: UUID): Promise<Worker | undefined> {
    const db = await getDatabase();
    return db.get('workers', id);
}

/**
 * Get all workers for a contractor
 */
export async function getWorkersByContractor(contractorId: UUID): Promise<Worker[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('workers', 'by-contractor', contractorId);
}

/**
 * Get all workers (for matching purposes)
 */
export async function getAllWorkers(): Promise<Worker[]> {
    const db = await getDatabase();
    return db.getAll('workers');
}

/**
 * Find workers matching any of the given phone numbers
 * Returns a Map of phone number → worker
 */
export async function findWorkersByPhones(phones: string[]): Promise<Map<string, Worker>> {
    const allWorkers = await getAllWorkers();
    const phoneToWorker = new Map<string, Worker>();

    // Normalize phone numbers for matching
    const normalizePhone = (phone: string) => phone.replace(/[^0-9]/g, '').slice(-9);

    for (const worker of allWorkers) {
        const normalizedWorkerPhone = normalizePhone(worker.phone);
        for (const phone of phones) {
            // Check if the last 9 digits match (handles different formats)
            if (normalizePhone(phone) === normalizedWorkerPhone) {
                phoneToWorker.set(phone, worker);
            }
        }
    }

    return phoneToWorker;
}

/**
 * Update a worker
 */
export async function updateWorker(
    id: UUID,
    updates: Partial<Pick<Worker, 'name' | 'phone'>>
): Promise<Worker> {
    const db = await getDatabase();
    const worker = await db.get('workers', id);

    if (!worker) {
        throw new Error('Worker not found');
    }

    const updatedWorker: Worker = {
        ...worker,
        ...updates,
        updatedAt: new Date(),
        syncStatus: 'pending',
    };

    await db.put('workers', updatedWorker);
    await addToSyncQueue('update', 'worker', updatedWorker);

    return updatedWorker;
}

/**
 * Delete a worker
 */
export async function deleteWorker(id: UUID): Promise<void> {
    const db = await getDatabase();
    const worker = await db.get('workers', id);

    if (worker) {
        await db.delete('workers', id);
        await addToSyncQueue('delete', 'worker', { id });
    }
}

// ============================================================
// LEDGER ENTRY OPERATIONS
// ============================================================

/**
 * Create a ledger entry (immutable once created)
 */
export async function createLedgerEntry(
    transactionId: UUID,
    workerId: UUID | null,
    amountPaid: number,
    amountOwed: number,
    cumulativePaid: number,
    cumulativeOwed: number
): Promise<LedgerEntry> {
    const db = await getDatabase();

    const entry: LedgerEntry = {
        id: generateId(),
        transactionId,
        workerId,
        amountPaid,
        amountOwed,
        cumulativePaid,
        cumulativeOwed,
        createdAt: new Date(),
        immutable: true,
        syncStatus: 'pending',
    };

    await db.add('ledgerEntries', entry);
    await addToSyncQueue('create', 'ledgerEntry', entry);

    return entry;
}

/**
 * Get ledger entries for a transaction
 */
export async function getLedgerEntriesByTransaction(transactionId: UUID): Promise<LedgerEntry[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('ledgerEntries', 'by-transaction', transactionId);
}

/**
 * Get ledger entries for a worker
 */
export async function getLedgerEntriesByWorker(workerId: UUID): Promise<LedgerEntry[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('ledgerEntries', 'by-worker', workerId);
}

/**
 * Get worker's current balance (sum of all entries)
 */
export async function getWorkerBalance(workerId: UUID): Promise<{
    totalPaid: number;
    totalOwed: number;
}> {
    const entries = await getLedgerEntriesByWorker(workerId);

    let totalPaid = 0;
    let totalOwed = 0;

    for (const entry of entries) {
        totalPaid += entry.amountPaid;
        totalOwed = entry.cumulativeOwed; // Last entry has current owed
    }

    return {
        totalPaid: Math.round(totalPaid * 100) / 100,
        totalOwed: Math.round(totalOwed * 100) / 100,
    };
}

// ============================================================
// SYNC QUEUE OPERATIONS
// ============================================================

/**
 * Add an item to the sync queue
 */
async function addToSyncQueue(
    operation: SyncQueueItem['operation'],
    entityType: SyncQueueItem['entityType'],
    data: unknown
): Promise<void> {
    const db = await getDatabase();

    const item: SyncQueueItem = {
        id: generateId(),
        operation,
        entityType,
        data,
        attempts: 0,
        createdAt: new Date(),
    };

    await db.add('syncQueue', item);
}

/**
 * Get all items in the sync queue
 */
export async function getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = await getDatabase();
    return db.getAll('syncQueue');
}

/**
 * Remove an item from the sync queue
 */
export async function removeSyncQueueItem(id: UUID): Promise<void> {
    const db = await getDatabase();
    await db.delete('syncQueue', id);
}

/**
 * Update sync attempt for a queue item
 */
export async function updateSyncQueueItem(
    id: UUID,
    error?: string
): Promise<void> {
    const db = await getDatabase();
    const item = await db.get('syncQueue', id);

    if (item) {
        await db.put('syncQueue', {
            ...item,
            attempts: item.attempts + 1,
            lastAttempt: new Date(),
            lastError: error,
        });
    }
}

/**
 * Mark entity as synced in the database
 */
export async function markAsSynced(
    entityType: SyncQueueItem['entityType'],
    id: UUID
): Promise<void> {
    const db = await getDatabase();

    switch (entityType) {
        case 'transaction': {
            const tx = await db.get('transactions', id);
            if (tx) {
                await db.put('transactions', { ...tx, syncStatus: 'synced' });
            }
            break;
        }
        case 'worker': {
            const worker = await db.get('workers', id);
            if (worker) {
                await db.put('workers', { ...worker, syncStatus: 'synced' });
            }
            break;
        }
        case 'ledgerEntry': {
            const entry = await db.get('ledgerEntries', id);
            if (entry) {
                await db.put('ledgerEntries', { ...entry, syncStatus: 'synced' });
            }
            break;
        }
    }
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Clear all data (for testing or complete reset)
 * Deletes the entire IndexedDB database and clears localStorage
 */
export async function clearAllData(): Promise<void> {
    // Close database connection first
    closeDatabase();

    // Delete the entire IndexedDB database
    return new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('mdaftari');

        deleteRequest.onerror = () => {
            console.error('Error deleting database');
            reject(new Error('Failed to delete database'));
        };

        deleteRequest.onsuccess = () => {
            console.log('Database deleted successfully');

            // Clear all localStorage items related to Mdaftari
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key.startsWith('mdaftari') || key.includes('mdaftari') || key.includes('appMode'))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach(key => localStorage.removeItem(key));

            console.log('All data cleared successfully');
            resolve();
        };

        deleteRequest.onblocked = () => {
            console.warn('Database deletion blocked - please close other tabs');
            // Still try to resolve after a short delay
            setTimeout(resolve, 1000);
        };
    });
}

/**
 * Export all data for backup
 */
export async function exportAllData(): Promise<{
    transactions: Transaction[];
    workers: Worker[];
    ledgerEntries: LedgerEntry[];
}> {
    const db = await getDatabase();

    return {
        transactions: await db.getAll('transactions'),
        workers: await db.getAll('workers'),
        ledgerEntries: await db.getAll('ledgerEntries'),
    };
}
