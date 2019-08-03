import * as cg from './interfaces'
import { State } from './state'

export function noop() {}

export const pos2key = (pos: cg.Pos) => allKeys[pos[0] + 5 * pos[1] - 6];
export const field2key = (n: number) => n < 10 ? ('0' + n.toString()) as Key : n.toString() as Key;

export const key2pos = (k: Key) => key2posn(parseInt(k));
const key2posn = (k: number) => [(k - 1) % 5 + 1, ((k - 1) + (5 - (k - 1) % 5)) / 5] as cg.Pos;

export function boardpos(pos: cg.Pos, asWhite: boolean): BoardPos {
  return {
    left: (asWhite ? pos[0] - 1 : 10 - pos[0]) * 10.0,
    bottom: (asWhite ? pos[1] - 1 : 10 - pos[1]) * 10.0
  }
}

export function posToTranslate(pos: cg.Pos, asWhite: boolean, bounds: ClientRect): NumberPair {
  return [
    (!asWhite ? 4.5 - ((pos[1] % 2 !== 0 ? -0.5 : -1) + pos[0]) : (pos[1] % 2 !== 0 ? -0.5 : -1) + pos[0]) * bounds.width / 5,
    (!asWhite ? 10 - pos[1] : pos[1] - 1) * bounds.height / 10
  ];
}

export const allKeys: Key[] = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22', '23', '24', '25', '26', '27', '28', '29', '30', '31', '32', '33', '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46', '47', '48', '49', '50'];
export const invKeys: Key[] = allKeys.slice(0).reverse()

export function opposite(color: Color) {
  return color === 'white' ? 'black' : 'white'
}

export function containsX<T>(xs: T[] | undefined, x: T) {
  return xs !== undefined && xs.indexOf(x) !== -1
}

export function distance(pos1: NumberPair, pos2: NumberPair) {
  return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2))
}

export function transform(state: State, pieceColor: Color, translateProp: string) {
  if (state.otb) {
    const o = state.orientation
    const m = state.otbMode
    const t = state.turnColor
    if ((m === 'facing' && o === 'white' && pieceColor === 'black') ||
      (m === 'facing' && o === 'black' && pieceColor === 'white') ||
      (m === 'flip' && o === 'white' && t === 'black') ||
      (m === 'flip' && o === 'black' && t === 'white')
    ) {
      return translateProp + ' rotate(180deg)'
    } else {
      return translateProp
    }
  }

  return translateProp
}

export function translate(coord: NumberPair) {
  return 'translate(' + coord[0] + 'px,' + coord[1] + 'px)'
}

export function translate3d(coord: NumberPair) {
  return 'translate3d(' + coord[0] + 'px,' + coord[1] + 'px, 0)'
}

export const translateAway = translate([-99999, -99999])
export const translate3dAway = translate3d([-99999, -99999])

export function eventPosition(e: TouchEvent): NumberPair {
  const touch = e.targetTouches[0]
  return [touch.clientX, touch.clientY]
}

export function computeSquareBounds(orientation: Color, bounds: ClientRect, key: Key) {
  const pos = key2pos(key);
  if (orientation !== 'white') {
    pos[0] = 6 - pos[0];
    pos[1] = 11 - pos[1];
  }

  return {
    left: bounds.left + bounds.width * ((pos[0] - 1) * 2 + (pos[1] % 2 !== 0 ? 1 : 0)) / 10,
    top: bounds.top + bounds.height * (pos[1] - 1) / 10,
    width: bounds.width / 10,
    height: bounds.height / 10
  };
}

export function getPieceByKey(dom: cg.DOM, key: Key): cg.PieceNode | null {
  let el = dom.board.firstChild as cg.KeyedNode
  while (el) {
    if (el.tagName === 'PIECE' && el.cgKey === key) return el as cg.PieceNode
    el = el.nextSibling as cg.KeyedNode
  }
  return null
}

export function isObjectEmpty(o: any): boolean {
  for (let _ in o) return false;
  return true;
}

export const movesDown: number[][] = [
  [-1, -1, -1],
  [6, 7, 11],
  [7, 8, 12],
  [8, 9, 13],
  [9, 10, 14],
  [10, -1, 15],
  [-1, 11, 16],
  [11, 12, 17],
  [12, 13, 18],
  [13, 14, 19],
  [14, 15, 20],
  [16, 17, 21],
  [17, 18, 22],
  [18, 19, 23],
  [19, 20, 24],
  [20, -1, 25],
  [-1, 21, 26],
  [21, 22, 27],
  [22, 23, 28],
  [23, 24, 29],
  [24, 25, 30],
  [26, 27, 31],
  [27, 28, 32],
  [28, 29, 33],
  [29, 30, 34],
  [30, -1, 35],
  [-1, 31, 36],
  [31, 32, 37],
  [32, 33, 38],
  [33, 34, 39],
  [34, 35, 40],
  [36, 37, 41],
  [37, 38, 42],
  [38, 39, 43],
  [39, 40, 44],
  [40, -1, 45],
  [-1, 41, 46],
  [41, 42, 47],
  [42, 43, 48],
  [43, 44, 49],
  [44, 45, 50],
  [46, 47, -1],
  [47, 48, -1],
  [48, 49, -1],
  [49, 50, -1],
  [50, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1]
];

export const movesUp: number[][] = [
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, -1, -1],
  [-1, 1, -1],
  [1, 2, -1],
  [2, 3, -1],
  [3, 4, -1],
  [4, 5, -1],
  [6, 7, 1],
  [7, 8, 2],
  [8, 9, 3],
  [9, 10, 4],
  [10, -1, 5],
  [-1, 11, 6],
  [11, 12, 7],
  [12, 13, 8],
  [13, 14, 9],
  [14, 15, 10],
  [16, 17, 11],
  [17, 18, 12],
  [18, 19, 13],
  [19, 20, 14],
  [20, -1, 15],
  [-1, 21, 16],
  [21, 22, 17],
  [22, 23, 18],
  [23, 24, 19],
  [24, 25, 20],
  [26, 27, 21],
  [27, 28, 22],
  [28, 29, 23],
  [29, 30, 24],
  [30, -1, 25],
  [-1, 31, 26],
  [31, 32, 27],
  [32, 33, 28],
  [33, 34, 29],
  [34, 35, 30],
  [36, 37, 31],
  [37, 38, 32],
  [38, 39, 33],
  [39, 40, 34],
  [40, -1, 35],
  [-1, 41, 36],
  [41, 42, 37],
  [42, 43, 38],
  [43, 44, 39],
  [44, 45, 40]
];

export const movesHorizontal: number[][] = [
  [-1, -1],
  [-1, 2],
  [1, 3],
  [2, 4],
  [3, 5],
  [4, -1],
  [-1, 7],
  [6, 8],
  [7, 9],
  [8, 10],
  [9, -1],
  [-1, 12],
  [11, 13],
  [12, 14],
  [13, 15],
  [14, -1],
  [-1, 17],
  [16, 18],
  [17, 19],
  [18, 20],
  [19, -1],
  [-1, 22],
  [21, 23],
  [22, 24],
  [23, 25],
  [24, -1],
  [-1, 27],
  [26, 28],
  [27, 29],
  [28, 30],
  [29, -1],
  [-1, 32],
  [31, 33],
  [32, 34],
  [33, 35],
  [34, -1],
  [-1, 37],
  [36, 38],
  [37, 39],
  [38, 40],
  [39, -1],
  [-1, 42],
  [41, 43],
  [42, 44],
  [43, 45],
  [44, -1],
  [-1, 47],
  [46, 48],
  [47, 49],
  [48, 50],
  [49, -1]
];
