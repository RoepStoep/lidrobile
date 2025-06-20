import { App, AppState } from '@capacitor/app'
import { Toast } from '@capacitor/toast'
import { Capacitor, PluginListenerHandle } from '@capacitor/core'
import Badge from '~/badge'
import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import fen, { countGhosts } from '../../../draughtsground/fen'
import redraw from '../../../utils/redraw'
import { hasNetwork, boardOrientation, handleXhrError } from '../../../utils'
import * as sleepUtils from '../../../utils/sleep'
import signals from '../../../signals'
import session from '../../../session'
import settings from '../../../settings'
import socket from '../../../socket'
import i18n from '../../../i18n'
import router from '../../../router'
import sound from '../../../sound'
import { miniUser as miniUserXhr, toggleGameBookmark } from '../../../xhr'
import vibrate from '../../../vibrate'
import gameStatusApi from '../../../lidraughts/status'
import * as gameApi from '../../../lidraughts/game'
import { MiniUser } from '../../../lidraughts/interfaces'
import { OnlineGameData, Player, ApiEnd } from '../../../lidraughts/interfaces/game'
import { Score } from '../../../lidraughts/interfaces/user'
import { MoveRequest, DropRequest, MoveOrDrop, AfterMoveMeta, isMove, isDrop, isMoveRequest, isDropRequest } from '../../../lidraughts/interfaces/move'
import * as draughtsFormat from '../../../utils/draughtsFormat'
import { Chat } from '../../shared/chat'

import TransientMove from './TransientMove'
import ground from './ground'
import { NotesCtrl } from './notes'
import ClockCtrl from './clock/ClockCtrl'
import CorresClockCtrl from './correspondenceClock/corresClockCtrl'
import RoundSocket from './socket'
import * as xhr from './roundXhr'
import { OnlineRoundInterface } from './'
import { addStep, mergeSteps } from './util'

interface VM {
  ply: number
  flip: boolean
  miniUser: MiniUser
  showingActions: boolean
  showingShareActions: boolean
  confirmResign: boolean
  confirmDraw: boolean
  goneBerserk: {
    [index: string]: boolean
  },
  moveToSubmit: MoveRequest | null
  dropToSubmit: DropRequest | null
  submitFeedback?: [number, number] // [ply, timestamp]
  tClockEl: HTMLElement | null
  offlineWatcher: boolean
  clockPosition: 'right' | 'left'
  showCaptured: boolean
  moveList: boolean
}

export default class OnlineRound implements OnlineRoundInterface {
  public data!: OnlineGameData
  public draughtsground: Draughtsground
  public clock: ClockCtrl | null
  public correspondenceClock!: CorresClockCtrl
  public chat: Chat | null
  public notes: NotesCtrl | null
  public vm: VM
  public title!: Mithril.Children
  public subTitle!: string
  public tv!: string
  public score?: Score
  public socket: RoundSocket

  private zenModeEnabled: boolean
  private lastMoveMillis?: number
  private lastDrawOfferAtPly!: number
  private clockIntervId!: number
  private blur: boolean

  private transientMove: TransientMove
  private appStateListener?: PluginListenerHandle

