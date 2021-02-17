import h from 'mithril/hyperscript'
import settings from '../../settings'
import redraw from '../../utils/redraw'
import Draughtsground from '../../draughtsground/Draughtsground'
import { getVariant } from '../../lidraughts/variant'
import BoardBrush, { Shape } from './BoardBrush'

export interface Attrs {
  variant: VariantKey
  draughtsground: Draughtsground
  wrapperClasses?: string
  customPieceTheme?: string
  shapes?: ReadonlyArray<Shape>
  clearableShapes?: ReadonlyArray<Shape>
  canClearShapes?: boolean
}

interface State {
  wrapperOnCreate(vnode: Mithril.VnodeDOM<any, any>): void
  boardOnCreate(vnode: Mithril.VnodeDOM<any, any>): void
  boardOnRemove(): void
  boardTheme: string
  pieceTheme: string
  shapesCleared: boolean
  bounds?: ClientRect
  onResize: () => void
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
      this.bounds = dom.getBoundingClientRect()
      this.onResize = () => {
        this.bounds = dom.getBoundingClientRect()
      }
      window.addEventListener('resize', this.onResize)
    }

    this.boardOnCreate = ({ dom }: Mithril.VnodeDOM<any, any>) => {
      draughtsground.attach(dom as HTMLElement, this.bounds!)
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
    const { variant, draughtsground, wrapperClasses, customPieceTheme, shapes, clearableShapes } = vnode.attrs
    const docVariant = getVariant(variant) || getVariant('standard')
    const boardClass = [
      'display_board',
      'orientation-' + draughtsground.state.orientation,
      `board-${this.boardTheme}`,
      customPieceTheme || this.pieceTheme,
      variant,
      'is' + docVariant.board.key
    ].join(' ')

    let wrapperClass = 'playable_board_wrapper'

    if (wrapperClasses) {
      wrapperClass += ' '
      wrapperClass += wrapperClasses
    }

    const allShapes = [
      ...(shapes !== undefined ? shapes : []),
      ...(clearableShapes !== undefined && !this.shapesCleared ? clearableShapes : [])
    ]

    return h('section', {
      className: wrapperClass,
      oncreate: this.wrapperOnCreate,
      onremove: () => {
        window.removeEventListener('resize', this.onResize)
      }
    }, [
      vnode.children,
      h('div', {
        className: boardClass,
        oncreate: this.boardOnCreate,
        onremove: this.boardOnRemove,
      }),
      allShapes.length > 0 && this.bounds ?
        BoardBrush(
          this.bounds,
          draughtsground.state.orientation,
          allShapes,
          this.pieceTheme,
          draughtsground.state.boardSize
        ) : null
    ])
  }
} as Mithril.Component<Attrs, State>
