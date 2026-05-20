import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.universflow.app',
  appName: 'Universflow',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