  public constructor(
    readonly goingBack: boolean,
    readonly id: string,
    cfg: OnlineGameData,
    flipped = false,
    readonly onFeatured?: () => void,
    userTv?: string,
    ply?: number,
  ) {
    cfg.steps = mergeSteps(cfg.steps)
    this.setData(cfg)
    this.data.userTV = userTv

    this.zenModeEnabled = settings.game.zenMode()
    this.blur = false

    this.vm = {
      ply: this.lastPly(),
      flip: flipped,
      miniUser: {
        player: {
          showing: false,
          data: null
        },
        opponent: {
          showing: false,
          data: null
        }
      },
      clockPosition: settings.game.clockPosition() || 'right',
      showCaptured: !!this.data.pref.showCaptured,
      moveList: settings.game.moveList(),
      showingActions: false,
      showingShareActions: false,
      confirmResign: false,
      confirmDraw: false,
      goneBerserk: {
        [this.data.player.color]: !!this.data.player.berserk,
        [this.data.opponent.color]: !!this.data.opponent.berserk
      },
      moveToSubmit: null,
      dropToSubmit: null,
      tClockEl: null,
      // I came to this game offline: I'm an offline watcher
      offlineWatcher: !hasNetwork()
    }

    this.socket = new RoundSocket(this, this.onFeatured)

    this.chat = (session.isKidMode() || this.data.tv || (!this.data.player.spectator && (this.data.game.tournamentId || this.data.opponent.ai))) ? null : new Chat(
      this.socket.iface,
      this.data.game.id,
      this.data.chat || [],
      this.data.player.spectator ? undefined : this.data.player,
      session.isConnected() || this.data.game.source === 'friend',
      session.isShadowban(),
      this.data.game.speed === 'correspondence' ? 'Corres' : 'Game',
    )

    this.notes = this.data.game.speed === 'correspondence' ? new NotesCtrl(this.data) : null

    this.draughtsground = ground.make(
      this.data,
      cfg.game.fen,
      this.userMove,
      this.onMove,
      this.plyStep(this.vm.ply)
    )

    this.clock = this.data.clock ? new ClockCtrl(this.data, {
      onFlag: this.socket.outoftime,
      soundColor: (this.data.player.spectator || !this.data.pref.clockSound) ? null : this.data.player.color,
      showTenths: this.data.pref.clockTenths,
    }) : null

    this.makeCorrespondenceClock()
    if (this.correspondenceClock) this.clockIntervId = setInterval(this.correspondenceClockTick, 6000)

    this.setupListeners()

    signals.gameBackButton.add(() => {
      if (router.backbutton.stack.length === 0 && !gameApi.isPlayerPlaying(this.data)) {
        router.backHistory()
      }
    })

    this.transientMove = new TransientMove(this)

    if (ply !== undefined) {
      this.jump(ply)
    }

    redraw()
  }

  private async setupListeners() {
    this.appStateListener = await App.addListener('appStateChange', (state: AppState) => {
      if (state.isActive) this.onResume()
    })
  }

  public isAlgebraic = (): boolean => {
    return settings.game.coordSystem() === 1 && this.data.game.variant.board.key === '64'
  }
  
  public coordSystem = (): number => {
    return this.isAlgebraic() ? 1 : 0
  }

  public zenAvailable = () => !this.data.player.spectator &&
    gameApi.playable(this.data)

  public isZen = () => this.zenAvailable() && this.zenModeEnabled

  public toggleZenMode = () => {
    this.zenModeEnabled = !this.zenModeEnabled
    redraw()
  }

  public goToAnalysis = () => {
    const d = this.data
    router.set(`/analyse/online/${d.game.id}/${boardOrientation(d)}?ply=${this.vm.ply}&curFen=${d.game.fen}&variant=${d.game.variant.key}`)
  }

  public openUserPopup = (position: string, userId: string) => {
    if (this.score === undefined) {
      const d = this.data
      if (!d || !d.player.user || !d.opponent.user) {
        return
      }
      xhr.getCrosstable(d.player.user.id, d.opponent.user.id).then(s => {
        this.score = s
        redraw()
      })
    }
    if (!this.vm.miniUser[position].data) {
      miniUserXhr(userId).then(data => {
        this.vm.miniUser[position].data = data
        redraw()
      })
      .catch(() => {
        this.vm.miniUser[position].showing = false
        redraw()
      })
    }
    this.vm.miniUser[position].showing = true
  }

  public closeUserPopup = (position: string) => {
    this.vm.miniUser[position].showing = false
  }

  public showActions = () => {
    router.backbutton.stack.push(this.hideActions)
    this.vm.showingActions = true
    this.vm.showingShareActions = false
  }

  public showShareActions = () => {
    this.vm.showingShareActions = true
  }

