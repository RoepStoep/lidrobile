import * as h from 'mithril/hyperscript'
import settings from '../../../settings'
import * as helper from '../../helper'
import ground from './ground'
import { OnlineRoundInterface } from '.'

let promoting: KeyPair | null = null

function start(ctrl: OnlineRoundInterface, orig: Key, dest: Key, isPremove: boolean) {
  const piece = ctrl.draughtsground.state.pieces[dest]
  if (piece && piece.role === 'man' && (
    (dest[1] === '10' && ctrl.data.player.color === 'white') ||
    (dest[1] === '1' && ctrl.data.player.color === 'black'))) {
    dest += isPremove? orig : dest;
    return false
  }
  return false
}

function finish(ctrl: OnlineRoundInterface, role: Role) {
  if (promoting) {
    ground.promote(ctrl.draughtsground, promoting[1])
    ctrl.sendMove(promoting[0], promoting[1], role)
  }
  promoting = null
}

function cancel(ctrl: OnlineRoundInterface) {
  if (promoting) ctrl.reloadGameData()
  promoting = null
}

export default {

  start: start,

  view: function(ctrl: OnlineRoundInterface) {
    if (!promoting) return null

    const pieces = ['queen', 'knight', 'rook', 'bishop']
    if (ctrl.data.game.variant.key === 'antichess') pieces.push('king')

    return h('div.overlay.open', {
      oncreate: helper.ontap(cancel.bind(undefined, ctrl))
    }, [h('div#promotion_choice', {
      className: settings.general.theme.piece(),
      style: { top: (helper.viewportDim().vh - 100) / 2 + 'px' }
    }, pieces.map(function(role) {
      return h('piece.' + role + '.' + ctrl.data.player.color, {
        oncreate: helper.ontap(finish.bind(undefined, ctrl, role))
      })
    }))])
  }
}
