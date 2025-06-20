import h from 'mithril/hyperscript'
import layout from '../../layout'
import i18n from '../../../i18n'
import session from '../../../session'
import { MoreTime, MoreTimeChoices, ClockTenths, ClockTenthsChoices, PrefValue } from '../../../lidraughts/prefs'
import * as helper from '../../helper'
import { dropShadowHeader, backButton } from '../../shared/common'
import formWidgets from '../../shared/form'
import { Prop } from '~/settings'

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('clock')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.game', render(prefsCtrl))
    )
  }
} as Mithril.Component

export const prefsCtrl = {
  clockTenths: session.lidraughtsBackedProp<number>('prefs.clockTenths', ClockTenths.LOWTIME),
  clockSound: session.lidraughtsBackedProp<boolean>('prefs.clockSound', true),
  moreTime: session.lidraughtsBackedProp<number>('prefs.moretime', MoreTime.ALWAYS),
}

export function render(ctrl: typeof prefsCtrl) {
  return [
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('tenthsOfSeconds'), ClockTenthsChoices, ctrl.clockTenths as Prop<PrefValue>
    )),
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('soundWhenTimeGetsCritical'), [
        { label: i18n('no'), value: false },
        { label: i18n('yes'), value: true },
      ], ctrl.clockSound)),
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('giveMoreTime'), MoreTimeChoices, ctrl.moreTime as Prop<PrefValue>
    )),
  ]
}

