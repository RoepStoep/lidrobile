import { path as treePath, Tree } from '../shared/tree'
import { decomposeUci } from '../../utils/draughtsFormat'
import { Puzzle, Line, LineFeedback  } from '../../lidraughts/interfaces/training'
import settings from '../../settings'
import { MoveRequest } from '../../draughts'
import { Mode, Feedback } from './interfaces'

export default function moveTest(
  mode: Mode,
  node: Tree.Node,
  path: Tree.Path,
  initialPath: Tree.Path,
  nodeList: Tree.Node[],
  puzzle: Puzzle
): Feedback | MoveRequest | null {

  if (mode === 'view') return null
  if (!treePath.contains(path, initialPath)) return null

  // puzzle moves so far
  const progress: Array<Uci> = []
  nodeList.slice(treePath.size(initialPath) + 1).forEach(node => {
    if (node.mergedNodes && node.mergedNodes.length !== 0) {
      for (var i = 0; i < node.mergedNodes.length; i++) {
          const isUci = node.mergedNodes[i].uci;
          if (isUci) progress.push(isUci);
      }
    } else if (node.uci) {
      progress.push(node.uci);
    }
  })

  // search in puzzle lines with current progress
  const curLine = progress.reduce((acc: Line, uci: Uci) => {
    if (!acc) return undefined
    while (acc && !isLineFeedback(acc) && uci.length > 4) {
      acc = acc[uci.slice(0, 4)];
      uci = uci.slice(2);
    }
    if (isLineFeedback(acc)) return acc
    return acc[uci]
  }, puzzle.lines)

  if (!curLine) {
    const feedback = 'fail'
    node.puzzle = feedback
    return feedback
  }
  else if (isLineFeedback(curLine)) {
    node.puzzle = curLine
    return curLine
  }
  else {
    // next opponent move from line
    const nextUci = Object.keys(curLine)[0]
    if (curLine[nextUci] === 'win') {
      node.puzzle = 'win'
      return 'win'
    }
    else {
      var actualColor = (node.displayPly ? node.displayPly : node.ply) % 2 === 1 ? 'white' : 'black';
      if (actualColor === puzzle.color)
          node.puzzle = 'good';
      const opponentUci = decomposeUci(nextUci)
      const move: MoveRequest = {
        variant: puzzle.variant.key,
        orig: opponentUci[0],
        dest: opponentUci[1],
        fen: node.fen,
        path: path,
        fullCapture: settings.analyse.fullCapture()
      }

      return move
    }
  }
}

function isLineFeedback(v: Line): v is LineFeedback {
  return typeof v === 'string'
}
