import * as h from 'mithril/hyperscript'
import layout from '../layout'
import i18n from '../../i18n'
import { hasNetwork } from '../../utils'
import settings from '../../settings'
import session from '../../session'
import { StoredProp } from '../../storage'
import { Takeback, SubmitMove, AutoThreefold, SubmitMoveChoices, TakebackChoices, AutoThreefoldChoices } from '../../lidraughts/prefs'
import * as helper from '../helper'
import { dropShadowHeader, backButton } from '../shared/common'
import formWidgets from '../shared/form'

interface Ctrl {
  readonly premove: StoredProp<boolean>
  readonly takeback: StoredProp<number>
  readonly autoThreefold: StoredProp<number>
  readonly submitMove: StoredProp<number>
}

interface State {
  ctrl: Ctrl
}

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    this.ctrl = {
      premove: session.lidraughtsBackedProp<boolean>('prefs.premove', session.savePreferences, true),
      takeback: session.lidraughtsBackedProp<number>('prefs.takeback', session.savePreferences, Takeback.ALWAYS),
      autoThreefold: session.lidraughtsBackedProp<number>('prefs.autoThreefold', session.savePreferences, AutoThreefold.TIME),
      submitMove: session.lidraughtsBackedProp<number>('prefs.submitMove', session.savePreferences, SubmitMove.CORRESPONDENCE_ONLY)
    }
  },

  view() {
    const ctrl = this.ctrl
    const header = dropShadowHeader(null, backButton(i18n('gameBehavior')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.game',
        renderAppPrefs().concat(hasNetwork() && session.isConnected() ?
          renderLidraughtsPrefs(ctrl) : []
        )
    ))
  }
} as Mithril.Component<{}, State>

function renderAppPrefs() {
  return [
    h('li.list_item',
      formWidgets.renderMultipleChoiceButton(
        'How do you move pieces?', [
          { label: 'Tap two squares', value: 'tap' },
          { label: 'Drag a piece', value: 'drag' },
          { label: 'Either', value: 'both' },
        ],
        settings.game.pieceMove
      )
    ),
  ]
}

function renderLidraughtsPrefs(ctrl: Ctrl) {
  return [
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('premovesPlayingDuringOpponentTurn'), [
        { label: i18n('no'), value: false },
        { label: i18n('yes'), value: true },
      ], ctrl.premove)),
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('takebacksWithOpponentApproval'), TakebackChoices.map(formWidgets.lidraughtsPropToOption), ctrl.takeback
    )),
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('claimDrawOnThreefoldRepetitionAutomatically').replace(/\%s/g, ''), AutoThreefoldChoices.map(formWidgets.lidraughtsPropToOption), ctrl.autoThreefold
    )),
    h('li.list_item', [
      h('div.label', i18n('moveConfirmation')),
      h('div.select_input.no_label.settingsChoicesBlock', formWidgets.renderLidraughtsPropSelect('', 'moveConfirmation', SubmitMoveChoices, ctrl.submitMove))
    ])
  ]
}

