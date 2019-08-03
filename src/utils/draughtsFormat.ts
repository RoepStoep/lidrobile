import * as isObject from 'lodash/isObject'

export function uciToMove(uci: string): Key[] {
    return decomposeUci(uci);
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

export function fixCrazySan(san: San): San {
  return san[0] === 'P' ? san.slice(1) : san
}

export function decomposeUci(uci: Uci): Key[] {
  const uciArray: Key[] = new Array<Key>();
  if (uci.length > 1) {
      for (let i = 0; i < uci.length; i += 2) {
        uciArray.push(uci.substr(i, 2) as Key);
      }
  }
  return uciArray;
}

export function fenCompare(fen1: string, fen2: string) {
  const fenParts1: string[] = fen1.split(':');
  const fenParts2: string[] = fen2.split(':');
  if (fenParts1.length < 3 || fenParts2.length < 3) return false;
  for (let i = 0; i < 3; i++) {
      if (fenParts1[i] !== fenParts2[i]) return false;
  }
  return true;
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
};
