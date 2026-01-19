# Testing Guide for Mdaftari

## 1. Permissions
The app uses the **SMS Permission Group**. When you tap the "Grant Permission" button on the Import screen, Android asks for access to SMS. This single permission grant allows the app to:
- **Read** existing messages (Inbox scan)
- **Receive** new messages (Background listener)

You do not need to grant a separate permission for background listening.

## 2. Testing on Android Studio (Emulator)

### Step 1: Open the Project
Run this command in your terminal:
```bash
npx cap open android
```
This will launch Android Studio. Wait for Gradle sync to finish.

### Step 2: Run the Emulator
1. Click the **Run** button (green play icon) in Android Studio.
2. Select an emulator (e.g., Pixel 4 API 34).
3. Wait for the app to install and launch.

### Step 3: Grant Permissions
1. In the app, go to **Settings > Import from SMS**.
2. Tap "Grant Permission" and "Allow".

### Step 4: Simulate an Incoming M-Pesa SMS
You can simulate a real SMS using the Android Debug Bridge (adb) command from your terminal.

**Copy and paste this command into your terminal:**

```bash
adb shell service call isms 7 i32 0 s16 "com.android.mms" s16 "+254700000000" s16 "MPESA Confirmed. You have received Ksh 1,500.00 from JOHN DOE 0712345678 on 25/5/23 at 10:00 AM. New M-PESA balance is Ksh 2,500.00. Transaction cost, Ksh 0.00."
```

**What should happen:**
1. A system notification "New M-Pesa Transaction" should appear.
2. Tap the notification.
3. The app should open (or switch foreground) and automatically navigate to the **Import SMS** screen.
4. The "new" message should appear at the top of the list (Note: The emulator might not actually *save* the simulated message to the inbox database depending on the image, so it might not appear in the list if the plugin re-scans, but the *notification* proves the listener is working).

**Troubleshooting:**
If `adb` command fails, try sending an SMS via the Emulator UI:
1. On the Emulator toolbar, click the **... (Extended controls)** button.
2. Go to **Phone**.
3. Enter `MPESA` as the phone number.
4. Paste the message body.
5. Click **Send Message**.
