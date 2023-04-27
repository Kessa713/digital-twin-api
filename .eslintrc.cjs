module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'airbnb',
  ],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'jest'],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
      node: {
        extensions: ['.js', '.ts'],
      },
    },
  },
  env: {
    es2021: true,
    mocha: true,
    "jest/globals": true,
  },
  rules: {
    'import/extensions': 'off',
    'import/no-absolute-path': 'off',
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': 'off',

    // Reports incorrect errors when used with typescript
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],

    'max-len': 'off',
    // 'newline-per-chained-call': 'off',
    // 'no-param-reassign': 'off',
    // 'no-nested-ternary': 'off',
    'no-restricted-syntax': 'off',
    'arrow-body-style': 'off',

    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/no-empty-function': 'off',
  },
  overrides: [
    {
      files: ['*.test.ts'],
      rules: {
        'no-unused-vars': 'off',
        'no-unused-expressions': 'off',
        'no-underscore-dangle': 'off',
        camelcase: 'off',
      },
    },
  ],
};
