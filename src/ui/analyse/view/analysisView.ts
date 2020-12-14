import h from 'mithril/hyperscript'
import i18n  from '../../../i18n'
import { handleXhrError } from '../../../utils'
import { shallowEqual } from '../../../utils/object'
import redraw from '../../../utils/redraw'
import { batchRequestAnimationFrame } from '../../../utils/batchRAF'
import * as gameApi from '../../../lidraughts/game'
import spinner from '../../../spinner'
import { playerName } from '../../../lidraughts/player'
import { AnalyseData, RemoteEvalSummary } from '../../../lidraughts/interfaces/analyse'
import { Study, findTag } from '../../../lidraughts/interfaces/study'
import * as helper from '../../helper'

import { requestComputerAnalysis } from '../analyseXhr'
import AnalyseCtrl from '../AnalyseCtrl'
import drawAcplChart from '../charts/acpl'
import drawMoveTimesChart from '../charts/moveTimes'

export default function renderAnalysis(ctrl: AnalyseCtrl): Mithril.Child {
  const d = ctrl.data

  return h('div.analyse-gameAnalysis.native_scroller', [
    d.analysis ? renderAnalysisGraph(ctrl) :
      ctrl.study ? renderStudyAnalysisRequest(ctrl) : renderGameAnalysisRequest(ctrl),
    d.game.moveCentis ? renderMoveTimes(ctrl, d.game.moveCentis) : null
  ])
}

function renderAnalysisGraph(ctrl: AnalyseCtrl) {
  return h('div.analyse-computerAnalysis', [
    h('strong.title', i18n('computerAnalysis')),
    ctrl.analysisProgress ?
    h('div.analyse-gameAnalysis_chartPlaceholder', spinner.getVdom('monochrome')) :
    h('div.analyse-chart', {
      oncreate({ dom }: Mithril.VnodeDOM<any, any>) {
        setTimeout(() => {
          this.updateCurPly = drawAcplChart(dom as HTMLElement, ctrl, ctrl.node.ply)
        }, 200)
      },
      onupdate() {
        if (this.updateCurPly) batchRequestAnimationFrame(() => {
          if (ctrl.onMainline) this.updateCurPly(ctrl.node.ply)
          else this.updateCurPly(null)
        })
      }
    }),
    h(AcplSummary, {
      d: ctrl.data,
      analysis: ctrl.data.analysis!,
      study: ctrl.study && ctrl.study.data
    })
  ])
}

const AcplSummary: Mithril.Component<{
  d: AnalyseData
  analysis: RemoteEvalSummary
  study?: Study
}, {}> = {
  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    return !shallowEqual(attrs.analysis, oldattrs.analysis)
  },

  view({ attrs }) {
    const { d, analysis, study } = attrs

    const colors: [Color, Color] = ['white', 'black']
    return h('div.analyse-evalSummary', colors.map((color: Color) => {
      const p = gameApi.getPlayer(d, color)
      const pName = study ? findTag(study, color) || i18n('anonymous') : playerName(p)

      return h('table', [
        h('thead', h('tr', [
          h('th', h('span.color-icon.' + color)),
          h('td', [pName, p ? helper.renderRatingDiff(p) : null])
        ])),
        h('tbody', [
          advices.map(a => {
            const nb = analysis && analysis[color][a[0]]
            return h('tr', [
              h('th', nb),
              h('td', i18n(a[1]))
            ])
          }),
          h('tr', [
            h('th', analysis && analysis[color].acpl),
            h('td', i18n('averageCentipieceLoss'))
          ])
        ])
      ])
    }))
  }
}

function renderGameAnalysisRequest(ctrl: AnalyseCtrl) {
  return h('div.analyse-computerAnalysis.request', [
    ctrl.analysisProgress ? h('div.analyse-requestProgress', [
      h('span', i18n('waitingForAnalysis')),
      spinner.getVdom('monochrome')
    ]) : h('button.fatButton', {
      oncreate: helper.ontapXY(() => {
        return requestComputerAnalysis(ctrl.data.game.id)
        .then(() => {
          ctrl.analysisProgress = true
          redraw()
        })
        .catch(handleXhrError)
      })
    }, [i18n('requestAComputerAnalysis')])
  ])
}

function renderStudyAnalysisRequest(ctrl: AnalyseCtrl) {
  return h('div.analyse-computerAnalysis.request', ctrl.mainline.length < 5 ? h('p', i18n('theChapterIsTooShortToBeAnalysed')) :
      !ctrl.study!.canContribute() ? h('p', i18n('onlyContributorsCanRequestAnalysis')) : [
        h('p', [
          i18n('getAFullComputerAnalysis'),
          h('br'),
          i18n('makeSureTheChapterIsComplete')
        ]),
        ctrl.analysisProgress ? h('div.analyse-requestProgress', [
          h('span', i18n('waitingForAnalysis')),
          spinner.getVdom('monochrome')
        ]) : h('button.fatButton', {
          oncreate: helper.ontapXY(() => {
            ctrl.socket.send('requestAnalysis', ctrl.study!.data.chapter.id)
            ctrl.analysisProgress = true
            redraw()
          })
        }, [i18n('requestAComputerAnalysis')])
    ]
  )
}

function renderMoveTimes(ctrl: AnalyseCtrl, moveCentis: number[]) {
  return h('div.analyse-moveTimes', [
    h('strong.title', i18n('moveTimes')),
    h('div.analyse-chart', {
      oncreate({ dom }: Mithril.VnodeDOM<any, any>) {
        setTimeout(() => {
          this.updateCurPly = drawMoveTimesChart(dom as HTMLElement, ctrl.data, moveCentis, ctrl.node.ply)
        }, 200)
      },
      onupdate() {
        if (this.updateCurPly) batchRequestAnimationFrame(() => {
          if (ctrl.onMainline) this.updateCurPly(ctrl.node.ply)
          else this.updateCurPly(null)
        })
      }
    })
  ])
}

const advices = [
  ['inaccuracy', 'inaccuracies'],
  ['mistake', 'mistakes'],
  ['blunder', 'blunders']
]
