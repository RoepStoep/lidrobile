import * as fenUtil from '../draughtsground/fen'

export const emptyFen = 'W:W:B:H0:F1'

export function readFen(fen: string) {
  const parts = fen.split(':')
  return {
    color: parts[0].toLowerCase(),
    halfmove: Number(parts[3].slice(1)),
    moves: Number(parts[4].slice(1))
  }
}

// clean a FEN string from a lidraughts.org URI path.
export function cleanFenUri(fenUri: string): string {
  let fen = fenUri.replace(/_/g, ' ')
  if (fen[0] === '/') fen = fen.substring(1)
  return fen
}

export function validateFen(fen: string, variant: VariantKey = 'standard') {
  const tokens = fen.split(':')
  if (!validateTokens(tokens))
    return false

  const fields = tokens[1].split(',').concat(tokens[2].split(','))
  if (!validateFields(fields))
    return false

  if (variant === 'frisian' || variant === 'frysk')
    return validateFrisian(tokens)
  else
    return true
}

function validateFrisian(tokens: string[]) {
  /* we need at least one extra field */
  if (tokens.length < 4) {
    return false
  }

  /* king moves for both players */
  if (tokens[tokens.length - 1].indexOf('+') === 0 && tokens[tokens.length - 1].indexOf('+', 1) !== -1) {
    return false
  }

  return true
}

function validateFields(fields: string[]): boolean {
  /* every field is valid? */
  for (let i = 0; i < fields.length; i++) {
    let field = fields[i], first = field.slice(0, 1)
    /* pieces color */
    if (first === 'W' || first === 'B') {
      field = field.slice(1);
      first = field.slice(0, 1);
    }
    /* piece type */
    if (first === 'K' || first === 'G' || first === 'P') {
      field = field.slice(1);
    }
    /* remaining must be field number 1 - 50*/
    const fieldNumber = Number(field)
    if (isNaN(fieldNumber) || fieldNumber < 1 || fieldNumber > 50) {
      return false
    }
  }

  return true
}

// fen validation, frisian: 
// W:W31,32,33,34,35,36,37,38,39,40:B1,2,3,4,5,6,7,8,9,10:H0:F1:+0+0
function validateTokens(tokens: string[]): boolean {
  /* pieces are required, the rest is optional (unofficial) */
  if (tokens.length < 3 || tokens.length > 6) {
    return false;
  }

  /* first must be side to move */
  if (tokens[0] !== 'W' || tokens[0] !== 'B') {
    return false;
  }

  /* move number field is a integer value > 0? */
  if (tokens.length > 4 && (isNaN(Number(tokens[4].slice(1))) || (parseInt(tokens[4], 10) <= 0))) {
    return false
  }

  /* half move counter is an integer >= 0? */
  if (tokens.length > 3 && (isNaN(Number(tokens[3].slice(1))) || (parseInt(tokens[3], 10) < 0))) {
    return false
  }

  return true
}


export function positionLooksLegit(fen: string) {
  const pieces = fenUtil.read(fen);
  const totals = {
    white: 0,
    black: 0
  };
  for (const pos in pieces) {
      if (pieces[pos] && (pieces[pos].role === 'king' || pieces[pos].role === 'man')) {
          if (pieces[pos].role === 'man') {
              if (pieces[pos].color === 'white' && (pos === "01" || pos === "02" || pos === "03" || pos === "04" || pos === "05"))
                  return false;
              else if (pieces[pos].color === 'black' && (pos === "46" || pos === "47" || pos === "48" || pos === "49" || pos === "50"))
                  return false;
          }
          totals[pieces[pos].color]++;
      }
  }
  return totals.white !== 0 && totals.black !== 0 && (totals.white + totals.black) < 50;
}

export function playerFromFen(fen?: string): Color {
  if (fen) {
    const { color } = readFen(fen)

    return color === 'w' ? 'white' : 'black'
  }

  return 'white'
}

export function plyFromFen(fen?: string) {
  if (fen) {
    const { color, moves } = readFen(fen)
    return moves * 2 - (color === 'w' ? 2 : 1)
  }

  return 0
}
