import { Plugins, AppState, PluginListenerHandle } from '@capacitor/core'
import sound from '../../sound'
import router from '../../router'
import Draughtsground from '../../draughtsground/Draughtsground'
import * as draughts from '../../draughts'
import * as draughtsFormat from '../../utils/draughtsFormat'
import settings from '../../settings'
import gameStatusApi from '../../lidraughts/status'
import { OfflineGameData, GameStatus } from '../../lidraughts/interfaces/game'
import { getInitialFen } from '../../lidraughts/variant'
import { oppositeColor } from '../../utils'
import { StoredOfflineGame, setCurrentOTBGame } from '../../utils/offlineGames'
import redraw from '../../utils/redraw'

import ground from '../shared/offlineRound/ground'
import makeData from '../shared/offlineRound/data'
import { setResult } from '../shared/offlineRound'
import { OtbRoundInterface, OtbVM, PromotingInterface } from '../shared/round'
import Replay from '../shared/offlineRound/Replay'

import actions from './actions'
import newGameMenu, { NewOtbGameCtrl } from './newOtbGame'
import importGamePopup, { Controller as ImportGameController } from './importGamePopup'

import clockSet from '../shared/clock/clockSet'
import { IDraughtsClock, ClockType } from '../shared/clock/interfaces'

interface InitPayload {
  variant: VariantKey
  fen?: string
}

export default class OtbRound implements OtbRoundInterface, PromotingInterface {
  public setupFen: string | undefined
  public data!: OfflineGameData
  public actions: any // TODO
  public newGameMenu: NewOtbGameCtrl
  public importGamePopup: ImportGameController
  public draughtsground!: Draughtsground
  public replay!: Replay
  public vm: OtbVM
  public clock?: IDraughtsClock
  public moveList: boolean

  private appStateListener: PluginListenerHandle

  public constructor(
    saved?: StoredOfflineGame | null,
    setupFen?: string,
    setupVariant?: VariantKey,
  ) {
    this.setupFen = setupFen
    this.actions = actions.controller(this)
    this.importGamePopup = importGamePopup.controller(this)
    this.newGameMenu = newGameMenu.controller(this)

    this.vm = {
      flip: false,
      setupFen,
      setupVariant,
      savedFen: saved ? saved.data.game.fen : undefined,
      savedVariant: saved ? saved.data.game.variant.key : undefined
    }

    this.moveList = settings.game.moveList()

    if (setupFen) {
      this.newGameMenu.open()

      if (setupVariant) {
        settings.otb.variant(setupVariant)
      }

      redraw()
    }
    else if (!saved || saved.ply === 0) this.newGameMenu.open()

    const currentVariant = <VariantKey>settings.otb.variant()
    if (!setupFen) {
      if (saved) {
        try {
          this.init(saved.data, saved.situations, saved.ply)
        } catch (e) {
          this.startNewGame(currentVariant, undefined, settings.otb.clockType())
        }
      } else {
        this.startNewGame(currentVariant, undefined, settings.otb.clockType())
      }
    }

    this.appStateListener = Plugins.App.addListener('appStateChange', (state: AppState) => {
      if (!state.isActive) this.saveClock()
    })
  }

  public unload() {
    this.appStateListener.remove()
    this.saveClock()
  }

  public init(data: OfflineGameData, situations: Array<draughts.GameSituation>, ply: number) {
    this.actions.close()
    this.data = data

    const variant = this.data.game.variant.key
    const initialFen = this.data.game.initialFen

    if (!this.replay) {
      this.replay = new Replay(
        variant,
        initialFen,
        situations,
        ply,
        this.onReplayAdded,
        this.onThreefoldRepetition
      )
    } else {
      this.replay.init(variant, initialFen, situations, ply)
    }

    if (data.offlineClock) {
      const clockType = data.offlineClock.clockType
      this.clock = clockSet[clockType](this.onFlag)
      this.clock.setState(data.offlineClock)
    }
    else {
      this.clock = undefined
    }

    if (!this.draughtsground) {
      this.draughtsground = ground.make(this.data, this.replay.situation(), this.userMove, this.onMove)
    } else {
      ground.reload(this.draughtsground, this.data, this.replay.situation())
    }

    redraw()
  }

