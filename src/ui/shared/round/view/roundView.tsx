import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import redraw from '../../../../utils/redraw'
import socket from '../../../../socket'
import session from '../../../../session'
import * as playerApi from '../../../../lidraughts/player'
import * as gameApi from '../../../../lidraughts/game'
import gameStatusApi from '../../../../lidraughts/status'
import { Player } from '../../../../lidraughts/interfaces/game'
import { User } from '../../../../lidraughts/interfaces/user'
import settings from '../../../../settings'
import * as utils from '../../../../utils'
import { emptyFen } from '../../../../utils/fen'
import i18n, { plural } from '../../../../i18n'
import layout from '../../../layout'
import * as helper from '../../../helper'
import { connectingHeader, backButton, menuButton, loader, headerBtns, bookmarkButton } from '../../../shared/common'
import PlayerPopup from '../../../shared/PlayerPopup'
import GameTitle from '../../../shared/GameTitle'
import CountdownTimer from '../../../shared/CountdownTimer'
import ViewOnlyBoard from '../../../shared/ViewOnlyBoard'
import Board from '../../../shared/Board'
import popupWidget from '../../../shared/popup'
import Clock from '../clock/clockView'
import gameButton from './button'
import { levelToRating } from '../../../ai/engine'
import { chatView } from '../../chat'
import { notesView } from '../notes'
import { view as renderCorrespondenceClock } from '../correspondenceClock/corresClockView'
import { renderInlineReplay, renderReplay } from './replay'
import OnlineRound from '../OnlineRound'
import { Position, Material } from '../'
import { isVariant } from '../../../../lidraughts/variant'
import { renderTitle as renderUserTitle } from '~/ui/user/userView'

export default function view(ctrl: OnlineRound) {
  const isPortrait = helper.isPortrait()

  return layout.board(
    renderHeader(ctrl),
    renderContent(ctrl, isPortrait),
    'round',
    overlay(ctrl),
    undefined,
    undefined,
    'roundView'
  )
}

export function emptyTV(channel?: string, onFeatured?: () => void) {
  const variant = channel && isVariant(channel) ? channel as VariantKey : 'standard'
  return layout.board(
    renderEmptyHeader(channel, onFeatured),
    viewOnlyBoardContent(emptyFen, 'white', variant)
  )
}

export function renderMaterial(material: Material) {
  const tomb = Object.keys(material.pieces).map((role: string) =>
    material.pieces[role] ? h('div.tomb', Array.from(Array(material.pieces[role]).keys())
      .map(_ => h('piece', { className: role }))
    ) : null
  )

  if (material.score > 0) {
    tomb.push(h('span', '+' + material.score))
  }

  return tomb
}

export function viewOnlyBoardContent(fen: string, orientation: Color, variant: VariantKey, lastMove?: string, wrapperClass?: string, customPieceTheme?: string) {
  const isPortrait = helper.isPortrait()
  const vd = helper.viewportDim()
  const className = 'board_wrapper' + (wrapperClass ? ' ' + wrapperClass : '')
  const board = (
    <section className={className}>
      {h(ViewOnlyBoard, {fen, lastMove, orientation, variant, customPieceTheme})}
    </section>
  )
  const showMoveList = helper.hasSpaceForInlineReplay(vd, isPortrait) &&
    settings.game.moveList() &&
    !settings.game.zenMode()

  if (isPortrait) {
    return h.fragment({}, [
      showMoveList ? h('div.replay_inline') : null,
      h('section.playTable.opponent'),
      board,
      h('section.playTable.player'),
      h('section.actions_bar'),
    ])
  } else {
    return h.fragment({}, [
      board,
      h('section.table'),
    ])
  }
}

export const LoadingBoard = {
  view() {
    return layout.board(
      connectingHeader(),
      viewOnlyBoardContent(emptyFen, 'white', 'standard'),
      'roundView'
    )
  }
}

