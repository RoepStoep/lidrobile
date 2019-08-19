import { VariantKey } from '../lidraughts/interfaces/variant'

interface XNavigator extends Navigator {
  hardwareConcurrency: number
}

export function send(text: string) {
  console.debug('[scan <<] ' + text)
  return Scan.cmd(text)
}

export function setOption(name: string, value: string | number | boolean) {
  return send(`set-param name=${name} value=${value}`)
}

export function getNbCores(): number {
  const cores = (<XNavigator>navigator).hardwareConcurrency || 1
  return cores > 2 ? cores - 1 : 1
}

export function scanPieces(fen: string): string[] {
  const pieces: string[] = new Array<string>(50);
  const fenParts: string[] = fen.split(':');
  for (let i = 0; i < fenParts.length; i++) {
    if (fenParts[i].length > 1) {
      const color = fenParts[i].slice(0, 1);
      if (color === 'W' || color === 'B') {
        const fenPieces: string[] = fenParts[i].slice(1).split(',');
        for (let k = 0; k < fenPieces.length; k++) {
          const p = fenPieces[k].slice(0, 1);
          if (p === 'K') {
            pieces[parseInt(fenPieces[k].slice(1)) - 1] = color;
          } else if (p !== "G" && p !== "P") {
            pieces[parseInt(fenPieces[k]) - 1] = color.toLowerCase();
          }
        }
      }
    }
  }
  return pieces;
}

export function scanFen(fen: string): string {
  let result = fen.slice(0, 1);
  const pieces = scanPieces(fen);
  for (let i = 0; i < pieces.length; i++)
    result += pieces[i] !== undefined ? pieces[i] : 'e'
  return result;
}

export function parseVariant(variant: VariantKey): string {
  const result = variant.toLowerCase();
  if (result === "standard" || result === "fromposition")
    return "normal";
  else if (result === "breakthrough")
    return "bt";
  else if (result === "antidraughts")
    return "losing";
  else if (result === "frysk")
    return "frisian";
  return result;
}

function fieldX(f: number) { return f % 5 + 1; }
function fieldY(f: number) { return (f + (5 - f % 5)) / 5; }

export function parsePV(fen: string, pv: string, frisian: boolean): string[] {
  const pieceArray = scanPieces(fen)

  const walkLine = (pieces: string[], king: boolean, srcF: number, dstF: number, forbiddenDsts: number[], eyesF?: number, eyesStraight?: boolean): number | undefined => {
    const srcY = fieldY(srcF), srcX = fieldX(srcF);
    const dstY = fieldY(dstF), dstX = fieldX(dstF);
    const up = dstY > srcY;
    const right = dstX > srcX || (dstX == srcX && srcY % 2 == 0)
    const vertical = frisian && dstY !== srcY && dstX === srcX && Math.abs(dstY - srcY) % 2 === 0;
    const horizontal = frisian && dstX !== srcX && dstY === srcY;
    let walker = eyesF ? dstF : srcF, steps = 0, touchedDst = false;
    while ((king || steps < 1) && (eyesF !== undefined || (walker !== dstF && !touchedDst) || steps === 0)) {

      const walkerY = fieldY(walker);
      if (up) {
        walker += 5;
        if (vertical) walker += 5;
        else if (right) walker += walkerY % 2 == 1 ? 1 : 0;
        else walker += walkerY % 2 == 0 ? -1 : 0;
      } else if (horizontal) {
        const walkerX = fieldX(walker);
        if (right) {
          if (walkerX < 5) walker += 1
          else return undefined;
        } else {
          if (walkerX > 1) walker -= 1
          else return undefined;
        }
      } else {
        walker -= 5;
        if (vertical) walker -= 5;
        else if (right) walker += walkerY % 2 == 1 ? 1 : 0;
        else walker += walkerY % 2 == 0 ? -1 : 0;
      }
      steps++;

      if (walker < 0 || walker > 49) return undefined;
      if (!(horizontal || vertical) && Math.abs(fieldY(walker) - walkerY) !== 1) return undefined;
      if (pieces[walker]) {
        if (walker !== dstF)
          return undefined;
        if (eyesF === undefined)
          touchedDst = true;
        steps = 0;
      }

      if (eyesF !== undefined) {
        if (eyesStraight) {
          if (eyesF === walker) return walker; // eyesStraight: destination square only in current capture direction
        } else if (forbiddenDsts.indexOf(walker) === -1 && walkLine(pieces, king, walker, eyesF, []) !== undefined) {
          return walker; // !eyesStraight: current capture direction or perpendicular
        }
      }
    }
    return (walker === dstF || touchedDst) ? srcF : undefined;
  }

  const tryCaptures = (pieces: string[], capts: number[], cur: number, dest: number): number[] => {
    for (let i = 0; i < capts.length; i++) {
      const capt = capts[i]; 
      const king = (pieces[cur] === 'W' || pieces[cur] === 'B');
      if (walkLine(pieces, king, cur, capt, []) !== undefined) {
        for (let k = 0; k < capts.length; k++) {
          const captNext = i !== k ? capts[k] : (capts.length === 1 ? dest : -1);
          if (captNext !== -1) {
            const pivots: number[] = [];
            let pivot: number | undefined;
            do
            {
              pivot = walkLine(pieces, king, cur, capt, pivots, captNext, i === k && capts.length === 1);
              if (pivot !== undefined) {
                const newCapts = capts.slice();
                newCapts.splice(i, 1);
                const newPieces = pieces.slice();
                newPieces[capt] = 'x';
                newPieces[pivot] = pieces[cur];
                newPieces[cur] = "";
                const sequence = [pivot].concat(tryCaptures(newPieces, newCapts, pivot, dest));
                if (sequence.length == capts.length) return sequence;
                pivots.push(pivot);
              }
            } while (pivot !== undefined);
          }
        }
      }
    }
    return [];
  }

  let moveNr = 0;
  return pv.split(' ').map(m => {
    moveNr++;
    const takes = m.indexOf('x');
    if (takes != -1) {
      const fields = m.split('x').map(f => parseInt(f) - 1);
      const orig = fields[0], dest = fields[1];
      let uci: string[] = [(orig + 1).toString()];
      if (fields.length > 3 && moveNr === 1) { // full uci information is only relevant for the first move
        //captures can appear in any order, so try until we find a line that captures everything
        const sequence = tryCaptures(pieceArray, fields.slice(2), orig, dest);
        if (sequence) uci = uci.concat(sequence.map(m => (m + 1).toString()));
      } else
        uci.push((dest + 1).toString());
      return uci.join('x');
    } else return m;
  });
}
