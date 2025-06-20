import { Share } from '@capacitor/share'
import i18n from '../../i18n'
import Draughtsground from '../../draughtsground/Draughtsground'
import router from '../../router'
import * as draughts from '../../draughts'
import * as draughtsFormat from '../../utils/draughtsFormat'
import sound from '../../sound'
import vibrate from '../../vibrate'
import settings from '../../settings'
import gameStatusApi from '../../lidraughts/status'
import { aiName } from '../../lidraughts/player'
import { playerFromFen } from '../../utils/fen'
import { oppositeColor, getRandomArbitrary } from '../../utils'
import { StoredOfflineGame, setCurrentAIGame } from '../../utils/offlineGames'
import { OfflineGameData, GameStatus } from '../../lidraughts/interfaces/game'
import redraw from '../../utils/redraw'

import ground from '../shared/offlineRound/ground'
import makeData from '../shared/offlineRound/data'
import { setResult } from '../shared/offlineRound'
import { AiRoundInterface, AiVM, PromotingInterface } from '../shared/round'
import { ClockType } from '../shared/clock/interfaces'
import Replay from '../shared/offlineRound/Replay'

import actions, { AiActionsCtrl } from './actions'
import Engine from './engine'
import newGameMenu, { NewAiGameCtrl } from './newAiGame'

interface InitPayload {
  variant: VariantKey
  fen?: string
}

export default class AiRound implements AiRoundInterface, PromotingInterface {
  public data!: OfflineGameData
  public draughtsground!: Draughtsground
  public replay?: Replay
  public actions: AiActionsCtrl
  public newGameMenu: NewAiGameCtrl
  public vm: AiVM
  public moveList: boolean

  public engine?: Engine
  private engineNextMove: number | undefined

  public constructor(
    saved: StoredOfflineGame | null,
    setupFen?: string,
    setupVariant?: VariantKey,
    setupColor?: Color
  ) {
    this.actions = actions.controller(this)
    this.newGameMenu = newGameMenu.controller(this)

    this.moveList = !!settings.game.moveList()

    this.vm = {
      engineSearching: false,
      setupFen,
      setupVariant,
      savedFen: saved ? saved.data.game.fen : undefined,
      savedVariant: saved ? saved.data.game.variant.key : undefined
    }

    if (setupFen) {
      this.newGameMenu.isOpen(true)

      if (setupColor) {
        settings.ai.color(setupColor)
      }

      if (setupVariant) {
        settings.ai.variant(setupVariant)
      }

      redraw()
    } else {
      const currentVariant = settings.ai.variant()
      if (saved) {
        try {
          this.init(saved.data, saved.situations, saved.ply)
        } catch (e) {
          console.log(e, 'Fail to load saved game')
          this.startNewGame(currentVariant)
        }
      } else {
        this.startNewGame(currentVariant)
      }
    }
  }

  private init(data: OfflineGameData, situations: Array<draughts.GameSituation>, ply: number) {
    this.newGameMenu.close()
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

    if (!this.draughtsground) {
      this.draughtsground = ground.make(this.data, this.replay.situation(), this.userMove, this.onMove)
    } else {
      ground.reload(this.draughtsground, this.data, this.replay.situation())
    }

    if (this.engine && this.engine.variant === variant) {
      this.engine.newGame()
      .then(() => {
        if (this.isEngineToMove()) {
          this.engineMove()
        }
      })
    } else {
      if (this.engine) {
        this.engine.exit()
        this.engine = undefined
      }
      this.engine = new Engine(this, variant)
      this.engine.init()
      .then(() => {
        if (this.isEngineToMove()) {
          this.engineMove()
        }
      })
    }

    this.save()
    redraw()
  }

  // clockType preceded by underscore until we implement AI timed games
  public startNewGame(variant: VariantKey, setupFen?: string, _clockType?: ClockType, setupColor?: Color) {
    if (this.engineNextMove) {
      clearTimeout(this.engineNextMove)
      this.engineNextMove = undefined
    }

    const payload: InitPayload = {
      variant
    }
    if (setupFen) {
      payload.fen = setupFen
    }

    draughts.init(payload)
    .then((data: draughts.InitResponse) => {
      this.init(makeData({
        id: 'offline_ai',
        variant: data.variant,
        initialFen: data.setup.fen,
        fen: data.setup.fen,
        color: setupColor || getColorFromSettings(),
        player: data.setup.player,
        captureLength: data.setup.captureLength || 0
      }), [data.setup], data.setup.ply)
    })
    .then(() => {
      if (setupFen) {
        this.vm.setupFen = undefined
        router.History.replaceState(undefined, '/ai')
      }
    })
  }

  public goToAnalysis = () => {
    if (this.replay) {
      router.set(`/analyse/offline/ai/${this.data.player.color}?ply=${this.replay.ply}&curFen=${this.replay.situation().fen}`)
    }
  }

  public save() {
    if (this.replay) {
      setCurrentAIGame({
        data: this.data,
        situations: this.replay.situations,
        ply: this.replay.ply
      })
    }
  }

  public sharePDN = () => {
    this.replay?.pdn(this.white(), this.black())
    .then((data: draughts.PdnDumpResponse) =>
      Share.share({ text: data.pdn })
    )
  }

  public playerName = (): string => {
    return this.data.player.username!
  }

  public white(): string {
    if (this.data.player.color === 'white')
      // set in offlineround data
      return this.data.player.username!
    else
      return this.getOpponent().name
  }

