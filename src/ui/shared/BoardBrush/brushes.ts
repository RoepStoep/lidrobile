export interface Brush {
  key: string
  color: string
  opacity: number
  lineWidth: number
}

export const brushes: { [key: string]: Brush } = {
  green: { key: 'g', color: '#15781B', opacity: 1, lineWidth: 10 },
  red: { key: 'r', color: '#882020', opacity: 1, lineWidth: 10 },
  blue: { key: 'b', color: '#003088', opacity: 1, lineWidth: 10 },
  yellow: { key: 'y', color: '#e68f00', opacity: 1, lineWidth: 10 },
  paleBlue: { key: 'pb', color: '#003088', opacity: 0.4, lineWidth: 15 },
  paleBlue12: { key: 'pb12', color: '#003088', opacity: 0.3, lineWidth: 12 },
  paleBlue11: { key: 'pb11', color: '#003088', opacity: 0.3, lineWidth: 11 },
  paleBlue10: { key: 'pb10', color: '#003088', opacity: 0.3, lineWidth: 10 },
  paleBlue9: { key: 'pb9', color: '#003088', opacity: 0.3, lineWidth: 9 },
  paleBlue8: { key: 'pb8', color: '#003088', opacity: 0.3, lineWidth: 8 },
  paleBlue7: { key: 'pb7', color: '#003088', opacity: 0.3, lineWidth: 7 },
  paleBlue6: { key: 'pb6', color: '#003088', opacity: 0.3, lineWidth: 6 },
  paleBlue5: { key: 'pb5', color: '#003088', opacity: 0.3, lineWidth: 5 },
  paleBlue4: { key: 'pb4', color: '#003088', opacity: 0.3, lineWidth: 4 },
  paleBlue3: { key: 'pb3', color: '#003088', opacity: 0.3, lineWidth: 3 },
  paleBlue2: { key: 'pb2', color: '#003088', opacity: 0.3, lineWidth: 2 },
  paleBlue_2: { key: 'pb_2', color: '#003088', opacity: 0.6, lineWidth: 15 },
  paleBlue_3: { key: 'pb_3', color: '#003088', opacity: 0.3, lineWidth: 15 },
  paleBlue_4: { key: 'pb_4', color: '#003088', opacity: 0.8, lineWidth: 15 },
  paleGreen: { key: 'pg', color: '#15781B', opacity: 0.4, lineWidth: 15 },
  palePurple: { key: 'pp', color: '#4b0082', opacity: 0.35, lineWidth: 10 },
  paleRed: { key: 'pr', color: 'rgb(136, 32, 32)', opacity: 0.65, lineWidth: 15 },
  paleRed2: { key: 'pr2', color: 'rgb(136, 32, 32)', opacity: 0.4, lineWidth: 8 },
  paleRed3: { key: 'pr3', color: 'rgb(136, 32, 32)', opacity: 0.8, lineWidth: 15 },
  paleGrey: { key: 'pgr', color: '#4a4a4a', opacity: 0.35, lineWidth: 15 },
}
