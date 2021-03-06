import * as h from 'mithril/hyperscript'
import * as range from 'lodash/range'
import * as Siema from 'siema'
import * as utils from '../utils'
import redraw from '../utils/redraw'
import { positionsCache } from '../utils/gamePosition'
import { getOfflineGames } from '../utils/offlineGames'
import { playerName as liPlayerName } from '../lidraughts/player'
import { OnlineGameData } from '../lidraughts/interfaces/game'
import { NowPlayingGame } from '../lidraughts/interfaces'
import { Challenge } from '../lidraughts/interfaces/challenge'
import * as gameApi from '../lidraughts/game'
import challengesApi from '../lidraughts/challenges'
import { standardFen } from '../lidraughts/variant'
import router from '../router'
import session from '../session'
import i18n from '../i18n'
import * as xhr from '../xhr'
import * as helper from './helper'
import ViewOnlyBoard from './shared/ViewOnlyBoard'

let scroller: any | null = null

let isOpen = false
let lastJoined: NowPlayingGame | undefined

export interface GamesMenu {
  lastJoined(): NowPlayingGame | undefined
  resetLastJoined(): void
  open(): void
  close(fromBB?: string): void
  view(): Mithril.Child
}

export default {
  lastJoined() {
    return lastJoined
  },
  resetLastJoined() {
    lastJoined = undefined
  },
  open,
  close,
  view() {
    if (!isOpen) return null

    return h('div#games_menu.overlay_popup_wrapper', {
      onbeforeremove: menuOnBeforeRemove
    }, [
      h('div.wrapper_overlay_close', { oncreate: menuOnOverlayTap }),
      renderCarouselIndicators(),
      h('div#wrapper_games', renderAllGames()),
    ])
  }
}

const menuOnOverlayTap = helper.ontap(() => close())

function menuOnBeforeRemove({ dom }: Mithril.DOMNode) {
  dom.classList.add('fading_out')
  return new Promise((resolve) => {
    setTimeout(resolve, 500)
  })
}

function wrapperOnCreate({ dom }: Mithril.DOMNode) {
  if (helper.isPortrait()) {
    scroller = new Siema({
      selector: dom as HTMLElement,
      duration: 150,
      easing: 'ease-out',
      perPage: helper.isWideScreen() ? 2 : 1,
      startIndex: 0,
      draggable: true,
      onChange: () => redraw(),
    })
    redraw()
  }
}

function wrapperOnRemove() {
  if (scroller) {
    scroller.destroy()
    scroller = null
  }
}

function open(page?: number) {
  router.backbutton.stack.push(close)
  session.refresh()
  isOpen = true
  setTimeout(() => {
    if (scroller && !helper.isWideScreen()) {
      scroller.goTo(page !== undefined ? page : 0)
    }
  }, 400)
}

function close(fromBB?: string) {
  if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
  isOpen = false
}


function joinGame(g: NowPlayingGame) {
  lastJoined = g
  positionsCache.set(g.fullId, { fen: g.fen, orientation: g.color, variant: g.variant.key })
  close()
  router.set('/game/' + g.fullId)
}

function acceptChallenge(id: string) {
  return xhr.acceptChallenge(id)
  .then(data => {
    router.set('/game' + data.url.round)
  })
  .then(() => challengesApi.remove(id))
  .then(() => close())
}

function cancelChallenge(id: string) {
  return xhr.cancelChallenge(id)
  .then(() => {
    challengesApi.remove(id)
  })
}

function declineChallenge(id: string) {
  return xhr.declineChallenge(id)
  .then(() => {
    challengesApi.remove(id)
  })
}

function renderViewOnlyBoard(fen: string, orientation: Color, lastMove?: string, variant?: VariantKey) {
  return h('div.boardWrapper',
    h(ViewOnlyBoard, { fen, lastMove, orientation, variant: variant || 'standard' })
  )
}

function timeLeft(g: NowPlayingGame): Mithril.Child {
  if (!g.isMyTurn) return i18n('waitingForOpponent')
  if (!g.secondsLeft) return i18n('yourTurn')
  const time = window.moment().add(g.secondsLeft, 'seconds')
  return h('time', {
    datetime: time.format()
  }, time.fromNow())
}

function savedGameDataToCardData(data: OnlineGameData): NowPlayingGame {
  return {
    color: data.player.color,
    fen: data.game.fen,
    fullId: data.url.round.substr(1),
    gameId: data.game.id,
    isMyTurn: gameApi.isPlayerTurn(data),
    lastMove: data.game.lastMove,
    perf: data.game.perf,
    opponent: data.opponent.user ? {
      id: data.opponent.user.id,
      username: data.opponent.user.username,
      rating: data.opponent.rating
    } : {
      username: 'Anonymous'
    },
    rated: data.game.rated,
    secondsLeft: data.correspondence && data.correspondence[data.player.color],
    speed: data.game.speed,
    variant: data.game.variant
  }
}

