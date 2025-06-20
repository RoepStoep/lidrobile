import h from 'mithril/hyperscript'
import router from '../../router'
import { dropShadowHeader, backButton as renderBackbutton } from '../shared/common'
import { hasNetwork, lidraughtsAssetSrc, gameIcon } from '../../utils'
import { openWebsitePage } from '../../utils/browse'
import { linkify } from '../../utils/html'
import { perfTypes, provisionalDeviation } from '../../lidraughts/perfs'
import { Perf } from '../../lidraughts/interfaces/user'
import i18n, { plural, formatDate, formatDuration, fromNow } from '../../i18n'
import countries from '../../utils/countries'
import * as helper from '../helper'
import session from '../../session'
import { IUserCtrl, ProfileUser, isSessionUser, isFullUser } from './UserCtrl'

export function header(user: ProfileUser, ctrl: IUserCtrl) {
  const title = userTitle(user.online, user.patron!, user.username, user.title)

  const backButton = !ctrl.isMe() ? renderBackbutton(title) : null
  return dropShadowHeader(backButton ? null : title, backButton)
}

export function userTitle(
  online: boolean | undefined,
  patron: boolean,
  username: string,
  title?: string,
): Mithril.Child {
  const status = hasNetwork() && online ? 'online' : 'offline'
  const icon = patron ?
    <span className={'userStatus patron ' + status} data-icon="" /> :
    <span className={'fa fa-circle userStatus ' + status} />
  return h('div.title', [
    online === undefined ? null : icon,
    h('span', [
      ...renderTitle(title),
      username
    ])
  ])
}

export function renderTitle(title?: string): Mithril.ChildArray {
  if (!title) return []

  const title64 = title.endsWith('-64')
  const titleClass = 'userTitle' + (title === 'BOT' ? '.bot' : (title64 ? '.title64' : ''))
  return [h('span.' + titleClass, title64 ? title.slice(0, title.length - 3) : title), h.trust('&nbsp;')]
}

export function profile(user: ProfileUser, ctrl: IUserCtrl) {
  return (
    <div id="userProfile" className="native_scroller page">
      {renderWarnings(user)}
      {renderProfile(user)}
      {renderStats(user)}
      {renderWebsiteLinks(ctrl, user)}
      {renderRatings(user)}
      {renderActions(ctrl, user)}
    </div>
  )
}

function renderWarnings(user: ProfileUser) {
  if (!user.engine && !user.booster) return null

  return (
    <section className="warnings">
      {user.engine ?
      <div className="warning" data-icon="j">{i18n('thisPlayerUsesDraughtsComputerAssistance')}</div> : null
      }
      {user.booster ?
      <div className="warning" data-icon="j">{i18n('thisPlayerArtificiallyIncreasesTheirRating')}</div> : null
      }
    </section>
  )
}

function renderProfile(user: ProfileUser): Mithril.Child {
  if (user.profile) {
    const fullname = [user.profile.firstName, user.profile.lastName].filter(x => x != null).join(' ')
    const country = user.profile.country != null ? countries[user.profile.country] : null
    const location = user.profile.location
    const memberSince = i18n('memberSince') + ' ' + formatDate(new Date(user.createdAt))

    return (
      <section className="profileSection">
        {fullname ?
        <h3 className="fullname">{fullname}</h3> : null
        }
        {user.profile.bio != null ?
        <p className="profileBio">{h.trust(linkify(user.profile.bio))}</p> : null
        }
        <div>
          { user.profile.fmjdRating != null ?
            <p>FMJD rating: <strong>{user.profile.fmjdRating}</strong></p> : null
          }
          { user.profile.kndbRating != null ?
            <p>KNDB rating: <strong>{user.profile.kndbRating}</strong></p> : null
          }
          <p className="location">
            {location}
            {country != null && hasNetwork() ?
            <span className="country">
              {location != null ? ',' : ''} <img className="flag" src={lidraughtsAssetSrc(`images/flags/${user.profile.country}.png`)} />
              {country}
            </span> : null
            }
          </p>
          <p>{memberSince}</p>
          {user.seenAt ?
          <p>{h.trust(i18n('lastSeenActive', `<small>${fromNow(new Date(user.seenAt))}</small>`))}</p> : null
          }
        </div>
      </section>
    ) as Mithril.Child
  } else
    return null
}

function renderWebsiteLinks(ctrl: IUserCtrl, user: ProfileUser) {
  return (
    <section className="profileSection websiteLinks">
      { ctrl.isMe() ?
        <p>
          <a className="external_link"
            oncreate={helper.ontapY(() => openWebsitePage('/account/profile'))}
          >
            {i18n('editProfile')}
          </a>
        </p> :
        <p>
          <a className="external_link"
            oncreate={helper.ontapY(() => openWebsitePage(`/@/${user.id}`))}
          >
            More on lidraughts.org
          </a>
        </p>
      }
      { user.patron ?
      <p>
        <a className="external_link"
          oncreate={helper.ontapY(() => openWebsitePage('/patron'))}
        >
          Lidraughts Patron
        </a>
      </p> : null
      }
    </section>
  )
}

