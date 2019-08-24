import i18n from '../../../i18n'
import * as draughts from '../../../draughts'
import { GameStatus } from '../../../lidraughts/interfaces/game'

export default class Replay {
  public variant!: VariantKey
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
    this.initialFen = initialFen
    this.situations = situations
    this.ply = ply || 0
  }

  public situation = (): draughts.GameSituation => {
    return this.situations[this.situations.length - 1]
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
    draughts.move({
      variant: this.variant,
      fen: sit.fen,
      pdnMoves: sit.pdnMoves,
      uciMoves: sit.uciMoves,
      orig,
      dest
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
      pdnMoves: sit.pdnMoves
    })
    .then(resp => {
      if (resp.threefoldRepetition) {
        this.onThreefoldRepetition(resp.status)
      } else {
        window.plugins.toast.show(i18n('incorrectThreefoldClaim'), 'short', 'center')
      }
    })
    .catch(console.error.bind(console))
  }

  public pgn = (white: string, black: string) => {
    const sit = this.situation()
    return draughts.pdnDump({
      variant: this.variant,
      initialFen: this.initialFen,
      pdnMoves: sit.pdnMoves,
      white,
      black
    })
  }

  private addMoveOrDrop = (moveOrDrop: draughts.MoveResponse) => {
    this.ply = moveOrDrop.situation.ply
    if (this.situations.length && this.ply < this.situations[this.situations.length - 1].ply) {
      let drop = 2;
      while (this.ply < this.situations[this.situations.length - drop].ply) {
        drop++;
      }
      this.situations = this.situations.slice(0, this.situations.length - drop)
    }
    this.situations.push(moveOrDrop.situation)
    this.onReplayAdded(this.situation())
  }
}
