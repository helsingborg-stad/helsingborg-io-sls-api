module.exports = {
  extends: ['eslint:recommended', 'plugin:jest/style', 'plugin:jest/recommended', 'prettier'],
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      impliedStrict: true,
    },
    babelOptions: { rootMode: 'upward' },
  },
  ignorePatterns: ['dist/**/*'],
  env: {
    es2021: true,
    node: true,
    es6: true,
    jest: true,
  },
  rules: {
    'no-console': 1,
  },
  plugins: ['jest'],
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      plugins: ['@typescript-eslint'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
    },
  ],
};
