import Draughtsground from '../../draughtsground/Draughtsground'
import * as cg from '../../draughtsground/interfaces'
import settings from '../../settings'
import { batchRequestAnimationFrame } from '../../utils/batchRAF'
import { AnalyseData } from '../../lidraughts/interfaces/analyse'


function makeConfig(
  data: AnalyseData,
  config: cg.SetConfig,
  orientation: Color,
  onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
  onNewPiece: (piece: Piece, pos: Key) => void
): cg.InitConfig {
  const pieceMoveConf = settings.game.pieceMove()
  return {
    fen: config.fen,
    boardSize: config.boardSize,
    batchRAF: batchRequestAnimationFrame,
    lastMove: config.lastMove,
    turnColor: config.turnColor,
    captureLength: config.captureLength,
    orientation,
    coordinates: settings.game.coords(),
    movable: {
      free: false,
      color: config.movableColor,
      dests: config.dests,
      showDests: settings.game.pieceDestinations(),
      variant: data.game.variant.key,
      captureUci: config.captureUci,
    },
    draggable: {
      enabled: pieceMoveConf === 'drag' || pieceMoveConf === 'both',
      magnified: settings.game.magnified()
    },
    selectable: {
      enabled: pieceMoveConf === 'tap' || pieceMoveConf === 'both'
    },
    events: {
      move: onMove,
      dropNewPiece: onNewPiece
    },
    premovable: {
      enabled: false
    },
    highlight: {
      lastMove: settings.game.highlights(),
      kingMoves: settings.game.kingMoves()
    },
    animation: {
      enabled: settings.game.animations(),
      duration: data.pref.animationDuration
    }
  }
}

export default {
  make(
    data: AnalyseData,
    config: cg.SetConfig,
    orientation: Color,
    onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
    onNewPiece: (piece: Piece, pos: Key) => void
  ) {
    return new Draughtsground(makeConfig(data, config, orientation, onMove, onNewPiece))
  },

  promote(ground: Draughtsground, key: Key) {
    const pieces: {[i: string]: Piece } = {}
    const piece = ground.state.pieces[key]
    if (piece && piece.role === 'man') {
      pieces[key] = {
        color: piece.color,
        role: 'king'
      }
      ground.setPieces(pieces)
    }
  }

}
