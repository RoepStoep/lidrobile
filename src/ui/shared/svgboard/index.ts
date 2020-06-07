import cgFen from '../../../draughtsground/fen'
import { key2pos } from '../../../draughtsground/util'
import * as cg from '../../../draughtsground/interfaces'
import svgPieces from './pieces'

type BoardPos = [number, number]

export function makeBoard(fen: string, orientation: Color, boardSize: cg.BoardSize) {
  const pieces = cgFen.read(fen)
  const piecesKey = Object.keys(pieces)
  let b = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="360" viewBox="0 0 2100 2100">'
  for (let i = 0, len = piecesKey.length; i < len; i++) {
    let pos = pos2px(orient(key2pos(piecesKey[i] as Key, boardSize), orientation))
    b += makePiece(pos, pieces[piecesKey[i]])
  }
  b += '</svg>'
  return b
}

function orient(pos: BoardPos, color: Color): BoardPos {
  return color === 'white' ? pos : [6 - pos[0], 11 - pos[1]];
}

function pos2px(pos: BoardPos): BoardPos {
  return [(2 * pos[0] - (pos[1] % 2 !== 0 ? 1.0 : 2.0)) * 210, (pos[1] - 1.0) * 210];
}

function makePiece(pos: BoardPos, piece: Piece) {
  const name = piece.color[0] + piece.role[0].toUpperCase();
  return '<svg x="' + pos[0] + '" y="' + pos[1] + '" width="210" height="210">' +
    svgPieces[name] +
    '</svg>'
}
