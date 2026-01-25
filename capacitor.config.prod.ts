import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.universflow',
  appName: 'UniversFlow',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#000000',
      showSpinner: false,
      spinnerColor: '#FF2D55',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#000000',
    },
  },
  android: {
    backgroundColor: '#000000',
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
};

export default config;
