import * as h from 'mithril/hyperscript'
/*import * as utils from '../../../utils'*/
import i18n from '../../../i18n'
import * as gameApi from '../../../lidraughts/game'
import gameStatusApi from '../../../lidraughts/status'
import { san2alg } from '../../../utils/draughtsFormat'
import { renderMaterial } from '../../shared/round/view/roundView'
import * as helper from '../../helper'
import { OfflineRoundInterface, Position, Material } from '../round'
import Replay from './Replay'
import { IDraughtsClock, IStageClock } from '../clock/interfaces'
import { formatClockTime } from '../round/clock/clockView'
import { autoScroll, autoScrollInline, onReplayTap, getMoveEl } from '../round/util'

/*function getChecksCount(ctrl: OfflineRoundInterface, color: Color) {
  const sit = ctrl.replay.situation()
  if (sit.checkCount)
    return utils.oppositeColor(color) === 'white' ?
      sit.checkCount.white : sit.checkCount.black
  else
    return 0
}*/

export function renderAntagonist(
  ctrl: OfflineRoundInterface,
  content: Mithril.Children,
  material: Material,
  position: Position,
  isPortrait: boolean,
  otbFlip?: boolean,
  clock?: IDraughtsClock,
) {
  const isCrazy = false
  const key = isPortrait ? position + '-portrait' : position + '-landscape'
  const antagonist = position === 'player' ? ctrl.data.player : ctrl.data.opponent
  const antagonistColor = antagonist.color

  const className = [
    'playTable',
    'offline',
    position,
    isCrazy ? 'crazy' : '',
    otbFlip !== undefined ? otbFlip ? 'mode_flip' : 'mode_facing' : '',
    ctrl.draughtsground.state.turnColor === ctrl.data.player.color ? 'player_turn' : 'opponent_turn',
  ].join(' ')

  return (
    <section id={position + '_info'} className={className} key={key}>
      <div key="infos" className={'antagonistInfos offline' + (isCrazy ? ' crazy' : '')}>
        <div className="antagonistUser">
          {content}
          {isCrazy && clock ? renderClock(clock, antagonistColor) : ''}
        </div>
        { !isCrazy ? <div className="ratingAndMaterial">
          {renderMaterial(material)}
        </div> : null
        }
      </div>
      {clock ? renderClock(clock, antagonistColor) : null}
    </section>
  )
}


export function renderGameActionsBar(ctrl: OfflineRoundInterface) {
  return (
    <section key="actionsBar" className="actions_bar">
      <button className="action_bar_button fa fa-ellipsis-v"
        oncreate={helper.ontap(ctrl.actions.open)}
      />
      <button className="action_bar_button fa fa-plus-circle"
        oncreate={helper.ontap(
          ctrl.newGameMenu.open,
          () => window.plugins.toast.show(i18n('createAGame'), 'short', 'bottom')
        )}
      />
      <button className="fa fa-share-alt action_bar_button"
        oncreate={helper.ontap(
          ctrl.sharePDN,
          () => window.plugins.toast.show(i18n('sharePDN'), 'short', 'bottom')
        )}
      />
      {renderBackwardButton(ctrl)}
      {renderForwardButton(ctrl)}
    </section>
  )
}

export function renderGameActionsBarTablet(ctrl: OfflineRoundInterface) {
  return (
    <section className="actions_bar">
      <button className="action_bar_button" data-icon="U"
        oncreate={helper.ontap(ctrl.newGameMenu.open, () => window.plugins.toast.show(i18n('createAGame'), 'short', 'bottom'))}
      />
      <button className="fa fa-share-alt action_bar_button"
        oncreate={helper.ontap(ctrl.actions.sharePDN, () => window.plugins.toast.show(i18n('sharePDN'), 'short', 'bottom'))}
      />
      {renderBackwardButton(ctrl)}
      {renderForwardButton(ctrl)}
    </section>
  )
}

