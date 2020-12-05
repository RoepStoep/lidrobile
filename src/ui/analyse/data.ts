import { getLidraughtsVariant, getInitialFen } from '../../lidraughts/variant'
import settings from '../../settings'
import { AnalyseData } from '../../lidraughts/interfaces/analyse'
import { playerFromFen, plyFromFen } from '../../utils/fen'
import { oppositeColor } from '../../utils'

export function makeDefaultData(variantKey: VariantKey, fen?: string): AnalyseData {
  const player = playerFromFen(fen)
  const ply = plyFromFen(fen)
  const variant = getLidraughtsVariant(variantKey)

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
      destination: settings.game.pieceDestinations(),
      highlight: settings.game.highlights(),
    },
    treeParts: [
      {
        id: '',
        fen: initialFen,
        ply,
        pdnMoves: [],
        children: []
      }
    ],
    userAnalysis: true
  }
}
