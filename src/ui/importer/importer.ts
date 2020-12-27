import h from 'mithril/hyperscript'
import socket from '../../socket'
import settings from '../../settings'
import * as helper from '../helper'
import { dropShadowHeader } from '../shared/common'
import layout from '../layout'
import i18n from '../../i18n'
import formWidgets from '../shared/form'

import ImporterCtrl, { IImporterCtrl } from './ImporterCtrl'

interface State {
  ctrl: IImporterCtrl
}

const ImporterScreen: Mithril.Component<Record<string, never>, State> = {
  oninit() {
    socket.createDefault()
    this.ctrl = ImporterCtrl()
  },

  oncreate: helper.viewFadeIn,

  view() {
    const header = dropShadowHeader(i18n('importGame'))
    const body = renderBody(this.ctrl)
    return layout.free(header, body)
  }

}

function renderBody(ctrl: IImporterCtrl) {
  return h('div.gameImporter.native_scroller', [
    h('p', i18n('importGameExplanation')),
    h('form', {
      onsubmit: (e: Event) => {
        e.preventDefault()
        const target = e.target as HTMLFormElement
        const pdn: string = (target[0] as HTMLInputElement).value
        if (pdn) ctrl.importGame(pdn)
      }
    }, [
      h('label', i18n('pasteThePdnStringHere') + ' :'),
      h('textarea.pdnImport'),
      formWidgets.renderCheckbox(i18n('requestAComputerAnalysis'), 'analyse', settings.importer.analyse),
      h('button.fatButton', ctrl.importing() ?
        h('div.fa.fa-hourglass-half') : i18n('importGame'))
    ])
  ])
}

export default ImporterScreen
