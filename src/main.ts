/// <reference path="dts/index.d.ts" />
import { Capacitor, registerPlugin, Plugins } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Device } from '@capacitor/device'
import { SplashScreen } from '@capacitor/splash-screen'

import appInit from './app'
import { init as settingsInit } from './settings'
import { init as i18nInit } from './i18n'
import { init as themeInit } from './theme'
import routes from './routes'
import { processWindowLocation } from './router'
import push from './push'
import deepLinks from './deepLinks'

interface XNavigator extends Navigator {
  hardwareConcurrency: number
}

interface CPUInfoPlugin {
  nbCores(): Promise<{ value: number }>
}
const CPUInfo = registerPlugin<CPUInfoPlugin>('CPUInfo')

settingsInit()
.then(() => Promise.all([
  App.getInfo(),
  Device.getInfo(),
  Device.getId(),
  Capacitor.getPlatform() === 'ios' ?
    CPUInfo.nbCores().then((r: { value: number }) => r.value).catch(() => 1) :
    Promise.resolve((<XNavigator>navigator).hardwareConcurrency || 1),
  Plugins.Scan.getMaxMemory().then((r: { value: number }) => r.value).catch(() => 16),
]))
.then(([ai, di, did, c, m]) => appInit(ai, di, did, c, m))
.then(() => {
  routes.init()
  deepLinks.init()
  push.init()
})
.then(themeInit)
.then(i18nInit)
.then(() => processWindowLocation())
.then(() => {
  setTimeout(() => {
    SplashScreen.hide()
  }, 500)
})
