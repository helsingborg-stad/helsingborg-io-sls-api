module.exports = {
  transform: {
    '^.+\\.[t|j]sx?$': 'ts-jest',
  },
  globals: {
    'ts-jest': {
      babelConfig: 'babel.config.js',
    },
  },
  coveragePathIgnorePatterns: ['/libs/'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
