import Draughtsground from '../../draughtsground/Draughtsground'
import * as cg from '../../draughtsground/interfaces'
import settings from '../../settings'
import { animationDuration } from '../../utils'


function makeConfig(
  config: cg.SetConfig,
  orientation: Color,
  onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void
): cg.InitConfig {
  const pieceMoveConf = settings.game.pieceMove()
  return {
    fen: config.fen,
    boardSize: config.boardSize,
    lastMove: config.lastMove,
    turnColor: config.turnColor,
    captureLength: config.captureLength,
    orientation,
    coordinates: settings.game.coords(),
    coordSystem: config.coordSystem,
    movable: {
      free: false,
      color: config.movableColor,
      dests: config.dests,
      showDests: settings.game.pieceDestinations(),
      variant: config.variant,
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
      move: onMove
    },
    premovable: {
      enabled: false
    },
    highlight: {
      lastMove: settings.game.highlights(),
      kingMoves: settings.game.kingMoves()
    },
    animation: {
      enabled: !!settings.game.animations(),
      duration: animationDuration(settings.game.animations()),
    }
  }
}

export default {
  make(
    config: cg.SetConfig,
    orientation: Color,
    onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
  ) {
    return new Draughtsground(makeConfig(config, orientation, onMove))
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
