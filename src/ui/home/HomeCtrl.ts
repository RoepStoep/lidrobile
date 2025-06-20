import { App, AppState } from '@capacitor/app'
import { Network } from '@capacitor/network'
import { PluginListenerHandle } from '@capacitor/core'
import throttle from 'lodash-es/throttle'
import debounce from 'lodash-es/debounce'
import Zanimo from '../../utils/zanimo'
import socket, { SocketIFace } from '../../socket'
import redraw from '../../utils/redraw'
import signals from '../../signals'
import settings from '../../settings'
import { timeline as timelineXhr, seeks as corresSeeksXhr, lobby as lobbyXhr, featured as featuredGameXhr } from '../../xhr'
import { getFromCache } from '../../http'
import { hasNetwork, noop } from '../../utils'
import { isForeground } from '../../utils/appMode'
import { Streamer, PongMessage, CorrespondenceSeek, FeaturedGame2, FeaturedPlayer, TimelineData } from '../../lidraughts/interfaces'
import { Player } from '../../lidraughts/interfaces/game'
import { TournamentListItem } from '../../lidraughts/interfaces/tournament'
import { PuzzleData } from '../../lidraughts/interfaces/training'
import session from '../../session'
import { makeTimeline } from '../timeline'
import offlinePuzzleDB from '../training/database'
import { loadNewPuzzle } from '../training/offlineService'
import { finishedStatus } from '~/lidraughts/status'

import { dailyPuzzle as dailyPuzzleXhr, featuredTournaments as featuredTournamentsXhr, featuredStreamers as featuredStreamersXhr } from './homeXhr'

interface FeaturedFenData {
  bc: number
  fen: string
  id: string
  lm: string
  wc: number
}

interface FeaturedFinished {
  id: string
  win?: 'b' | 'w'
}

export default class HomeCtrl {
  public selectedTab: number

  public isScrolling = false

  public socket?: SocketIFace

  public corresPool: ReadonlyArray<CorrespondenceSeek>
  public dailyPuzzle?: PuzzleData
  public featuredGame?: FeaturedGame2
  public featuredTournaments?: readonly TournamentListItem[]
  public featuredStreamers?: readonly Streamer[]
  public timelineData?: TimelineData
  public offlinePuzzle?: PuzzleData | undefined

  private networkListener?: PluginListenerHandle
  private appStateListener?: PluginListenerHandle
  private isConnected: boolean

  constructor(defaultTab?: number) {
    this.corresPool = []
    this.selectedTab = defaultTab || 0

    this.isConnected = hasNetwork()
    if (this.isConnected) {
      this.init()
    } else {
      this.loadOfflinePuzzle()
    }

    this.setupListeners()

    signals.afterLogin.add(this.init)
    signals.afterLogout.add(this.init)
  }

