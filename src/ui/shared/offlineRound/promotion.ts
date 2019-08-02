import redraw from '../../../utils/redraw'
import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import * as helper from '../../helper'
import settings from '../../../settings'
import * as h from 'mithril/hyperscript'
import { PromotingInterface } from '../round'

type PromoteCallback = (orig: Key, dest: Key) => void
interface Promoting {
  orig: Key
  dest: Key
  callback: PromoteCallback
}

let promoting: Promoting | null = null

function promote(ground: Draughtsground, key: Key) {
  const pieces: {[k: string]: Piece } = {}
  const piece = ground.state.pieces[key]
  if (piece && piece.role === 'man') {
    pieces[key] = {
      color: piece.color,
      role: 'king'
    }
    ground.setPieces(pieces)
  }
}

function start(draughtsground: Draughtsground, orig: Key, dest: Key, callback: PromoteCallback) {
  const piece = draughtsground.state.pieces[dest]
  if (piece && piece.role === 'man' && (
    (dest[1] === '1' && draughtsground.state.turnColor === 'white') ||
    (dest[1] === '10' && draughtsground.state.turnColor === 'black'))) {
    promoting = {
      orig: orig,
      dest: dest,
      callback: callback
    }
    redraw()
    return true
  }
  return false
}

function finish(ground: Draughtsground) {
  if (promoting) promote(ground, promoting.dest)
  if (promoting && promoting.callback) promoting.callback(promoting.orig, promoting.dest)
  promoting = null
}

function cancel(draughtsground: Draughtsground, cgConfig?: cg.SetConfig) {
  if (promoting) {
    promoting = null
    if (cgConfig) draughtsground.set(cgConfig)
    redraw()
  }
}

export function view(ctrl: PromotingInterface) {
  if (!promoting) return null

  const pieces = ['queen', 'knight', 'rook', 'bishop']

  return h('div.overlay.open', [h('div#promotion_choice', {
    className: settings.general.theme.piece(),
    style: { top: (helper.viewportDim().vh - 100) / 2 + 'px' }
  }, pieces.map((role: Role) => {
    return h('piece.' + role + '.' + ctrl.player(), {
      oncreate: helper.ontap(() => finish(ctrl.draughtsground))
    })
  }))])
}

export default {
  start,
  cancel
}
