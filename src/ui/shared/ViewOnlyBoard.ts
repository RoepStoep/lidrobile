import h from 'mithril/hyperscript'
import { batchRequestAnimationFrame } from '../../utils/batchRAF'
import Draughtsground from '../../draughtsground/Draughtsground'
import { uciToMove } from '../../utils/draughtsFormat'
import settings from '../../settings'
import { getVariantBoard } from '../../lidraughts/variant'
import { noop } from '../../utils'

export interface Attrs {
  readonly fen: string
  readonly orientation: Color
  readonly lastMove?: string
  readonly customPieceTheme?: string
  readonly variant: VariantKey
  readonly fixed?: boolean
  readonly delay?: Millis
}

interface Config {
  batchRAF: (c: () => void) => void
  fen: string
  boardSize: BoardSize
  orientation: Color
  viewOnly: boolean
  minimalDom: boolean
  coordinates: number
  fixed: boolean
  lastMove: Key[] | null
}

interface State {
  ground: Draughtsground
  pieceTheme: string
  boardTheme: string
}

const ViewOnlyBoard: Mithril.Component<Attrs, State> = {
  oninit({ attrs }) {
    this.pieceTheme = settings.general.theme.piece()
    this.boardTheme = settings.general.theme.board()
    this.ground = new Draughtsground(makeConfig(attrs))
  },

  oncreate({ attrs, dom }) {
    const bounds = attrs.fixed ? {
      // dummy bounds since fixed board doesn't use bounds
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      height: 0,
      width: 0,
      x: 0,
      y: 0,
      toJSON: noop
    } : dom.getBoundingClientRect()
    if (attrs.delay !== undefined) {
      setTimeout(() => {
        this.ground.attach(dom as HTMLElement, bounds)
      }, attrs.delay)
    } else {
      this.ground.attach(dom as HTMLElement, bounds)
    }
  },

  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    if (
      attrs.fen !== oldattrs.fen ||
      attrs.lastMove !== oldattrs.lastMove ||
      attrs.orientation !== oldattrs.orientation
    ) {
      return true
    }
    else return false
  },

  onupdate({ attrs }) {
    this.ground.set({
      ...attrs,
      lastMove: attrs.lastMove ? uciToMove(attrs.lastMove) : undefined
    })
  },

  onremove() {
    this.ground.detach()
  },

  view({ attrs }) {
    const boardClass = [
      'display_board',
      attrs.customPieceTheme || this.pieceTheme,
      `board-${this.boardTheme}`,
      attrs.variant,
      'is' + getVariantBoard(attrs.variant).key
    ].join(' ')

    return h('div', { className: boardClass })
  }
}

export default ViewOnlyBoard

function makeConfig({ fen, lastMove, orientation, variant, fixed = true }: Attrs) {
  const conf: Config = {
    batchRAF: batchRequestAnimationFrame,
    viewOnly: true,
    fixed,
    minimalDom: true,
    coordinates: 0,
    fen,
    boardSize: getVariantBoard(variant).size,
    lastMove: lastMove ? uciToMove(lastMove) : null,
    orientation: orientation || 'white'
  }

  return conf
}
