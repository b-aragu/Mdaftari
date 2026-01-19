package ke.mdaftari.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import androidx.core.app.NotificationCompat;

public class SmsReceiver extends BroadcastReceiver {
    private static final String CHANNEL_ID = "mpesa_transactions";
    private static final String CHANNEL_NAME = "M-Pesa Transactions";
    private static final int NOTIFICATION_ID = 1001;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            Bundle bundle = intent.getExtras();
            if (bundle != null) {
                try {
                    Object[] pdus = (Object[]) bundle.get("pdus");
                    if (pdus != null) {
                        StringBuilder fullMessage = new StringBuilder();
                        String sender = "";

                        // Concatenate all parts
                        for (Object pdu : pdus) {
                            SmsMessage smsMessage;
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                                String format = bundle.getString("format");
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu, format);
                            } else {
                                smsMessage = SmsMessage.createFromPdu((byte[]) pdu);
                            }

                            // Capture sender from the first part (should be same for all)
                            if (sender.isEmpty()) {
                                sender = smsMessage.getDisplayOriginatingAddress();
                            }
                            fullMessage.append(smsMessage.getMessageBody());
                        }

                        // Process the full message once
                        if (sender != null && (sender.toUpperCase().contains("MPESA") ||
                                sender.toUpperCase().contains("M-PESA") ||
                                sender.toUpperCase().contains("SAFARICOM"))) {
                            showNotification(context, fullMessage.toString());
                        }
                    }
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        }
    }

    private void showNotification(Context context, String messageBody) {
        createNotificationChannel(context);

        // Intent for "Record Now" - launches app with SMS
        Intent recordIntent = new Intent(context, MainActivity.class);
        recordIntent.putExtra("sms_body", messageBody);
        recordIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        PendingIntent recordPendingIntent = PendingIntent.getActivity(
                context,
                0,
                recordIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Intent for "Skip" - just dismisses notification (no action needed)
        Intent skipIntent = new Intent(context, MainActivity.class);
        skipIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        // No sms_body extra means it won't trigger recording

        PendingIntent skipPendingIntent = PendingIntent.getActivity(
                context,
                1, // Different request code
                skipIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        // Improved parsing using regex patterns (Ported exactly from mpesa.ts)
        String title = "New M-Pesa Transaction";
        String content = "Tap to record transaction";

        try {
            // 1. Transaction Code: ^([A-Z0-9]{8,10})\s+Confirmed/i
            java.util.regex.Pattern codePattern = java.util.regex.Pattern.compile("^([A-Z0-9]+)\\s+Confirmed",
                    java.util.regex.Pattern.CASE_INSENSITIVE);
            java.util.regex.Matcher codeMatcher = codePattern.matcher(messageBody);

            if (codeMatcher.find()) {
                String txCode = codeMatcher.group(1);

                // 2. Identify Type & Parse Amount/Name based on Type (Priority Order)
                String amount = "";
                String name = "";
                boolean isParsed = false;

                // TYPE: RECEIVED
                // TS: /received\s+Ksh?([\d,]+(?:\.\d{2})?)/i
                if (messageBody.toLowerCase().contains("received")) {
                    java.util.regex.Pattern amountRx = java.util.regex.Pattern.compile(
                            "received\\s+Ksh?([\\d,]+(?:\\.\\d{2})?)", java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher amountMatch = amountRx.matcher(messageBody);

                    // TS: /from\s+([A-Za-z0-9\s\-\.]+?)(?:\s+on\s+|\s+New)/i
                    java.util.regex.Pattern nameRx = java.util.regex.Pattern.compile(
                            "from\\s+([A-Za-z0-9\\s\\-\\.]+?)(?:\\s+on\\s+|\\s+New)",
                            java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher nameMatch = nameRx.matcher(messageBody);

                    if (amountMatch.find()) { // Only proceed if amount found
                        amount = "Ksh " + amountMatch.group(1);
                        if (nameMatch.find()) {
                            name = nameMatch.group(1).trim();
                            content = amount + " ← " + name; // Received from
                            title = "Money Received";
                        } else {
                            content = amount + " received";
                            title = "Money Received";
                        }
                        isParsed = true;
                    }
                }

                // TYPE: SENT (Person to Person or Paybill/Till)
                // TS: /Ksh?([\d,]+(?:\.\d{2})?)\s+sent\s+to/i
                if (!isParsed && messageBody.toLowerCase().contains("sent to")) {
                    java.util.regex.Pattern amountRx = java.util.regex.Pattern.compile(
                            "Ksh?([\\d,]+(?:\\.\\d{2})?)\\s+sent\\s+to", java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher amountMatch = amountRx.matcher(messageBody);

                    // TS: /sent\s+to\s+([A-Za-z0-9\s\-\.]+?)\s+(?:\d+\s+)?(?:for|on|Ksh)/i
                    java.util.regex.Pattern nameRx = java.util.regex.Pattern.compile(
                            "sent\\s+to\\s+([A-Za-z0-9\\s\\-\\.]+?)\\s+(?:\\d+\\s+)?(?:for|on|Ksh)",
                            java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher nameMatch = nameRx.matcher(messageBody);

                    if (amountMatch.find()) {
                        amount = "Ksh " + amountMatch.group(1);
                        if (nameMatch.find()) {
                            name = nameMatch.group(1).trim();
                            content = amount + " → " + name; // Sent to
                            title = "Payment Sent";
                        } else {
                            content = amount + " sent";
                            title = "Payment Sent";
                        }
                        isParsed = true;
                    }
                }

                // TYPE: PAID TO (Paybill/Buy Goods alternative)
                // TS: /Ksh?([\d,]+(?:\.\d{2})?)\s+paid\s+to/i
                if (!isParsed && messageBody.toLowerCase().contains("paid to")) {
                    java.util.regex.Pattern amountRx = java.util.regex.Pattern.compile(
                            "Ksh?([\\d,]+(?:\\.\\d{2})?)\\s+paid\\s+to", java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher amountMatch = amountRx.matcher(messageBody);

                    // TS: /paid\s+to\s+([A-Za-z0-9\s\-\.]+?)(?:\.|,)?\s+(?:on|for|New|at)/i
                    java.util.regex.Pattern nameRx = java.util.regex.Pattern.compile(
                            "paid\\s+to\\s+([A-Za-z0-9\\s\\-\\.]+?)(?:\\.|,)?\\s+(?:on|for|New|at)",
                            java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher nameMatch = nameRx.matcher(messageBody);

                    if (amountMatch.find()) {
                        amount = "Ksh " + amountMatch.group(1);
                        if (nameMatch.find()) {
                            name = nameMatch.group(1).trim();
                            content = amount + " → " + name;
                            title = "Payment Made";
                        } else {
                            content = amount + " paid";
                            title = "Payment Made";
                        }
                        isParsed = true;
                    }
                }

                // Fallback: If we have a code but failed strict parsing, try a generic fallback
                // for Notification Content
                // Just use the first 100 chars so it's not totally broken
                if (!isParsed) {
                    // Try generic amount extraction: /Ksh?([\d,]+(?:\.\d{2})?)/i
                    java.util.regex.Pattern genericAmount = java.util.regex.Pattern
                            .compile("Ksh?([\\d,]+(?:\\.\\d{2})?)", java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher genMatch = genericAmount.matcher(messageBody);
                    if (genMatch.find()) {
                        content = "Ksh " + genMatch.group(1) + " Transaction";
                    } else {
                        // Absolute fallback - ensure text is not cutoff in a weird way
                        content = messageBody.length() > 60 ? messageBody.substring(0, 60) + "..." : messageBody;
                    }
                }
            } else {
                // Not a confirmed M-Pesa generic message
                // Do nothing or generic notification
            }

        } catch (Exception e) {
            // Fallback on error - keep default title/content
            e.printStackTrace();
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(content)
                .setStyle(new NotificationCompat.BigTextStyle().bigText(messageBody))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setContentIntent(recordPendingIntent)
                .addAction(android.R.drawable.ic_menu_add, "Record Now", recordPendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Skip", skipPendingIntent)
                .setAutoCancel(true);

        NotificationManager notificationManager = (NotificationManager) context
                .getSystemService(Context.NOTIFICATION_SERVICE);
        notificationManager.notify(NOTIFICATION_ID, builder.build());
    }

    private void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Notifications for incoming M-Pesa transactions");

            NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }
}
