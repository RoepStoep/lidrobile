interface Perf {
  name: string
  shortName: string
}

const perfMap: { [k: string]: Perf } = {
  ultraBullet: { name: 'UltraBullet', shortName: 'UltraBullet' },
  bullet: { name: 'Bullet', shortName: 'Bullet' },
  blitz: { name: 'Blitz', shortName: 'Blitz' },
  rapid: { name: 'Rapid', shortName: 'Rapid' },
  classical: { name: 'Classical', shortName: 'Classic' },
  correspondence: { name: 'Correspondence', shortName: 'Corresp.' },
  frisian: { name: 'Frisian', shortName: 'Frisian' },
  frysk: { name: 'Frysk!', shortName: 'Frysk!' },
  breaktrough: { name: 'Breaktrough', shortName: 'Breaktrough' },
  antidraughts: { name: 'Antidraughts', shortName: 'Antidraughts' }
}

export const perfTypes = Object.keys(perfMap).map(k =>
  [k, perfMap[k].name, perfMap[k].shortName]
)

export function perfTitle(key: PerfKey): string {
  const p = perfMap[key]
  return p ? p.name : ''
}

export function shortPerfTitle(key: PerfKey) {
  const p = perfMap[key]
  return p ? p.shortName : ''
}

// https://github.com/ornicar/lila/blob/master/modules/rating/src/main/Glicko.scala#L31
export const provisionalDeviation = 110
