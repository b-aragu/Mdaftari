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
        if (intent != null && intent.hasExtra("sms_body")) {
            String smsBody = intent.getStringExtra("sms_body");

            // Clean the intent to avoid re-triggering on rotate/resume
            intent.removeExtra("sms_body");

            final JSObject ret = new JSObject();
            ret.put("body", smsBody);

            // We need to wait for bridge to be ready if called from onCreate
            if (bridge != null) {
                bridge.triggerJSEvent("smsReceived", "window", ret.toString());
            } else {
                // Should not happen often if super.onCreate sets it up, but strictly speaking
                // we might need to queue it. For now, we rely on standard lifecycle.
            }
        }
    }
}
