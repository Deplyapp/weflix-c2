import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Network from "expo-network";
import * as ScreenOrientation from "expo-screen-orientation";
import * as WebBrowser from "expo-web-browser";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from "react-native-webview";

import { BRAND, WEB_APP_HOST, WEB_APP_URL } from "@/constants/config";

const FULLSCREEN_BRIDGE_JS = `
(function() {
  if (window.__weflixFsBridge) return;
  window.__weflixFsBridge = true;
  function post(msg) {
    try { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); } catch (e) {}
  }
  function onChange() {
    var fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
    post({ type: 'fullscreen', value: fs });
  }
  document.addEventListener('fullscreenchange', onChange, true);
  document.addEventListener('webkitfullscreenchange', onChange, true);
  true;
})();
`;

type BridgeMessage = { type: "fullscreen"; value: boolean } | { type: string; [k: string]: unknown };

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const checkNetwork = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      const online = !!(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      return online;
    } catch {
      setIsOnline(true);
      return true;
    }
  }, []);

  useEffect(() => {
    checkNetwork();
    let sub: { remove: () => void } | null = null;
    try {
      const maybe = (Network as unknown as {
        addNetworkStateListener?: (cb: (s: Network.NetworkState) => void) => { remove: () => void };
      }).addNetworkStateListener;
      if (typeof maybe === "function") {
        sub = maybe((state) => {
          const online = !!(state.isConnected && state.isInternetReachable !== false);
          setIsOnline(online);
        });
      }
    } catch {}
    return () => sub?.remove();
  }, [checkNetwork]);

  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBack && webRef.current) {
        webRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [canGoBack]);

  // Restore portrait on unmount in case fullscreen left orientation unlocked.
  useEffect(() => {
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const handleNav = useCallback((nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
  }, []);

  const handleShouldStart = useCallback((req: { url: string }) => {
    const url = req.url || "";
    if (
      url.startsWith("about:") ||
      url.startsWith("data:") ||
      url.startsWith("blob:") ||
      url.startsWith("javascript:")
    ) {
      return true;
    }
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return false;
    }
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      if (WEB_APP_HOST && parsed.host !== WEB_APP_HOST) {
        WebBrowser.openBrowserAsync(url).catch(() => {
          Linking.openURL(url).catch(() => {});
        });
        return false;
      }
      return true;
    }
    Linking.openURL(url).catch(() => {});
    return false;
  }, []);

  const handleMessage = useCallback((e: WebViewMessageEvent) => {
    let data: BridgeMessage | null = null;
    try {
      data = JSON.parse(e.nativeEvent.data) as BridgeMessage;
    } catch {
      return;
    }
    if (!data || typeof data !== "object") return;
    if (data.type === "fullscreen") {
      const fs = (data as { value: boolean }).value;
      if (fs) {
        ScreenOrientation.unlockAsync().catch(() => {});
      } else {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
    }
  }, []);

  const retry = useCallback(async () => {
    const online = await checkNetwork();
    if (online) {
      setReloadKey((k) => k + 1);
    }
  }, [checkNetwork]);

  if (!isOnline) {
    return (
      <View style={[styles.offlineRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Feather name="wifi-off" size={56} color={BRAND.white} />
        <Text style={styles.offlineTitle}>No connection</Text>
        <Text style={styles.offlineBody}>
          Check your internet connection and try again.
        </Text>
        <Pressable
          onPress={retry}
          style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]}
          testID="offline-retry"
        >
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri: WEB_APP_URL }}
        style={styles.web}
        containerStyle={styles.web}
        originWhitelist={["http://*", "https://*", "about:*", "data:*", "blob:*"]}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsFullscreenVideo
        allowsBackForwardNavigationGestures
        pullToRefreshEnabled
        setSupportMultipleWindows={false}
        scalesPageToFit={false}
        decelerationRate="normal"
        overScrollMode="never"
        bounces={false}
        cacheEnabled
        startInLoadingState={false}
        mixedContentMode="always"
        injectedJavaScript={FULLSCREEN_BRIDGE_JS}
        onNavigationStateChange={handleNav}
        onShouldStartLoadWithRequest={handleShouldStart}
        onLoadStart={() => setLoading(true)}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          checkNetwork();
        }}
        onHttpError={() => setLoading(false)}
        onMessage={handleMessage}
      />
      {loading && (
        <View pointerEvents="none" style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={BRAND.red} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: BRAND.black,
  },
  web: {
    flex: 1,
    backgroundColor: BRAND.black,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: BRAND.black,
  },
  offlineRoot: {
    flex: 1,
    backgroundColor: BRAND.black,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  offlineTitle: {
    color: BRAND.white,
    fontSize: 22,
    fontWeight: "700",
    fontFamily: "Inter_700Bold",
    marginTop: 8,
  },
  offlineBody: {
    color: "#A1A1A1",
    fontSize: 15,
    textAlign: "center",
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
  },
  retryBtn: {
    marginTop: 12,
    backgroundColor: BRAND.red,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 6,
  },
  retryText: {
    color: BRAND.white,
    fontSize: 15,
    fontWeight: "600",
    fontFamily: "Inter_600SemiBold",
  },
});
