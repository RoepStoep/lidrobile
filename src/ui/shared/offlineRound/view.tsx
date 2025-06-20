import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import i18n from '../../../i18n'
import * as gameApi from '../../../lidraughts/game'
import gameStatusApi from '../../../lidraughts/status'
import { san2alg } from '../../../utils/draughtsFormat'
import { renderMaterial } from '../../shared/round/view/roundView'
import * as helper from '../../helper'
import { OfflineRoundInterface, Position, Material } from '../round'
import Replay from './Replay'
import { IDraughtsClock, IStageClock } from '../clock/interfaces'
import { autoScroll, autoScrollInline, onReplayTap, getMoveEl } from '../round/util'

export function renderAntagonist(
  ctrl: OfflineRoundInterface,
  content: Mithril.Children,
  material: Material,
  position: Position,
  otbFlip?: boolean,
  otbMirror?: boolean,
  clock?: IDraughtsClock,
) {
  const antagonist = position === 'player' ? ctrl.data.player : ctrl.data.opponent
  const antagonistColor = antagonist.color

  const className = [
    'playTable',
    'offline',
    position,
    otbFlip !== undefined ? otbFlip ? 'mode_flip' : (otbMirror ? 'mode_facing' : '') : '',
    ctrl.draughtsground.state.turnColor === ctrl.data.player.color ? 'player_turn' : 'opponent_turn',
  ].join(' ')

  return (
    <section id={position + '_info'} className={className}>
      <div className={'antagonistInfos offline'}>
        <div className="antagonistUser">
          {content}
        </div>
        <div className="ratingAndMaterial">
          {renderMaterial(material)}
        </div>
      </div>
      {clock ? renderClock(clock, antagonistColor) : null}
    </section>
  )
}


export function renderGameActionsBar(ctrl: OfflineRoundInterface) {
  return (
    <section className="actions_bar">
      <button className="action_bar_button fa fa-list"
        oncreate={helper.ontap(ctrl.actions.open)}
      />
      <button className="action_bar_button fa fa-plus-circle"
        oncreate={helper.ontap(
          ctrl.newGameMenu.open,
          () => Toast.show({ text: i18n('createAGame'), duration: 'short', position: 'bottom' })
        )}
      />
      <button className="fa fa-share-alt action_bar_button"
        oncreate={helper.ontap(
          ctrl.sharePDN,
          () => Toast.show({ text: i18n('sharePDN'), duration: 'short', position: 'bottom' })
        )}
      />
      <button className="action_bar_button" data-icon="A"
        oncreate={helper.ontap(ctrl.goToAnalysis)}
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
      <div className="result">
        {result}
        <br />
        <em className="resultStatus">{status}</em>
      </div>
    )
  }

  return null
}

export function renderClaimDrawButton(ctrl: OfflineRoundInterface) {
  return (gameApi.playable(ctrl.data) && gameApi.threefoldable(ctrl.data)) ? h('button[data-icon=2].draw-yes', {
    oncreate: helper.ontap(() => ctrl.replay?.claimDraw())
  }, i18n('threefoldRepetition')) : null
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
  return ctrl.replay ? h('div.replay.box', {
    oncreate: (vnode: Mithril.VnodeDOM<any, any>) => {
      setTimeout(() => autoScroll(vnode.dom as HTMLElement), 100)
      helper.ontapY((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.VnodeDOM<any, any>) => autoScroll(vnode.dom as HTMLElement),
  }, renderMoves(ctrl.replay)) : null
}


export function renderInlineReplay(ctrl: OfflineRoundInterface) {

  if (!ctrl.replay || !ctrl.moveList) {
    return null
  }

  return h('div.replay_inline', {
    oncreate: (vnode: Mithril.VnodeDOM<any, any>) => {
      setTimeout(() => autoScrollInline(vnode.dom as HTMLElement), 100)
      helper.ontapX((e: Event) => onReplayTap(ctrl, e), undefined, getMoveEl)(vnode)
    },
    onupdate: (vnode: Mithril.VnodeDOM<any, any>) => autoScrollInline(vnode.dom as HTMLElement),
  }, renderMoves(ctrl.replay))
}


export function renderBackwardButton(ctrl: OfflineRoundInterface) {
  return ctrl.replay ? h('button.action_bar_button.fa.fa-chevron-left', {
    oncreate: helper.ontap(ctrl.jumpPrev, ctrl.jumpFirst),
    className: helper.classSet({
      disabled: !(ctrl.replay.ply > ctrl.firstPly())
    })
  }) : null
}

export function renderForwardButton(ctrl: OfflineRoundInterface) {
  return ctrl.replay ? h('button.action_bar_button.fa.fa-chevron-right', {
    oncreate: helper.ontap(ctrl.jumpNext, ctrl.jumpLast),
    className: helper.classSet({
      disabled: !(ctrl.replay.ply < ctrl.lastPly())
    })
  }) : null
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

function pad2(num: number): string {
 return (num < 10 ? '0' : '') + num
}

const sepHigh = ':'
const sepLow = ' '
function formatClockTime(time: Millis, isRunning = false) {
  const date = new Date(time)
  const millis = date.getUTCMilliseconds()
  const minutes = pad2(date.getUTCMinutes())
  const seconds = pad2(date.getUTCSeconds())

  if (time >= 3600000) {
    const hours = pad2(date.getUTCHours())
    const pulse = (isRunning && millis < 500) ? sepLow : sepHigh
    return hours + pulse + minutes
  }
  if (time < 10000) {
    const tenthsStr = Math.floor(millis / 100).toString()
    return [minutes + sepHigh + seconds, h('tenths', '.' + tenthsStr)]
  }

  return minutes + sepHigh + seconds
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
