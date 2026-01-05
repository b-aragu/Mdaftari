/**
 * Mdaftari Storage Module
 * 
 * Offline-first storage layer with sync support
 */

export { getDatabase, generateId, closeDatabase } from './db';

export {
    // Transaction operations
    saveTransaction,
    getTransaction,
    getTransactionsByUser,
    getPendingTransactions,
    transactionCodeExists,
    getExistingReceiptNumbers,

    // Worker operations
    addWorker,
    getWorker,
    getWorkersByContractor,
    updateWorker,
    deleteWorker,

    // Ledger entry operations
    createLedgerEntry,
    getLedgerEntriesByTransaction,
    getLedgerEntriesByWorker,
    getWorkerBalance,

    // Sync queue operations
    getSyncQueue,
    removeSyncQueueItem,
    updateSyncQueueItem,
    markAsSynced,

    // Utility
    clearAllData,
    exportAllData,
} from './operations';
