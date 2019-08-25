import * as helper from '../../helper'
import layout from '../../layout'
import i18n from '../../../i18n'
import { dropShadowHeader } from '../../shared/common'

import FollowersCtrl from './followersCtrl'
import { IRelationCtrl } from '../interfaces'
import { renderBody } from '../relatedView'

interface Attrs {
  id: string
}

interface State {
  ctrl: IRelationCtrl
}

export default {
  oncreate: helper.viewFadeIn,

  oninit(vnode) {
    this.ctrl = FollowersCtrl(vnode.attrs.id)
  },
  view() {
    return layout.free(
      dropShadowHeader(i18n('followers')),
      renderBody(this.ctrl)
    )
  }
} as Mithril.Component<Attrs, State>
