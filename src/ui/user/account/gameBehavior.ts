import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import layout from '../../layout'
import i18n from '../../../i18n'
import session from '../../../session'
import { Takeback, SubmitMove, AutoThreefold, SubmitMoveChoices, TakebackChoices, AutoThreefoldChoices } from '../../../lidraughts/prefs'
import * as helper from '../../helper'
import { dropShadowHeader, backButton } from '../../shared/common'
import formWidgets from '../../shared/form'

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('gameBehavior')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.game', renderLidraughtsPrefs(prefsCtrl))
    )
  }
} as Mithril.Component<{}, {}>

export const prefsCtrl = {
  premove: session.lidraughtsBackedProp<boolean>('prefs.premove', session.savePreferences, true),
  takeback: session.lidraughtsBackedProp<number>('prefs.takeback', session.savePreferences, Takeback.ALWAYS),
  autoThreefold: session.lidraughtsBackedProp<number>('prefs.autoThreefold', session.savePreferences, AutoThreefold.TIME),
  submitMove: session.lidraughtsBackedProp<number>('prefs.submitMove', session.savePreferences, SubmitMove.CORRESPONDENCE_ONLY),
}

export function renderLidraughtsPrefs(ctrl: typeof prefsCtrl) {
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
    ]),
  ]
}
