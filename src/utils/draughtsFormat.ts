import isObject from 'lodash-es/isObject'
import { san2alg as san2algMap } from '../draughtsground/util'

export function uciToMove(uci: string): Key[] {
    return decomposeUci(uci)
}

export function uciToMoveOrDrop(uci: string): Key[] {
  return uciToMove(uci)
}

export function uciToDropPos(uci: string): Key {
  return <Key>uci.substr(2, 2)
}

export function uciTolastDrop(uci: string): KeyPair {
  return [<Key>uci.substr(2, 2), <Key>uci.substr(2, 2)]
}

export function decomposeUci(uci: Uci): Key[] {
  const uciArray: Key[] = new Array<Key>()
  if (uci.length > 1) {
      for (let i = 0; i < uci.length; i += 2) {
        uciArray.push(uci.substr(i, 2) as Key)
      }
  }
  return uciArray
}

export function san2alg(san?: string | null): string {
  if (!san) return ''
  const capture = san.includes('x'),
    fields = san.split(capture ? 'x' : '-'),
    algs = fields.map(f => san2algMap[f])
  return algs.join(capture ? ':' : '-')
}

export function scan2uci(san: string): string {
  if (san.indexOf('x') !== -1)
    return san.split('x').map(m => (m.length == 1 ? '0' + m : m)).join('')
  else if (san.indexOf('-') !== -1)
    return san.split('-').map(m => (m.length == 1 ? '0' + m : m)).join('')
  else
    return san
}

export function scan2san(san: string): string {
  if (!san) return san
  const sep = san.includes('x') ? 'x' : '-',
    parts = san.split(sep)
  if (parts.length < 2) return san
  return parts[0] + sep + parts.slice(-1)
}

export function fenCompare(fen1: string, fen2: string) {
  const fenParts1: string[] = fen1.split(':')
  const fenParts2: string[] = fen2.split(':')
  if (fenParts1.length < 3 || fenParts2.length < 3) return false
  for (let i = 0; i < 3; i++) {
      if (fenParts1[i] !== fenParts2[i]) return false
  }
  return true
}

export function fenFromTag(tag: string) {
  if (!tag || !tag.startsWith('[') || !tag.endsWith(']') || !tag.includes('FEN')) {
    return tag
  }
  const fenStart = tag.indexOf('"'), fenEnd = tag.lastIndexOf('"')
  if (fenStart === -1 || fenEnd === -1 || fenStart === fenEnd) {
    return tag
  }
  return tag.slice(fenStart + 1, fenEnd)
}

function isString(o: DestsMap | string): o is string {
  return typeof o === 'string'
}

function isDestMap(o: DestsMap | string): o is DestsMap {
  return isObject(o)
}

export function readDests(lines?: DestsMap | string): DestsMap | null {
  if (lines === undefined) return null
  if (isDestMap(lines)) return lines
  const dests: DestsMap = {}
  if (lines && isString(lines)) lines.split(' ').forEach(line => {
    dests[piotr2key[line[0]]] = line.split('').slice(1).map(c => piotr2key[c])
  })
  return dests
}

export const piotr2key: {[i: string]: Key } = {
  'a': '01',
  'b': '02',
  'c': '03',
  'd': '04',
  'e': '05',
  'f': '06',
  'g': '07',
  'h': '08',
  'i': '09',
  'j': '10',
  'k': '11',
  'l': '12',
  'm': '13',
  'n': '14',
  'o': '15',
  'p': '16',
  'q': '17',
  'r': '18',
  's': '19',
  't': '20',
  'u': '21',
  'v': '22',
  'w': '23',
  'x': '24',
  'y': '25',
  'z': '26',
  'A': '27',
  'B': '28',
  'C': '29',
  'D': '30',
  'E': '31',
  'F': '32',
  'G': '33',
  'H': '34',
  'I': '35',
  'J': '36',
  'K': '37',
  'L': '38',
  'M': '39',
  'N': '40',
  'O': '41',
  'P': '42',
  'Q': '43',
  'R': '44',
  'S': '45',
  'T': '46',
  'U': '47',
  'V': '48',
  'W': '49',
  'X': '50'
}
