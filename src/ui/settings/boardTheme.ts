import h from 'mithril/hyperscript'
import { dropShadowHeader, backButton, onBoardThemeChange } from '../shared/common'
import redraw from '../../utils/redraw'
import layout from '../layout'
import i18n from '../../i18n'
import settings from '../../settings'
import { enumLocalDir, loadImages, filenamesBoard as themeFilenames, handleError } from '../../theme'
import * as helper from '../helper'

const themeSettings = settings.general.theme

interface Progress {
  loaded: number
  total: number
}

interface State {
  localFiles?: { [key: string]: string | undefined }
  progress: Progress | null
  selected?: string
  loading?: boolean
  isLocal: (opts: { key: string, filenames: string[] }) => boolean
  onProgress: (e: ProgressEvent) => void
  stopLoading: () => void
}

let timeoutId: number

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    this.loading = false
    this.progress = null

    this.selected = themeSettings.board()

    this.onProgress = (e: ProgressEvent) => {
      if (e.lengthComputable) {
        this.progress = e
        redraw()
      }
    }

    this.stopLoading = () => {
      if (this.progress) {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => {
          this.loading = false
          this.progress = null
          redraw()
        }, 1500)
      } else {
        this.loading = false
        this.progress = null
        redraw()
      }
    }

    this.isLocal = ({ key, filenames }): boolean =>
      themeSettings.bundledBoardThemes.includes(key) ||
      filenames.every(filename => Boolean(this.localFiles && this.localFiles['board-' + filename]))

    enumLocalDir('board').then(files => {
      this.localFiles = files.reduce((o, key) => ({ [key]: '1', ...o }), {})
      redraw()
    })
  },

  view() {
    const header = dropShadowHeader(null, backButton(i18n('boardTheme')))
    return layout.free(header, renderBody(this))
  }
} as Mithril.Component<Record<string, never>, State>

function renderBody(state: State) {

  function onTap(e: Event) {
    if (state.loading) return

    const el = helper.getLI(e)
    const key = el && el.dataset.key
    const filenames = el && el.dataset.filenames
    if (key && filenames) {
      const prevTheme = state.selected
      state.selected = key
      if (themeSettings.bundledBoardThemes.includes(key)) {
        themeSettings.board(key)
        onBoardThemeChange(key)
      } else {
        state.loading = true
        loadImages('board', key, state.onProgress)
        .then(() => {
          themeSettings.board(key)
          onBoardThemeChange(key)
          filenames.split(',').forEach(filename => {
            if (state.localFiles) {
              state.localFiles['board-' + filename] = '1'
            }
          })
          state.stopLoading()
        })
        .catch((err) => {
          state.selected = prevTheme
          state.stopLoading()
          handleError(err)
        })
      }
      redraw()
    }
  }

  return [
    h('div.native_scroller.page.settings_list', [
      h('ul', {
        oncreate: helper.ontapY(onTap, undefined, helper.getLI),
      }, themeSettings.availableBoardThemes.map((t) => {
        const selected = t.key === state.selected
        const filenames = themeFilenames(t)
        const loadingSelected = state.loading && selected

        return h('li.list_item.board_theme', {
          className: helper.classSet({
            selected,
            loading: selected && !!state.loading,
          }),
          'data-key': t.key,
          'data-filenames': filenames.join(','),
        }, [
          h('span.name', t.name),
          loadingSelected || state.isLocal({ key: t.key, filenames }) ? null : h('i.fa.fa-cloud-download'),
          loadingSelected ? h('i.fa.fa-circle-o-notch.fa-spin') : null,
          !state.loading && selected ? h('i.fa.fa-check') : null,
          h('div.board_thumbnail.vertical_align', {
            className: t.key,
          }),
        ])
      }))
    ])
  ]
}