function overlay(ctrl: OnlineRound) {
  let chatHeader = (!ctrl.data.opponent.user || ctrl.data.player.spectator) ? i18n('chat') : ctrl.data.opponent.user.username
  const watchers = ctrl.data.watchers
  if (ctrl.data.player.spectator && watchers && watchers.nb >= 2) {
    chatHeader = i18n('spectators') + ' ' + watchers.nb
  } else if (ctrl.data.player.spectator) {
    chatHeader = i18n('spectatorRoom')
  }
  return [
    ctrl.chat ? chatView(ctrl.chat, chatHeader) : null,
    ctrl.notes ? notesView(ctrl.notes) : null,
    renderGamePopup(ctrl),
    renderSubmitMovePopup(ctrl),
    h(PlayerPopup, {
      player: ctrl.data.player,
      opponent: ctrl.data.opponent,
      mini: ctrl.vm.miniUser.player.data,
      score: ctrl.score,
      isOpen: ctrl.vm.miniUser.player.showing,
      close: () => ctrl.closeUserPopup('player'),
    }),
    h(PlayerPopup, {
      player: ctrl.data.opponent,
      opponent: ctrl.data.player,
      mini: ctrl.vm.miniUser.opponent.data,
      score: ctrl.score,
      isOpen: ctrl.vm.miniUser.opponent.showing,
      close: () => ctrl.closeUserPopup('opponent'),
    })
  ]
}

function renderTitle(ctrl: OnlineRound) {
  const data = ctrl.data
  const tournament = ctrl.data.tournament
  if (ctrl.vm.offlineWatcher || socket.isConnected()) {
    const isCorres = !data.player.spectator && data.game.speed === 'correspondence'
    if (ctrl.data.tv) {
      return h('div.main_header_title.withSub', [
        h('h1.header-gameTitle', [
          tvChannelSelector(ctrl.onFeatured)
        ]),
        h('h2.header-subTitle', gameApi.title(ctrl.data)),
      ])
    }
    else if (ctrl.data.userTV) {
      return h('div.main_header_title.withSub', [
        h('h1.header-gameTitle', [
          h('span.withIcon[data-icon=1]'), ctrl.data.userTV,
        ]),
        h('h2.header-subTitle', [
          h(`span.withIcon[data-icon=${utils.gameIcon(ctrl.data.game.perf)}]`),
          gameApi.title(ctrl.data),
        ].concat(tournament ? [
          ' • ',
          h('span.fa.fa-trophy'),
          h(CountdownTimer, { seconds: tournament.secondsToFinish || 0 }),
        ] : [])),
      ])
    }
    else {
      return h(GameTitle, {
        data: ctrl.data,
        kidMode: session.isKidMode(),
        subTitle: tournament ? 'tournament' : isCorres ? 'corres' : 'date'
      })
    }
  } else {
    return (
      <div className="main_header_title reconnecting">
        {loader}
      </div>
    )
  }
}

function renderEmptyTitle(channel?: string, onFeatured?: () => void) {
  if (channel) {
    return h('div.main_header_title.withSub', [
      h('h1.header-gameTitle', [h('span.withIcon[data-icon=1]'), 'Lidraughts TV']),
      h('h2.header-subTitle', tvChannelSelector(onFeatured))
    ])
  } else {
    return (
      <div className="main_header_title reconnecting">
        {loader}
      </div>
    )
  }
}

function renderHeader(ctrl: OnlineRound) {

  let children
  if (ctrl.goingBack || (!ctrl.data.tv && !ctrl.data.userTV && ctrl.data.player.spectator)) {
    children = [
      backButton([
        renderTitle(ctrl),
        bookmarkButton(ctrl.toggleBookmark, ctrl.data.bookmarked!),
      ])
    ]
  } else {
    children = [
      menuButton(),
      renderTitle(ctrl),
    ]
  }
  children.push(headerBtns())

  return h('nav', {
    key: 'roundHeader', // workaround to avoid mithril error
    className: socket.isConnected() ? '' : 'reconnecting'
  }, children)
}

function renderEmptyHeader(channel?: string, onFeatured?: () => void) {
  const children = [
    menuButton(),
    renderEmptyTitle(channel, onFeatured),
    headerBtns()
  ]
  return h('nav', {
    className: socket.isConnected() ? '' : 'reconnecting'
  }, children)
}

