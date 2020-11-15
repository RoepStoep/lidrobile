import * as cg from '../../draughtsground/interfaces'
import settings from '../../settings'

import TrainingCtrl from './TrainingCtrl'
import { getVariant } from '../../lidraughts/variant'

export default function makeConfig(
  ctrl: TrainingCtrl,
  userMove: (orig: Key, dest: Key) => void): cg.InitConfig {

  const pieceMoveConf = settings.game.pieceMove()
  const board = ctrl.data.puzzle.variant.board || getVariant(ctrl.data.puzzle.variant.key).board

  return {
    fen: ctrl.data.puzzle.fen,
    boardSize: board.size,
    orientation: ctrl.data.puzzle.color,
    coordinates: settings.game.coords(),
    turnColor: ctrl.node.ply % 2 === 0 ? 'white' : 'black',
    highlight: {
      lastMove: settings.game.highlights(),
      kingMoves: settings.game.kingMoves()
    },
    movable: {
      free: false,
      color: ctrl.data.puzzle.color,
      showDests: settings.game.pieceDestinations(),
      variant: ctrl.data.puzzle.variant.key
    },
    events: {
      move: userMove
    },
    animation: {
      enabled: true,
      duration: 300
    },
    premovable: {
      enabled: false,
      variant: ctrl.data.puzzle.variant.key
    },
    draggable: {
      enabled: pieceMoveConf === 'drag' || pieceMoveConf === 'both',
      distance: 3,
      magnified: settings.game.magnified()
    },
    selectable: {
      enabled: pieceMoveConf === 'tap' || pieceMoveConf === 'both'
    },
  }
}
