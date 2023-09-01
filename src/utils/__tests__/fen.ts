import * as fen from '../fen'

describe('Fen utils', () => {
  it('validates standard fens', () => {
    const fens = [
      'W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20:H0:F1',
    ]
    fens.forEach(f => {
      expect(fen.validateFen(f)).toBe(true)
    })
  })

})