function renderGame(g: NowPlayingGame) {
  const icon = g.opponent.ai ? 'n' : utils.gameIcon(g.perf)
  const playerName = liPlayerName(g.opponent, false)
  const cardClass = [
    'card',
    'standard',
    g.color
  ].join(' ')
  const timeClass = [
    'timeIndication',
    g.isMyTurn ? 'myTurn' : 'opponentTurn'
  ].join(' ')

  return h('div', {
    className: cardClass,
    key: 'game.' + g.gameId,
    oncreate: helper.ontapXY(() => joinGame(g)),
  }, [
    renderViewOnlyBoard(g.fen, g.color, g.lastMove, g.variant.key),
    h('div.infos', [
      h('div.icon-game', { 'data-icon': icon || '' }),
      h('div.description', [
        h('h2.title', playerName),
        h('p', [
          h('span.variant', g.variant.name),
          h('span', { className: timeClass }, timeLeft(g))
        ])
      ])
    ])
  ])
}

function renderIncomingChallenge(c: Challenge) {
  if (!c.challenger) {
    return null
  }

  const mode = c.rated ? i18n('rated') : i18n('casual')
  const timeAndMode = challengesApi.challengeTime(c) + ', ' + mode
  const mark = c.challenger.provisional ? '?' : ''
  const playerName = `${c.challenger.id} (${c.challenger.rating}${mark})`

  return h('div.card.standard.challenge', [
    renderViewOnlyBoard(c.initialFen || standardFen, 'white', undefined, c.variant.key),
    h('div.infos', [
      h('div.icon-game', { 'data-icon': c.perf.icon }),
      h('div.description', [
        h('h2.title', i18n('playerisInvitingYou', playerName)),
        h('p.variant', [
          h('span.variantName', i18n('toATypeGame', c.variant.name)),
          h('span.time-indication[data-icon=p]', timeAndMode)
        ])
      ]),
      h('div.actions', [
        h('button', { oncreate: helper.ontapX(() => acceptChallenge(c.id)) },
          i18n('accept')
        ),
        h('button', {
          oncreate: helper.ontapX(
            (e: Event) => declineChallenge(c.id).then(() => {
              helper.fadesOut(e, () => close(), '.card', 250)
            })
          )
        },
          i18n('decline')
        )
      ])
    ])
  ])
}

function renderSendingChallenge(c: Challenge) {

  if (!c.destUser) return null

  const mode = c.rated ? i18n('rated') : i18n('casual')
  const timeAndMode = challengesApi.challengeTime(c) + ', ' + mode
  const mark = c.destUser.provisional ? '?' : ''
  const playerName = `${c.destUser.id} (${c.destUser.rating}${mark})`

  return h('div.card.standard.challenge.sending', [
    renderViewOnlyBoard(c.initialFen || standardFen, 'white', undefined, c.variant.key),
    h('div.infos', [
      h('div.icon-game', { 'data-icon': c.perf.icon }),
      h('div.description', [
        h('h2.title', playerName),
        h('p.variant', [
          h('span.variantName', i18n('toATypeGame', c.variant.name)),
          h('span.time-indication[data-icon=p]', timeAndMode)
        ]),
      ]),
      h('div.actions', [
        h('button', {
          oncreate: helper.ontapX(
            (e: Event) => cancelChallenge(c.id).then(() => {
              helper.fadesOut(e, () => close(), '.card', 250)
            })
          )
        },
          i18n('cancel')
        )
      ])
    ])
  ])
}

function renderCarouselIndicators() {
  if (helper.isPortrait() && scroller) {
    const elsNb = helper.isWideScreen() ?
      Math.ceil(scroller.innerElements.length / 2) :
      scroller.innerElements.length
    return h('div.carouselIndicators',
      range(0, elsNb).map(i =>
        h('i.indicator', {
          className: i === scroller.currentSlide ? 'current' : ''
        })
      )
    )
  }

  return null
}

function renderAllGames() {
  const nowPlaying = session.nowPlaying()
  const challenges = challengesApi.incoming()
  const sendingChallenges = challengesApi.sending().filter(challengesApi.isPersistent)
  const challengesDom = challenges.map(c =>
    renderIncomingChallenge(c)
  )
  const sendingChallengesDom = sendingChallenges.map(c =>
    renderSendingChallenge(c)
  )

  let allCards = [
    ...challengesDom,
    ...sendingChallengesDom,
    ...(nowPlaying.map(g => renderGame(g)))
  ]

  if (!utils.hasNetwork()) {
    allCards = getOfflineGames().map(d => {
      const g = savedGameDataToCardData(d)
      return renderGame(g)
    })
  }

  return h('div.games_carousel', {
    key: helper.isPortrait() ? 'o-portrait' : 'o-landscape',
    oncreate: wrapperOnCreate,
    onremove: wrapperOnRemove,
  }, allCards)
}
