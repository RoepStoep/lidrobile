declare type Timestamp = number
declare type Seconds = number
declare type Centis = number
declare type Millis = number

declare type StringMap = {
  [i: string]: string | undefined
}

declare type SanChar = 'P' | 'N' | 'B' | 'R' | 'Q'

declare type Color = 'white' | 'black'

declare type ColorMap<T> = {
  [C in Color]: T | undefined
}

declare type VariantKey = 'standard' | 'antidraughts' | 'breakthrough' | 'fromPosition' | 'frisian' | 'frysk'

declare type Speed = 'ultraBullet' | 'bullet' | 'blitz' | 'rapid' | 'classical' | 'correspondence'
declare type PerfKey = Speed | VariantKey | 'puzzle' | 'puzzlefrisian'

declare type Role = 'king' | 'man' | 'ghostman' | 'ghostking';

declare type Key = '00' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | '14' | '15' | '16' | '17' | '18' | '19' | '20' | '21' | '22' | '23' | '24' | '25' | '26' | '27' | '28' | '29' | '30' | '31' | '32' | '33' | '34' | '35' | '36' | '37' | '38' | '39' | '40' | '41' | '42' | '43' | '44' | '45' | '46' | '47' | '48' | '49' | '50';

declare type KeyPair = [Key, Key]

declare type NumberPair = [number, number]
declare type NumberPairShift = [number, number, number];

declare type NumberQuad = [number, number, number, number];
declare type NumberQuadShift = [number, number, number, number, number];

declare type BoardPos = {
  left: number
  bottom: number
}

declare type Uci = string
declare type San = string
declare type Fen = string
declare type Ply = number

declare type DestsMap = {
  [index: string]: Key[] | undefined
}

interface LidraughtsOptions {
  apiEndPoint: string
  socketEndPoint: string
  mode: string
}

interface Window {
  lidraughts: LidraughtsOptions
  moment: any
  shouldRotateToOrientation: () => boolean
  AppVersion: { version: string }
  Shepherd: TetherShepherd.ShepherdStatic
}

interface Piece {
  role: Role
  color: Color
  promoted?: boolean
  kingMoves?: number;
}

interface BoardPosition {
  name: string
  fen: string
  eco?: string
}

interface BoardPositionCategory {
  name: string
  positions: Array<BoardPosition>
}

interface Variant {
  key: VariantKey
  name: string
  short: string
  title?: string
}
