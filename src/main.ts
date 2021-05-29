/// <reference path="dts/index.d.ts" />
import { Capacitor, Plugins } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Device } from '@capacitor/app'
import appInit from './app'
import { init as settingsInit } from './settings'
import { init as i18nInit } from './i18n'
import { init as themeInit } from './theme'
import routes from './routes'
import push from './push'
import deepLinks from './deepLinks'

interface XNavigator extends Navigator {
  hardwareConcurrency: number
}

settingsInit()
.then(() => {
  routes.init()
  deepLinks.init()
  push.init()
})
.then(themeInit)
.then(i18nInit)
.then(() => Promise.all([
  App.getInfo(),
  Device.getInfo(),
  Device.getId(),
  Capacitor.getPlatform() === 'ios' ?
    Plugins.CPUInfo.nbCores().then((r: { value: number }) => r.value) :
    Promise.resolve((<XNavigator>navigator).hardwareConcurrency || 1)
]))
.then(([ai, di, did, c]) => appInit(ai, di, did, c))
.then(() => Plugins.SplashScreen.hide())
