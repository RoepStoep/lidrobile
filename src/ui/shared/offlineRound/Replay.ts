import { Plugins } from '@capacitor/core'
import i18n from '../../../i18n'
import * as draughts from '../../../draughts'
import { countGhosts } from '../../../draughtsground/fen'
import { GameStatus } from '../../../lidraughts/interfaces/game'
import settings from '../../../settings'
import getVariant from '../../../lidraughts/variant'

export default class Replay {
  public variant!: VariantKey
  private boardKey!: string
  private initialFen!: string
  private onReplayAdded: (sit: draughts.GameSituation) => void
  private onThreefoldRepetition: (newStatus: GameStatus) => void

  public ply!: number
  public situations!: Array<draughts.GameSituation>

  constructor(
    variant: VariantKey,
    initialFen: string,
    initSituations: Array<draughts.GameSituation>,
    initPly: number,
    onReplayAdded: (sit: draughts.GameSituation) => void,
    onThreefoldRepetition: (newStatus: GameStatus) => void
  ) {
    this.init(variant, initialFen, initSituations, initPly)
    this.onReplayAdded = onReplayAdded
    this.onThreefoldRepetition = onThreefoldRepetition
  }

  public init(variant: VariantKey, initialFen: string, situations: Array<draughts.GameSituation>, ply: number) {
    this.variant = variant
    this.boardKey = (getVariant(variant) || getVariant('standard')).board.key
    this.initialFen = initialFen
    this.situations = situations
    this.ply = ply || 0
  }

  public situation = (): draughts.GameSituation => {
    let i = this.situations.length - 1;
    while (i >= 0) {
      if (this.displayPly(this.situations[i]) === this.ply) {
        break;
      }
      i--;
    }
    return this.situations[i]
  }

  public isAlgebraic = (): boolean =>
    settings.game.coordSystem() === 1 && this.boardKey === '64'
  
  public coordSystem= (): number => 
    this.isAlgebraic() ? 1 : 0

  private displayPly = (sit: draughts.GameSituation): number => {
    return countGhosts(sit.fen) ? sit.ply + 1 : sit.ply
  }

  public lastCaptureFen = (): string | undefined => {
    for (let i = this.situations.length - 1; i >= 0; i--) {
      const pdnMoves = this.situations[i].pdnMoves
      if (pdnMoves.length && pdnMoves[pdnMoves.length - 1].indexOf('x') !== -1)
        return this.situations[i].fen
    }
    return undefined
  }

  public addMove = (orig: Key, dest: Key) => {
    const sit = this.situation()
    const km = ((sit.variant === 'russian' || sit.variant === 'brazilian') && sit.kingMoves) ? sit.kingMoves : undefined
    draughts.move({
      variant: this.variant,
      fen: sit.fen,
      pdnMoves: sit.pdnMoves,
      uciMoves: sit.uciMoves,
      orig,
      dest,
      kingmovesWhite: km && km.white,
      kingmovesBlack: km && km.black,
    })
    .then(this.addMoveOrDrop)
    .catch(console.error.bind(console))
  }

  public addDrop = (role: Role, key: Key) => {
    const sit = this.situation()
    draughts.drop({
      variant: this.variant,
      fen: sit.fen,
      pdnMoves: sit.pdnMoves,
      uciMoves: sit.uciMoves,
      role,
      pos: key
    })
    .then(this.addMoveOrDrop)
    .catch(console.error.bind(console))
  }

  public claimDraw = () => {
    const sit = this.situation()
    draughts.threefoldTest({
      variant: this.variant,
      initialFen: this.initialFen,
      pdnMoves: sit.pdnMoves,
      finalSquare: true
    })
    .then(resp => {
      if (resp.threefoldRepetition) {
        this.onThreefoldRepetition(resp.status)
      } else {
        Plugins.LiToast.show({ text: i18n('incorrectThreefoldClaim'), duration: 'short' })
      }
    })
    .catch(console.error.bind(console))
  }

  public pdn = (white: string, black: string) => {
    const sit = this.situation()
    return draughts.pdnDump({
      variant: this.variant,
      algebraic: this.isAlgebraic(),
      initialFen: this.initialFen,
      pdnMoves: sit.pdnMoves,
      finalSquare: true,
      white,
      black
    })
  }

  private addMoveOrDrop = (moveOrDrop: draughts.MoveResponse) => {
    this.ply = this.displayPly(moveOrDrop.situation)
    const prevSit = this.situations[this.situations.length - 1]
    if (this.situations.length && this.ply <= this.displayPly(prevSit)) {
      if (countGhosts(prevSit.fen)) {
        const prevUci = prevSit.uci, prevSan = prevSit.san
        if (moveOrDrop.situation.uci && prevUci && prevUci.slice(prevUci.length - 2) === moveOrDrop.situation.uci.slice(0, 2)) {
          moveOrDrop.situation.uci = prevUci.slice(0, prevUci.length - 2) + moveOrDrop.situation.uci
          moveOrDrop.situation.id = prevSit.id.slice(0, 1) + moveOrDrop.situation.id.slice(1)
          moveOrDrop.situation.uciMoves = moveOrDrop.situation.uciMoves.slice(0, moveOrDrop.situation.uciMoves.length - 2).concat(moveOrDrop.situation.uci);
        }
        if (moveOrDrop.situation.san && prevSan) {
          const capt1 = prevSan.indexOf('x'), capt2 = moveOrDrop.situation.san.indexOf('x')
          if (capt1 !== -1 && capt2 !== -1 && prevSan.slice(capt1 + 1) === moveOrDrop.situation.san.slice(0, capt2)) {
            moveOrDrop.situation.san = prevSan.slice(0, capt1) + moveOrDrop.situation.san.slice(capt2)
            moveOrDrop.situation.pdnMoves = moveOrDrop.situation.pdnMoves.slice(0, moveOrDrop.situation.pdnMoves.length - 2).concat(moveOrDrop.situation.san);
          }
        }
      }
      let drop = 1;
      while (this.ply < this.situations[this.situations.length - drop].ply) {
        drop++;
      }
      this.situations = this.situations.slice(0, this.situations.length - drop)
    }
    this.situations.push(moveOrDrop.situation)
    this.onReplayAdded(this.situation())
  }
}
