import * as h from 'mithril/hyperscript'
import * as draughtsFormat from '../../../utils/draughtsFormat'
import gameStatusApi from '../../../lidraughts/status'
import { findTag, gameResult } from '../../../lidraughts/interfaces/study'
import Board, { Bounds } from '../../shared/Board'
import { Shape } from '../../shared/BoardBrush'
import * as treeOps from '../../shared/tree/ops'

import Clock from './Clock'
import { Tab } from '../tabs'
import { povDiff } from '../ceval/winningChances'
import AnalyseCtrl from '../AnalyseCtrl'
import settings from '../../../settings'
import i18n from '../../../i18n'

export default function renderBoard(
  ctrl: AnalyseCtrl,
  bounds: Bounds,
  availTabs: ReadonlyArray<Tab>
) {
  const curTab = ctrl.currentTab(availTabs)
  const player = ctrl.data.game.player
  const ceval = ctrl.node && ctrl.node.ceval
  const rEval = ctrl.node && ctrl.node.eval

  let nextBest: string | undefined
  let curBestShapes: Shape[] = []
  if (!ctrl.retro && ctrl.settings.s.showBestMove) {
    nextBest = ctrl.nextNodeBest() || (ceval && ceval.best)
    const ghostNode = ctrl.node.displayPly && ctrl.node.displayPly !== ctrl.node.ply && ctrl.nodeList.length > 1;
    if (!nextBest) {
      const prevCeval = ghostNode ? ctrl.nodeList[ctrl.nodeList.length - 2].ceval : undefined;
      if (ghostNode && prevCeval && prevCeval.pvs[0].moves[0].indexOf('x') !== -1 && ctrl.node.uci) {
        const ucis = ctrl.node.uci.match(/.{1,2}/g);
        if (!!ucis) {
          const sans = ucis.slice(0, ucis.length - 1).map(uci => parseInt(uci).toString()).join('x');
          nextBest = prevCeval.pvs[0].moves[0].slice(sans.length + 1);
        }
      } else if (ceval)
        nextBest = ceval.pvs[0].moves[0];
    }
    if (nextBest) {
      const capts = nextBest.split('x').length;
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
  }
  const pastBestShape: Shape[] = !ctrl.retro && rEval && rEval.best ?
    makeShapesFromUci(rEval.best, 'paleGreen') : []

  const nextUci = curTab.id === 'explorer' && ctrl.node && treeOps.withMainlineChild(ctrl.node, n => n.uci)

  const nextMoveShape: Shape[] = nextUci ?
    makeShapesFromUci(nextUci, 'palePurple') : []

  const badNode = ctrl.retro && ctrl.retro.showBadNode()
  const badMoveShape: Shape[] = badNode && badNode.uci ?
    makeShapesFromUci(badNode.uci, 'paleRed') : []

  const shapes = [
    ...nextMoveShape, ...pastBestShape, ...curBestShapes, ...badMoveShape
  ]

  return h('div.analyse-boardWrapper', {
    key: ctrl.settings.s.smallBoard ? 'board-small' : 'board-full',
  }, [
    playerBar(ctrl, ctrl.topColor()),
    h(Board, {
      variant: ctrl.data.game.variant.key,
      boardSizeKey: ctrl.data.game.variant.board.key,
      draughtsground: ctrl.draughtsground,
      bounds,
      shapes,
      clearableShapes: ctrl.node.shapes,
      wrapperClasses: ctrl.settings.s.smallBoard ? 'halfsize' : '',
      canClearShapes: true,
    }),
    playerBar(ctrl, ctrl.bottomColor()),
  ])
}

export function playerBar(ctrl: AnalyseCtrl, color: Color) {
  const pName = ctrl.playerName(color)
  if (ctrl.synthetic && (pName === 'Anonymous' || pName === i18n('anonymous'))) return null

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
    h('div.info', [
      result ? h('span.result', result) : null,
      h('span.name', (title ? title + ' ' : '') + pName + (elo ? ` (${elo})` : '')),
    ]),
    showRight ? h('div.player_bar_clock', [
      h(Clock, { ctrl, color })
    ]) : null,
  ])
}

function makeShapesFromUci(uci: Uci, brush: string, brushFirst?: string): Shape[] {
  const moves = draughtsFormat.decomposeUci(draughtsFormat.scan2uci(uci));
  if (moves.length == 1) return [{
    orig: moves[0],
    brush
  }];
  const shapes: Shape[] = new Array<Shape>();
  for (let i = 0; i < moves.length - 1; i++)
    shapes.push({
      orig: moves[i],
      dest: moves[i + 1],
      brush: (brushFirst && i === 0) ? brushFirst : brush
    });
  return shapes;
}
