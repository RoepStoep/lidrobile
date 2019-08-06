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
