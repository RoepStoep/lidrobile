
export type VariantKey = 'standard' | 'antidraughts' | 'breakthrough' | 'fromPosition' | 'frisian' | 'frysk'

export interface Variant {
  readonly key: VariantKey
  readonly name: string
  readonly short: string
  readonly title?: string
}