  public black(): string {
    if (this.data.player.color === 'black')
      // set in offlineround data
      return this.data.player.username!
    else
      return this.getOpponent().name
  }

  public getOpponent() {
    const level = settings.ai.opponent()
    const opp = settings.ai.availableOpponents.find(e => e[1] === level)
    const name = opp && opp.length && opp[0] || 'Scan'
    return {
      name: i18n('aiNameLevelAiLevel', name, level),
      level: parseInt(level) || 1
    }
  }

  public player(): Color {
    return this.data.player.color
  }

  public onEngineMove = (bestmove: string) => {
    let sep = bestmove.indexOf('-')
    if (sep === -1) sep = bestmove.indexOf('x')
    const nextCapt = bestmove.indexOf('x', sep + 1)
    const fromfield = bestmove.slice(0, sep)
    const tofield = bestmove.slice(sep + 1, nextCapt === -1 ? bestmove.length : nextCapt)
    const from = (fromfield.length === 1 ? '0' + fromfield : fromfield) as Key
    const to = (tofield.length === 1 ? '0' + tofield : tofield) as Key
    this.vm.engineSearching = false
    this.draughtsground.apiMove(from, to)
    this.replay?.addMove(from, to)
    redraw()
    if (nextCapt !== -1) {
      this.engineNextMove = setTimeout(() => this.onEngineMove(bestmove.slice(sep + 1)), 600)
    } else {
      this.engineNextMove = undefined
    }
  }

  private engineMove = () => {
    this.vm.engineSearching = true
    const sit = this.replay!.situation(), captureFen = this.replay!.lastCaptureFen()
    setTimeout(() => {
      const l = this.getOpponent().level
      this.data.opponent.name = aiName({
        ai: l
      })
      // send fen and moves after last capture
      let uciMoves: string[] = []
      for (let i = 0; i < sit.pdnMoves.length; i++) {
        if (sit.pdnMoves[i].indexOf('x') !== -1) uciMoves = []
        else uciMoves.push(sit.uciMoves[i])
      }
      void this.engine!.init()
        .then(() => this.engine!.search(l, captureFen || this.data.game.initialFen, sit.fen, uciMoves))
    }, 500)
  }

  private isEngineToMove = () => {
    const sit = this.replay!.situation()
    return !sit.end && sit.player !== this.data.player.color
  }

  private userMove = (orig: Key, dest: Key) => {
    this.replay?.addMove(orig, dest)
  }

  private onMove = (_: Key, __: Key, capturedPiece?: Piece) => {
    if (capturedPiece) {
      sound.capture()
    } else {
      sound.move()
    }
    vibrate.tap()
  }

  public apply(sit: draughts.GameSituation) {
    if (sit) {
      const lastUci = sit.uciMoves.length ? sit.uciMoves[sit.uciMoves.length - 1] : null
      this.draughtsground.set({
        fen: sit.fen,
        turnColor: sit.player,
        lastMove: lastUci ? draughtsFormat.uciToMoveOrDrop(lastUci) : null,
        dests: sit.dests,
        captureLength: sit.captureLength || 0,
        movableColor: sit.player === this.data.player.color ? sit.player : null
      })
    }
  }

  public onReplayAdded = (sit: draughts.GameSituation) => {
    this.data.game.fen = sit.fen
    this.apply(sit)
    setResult(this, sit.status)
    if (gameStatusApi.finished(this.data)) {
      this.onGameEnd()
    } else if (!this.engineNextMove && this.isEngineToMove()) {
      this.engineMove()
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
    if (this.engineNextMove) {
      clearTimeout(this.engineNextMove)
      this.engineNextMove = undefined
    }
    this.draughtsground.cancelMove()
    this.draughtsground.stop()
    setTimeout(() => {
      this.actions.open()
      redraw()
    }, 500)
  }

  public resign = () => {
    setResult(this, { id: 31, name: 'resign' }, oppositeColor(this.data.player.color))
    this.save()
    this.onGameEnd()
  }

  private firstPlayerColor(): Color {
    return playerFromFen(this.data.game.initialFen)
  }

  public firstPly = () => {
    return this.data.player.color === oppositeColor(this.firstPlayerColor()) ? 1 : 0
  }

  public lastPly = () => {
    return this.replay!.situations.length - 1
  }

  public jump = (ply: number) => {
    this.draughtsground.cancelMove()
    if (this.replay!.ply === ply || ply < 0 || ply >= this.replay!.situations.length) return false
    this.replay!.ply = ply
    this.apply(this.replay!.situation())
    return false
  }

  public jumpFirst = () => this.jump(this.firstPly())

  public jumpPrev = () => {
    const ply = this.replay!.ply
    if (this.data.player.color === oppositeColor(this.firstPlayerColor())) {
      const offset = ply % 2 === 0 ? 1 : 2
      return this.jump(ply - offset)
    } else {
      const offset = ply % 2 === 0 ? 2 : 1
      return this.jump(ply - offset)
    }
  }

  public jumpNext = () => {
    const ply = this.replay!.ply
    return this.jump(ply + (ply + 2 >= this.replay!.situations.length ? 1 : 2))
  }

  public jumpLast = () => this.jump(this.lastPly())

  public canDrop = () => true
}

function getColorFromSettings(): Color {
  let color = settings.ai.color()
  if (color === 'random') {
    if (getRandomArbitrary(0, 2) > 1)
      color = 'white'
    else
      color = 'black'
  }

  return color
}