function renderContent(ctrl: OnlineRound, isPortrait: boolean) {
  const vd = helper.viewportDim()

  const material = ctrl.draughtsground.getMaterialDiff()
  const flip = !ctrl.data.tv && ctrl.vm.flip

  const player = renderPlayTable(ctrl, ctrl.data.player, material[ctrl.data.player.color], 'player', flip)
  const opponent = renderPlayTable(ctrl, ctrl.data.opponent, material[ctrl.data.opponent.color], 'opponent', flip)

  const playable = gameApi.playable(ctrl.data)
  const myTurn = gameApi.isPlayerTurn(ctrl.data)

  const board = h(Board, {
    variant: ctrl.data.game.variant.key,
    draughtsground: ctrl.draughtsground,
  }, playable ? [
    !myTurn ? renderExpiration(ctrl, 'opponent', myTurn) : null,
    myTurn ? renderExpiration(ctrl, 'player', myTurn) : null,
  ] : [])

  if (isPortrait) {
    return [
      helper.hasSpaceForInlineReplay(vd, isPortrait) ? renderInlineReplay(ctrl) : null,
      flip ? player : opponent,
      board,
      flip ? opponent : player,
      renderGameActionsBar(ctrl)
    ]
  } else {
    return [
      board,
      h('section.table', [
        flip ? player : opponent,
        renderReplay(ctrl),
        renderGameActionsBar(ctrl),
        flip ? opponent : player,
      ]),
    ]
  }
}

function renderExpiration(ctrl: OnlineRound, position: Position, myTurn: boolean) {
  const d = ctrl.data.expiration
  if (!d) return null
  const timeLeft = Math.max(0, d.movedAt - Date.now() + d.millisToMove)

  return h('div.round-expiration', {
    className: position,
  }, h(CountdownTimer, {
      seconds: Math.round(timeLeft / 1000),
      emergTime: myTurn ? 8 : undefined,
      textWrap: (sec: Seconds, t: string) => plural('nbSecondsToPlayTheFirstMove', sec, `<strong>${t}</<strong>`),
      showOnlySecs: true
    })
  )
}

function renderSubmitMovePopup(ctrl: OnlineRound) {
  if (ctrl.vm.moveToSubmit || ctrl.vm.dropToSubmit || ctrl.vm.submitFeedback) {
    return (
      <div className="overlay_popup_wrapper submitMovePopup">
        <div className="overlay_popup">
          {gameButton.submitMove(ctrl)}
        </div>
      </div>
    )
  }

  return null
}

function userInfos(user: User, player: Player, playerName: string) {
  let title: string
  if (user) {
    const onlineStatus = user.online ? 'connected to lidraughts' : 'offline'
    const onGameStatus = player.onGame ? 'currently on this game' : 'currently not on this game'
    title = `${playerName}: ${onlineStatus}; ${onGameStatus}`
  } else {
    title = playerName
  }
  Toast.show({ text: title, position: 'center', duration: 'short' })
}

function renderPlayerName(player: Player) {
  const name = player.user?.displayName || player.name || player.username || player.user?.username
  if (name) {
    return h('span', [
      renderUserTitle(player.user?.title),
      name
    ])
  }

  if (player.ai) return playerApi.aiName({ ai: player.ai })

  return 'Anonymous'
}

function renderPlayer(
  ctrl: OnlineRound,
  player: Player,
  material: Material,
  position: Position,
) {
  const playerName = renderPlayerName(player)
  const togglePopup = () => player.user ? ctrl.openUserPopup(position, player.user.id) : utils.noop
  const vConf = player.user ?
    helper.ontap(togglePopup, () => userInfos(player.user!, player, playerApi.playerName(player))) :
    helper.ontap(utils.noop, () => Toast.show({ text: (player.user?.displayName || player.name || player.username || player.user?.username)!, position: 'center', duration: 'short' }))

  const tournamentRank = ctrl.data.tournament && ctrl.data.tournament.ranks ?
    '#' + ctrl.data.tournament.ranks[player.color] + ' ' : null

  const user = player.user
  const isBerserk = ctrl.vm.goneBerserk[player.color]

  return (
    <div className={'antagonistInfos' + (ctrl.isZen() ? ' zen' : '')} oncreate={vConf}>
      <h2 className="antagonistUser">
        { user && user.patron ?
          <span className={'patron status ' + (player.onGame ? 'ongame' : 'offgame')} data-icon="" />
          :
          <span className={'fa fa-circle status ' + (player.onGame ? 'ongame' : 'offgame')} /> }
        {tournamentRank}
        {playerName}
        { isBerserk ? <span className="berserk" data-icon="`" /> : null }
      </h2>
      <div className="ratingAndMaterial">
        { position === 'opponent' && user && (user.engine || user.booster) ?
          <span className="warning" data-icon="j"></span> : null
        }
        {user ?
          <h3 className="rating">
            {player.rating}
            {player.provisional ? '?' : ''}
            {helper.renderRatingDiff(player)}
          </h3> : (player.ai ?
          <h3 className="rating">
            {levelToRating[player.ai]}
          </h3> : null)
        }
        {!ctrl.vm.showCaptured ? null : renderMaterial(material)}
      </div>
    </div>
  )
}

