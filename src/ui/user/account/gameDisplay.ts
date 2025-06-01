import h from 'mithril/hyperscript'
import layout from '../../layout'
import i18n from '../../../i18n'
import session from '../../../session'
import { AnimationChoices, Animation, PrefValue } from '../../../lidraughts/prefs'
import * as helper from '../../helper'
import { dropShadowHeader, backButton } from '../../shared/common'
import formWidgets from '../../shared/form'
import { Prop } from '~/settings'

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('display')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.game', render(prefsCtrl))
    )
  }
} as Mithril.Component

const prefsCtrl = {
  animation: session.lidraughtsBackedProp<number>('prefs.animation', Animation.NORMAL),
  showCaptured: session.lidraughtsBackedProp<boolean>('prefs.captured', true),
}

export function render(ctrl: typeof prefsCtrl) {
  return [
    h('li.list_item',
      formWidgets.renderMultipleChoiceButton(i18n('pieceAnimation'), AnimationChoices, ctrl.animation as Prop<PrefValue>),
    ),
    h('li.list_item',
      formWidgets.renderMultipleChoiceButton(i18n('materialDifference'), formWidgets.booleanChoice, ctrl.showCaptured),
    ),
  ]
}

