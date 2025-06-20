import h from 'mithril/hyperscript'
import i18n from '../../i18n'
import settings from '../../settings'
import session from '../../session'
import { hasNetwork } from '../../utils'
import * as helper from '../helper'
import { dropShadowHeader, backButton } from '../shared/common'
import formWidgets from '../shared/form'
import layout from '../layout'
import { prefsCtrl, render as renderDraughtsPrefs } from '../user/account/clock'

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('clock')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.multiChoices',
        renderAppPrefs().concat(hasNetwork() && session.isConnected() ?
          renderDraughtsPrefs(prefsCtrl) : []
        )
    ))
  }
} as Mithril.Component

function renderAppPrefs() {
  return [
    h('li.list_item',
      formWidgets.renderMultipleChoiceButton(
        i18n('settingsClockPosition'), [
          { label: i18n('positionLeft'), value: 'left' },
          { label: i18n('positionRight'), value: 'right' },
        ],
        settings.game.clockPosition
      )
    ),
  ]
}