function renderPlayTable(
  ctrl: OnlineRound,
  player: Player,
  material: Material,
  position: Position,
  flipped: boolean,
) {
  const classN = helper.classSet({
    playTable: true,
    clockOnLeft: ctrl.vm.clockPosition === 'left',
  })

  return (
    <section className={classN + ' ' + position}>
      {renderPlayer(ctrl, player, material, position)}
      { ctrl.clock ?
        // must reset clock with a single-child keyed fragment when flipped
        [h(Clock, {
          key: flipped.toString(),
          ctrl: ctrl.clock,
          color: player.color,
          isBerserk: ctrl.vm.goneBerserk[player.color],
        })] :
        ctrl.correspondenceClock ?
          renderCorrespondenceClock(
            ctrl.correspondenceClock, player.color, ctrl.data.game.player
          ) : null
      }
    </section>
  )
}

function tvChannelSelector(onFeatured?: () => void) {
  const channel = settings.tv.channel() as PerfKey
  const icon = utils.gameIcon(channel)

  return (
    h('div.select_input.main_header-selector.round-tvChannelSelector', [
      h('label', {
        'for': 'channel_selector'
      }, [
        h(`i[data-icon=${icon}]`),
        h('span', h.trust('&nbsp;')),
        h('span', 'Lidraughts TV')
      ]),
      h('select#channel_selector', {
        value: channel,
        onchange(e: Event) {
          const val = (e.target as HTMLSelectElement).value
          settings.tv.channel(val)
          onFeatured && onFeatured()
          setTimeout(redraw, 10)
        }
      }, settings.tv.availableChannels.map(v =>
        h('option', {
          key: v[1], value: v[1]
        }, v[0])
      ))
    ])
  )
}

function renderGameRunningActions(ctrl: OnlineRound) {
  return h('div.gameControls', {
    key: 'gameRunningActions'
  }, ctrl.data.player.spectator ? [
    gameButton.shareLink(ctrl),
  ] : [
    gameButton.toggleZen(ctrl),
    gameButton.analysisBoard(ctrl),
    gameButton.notes(ctrl),
    gameButton.moretime(ctrl),
    gameButton.standard(ctrl, gameApi.abortable, 'L', 'abortGame', 'abort'),
  ].concat(
    gameApi.forceResignable(ctrl.data) ? [gameButton.forceResign(ctrl)] : [
      gameButton.standard(ctrl, gameApi.takebackable, 'i', 'proposeATakeback', 'takeback-yes'),
      gameButton.cancelTakebackProposition(ctrl),
      gameButton.offerDraw(ctrl),
      gameButton.drawConfirmation(ctrl),
      gameButton.cancelDrawOffer(ctrl),
      gameButton.threefoldClaimDraw(ctrl),
      gameButton.resign(ctrl),
      gameButton.resignConfirmation(ctrl),
      gameButton.goBerserk(ctrl),
      gameButton.answerOpponentDrawOffer(ctrl),
      gameButton.answerOpponentTakebackProposition(ctrl),
    ]
  ))
}

