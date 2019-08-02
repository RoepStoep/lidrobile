import * as fen from '../fen'

describe('Fen utils', () => {
  it('validates standard fens', () => {
    const fens = [
      'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    ]
    fens.forEach(f => {
      expect(fen.validateFen(f)).toBe(true)
    })
  })

})