  private async setupListeners() {
    this.networkListener = await Network.addListener('networkStatusChange', s => {
      if (s.connected !== this.isConnected) {
        this.isConnected = s.connected
        if (s.connected) this.init()
      }
    })

    this.appStateListener = await App.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) this.init()
    })
  }

  // workaround for scroll overflow issue on ios
  private afterScroll = debounce(() => {
    this.isScrolling = false
    redraw()
  }, 200)
  public onScroll = () => {
    this.isScrolling = true
    this.afterScroll()
  }
  public redrawIfNotScrolling = () => {
    if (!this.isScrolling) redraw()
  }

  public socketSend = <D>(t: string, d: D): void => {
    if (this.socket) this.socket.send(t, d)
  }

  public unload = () => {
    this.networkListener?.remove()
    this.appStateListener?.remove()
  }

  public init = () => {
    if (isForeground()) {
      this.socket = socket.createLobby('homeLobby', () => {
        this.reloadCorresPool()
        this.getFeatured()
      }, {
        redirect: socket.redirectToGame,
        reload_seeks: this.reloadCorresPool,
        resync: () => lobbyXhr().then(d => {
          socket.setVersion(d.lobby.version)
        }),
        n: (_: any, d: PongMessage) => {
          signals.homePong.dispatch(d)
        },
        featured: () => {
          this.getFeatured()
        },
        fen: (d: FeaturedFenData) => {
          if (this.featuredGame && this.featuredGame.id === d.id) {
            this.featuredGame.fen = d.fen
            this.featuredGame.lastMove = d.lm
            this.featuredGame.c = {
              black: d.bc,
              white: d.wc,
            }
            redraw()
          }
        },
        finish: (d: FeaturedFinished) => {
          if (this.featuredGame && this.featuredGame.id === d.id) {
            this.featuredGame.finished = true
            if (d.win === 'b') this.featuredGame.winner = 'black'
            else if (d.win === 'w') this.featuredGame.winner = 'white'
            redraw()
          }
        },
      })

      const tournamentsCache = getFromCache('/tournament/featured')
      if (tournamentsCache) {
        this.featuredTournaments = tournamentsCache.data.featured
      }

      const timelineCache = getFromCache('/timeline')
      if (timelineCache) {
        this.timelineData = makeTimeline(timelineCache.data)
      }

      Promise.all([
        featuredTournamentsXhr(),
        session.refresh()?.then(() => session.isKidMode() ? Promise.resolve([]) : featuredStreamersXhr()),
      ])
        .then(results => {
          const [fTour, fStreamers] = results
          this.featuredTournaments = fTour.featured
          this.featuredStreamers = fStreamers
          redraw()
        })
        .catch(noop)

      dailyPuzzleXhr()
        .then(daily => {
          this.dailyPuzzle = daily
          redraw()
        })
        .catch(noop)

      if (!timelineCache || Date.now() >= timelineCache.expires) {
        timelineXhr(8, true)
          .then((timeline) => {
            this.timelineData = makeTimeline(timeline)
            redraw()
          })
          .catch(() => {
            this.timelineData = {entries: [], users: {}}
          })
      }
    }
  }

  public loadOfflinePuzzle = () => {
    const user = session.get()
    if (user) {
      loadNewPuzzle(offlinePuzzleDB, user, (user.prefs.puzzleVariant as VariantKey) || 'standard')
      .then(data => {
        this.offlinePuzzle = data
        redraw()
      })
    }
  }

  public onTabChange = (i: number) => {
    const loc = window.location.search.replace(/\?tab=\w+$/, '')
    try {
      window.history.replaceState(window.history.state, '', loc + '?tab=' + i)
    } catch (e) { console.error(e) }
    this.selectedTab = i
    if (this.selectedTab === 1) {
      this.reloadCorresPool()
    }
    redraw()
  }

  public cancelCorresSeek = (seekId: string) => {
    const el = document.getElementById(seekId)
    if (el) {
      Zanimo(el, 'opacity', '0', 300, 'ease-out')
        .then(() => this.socketSend('cancelSeek', seekId))
        .catch(console.log.bind(console))
    }
  }

  public joinCorresSeek = (seekId: string) => {
    this.socketSend('joinSeek', seekId)
  }

  private reloadCorresPool = () => {
    if (this.selectedTab === 1) {
      corresSeeksXhr(false)
        .then(d => {
          this.corresPool = fixSeeks(d)
            .filter(s => settings.game.supportedVariants.includes(s.variant.key))
            .sort((a, b) => a.rating > b.rating ? -1 : 1)
          this.redrawIfNotScrolling()
        })
    }
  }

  private getFeatured = throttle(() => {
    featuredGameXhr('best', false)
      .then((data) => {
        const opp = playerToFeatured(data.opponent)
        const player = playerToFeatured(data.player)

        this.featuredGame = {
          c: data.clock ? {
            white: Math.round(data.clock.white),
            black: Math.round(data.clock.black),
          } : undefined,
          black: data.game.player === 'white' ? opp : player,
          orientation: data.orientation,
          fen: data.game.fen,
          variant: data.game.variant.key,
          id: data.game.id,
          lastMove: data.game.lastMove,
          white: data.game.player === 'white' ? player : opp,
          finished: finishedStatus(data.game.status)
        }

        if (this.featuredGame.finished) {
          this.featuredGame.winner = data.game.winner
        }

        this.socketSend('startWatching', data.game.id)

        this.redrawIfNotScrolling()
      })
  }, 1000)
}

function seekUserId(seek: CorrespondenceSeek) {
  return seek.username.toLowerCase()
}

function fixSeeks(seeks: CorrespondenceSeek[]): CorrespondenceSeek[] {
  const userId = session.getUserId()
  if (userId) seeks.sort((a, b) => {
    if (seekUserId(a) === userId) return -1
    if (seekUserId(b) === userId) return 1
    return 0
  })
  return [
    ...seeks
      .map(s => {
        const username = seekUserId(s) === userId ? s.id : s.username
        const key = username + s.mode + s.perf.key + s.days + s.color
        return [s, key]
      })
      .filter(([_, key], i, a) => a.map(e => e[1]).indexOf(key) === i)
      .map(([s]) => s)
  ] as CorrespondenceSeek[]
}

function playerToFeatured(p: Player): FeaturedPlayer {
  return {
    name: p.user?.displayName || p.name || p.username || p.user?.username || '',
    rating: p.rating || 0,
    ratingDiff: p.ratingDiff || 0,
    berserk: p.berserk,
    title: p.user && p.user.title,
  }
}
