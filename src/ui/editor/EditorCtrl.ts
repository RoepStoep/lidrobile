import { Plugins } from '@capacitor/core'
import debounce from 'lodash-es/debounce'
import Draughtsground from '../../draughtsground/Draughtsground'
import * as cg from '../../draughtsground/interfaces'
import * as cgDrag from '../../draughtsground/drag'
import * as draughts from '../../draughts'
import { toggleCoordinates } from '../../draughtsground/fen'
import { getLidraughtsVariant, getInitialFen } from '../../lidraughts/variant'
import { VariantKey } from '../../lidraughts/interfaces/variant'
import router from '../../router'
import { prop, Prop } from '../../utils'
import redraw from '../../utils/redraw'
import settings from '../../settings'
import menu from './menu'
import pasteFenPopup from './pasteFenPopup'
import * as fenUtil from '../../utils/fen'
import continuePopup, { Controller as ContinuePopupCtrl } from '../shared/continuePopup'
import i18n from '../../i18n'
import drag from './drag'

const startingFen = 'W:W31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50:B1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20:H0:F1'

interface EditorData {
  color: Prop<Color>
  halfmove: Prop<string>
  moves: Prop<string>
}

interface Data {
  editor: EditorData
  game: {
    variant: {
      key: Prop<VariantKey>
    }
  }
  playable: boolean
}

export interface MenuInterface {
  open: () => void
  close: () => void
  isOpen: () => boolean
  root: EditorCtrl
}

export default class EditorCtrl {
  public data: Data
  public menu: MenuInterface
  public pasteFenPopup: MenuInterface
  public continuePopup: ContinuePopupCtrl
  public draughtsground: Draughtsground

  public extraPositions: Array<BoardPosition>

  public constructor(fen?: string, variant?: VariantKey) {
    const initFen = fen ? toggleCoordinates(fen, false) : startingFen

    this.menu = menu.controller(this)
    this.pasteFenPopup = pasteFenPopup.controller(this)
    this.continuePopup = continuePopup.controller()

    this.data = {
      editor: this.readFen(initFen),
      game: {
        variant: {
          key: prop<VariantKey>(variant || 'standard')
        }
      },
      playable: true,
    }

    this.setPlayable(initFen, variant || 'standard').then(redraw)

    this.extraPositions = [{
      fen: 'init',
      name: i18n('startPosition')
    }, {
      fen: 'W:W:B',
      name: i18n('clearBoard')
    }]

    this.draughtsground = new Draughtsground(this.makeConfig(initFen))
  }

  public makeConfig = (initFen: string): cg.InitConfig => {
    return {
      fen: initFen,
      boardSize: this.getVariant().board.size,
      orientation: 'white',
      coordinates: settings.game.coords(),
      coordSystem: this.coordSystem(),
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
          this.updatePosition()
        }
      }
    }
  }
 
  public isAlgebraic = (): boolean => {
    return settings.game.coordSystem() === 1 && this.getVariant().board.key === '64';
  }
  
  public coordSystem = (): number => {
    return this.isAlgebraic() ? 1 : 0;
  }

  public getVariant = () => {
    return getLidraughtsVariant(this.data.game.variant.key()) || getLidraughtsVariant('standard')
  }

  private setPlayable = (fen: string, variant: VariantKey): Promise<void> => {
    return draughts.situation({ variant, fen })
      .then(({ situation }) => {
        this.data.playable = situation.playable
      })
  }

  public updatePosition  = debounce(() => {
    const newFen = this.computeFen(false)
    const v = this.data.game.variant.key()
    if (fenUtil.validateFen(newFen, v)) {
      const path = `/editor/variant/${encodeURIComponent(v)}/fen/${encodeURIComponent(newFen)}`
      try {
        window.history.replaceState(window.history.state, '', '?=' + path)
      } catch (e) { console.error(e) }
      this.setPlayable(newFen, v).then(redraw)
    }
  }, 250)

  public onstart = (e: TouchEvent) => drag(this, e)
  public onmove = (e: TouchEvent) => cgDrag.move(this.draughtsground, e)
  public onend = (e: TouchEvent) => cgDrag.end(this.draughtsground, e)

  public editorOnCreate = (vn: Mithril.VnodeDOM<any, any>) => {
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

  public setColor = (color: Color) => {
    this.data.editor.color(color)
    this.updatePosition()
  }

  public computeFen = (algebraic: boolean, small: boolean = false) => {
    const data = this.data.editor
    const fen = data.color().toUpperCase() + ':' + this.draughtsground.getFen(algebraic)
    if (small) return fen
    else return fen + ':H' + data.halfmove() + ':F' + data.moves()
  }

  public loadNewFen = (newFen: string) => {
    if (!newFen) return;
    const v = this.data.game.variant.key()
    if (newFen === 'init') newFen = getInitialFen(v)
    else newFen = toggleCoordinates(newFen, false)
    if (fenUtil.validateFen(newFen, v)) {
      router.set(`/editor/variant/${encodeURIComponent(v)}/fen/${encodeURIComponent(newFen)}`, true)
    } else {
      Plugins.LiToast.show({ text: i18n('invalidFen'), duration: 'short' })
    }
  }

  public goToAnalyse = () => {
    const fen = this.computeFen(false)
    const variant = this.data.game.variant.key()
    draughts.situation({ variant, fen })
      .then(({ situation }) => {
        if (situation.playable) {
          router.set(`/analyse/variant/${encodeURIComponent(variant)}/fen/${encodeURIComponent(fen)}`)
        } else {
          Plugins.LiToast.show({ text: i18n('invalidFen'), duration: 'short' })
        }
      })
  }

  public continueFromHere = () => {
    const fen = this.computeFen(false)
    const variant = this.data.game.variant.key()
    if (variant !== 'standard') {
      Plugins.LiToast.show({ text: 'You can\'t continue from a variant position', duration: 'long', position: 'bottom' })
    } else draughts.situation({ variant, fen })
      .then(({ situation }) => {
        if (situation.playable) {
          this.continuePopup.open(fen, variant)
        } else {
          Plugins.LiToast.show({ text: i18n('invalidFen'), duration: 'short' })
        }
      })
  }

  private readFen(fen: string): EditorData {
    const fenData = fenUtil.readFen(fen)
    return {
      color: prop(fenData.color as Color),
      halfmove: prop(fenData.halfmove.toString()),
      moves: prop(fenData.moves.toString())
    }
  }
}
