package ke.mdaftari.app;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.JSObject;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        checkIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        checkIntent(intent);
    }

    private void checkIntent(Intent intent) {
        if (intent == null)
            return;

        String action = intent.getAction();
        String type = intent.getType();
        String messageBody = null;

        // Handle native notification click
        if (intent.hasExtra("sms_body")) {
            messageBody = intent.getStringExtra("sms_body");
            intent.removeExtra("sms_body"); // Clean up
        }
        // Handle "Share" from other apps
        else if (Intent.ACTION_SEND.equals(action) && type != null && "text/plain".equals(type)) {
            messageBody = intent.getStringExtra(Intent.EXTRA_TEXT);
        }

        if (messageBody != null) {
            final JSObject ret = new JSObject();
            ret.put("body", messageBody);

            // Persist for React to pick up on resume/start
            getSharedPreferences("CapacitorStorage", MODE_PRIVATE)
                    .edit()
                    .putString("pending_sms_body", messageBody)
                    .apply();

            // Trigger event if app is already running
            if (bridge != null) {
                bridge.triggerJSEvent("smsReceived", "window", ret.toString());
            }
        }
    }
}
