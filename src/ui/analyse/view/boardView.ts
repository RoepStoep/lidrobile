import h from 'mithril/hyperscript'
import * as draughtsFormat from '../../../utils/draughtsFormat'
import gameStatusApi from '../../../lidraughts/status'
import { findTag, gameResult } from '../../../lidraughts/interfaces/study'
import Board from '../../shared/Board'
import { Shape } from '../../shared/BoardBrush'

import Clock from './Clock'
import { povDiff } from '../ceval/winningChances'
import AnalyseCtrl from '../AnalyseCtrl'
import settings from '../../../settings'
import i18n from '../../../i18n'

export default function renderBoard(ctrl: AnalyseCtrl) {
  return h('div.analyse-boardWrapper', [
    playerBar(ctrl, ctrl.topColor()),
    h(Board, {
      variant: ctrl.data.game.variant.key,
      draughtsground: ctrl.draughtsground,
      shapes: computeShapes(ctrl),
      clearableShapes: ctrl.node.shapes,
      wrapperClasses: ctrl.settings.s.smallBoard ? 'halfsize' : '',
      canClearShapes: true,
    }),
    playerBar(ctrl, ctrl.bottomColor()),
  ])
}

export function playerBar(ctrl: AnalyseCtrl, color: Color): Mithril.Child {
  const pName = ctrl.playerName(color)
  const isAnonymous = pName === 'Anonymous' || pName === i18n('anonymous')
  if (ctrl.synthetic && isAnonymous) return null

  // Assumes studies without player info do not have clock info
  if ((ctrl.study && isAnonymous) || (!ctrl.study && ctrl.synthetic)) {
    return null
  }


  const study = ctrl.study && ctrl.study.data
  let title, elo, result: string | undefined
  if (study) {
    title = findTag(study, `${color}title`)
    elo = findTag(study, `${color}elo`)
    result = gameResult(study, color === 'white')
  } else if (gameStatusApi.finished(ctrl.data)) {
    const winner = ctrl.data.game.winner
    if (settings.game.draughtsResult()) {
      result = winner === undefined ? '1' : winner === color ? '2' : '0'
    } else {
      result = winner === undefined ? '½' : winner === color ? '1' : '0'
    }
  }
  const showRight = ctrl.node.clock
  return h('div.analyse-player_bar', {
    className: ctrl.settings.s.smallBoard ? 'halfsize' : ''
  }, [
    h('div.info', isAnonymous ? h.trust('&nbsp') : [
      result ? h('span.result', result) : null,
      h('span.name', (title ? title + ' ' : '') + pName + (elo ? ` (${elo})` : '')),
    ]),
    showRight ? h('div.player_bar_clock', [
      h(Clock, { ctrl, color })
    ]) : null,
  ])
}

function computeShapes(ctrl: AnalyseCtrl): readonly Shape[] {
  const player = ctrl.data.game.player
  const ceval = ctrl.node && ctrl.node.ceval
  const rEval = ctrl.node && ctrl.node.eval
  const threat = ctrl.node && ctrl.node.threat
  let curBestShapes: readonly Shape[] = []
  let pastBestShape: readonly Shape[] = []
  let threatShape: readonly Shape[] = []

  if (ctrl.practice) {
    const hint = ctrl.practice.hinting()
    if (hint) {
      if (hint.mode === 'move') curBestShapes = makeShapesFromUci(hint.uci, 'paleBlue')
      else curBestShapes = [{
        orig: draughtsFormat.decomposeUci(hint.uci)[0],
        brush: 'paleBlue_2'
      }]
    }
  }

  if (!ctrl.retro && !ctrl.practice && ctrl.settings.s.showBestMove) {
    let nextBest = ctrl.nextNodeBest() || (ceval && ceval.best)
    const ghostNode = ctrl.node.displayPly && ctrl.node.displayPly !== ctrl.node.ply && ctrl.nodeList.length > 1
    if (!nextBest) {
      const prevCeval = ghostNode ? ctrl.nodeList[ctrl.nodeList.length - 2].ceval : undefined
      if (ghostNode && prevCeval && prevCeval.pvs[0].moves[0].indexOf('x') !== -1 && ctrl.node.uci) {
        const ucis = ctrl.node.uci.match(/.{1,2}/g)
        if (ucis) {
          const sans = ucis.slice(0, ucis.length - 1).map(uci => parseInt(uci).toString()).join('x')
          nextBest = prevCeval.pvs[0].moves[0].slice(sans.length + 1)
        }
      } else if (ceval)
        nextBest = ceval.pvs[0].moves[0]
    }
    if (nextBest) {
      const capts = nextBest.split('x').length
      curBestShapes = makeShapesFromUci(nextBest, capts > 4 ? 'paleBlue_3' : 'paleBlue', capts > 4 ? 'paleBlue_2' : '')
    }
    if (!ghostNode && ceval && ceval.pvs.length > 1) {
      ceval.pvs.slice(1).forEach(pv => {
        const shift = povDiff(player, ceval.pvs[0], pv)
        if (shift >= 0 && shift < 0.2) {
          const linewidth = Math.round(12 - shift * 50) // 12 to 2
          curBestShapes = curBestShapes.concat(makeShapesFromUci(pv.moves[0], 'paleBlue' + linewidth))
        }
      })
    }
    if (rEval && rEval.best) {
      pastBestShape = makeShapesFromUci(rEval.best, 'paleGreen')
    }
  }

  if (!ctrl.retro && !ctrl.practice && ctrl.showThreat && threat) {
    const capts = threat.pvs[0].moves[0].split('x').length
    threatShape = makeShapesFromUci(threat.pvs[0].moves[0], capts > 1 ? 'paleRed' : 'paleRed3')
  }

  const badNode = ctrl.retro && ctrl.retro.showBadNode()
  const badMoveShape: Shape[] = badNode && badNode.uci ?
    makeShapesFromUci(badNode.uci, 'paleRed2') : []

  return [
    ...pastBestShape, ...curBestShapes, ...threatShape, ...badMoveShape
  ]
}

function makeShapesFromUci(uci: Uci, brush: string, brushFirst?: string): Shape[] {
  const moves = draughtsFormat.decomposeUci(draughtsFormat.scan2uci(uci))
  if (moves.length === 1) return [{
    orig: moves[0],
    brush
  }]
  const shapes: Shape[] = new Array<Shape>()
  for (let i = 0; i < moves.length - 1; i++)
    shapes.push({
      orig: moves[i],
      dest: moves[i + 1],
      brush: (brushFirst && i === 0) ? brushFirst : brush
    })
  return shapes
}
