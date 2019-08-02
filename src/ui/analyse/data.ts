import { getLichessVariant, getInitialFen } from '../../lichess/variant'
import { AnalyseData } from '../../lichess/interfaces/analyse'
import { playerFromFen, plyFromFen } from '../../utils/fen'
import { oppositeColor } from '../../utils'

export function makeDefaultData(variantKey: VariantKey, fen?: string): AnalyseData {
  const player = playerFromFen(fen)
  const ply = plyFromFen(fen)
  const variant = getLichessVariant(variantKey)

  const initialFen = fen || getInitialFen(variantKey)

  return {
    game: {
      fen: initialFen,
      id: 'synthetic',
      initialFen: initialFen,
      player,
      source: 'offline',
      status: {
        id: 10,
        name: 'created'
      },
      turns: 0,
      startedAtTurn: 0,
      variant
    },
    takebackable: false,
    orientation: 'white',
    opponent: {
      color: oppositeColor(player)
    },
    player: {
      color: player
    },
    pref: {
      animationDuration: 300,
      destination: true,
      highlight: true
    },
    treeParts: [
      {
        fen: initialFen,
        ply,
        crazyhouse: undefined,
        pgnMoves: []
      }
    ],
    userAnalysis: true
  }
}
