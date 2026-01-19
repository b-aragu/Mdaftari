/**
 * IndexedDB Database Setup for Mdaftari
 * 
 * Offline-first storage using IndexedDB with the idb library.
 * All data is stored locally and synced when online.
 */

import { openDB, type IDBPDatabase, type DBSchema } from 'idb';
import type { Transaction, Worker, LedgerEntry, SyncQueueItem, User } from '../ledger/types';

/** Database schema definition */
interface MdaftariDB extends DBSchema {
    transactions: {
        key: string;
        value: Transaction;
        indexes: {
            'by-date': Date;
            'by-user': string;
            'by-sync-status': string;
            'by-transaction-code': string;
        };
    };
    workers: {
        key: string;
        value: Worker;
        indexes: {
            'by-contractor': string;
            'by-phone': string;
        };
    };
    ledgerEntries: {
        key: string;
        value: LedgerEntry;
        indexes: {
            'by-transaction': string;
            'by-worker': string;
            'by-date': Date;
        };
    };
    syncQueue: {
        key: string;
        value: SyncQueueItem;
        indexes: {
            'by-status': string;
            'by-date': Date;
        };
    };
    users: {
        key: string;
        value: User;
        indexes: {
            'by-phone': string;
        };
    };
}

const DB_NAME = 'mdaftari';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<MdaftariDB> | null = null;

/**
 * Initialize and get the database instance
 */
export async function getDatabase(): Promise<IDBPDatabase<MdaftariDB>> {
    if (dbInstance) {
        return dbInstance;
    }

    dbInstance = await openDB<MdaftariDB>(DB_NAME, DB_VERSION, {
        upgrade(db, _oldVersion, _newVersion) {
            // Transactions store
            if (!db.objectStoreNames.contains('transactions')) {
                const transactionStore = db.createObjectStore('transactions', { keyPath: 'id' });
                transactionStore.createIndex('by-date', 'parsedData.dateTime');
                transactionStore.createIndex('by-user', 'userId');
                transactionStore.createIndex('by-sync-status', 'syncStatus');
                transactionStore.createIndex('by-transaction-code', 'parsedData.transactionCode');
            }

            // Workers store
            if (!db.objectStoreNames.contains('workers')) {
                const workerStore = db.createObjectStore('workers', { keyPath: 'id' });
                workerStore.createIndex('by-contractor', 'contractorId');
                workerStore.createIndex('by-phone', 'phone');
            }

            // Ledger entries store
            if (!db.objectStoreNames.contains('ledgerEntries')) {
                const ledgerStore = db.createObjectStore('ledgerEntries', { keyPath: 'id' });
                ledgerStore.createIndex('by-transaction', 'transactionId');
                ledgerStore.createIndex('by-worker', 'workerId');
                ledgerStore.createIndex('by-date', 'createdAt');
            }

            // Sync queue store
            if (!db.objectStoreNames.contains('syncQueue')) {
                const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
                syncStore.createIndex('by-status', 'operation');
                syncStore.createIndex('by-date', 'createdAt');
            }

            // Users store
            if (!db.objectStoreNames.contains('users')) {
                const userStore = db.createObjectStore('users', { keyPath: 'id' });
                userStore.createIndex('by-phone', 'phone');
            }


        },
        blocked() {
            console.warn('Database upgrade blocked - please close other tabs');
        },
        blocking() {
            // Close connection if blocking another tab's upgrade
            dbInstance?.close();
            dbInstance = null;
        },
    });

    return dbInstance;
}

/**
 * Generate a UUID for new records
 */
export function generateId(): string {
    return crypto.randomUUID();
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}
