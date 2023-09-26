import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import * as gameApi from '../../../lidraughts/game'
import settings from '../../../settings'
import { boardOrientation, animationDuration } from '../../../utils'
import { OfflineGameData } from '../../../lidraughts/interfaces/game'
import { AfterMoveMeta } from '../../../lidraughts/interfaces/move'
import { getVariantBoard } from '../../../lidraughts/variant'
import { uciToMoveOrDrop } from '../../../utils/draughtsFormat'
import { GameSituation } from '../../../draughts'

function makeConfig(data: OfflineGameData, sit: GameSituation): cg.InitConfig {
  const lastUci = sit.uciMoves.length ? sit.uciMoves[sit.uciMoves.length - 1] : null
  const pieceMoveConf = settings.game.pieceMove()
  const board = getVariantBoard(data.game.variant.key)
  return {
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
      enabled: !!settings.game.animations(),
      duration: animationDuration(settings.game.animations()),
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
  onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
) {
  const config = makeConfig(data, sit)
  config.movable!.events = {
    after: userMove
  }
  config.events = {
    move: onMove
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
