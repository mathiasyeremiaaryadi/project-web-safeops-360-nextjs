import { readdirSync } from 'node:fs';
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

const FORBIDDEN_IMPORT_PATHS = [
  { name: 'axios', message: 'Use ky via @/lib/api/client.' },
  { name: 'moment', message: 'moment.js is not allowed.' },
  { name: 'prop-types', message: 'Use JSDoc instead of PropTypes.' },
];

const FEATURES = readdirSync(new URL('./src/features', import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

/**
 * A feature may use another feature only through its public `index.js`
 * (`@/features/<other>`), never through its internals (`@/features/<other>/...`).
 */
const featureIsolation = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: FORBIDDEN_IMPORT_PATHS,
        patterns: [
          {
            group: ['@/features/*/**', `!@/features/${feature}/**`],
            message: 'Import another feature only from its public index: @/features/<name>.',
          },
        ],
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      // Never log tokens, passwords or auth responses. Only warn/error are allowed.
      'no-console': ['error', { allow: ['warn', 'error'] }],
      // Leftover imports/variables after a refactor; `_name` marks an intentionally unused one.
      'no-unused-vars': [
        'error',
        { ignoreRestSiblings: true, varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
      ],
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
  ...featureIsolation,
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'playwright-report/**',
    'test-results/**',
    'mockup/**',
  ]),
]);

export default eslintConfig;