function renderStats(user: ProfileUser) {
  let totalPlayTime: string | null = null
  let tvTime: string | null = null

  if (isFullUser(user)) {
    totalPlayTime = user.playTime ? i18n('tpTimeSpentPlaying', formatDuration(user.playTime.total)) : null
    tvTime = user.playTime && user.playTime.tv > 0 ? i18n('tpTimeSpentOnTV', formatDuration(user.playTime.tv)) : null
  } else if (isSessionUser(user)) {
    totalPlayTime = user.playTime ? i18n('tpTimeSpentPlaying', formatDuration(user.playTime.total)) : null
  }

  return (
    <section className="profileSection">
      {isFullUser(user) && user.completionRate ?
      <p>{i18n('gameCompletionRate', user.completionRate + '%')}</p> : null
      }
      {totalPlayTime ?
      <p>{totalPlayTime}</p> : null
      }
      {tvTime ?
      <p>{tvTime}</p> : null
      }
    </section>
  )
}

function userPerfs(user: ProfileUser) {
  const res = perfTypes.map(p => {
    const perf = user.perfs[p[0]]
    return {
      key: p[0] as PerfKey,
      name: p[1],
      perf: perf || '-'
    }
  })

  if (user.perfs.puzzle) res.push({
    key: 'puzzle',
    name: 'Training',
    perf: user.perfs.puzzle
  })

  if (user.perfs.puzzlefrisian) res.push({
    key: 'puzzlefrisian',
    name: 'Frisian Training',
    perf: user.perfs.puzzlefrisian
  })

  return res
}

function variantPerfAvailable(key: PerfKey, perf: Perf) {
  return (key !== 'puzzle' && key !== 'puzzlefrisian' && perf.games > 0)
}

function renderPerf(key: PerfKey, name: string, perf: Perf, user: ProfileUser) {

  const avail = variantPerfAvailable(key, perf)

  return h('div', {
    className: 'profilePerf' + (avail ? ' nav' : ''),
    'data-icon': gameIcon(key),
    oncreate: helper.ontapY(() => {
      if (avail) router.set(`/@/${user.id}/${key}/perf`)
    })
  }, [
    h('span.name', name),
    h('div.rating', [
      perf.rating,
      perf.rd >= provisionalDeviation ? '?' : null,
      helper.progress(perf.prog),
      h('span.nb', '/ ' + perf.games)
    ])
  ])
}


function renderRatings(user: ProfileUser) {
  function isShowing(p: { key: string, perf: { games: number }}) {
    return [
      'blitz', 'bullet', 'rapid', 'classical', 'correspondence'
    ].indexOf(p.key) !== -1 || p.perf.games > 0
  }

  return (
    <section id="userProfileRatings" className="perfs">
      {userPerfs(user).filter(isShowing).map(p => renderPerf(p.key, p.name, p.perf, user))}
    </section>
  )
}

function renderActions(ctrl: IUserCtrl, user: ProfileUser) {
  return (
    <section id="userProfileActions" className="items_list_block noPadding">
      { isFullUser(user) ?
        <div className="list_item nav"
          oncreate={helper.ontapY(ctrl.goToGames)}
        >
          {plural('nbGames', user.count.all)}
        </div> : null
      }
      { session.isConnected() && ctrl.isMe() ?
      <div className="list_item"
        oncreate={helper.ontapY(() => router.set('/inbox'))}
      >
        <span className="fa fa-envelope" />
        {i18n('inbox')}
      </div> : null
      }
      { session.isConnected() && ctrl.isMe() ?
      <div className="list_item"
        oncreate={helper.ontapY(() => router.set('/account/preferences'))}
      >
        <span className="fa fa-cog" />
        {i18n('preferences')}
      </div> : null
      }
      <div className="list_item nav"
        oncreate={helper.ontapY(ctrl.followers)}
      >
        <span className="fa fa-users" />
        {plural('nbFollowers', user.nbFollowers)}
      </div>
      { !ctrl.isMe() ? <div className="list_item nav" data-icon="1"
        oncreate={helper.ontapY(ctrl.goToUserTV)}
      >
        {i18n('watchGames')}
      </div> : null
      }
      { session.isConnected() && !ctrl.isMe() ?
      <div className="list_item" data-icon="U"
        oncreate={helper.ontapY(ctrl.challenge)}
      >
        {i18n('challengeToPlay')}
      </div> : null
      }
      { session.isConnected() && !ctrl.isMe() ?
      <div className="list_item nav"
        oncreate={helper.ontapY(ctrl.composeMessage)}
      >
        <span className="fa fa-comment" />
        {i18n('composeMessage')}
      </div> : null
      }
      {session.isConnected() && isFullUser(user) && user.followable && !ctrl.isMe() ?
      <div className={['list_item', user.blocking ? 'disabled' : ''].join(' ')}>
        <div className="check_container">
          <label htmlFor="user_following">{i18n('follow')}</label>
          <input id="user_following" type="checkbox" checked={user.following}
            disabled={user.blocking}
            onchange={ctrl.toggleFollowing} />
        </div>
      </div> : null
      }
      {session.isConnected() && isFullUser(user) && !ctrl.isMe() ?
      <div className={['list_item', user.following ? 'disabled' : ''].join(' ')}>
        <div className="check_container">
          <label htmlFor="user_blocking">{i18n('block')}</label>
          <input id="user_blocking" type="checkbox" checked={user.blocking}
            disabled={user.following}
            onchange={ctrl.toggleBlocking} />
        </div>
      </div> : null
      }
      { session.isConnected() && !ctrl.isMe() ?
      <div className="list_item" data-icon="!"
        oncreate={helper.ontapY(() => openWebsitePage(`/report?username=${user.username}`))}
      >
        {i18n('reportXToModerators', user.username)}
      </div> : null
      }
      { session.isConnected() && ctrl.isMe() ?
      <div className="list_item"
        oncreate={helper.ontapY(session.logout)}
      >
        <span className="fa fa-power-off" />
        {i18n('logOut')}
      </div> : null
      }
    </section>
  )
}
