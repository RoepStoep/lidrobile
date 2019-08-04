import * as debounce from 'lodash/debounce'
import Draughtsground from '../../draughtsground/Draughtsground'
import * as cgDrag from '../../draughtsground/drag'
import router from '../../router'
import settings from '../../settings'
import menu from './menu'
import pasteFenPopup from './pasteFenPopup'
import * as fenUtil from '../../utils/fen'
import { batchRequestAnimationFrame } from '../../utils/batchRAF'
import continuePopup, { Controller as ContinuePopupCtrl } from '../shared/continuePopup'
import i18n from '../../i18n'
import drag from './drag'
import * as stream from 'mithril/stream'

const startingFen = 'W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20:H0:F1'

interface EditorData {
  color: Mithril.Stream<Color>
  halfmove: Mithril.Stream<string>
  moves: Mithril.Stream<string>
}

interface Data {
  editor: EditorData
  game: {
    variant: {
      key: Mithril.Stream<VariantKey>
    }
  }
}

export interface MenuInterface {
  open: () => void
  close: () => void
  isOpen: () => boolean
  root: Editor
}

export default class Editor {
  public data: Data
  public menu: MenuInterface
  public pasteFenPopup: MenuInterface
  public continuePopup: ContinuePopupCtrl
  public draughtsground: Draughtsground

  public extraPositions: Array<BoardPosition>

  public constructor(fen?: string, variant?: VariantKey) {
    const initFen = fen || startingFen

    this.menu = menu.controller(this)
    this.pasteFenPopup = pasteFenPopup.controller(this)
    this.continuePopup = continuePopup.controller()

    this.data = {
      editor: this.readFen(initFen),
      game: {
        variant: {
          key: stream(variant || 'standard')
        }
      }
    }

    this.extraPositions = [{
      fen: startingFen,
      name: i18n('startPosition')
    }, {
      fen: 'W:W:B',
      name: i18n('clearBoard')
    }]

    this.draughtsground = new Draughtsground({
      batchRAF: batchRequestAnimationFrame,
      fen: initFen,
      orientation: 'white',
      movable: {
        free: true,
        color: 'both'
      },
      highlight: {
        lastMove: false,
        kingMoves: settings.game.kingMoves()
      },
      animation: {
        duration: 300
      },
      premovable: {
        enabled: false
      },
      draggable: {
        magnified: settings.game.magnified(),
        deleteOnDropOff: true
      },
      events: {
        change: () => {
          // we don't support enpassant, halfmove and moves fields when setting
          // position manually
          this.data.editor.halfmove('0')
          this.data.editor.moves('1')
          this.updateHref()
        }
      }
    })
  }

  private updateHref = debounce(() => {
    const newFen = this.computeFen()
    if (fenUtil.validateFen(newFen)) {
      const path = `/editor/${encodeURIComponent(newFen)}`
      try {
        window.history.replaceState(window.history.state, '', '?=' + path)
      } catch (e) { console.error(e) }
    }
  }, 250)

  public onstart = (e: TouchEvent) => drag(this, e)
  public onmove = (e: TouchEvent) => cgDrag.move(this.draughtsground, e)
  public onend = (e: TouchEvent) => cgDrag.end(this.draughtsground, e)

  public editorOnCreate = (vn: Mithril.DOMNode) => {
    if (!vn.dom) return
    const editorNode = document.getElementById('boardEditor')
    if (editorNode) {
      editorNode.addEventListener('touchstart', this.onstart)
      editorNode.addEventListener('touchmove', this.onmove)
      editorNode.addEventListener('touchend', this.onend)
    }
  }

  public editorOnRemove = () => {
    const editorNode = document.getElementById('boardEditor')
    if (editorNode) {
      editorNode.removeEventListener('touchstart', this.onstart)
      editorNode.removeEventListener('touchmove', this.onmove)
      editorNode.removeEventListener('touchend', this.onend)
    }
  }

  public computeFen = () => {
    const data = this.data.editor
    return data.color() + ':' + this.draughtsground.getFen() + ':H' + data.halfmove() + ':F' + data.moves()
  }

  public loadNewFen = (newFen: string) => {
    if (fenUtil.validateFen(newFen))
      router.set(`/editor/variant/${encodeURIComponent(this.data.game.variant.key())}/fen/${encodeURIComponent(newFen)}`, true)
    else
      window.plugins.toast.show('Invalid FEN', 'short', 'center')
  }

  private readFen(fen: string): EditorData {
    const fenData = fenUtil.readFen(fen)
    return {
      color: stream(fenData.color as Color),
      halfmove: stream(fenData.halfmove.toString()),
      moves: stream(fenData.moves.toString())
    }
  }
}
