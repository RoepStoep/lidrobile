import h from 'mithril/hyperscript'
import * as helper from '../helper'
import { hasNetwork } from '../../utils'
import session from '../../session'
import settings from '../../settings'
import formWidgets from '../shared/form'
import popupWidget from '../shared/popup'
import router from '../../router'
import TrainingCtrl from './TrainingCtrl'

export interface ISettingsCtrl {
    root: TrainingCtrl
    s: {
      variant: string
    }
    open(): void
    close(fBB?: string): void
    isOpen(): boolean
    setVariant(v: string): void
  }
  
  export default {
  
    controller(root: TrainingCtrl): ISettingsCtrl {
      let isOpen = false
  
      function open() {
        router.backbutton.stack.push(close)
        isOpen = true
      }
  
      function close(fromBB?: string) {
        if (fromBB !== 'backbutton' && isOpen) router.backbutton.stack.pop()
        isOpen = false
      }
  
      const s = {
        variant: settings.training.variant()
      }
  
      return {
        root,
        open,
        close,
        isOpen: () => isOpen,
        s,
        setVariant(v: string) {
          s.variant = v
          root.vm.variant = <VariantKey>v
          close()
          root.newPuzzle()
        }
      }
    },
  
    view(ctrl: ISettingsCtrl) {
      return popupWidget(
        'trainingMenu',
        undefined,
        () => renderTrainingSettings(ctrl.root),
        ctrl.isOpen(),
        ctrl.close
      )
    }
  }
  
  function renderTrainingSettings(ctrl: TrainingCtrl) {
   
    return h('div.trainingSettings', [
      h('div.action', [
        formWidgets.renderMultipleChoiceButton(
          'Puzzle variant',
          [
            { label: 'Standard', value: 'standard', dataIcon: '8' },
            { label: 'Frisian', value: 'frisian', dataIcon: '\'' },
            { label: 'Russian', value: 'russian', dataIcon: '' },
          ],
          settings.training.variant,
          false,
          ctrl.settings.setVariant
        )
      ]),
      h('button.fa.fa-refresh', {
        disabled: !(hasNetwork() && session.isConnected()),
        oncreate: helper.ontap(ctrl.resync)
      }, 'Sync and refresh saved puzzles')
    ])
  }
  
  