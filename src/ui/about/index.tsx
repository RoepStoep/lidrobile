import * as h from 'mithril/hyperscript'
import router from '../../router'
import * as helper from '../helper'
import socket from '../../socket'
import layout from '../layout'
import { dropShadowHeader, backButton } from '../shared/common'

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    socket.createDefault()
  },

  view() {
    const header = dropShadowHeader(null, backButton('About'))
    return layout.free(
      header,
      <div class="aboutBody native_scroller">
        <p>lidraughts.org is a free, open-source draughts server powered by volunteers and donations.</p>

        <p>Todo...</p>

        <h2>Links</h2>

          <ul>
            <li>{externalLink('Github', 'https://github.com/veloce/lichobile')}</li>
            <li>{externalLink('Contact', 'https://lidraughts.org/contact')}</li>
            <li>{externalLink('Terms of Service', 'https://lidraughts.org/terms-of-service')}</li>
            <li>{externalLink('Privacy Policy', 'https://lidraughts.org/privacy')}</li>
            <li>{externalLink('lidraughts.org/about', 'https://lidraughts.org/about')}</li>
          </ul>

      </div>
    )
  }
} as Mithril.Component<{}, {}>


function externalLink(text: string, url: string): Mithril.Child {
  return h('a', {
    className: 'external_link',
    onclick: () => window.open(url, '_blank'),
  }, text)
}

function internalLink(text: string, route: string): Mithril.Child {
  return h('a', {
    onclick: () => router.set(route)
  }, text)
}
