import h from 'mithril/hyperscript'
import i18n, { plural } from '~/i18n'
import { playable } from '~/lidraughts/game'
import { ForecastStep } from '~/lidraughts/interfaces/forecast'
import { ontap } from '~/ui/helper'
import AnalyseCtrl from '../AnalyseCtrl'
import ForecastCtrl, { keyOf } from './ForecastCtrl'
import { groupMoves } from './util'
import { Tree } from '../../shared/tree'
import { read, write } from '~/draughtsground/fen'
import { calcCaptKey } from '~/draughtsground/board'
import { san2alg } from '../../../utils/draughtsFormat'
import { key2pos } from '~/draughtsground/util'

type MaybeVNode = Mithril.Child | null

export default function renderForecasts(ctrl: AnalyseCtrl): MaybeVNode {
  const fctrl = ctrl.forecast
  if (!fctrl || ctrl.synthetic || !playable(ctrl.data)) return null

  const candidateNodes = makeCandidateNodes(ctrl, fctrl)
  const isCandidate = fctrl.isCandidate(candidateNodes)

  return (
    h('div.analyse-training_box.analyse-forecast_box.box', {
      className: fctrl.minimized ? 'minimized' : '',
      oncreate: ontap(() => { fctrl.focusKey = null }),
    }, [
      renderTitle(fctrl),
      h('div.forecasts-wrapper.native_scroller', [
        h(
          'div.forecasts-list',
          [
            ...fctrl.lines.map(nodes => {
              const key = keyOf(nodes)
              return h(
                'div.forecast[data-icon=G]',
                {
                  key: key,
                  oncreate: ontap((e) => {
                    e.stopPropagation()
                    fctrl.focusKey = key
                  }),
                },
                [
                  h('sans', renderNodesHtml(nodes, ctrl.isAlgebraic())),
                  fctrl.focusKey === key ? h(
                    'span.fa.fa-times-circle.delete',
                    {
                      oncreate: ontap(
                        e => {
                          e.stopPropagation()
                          fctrl.removeForecast(key)
                        }
                      )
                    }
                  ) : null,
                ]
              )
            }),
          ]
        ),
        h('div.add', {
          className: isCandidate ? 'enabled' : '',
          'data-icon': isCandidate ? 'O' : '',
          oncreate: ontap(() => {
            const candidateNodes = makeCandidateNodes(ctrl, fctrl)
            fctrl.add(candidateNodes)
          })
        }, [
          isCandidate ? h('div', [
            h('span', i18n('addCurrentVariation')),
            h('sans', renderNodesHtml(candidateNodes, ctrl.isAlgebraic())),
          ]) :
          h('span', i18n('playVariationToCreateConditionalPremoves'))
        ]),
        renderOnMyTurnView(ctrl, candidateNodes),
        fctrl.loading ? renderSpinner() : null,
      ]),
    ])
  )
}

function shortKey(key: string) {
  return key.slice(0, 1) === '0' ? key.slice(1) : key
}

