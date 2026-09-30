package com.nammaoorujobs.app;

import android.os.Bundle;
import androidx.core.splashscreen.SplashScreen;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Must be called BEFORE super.onCreate() for the SplashScreen API to work
        SplashScreen.installSplashScreen(this);
        super.onCreate(savedInstanceState);
    }
}
