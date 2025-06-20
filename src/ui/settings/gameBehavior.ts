import h from 'mithril/hyperscript'
import layout from '../layout'
import i18n from '../../i18n'
import { hasNetwork } from '../../utils'
import settings from '../../settings'
import session from '../../session'
import * as helper from '../helper'
import { dropShadowHeader, backButton } from '../shared/common'
import formWidgets from '../shared/form'
import { prefsCtrl, render as renderLidraughtsPrefs } from '../user/account/gameBehavior'

export default {
  oncreate: helper.viewSlideIn,

  view() {
    const header = dropShadowHeader(null, backButton(i18n('gameBehavior')))
    return layout.free(header,
      h('ul.native_scroller.page.settings_list.multiChoices',
        renderAppPrefs().concat(hasNetwork() && session.isConnected() ?
          renderLidraughtsPrefs(prefsCtrl) : []
        )
    ))
  }
} as Mithril.Component

function renderAppPrefs() {
  return [
    h('li.list_item',
      formWidgets.renderMultipleChoiceButton(
        i18n('howDoYouMovePieces'), [
          { label: i18n('clickTwoSquares'), value: 'tap' },
          { label: i18n('dragPiece'), value: 'drag' },
          { label: i18n('bothClicksAndDrag'), value: 'both' },
        ],
        settings.game.pieceMove
      )
    ),
    h('li.list_item', formWidgets.renderMultipleChoiceButton(
      i18n('howDoYouPlayMultiCaptures'), [
        { label: i18n('stepByStep'), value: false },
        { label: i18n('allAtOnce'), value: true },
      ], settings.analyse.fullCapture
    )),
  ]
}