  public hideActions = (fromBB?: string) => {
    if (fromBB !== 'backbutton' && this.vm.showingActions) router.backbutton.stack.pop()
    this.vm.showingActions = false
    this.vm.showingShareActions = false
  }

  public flip = () => {
    this.vm.flip = !this.vm.flip
    if (this.data.tv) {
      if (this.vm.flip) router.set('/tv?flip=1', true)
      else router.set('/tv', true)
      return
    }
    this.draughtsground.set({
      orientation: boardOrientation(this.data, this.vm.flip)
    })
  }


  public canOfferDraw = () => {
    return gameApi.drawable(this.data) && (this.lastDrawOfferAtPly || -99) < (this.vm.ply - 20)
  }

  public offerDraw = () => {
    if (this.canOfferDraw()) {
      this.lastDrawOfferAtPly = this.vm.ply
      this.socket.iface.send('draw-yes', null)
    }
  }

  public replaying() {
    return this.vm.ply !== this.lastPly()
  }

  public canDrop = () => {
    return !this.replaying() && gameApi.isPlayerPlaying(this.data)
  }

  public firstPly() {
    return this.data.steps[0].ply
  }

  public lastPly() {
    return this.data.steps[this.data.steps.length - 1].ply
  }

  public plyStep(ply: number) {
    return this.data.steps[ply - this.firstPly()]
  }

  public jump = (ply: number) => {
    if (ply < this.firstPly() || ply > this.lastPly()) return false
    const plyDiff = Math.abs(ply - this.vm.ply)
    const wasReplaying = this.replaying()
    const isFwd = ply > this.vm.ply
    this.vm.ply = ply
    const s = this.plyStep(ply)
    const ghosts = countGhosts(s.fen)
    const config: cg.SetConfig = {
      fen: s.fen,
      lastMove: s.uci ? draughtsFormat.uciToMove(s.uci) : null,
      turnColor: (this.vm.ply - (ghosts === 0 ? 0 : 1)) % 2 === 0 ? 'white' : 'black'
    }
    if (!this.replaying()) {
      config.movableColor = gameApi.isPlayerPlaying(this.data) ? this.data.player.color : null
      config.dests = gameApi.parsePossibleMoves(this.data.possibleMoves)
      config.captureLength = this.data.captureLength
    }
    this.draughtsground.set(config, plyDiff > 1)
    if (!wasReplaying && this.replaying()) this.draughtsground.stop()
    if (s.san && isFwd) {
      if (s.san.indexOf('x') !== -1) sound.throttledCapture()
      else sound.throttledMove()
    }
    return true
  }

  public userJump = (ply: number): void => {
    this.cancelMove()
    this.draughtsground.selectSquare(null)
    this.jump(ply)
  }

  public jumpNext = () => {
    return this.jump(this.vm.ply + 1)
  }

  public jumpPrev = () => {
    return this.jump(this.vm.ply - 1)
  }

  public jumpFirst = () => {
    return this.jump(this.firstPly())
  }

  public jumpLast = () => {
    return this.jump(this.lastPly())
  }

  public isClockRunning(): boolean {
    return !!this.data.clock && gameApi.playable(this.data) &&
      ((this.data.game.turns - this.data.game.startedAtTurn) > 1 || this.data.clock.running)
  }

  public sendMove(orig: Key, dest: Key, isPremove = false) {
    const move = {
      u: orig + dest
    }
    const sendBlur = this.getBlurAndReset()
    if (this.data.pref.submitMove && !isPremove) {
      router.backbutton.stack.push(this.cancelMove)
      this.vm.moveToSubmit = move
      redraw()
    } else {
      this.actualSendMove(move, isPremove, sendBlur)
      if (this.data.game.speed === 'correspondence' && !hasNetwork()) {
        Toast.show({ text: 'You need to be connected to Internet to send your move.', position: 'bottom', duration: 'short' })
      }
    }
  }

