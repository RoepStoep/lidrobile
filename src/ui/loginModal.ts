import { Keyboard } from '@capacitor/keyboard'
import { Toast } from '@capacitor/toast'
import h from 'mithril/hyperscript'
import session from '../session'
import { ErrorResponse } from '../http'
import redraw from '../utils/redraw'
import socket from '../socket'
import signals from '../signals'
import push from '../push'
import challengesApi from '../lidraughts/challenges'
import { handleXhrError } from '../utils'
import * as helper from './helper'
import i18n from '../i18n'
import router from '../router'
import { closeIcon } from './shared/icons'
import signupModal from './signupModal'
import settings from '~/settings'

let isOpen = false
let loading = false
let formError: string | null = null

export default {
  open,
  close,
  view() {
    if (!isOpen) return null

    return h('div.modal#loginModal', { oncreate: helper.slidesInUp }, [
      h('header', [
        h('button.modal_close', {
          oncreate: helper.ontap(helper.slidesOutDown(close, 'loginModal'))
        }, closeIcon),
        h('h2', i18n('signIn'))
      ]),
      h('div.modal_content', [
        h('form.defaultForm.login', {
          onsubmit: onLogin
        }, [
          formError && !isTotpError(formError) ?  h('div.form-error', formError) : null,
          formError === 'InvalidTotpToken' ? h('div.form-error', i18n('invalidAuthenticationCode')) : null,
          h('div.field', [
            h('input#username', {
              type: isTotpError(formError) ? 'hidden' : 'text',
              className: formError ? 'form-error' : '',
              placeholder: i18n('username'),
              autocomplete: 'off',
              autocapitalize: 'off',
              autocorrect: 'off',
              spellcheck: false,
              required: true
            }),
          ]),
          h('div.field', [
            h('input#password', {
              type: isTotpError(formError) ? 'hidden' : 'password',
              className: formError ? 'form-error' : '',
              placeholder: i18n('password'),
              required: true
            }),
          ]),
          isTotpError(formError) ? [
            h('div.field', [
              h('input#token[type=number]', {
                className: formError !== 'MissingTotpToken' ? 'form-error' : '',
                placeholder: i18n('authenticationCode'),
                pattern: '\\d{6}',
                required: true
              }),
            ]),
            h('p.twofactorhelp', [
              h('i.fa.fa-mobile-phone'), h.trust('&nbsp'),
              'Open the two-factor authentication app on your device to view your authentication code and verify your identity.'
            ]),
          ] : null,
          h('div.submit', [
            h('button.defaultButton', {
              disabled: loading
            }, i18n('signIn'))
          ])
        ]),
        h('div.loginActions', [
          h('a', {
            oncreate: helper.ontap(signupModal.open)
          }, [i18n('signUp')]),
          h('a', {
            href: 'https://lidraughts.org/password/reset'
          }, [i18n('passwordReset')])
        ]),
      ])
    ])
  }
}

function onLogin(e: Event) {
  if (loading) return false
  e.preventDefault()
  const form = e.target as HTMLFormElement
  const username = form['username'].value.trim()
  const password = form['password'].value
  const token = form['token'] ? form['token'].value : null
  if (!username || !password) return
  redraw()
  Keyboard.hide()
  loading = true
  session.login(username, password, token)
  ?.then(() => {
    loading = false
    close()
    Toast.show({ text: i18n('loginSuccessful'), position: 'top', duration: 'short' })
    signals.afterLogin.dispatch()
    redraw()
    // reconnect socket to refresh friends...
    socket.reconnectCurrent()
    push.register(true)
    challengesApi.refresh()
    return session.refresh()
  })
  .then(() => {
    const prefs = session.get()?.prefs
    if (prefs) {
      // copy some important prefs on login 
      settings.analyse.fullCapture(!!prefs['fullCapture'])
      settings.game.draughtsResult(!!prefs['gameResult'])
      const coordSystem = prefs['coordSystem']
      if (typeof coordSystem === 'number') {
        settings.game.coordSystem(coordSystem)
      }
    }
  })
  .catch((err: ErrorResponse) => {
    loading = false
    if (err.body.ipban) {
      close()
    } else {
      if (err.status !== 400 && err.status !== 401) handleXhrError(err)
      else {
        if (err.body.global) {
          formError = err.body.global[0]
          redraw()
        }
      }
    }
  })
}

function isTotpError(formError: string | null) {
  return formError === 'MissingTotpToken' || formError === 'InvalidTotpToken'
}

function open() {
  router.backbutton.stack.push(helper.slidesOutDown(close, 'loginModal'))
  isOpen = true
  loading = false
  formError = null
}

function close(fromBB?: string) {
  Keyboard.hide()
  if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
  isOpen = false
}
