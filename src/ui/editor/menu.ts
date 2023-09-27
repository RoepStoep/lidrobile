import i18n from '../../i18n'
import popupWidget from '../shared/popup'
import router from '../../router'
import h from 'mithril/hyperscript'
import EditorCtrl, { MenuInterface } from './EditorCtrl'
import { getInitialFen } from '../../lidraughts/variant'
import redraw from '../../utils/redraw'
import { fenCompare } from '../../utils/draughtsFormat'

export default {

  controller: function(root: EditorCtrl) {
    let isOpen = false

    function open() {
      router.backbutton.stack.push(close)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
    }

    return {
      open: open,
      close: close,
      isOpen() {
        return isOpen
      },
      root
    }
  },

  view: function(ctrl: MenuInterface) {
    return popupWidget(
      'editorMenu',
      undefined,
      () => renderEditorMenu(ctrl.root),
      ctrl.isOpen(),
      ctrl.close
    )
  }
}

function renderEditorMenu(ctrl: EditorCtrl) {
  return h('div.editorMenu', [
    renderPositionSettings(ctrl)
  ])
}

export function renderPositionSettings(ctrl: EditorCtrl) {
  const fen = ctrl.computeFen(false)
  return h('div.editorSelectors', [
    h('div.select_input', [
      h('label', {
        'for': 'select_editor_positions'
      }, 'Positions'),
      h('select.positions', {
        id: 'select_editor_positions',
        onchange(e: Event) {
          ctrl.loadNewFen((e.target as HTMLInputElement).value)
        }
      }, [
        optgroup(i18n('setTheBoard'), [
          position2option(fen, {
            name: '-- Position --',
            fen: '',
            code: '',
          }),
          ctrl.extraPositions.map((pos: BoardPosition) => position2option(fen, pos))
        ])
      ])
    ]),
    h('div.select_input', [
      h('label', {
        'for': 'select_editor_color'
      }, i18n('side')),
      h('select', {
        id: 'select_editor_color',
        value: ctrl.data.editor.color(),
        onchange(e: Event) {
          ctrl.setColor((e.target as HTMLInputElement).value as Color)
        },
      }, [
        h('option[value=w]', i18n('whitePlays')),
        h('option[value=b]', i18n('blackPlays'))
      ])
    ]),
    h('div.select_input', [
      h('label', {
        'for': 'select_editor_variant'
      }, i18n('variant')),
      h('select', {
        id: 'select_editor_variant',
        value: ctrl.data.game.variant.key(),
        onchange(e: Event) {
          const oldVariant = ctrl.getVariant(),
            oldBoardSize = oldVariant.board.size,
            oldInitialFen = getInitialFen(oldVariant.key),
            isInitial = fenCompare(ctrl.computeFen(false), oldInitialFen)
          ctrl.data.game.variant.key((e.target as HTMLInputElement).value as VariantKey)
          ctrl.updatePosition()
          const newVariant = ctrl.getVariant(),
            newBoardSize = newVariant.board.size,
            newInitialFen = getInitialFen(newVariant.key)
          if (oldBoardSize !== newBoardSize || (isInitial && !fenCompare(oldInitialFen, newInitialFen))) {
            ctrl.draughtsground.reconfigure(ctrl.makeConfig(newInitialFen))
            redraw()
          }
        },
      }, [
        h('option[value=standard]', 'Standard'),
        h('option[value=frisian]', 'Frisian'),
        h('option[value=frysk]', 'Frysk!'),
        h('option[value=antidraughts]', 'Antidraughts'),
        h('option[value=breakthrough]', 'Breakthrough'),
        h('option[value=russian]', 'Russian'),
        h('option[value=brazilian]', 'Brazilian'),
      ])
    ])
  ])
}

function position2option(fen: string, pos: BoardPosition, showEco = false): Mithril.Child {
  return h('option', {
    value: pos.fen,
    selected: fen === pos.fen
  }, (showEco ? pos.code + ' ' : '') + (pos.name || ''))
}

function optgroup(name: string, opts: Mithril.Children) {
  return h('optgroup', {
    label: name
  }, opts)
}
