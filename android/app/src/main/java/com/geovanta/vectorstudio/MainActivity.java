package com.geovanta.vectorstudio;

import android.content.res.Configuration;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    public class MaterialYouBridge {
        @JavascriptInterface
        public String getDynamicAccentColor(boolean isDark) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                try {
                    int resId = isDark
                        ? android.R.color.system_accent1_200
                        : android.R.color.system_accent1_600;
                    int colorInt = getColor(resId);
                    return String.format("#%06x", 0xFFFFFF & colorInt);
                } catch (Exception ignored) {
                }
            }
            try {
                TypedValue tv = new TypedValue();
                if (getTheme().resolveAttribute(android.R.attr.colorAccent, tv, true)) {
                    return String.format("#%06x", 0xFFFFFF & tv.data);
                }
            } catch (Exception ignored) {
            }
            return "";
        }

        @JavascriptInterface
        public boolean isDynamicColorSupported() {
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.S;
        }
    }

    private void notifyThemeChanged() {
        if (getBridge() != null) {
            final WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.post(() -> webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('geovanta-android-theme-changed'));",
                    null
                ));
            }
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (getBridge() != null) {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
                webView.addJavascriptInterface(new MaterialYouBridge(), "GeovantaAndroidTheme");
            }
        }
    }

    @Override
    public void onResume() {
        super.onResume();
        notifyThemeChanged();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        notifyThemeChanged();
    }
}
