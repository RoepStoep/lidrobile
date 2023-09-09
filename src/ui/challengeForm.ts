import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import * as utils from '../utils'
import tupleOf from '../utils/tupleOf'
import router from '../router'
import redraw from '../utils/redraw'
import i18n from '../i18n'
import { challenge as challengeXhr } from '../xhr'
import { validateFen } from '../utils/fen'
import { getVariantKeyById } from '../lidraughts/variant'
import settings from '../settings'
import session from '../session'
import challengesApi from '../lidraughts/challenges'
import gamesMenu from './gamesMenu'
import formWidgets from './shared/form'
import popupWidget from './shared/popup'
import ViewOnlyBoard from './shared/ViewOnlyBoard'
import * as helper from './helper'
import { toggleCoordinates } from '../draughtsground/fen'
import { fenFromTag } from '../utils/draughtsFormat'

let actionName = ''
let userId: string | undefined
let setupFen: string | undefined
let setupFenError: string | undefined

const isOpen = utils.prop(false)

function open(uid?: string) {
  if (uid) {
    userId = uid
    actionName = i18n('challengeToPlay')
  } else {
    userId = undefined
    actionName = i18n('playWithAFriend')
  }
  router.backbutton.stack.push(close)
  isOpen(true)
  setupFen = undefined
  setupFenError = undefined
}


function close(fromBB?: string) {
  if (fromBB !== 'backbutton' && isOpen()) router.backbutton.stack.pop()
  isOpen(false)
}

function doChallenge() {
  return challengeXhr(userId, setupFen)
  .then(data => {

    if (data.challenge.destUser && challengesApi.isPersistent(data.challenge)) {
      gamesMenu.open(session.nowPlaying().length + challengesApi.all().length)
    } else {
      router.set(`/game/${data.challenge.id}`)
    }
  })
  .catch(utils.handleXhrError)
}

function renderForm() {
  const formName = 'invite'
  const settingsObj = settings.gameSetup.challenge
  const variants = settings.gameSetup.challenge.availableVariants
  const timeModes = settings.gameSetup.challenge.availableTimeModes
  const timeMode = settingsObj.timeMode()
  const hasClock = timeMode === '1'
  const hasDays = timeMode === '2'
  const variant = settingsObj.variant()
  const isUltra = hasClock && settingsObj.time() === '0.25' && settingsObj.increment() === '0'
  if (isUltra && variant !== '1') {
    settingsObj.mode('0')
  }

  const colors = [
    ['randomColor', 'random'],
    ['white', 'white'],
    ['black', 'black']
  ]

  // only standard ultrabullet can be rated
  const modes = (
    session.isConnected() &&
    timeMode !== '0' &&
    (!isUltra || variant === '1')
  ) ? [
    ['casual', '0'],
    ['rated', '1']
  ] : [
    ['casual', '0']
  ]

  const generalFieldset = [
    h('div.select_input',
      formWidgets.renderSelect('side', formName + 'color', colors, settingsObj.color)
    ),
    h('div.select_input',
      formWidgets.renderSelect('variant', formName + 'variant', variants, settingsObj.variant)
    ),
    settingsObj.variant() === '3' ?
    h('div.setupPosition',
    userId ?
    h('input[type=text][name=fen]', {
      placeholder: i18n('pasteTheFenStringHere'),
      oninput: (e: Event) => {
        const rawfen = toggleCoordinates(fenFromTag((e.target as HTMLInputElement).value), false)
        if (validateFen(rawfen, getVariantKeyById(settingsObj.variant()) || 'standard')) {
          setupFen = rawfen
          setupFenError = undefined
        }
        else setupFenError = i18n('invalidFen')
        redraw()
      }
    }) : h('div', h('button.withIcon', {
      oncreate: helper.ontap(() => {
        close()
        router.set('/editor')
      })
    }, [h('span.fa.fa-pencil'), i18n('boardEditor')])),
    setupFenError ?
    h('div.setupFenError', setupFenError) : null,
    setupFen ? [
      h('div', {
        style: {
          width: '100px',
          height: '100px'
        },
        oncreate: helper.ontap(() => {
          close()
          if (setupFen) router.set(`/editor/${encodeURIComponent(setupFen)}`)
        })
      }, [
        h(ViewOnlyBoard, { fen: setupFen, variant: getVariantKeyById(settingsObj.variant()) || 'standard', orientation: 'white'})
      ])
      ] : null
    ) : null,
    settingsObj.variant() !== '3' ?
    h('div.select_input',
      formWidgets.renderSelect('mode', formName + 'mode', modes, settingsObj.mode)
    ) : null
  ]

  const timeFieldset = [
    h('div.select_input',
      formWidgets.renderSelect('clock', formName + 'timeMode', timeModes, settingsObj.timeMode)
    )
  ]

  if (hasClock) {
    timeFieldset.push(
      h('div.select_input.inline',
        formWidgets.renderSelect('time', formName + 'time',
          settings.gameSetup.availableTimes, settingsObj.time, false)
      ),
      h('div.select_input.inline',
        formWidgets.renderSelect('increment', formName + 'increment',
          settings.gameSetup.availableIncrements.map(tupleOf), settingsObj.increment, false)
      )
    )
  }

  if (hasDays) {
    timeFieldset.push(
      h('div.select_input.large_label',
        formWidgets.renderSelect('daysPerTurn', formName + 'days',
          settings.gameSetup.availableDays.map(tupleOf), settingsObj.days, false)
      ))
  }

  return h('form#invite_form.game_form', {
    onsubmit(e: Event) {
      e.preventDefault()
      if (!settings.gameSetup.isTimeValid(settingsObj)) {
        Toast.show({ text: 'Invalid clock settings', position: 'center', duration: 'short' })
        return
      }
      close()
      doChallenge()
    }
  }, [
    h('fieldset', generalFieldset),
    h('fieldset#clock', timeFieldset),
    h('div.popupActionWrapper', [
      h('button[type=submit].defaultButton', actionName)
    ])
  ])
}

export default {
  view() {
    return popupWidget(
      'invite_form_popup game_form_popup',
      undefined,
      renderForm,
      isOpen(),
      close
    )
  },

  open,
  openFromPosition(f: string) {
    open()
    setupFen = f
    settings.gameSetup.challenge.variant('3')
    settings.gameSetup.challenge.mode('0')
  }
}
