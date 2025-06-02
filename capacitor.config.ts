/// <reference types="@capacitor/splash-screen" />
import { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'org.lidraughts.mobileapp',
  appName: 'lidraughts',
  webDir: 'www',
  backgroundColor: '000000ff',
  appendUserAgent: 'Lidrobile/2.3.0',
  plugins: {
    SplashScreen: {
      androidSplashResourceName: 'launch_splash',
      launchAutoHide: false,
      useDialog: false,
    },
    PushNotifications: {
      presentationOptions: ['sound', 'alert']
    }
  },
  server: {
    androidScheme: "http"
  },
  ios: {
    scheme: 'lidraughts',
  }
}

export default config