  public sendNewPiece(role: Role, key: Key, isPredrop: boolean) {
    const drop = {
      role: role,
      pos: key
    }
    const sendBlur = this.getBlurAndReset()
    if (this.data.pref.submitMove && !isPredrop) {
      setTimeout(() => {
        router.backbutton.stack.push(this.cancelMove)
        this.vm.dropToSubmit = drop
        redraw()
      }, this.data.pref.animationDuration || 0)
    } else {
      this.actualSendMove(drop, isPredrop, sendBlur)
    }
  }

  private getBlurAndReset (): boolean {
    if (this.blur) {
      this.blur = false
      return true
    }
    return false
  }

  public cancelMove = (fromBB?: string) => {
    if (fromBB !== 'backbutton') router.backbutton.stack.pop()
    this.vm.moveToSubmit = null
    this.vm.dropToSubmit = null
    this.jump(this.vm.ply)
  }

  public submitMove = (v: boolean) => {
    if (v && (this.vm.moveToSubmit || this.vm.dropToSubmit) && !this.vm.submitFeedback) {
      if (this.vm.moveToSubmit) {
        this.actualSendMove(this.vm.moveToSubmit)
      } else if (this.vm.dropToSubmit) {
        this.actualSendMove(this.vm.dropToSubmit)
      }
      if (this.data.game.speed === 'correspondence' && !hasNetwork()) {
        Toast.show({ text: 'You need to be connected to Internet to send your move.', position: 'bottom', duration: 'short' })
      }
      this.vm.moveToSubmit = null
      this.vm.dropToSubmit = null
      this.vm.submitFeedback = [this.data.game.turns, performance.now()]
    } else {
      this.cancelMove()
    }
  }

  public apiMove(o: MoveOrDrop) {
    const d = this.data
    const playing = gameApi.isPlayerPlaying(d)
    const ghosts = countGhosts(o.fen)

    if (playing) this.lastMoveMillis = performance.now()

    if (this.vm.submitFeedback && (this.vm.submitFeedback[0] + 1 === o.ply ||
      (this.vm.submitFeedback[0] === o.ply && ghosts))) {
      const feebackDuration = this.data.game.speed === 'correspondence' ?
        Math.max(500 - (performance.now() - this.vm.submitFeedback[1]), 0) :
        0
      setTimeout(() => {
        this.vm.submitFeedback = undefined
        if (playing) {
          sound.confirmation()
          vibrate.tap()
        }
        redraw()
      }, feebackDuration)
    }
    
    d.game.turns = o.ply
    d.game.player = o.ply % 2 === 0 ? 'white' : 'black'
    const playedColor: Color = o.ply % 2 === 0 ? 'black' : 'white'
    const white: Player = d.player.color === 'white' ?  d.player : d.opponent
    const black: Player = d.player.color === 'black' ? d.player : d.opponent
    const activeColor = d.player.color === d.game.player
    const frisianVariant = d.game.variant.key === 'frisian' || d.game.variant.key === 'frysk'

    if (o.status) {
      d.game.status = o.status
    }

    if (o.winner) {
      d.game.winner = o.winner
    }

    const wDraw = white.offeringDraw
    const bDraw = black.offeringDraw
    if (!wDraw && o.wDraw) {
      sound.dong()
      vibrate.warn()
    }
    if (!bDraw && o.bDraw) {
      sound.dong()
      vibrate.warn()
    }
    white.offeringDraw = o.wDraw
    black.offeringDraw = o.bDraw

    d.possibleMoves = activeColor ? o.dests : undefined
    d.captureLength = o.captLen

    if (!this.replaying()) {
      this.vm.ply = d.game.turns + (ghosts > 0 ? 1 : 0)

      const newConf = {
        turnColor: d.game.player,
        dests: playing ? gameApi.parsePossibleMoves(d.possibleMoves) : <DestsMap>{},
        captureLength: d.captureLength,
        kingMoves: (o.fen && frisianVariant) ? fen.readKingMoves(o.fen) : undefined
      }
      if (isMove(o)) {
        const move = draughtsFormat.uciToMove(o.uci)
        this.draughtsground.apiMove(
          move[0],
          move[1],
          {},
          newConf,
          ghosts === 0
        )
      } else if (isDrop(o)) {
        this.draughtsground.apiNewPiece(
          {
            role: o.role,
            color: playedColor
          },
          draughtsFormat.uciToDropPos(o.uci),
          newConf
        )
      }
    }

    if (o.clock) {
      const c = o.clock
      if (this.clock) {
        const delay = (playing && activeColor) ? 0 : (c.lag || 1)
        this.clock.setClock(d, c.white, c.black, delay)
      } else if (this.correspondenceClock) {
        this.correspondenceClock.update(c.white, c.black)
      }
    }

    d.game.threefold = !!o.threefold
    addStep(d.steps, {
      ply: d.game.turns,
      fen: o.fen,
      san: o.san,
      uci: o.uci
    })
    gameApi.setOnGame(d, playedColor, true)

    if (this.data.expiration) {
      if (this.data.steps.length > 2) this.data.expiration = undefined
      else this.data.expiration.movedAt = Date.now()
    }

    if (playing && playedColor === d.player.color) {
      this.transientMove.clear()
    }

    if (!this.replaying() && playedColor !== d.player.color &&
      (this.draughtsground.state.premovable.current || this.draughtsground.state.predroppable.current)) {
      setTimeout(() => {
        this.draughtsground.playPremove()
      }, 1)
    }

    if (this.data.game.speed === 'correspondence') {
      session.refresh()
      ?.then(() => {
        if (Capacitor.getPlatform() === 'ios') {
          Badge.setNumber({ badge: session.myTurnGames().length })
        }
      })
    }
  }

