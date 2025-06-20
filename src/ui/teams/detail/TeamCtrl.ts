import redraw from '../../../utils/redraw'
import { Toast } from '@capacitor/toast'
import { Team, TeamJoinLeaveResponse } from '../../../lidraughts/interfaces/teams'
import * as utils from '../../../utils'
import * as xhr from '../teamsXhr'

export default class TeamCtrl {

  public teamId: string
  public team?: Team

  constructor(teamId: string) {
    this.teamId = teamId
    xhr.getTeam(teamId)
    .then(data => {
      this.team = data
      redraw()
    })
    .catch(utils.handleXhrError)
  }

  join(form: HTMLFormElement) {
    const team = this.team
    if (!team)
      return null

    const message = team.open ? null : (form[0] as HTMLInputElement).value
    xhr.joinTeam(team.id, message)
    .then((data: TeamJoinLeaveResponse) => {
      if (!data.ok) {
        Toast.show({ text: 'Join failed', duration: 'short' })
      }
      this.reload(this.teamId)
    })
    .catch(utils.handleXhrError)
  }

  leave() {
    const team = this.team
    if (!team)
      return null

    xhr.leaveTeam(team.id)
    .then((data: TeamJoinLeaveResponse) => {
      if (!data.ok) {
        Toast.show({ text: 'Leave failed', duration: 'short' })
      }
      this.reload(this.teamId)
    })
    .catch(utils.handleXhrError)
  }

  reload(teamId: string) {
    xhr.getTeam(teamId, true)
    .then(data => {
      this.team = data
      redraw()
    })
    .catch(utils.handleXhrError)
  }
}