export function renderEndedGameStatus(ctrl: OfflineRoundInterface) {
  if (!ctrl.replay) return null

  if (gameStatusApi.finished(ctrl.data)) {
    const result = gameApi.result(ctrl.data)
    const winner = ctrl.data.game.winner
    const status = gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key) +
      (winner ? (ctrl.data.game.status.name !== 'mate' ? '. ' : '') + i18n(winner === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
    return (
      <div key="result" className="result">
        {result}
        <br />
        <em className="resultStatus">{status}</em>
      </div>
    )
  }

  return null
}

export function renderClaimDrawButton(ctrl: OfflineRoundInterface) {
  return (gameApi.playable(ctrl.data) && gameApi.threefoldable(ctrl.data)) ? h('div.claimDraw', {
    key: 'claimDraw'
  }, [
    h('button[data-icon=2].draw-yes', {
      oncreate: helper.ontap(() => ctrl.replay.claimDraw())
    }, i18n('threefoldRepetition'))
  ]) : null
}

export function renderNewGameButton(ctrl: OfflineRoundInterface) {
  return gameStatusApi.finished(ctrl.data) ? [
    h('div', [
      h('button', {
        oncreate: helper.ontap(() => {
          ctrl.actions.close()
          ctrl.newGameMenu.open()
        })
      }, [h('span.fa.fa-plus-circle'), i18n('createAGame')])
    ])
  ] : null
}

export function renderReplay(ctrl: OfflineRoundInterface) {
  return h('div.replay', {
    oncreate: (vnode: Mithril.DOMNode) => {
      setTimeout(() => autoScroll(vnode.dom as HTMLElement), 100)
      helper.ontapY((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.DOMNode) => autoScroll(vnode.dom as HTMLElement),
  }, renderMoves(ctrl.replay))
}


export function renderInlineReplay(ctrl: OfflineRoundInterface) {

  if (!ctrl.moveList) {
    return null
  }

  return h('div.replay_inline', {
    oncreate: (vnode: Mithril.DOMNode) => {
      setTimeout(() => autoScrollInline(vnode.dom as HTMLElement), 100)
      helper.ontapX((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.DOMNode) => autoScrollInline(vnode.dom as HTMLElement),
  }, renderMoves(ctrl.replay))
}


export function renderBackwardButton(ctrl: OfflineRoundInterface) {
  return h('button.action_bar_button.fa.fa-step-backward', {
    oncreate: helper.ontap(ctrl.jumpPrev, ctrl.jumpFirst),
    className: helper.classSet({
      disabled: !(ctrl.replay.ply > ctrl.firstPly())
    })
  })
}

export function renderForwardButton(ctrl: OfflineRoundInterface) {
  return h('button.action_bar_button.fa.fa-step-forward', {
    oncreate: helper.ontap(ctrl.jumpNext, ctrl.jumpLast),
    className: helper.classSet({
      disabled: !(ctrl.replay.ply < ctrl.lastPly())
    })
  })
}

function renderMoves(replay: Replay) {
  return replay.situations.filter(s => s.san !== undefined).map(s => h('move.replayMove', {
    className: s.ply === replay.ply ? 'current' : '',
    'data-ply': s.ply,
  }, [
    s.ply & 1 ? h('index', renderIndex(s.ply, true)) : null,
    replay.isAlgebraic() ? san2alg(s.san) : s.san!
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

function renderClock(clock: IDraughtsClock, color: Color) {
  const runningColor = clock.activeSide()
  const time = clock.getTime(color)
  const isRunning = runningColor === color
  const moves = clock.clockType === 'stage' ? (clock as IStageClock).getMoves(color) : null
  return h('div', {
    className: helper.classSet({
      clock: true,
      outoftime: !time,
      running: isRunning,
      offlineClock: true,
      stageClock: !!moves,
    })
  }, [
    formatClockTime(time, isRunning),
    moves ? h('div.clockMoves', 'Moves: ' + moves) : null
  ])
}
