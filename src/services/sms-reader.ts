/**
 * SMS Reader Service for Mdaftari
 * 
 * Uses @solimanware/capacitor-sms-reader plugin to read SMS messages
 * on Android devices. Filters for M-Pesa messages and provides
 * parsing functionality.
 */

import { Capacitor } from '@capacitor/core';
import { MessageReader, type MessageObject } from '@solimanware/capacitor-sms-reader';
import { parseMpesaMessage } from '../parser/mpesa';
import type { ParseResult } from '../parser/types';

export interface SMSMessage {
    id: string;
    address: string;  // Sender (e.g., "MPESA")
    body: string;     // Message content
    date: number;     // Timestamp in milliseconds
}

export interface ParsedSMSMessage extends SMSMessage {
    parseResult: ParseResult;
}

/**
 * Check if SMS reading is available (Android only)
 */
export function isSMSAvailable(): boolean {
    return Capacitor.getPlatform() === 'android';
}

/**
 * Check current SMS permission status
 */
export async function checkSMSPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    if (!isSMSAvailable()) {
        return 'denied';
    }

    try {
        const result = await MessageReader.checkPermissions();
        // Map 'prompt-with-rationale' to 'prompt'
        if (result.messages === 'granted') return 'granted';
        if (result.messages === 'denied') return 'denied';
        return 'prompt';
    } catch (error) {
        console.error('Error checking SMS permission:', error);
        return 'denied';
    }
}

/**
 * Request SMS permission from user
 */
export async function requestSMSPermission(): Promise<boolean> {
    if (!isSMSAvailable()) {
        return false;
    }

    try {
        const result = await MessageReader.requestPermissions();
        return result.messages === 'granted';
    } catch (error) {
        console.error('Error requesting SMS permission:', error);
        return false;
    }
}

/**
 * Open app settings so user can enable SMS permission manually
 * Uses Android's native intent to open app details page
 */
import { NativeSettings, AndroidSettings, IOSSettings } from 'capacitor-native-settings';

/**
 * Open app settings so user can enable SMS permission manually
 * Uses capacitor-native-settings to open the specific app details page
 */
export async function openAppSettings(): Promise<void> {
    if (!isSMSAvailable()) {
        return;
    }

    try {
        await NativeSettings.open({
            optionAndroid: AndroidSettings.ApplicationDetails,
            optionIOS: IOSSettings.App
        });
    } catch (error) {
        console.error('Error opening settings:', error);
        // Fallback to permission request
        try {
            await MessageReader.requestPermissions();
        } catch (e) {
            // Ignored
        }
    }
}

/**
 * Get SMS messages from inbox
 * @param limit Maximum number of messages to fetch
 */
export async function getSMSMessages(limit: number = 100): Promise<SMSMessage[]> {
    if (!isSMSAvailable()) {
        return [];
    }

    try {
        const result = await MessageReader.getMessages({
            limit
        });

        return result.messages.map((sms: MessageObject) => ({
            id: sms.id,
            address: sms.sender,
            body: sms.body,
            date: sms.date
        }));
    } catch (error) {
        console.error('Error getting SMS list:', error);
        return [];
    }
}

/**
 * Filter messages to only M-Pesa/Safaricom messages
 */
export function filterMpesaMessages(messages: SMSMessage[]): SMSMessage[] {
    const mpesaSenders = ['MPESA', 'M-PESA', 'SAFARICOM', 'SAFCOM'];

    return messages.filter(msg => {
        const sender = msg.address.toUpperCase();
        return mpesaSenders.some(s => sender.includes(s));
    });
}

/**
 * Parse M-Pesa messages using the existing parser
 */
export function parseSMSMessages(messages: SMSMessage[]): ParsedSMSMessage[] {
    return messages.map(msg => ({
        ...msg,
        parseResult: parseMpesaMessage(msg.body)
    }));
}

/**
 * Get and parse M-Pesa messages from inbox
 * Combines filtering and parsing into one convenient function
 */
export async function getMpesaMessages(limit: number = 100): Promise<ParsedSMSMessage[]> {
    const allMessages = await getSMSMessages(limit);
    const mpesaMessages = filterMpesaMessages(allMessages);
    return parseSMSMessages(mpesaMessages);
}

/**
 * Check if a transaction code already exists in the app
 * (To be used with the storage module)
 */
export function isDuplicateTransaction(
    messages: ParsedSMSMessage[],
    existingCodes: Set<string>
): ParsedSMSMessage[] {
    return messages.filter(msg => {
        if (!msg.parseResult.success || !msg.parseResult.transaction) {
            return false;
        }
        return !existingCodes.has(msg.parseResult.transaction.transactionCode);
    });
}
