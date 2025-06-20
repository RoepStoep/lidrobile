import h from 'mithril/hyperscript'
import * as cg from '../../../draughtsground/interfaces'
import { defs, renderShape, ArrowDests } from './svg'
import { brushes } from './brushes'

export interface Shape {
  brush: string
  orig: Key
  dest?: Key
  piece?: Piece
}

const usedBrushes = defs(Object.keys(brushes).map(name => brushes[name]))

export default function BoardBrush(
  bounds: DOMRect,
  orientation: Color,
  shapes: ReadonlyArray<Shape>,
  pieceTheme: string,
  boardSize: cg.BoardSize
) {
  if (!shapes) return null
  if (!bounds) return null
  if (bounds.width !== bounds.height) return null

  const arrowDests: ArrowDests = {}
  shapes.forEach(s => {
    if (s.dest) arrowDests[s.dest] = (arrowDests[s.dest] || 0) + 1
  })
  
  return h('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    version: '1.1',
  }, [
    usedBrushes,
    shapes.map(renderShape(orientation, false, brushes, arrowDests, bounds, pieceTheme, boardSize))
  ])
}
