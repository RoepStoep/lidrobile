import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import signals from '../../signals'
import socket from '../../socket'
import session from '../../session'
import redraw from '../../utils/redraw'
import { handleXhrError, safeStringToNum } from '../../utils'
import * as sleepUtils from '../../utils/sleep'
import { emptyFen } from '../../utils/fen'
import * as helper from '../helper'
import layout from '../layout'
import ViewOnlyBoard from '../shared/ViewOnlyBoard'
import { renderContent, renderHeader, overlay } from './trainingView'
import * as xhr from './xhr'
import TrainingCtrl from './TrainingCtrl'
import { connectingHeader } from '../shared/common'
import { syncAndLoadNewPuzzle, puzzleLoadFailure } from './offlineService'
import { PuzzleData } from '../../lidraughts/interfaces/training'
import database from './database'
import settings from '../../settings';

interface Attrs {
  id?: string
  initFen?: string
  initColor?: Color
  variant?: VariantKey
}

export interface State {
  ctrl?: TrainingCtrl
}

// cache last state to retrieve it when navigating back
const cachedState: State = {}

export default {
  oninit({ attrs }) {
    const variantProp = <VariantKey>settings.training.variant() || 'standard'
    const numId = safeStringToNum(attrs.id)
    const variant = attrs.variant ? attrs.variant : (numId ? 'standard' : variantProp)
    if (numId) {
      if (cachedState.ctrl && window.history.state.puzzleId === numId) {
        this.ctrl = cachedState.ctrl
        redraw()
      }
      else {
        xhr.loadPuzzle(numId, variant)
        .then(cfg => {
          this.ctrl = new TrainingCtrl(cfg, database)
          cachedState.ctrl = this.ctrl
        })
        .catch(handleXhrError)
      }
    } else {
      if (variant !== variantProp) {
        settings.training.variant(variant)
      }
      const user = session.get()
      if (user) {
        syncAndLoadNewPuzzle(database, user, variant)
        .catch(() => xhr.newPuzzle(variant))
        .then((cfg: PuzzleData) => {
          this.ctrl = new TrainingCtrl(cfg, database)
          cachedState.ctrl = this.ctrl
        })
        .catch(puzzleLoadFailure)
      }
      else {
        xhr.newPuzzle(variant)
        .then((cfg: PuzzleData) => {
          this.ctrl = new TrainingCtrl(cfg, database)
          cachedState.ctrl = this.ctrl
        })
        .catch(handleXhrError)
      }
    }

    socket.createDefault()
    sleepUtils.keepAwake()
  },

  oncreate: helper.viewFadeIn,

  onremove() {
    if (this.ctrl) {
      signals.afterLogin.remove(this.ctrl.retry)
    }
    sleepUtils.allowSleepAgain()
  },

  view({ attrs }) {
    const isPortrait = helper.isPortrait()
    const key = isPortrait ? 'o-portrait' : 'o-landscape'

    if (this.ctrl) {
      return layout.board(
        renderHeader(this.ctrl!),
        renderContent(this.ctrl!, key),
        overlay(this.ctrl!)
      )
    }
    else {
      return layout.board(
        connectingHeader(),
        [
          h('section.board_wrapper', [
            h(ViewOnlyBoard, {
              fen: attrs.initFen || emptyFen,
              orientation: attrs.initColor || 'white',
              variant: attrs.variant || 'standard',
            })
          ]),
          h('div.training-tableWrapper')
        ]
      )
    }
  }
} as Mithril.Component<Attrs, State>
