import i18n from '../../i18n'
import popupWidget from '../shared/popup'
import router from '../../router'
import * as h from 'mithril/hyperscript'
import Editor, { MenuInterface } from './Editor'

export default {

  controller: function(root: Editor) {
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

function renderEditorMenu(ctrl: Editor) {
  return h('div.editorMenu', [
    renderPositionSettings(ctrl)
  ])
}

export function renderPositionSettings(ctrl: Editor) {
  const fen = ctrl.computeFen()
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
            eco: '',
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
          ctrl.data.editor.color((e.target as HTMLInputElement).value as Color)
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
          ctrl.data.game.variant.key((e.target as HTMLInputElement).value as VariantKey)
          ctrl.updateHref()
        },
      }, [
        h('option[value=standard]', 'Standard'),
        h('option[value=frisian]', 'Frisian'),
        h('option[value=frysk]', 'Frysk!'),
        h('option[value=antidraughts]', 'Antidraughts'),
        h('option[value=breakthrough]', 'Breakthrough'),
      ])
    ])
  ])
}

function position2option(fen: string, pos: BoardPosition, showEco = false): Mithril.BaseNode {
  return h('option', {
    value: pos.fen,
    selected: fen === pos.fen
  }, (showEco ? pos.eco + ' ' : '') + pos.name)
}

function optgroup(name: string, opts: Mithril.Children) {
  return h('optgroup', {
    label: name
  }, opts)
}
