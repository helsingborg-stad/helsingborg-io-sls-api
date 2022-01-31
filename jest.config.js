/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  transform: {
    '^.+\\.[t|j]sx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      babelConfig: 'babel-base.config.js',
    },
  },
  collectCoverageFrom: ['lambdas/*.js', 'helpers/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
