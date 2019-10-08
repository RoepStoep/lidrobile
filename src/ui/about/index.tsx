import * as Mithril from 'mithril'
import { Plugins } from '@capacitor/core'
import h from 'mithril/hyperscript'
import * as helper from '../helper'
import socket from '../../socket'
import layout from '../layout'
import i18n from '../../i18n'
import { dropShadowHeader, backButton } from '../shared/common'

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    socket.createDefault()
  },

  view() {
    const header = dropShadowHeader(null, backButton(i18n('about')))
    return layout.free(
      header,
      <div class="aboutBody native_scroller">
        <p>lidraughts.org is a free, open-source draughts server powered by volunteers.</p>

        <p>Chess websites are around abundantly anno 2018, with many powerful features to play, learn and interact (all for free on {externalLink('lichess.org', 'https://lichess.org')}). The surprising absence of such a website for international draughts was an important motivation to create Lidraughts. Founded on the love for draughts, it hopes to grow into a place where people from all over the world can come to enjoy this beautiful game, for free.</p>

        <p>A more personal motivation behind lidraughts.org is to remember our friend and teacher {externalLink('Tjalling Goedemoed', 'https://lidraughts.org/in-memoriam')}, who passed away much too young in 2016. Few have contributed as much to the game of draughts as he did, as an inspiring teacher, problems composer, writer of articles and books, and of course a very strong player. May this website be seen as a tribute to his work!</p>

        <p>Many words of gratitude must be expressed towards Thibault Duplessis for his brilliant piece of work {externalLink('lichess.org', 'https://lichess.org')}. As the astute reader may have noticed, lidraughts.org bears a lot of resemblance to this website, both in name and appearance. Although the two are not formerly affiliated, it is safe to say that lidraughts would not be here today without the {externalLink('source code', 'https://github.com/ornicar/lila')} of lichess as a basis. In its first incarnation, lidraughts.org uses the same framework as lichess.org, reimplemented for the game of draughts. So a big word of thanks to Thibault, the other {externalLink('lichess developers', 'https://github.com/ornicar/lila/graphs/contributors')}, and the open source community in general!</p>

        <h2>Links</h2>

        <ul className="about_links">
          <li>{externalLink('Github', 'https://github.com/RoepStoep/lidrobile')}</li>
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
    onclick: () => Plugins.Browser.open({ url }),
  }, text)
}

/*function internalLink(text: string, route: string): Mithril.Child {
  return h('a', {
    onclick: () => router.set(route)
  }, text)
}*/
