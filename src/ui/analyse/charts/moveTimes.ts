import { select } from 'd3-selection'
import { axisLeft } from 'd3-axis'
import { scaleLinear } from 'd3-scale'
import { area as d3Area } from 'd3-shape'

import { AnalyseData, GameStage } from '../../../lidraughts/interfaces/analyse'
import i18n from '~/i18n'

interface Point {
  ply: number
  y: number
}

interface Series {
  white: Point[]
  black: Point[]
}

export default function drawMoveTimesChart(
  element: HTMLElement,
  aData: AnalyseData,
  moveCentis: number[],
  curPly: number
) {
  const division = aData.game.division
  const rect = element.getBoundingClientRect()

  const svg = select(element)
  .append('svg')
  .attr('viewBox', `0 0 ${rect.width} ${rect.height}`)

  const margin = {top: 10, right: 10, bottom: 10, left: 25}
  const width = rect.width - margin.left - margin.right
  const height = rect.height - margin.top - margin.bottom

  const g = svg.append('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')

  const { max, series } = makeSerieData(aData, moveCentis)

  function addDivisionLine(xPos: number, name: GameStage) {
    g.append('line')
    .attr('class', 'division ' + name)
    .attr('x1', xPos)
    .attr('x2', xPos)
    .attr('y1', y(-max))
    .attr('y2', y(max))

    g.append('text')
    .attr('class', 'chart-legend')
    .attr('transform', 'rotate(90)')
    .attr('y', -xPos)
    .attr('dy', '-0.4em')
    .text(i18n(name))
  }

  function setCurrentPly(ply: number | null) {
    g.selectAll('.dot').remove()
    if (ply !== null) {
      const isWhite = !!(ply & 1)
      const p = isWhite ? series.white.find(p => p.ply === ply) : series.black.find(p => p.ply === ply)
      if (p) {
        g.append('circle')
        .attr('class', 'dot')
        .attr('cx', x(ply))
        .attr('cy', y(p.y))
        .attr('r', 3)
      }
    }
  }

  const x = scaleLinear()
  .domain([0, series.white.length + series.black.length])
  .rangeRound([0, width])

  const y = scaleLinear()
  .domain([-max, max])
  .rangeRound([height, 0])

  const line = d3Area<Point>()
  .x(d => x(d.ply))
  .y(d => y(d.y))

  const area = d3Area<Point>()
  .x(d => x(d.ply))
  .y0(y(0))
  .y1(d => y(d.y))

  const maxCentis = Math.max(...moveCentis) / 100
  const legendScale = scaleLinear()
  .domain([-maxCentis, maxCentis])
  .rangeRound([height, 0])

  const yAxis = axisLeft<number>(legendScale)
  .tickFormat(d => String(Math.abs(d)))

  g.append('g')
  .call(yAxis)
  .append('text')
  .attr('class', 'legend')
  .attr('transform', 'rotate(-90)')
  .attr('y', 6)
  .attr('dy', '0.71em')
  .attr('text-anchor', 'end')
  .text('Seconds')

  g.append('path')
  .datum(series.white)
  .attr('class', 'area above')
  .attr('d', area)

  g.append('path')
  .datum(series.black)
  .attr('class', 'area below')
  .attr('d', area)

  g.append('path')
  .attr('class', 'line')
  .datum(series.white)
  .attr('d', line)

  g.append('path')
  .attr('class', 'line')
  .datum(series.black)
  .attr('d', line)

  if (division && (division.middle || division.end)) {
    if (division.middle) {
      addDivisionLine(x(division.middle), 'middlegame')
    }
    if (division.end) {
      addDivisionLine(x(division.end), 'endgame')
    }
  }

  setCurrentPly(curPly)

  return setCurrentPly
}

function makeSerieData(data: AnalyseData, origMoveCentis: number[]): { max: number, series: Series } {
  const series: Series = {
    white: [],
    black: []
  }

  const corres = data.game.speed === 'correspondence'
  const tree = data.treeParts
  const logC = Math.pow(Math.log(3), 2)
  let ply = 0, lastPly = -1, max = 0

  const moveCentis = origMoveCentis.slice(0)
  let skipped = 0, mergedSan = ''
  for (let i = 0; i < moveCentis.length; i++) {
    const node = tree[i + 1 + skipped]
    ply = node ? node.ply : ply + 1
    if (ply !== lastPly || i + 1 === moveCentis.length) {

      if (ply === lastPly) ply++
      lastPly = ply

      let san = node && node.san ? node.san : '-'
      if (mergedSan.length !== 0 && node) {
        san = mergedSan + san.slice(san.indexOf('x') + 1)
        mergedSan = ''
      }

      const isWhite = !!(ply & 1)

      const y = Math.pow(Math.log(.005 * Math.min(moveCentis[i], 12e4) + 3), 2) - logC
      max = Math.max(y, max)

      const point = {
        ply,
        y: isWhite ? y : -y
      }

      if (isWhite) series.white.push(point)
      else series.black.push(point)
    } else {
      if (mergedSan.length === 0 && node && node.san)
        mergedSan = node.san.slice(0, node.san.indexOf('x') + 1)
      if (!corres) {
        moveCentis[i + 1] += moveCentis[i]
        moveCentis.splice(i, 1)
      }
      i--
      skipped++
    }
  }

  return { max, series }
}
