import Stream from 'mithril/stream'
import { Plugins, AppState, PluginListenerHandle } from '@capacitor/core'
import router from '../../router'
import settings from '../../settings'
import clockSettings from './clockSettings'
import clockSet from './clockSet'

import { ClockType, IDraughtsClock } from '../shared/clock/interfaces'

export interface IDraughtsClockCtrl {
  hideStatusBar: () => void
  startStop: () => void
  clockSettingsCtrl: any
  clockObj: Stream<IDraughtsClock>
  reload: () => void
  goHome: () => void
  clockTap: (side: 'white' | 'black') => void
  clockType: Stream<ClockType>
  appStateListener: PluginListenerHandle
}

export default function DraughtsClockCtrl(): IDraughtsClockCtrl {

  const clockType: Stream<ClockType> = stream(settings.clock.clockType())
  const clockObj: Stream<IDraughtsClock> = stream(clockSet[clockType()]())

  function reload() {
    if (clockObj() && clockObj().isRunning() && !clockObj().flagged()) return
    clockType(settings.clock.clockType())
    clockObj(clockSet[clockType()]())
  }

  const clockSettingsCtrl = clockSettings.controller(reload, clockObj)

  function clockTap(side: 'white' | 'black') {
    clockObj().clockHit(side)
  }

  function startStop () {
    clockObj().startStop()
  }

  function goHome() {
    if (!clockObj().isRunning() || clockObj().flagged()) {
      router.set('/')
    }
  }

  function hideStatusBar() {
    Plugins.StatusBar.hide()
  }

  hideStatusBar()

  if (window.deviceInfo.platform === 'android') {
    window.AndroidFullScreen.immersiveMode()
  }

  const appStateListener = Plugins.App.addListener('appStateChange', (state: AppState) => {
    if (state.isActive) hideStatusBar()
  })

  window.addEventListener('resize', hideStatusBar)

  return {
    hideStatusBar,
    startStop,
    clockSettingsCtrl,
    clockObj,
    reload,
    goHome,
    clockTap,
    clockType,
    appStateListener
  }
}
