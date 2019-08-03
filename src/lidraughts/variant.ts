import { Variant, VariantKey } from './interfaces/variant'

export const standardFen = 'W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20:H0:F1'

interface DocVariant {
  id: number
  gameType: number
  name: string
  shortName?: string
  tinyName?: string
  link?: string
  alert?: string
  title: string
  initialFen?: string
}

const variantMap: {[key: string]: DocVariant} = {
  standard: {
    name: 'Standard',
    tinyName: 'Std',
    id: 1,
    gameType: 20,
    link: 'https://lidraughts.org/variant/standard',
    title: 'Standard rules of international draughts (FMJD)'
  },
  fromPosition: {
    name: 'From position',
    shortName: 'Fen',
    tinyName: 'Fen',
    id: 3,
    gameType: 99,
    title: 'Custom starting position',
  },
  antidraughts: {
    name: 'Antidraughts',
    tinyName: 'Anti',
    id: 6,
    gameType: 98,
    link: 'https://lidraughts.org/variant/antidraughts',
    alert: 'This is an Antidraughts game!\n\nThe game can be won by losing all your pieces, or running out of moves.',
    title: 'Lose all your pieces (or run out of moves) to win the game.',
  },
  frysk: {
    name: 'Frysk!',
    tinyName: 'Frysk',
    id: 8,
    gameType: 97,
    link: 'https://lidraughts.org/variant/frysk',
    alert: 'This is a Frysk! game!\n\nFrisian draughts starting with 5 pieces each.',
    title: 'Frisian draughts starting with 5 pieces each.',
    initialFen: 'W:W46,47,48,49,50:B1,2,3,4,5:H0:F1'
  },
  breakthrough: {
    name: 'Breakthrough',
    shortName: 'BT',
    tinyName: 'BT',
    id: 9,
    gameType: 96,
    link: 'https://lidraughts.org/variant/breakthrough',
    alert: 'This is a Breakthrough game!\n\nThe first player who makes a king wins.',
    title: 'The first player who makes a king wins.'
  },
  frisian: {
    name: 'Frisian',
    tinyName: 'Frisian',
    id: 10,
    gameType: 40,
    link: 'https://lidraughts.org/variant/frisian',
    alert: 'This is a Frisian Draughts game!\n\nPieces can also capture horizontally and vertically.',
    title: 'Pieces can also capture horizontally and vertically.'
  }
}

export default function getVariant(key: VariantKey): DocVariant {
  return variantMap[key]
}

export function getLidraughtsVariant(key: VariantKey): Variant {
  const dv = variantMap[key]
  return {
    key,
    name: dv.name,
    short: dv.shortName || dv.tinyName || dv.name,
    title: dv.title
  }
}

export function getInitialFen(key: VariantKey): string {
  const v = variantMap[key]
  return v.initialFen || standardFen
}

export const specialFenVariants = new Set(['frysk']) as Set<VariantKey>

export const openingSensibleVariants = new Set([
'standard', 'antidraughts', 'frisian', 'breakthrough'
]) as Set<VariantKey>
