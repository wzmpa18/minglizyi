import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yandao.guoxue',
  appName: '言道国学',
  webDir: 'www',
  server: {
    // v25.0.47 原生内置资源模式：移除 server.url（原远程加载 https://yandaoguoxue.yandao.vip），
    // APK/IPA 从 www/ 内置资源加载（离线可用、过审友好）；
    // 后端 API 由 public/native-api-patch.js 在原生壳内改写到线上服务器
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    appendUserAgent: 'YandaoGuoxueAndroid',
    buildOptions: {
      keystorePath: 'yandao-release.keystore',
      keystoreAlias: 'yandao',
    },
    backgroundColor: '#2D3039',
    allowMixedContent: false,
    // v25.0.38 P0-3：移除 captureInput（已废弃的实验特性，会拦截 WebView 输入导致
    // 聊天页输入框无法唤起软键盘、发送按钮点击失效）
    webContentsDebuggingEnabled: false,
  },
  ios: {
    // FINAL-RC-02：UA 追加标记，供 platformGate 在原生桥不可用时兜底识别 iOS 壳
    appendUserAgent: 'YandaoGuoxueIOS',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2D3039',
      androidSplashResourceName: 'splash',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
