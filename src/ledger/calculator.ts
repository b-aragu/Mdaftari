/**
 * Payment Split Calculator
 * 
 * Handles splitting payments among workers with safe rounding.
 * Ensures no shillings are lost due to floating point errors.
 */

import type { PaymentSplit, WorkerBalance, UUID } from './types';

/**
 * Configuration for a payment split
 */
export interface SplitConfig {
    workerId: UUID;
    workerName: string;
    /** Percentage share (0-100). If not provided, splits equally. */
    percentage?: number;
    /** Fixed amount. Takes precedence over percentage. */
    fixedAmount?: number;
}

/**
 * Calculate how a payment should be split among workers
 * 
 * Rules:
 * 1. Fixed amounts are deducted first
 * 2. Remaining amount is split by percentages
 * 3. Rounding differences go to the first worker (deterministic)
 * 
 * @param totalAmount - Total amount to split
 * @param workers - Array of worker configurations
 * @returns Array of payment splits with calculated amounts
 */
export function calculatePaymentSplits(
    totalAmount: number,
    workers: SplitConfig[]
): PaymentSplit[] {
    if (workers.length === 0) {
        return [];
    }

    if (totalAmount <= 0) {
        return workers.map(w => ({
            workerId: w.workerId,
            workerName: w.workerName,
            percentage: w.percentage ?? 100 / workers.length,
            fixedAmount: w.fixedAmount,
            calculatedAmount: 0,
        }));
    }

    const splits: PaymentSplit[] = [];
    let remainingAmount = totalAmount;

    // First, allocate fixed amounts
    const workersWithFixed = workers.filter(w => w.fixedAmount !== undefined);
    const workersWithPercentage = workers.filter(w => w.fixedAmount === undefined);

    for (const worker of workersWithFixed) {
        const amount = Math.min(worker.fixedAmount!, remainingAmount);
        splits.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            percentage: 0,
            fixedAmount: worker.fixedAmount,
            calculatedAmount: Math.floor(amount * 100) / 100, // Round to 2 decimal places
        });
        remainingAmount -= amount;
    }

    // If no remaining amount, other workers get nothing
    if (remainingAmount <= 0) {
        for (const worker of workersWithPercentage) {
            splits.push({
                workerId: worker.workerId,
                workerName: worker.workerName,
                percentage: worker.percentage ?? 100 / workersWithPercentage.length,
                calculatedAmount: 0,
            });
        }
        return splits;
    }

    // Calculate percentage-based splits
    if (workersWithPercentage.length === 0) {
        return splits;
    }

    // If no percentages specified, split equally
    const totalPercentage = workersWithPercentage.reduce(
        (sum, w) => sum + (w.percentage ?? 0),
        0
    );

    const isEqualSplit = totalPercentage === 0;
    const equalPercentage = isEqualSplit ? 100 / workersWithPercentage.length : 0;

    // Calculate raw amounts
    const rawAmounts: number[] = [];
    for (const worker of workersWithPercentage) {
        const pct = isEqualSplit ? equalPercentage : ((worker.percentage ?? 0) / totalPercentage) * 100;
        const rawAmount = (pct / 100) * remainingAmount;
        rawAmounts.push(rawAmount);
    }

    // Floor all amounts to ensure we don't over-allocate
    const flooredAmounts = rawAmounts.map(a => Math.floor(a * 100) / 100);
    const totalFloored = flooredAmounts.reduce((sum, a) => sum + a, 0);

    // Calculate remainder (due to rounding)
    let remainder = Math.round((remainingAmount - totalFloored) * 100) / 100;

    // Distribute remainder to first workers (1 cent at a time)
    for (let i = 0; i < workersWithPercentage.length && remainder > 0; i++) {
        const addAmount = Math.min(0.01, remainder);
        flooredAmounts[i] = Math.round((flooredAmounts[i]! + addAmount) * 100) / 100;
        remainder = Math.round((remainder - addAmount) * 100) / 100;
    }

    // Create splits
    for (let i = 0; i < workersWithPercentage.length; i++) {
        const worker = workersWithPercentage[i]!;
        splits.push({
            workerId: worker.workerId,
            workerName: worker.workerName,
            percentage: isEqualSplit ? equalPercentage : worker.percentage ?? 0,
            calculatedAmount: flooredAmounts[i]!,
        });
    }

    return splits;
}

/**
 * Calculate what each worker is owed after a partial payment
 * 
 * @param expectedTotal - Total expected payment
 * @param receivedAmount - Amount actually received
 * @param workerCount - Number of workers to split among
 * @returns Object with per-worker paid and owed amounts
 */
export function calculatePartialPaymentSplits(
    expectedTotal: number,
    receivedAmount: number,
    workerCount: number
): { paidPerWorker: number; owedPerWorker: number } {
    if (workerCount <= 0) {
        return { paidPerWorker: 0, owedPerWorker: 0 };
    }

    const expectedPerWorker = expectedTotal / workerCount;
    const paidPerWorker = Math.floor((receivedAmount / workerCount) * 100) / 100;
    const owedPerWorker = Math.max(0, Math.round((expectedPerWorker - paidPerWorker) * 100) / 100);

    return { paidPerWorker, owedPerWorker };
}

/**
 * Calculate cumulative balances for a worker
 * 
 * @param currentBalance - Current balance object
 * @param newPayment - New payment amount
 * @param newExpected - New expected amount (optional, for new jobs)
 * @returns Updated balance
 */
export function updateWorkerBalance(
    currentBalance: WorkerBalance,
    newPayment: number,
    newExpected?: number
): WorkerBalance {
    return {
        ...currentBalance,
        totalExpected: currentBalance.totalExpected + (newExpected ?? 0),
        totalPaid: Math.round((currentBalance.totalPaid + newPayment) * 100) / 100,
        totalOwed: Math.max(
            0,
            Math.round(
                (currentBalance.totalExpected + (newExpected ?? 0) - currentBalance.totalPaid - newPayment) * 100
            ) / 100
        ),
        lastPaymentDate: newPayment > 0 ? new Date() : currentBalance.lastPaymentDate,
    };
}

/**
 * Validate that amounts are sensible
 */
export function validateAmounts(
    expectedAmount: number,
    receivedAmount: number
): { valid: boolean; warning?: string } {
    if (expectedAmount < 0 || receivedAmount < 0) {
        return { valid: false, warning: 'Amounts cannot be negative' };
    }

    if (receivedAmount > expectedAmount * 1.1) {
        return {
            valid: true,
            warning: 'Received amount is more than expected. Please verify this is correct.'
        };
    }

    return { valid: true };
}
