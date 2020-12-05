import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import { countGhosts } from '../../../draughtsground/fen'
import redraw from '../../../utils/redraw'
import * as gameApi from '../../../lidraughts/game'
import { OnlineGameData, GameStep } from '../../../lidraughts/interfaces/game'
import { AfterMoveMeta } from '../../../lidraughts/interfaces/move'
import settings from '../../../settings'
import { boardOrientation } from '../../../utils'
import * as draughtsFormat from '../../../utils/draughtsFormat'

function makeConfig(data: OnlineGameData, fen: string, flip: boolean = false, step?: GameStep): cg.InitConfig {
  const lastMove = (step && step.uci !== null) ? 
    draughtsFormat.uciToMove(step.uci) :
    (data.game.lastMove ? draughtsFormat.uciToMove(data.game.lastMove) : null)

  const turnColor = step ? 
    ((step.ply - (countGhosts(step.fen) == 0 ? 0 : 1)) % 2 === 0 ? 'white' : 'black') :
    data.game.player;

  const pieceMoveConf = settings.game.pieceMove()

  return {
    fen: fen,
    boardSize: data.game.variant.board.size,
    orientation: boardOrientation(data, flip),
    turnColor: turnColor,
    captureLength: data.captureLength,
    lastMove,
    coordinates: settings.game.coords(),
    coordSystem: (settings.game.coordSystem() === 1 && data.game.variant.board.key === '64') ? 1 : 0,
    highlight: {
      lastMove: settings.game.highlights(),
      kingMoves: settings.game.kingMoves() && (data.game.variant.key === 'frisian' || data.game.variant.key === 'frysk')
    },
    movable: {
      free: false,
      color: gameApi.isPlayerPlaying(data) ? data.player.color : null,
      dests: gameApi.isPlayerPlaying(data) ? gameApi.parsePossibleMoves(data.possibleMoves) : {},
      variant: data.game.variant.key,
      showDests: settings.game.pieceDestinations()
    },
    animation: {
      enabled: !!settings.game.animations(),
      duration: data.pref.animationDuration
    },
    premovable: {
      enabled: data.pref.enablePremove,
      showDests: settings.game.pieceDestinations(),
      variant: data.game.variant.key,
      events: {
        set: () => redraw(),
        unset: redraw
      }
    },
    predroppable: {
      enabled: false,
      events: {
        set: () => redraw(),
        unset: redraw
      }
    },
    draggable: {
      enabled: pieceMoveConf === 'drag' || pieceMoveConf === 'both',
      distance: 3,
      magnified: settings.game.magnified(),
      preventDefault: true
    },
    selectable: {
      enabled: pieceMoveConf === 'tap' || pieceMoveConf === 'both'
    },
  }
}

function make(
  data: OnlineGameData,
  fen: string,
  userMove: (orig: Key, dest: Key, meta: AfterMoveMeta) => void,
  onMove: (orig: Key, dest: Key, capturedPiece?: Piece) => void,
  step?: GameStep
): Draughtsground {
  const config = makeConfig(data, fen, undefined, step)
  config.movable!.events = {
    after: userMove
  }
  config.events = {
    move: onMove
  }
  config.viewOnly = data.player.spectator
  return new Draughtsground(config)
}

function reload(ground: Draughtsground, data: OnlineGameData, fen: string, flip: boolean, step?: GameStep) {
  ground.reconfigure(makeConfig(data, fen, flip, step))
}

function promote(ground: Draughtsground, key: Key) {
  const pieces: cg.Pieces = {}
  const piece = ground.state.pieces[key]
  if (piece && piece.role === 'man') {
    pieces[key] = {
      color: piece.color,
      role: 'king'
    }
    ground.setPieces(pieces)
  }
}

export default {
  make,
  reload,
  promote
}
