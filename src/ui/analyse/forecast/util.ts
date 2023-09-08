import { ForecastStep } from '~/lidraughts/interfaces/forecast'

type Move = {
  index: number;
  white: San | null;
  black: San | null;
}

export function groupMoves(nodes: ForecastStep[]): Move[] {
  const moves: Move[] = []
  const startPly = nodes[0].displayPly || nodes[0].ply

  let lastIndex = -1
  if (startPly % 2 === 0) {
    // black is the first move
    lastIndex = Math.floor((startPly + 1) / 2)
    moves.push({
      index: lastIndex,
      black: nodes[0].san,
      white: null,
    })
    nodes = nodes.slice(1)
  }

  nodes.forEach(node => {
    const dply = node.displayPly || node.ply
    if (dply === 0) return

    const cindex = (dply + 1) / 2
    if (cindex !== lastIndex && dply % 2 === 1) {
      moves.push({
        index: cindex,
        white: node.san,
        black: null,
      })
      lastIndex = cindex
    } else {
      const curMove = moves[moves.length - 1]
      if (dply % 2 === 1) {
        if (node.san.includes('x')) {
          curMove.white += node.san.slice(node.san.indexOf('x'))
        } else {
          curMove.white += ` ${node.san}`
        }
      } else {
        if (!curMove.black) {
          curMove.black = node.san  
        } else if (node.san.includes('x')) {
          curMove.black += node.san.slice(node.san.indexOf('x'))
        } else {
          curMove.black += ` ${node.san}`
        }
      }
    }
  })

  return moves
}