  public onReload = (rCfg: OnlineGameData) => {
    rCfg.steps = mergeSteps(rCfg.steps)
    if (rCfg.steps.length !== this.data.steps.length) {
      this.vm.ply = rCfg.steps[rCfg.steps.length - 1].ply
    }
    if (this.chat) this.chat.onReload(rCfg.chat)
    if (this.data.tv) rCfg.tv = this.data.tv
    if (this.data.userTV) rCfg.userTV = this.data.userTV

    this.setData(rCfg)

    this.makeCorrespondenceClock()
    if (this.clock && this.data.clock) this.clock.setClock(this.data, this.data.clock.white, this.data.clock.black)
    this.lastMoveMillis = undefined
    if (!this.replaying()) ground.reload(this.draughtsground, this.data, rCfg.game.fen, this.vm.flip, this.plyStep(this.vm.ply))
    redraw()
  }

  public reloadGameData = (isRetry = false) => {
    Promise.all([
      xhr.reload(this),
      socket.getVersion(),
    ])
    .then(([data, version]) => {
      if ((version === null) || version > data.player.version) {
        // race condition! try to reload again
        if (isRetry) router.reload() // give up and reload the screen
        else this.reloadGameData(true)
      }
      else this.onReload(data)
    })
    .catch(router.reload)
  }

  public endWithData = (o: ApiEnd) => {
    const d = this.data
    d.game.winner = o.winner
    d.game.status = o.status
    d.game.boosted = o.boosted

    // in case game is ended with a draw offer
    d.opponent.offeringDraw = false

    this.userJump(this.lastPly())
    this.draughtsground.stop()

    if (this.vm.submitFeedback) {
      this.vm.submitFeedback = undefined
    }

    if (o.ratingDiff) {
      d.player.ratingDiff = o.ratingDiff[d.player.color]
      d.opponent.ratingDiff = o.ratingDiff[d.opponent.color]
    }
    if (this.clock && o.clock) this.clock.setClock(d, o.clock.wc * .01, o.clock.bc * .01)

    if (d.game.turns > 1) {
      sound.dong()
      if (d.player.color === d.game.winner) {
        vibrate.good()
      } else {
        vibrate.bad()
      }
    }
    if (!this.data.player.spectator) {
      session.backgroundRefresh()
      sleepUtils.allowSleepAgain()
      Toast.show({ text: this.gameStatus(), position: 'center', duration: 'short' })
    }
    this.score === undefined
  }

