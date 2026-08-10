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
    backgroundColor: '#7B2FBE',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#7B2FBE',
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
