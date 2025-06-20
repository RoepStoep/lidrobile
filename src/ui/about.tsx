import h from 'mithril/hyperscript'
import socket from '../socket'
import * as helper from './helper'
import layout from './layout'
import { dropShadowHeader, backButton } from './shared/common'
import i18n from '../i18n'

export default {
  oncreate: helper.viewSlideIn,

  oninit() {
    socket.createDefault()
  },

  view() {
    const header = dropShadowHeader(null, backButton(i18n('about')))
    return layout.free(
      header,
      <div class="aboutBody native_scroller page">
        <p>lidraughts.org is a free, open-source draughts server powered by volunteers.</p>

        <p>Chess websites were around abundantly anno 2018, with many powerful features to play, learn and interact (all for free on {externalLink('lichess.org', 'https://lichess.org')}). The surprising absence of such a website for international draughts was an important motivation to create Lidraughts. Founded on the love for draughts, it hopes to grow into a place where people from all over the world can come to enjoy this beautiful game, for free.</p>

        <p>A more personal motivation behind lidraughts.org is to remember our friend and teacher {externalLink('Tjalling Goedemoed', 'https://lidraughts.org/in-memoriam')}, who passed away much too young in 2016. Few have contributed as much to the game of draughts as he did, as an inspiring teacher, problems composer, writer of articles and books, and of course a very strong player. May this website be seen as a tribute to his work!</p>

        <p>Many words of gratitude must be expressed towards Thibault Duplessis for his brilliant piece of work {externalLink('lichess.org', 'https://lichess.org')}. As the astute reader may have noticed, lidraughts.org bears a lot of resemblance to this website, both in name and appearance. The two are not affiliated, but lidraughts was created from the {externalLink('source code', 'https://github.com/ornicar/lila')} of lichess, thanks to Thibault making all of this open source.</p>

        <p>The lidraughts app was created on the basis of the {externalLink('Lichess mobile app', 'https://github.com/lichess-org/lichobile')}, a brilliant piece work by Vincent Velociter. So a lot of thanks to him as well, the Lidraughts app would never be here today without his open source work. And of course thanks to all the other {externalLink('lichess developers', 'https://github.com/ornicar/lila/graphs/contributors')}, and the open source community in general!</p>

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
} as Mithril.Component


function externalLink(text: string, url: string): Mithril.Child {
  return h('a', {
    className: 'external_link',
    onclick: () => window.open(url, '_blank'),
  }, text)
}

/*function internalLink(text: string, route: string): Mithril.Child {
  return h('a', {
    onclick: () => router.set(route)
  }, text)
}*/