  public gameStatus(): string {
    const winner = gameApi.getPlayer(this.data, this.data.game.winner)
    return gameStatusApi.toLabel(this.data.game.status.name, this.data.game.winner, this.data.game.variant.key) +
      (winner ? (this.data.game.status.name !== 'mate' ? '. ' : '') + i18n(winner.color === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
  }

  public goBerserk() {
    this.socket.berserk()
    sound.berserk()
  }

  public setBerserk(color: Color) {
    if (this.vm.goneBerserk[color]) return
    this.vm.goneBerserk[color] = true
    if (color !== this.data.player.color) sound.berserk()
    redraw()
  }

  public toggleBookmark = () => {
    return toggleGameBookmark(this.data.game.id).then(() => {
      this.data.bookmarked = !this.data.bookmarked
      redraw()
    })
    .catch(handleXhrError)
  }

  public unload() {
    this.transientMove.clear()
    if (this.clock) this.clock.unload()
    clearInterval(this.clockIntervId)
    this.appStateListener?.remove()
    signals.gameBackButton.removeAll()
  }

  public acceptTakeback(): void {
    this.draughtsground.cancelPremove()
    this.socket.iface.send('takeback-yes')
  }

  private makeCorrespondenceClock() {
    if (this.data.correspondence && !this.correspondenceClock)
      this.correspondenceClock = new CorresClockCtrl(
        this.data.correspondence, this.socket.outoftime
      )
  }

  private correspondenceClockTick = () => {
    if (this.correspondenceClock && gameApi.playable(this.data))
      this.correspondenceClock.tick(this.data.game.player)
  }

  private actualSendMove(moveOrDropReq: MoveRequest | DropRequest, premove = false, blur = false) {
    const millis = premove ? 0 : this.lastMoveMillis !== undefined ?
      performance.now() - this.lastMoveMillis : undefined

    const opts = {
      ackable: true,
      withLag: !!this.clock && (millis === undefined || !this.isClockRunning()),
      millis,
      blur
    }

    // Pauses both clocks. When the server echoes back this move, the clocks will resume.
    // This prevents a confusing user experience where a laggy network makes it appear that
    // it's still the user's turn; see #2000.
    this.clock?.stopClock()
    redraw()

    if (isMoveRequest(moveOrDropReq)) {
      this.socket.iface.send('move', moveOrDropReq, opts)
    }
    else if (isDropRequest(moveOrDropReq)) {
      this.socket.iface.send('drop', moveOrDropReq, opts)
    }

    this.transientMove.register()
  }

  private userMove = (orig: Key, dest: Key, meta: AfterMoveMeta) => {
    const hasPremove = !!meta.premove
    this.sendMove(orig, dest, hasPremove)
  }

  private onMove = (_: Key, __: Key, capturedPiece?: Piece) => {
    if (capturedPiece) {
      sound.capture()
      if (!this.data.player.spectator) {
        vibrate.heavy()
      }
    } else {
      sound.move()
      if (!this.data.player.spectator) {
        vibrate.tap()
      }
    }
  }

  private onResume = () => {
    this.blur = true
    // hack to avoid nasty race condition on resume: socket will reconnect with
    // an old version and server will send move event that will be processed after
    // a reload by xhr triggered by same resume event
    // thus we disconnect socket and reconnect it after reloading data in order to
    // have last version
    xhr.reload(this)
    .then(data => {
      socket.setVersion(data.player.version)
      this.onReload(data)
    })
  }

  private setData(cfg: OnlineGameData) {
    if (cfg.expiration) {
      cfg.expiration.movedAt = Date.now() - cfg.expiration.idleMillis
    }
    this.data = cfg
  }
}