  public startNewGame(variant: VariantKey, setupFen?: string, clockType?: ClockType | 'none') {
    const payload: InitPayload = {
      variant,
      fen: setupFen || getInitialFen(variant)
    }
    const clock = clockType && clockType !== 'none' ?
      clockSet[clockType](this.onFlag) : null

    draughts.init(payload)
    .then((data: draughts.InitResponse) => {
      this.init(makeData({
        id: 'offline_otb',
        variant: data.variant,
        initialFen: data.setup.fen,
        fen: data.setup.fen,
        player: data.setup.player,
        color: this.data && oppositeColor(this.data.player.color) || data.setup.player,
        pref: {
          centerPiece: true
        },
        clock: clock ? clock.getState() : null,
        captureLength: data.setup.captureLength
      }), [data.setup], data.setup.ply)
    })
    .then(() => {
      if (setupFen) {
        this.vm.setupFen = undefined
        router.replacePath('/otb')
      }
    })
  }

  public goToAnalysis = () => {
    router.set(`/analyse/offline/otb/${this.data.player.color}?ply=${this.replay.ply}&curFen=${this.replay.situation().fen}&variant=${this.data.game.variant.key}`)
  }

  public save = () => {
    setCurrentOTBGame({
      data: this.data,
      situations: this.replay.situations,
      ply: this.replay.ply
    })
  }

  public saveClock = () => {
    if (this.clock && this.clock.isRunning()) {
      this.clock.startStop()
    }
    this.save()
  }

  public isClockEnabled = (): boolean => {
    return !!this.clock &&
      this.clock.flagged() === undefined && this.clock.activeSide() !== undefined
  }

  public toggleClockPlay = (): void => {
    if (this.clock && this.isClockEnabled()) {
      this.clock.startStop()
    }
  }

  public sharePDN = () => {
    this.replay.pdn('White', 'Black')
    .then((data: draughts.PdnDumpResponse) =>
      Plugins.LiShare.share({ text: data.pdn })
    )
  }

  private userMove = (orig: Key, dest: Key) => {
    this.replay.addMove(orig, dest)
  }

  private onMove = (_: Key, __: Key, capturedPiece?: Piece) => {
    if (capturedPiece) {
      sound.capture()
    } else sound.move()
  }

  private onFlag = (color: Color) => {
    const winner = color === 'white' ? 'black' : 'white'
    setResult(this, {id: 35, name: 'outoftime'}, winner)
    sound.dong()
    this.onGameEnd()
    this.save()
  }

  public apply(sit: draughts.GameSituation) {
    if (sit) {
      if (this.clock && this.clock.activeSide() !== sit.player) {
        this.clock.toggleActiveSide()
      }

      const lastUci = sit.uciMoves.length ? sit.uciMoves[sit.uciMoves.length - 1] : null
      this.draughtsground.set({
        fen: sit.fen,
        turnColor: sit.player,
        lastMove: lastUci ? draughtsFormat.uciToMoveOrDrop(lastUci) : null,
        dests: sit.dests,
        captureLength: sit.captureLength,
        movableColor: sit.player
      })
    }
  }

  public onReplayAdded = (sit: draughts.GameSituation) => {
    const lastMovePlayer = sit.player === 'white' ? 'black' : 'white'
    if (this.clock) {
      this.clock.clockHit(lastMovePlayer)
    }
    this.data.game.fen = sit.fen
    this.apply(sit)
    setResult(this, sit.status)
    if (gameStatusApi.finished(this.data)) {
      this.onGameEnd()
    }
    this.save()
    redraw()
  }

  public onThreefoldRepetition = (newStatus: GameStatus) => {
    setResult(this, newStatus)
    this.save()
    this.onGameEnd()
  }

  public onGameEnd = () => {
    if (this.clock && this.clock.isRunning()) {
      this.clock.startStop()
    }
    this.draughtsground.stop()
    setTimeout(() => {
      this.actions.open()
      redraw()
    }, 500)
  }

  public player = () => {
    return this.replay.situation().player
  }

  public jump = (ply: number): false => {
    this.draughtsground.cancelMove()
    if (ply < 0 || ply >= this.replay.situations.length) return false
    this.replay.ply = ply
    this.apply(this.replay.situation())
    return false
  }

  public jumpNext = () => this.jump(this.replay.ply + 1)
  public jumpPrev = () => this.jump(this.replay.ply - 1)
  public jumpFirst = () => this.jump(this.firstPly())
  public jumpLast = () => this.jump(this.lastPly())

  public firstPly = () => 0
  public lastPly = () => this.replay.situations.length - 1

  public replaying = () => {
    return this.replay.ply !== this.lastPly()
  }

  public canDrop = () => true
}
