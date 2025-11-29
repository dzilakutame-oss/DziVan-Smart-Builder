import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dzivansmart.app',
  appName: 'DziVan Smart',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;