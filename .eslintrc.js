module.exports = {
    extends: ['plugin:@typescript-eslint/recommended', 'prettier', 'plugin:prettier/recommended'],
    parser: '@typescript-eslint/parser',
    ignorePatterns: ['out', 'babel.config.js'],
    env: {
        node: true,
        es6: true,
        jest: true,
    },
    globals: {
        Atomics: 'readonly',
        SharedArrayBuffer: 'readonly',
    },
    parserOptions: {
        ecmaVersion: 2020,
    },
    plugins: ['prettier'],
    rules: {
        'no-console': 0,
        'no-debugger': 0,
        'no-alert': 0,
        'no-await-in-loop': 0,
        'no-unused-vars': [
            2,
            {
                ignoreRestSiblings: true,
                argsIgnorePattern: 'res|next|^err|^_',
            },
        ],
        'no-unused-expressions': [
            2,
            {
                allowTaggedTemplates: true,
            },
        ],
        'no-param-reassign': [
            2,
            {
                props: false,
            },
        ],
        'import/prefer-default-export': 0,
        import: 0,
        'func-names': 0,
        'space-before-function-paren': 0,
        'comma-dangle': 0,
        'max-len': 0,
        'import/extensions': 0,
        'no-underscore-dangle': 0,
        'consistent-return': 0,
        'prefer-const': [
            'error',
            {
                destructuring: 'all',
            },
        ],
        'arrow-body-style': [2, 'as-needed'],
        'linebreak-style': 0,
        quotes: [
            2,
            'single',
            {
                avoidEscape: true,
                allowTemplateLiterals: true,
            },
        ],
        'prettier/prettier': 'error',
    },
};
