import * as helper from '../helper'
import socket from '../../socket'
import * as sleepUtils from '../../utils/sleep'
import EditorCtrl from './EditorCtrl'
import editorView from './editorView'

interface Attrs {
  fen?: string,
  variant?: VariantKey
}

interface State {
  editor: EditorCtrl
}

const EditorScreen: Mithril.Component<Attrs, State> = {
  oninit({ attrs }) {
    socket.createDefault()

    sleepUtils.keepAwake()

    this.editor = new EditorCtrl(attrs.fen, attrs.variant === 'fromPosition' ? 'standard' : attrs.variant)
  },
  oncreate: helper.viewFadeIn,
  onremove() {
    sleepUtils.allowSleepAgain()
  },
  view() {
    return editorView(this.editor)
  }
}

export default EditorScreen
