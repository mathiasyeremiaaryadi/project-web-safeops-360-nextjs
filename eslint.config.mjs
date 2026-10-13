import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const FORBIDDEN_IMPORT_PATHS = [
  { name: 'axios', message: 'Use ky via @/lib/api/client.' },
  { name: 'moment', message: 'moment.js is not allowed.' },
  { name: 'prop-types', message: 'Use JSDoc instead of PropTypes.' },
];

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Never log tokens, passwords or auth responses. Only warn/error are allowed.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'no-restricted-globals': [
        'error',
        {
          name: 'sessionStorage',
          message: 'Do not use sessionStorage (token storage is forbidden).',
        },
      ],
      'react/no-danger': 'error',
      'no-restricted-imports': ['error', { paths: FORBIDDEN_IMPORT_PATHS }],
    },
  },
  {
    // Features must not import from other features.
    files: ['src/features/auth/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: FORBIDDEN_IMPORT_PATHS,
          patterns: [
            {
              group: ['@/features/*', '!@/features/auth', '!@/features/auth/**'],
              message: 'A feature must not import from another feature.',
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/mockServiceWorker.js',
    'playwright-report/**',
    'test-results/**',
    'mockup/**',
  ]),
]);

export default eslintConfig;
