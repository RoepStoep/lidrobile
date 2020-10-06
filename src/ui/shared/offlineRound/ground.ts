import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import * as gameApi from '../../../lidraughts/game'
import settings from '../../../settings'
import { OfflineGameData } from '../../../lidraughts/interfaces/game'
import { AfterMoveMeta } from '../../../lidraughts/interfaces/move'
import getVariant from '../../../lidraughts/variant'
import { boardOrientation } from '../../../utils'
import { uciToMoveOrDrop } from '../../../utils/draughtsFormat'
import { batchRequestAnimationFrame } from '../../../utils/batchRAF'
import { GameSituation } from '../../../draughts'

function makeConfig(data: OfflineGameData, sit: GameSituation): cg.InitConfig {
  const lastUci = sit.uciMoves.length ? sit.uciMoves[sit.uciMoves.length - 1] : null
  const pieceMoveConf = settings.game.pieceMove()
  const board = (getVariant(data.game.variant.key) || getVariant('standard')).board
  return {
    batchRAF: batchRequestAnimationFrame,
    fen: sit.fen,
    boardSize: board.size,
    orientation: boardOrientation(data),
    turnColor: sit.player,
    lastMove: lastUci ? uciToMoveOrDrop(lastUci) : null,
    captureLength: data.captureLength || sit.captureLength,
    otb: data.game.id === 'offline_otb',
    coordinates: settings.game.coords(),
    coordSystem: (settings.game.coordSystem() === 1 && board.key === '64') ? 1 : 0,
    otbMode: settings.otb.flipPieces() ? 'flip' : 'facing',
    highlight: {
      lastMove: settings.game.highlights(),
      kingMoves: settings.game.kingMoves()
    },
    movable: {
      free: false,
      color: gameApi.isPlayerPlaying(data) ? sit.player : null,
      showDests: settings.game.pieceDestinations(),
      variant: data.game.variant.key,
      dests: sit.dests
    },
    animation: {
      enabled: settings.game.animations(),
      duration: 300
    },
    premovable: {
      enabled: false
    },
    draggable: {
      enabled: pieceMoveConf === 'drag' || pieceMoveConf === 'both',
      centerPiece: data.pref.centerPiece,
      distance: 3,
      magnified: settings.game.magnified()
    },
    selectable: {
      enabled: pieceMoveConf === 'tap' || pieceMoveConf === 'both'
    },
  }
}

function make(
  data: OfflineGameData,
  sit: GameSituation,
  userMove: (orig: Key, dest: Key, meta: AfterMoveMeta) => void,
  userNewPiece: (role: Role, key: Key, meta: AfterMoveMeta) => void,
  onMove: (orig: Key, dest: Key, capturedPiece: Piece) => void,
  onNewPiece: () => void
) {
  const config = makeConfig(data, sit)
  config.movable!.events = {
    after: userMove,
    afterNewPiece: userNewPiece
  }
  config.events = {
    move: onMove,
    dropNewPiece: onNewPiece
  }
  return new Draughtsground(config)
}

function reload(ground: Draughtsground, data: OfflineGameData, sit: GameSituation) {
  ground.reconfigure(makeConfig(data, sit))
}

function changeOTBMode(ground: Draughtsground, flip: boolean) {
  ground.setOtbMode(flip ? 'flip' : 'facing')
}

function promote(ground: Draughtsground, key: Key) {
  const pieces: {[k: string]: Piece } = {}
  const piece = ground.state.pieces[key]
  if (piece && piece.role === 'man') {
    pieces[key] = {
      color: piece.color,
      role: 'king'
    }
    ground.setPieces(pieces)
  }
}

function end(ground: Draughtsground) {
  ground.stop()
}

export default {
  make,
  reload,
  promote,
  end,
  changeOTBMode
}
