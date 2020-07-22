import { Shape as BrushShape } from '../BoardBrush'

export namespace Tree {
  export type Path = string

  export interface ClientEval {
    fen: string
    maxDepth?: number
    depth: number
    knps?: number
    nodes: number
    millis?: number
    pvs: PvData[]
    cloud?: boolean
    cp?: number
    win?: number
    retried?: boolean
    // maybe not keep here
    best?: Uci
  }

  export interface ServerEval {
    cp?: number
    win?: number
    best?: Uci
  }

  export interface PvData {
    readonly moves: ReadonlyArray<string>
    win?: number
    cp?: number
  }

  export interface Node {
    id: string
    ply: Ply
    displayPly?: Ply;
    fen: Fen
    uci?: Uci
    san?: San
    children: Node[]
    mergedNodes?: Node[]
    comments?: Comment[]
    // TODO maybe don't keep both formats for dests & drops
    dests?: string | DestsMap
    drops?: string | ReadonlyArray<string> | undefined | null
    destsUci?: ReadonlyArray<string>
    captLen?: number
    threat?: ClientEval
    ceval?: ClientEval
    eval?: ServerEval
    tbhit?: TablebaseHit | null
    opening?: Opening | null
    glyphs?: Glyph[]
    clock?: Clock
    parentClock?: Clock
    shapes?: ReadonlyArray<Shape>
    readonly comp?: boolean
    threefold?: boolean
    readonly fail?: boolean
    puzzle?: string
    // added locally during analysis by worker
    readonly pdnMoves?: ReadonlyArray<string>
    player?: Color
    end?: boolean
    // added locally by study gamebook ctrl
    gamebook?: Gamebook
  }

  export interface TablebaseHit {
    winner: Color | undefined
    best?: Uci
  }

  export interface Gamebook {
    deviation?: string
    hint?: string
    shapes?: Shape[]
  }

  export interface Comment {
    readonly id: string
    readonly by: string | {
      readonly id: string
      readonly name: string
    }
    text: string
  }

  export interface Opening {
    readonly name: string
    readonly eco: string
  }

  export interface Glyph {
    readonly name: string
    readonly symbol: string
  }

  export type Clock = number

  export type Shape = BrushShape
}

export function isClientEval(ev: Tree.ServerEval | Tree.ClientEval): ev is Tree.ClientEval {
  return (ev as Tree.ClientEval).depth !== undefined
}
