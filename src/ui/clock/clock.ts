import { Capacitor, registerPlugin, PluginListenerHandle } from '@capacitor/core'
import { App, AppState } from '@capacitor/app'
import { StatusBar } from '@capacitor/status-bar'
import * as sleepUtils from '../../utils/sleep'
import * as helper from '../helper'
import layout from '../layout'

import DraughtsClockCtrl, { IDraughtsClockCtrl } from './DraughtsClockCtrl'
import { clockBody, renderClockSettingsOverlay } from './clockView'

interface State {
  ctrl: IDraughtsClockCtrl
  appStateListener: PluginListenerHandle
}

interface FullScreenPlugin {
  hideSystemUI(): Promise<void>
  showSystemUI(): Promise<void>
}
const FullScreenPlugin = registerPlugin<FullScreenPlugin>('FullScreen')

function hideStatusBar() {
  StatusBar.hide()
}

const DraughtsClockScreen: Mithril.Component<Record<string, never>, State> = {
  oncreate: helper.viewFadeIn,

  async oninit() {
    sleepUtils.keepAwake()

    if (Capacitor.getPlatform() === 'android') {
      FullScreenPlugin.hideSystemUI()
    }

    hideStatusBar()

    this.appStateListener = await App.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) hideStatusBar()
    })

    window.addEventListener('resize', hideStatusBar)

    this.ctrl = DraughtsClockCtrl()
  },

  onremove() {
    const c = this.ctrl.clockObj()
    if (c !== undefined) {
      c.clear()
    }
    sleepUtils.allowSleepAgain()

    this.appStateListener.remove()

    window.removeEventListener('resize', hideStatusBar)

    StatusBar.show()

    if (Capacitor.getPlatform() === 'android') {
      FullScreenPlugin.showSystemUI()
    }
  },

  view() {
    const body = () => clockBody(this.ctrl)
    const clockSettingsOverlay = () => renderClockSettingsOverlay(this.ctrl)

    return layout.clock(body, clockSettingsOverlay)
  }
}

export default DraughtsClockScreen