function renderGameEndedActions(ctrl: OnlineRound) {
  let buttons: Mithril.Children
  const tournamentId = ctrl.data.game.tournamentId

  const shareActions = h('button', {
    oncreate: helper.ontap(ctrl.showShareActions),
  }, [h('span.fa.fa-share-alt'), i18n('shareAndExport')])

  if (ctrl.vm.showingShareActions) {
    buttons = [
      gameButton.shareLink(ctrl),
      gameButton.sharePDN(ctrl),
    ]
  }
  else if (tournamentId) {
    if (ctrl.data.player.spectator) {
      buttons = [
        shareActions,
        gameButton.analysisBoard(ctrl),
        gameButton.returnToTournament(ctrl),
      ]
    }
    else {
      buttons = [
        shareActions,
        gameButton.analysisBoard(ctrl),
        gameButton.withdrawFromTournament(ctrl, tournamentId),
        gameButton.returnToTournament(ctrl),
      ]
    }
  }
  else {
    if (ctrl.data.player.spectator) {
      buttons = [
        shareActions,
        gameButton.analysisBoard(ctrl)
      ]
    }
    else {
      buttons = [
        shareActions,
        gameButton.analysisBoard(ctrl),
        gameButton.notes(ctrl),
        gameButton.newOpponent(ctrl),
        gameButton.rematch(ctrl),
      ]
    }
  }
  return h('div.game_controls', { key: 'gameEndedActions' }, h.fragment({
    key: ctrl.vm.showingShareActions ? 'shareMenu' : 'menu'
  }, buttons))
}

function renderStatus(ctrl: OnlineRound) {
  const result = gameApi.result(ctrl.data)
  const winner = gameApi.getPlayer(ctrl.data, ctrl.data.game.winner)
  const status = gameStatusApi.toLabel(ctrl.data.game.status.name, ctrl.data.game.winner, ctrl.data.game.variant.key) +
    (winner ? (ctrl.data.game.status.name !== 'mate' ? '. ' : '') + i18n(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
  return (gameStatusApi.aborted(ctrl.data) ? [] : [
    h('strong', result), h('br')
  ]).concat([h('em.resultStatus', status)])
}

function renderGamePopup(ctrl: OnlineRound) {
  const header = !gameApi.playable(ctrl.data) ?
    () => renderStatus(ctrl) : undefined

  return popupWidget(
    'player_controls',
    ctrl.vm.showingShareActions ? undefined : header,
    () => gameApi.playable(ctrl.data) ?
      renderGameRunningActions(ctrl) :
      renderGameEndedActions(ctrl),
    ctrl.vm.showingActions,
    ctrl.hideActions
  )
}

function renderGameActionsBar(ctrl: OnlineRound) {
  const answerRequired = ((ctrl.data.opponent.proposingTakeback ||
    ctrl.data.opponent.offeringDraw) && !gameStatusApi.finished(ctrl.data)) ||
    gameApi.forceResignable(ctrl.data) ||
    ctrl.data.opponent.offeringRematch

  const gmClass = (ctrl.data.opponent.proposingTakeback ? [
    'fa',
    'fa-mail-reply'
  ] : [
    'fa',
    'fa-list'
  ]).concat([
    'action_bar_button',
    answerRequired ? 'glow' : ''
  ]).join(' ')

  const gmDataIcon = ctrl.data.opponent.offeringDraw ? '2' : null
  const gmButton = gmDataIcon ?
    <button className={gmClass} data-icon={gmDataIcon} oncreate={helper.ontap(ctrl.showActions)} /> :
    <button className={gmClass} oncreate={helper.ontap(ctrl.showActions)} />

  return (
    <section className="actions_bar">
      {gmButton}
      {ctrl.chat && !ctrl.isZen() ?
        <button className="action_bar_button fa fa-comments withChip"
          oncreate={helper.ontap(ctrl.chat.open)}
        >
         { ctrl.chat.nbUnread > 0 ?
          <span className="chip">
            { ctrl.chat.nbUnread <= 99 ? ctrl.chat.nbUnread : 99 }
          </span> : null
         }
        </button> : null
     }
      {gameApi.forecastable(ctrl.data) ? renderAnalysisIcon(ctrl) : null}
      {gameButton.flipBoard(ctrl)}
      {gameApi.playable(ctrl.data) ? null : gameButton.analysisBoardIconOnly(ctrl)}
      {gameButton.backward(ctrl)}
      {gameButton.forward(ctrl)}
    </section>
  )
}

function renderAnalysisIcon(ctrl: OnlineRound): Mithril.Vnode {
  return h(
    'button.action_bar_button[data-icon=A].withChip',
    {
      oncreate: helper.ontap(ctrl.goToAnalysis)
    },
    (ctrl.data.forecastCount || 0) > 0
      ? h('span.chip', ctrl.data.forecastCount)
      : null
  )
}
