
export type VariantKey = 'standard' | 'antidraughts' | 'breakthrough' | 'fromPosition' | 'frisian' | 'frysk'

export type BoardSize = [number, number]

export interface BoardData {
  readonly key: string
  readonly size: BoardSize
}

export interface Variant {
  readonly key: VariantKey
  readonly board: BoardData
  readonly name: string
  readonly short: string
  readonly title?: string
}
