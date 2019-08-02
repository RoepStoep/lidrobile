import Draughtsground from '../../../draughtsground/Draughtsground'
import * as cg from '../../../draughtsground/interfaces'
import { key2pos, pos2key } from '../../../draughtsground/util'

function capture(draughtsgroundCtrl: Draughtsground, key: Key) {
  const exploding: Key[] = []
  const diff: cg.PiecesDiff = {}
  const orig = key2pos(key)
  for (let x = -1; x < 2; x++) {
    for (let y = -1; y < 2; y++) {
      const k = pos2key([orig[0] + x, orig[1] + y] as cg.Pos)
      if (k) {
        exploding.push(k)
        const explodes = draughtsgroundCtrl.state.pieces[k] && k === key
        if (explodes) diff[k] = null
      }
    }
  }
  draughtsgroundCtrl.setPieces(diff)
  draughtsgroundCtrl.explode(exploding)
}

// needs to explicitly destroy the capturing pawn
function enpassant(draughtsgroundCtrl: Draughtsground, key: Key, color: Color) {
  const pos = key2pos(key)
  const pawnPos = [pos[0], pos[1] + (color === 'white' ? -1 : 1)] as cg.Pos
  capture(draughtsgroundCtrl, pos2key(pawnPos))
}

export default {
  capture,
  enpassant
}
