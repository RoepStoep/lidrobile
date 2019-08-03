import * as cg from './interfaces'

export const initial = 'W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20';

export function read(fen: string): cg.Pieces {

  if (fen === 'start') fen = initial;
  const pieces: cg.Pieces = {};

  const fenParts: string[] = fen.split(':');
  for (let i = 0; i < fenParts.length; i++) {
    let clr: string = '';
    if (fenParts[i].slice(0, 1) === 'W')
      clr = 'white';
    else if (fenParts[i].slice(0, 1) === 'B')
      clr = 'black';
    if (clr.length !== 0 && fenParts[i].length > 1) {

      const fenPieces: string[] = fenParts[i].slice(1).split(',');
      for (let k = 0; k < fenPieces.length; k++) {
        let fieldNumber: string, role: Role;
        if (fenPieces[k].slice(0, 1) === 'K') {
          role = 'king' as Role;
          fieldNumber = fenPieces[k].slice(1);
        } else if (fenPieces[k].slice(0, 1) === 'G') {
          role = 'ghostman' as Role;
          fieldNumber = fenPieces[k].slice(1);
        } else if (fenPieces[k].slice(0, 1) === 'P') {
          role = 'ghostking' as Role;
          fieldNumber = fenPieces[k].slice(1);
        } else {
          role = 'man' as Role;
          fieldNumber = fenPieces[k];
        }
        if (fieldNumber.length == 1) fieldNumber = '0' + fieldNumber;
        pieces[fieldNumber as Key] = {
          role: role,
          color: clr as Color
        };
      }

    }
  }

  return pieces;
}

function write(pieces: cg.Pieces): string {

  let fenW: string = 'W';
  let fenB: string = 'B';

  for (let f = 1; f <= 50; f++) {

    const piece = pieces[(f < 10 ? '0' + f.toString() : f.toString()) as Key];
    if (piece) {
      if (piece.color === 'white') {
        if (fenW.length > 1) fenW += ',';
        if (piece.role === 'king')
          fenW += 'K';
        else if (piece.role === 'ghostman')
          fenW += 'G';
        else if (piece.role === 'ghostking')
          fenW += 'P';
        fenW += f.toString();
      } else {
        if (fenB.length > 1) fenB += ',';
        if (piece.role === 'king')
          fenB += 'K';
        else if (piece.role === 'ghostman')
          fenB += 'G';
        else if (piece.role === 'ghostking')
          fenB += 'P';
        fenB += f.toString();
      }
    }
  }

  return fenW + ':' + fenB;

}

export function countGhosts(fen: string): number {

  if (fen === 'start') fen = initial;
  var ghosts: number = 0;

  const fenParts: string[] = fen.split(':');
  for (let i = 0; i < fenParts.length; i++) {
    let clr: string = '';
    if (fenParts[i].slice(0, 1) === 'W')
      clr = 'white';
    else if (fenParts[i].slice(0, 1) === 'B')
      clr = 'black';
    if (clr.length !== 0 && fenParts[i].length > 1) {

      const fenPieces: string[] = fenParts[i].slice(1).split(',');
      for (let k = 0; k < fenPieces.length; k++) {
        if (fenPieces[k].slice(0, 1) === 'G' || fenPieces[k].slice(0, 1) === 'P')
          ghosts++;
      }

    }
  }

  return ghosts;
}

export function readKingMoves(fen: string): cg.KingMoves | null {

  if (fen === 'start') fen = initial;

  const fenParts: string[] = fen.split(':'),
    kingMoves = fenParts.length ? fenParts[fenParts.length - 1] : '';

  if (kingMoves.indexOf('+') !== 0)
    return null;

  const playerMoves: string[] = kingMoves.split('+').filter(function (e) { return e.length != 0; });
  if (playerMoves.length !== 2)
    return null;

  const whiteMoves = parseInt(playerMoves[1].slice(0, 1)),
    blackMoves = parseInt(playerMoves[0].slice(0, 1));

  const result: cg.KingMoves = { 
    white: { count: whiteMoves },
    black: { count: blackMoves }
  };

  if (whiteMoves > 0) {
    result.white.key = playerMoves[1].slice(1) as Key;
  }
  if (blackMoves > 0)
    result.black.key = playerMoves[0].slice(1) as Key;

  return result;
}

export default {
  initial,
  read,
  write,
  countGhosts,
  readKingMoves
}
