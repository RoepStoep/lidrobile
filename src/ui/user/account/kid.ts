import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import session from '../../../session'
import { StoredProp } from '../../../storage'
import formWidgets from '../../shared/form'
import { dropShadowHeader, backButton } from '../../shared/common'
import * as helper from '../../helper'
import i18n from '../../../i18n'
import layout from '../../layout'

interface State {
  kidMode: StoredProp<boolean>
}

const KidPrefScreen: Mithril.Component<{}, State> = {
  oncreate: helper.viewSlideIn,

  oninit() {
    this.kidMode = session.lidraughtsBackedProp<boolean>('kid', session.setKidMode, false)
  },

  view() {
    const header = dropShadowHeader(null, backButton(i18n('kidMode')))
    return layout.free(header, renderBody(this))
  }
}

export default KidPrefScreen

function renderBody(ctrl: State) {
  return [
    h('div.native_scroller.page.settings_list.game', [
      h('p.explanation', i18n('kidModeExplanation')),
      h('p.list_item', i18n('inKidModeTheLidraughtsLogoGetsIconX', '😊')),
      h('p.list_item', formWidgets.renderCheckbox(i18n('enableKidMode'), 'kidMode', ctrl.kidMode))
    ])
  ]
}

