import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.yandao.guoxue',
  appName: '言道国学',
  webDir: 'www',
  server: {
    androidScheme: 'https',
    url: 'https://yandaoguoxue.yandao.vip',
    cleartext: false,
  },
  android: {
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
