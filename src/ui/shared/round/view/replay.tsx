import h from 'mithril/hyperscript'
import { san2alg } from '../../../../utils/draughtsFormat'
import * as helper from '../../../helper'
import { autoScroll, autoScrollInline, onReplayTap, getMoveEl } from '../util'
import OnlineRound from '../OnlineRound'

export function renderReplay(ctrl: OnlineRound) {
  if (!ctrl.vm.moveList || ctrl.isZen()) {
    return null
  }

  return h('div.replay.box', {
    oncreate: (vnode: Mithril.VnodeDOM<any, any>) => {
      setTimeout(() => autoScroll(vnode.dom as HTMLElement), 100)
      helper.ontapY((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.VnodeDOM<any, any>) => autoScroll(vnode.dom as HTMLElement),
  }, renderMoves(ctrl))
}

export function renderInlineReplay(ctrl: OnlineRound) {
  if (!ctrl.vm.moveList) {
    return null
  }

  return h('div.replay_inline', {
    className: helper.classSet({
      hidden: ctrl.isZen(),
    }),
    oncreate: (vnode: Mithril.VnodeDOM) => {
      setTimeout(() => autoScrollInline(vnode.dom as HTMLElement), 100)
      helper.ontapX((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.VnodeDOM) => autoScrollInline(vnode.dom as HTMLElement),
  }, renderMoves(ctrl))
}

function renderMoves(ctrl: OnlineRound) {
  return ctrl.data.steps.filter(s => s.san !== null).map(s => h('move.replayMove', {
    className: s.ply === ctrl.vm.ply ? 'current' : '',
    'data-ply': s.ply,
  }, [
    s.ply & 1 ? renderIndex(s.ply, true) : null,
    ctrl.isAlgebraic() ? san2alg(s.san) : s.san!
  ]))
}

function renderIndexText(ply: Ply, withDots?: boolean): string {
  return plyToTurn(ply) + (withDots ? (ply % 2 === 1 ? '.' : '...') : '')
}

function renderIndex(ply: Ply, withDots?: boolean): Mithril.Children {
  return h('index', renderIndexText(ply, withDots))
}

function plyToTurn(ply: number): number {
  return Math.floor((ply - 1) / 2) + 1
}

