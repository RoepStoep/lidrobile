import store, { StoredProp } from './storage'
import { prop as asyncProp } from './asyncStorage'
import { ClockType, ClockTypeWithNone } from './ui/shared/clock/interfaces'


const offlineAvailableVariantsWithAi: [string, VariantKey][] = [
  ['Standard', 'standard'],
  ['Frisian', 'frisian'],
  ['Frysk!', 'frysk'],
  ['Antidraughts', 'antidraughts'],
  ['Breakthrough', 'breakthrough'],
]

const offlineAvailableVariants: [string, VariantKey][] = [
  ['Standard', 'standard'],
  ['Frisian', 'frisian'],
  ['Frysk!', 'frysk'],
  ['Antidraughts', 'antidraughts'],
  ['Breakthrough', 'breakthrough'],
  ['Russian', 'russian'],
  ['Brazilian', 'brazilian'],
]

export interface GameSettings {
  readonly time: StoredProp<string>
  readonly timeMode: StoredProp<string>
  readonly increment: StoredProp<string>
  readonly color: StoredProp<string>
  readonly mode?: StoredProp<string>
  readonly variant: StoredProp<string>
  readonly ratingMin?: StoredProp<string>
  readonly ratingMax?: StoredProp<string>
  readonly days?: StoredProp<string>
  readonly level?: StoredProp<string>
}

export interface HumanSettings extends GameSettings {
  readonly mode: StoredProp<string>
  readonly ratingMin: StoredProp<string>
  readonly ratingMax: StoredProp<string>
  readonly days: StoredProp<string>
}

export interface AiSettings extends GameSettings {
  readonly level: StoredProp<string>
}

const minRatingRanges = [
  ['800', '800'],
  ['900', '900'],
  ['1000', '1000'],
  ['1100', '1100'],
  ['1200', '1200'],
  ['1300', '1300'],
  ['1400', '1400'],
  ['1500', '1500'],
  ['1600', '1600'],
  ['1700', '1700'],
  ['1800', '1800'],
  ['1900', '1900'],
  ['2000', '2000'],
  ['2100', '2100'],
  ['2200', '2200'],
  ['2300', '2300'],
  ['2400', '2400'],
  ['2500', '2500'],
  ['2600', '2600'],
  ['2700', '2700'],
  ['2800', '2800'],
]

