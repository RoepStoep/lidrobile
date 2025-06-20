import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import signals from '../../signals'
import socket from '../../socket'
import session from '../../session'
import redraw from '../../utils/redraw'
import { base62ToNumber, handleXhrError, safeStringToNum } from '../../utils'
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
import settings from '../../settings'
import { ErrorResponse } from '~/http'

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
    const dailyPuzzle = attrs.id === 'daily'
    const numId = dailyPuzzle ? undefined : (safeStringToNum(attrs.id) || base62ToNumber(attrs.id))
    // NOTE: default to standard when puzzleId was specified without variant
    const tryVariant = dailyPuzzle ? 'standard' : (attrs.variant || (numId ? 'standard' : <VariantKey>settings.training.variant()) || 'standard')
    const variant = settings.training.supportedVariants.includes(tryVariant) ? tryVariant : 'standard'

    const loadNewPuzzle = () => {
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
    const handlePuzzleError = (e: ErrorResponse) => {
      if (e.status === 404) {
        Toast.show({ text: 'Puzzle not found.', duration: 'short' })
        loadNewPuzzle()
      } else {
        handleXhrError(e)
      }
    }

    if (numId) {
      if (cachedState.ctrl && window.history.state.puzzleId === numId) {
        this.ctrl = cachedState.ctrl
        this.ctrl.updateBoard()
        redraw()
      }
      else {
        xhr.loadPuzzle(numId, variant)
        .then(cfg => {
          this.ctrl = new TrainingCtrl(cfg, database)
          cachedState.ctrl = this.ctrl
        })
        .catch(handlePuzzleError)
      }
    } else if (dailyPuzzle) {
      xhr.loadDailyPuzzle()
        .then(cfg => {
          this.ctrl = new TrainingCtrl(cfg, database)
          cachedState.ctrl = undefined
        })
        .catch(handlePuzzleError)
    } else {
      loadNewPuzzle()
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
        renderHeader(this.ctrl),
        renderContent(this.ctrl, key),
        undefined,
        overlay(this.ctrl)
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
          h('div.table.training-tableWrapper')
        ],
        undefined,
      )
    }
  }
} as Mithril.Component<Attrs, State>
