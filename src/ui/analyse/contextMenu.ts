import h from 'mithril/hyperscript'
import redraw from '../../utils/redraw'
import popupWidget from '../shared/popup'
import * as helper from '../helper'
import { nodeFullName } from './util'
import i18n from '../../i18n'
import AnalyseCtrl from './AnalyseCtrl'

export function view(ctrl: AnalyseCtrl): Mithril.Child | null {

  if (!ctrl.contextMenu) return null

  const path = ctrl.contextMenu
  const node = ctrl.tree.nodeAtPath(path)
  const onMainline = ctrl.tree.pathIsMainline(path)

  return popupWidget(
    'analyse-cm',
    () => nodeFullName(node, ctrl.isAlgebraic()),
    () => {
      return [
        onMainline ? null : action('S', i18n('promoteVariation'), () => ctrl.promote(path, false)),
        onMainline ? null : action('E', i18n('makeMainLine'), () => ctrl.promote(path, true)),
        action('q', i18n('deleteFromHere'), () => ctrl.deleteNode(path))
      ]
    },
    true,
    () => {
      ctrl.contextMenu = null
      redraw()
    }
  )
}

function action(icon: string, text: string, handler: () => void): Mithril.Child {
  return h('button.withIcon', {
    'data-icon': icon,
    oncreate: helper.ontapXY(handler)
  }, text)
}
