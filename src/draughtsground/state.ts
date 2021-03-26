import * as cg from './interfaces'
import { AnimCurrent } from './anim'
import { DragCurrent } from './drag'

export interface State {
  pieces: cg.Pieces
  boardSize: cg.BoardSize
  orientation: Color // board orientation. white | black
  turnColor: Color // turn to play. white | black
  check: Key | null // square currently in check "a2"
  lastMove: Key[] | null // ucis of the last move [32, 27]
  animateFrom: number | null; // startindex in lastMove to animate
  selected: Key | null // square currently selected "32"
  coordinates: number // include coords attributes
  coordSystem?: number; // coordinate system (0 = fieldnumbers, 1 = algebraic)
  viewOnly: boolean // don't bind events: the user will never be able to move pieces around
  fixed: boolean // board is viewOnly and pieces won't move
  exploding: cg.Exploding | null
  otb: boolean // is this an otb game?
  otbMode: cg.OtbMode
  highlight: {
    lastMove: boolean // add last-move class to squares
    kingMoves: boolean | null; // show amount of king moves for frisian variants
  }
  batchRAF: (renderFunction: (ts?: number) => void) => void
  animation: {
    enabled: boolean
    duration: number
    current: AnimCurrent | null
  }
  movable: {
    free: boolean // all moves are valid - board editor
    color: Color | 'both' | null // color that can move.
    dests: DestsMap | null // valid moves. {"02" ["08" "07"] "03" ["09" "08"]}
    captLen: number | null
    captureUci: string[] | null // possible multicaptures, when played by clicking to the final square (or first ambiguity)
    variant?: string // game variant, to determine motion rules
    showDests: boolean // whether to add the move-dest class on squares
    dropped: KeyPair | null // last dropped [orig, dest], not to be animated
    events: {
      after?: (orig: Key, dest: Key, metadata: cg.MoveMetadata) => void // called after the move has been played
      afterNewPiece?: (role: Role, key: Key, metadata: cg.MoveMetadata) => void // called after a new piece is dropped on the board
    }
  }
  premovable: {
    enabled: boolean // allow premoves for color that can not move
    showDests: boolean // whether to add the premove-dest class on squares
    variant: string | null // game variant, to determine valid premoves
    current: KeyPair | null // keys of the current saved premove ["01" "07"]
    dests: Key[] | null // premove destinations for the current selection
    events: {
      set?: (orig: Key, dest: Key, metadata?: cg.SetPremoveMetadata) => void // called after the premove has been set
      unset?: () => void // called after the premove has been unset
    }
  }
  predroppable: {
    enabled: boolean // allow predrops for color that can not move
    current: cg.Drop | null // current saved predrop {role: 'knight'; key: 'e4'}
    events: {
      set?: (role: Role, key: Key) => void // called after the predrop has been set
      unset?: () => void // called after the predrop has been unset
    }
  }
  draggable: {
    enabled: boolean // allow moves & premoves to use drag'n drop
    distance: number // minimum distance to initiate a drag; in pixels
    magnified: boolean // whether dragging piece is magnified
    centerPiece: boolean // when magnified, center the piece under finger (otherwise shifted up)
    preventDefault: boolean // whether to prevent default on move and end
    showGhost: boolean // show ghost of piece being dragged
    deleteOnDropOff: boolean // delete a piece when it is dropped off the board
    current: DragCurrent | null
  }
  selectable: {
    // disable to enforce dragging over click-click move
    enabled: boolean
  }
  events: {
    change?: () => void // called after the situation changes on the board
    // called after a piece has been moved.
    // capturedPiece is undefined or like {color: 'white'; 'role': 'queen'}
    move?: (orig: Key, dest: Key, capturedPiece?: Piece) => void
    dropNewPiece?: (piece: Piece, key: Key) => void
  }
  prev: cg.PrevData
}

export function makeDefaults(): State {
  return {
    pieces: {},
    boardSize: [10, 10],
    orientation: 'white' as Color,
    turnColor: 'white' as Color,
    check: null,
    lastMove: null,
    animateFrom: null,
    selected: null,
    coordinates: 2,
    coordSystem: 0,
    otb: false,
    otbMode: 'facing' as cg.OtbMode,
    viewOnly: false,
    fixed: false,
    exploding: null,
    batchRAF: requestAnimationFrame.bind(window),
    highlight: {
      lastMove: true,
      kingMoves: true
    },
    animation: {
      enabled: true,
      duration: 200,
      current: null
    },
    movable: {
      free: true,
      color: 'both' as Color | 'both',
      dests: null,
      dropped: null,
      captLen: null,
      captureUci: null,
      showDests: true,
      events: {}
    },
    premovable: {
      enabled: true,
      showDests: true,
      variant: null,
      dests: null,
      current: null,
      events: {}
    },
    predroppable: {
      enabled: false,
      current: null,
      events: {}
    },
    draggable: {
      enabled: true,
      distance: 3,
      magnified: true,
      centerPiece: false,
      preventDefault: true,
      showGhost: true,
      deleteOnDropOff: false,
      current: null
    },
    selectable: {
      enabled: true
    },
    events: {},
    prev: {
      boardSize: null,
      orientation: null,
      bounds: null,
      turnColor: null,
      otbMode: null
    }
  }
}
