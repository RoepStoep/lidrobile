import h from 'mithril/hyperscript'
import { Toast } from '@capacitor/toast'
import i18n from '../../i18n'
import router from '../../router'
import { validateFen, positionLooksLegit } from '../../utils/fen'
import { getVariantBoard, specialFenVariants } from '../../lidraughts/variant'
import popupWidget from '../shared/popup'
import * as helper from '../helper'
import playMachineForm from '../playMachineForm'
import challengeForm from '../challengeForm'
import { hasNetwork, prop, Prop } from '../../utils'
import { toggleCoordinates } from '../../draughtsground/fen'

export interface Controller {
  open(fentoSet: string, variantToSet: VariantKey, colorToSet?: Color): void
  close(fromBB?: string): void
  fen: Prop<string | null>
  variant: Prop<VariantKey>
  color: Prop<Color>
  isOpen(): boolean
}

export default {

  controller() {
    let isOpen = false
    const fen = prop<string | null>(null)
    const variant = prop<VariantKey>('standard' as VariantKey)
    const color = prop<Color>('white' as Color)

    function open(fentoSet: string, variantToSet: VariantKey, colorToSet: Color = 'white') {
      router.backbutton.stack.push(close)
      fen(fentoSet)
      variant(variantToSet)
      color(colorToSet)
      isOpen = true
    }

    function close(fromBB?: string) {
      if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
      isOpen = false
    }

    return {
      open,
      close,
      fen,
      variant,
      color,
      isOpen: function() {
        return isOpen
      }
    }
  },

  view(ctrl: Controller) {
    return popupWidget(
      'continueFromHere',
      () => h('h2', i18n('continueFromHere')),
      () => {
        return [
          !specialFenVariants.has(ctrl.variant()) && hasNetwork() ? h('p.sep', i18n('playOnline')) : null,
          !specialFenVariants.has(ctrl.variant()) && hasNetwork() ? h('button', {
            oncreate: helper.ontap(() => {
              ctrl.close()
              const f = ctrl.fen()
              if (f) playMachineForm.openAIFromPosition(f)
            })
          }, i18n('playWithTheMachine')) : null,
          !specialFenVariants.has(ctrl.variant()) && hasNetwork() ? h('button', {
            oncreate: helper.ontap(() => {
              ctrl.close()
              const f = ctrl.fen()
              if (f) challengeForm.openFromPosition(f)
            })
          }, i18n('playWithAFriend')) : null,
          h('p.sep', i18n('playOffline')),
          h('button', {
            oncreate: helper.ontap(() => {
              ctrl.close()
              const f = toggleCoordinates(ctrl.fen() || '', false)
              const v = ctrl.variant()
              const c = ctrl.color()
              if (f) {
                if (validateFen(f, v) && positionLooksLegit(f, getVariantBoard(v).size)) {
                  router.set(`/ai/variant/${v}/fen/${encodeURIComponent(f)}/color/${c}`)
                } else {
                  Toast.show({ text: i18n('invalidFen'), position: 'center', duration: 'short' })
                }
              }
            })
          }, i18n('playOfflineComputer')),
          h('button', {
            oncreate: helper.ontap(() => {
              ctrl.close()
              const f = ctrl.fen()
              const v = ctrl.variant()
              if (f) {
                if (validateFen(f, v) && positionLooksLegit(f, getVariantBoard(v).size)) {
                  router.set(`/otb/variant/${v}/fen/${encodeURIComponent(f)}`)
                } else {
                  Toast.show({ text: i18n('invalidFen'), position: 'center', duration: 'short' })
                }
              }
            })
          }, i18n('playOfflineOverTheBoard'))
        ]
      },
      ctrl.isOpen(),
      ctrl.close
    )
  }
}