function makeCandidateNodes(
  ctrl: AnalyseCtrl,
  fctrl: ForecastCtrl
): ForecastStep[] {
  const withCurrent = ctrl.tree.getCurrentNodesAfterPly(
    ctrl.nodeList,
    ctrl.mainline,
    Math.max(0, ctrl.data.game.turns - 1)
  )
  const expandedNodes: ForecastStep[] = []
  let afterCurrent: Tree.Node[] = [], skippedSteps = 0, currentFen: string | undefined
  for (let n = 0; n < withCurrent.length; n++) {
    const node = withCurrent[n], nodePly = node.displayPly || node.ply
    if (nodePly > ctrl.data.game.turns) {
      afterCurrent = withCurrent.slice(n)
      break
    }
    currentFen = node.fen
  }
  if (!afterCurrent) return expandedNodes
  for (const node of fctrl.truncateNodes(afterCurrent)) {
    if (node.uci && node.uci.length >= 6 && currentFen) {
      let uci = node.uci, orig = uci.slice(0, 2) as Key
      const pieces = read(currentFen), origPiece = pieces[orig]
      const boardSize = ctrl.data.game.variant.board.size
      while (uci.length >= 4) {
        delete pieces[orig]
        const dest = uci.slice(2, 4) as Key
        const origPos = key2pos(orig, boardSize), destPos = key2pos(dest, boardSize)
        const captKey = calcCaptKey(pieces, boardSize, origPos[0], origPos[1], destPos[0], destPos[1])
        if (!captKey) break
        const captPiece = pieces[captKey]
        pieces[captKey] = {
          role: captPiece.role === 'king' ? 'ghostking' : 'ghostman',
          color: captPiece.color
        }
        pieces[dest] = origPiece

        skippedSteps++
        if (skippedSteps > fctrl.skipSteps) {
          const done = uci.length === 4, fen = done ? node.fen : currentFen.slice(0, 2) + write(pieces)
          expandedNodes.push({
            ply: done ? node.ply : (node.ply - 1),
            displayPly: node.ply,
            fen: fen,
            uci: uci.slice(0, 4),
            san: shortKey(orig) + 'x' + shortKey(dest)
          })
        }

        uci = uci.slice(2)
        orig = dest
      }
    } else {
      skippedSteps++
      if (skippedSteps > fctrl.skipSteps)
        expandedNodes.push({
          ply: node.ply,
          displayPly: node.displayPly,
          fen: node.fen,
          uci: node.uci!,
          san: node.san!
        })
    }
    if (expandedNodes.length) {
      currentFen = expandedNodes[expandedNodes.length - 1].fen
    }
  }
  return expandedNodes
}

function renderNodesHtml(nodes: ForecastStep[], algebraic: boolean): MaybeVNode[] {
  if (!nodes[0]) return []
  if (!nodes[0].san) nodes = nodes.slice(1)
  if (!nodes[0]) return []

  return groupMoves(nodes).map(({ black, white, index }) => {
    return h('move', [
      h('index', index + (white ? '.' : '...')),
      white ? h('san', algebraic ? san2alg(white) : white) : null,
      black ? h('san', algebraic ? san2alg(black) : black) : null,
    ])
  })
}

function renderOnMyTurnView(ctrl: AnalyseCtrl, candidate: ForecastStep[]): MaybeVNode {
  if (!ctrl.forecast?.isMyTurn) return
  const firstNode = candidate[0]
  if (!firstNode) return
  const candidates = ctrl.forecast.findStartingWithNode(firstNode)
  if (!candidates.length) return

  const lineCount = candidates.filter((candidate) => {
    return candidate.length > 1
  }).length

  return (
    h('div.on-my-turn',
      h(
        'button.defaultButton',
        {
          oncreate: ontap(() => ctrl.forecast!.playAndSave(firstNode))
        }, [
          h('span.fa.fa-check'),
          h('span', [
            h('strong', i18n('playX', candidate[0].san)),
            ' ',
            lineCount ? h('span', plural('andSaveNbPremoveLines', lineCount)) : null
          ])
        ],
      )
    )
  )
}

function renderSpinner(): Mithril.Child {
  return h('div.spinner_overlay', h('div.spinner.fa.fa-hourglass-half'))
}

function renderTitle(ctrl: ForecastCtrl): Mithril.Child {
  return h('div.titleWrapper', [
    h('div.title', [i18n('conditionalPremoves'), ctrl.lines.length > 0 ? ` (${ctrl.lines.length})` : null]),
    h('div.actions', [
      h('button.window-button', {
        oncreate: ontap(() => ctrl.toggleMinimized())
      }, h('span.fa', {
        className: ctrl.minimized ? 'fa-window-maximize' : 'fa-window-minimize'
      })),
    ])
  ])
}
