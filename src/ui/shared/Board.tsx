import settings from '../../settings'
import redraw from '../../utils/redraw'
import Draughtsground from '../../draughtsground/Draughtsground'
import getVariant from '../../lidraughts/variant'
import BoardBrush, { Shape } from './BoardBrush'

export interface Bounds {
  width: number
  height: number
}

export interface Attrs {
  variant: VariantKey
  draughtsground: Draughtsground
  bounds: Bounds
  wrapperClasses?: string
  customPieceTheme?: string
  shapes?: ReadonlyArray<Shape>
  clearableShapes?: ReadonlyArray<Shape>
  canClearShapes?: boolean
}

interface State {
  wrapperOnCreate(vnode: Mithril.DOMNode): void
  boardOnCreate(vnode: Mithril.DOMNode): void
  boardOnRemove(): void
  boardTheme: string
  pieceTheme: string
  shapesCleared: boolean
}

export default {
  oninit(vnode) {

    const { draughtsground: draughtsground, canClearShapes } = vnode.attrs

    this.wrapperOnCreate = ({ dom }) => {
      if (canClearShapes) {
        dom.addEventListener('touchstart', () => {
          if (!this.shapesCleared) {
            this.shapesCleared = true
            redraw()
          }
        })
      }
    }

    this.boardOnCreate = ({ dom }: Mithril.DOMNode) => {
      draughtsground.attach(dom as HTMLElement)
    }

    this.boardOnRemove = () => {
      draughtsground.detach()
    }

    this.shapesCleared = false
    this.pieceTheme = settings.general.theme.piece()
    this.boardTheme = settings.general.theme.board()
  },

  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    // TODO: does not take into account same shapes put on 2 different nodes
    // maybe add fen attr to fix that
    if (attrs.clearableShapes !== oldattrs.clearableShapes) {
      this.shapesCleared = false
    }
    return true
  },

  view(vnode) {
    const { variant, draughtsground: draughtsgroundground, bounds, wrapperClasses, customPieceTheme, shapes, clearableShapes } = vnode.attrs
    const docVariant = getVariant(variant) || getVariant('standard')
    const boardClass = [
      'display_board',
      'orientation-' + draughtsgroundground.state.orientation,
      this.boardTheme,
      customPieceTheme || this.pieceTheme,
      variant,
      'is' + docVariant.board.key
    ].join(' ')

    let wrapperClass = 'playable_board_wrapper'

    if (wrapperClasses) {
      wrapperClass += ' '
      wrapperClass += wrapperClasses
    }

    const wrapperStyle = bounds ? {
      'flex-basis': bounds.height + 'px',
      height: bounds.height + 'px',
      width: bounds.width + 'px'
    } : {}

    const allShapes = [
      ...(shapes !== undefined ? shapes : []),
      ...(clearableShapes !== undefined && !this.shapesCleared ? clearableShapes : [])
    ]

    return (
      <section oncreate={this.wrapperOnCreate} className={wrapperClass} style={wrapperStyle}>
        <div className={boardClass}
          oncreate={this.boardOnCreate}
          onremove={this.boardOnRemove}
        />
        {
          allShapes.length > 0 ?
            BoardBrush(
              bounds,
              draughtsgroundground.state.orientation,
              allShapes,
              this.pieceTheme,
              draughtsgroundground.state.boardSize
            ) : null
        }
      </section>
    )
  }
} as Mithril.Component<Attrs, State>
