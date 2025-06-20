import h from 'mithril/hyperscript'
import i18n from '../../i18n'
import settings from '../../settings'
import formWidgets from '../shared/form'
import * as helper from '../helper'
import { renderClaimDrawButton, renderEndedGameStatus, renderNewGameButton } from '../shared/offlineRound/view'
import ground from '../shared/offlineRound/ground'
import popupWidget from '../shared/popup'
import router from '../../router'

import OtbRound from './OtbRound'

export interface OtbActionsCtrl {
  open: () => void
  close: (fromBB?: string) => void
  isOpen: () => boolean
  root: OtbRound
}

function renderAlways(ctrl: OtbRound) {
  return [
    h('div', [
      h('button[data-icon=A]', {
        oncreate: helper.ontap(ctrl.goToAnalysis)
      }, i18n('analysis'))
    ]),
    h('div.action', formWidgets.renderCheckbox(
      i18n('otbFlipPiecesAndInfoAfterMove'), 'flipPieces', settings.otb.flipPieces,
      (v) => ground.changeOTBMode(ctrl.draughtsground, v, settings.otb.mirrorPieces())
    )),
    h('div.action', formWidgets.renderCheckbox(
      i18n('otbMirrorOpponentPiecesAndInfo'), 'mirrorPieces', settings.otb.mirrorPieces,
      (v) => ground.changeOTBMode(ctrl.draughtsground, settings.otb.flipPieces(), v),
      settings.otb.flipPieces()
    ))
  ]
}

export default {

  controller(root: OtbRound) {
    let isOpen = false

    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
    }

    return {
      open: open,
      close: close,
      isOpen: function() {
        return isOpen
      },
      root: root
    }
  },

  view: function(ctrl: OtbActionsCtrl) {
    if (ctrl.isOpen()) {
      return popupWidget(
        'offline_actions',
        undefined,
        function() {
          return [
            renderEndedGameStatus(ctrl.root)
          ].concat(
            renderClaimDrawButton(ctrl.root),
            renderNewGameButton(ctrl.root),
            renderAlways(ctrl.root)
          )
        },
        ctrl.isOpen(),
        ctrl.close
      )
    }

    return null
  }
}
