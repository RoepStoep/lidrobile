import * as Mithril from 'mithril'
import h from 'mithril/hyperscript'
import { batchRequestAnimationFrame } from '../../utils/batchRAF'
import * as utils from '../../utils'
import * as playerApi from '../../lidraughts/player'
import * as gameApi from '../../lidraughts/game'
import getVariant from '../../lidraughts/variant'
import gameStatus from '../../lidraughts/status'
import { UserGamePlayer, UserGameWithDate } from '../../lidraughts/interfaces/user'
import session from '../../session'
import i18n from '../../i18n'
import * as helper from '../helper'
import { makeBoard } from './svgboard'
import { emptyFen } from '../../utils/fen'

interface Attrs {
  g: UserGameWithDate
  index: number
  boardTheme: string
  userId?: string
}

export default {
  onbeforeupdate({ attrs }, { attrs: oldattrs }) {
    return attrs.g !== oldattrs.g
  },
  view({ attrs }) {
    const { g, index, userId, boardTheme } = attrs
    const time = gameApi.time(g)
    const mode = g.rated ? i18n('rated') : i18n('casual')
    const title = g.source === 'import' ?
    `Import • ${g.variant.name}` :
    `${time} • ${g.variant.name} • ${mode}`
    const status = gameStatus.toLabel(g.status.name, g.winner, g.variant.key) +
      (g.winner ? (g.status.name !== 'mate' ? '. ' : '') + i18n(g.winner === 'white' ? 'whiteIsVictorious' : 'blackIsVictorious') + '.' : '')
    const knownVariant = gameApi.isSupportedVariantKey(g.variant.key)
    const icon = knownVariant ? (g.source === 'import' ? '/' : utils.gameIcon(g.perf) || '') : ''
    const whiteUser = g.players.white.user
    const perspectiveColor: Color = userId ? whiteUser && whiteUser.id === userId ? 'white' : 'black' : 'white'
    const evenOrOdd = index % 2 === 0 ? 'even' : 'odd'
    const star = g.bookmarked ? 't' : 's'
    const withStar = session.isConnected() ? ' withStar' : ''
    const player = g.players[perspectiveColor]

    return (
      <li data-id={g.id} data-pid={player.id} className={`userGame ${evenOrOdd}${withStar}`}>
        {knownVariant ? renderBoard(g.fen, perspectiveColor, g.variant.key, boardTheme) : emptyBoard(perspectiveColor, boardTheme)}
        <div className="userGame-infos">
          <div className="userGame-header">
            <div className="userGame-iconWrapper">
              <span className="variant-icon" data-icon={icon} />
              <div className="userGame-titleWrapper">
                <p className="userGame-title">{title}</p>
                <p className="userGame-date">{g.date}</p>
              </div>
            </div>
            { session.isConnected() ?
              <button className="iconStar" data-icon={star} /> : null
            }
          </div>
          <div className="userGame-versus">
            <div className="game-result">
              <div className="userGame-players">
                {renderPlayer(g.players, 'white')}
                <div className="swords" data-icon="U" />
                {renderPlayer(g.players, 'black')}
              </div>
              <div className={helper.classSet({
                'userGame-status': true,
                win: !!(g.winner && perspectiveColor === g.winner),
                loose: !!(g.winner && perspectiveColor !== g.winner)
              })}>
                {status}
              </div>
            </div>
          </div>
          <div className="userGame-meta">
            {!knownVariant ? <p className="warning" data-icon="j">{i18n('unsupportedVariant', g.variant.name)}</p> : null}
            {g.opening ?
              <p className="opening">{g.opening.name}</p> : null
            }
            {g.tournament ?
              <p className="tournament" data-id={g.tournament.id}>
                <span className="fa fa-trophy"/>{g.tournament.name}
              </p> : null
            }
            {g.analysed ?
              <p className="analysis">
              <span className="fa fa-bar-chart" />
              Computer analysis available
              </p> : null
            }
          </div>
        </div>
      </li>
    )
  }
} as Mithril.Component<Attrs, {}>

function renderBoard(fen: string, orientation: Color, variant: VariantKey, boardTheme: string) {
  const board = (getVariant(variant) || getVariant('standard')).board
  const boardClass = [
    'display_board',
    boardTheme,
    'is' + board.key
  ].join(' ')

  return (
    <div className={boardClass} key={fen}
      oncreate={({ dom }: Mithril.VnodeDOM<any, any>) => {
        const img = document.createElement('img')
        img.className = 'cg-board'
        img.src = 'data:image/svg+xml;utf8,' + makeBoard(fen, orientation, board.size)
        batchRequestAnimationFrame(() => {
          const placeholder = dom.firstChild
          if (placeholder) dom.replaceChild(img, placeholder)
        })
      }}
    >
      <div className="cg-board" />
    </div>
  )
}

function emptyBoard(orientation: Color, boardTheme: string) {
  const board = getVariant('standard').board
  const boardClass = [
    'display_board',
    boardTheme,
    'is' + board.key
  ].join(' ')

  return (
    <div className={boardClass} key={emptyFen}
      oncreate={({ dom }: Mithril.VnodeDOM<any, any>) => {
        const img = document.createElement('img')
        img.className = 'cg-board'
        img.src = 'data:image/svg+xml;utf8,' + makeBoard(emptyFen, orientation, board.size)
        batchRequestAnimationFrame(() => {
          const placeholder = dom.firstChild
          if (placeholder) dom.replaceChild(img, placeholder)
        })
      }}
    >
      <div className="cg-board" />
    </div>
  )
}

function renderPlayer(players: { white: UserGamePlayer, black: UserGamePlayer}, color: Color) {
  let player = players[color]
  let playerName: string
  if (player.user) playerName = playerApi.lightPlayerName(player.user)
  else if (player.aiLevel) {
    playerName = playerApi.aiName({ ai: player.aiLevel })
  }
  else if (player.name) {
    playerName = player.name
  }
  else playerName = i18n('anonymous')

  return (
    <div className={'player ' + color}>
      <span className="playerName">{playerName}</span>
      <br/>
      {player.rating ?
      <small className="playerRating">{player.rating}</small> : null
      }
      {player.ratingDiff ?
        helper.renderRatingDiff(player) : null
      }
    </div>
  )
}
