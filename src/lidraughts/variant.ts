import { Variant, VariantKey } from './interfaces/variant'

export const standardFen = 'W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20:H0:F1'

interface DocVariant {
  id: number
  board: BoardData
  gameType: number
  name: string
  shortName?: string
  tinyName?: string
  link?: string
  alert?: string
  title: string
  initialFen?: string
}

const D100: BoardData = {
  key: '100',
  size: [10, 10]
}
const D64: BoardData = {
  key: '64',
  size: [8, 8]
}

const variantMap: {[key in VariantKey]: DocVariant} = {
  standard: {
    name: 'Standard',
    tinyName: 'Std',
    id: 1,
    gameType: 20,
    link: 'https://lidraughts.org/variant/standard',
    title: 'Standard rules of international draughts (FMJD)',
    board: D100,
  },
  fromPosition: {
    name: 'From position',
    shortName: 'Fen',
    tinyName: 'Fen',
    id: 3,
    gameType: 99,
    title: 'Custom starting position',
    board: D100,
  },
  antidraughts: {
    name: 'Antidraughts',
    tinyName: 'Anti',
    id: 6,
    gameType: 98,
    link: 'https://lidraughts.org/variant/antidraughts',
    alert: 'This is an Antidraughts game!\n\nThe game can be won by losing all your pieces, or running out of moves.',
    title: 'Lose all your pieces (or run out of moves) to win the game.',
    board: D100,
  },
  frysk: {
    name: 'Frysk!',
    tinyName: 'Frysk',
    id: 8,
    gameType: 97,
    link: 'https://lidraughts.org/variant/frysk',
    alert: 'This is a Frysk! game!\n\nFrisian draughts starting with 5 pieces each.',
    title: 'Frisian draughts starting with 5 pieces each.',
    initialFen: 'W:W46,47,48,49,50:B1,2,3,4,5:H0:F1',
    board: D100,
  },
  breakthrough: {
    name: 'Breakthrough',
    shortName: 'BT',
    tinyName: 'BT',
    id: 9,
    gameType: 96,
    link: 'https://lidraughts.org/variant/breakthrough',
    alert: 'This is a Breakthrough game!\n\nThe first player who makes a king wins.',
    title: 'The first player who makes a king wins.',
    board: D100,
  },
  frisian: {
    name: 'Frisian',
    tinyName: 'Frisian',
    id: 10,
    gameType: 40,
    link: 'https://lidraughts.org/variant/frisian',
    alert: 'This is a Frisian Draughts game!\n\nPieces can also capture horizontally and vertically.',
    title: 'Pieces can also capture horizontally and vertically.',
    board: D100,
  },
  russian: {
    name: 'Russian',
    tinyName: 'Russian',
    id: 11,
    gameType: 25,
    link: 'https://lidraughts.org/variant/russian',
    title: 'Russian draughts',
    initialFen: 'W:W21,22,23,24,25,26,27,28,29,30,31,32:B1,2,3,4,5,6,7,8,9,10,11,12:H0:F1',
    board: D64,
  },
  brazilian: {
    name: 'Brazilian',
    tinyName: 'Brazilian',
    id: 12,
    gameType: 26,
    link: 'https://lidraughts.org/variant/brazilian',
    title: 'Brazilian draughts',
    initialFen: 'W:W21,22,23,24,25,26,27,28,29,30,31,32:B1,2,3,4,5,6,7,8,9,10,11,12:H0:F1',
    board: D64,
  }
}

export function isVariant(key: string): boolean {
  return key in variantMap
}

export function getVariant(key: VariantKey): DocVariant {
  return variantMap[key] || variantMap['standard']
}

export function getVariantBoard(key: VariantKey): BoardData {
  return getVariant(key).board
}

export function getVariantKeyById(id: string): VariantKey | undefined {
  const nId = parseInt(id)
  for (const key of Object.keys(variantMap)) {
    const variant = variantMap[key as VariantKey]
    if (variant.id === nId) {
      return key as VariantKey
    }
  }
}

export function getLidraughtsVariant(key: VariantKey): Variant {
  const v = getVariant(key)
  return {
    key,
    board: v.board,
    name: v.name,
    short: v.shortName || v.tinyName || v.name,
    title: v.title,
  }
}

export function getInitialFen(key: VariantKey): string {
  return getVariant(key).initialFen || standardFen
}

export const specialFenVariants = new Set(['frysk', 'russian', 'brazilian']) as Set<VariantKey>

export const openingSensibleVariants = new Set([
'standard', 'antidraughts', 'frisian', 'breakthrough', 'russian', 'brazilian'
]) as Set<VariantKey>
