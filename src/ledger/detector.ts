/**
 * Partial Payment Detector
 * 
 * Detects when payments are less than expected and calculates remaining debt.
 */

import type { Transaction } from './types';

/**
 * Result of partial payment detection
 */
export interface PartialPaymentResult {
    /** Whether this is a partial payment */
    isPartial: boolean;
    /** Amount received */
    amountReceived: number;
    /** Amount expected */
    amountExpected: number;
    /** Remaining debt (0 if payment is complete or overpayment) */
    remainingDebt: number;
    /** Whether the payment exceeds expected (overpayment) */
    isOverpayment: boolean;
    /** Percentage of expected amount received */
    percentageReceived: number;
}

/**
 * Detect if a payment is partial and calculate remaining debt
 * 
 * @param receivedAmount - Amount actually received
 * @param expectedAmount - Amount that was expected
 * @returns PartialPaymentResult with debt calculation
 */
export function detectPartialPayment(
    receivedAmount: number,
    expectedAmount: number
): PartialPaymentResult {
    const remainingDebt = Math.max(0, expectedAmount - receivedAmount);
    const isPartial = remainingDebt > 0;
    const isOverpayment = receivedAmount > expectedAmount;
    const percentageReceived = expectedAmount > 0
        ? Math.round((receivedAmount / expectedAmount) * 100)
        : 100;

    return {
        isPartial,
        amountReceived: receivedAmount,
        amountExpected: expectedAmount,
        remainingDebt: Math.round(remainingDebt * 100) / 100,
        isOverpayment,
        percentageReceived,
    };
}

/**
 * Calculate cumulative debt across multiple transactions
 * 
 * @param transactions - Array of transactions
 * @param expectedTotal - Total expected for all transactions
 * @returns Cumulative debt analysis
 */
export function calculateCumulativeDebt(
    transactions: Transaction[],
    expectedTotal: number
): {
    totalReceived: number;
    totalExpected: number;
    remainingDebt: number;
    paymentHistory: Array<{
        transactionCode: string;
        amount: number;
        date: Date;
        runningDebt: number;
    }>;
} {
    let totalReceived = 0;
    const paymentHistory: Array<{
        transactionCode: string;
        amount: number;
        date: Date;
        runningDebt: number;
    }> = [];

    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
        (a, b) => a.parsedData.dateTime.getTime() - b.parsedData.dateTime.getTime()
    );

    for (const tx of sortedTransactions) {
        totalReceived += tx.parsedData.amount;
        const runningDebt = Math.max(0, expectedTotal - totalReceived);

        paymentHistory.push({
            transactionCode: tx.parsedData.transactionCode,
            amount: tx.parsedData.amount,
            date: tx.parsedData.dateTime,
            runningDebt: Math.round(runningDebt * 100) / 100,
        });
    }

    return {
        totalReceived: Math.round(totalReceived * 100) / 100,
        totalExpected: expectedTotal,
        remainingDebt: Math.round(Math.max(0, expectedTotal - totalReceived) * 100) / 100,
        paymentHistory,
    };
}

/**
 * Generate a human-readable summary of the partial payment
 */
export function getPartialPaymentSummary(result: PartialPaymentResult): string {
    if (result.isOverpayment) {
        const excess = Math.round((result.amountReceived - result.amountExpected) * 100) / 100;
        return `Overpayment of KES ${excess.toLocaleString()}`;
    }

    if (!result.isPartial) {
        return 'Payment complete';
    }

    return `Partial payment: KES ${result.remainingDebt.toLocaleString()} still owed (${result.percentageReceived}% paid)`;
}
