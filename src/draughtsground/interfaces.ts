export type Pos = [number, number]
export type BoardSize = [number, number]

export type Pieces = {[index: string]: Piece}
export type PiecesDiff = {[index: string]: Piece | undefined}

export interface InitConfig {
  batchRAF: (callback: () => void) => void
  fen?: string
  boardSize?: BoardSize
  orientation?: Color
  turnColor?: Color
  captureLength?: number;
  lastMove?: Key[] | null
  selected?: Key
  coordinates?: number
  viewOnly?: boolean
  fixed?: boolean
  otb?: boolean
  otbMode?: OtbMode
  highlight?: {
    lastMove?: boolean
    kingMoves?: boolean
  }
  animation?: {
    enabled?: boolean
    duration?: number
  }
  movable?: {
    free?: boolean
    color?: Color | 'both' | null
    dests?: DestsMap | null
    showDests?: boolean
    captureUci?: string[]
    events?: {
      after?: (orig: Key, dest: Key, metadata: MoveMetadata) => void
      afterNewPiece?: (role: Role, key: Key, metadata: MoveMetadata) => void
    }
  }
  premovable?: {
    enabled?: boolean
    showDests?: boolean
    dests?: Key[]
    variant?: VariantKey,
    events?: {
      set?: (orig: Key, dest: Key, metadata?: SetPremoveMetadata) => void
      unset?: () => void
    }
  }
  predroppable?: {
    enabled?: boolean
    events?: {
      set?: (role: Role, key: Key) => void
      unset?: () => void
    }
  }
  draggable?: {
    enabled?: boolean
    distance?: number
    centerPiece?: boolean
    preventDefault?: boolean
    magnified?: boolean
    showGhost?: boolean
    deleteOnDropOff?: boolean
  }
  selectable?: {
    enabled: boolean
  }
  events?: {
    change?: () => void
    move?: (orig: Key, dest: Key, capturedPiece?: Piece) => void
    dropNewPiece?: (piece: Piece, key: Key) => void
  }
}

export interface SetConfig {
  orientation?: Color
  fen?: string
  lastMove?: Key[] | null
  captureLength?: number
  captureUci?: string[]
  turnColor?: Color
  movableColor?: Color | 'both' | null
  dests?: DestsMap | null
  kingMoves?: KingMoves | null
}

// {white: {pieces: {pawn: 3 queen: 1}, score: 6}, black: {pieces: {bishop: 2}, score: -6}
export interface MaterialDiff {
  white: { pieces: { [k: string]: number }, score: number }
  black: { pieces: { [k: string]: number }, score: number }
}

export interface DOM {
  board: HTMLElement // cg base element for the board
  elements: { [k: string]: HTMLElement } // other dom elements
  bounds: ClientRect
}

export interface MoveMetadata {
  premove: boolean
  ctrlKey?: boolean
  holdTime?: number
  captured?: Piece
  predrop?: boolean
}

export interface SetPremoveMetadata {
  ctrlKey?: boolean
}

export interface Exploding {
  stage: number
  keys: Key[]
}

export interface PlayerKingMoves {
  count: number;
  key?: Key;
}
export interface KingMoves {
  white: PlayerKingMoves;
  black: PlayerKingMoves;
}

export interface Drop {
  role: Role
  key: Key
}

export type OtbMode = 'facing' | 'flip'

export interface KeyedNode extends HTMLElement {
  cgKey: Key
}
export interface PieceNode extends KeyedNode {
  cgColor: Color
  // role + color
  cgPiece: string
  cgAnimating?: boolean
  cgCaptured?: boolean
  cgDragging?: boolean
}
export interface SquareNode extends KeyedNode { }

export interface PrevData {
  orientation: Color | null
  bounds: ClientRect | null
  turnColor: Color | null
  otbMode: OtbMode | null
}

export type KHz = number;
