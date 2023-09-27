import h from 'mithril/hyperscript'
import * as cgUtil from '../../../draughtsground/util'
import * as cg from '../../../draughtsground/interfaces'
import { Shape } from '.'
import { Brush } from './brushes'

type BoardPos = [number, number]

export interface ArrowDests {
  [key: string]: number; // how many arrows land on a square
}

const key2pos: (key: Key, bs: cg.BoardSize) => BoardPos = cgUtil.key2pos

function circleWidth(current: boolean, bounds: DOMRect, boardSize: cg.BoardSize) {
  const factor = 512 * boardSize[0] / 10
  return (current ? 3 : 4) / factor * bounds.width
}

function lineWidth(brush: Brush, current: boolean, bounds: DOMRect, boardSize: cg.BoardSize) {
  const factor = 512 * boardSize[0] / 10
  return (brush.lineWidth || 10) * (current ? 0.7 : 1) / factor * bounds.width
}

function opacity(brush: Brush, current: boolean) {
  return (brush.opacity || 1) * (current ? 0.6 : 1)
}

function arrowMargin(bounds: DOMRect, shorten: boolean, boardSize: cg.BoardSize) {
  return boardSize[0] * (shorten ? 2 : 1) / 512 * bounds.width
}

function pos2px(pos: BoardPos, bounds: DOMRect, boardSize: cg.BoardSize) {
  return [(2 * pos[0] - (pos[1] % 2 !== 0 ? 0.5 : 1.5)) * bounds.width / boardSize[0], (pos[1] - 0.5) * bounds.height / boardSize[1]]
}

export function circle(brush: Brush, pos: BoardPos, current: boolean, bounds: DOMRect, boardSize: cg.BoardSize) {
  const o = pos2px(pos, bounds, boardSize)
  const width = circleWidth(current, bounds, boardSize)
  const radius = (bounds.width + bounds.height) / (2 * (boardSize[0] + boardSize[1]))
  return (
    <circle
      stroke={brush.color}
      stroke-width={width}
      fill="none"
      opacity={opacity(brush, current)}
      cx={o[0]}
      cy={o[1]}
      r={radius - width / 2}
    />
  )
}

export function arrow(brush: Brush, orig: BoardPos, dest: BoardPos, current: boolean, shorten: boolean, bounds: DOMRect, boardSize: cg.BoardSize) {
  const margin = arrowMargin(bounds, shorten && !current, boardSize)
  const a = pos2px(orig, bounds, boardSize)
  const b = pos2px(dest, bounds, boardSize)
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    angle = Math.atan2(dy, dx)
  const xo = Math.cos(angle) * margin,
    yo = Math.sin(angle) * margin

  return (
    <line
      stroke={brush.color}
      stroke-width={lineWidth(brush, current, bounds, boardSize)}
      stroke-linecap="round"
      marker-end={'url(#arrowhead-' + brush.key + ')'}
      opacity={opacity(brush, current)}
      x1={a[0]}
      y1={a[1]}
      x2={b[0] - xo}
      y2={b[1] - yo}
    />
  )
}

export function piece(theme: string, pos: BoardPos, piece: Piece, bounds: DOMRect, boardSize: cg.BoardSize) {
  const o = pos2px(pos, bounds, boardSize)
  const size = bounds.width / 10
  const name = piece.color[0] + piece.role[0].toUpperCase()
  const href = `images/pieces/${theme}/${name}.svg`
  return h('image', {
    x: o[0] - size / 2,
    y: o[1] - size / 2,
    width: size,
    height: size,
    'xlink:href': href,
  })
}

export function defs(brushes: Brush[]) {
  return (
    <defs>
      {brushes.map(brush => {
        return (
          <marker
            id={'arrowhead-' + brush.key}
            orient="auto"
            markerWidth={4}
            markerHeight={8}
            refX={2.05}
            refY={2.01}
          >
            <path d="M0,0 V4 L3,2 Z" fill={brush.color} />
          </marker>
        )
      })}
    </defs>
  )
}

export function orient(pos: BoardPos, color: Color, boardSize: cg.BoardSize): [number, number] {
  return color === 'white' ? pos : [(boardSize[0] / 2 + 1) - pos[0], (boardSize[1] + 1) - pos[1]]
}

export function renderShape(
  orientation: Color,
  current: boolean,
  brushes: {[key: string]: Brush},
  arrowDests: ArrowDests,
  bounds: DOMRect,
  pieceTheme: string,
  boardSize: cg.BoardSize
) {
  return function(shape: Shape) {
    if (shape.piece) return piece(
      pieceTheme,
      orient(key2pos(shape.orig, boardSize), orientation, boardSize),
      shape.piece,
      bounds, boardSize)
    const brush = brushes[shape.brush]
    if (brush && shape.orig && shape.dest) return arrow(
      brush,
      orient(key2pos(shape.orig, boardSize), orientation, boardSize),
      orient(key2pos(shape.dest, boardSize), orientation, boardSize),
      current, arrowDests[shape.dest] > 1,
      bounds, boardSize)
    else if (brush && shape.orig) return circle(
      brush,
      orient(key2pos(shape.orig, boardSize), orientation, boardSize),
      current, bounds, boardSize)
    else return null
  }
}