export default {
  general: {
    lang: asyncProp<string | null>('settings.lang', null),
    sound: asyncProp<boolean>('settings.sound', true),
    theme: {
      availableBackgroundThemes: [
        { key: 'dark', name: 'dark', ext: '' },
        { key: 'light', name: 'light', ext: '' },
        { key: 'bgshapes', name: 'bgThemeShapes', ext: 'jpg' },
        { key: 'anthracite', name: 'bgThemeAnthracite', ext: 'jpg' },
        { key: 'blue-maze', name: 'bgThemeBlueMaze', ext: 'jpg' },
        { key: 'red-maze', name: 'bgThemeRedMaze', ext: 'jpg' },
        { key: 'checkerboard', name: 'bgThemeGreenCheckerboard', ext: 'png' },
        { key: 'wood', name: 'bgThemeWood', ext: 'jpg' },
        { key: 'space', name: 'bgThemeVioletSpace', ext: 'jpg' },
      ],
      background: store.prop('settings.bgTheme', 'dark'),
      availableBoardThemes: [
        ['boardThemeBrown', 'brown'],
        ['boardThemeBrown2', 'brown2'],
        ['boardThemeBlue', 'blue'],
        ['boardThemeGreen', 'green'],
        ['boardThemeGrey', 'grey'],
        ['boardThemePurple', 'purple'],
        ['boardThemeWood', 'wood'],
        ['boardThemeWood2', 'wood2'],
        ['boardThemeWood3', 'wood3'],
        ['boardThemeMaple', 'maple'],
        ['boardThemeBlue2', 'blue3'],
        ['boardThemeCanvas', 'canvas'],
        ['boardThemeMetal', 'metal'],
        ['boardThemeMatch', 'match']
      ],
      availablePieceThemes: [
        ['wide_crown', 'Standard'],
        ['wide', 'Standard no crown'],
        ['narrow_edge', 'Narrow #1'],
        ['narrow', 'Narrow #2'],
        ['fabirovsky', 'Fabirovsky'],
        ['flat', 'Flat'],
        ['ringed', 'Ringed'],
        ['basic', 'Basic'],
        ['frisianovsky', 'Frisianovsky'],
        ['eightbit', '8-bit']
      ],
      board: store.prop('settings.theme.board', 'maple'),
      piece: store.prop('settings.theme.piece', 'wide_crown')
    },
    vibrateOnGameEvents: store.prop('settings.vibrateOnGameEvents', false),
    notifications: {
      allow: store.prop<boolean>('settings.notifications', true),
      vibrate: store.prop<boolean>('settings.notifications.vibrate', true),
      sound: store.prop<boolean>('settings.notifications.sound', true)
    }
  },

  game: {
    supportedVariants: ['standard', 'antidraughts', 'breakthrough', 'fromPosition', 'frisian', 'frysk', 'russian', 'brazilian'],
    supportedPerfs:  ['ultraBullet', 'bullet', 'blitz', 'rapid', 'classical', 'correspondence', 'antidraughts', 'breakthrough', 'frisian', 'frysk', 'russian', 'brazilian', 'puzzle', 'puzzleFrisian'],
    animations: store.prop<boolean>('settings.gameAnimations', true),
    highlights: store.prop<boolean>('settings.boardHighlights', true),
    pieceDestinations: store.prop<boolean>('settings.pieceDestinations', true),
    coords: store.prop<number>('settings.coords', 2),
    coordSystem: store.prop<number>('settings.coordSystem', 0),
    magnified: store.prop<boolean>('settings.pieceMagnified', true),
    zenMode: store.prop<boolean>('settings.zenMode', false),
    kingMoves: store.prop<boolean>('settings.kingMoves', true),
    draughtsResult: store.prop<boolean>('settings.draughtsResult', true),
    clockPosition: store.prop<'right' | 'left'>('settings.game.inversedClockPos', 'right'),
    pieceMove: store.prop<'tap' | 'drag' | 'both'>('settings.game.pieceMove', 'both'),
    moveList: store.prop<boolean>('settings.game.moveList', true),
  },

  analyse: {
    supportedVariants: ['standard', 'antidraughts', 'breakthrough', 'fromPosition', 'frisian', 'frysk', 'russian', 'brazilian'],
    availableVariants: offlineAvailableVariants,
    syntheticVariant: store.prop<VariantKey>('settings.analyse.syntheticVariant', 'standard'),
    enableCeval: store.prop('settings.analyse.enableCeval', false),
    cevalMultiPvs: store.prop<number>('settings.ceval.multipv', 1),
    cevalCores: store.prop<number>('settings.ceval.cores', 1),
    cevalInfinite: store.prop<boolean>('settings.ceval.infinite', false),
    showBestMove: store.prop('settings.analyse.showBestMove', true),
    showComments: store.prop('settings.analyse.showComments', true),
    smallBoard: store.prop<boolean>('settings.analyse.smallBoard', true),
    boardPosition: store.prop<'1' | '2'>('settings.analyse.boardPosition', '1'),
    fullCapture: store.prop<boolean>('settings.fullCapture', false),
    explorer: {
      db: store.prop('settings.analyse.explorer.db', 'lidraughts'),
      availableRatings: [1600, 1800, 2000, 2200, 2500],
      rating: store.prop('settings.analyse.explorer.rating', [1600, 1800, 2000, 2200, 2500]),
      availableSpeeds: ['bullet', 'blitz', 'rapid', 'classical'],
      speed: store.prop('settings.analyse.explorer.speed', ['bullet', 'blitz', 'rapid', 'classical'])
    }
  },

  ai: {
    availableOpponents: [
      ['Scan', '1'],
      ['Scan', '2'],
      ['Scan', '3'],
      ['Scan', '4'],
      ['Scan', '5'],
      ['Scan', '6'],
      ['Scan', '7'],
      ['Scan', '8']
    ],
    color: store.prop<Color | 'random'>('settings.ai.color', 'white'),
    opponent: store.prop('settings.ai.opponent', '1'),
    variant: store.prop<VariantKey>('settings.ai.variant', 'standard'),
    availableVariants: offlineAvailableVariantsWithAi
  },

  otb: {
    flipPieces: store.prop('settings.otb.flipPieces', false),
    variant: store.prop<VariantKey>('settings.otb.variant', 'standard'),
    availableVariants: offlineAvailableVariants,
    whitePlayer: store.prop('settings.otb.whitePlayer', 'White'),
    blackPlayer: store.prop('settings.otb.blackPlayer', 'Black'),

    clock: {
      availableClocks: [
        ['No Clock', 'none'],
        ['Sudden Death', 'simple'],
        ['Increment', 'increment'],
        ['Increment with Handicap', 'handicapInc'],
        ['Simple Delay', 'delay'],
        ['Bronstein Delay', 'bronstein'],
        ['Hourglass', 'hourglass'],
        ['Stage', 'stage']
      ],

      clockType: store.prop<ClockTypeWithNone>('settings.otb.clock.clockType', 'none'),

      simple: {
        time: store.prop('settings.otb.clock.simple.time', '5')
      },

      increment: {
        time: store.prop('settings.otb.clock.increment.time', '3'),
        increment: store.prop('settings.otb.clock.increment.increment', '2')
      },

      handicapInc: {
        topTime: store.prop('settings.otb.clock.handicapInc.topTime', '3'),
        topIncrement: store.prop('settings.otb.clock.handicapInc.topIncrement', '2'),
        bottomTime: store.prop('settings.otb.clock.handicapInc.bottomTime', '3'),
        bottomIncrement: store.prop('settings.otb.clock.handicapInc.bottomIncrement', '2')
      },

      delay: {
        time: store.prop('settings.otb.clock.delay.time', '3'),
        increment: store.prop('settings.otb.clock.delay.increment', '2')
      },

      bronstein: {
        time: store.prop('settings.otb.clock.bronstein.time', '3'),
        increment: store.prop('settings.otb.clock.bronstein.increment', '2')
      },

      hourglass: {
        time: store.prop('settings.otb.clock.hourglass.time', '5')
      },

      stage: {
        stages: store.prop('settings.otb.clock.stage.stages', [{time: '120', moves: '40'}, {time: '60', moves: null}]),
        increment: store.prop('settings.otb.clock.stage.increment', '30')
      },

      availableTimes: [['0', '0'], ['½', '0.5'], ['¾', '0.75'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10'], ['15', '15'], ['20', '20'], ['25', '25'], ['30', '30'], ['45', '45'], ['60', '60'], ['90', '90'], ['120', '120'], ['150', '150'], ['180', '180']
      ],

      availableIncrements: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
        '10', '15', '20', '25', '30', '45', '60', '90', '120', '150', '180'
      ],

      availableMoves: ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60'
      ]
    }
  },

  clock: {
    availableClocks: [
      ['Sudden Death', 'simple'],
      ['Increment', 'increment'],
      ['Increment with Handicap', 'handicapInc'],
      ['Simple Delay', 'delay'],
      ['Bronstein Delay', 'bronstein'],
      ['Hourglass', 'hourglass'],
      ['Stage', 'stage']
    ],

    clockType: store.prop<ClockType>('settings.clock.clockType', 'simple'),

    simple: {
      time: store.prop('settings.clock.simple.time', '5')
    },

    increment: {
      time: store.prop('settings.clock.increment.time', '3'),
      increment: store.prop('settings.clock.increment.increment', '2')
    },

    handicapInc: {
      topTime: store.prop('settings.clock.handicapInc.topTime', '3'),
      topIncrement: store.prop('settings.clock.handicapInc.topIncrement', '2'),
      bottomTime: store.prop('settings.clock.handicapInc.bottomTime', '3'),
      bottomIncrement: store.prop('settings.clock.handicapInc.bottomIncrement', '2')
    },

    delay: {
      time: store.prop('settings.clock.delay.time', '3'),
      increment: store.prop('settings.clock.delay.increment', '2')
    },

    bronstein: {
      time: store.prop('settings.clock.bronstein.time', '3'),
      increment: store.prop('settings.clock.bronstein.increment', '2')
    },

    hourglass: {
      time: store.prop('settings.clock.hourglass.time', '5')
    },

    stage: {
      stages: store.prop('settings.clock.stage.stages', [{time: '120', moves: '40'}, {time: '60', moves: null}]),
      increment: store.prop('settings.clock.stage.increment', '30')
    },

    availableTimes: [['0', '0'], ['½', '0.5'], ['¾', '0.75'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10'], ['15', '15'], ['20', '20'], ['25', '25'], ['30', '30'], ['45', '45'], ['60', '60'], ['90', '90'], ['120', '120'], ['150', '150'], ['180', '180']
    ],

    availableIncrements: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      '10', '15', '20', '25', '30', '45', '60', '90', '120', '150', '180'
    ],

    availableMoves: ['5', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55', '60'
    ]
  },

  gameSetup: {
    availableTimes: [['0', '0'], ['¼', '0.25'], ['½', '0.5'], ['¾', '0.75'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['9', '9'], ['10', '10'], ['15', '15'], ['20', '20'], ['25', '25'], ['30', '30'], ['45', '45'], ['60', '60'], ['90', '90'], ['120', '120'], ['150', '150'], ['180', '180']
    ],
    availableIncrements: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      '10', '15', '20', '25', '30', '45', '60', '90', '120', '150', '180'
    ],
    availableDays: ['1', '2', '3', '5', '7', '10', '14'],
    isTimeValid: function(gameSettings: GameSettings) {
      return gameSettings.timeMode() !== '1' ||
        gameSettings.time() !== '0' ||
        gameSettings.increment() !== '0'
    },

    ai: {
      color: store.prop('settings.game.ai.color', 'random'),
      availableVariants: [
        ['Standard', '1'],
        ['Frisian', '10'],
        ['Frysk!', '8'],
        ['Antidraughts', '6'],
        ['Breakthrough', '9'],
        ['From Position', '3']
      ],
      variant: store.prop('settings.game.ai.variant', '1'),
      availableTimeModes: [
        ['unlimited', '0'],
        ['realTime', '1']
      ],
      timeMode: store.prop('settings.game.ai.clock', '1'),
      time: store.prop('settings.game.ai.time', '10'),
      increment: store.prop('settings.game.ai.increment', '0'),
      days: store.prop('settings.game.ai.days', '2'),
      level: store.prop('settings.game.ai.aiLevel', '3')
    },

    human: {
      availableVariants: [
        ['Standard', '1'],
        ['Frisian', '10'],
        ['Frysk!', '8'],
        ['Antidraughts', '6'],
        ['Breakthrough', '9'],
        ['Russian', '11'],
        ['Brazilian', '12']
      ],
      availableRatingRanges: {
        min: minRatingRanges,
        max: [
          ...minRatingRanges,
          ['2900', '2900']
        ].slice(1)
      },
      ratingMin: store.prop('settings.game.human.rating.min', '800'),
      ratingMax: store.prop('settings.game.human.rating.max', '2900'),
      color: store.prop('settings.game.human.color', 'random'),
      variant: store.prop('settings.game.human.variant', '1'),
      availableTimeModes: [
        ['realTime', '1'],
        ['correspondence', '2'],
        ['unlimited', '0']
      ],
      timeMode: store.prop('settings.game.human.clock', '1'),
      time: store.prop('settings.game.human.time', '5'),
      increment: store.prop('settings.game.human.increment', '0'),
      days: store.prop('settings.game.human.days', '2'),
      mode: store.prop('settings.game.human.mode', '0'),
      preset: store.prop('settings.game.human.preset', 'quick'),
      pool: store.prop('settings.game.human.pool', ''),
    },

    challenge: {
      availableVariants: [
        ['Standard', '1'],
        ['Frisian', '10'],
        ['Frysk!', '8'],
        ['Antidraughts', '6'],
        ['Breakthrough', '9'],
        ['Russian', '11'],
        ['Brazilian', '12'],
        ['From Position', '3']
      ],
      color: store.prop('settings.game.invite.color', 'random'),
      variant: store.prop('settings.game.invite.variant', '1'),
      availableTimeModes: [
        ['realTime', '1'],
        ['correspondence', '2'],
        ['unlimited', '0']
      ],
      timeMode: store.prop('settings.game.invite.clock', '1'),
      time: store.prop('settings.game.invite.time', '5'),
      increment: store.prop('settings.game.invite.increment', '0'),
      days: store.prop('settings.game.invite.days', '2'),
      mode: store.prop('settings.game.invite.mode', '0')
    }
  },

  tournament: {
    availableVariants: [
      ['Standard', '1'],
      ['Frisian', '10'],
      ['Frysk!', '8'],
      ['Antidraughts', '6'],
      ['Breakthrough', '9'],
      ['Russian', '11'],
      ['Brazilian', '12']
    ],
    availableModes: [
      ['casual', '0'],
      ['rated', '1']
    ],
    availableTimes: [['0', '0'], ['¼', '0.25'], ['½', '0.5'], ['¾', '0.75'], ['1', '1'], ['1.5', '1.5'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5'], ['6', '6'], ['7', '7'], ['8', '8'], ['10', '10'], ['15', '15']],
    availableIncrements: ['0', '1', '2', '3', '4', '5', '6', '7', '10'],
    availableDurations: ['20', '25', '30', '35', '40', '45', '50', '55', '60', '70', '80', '90', '100', '110', '120', '150', '180'],
    availableTimesToStart: ['1', '2', '3', '5', '10', '15', '20', '30', '45', '60'],
    variant: store.prop('settings.tournament.variant', '1'),
    mode: store.prop('settings.tournament.mode', '0'),
    time: store.prop('settings.tournament.time', '5'),
    increment: store.prop('settings.tournament.increment', '0'),
    duration: store.prop('settings.tournament.duration', '45'),
    timeToStart: store.prop('settings.tournament.timeToStart', '15'),
    position: store.prop('settings.tournament.timeToStart', '15'),
    private: store.prop('settings.tournament.private', false)
  },

  tv: {
    channel: store.prop('settings.tv.channel', 'best')
  },

  importer: {
    analyse: store.prop('importer.analyse', false)
  },

  training: {
    puzzleBufferLen: 50,
    ratingDiffThreshold: 100,
    variant: store.prop('settings.training.variant', 'standard'),
  },

  study: {
    tour: store.prop<string | null>('study.tour', null)
  },
}
