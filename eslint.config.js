import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      // 코드 컨벤션 7장: const 우선, var 금지, === 비교
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],
      // JSX에서만 쓰인 컴포넌트 import를 미사용으로 잡지 않도록
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  {
    files: ['*.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  // Supabase는 services/ 함수로만 불러요. RLS에 막히면 0행이 돌아오는 것처럼 직접 다루면 놓치기 쉬운 게 많아서예요.
  {
    files: ['src/**/*.{js,jsx}'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: '@supabase/supabase-js', message: 'services/ 함수를 거쳐 주세요.' }],
          patterns: [
            {
              // 상대 경로('../services/supabase')와 확장자를 붙인 경로도 막아요.
              group: [
                '**/services/supabase',
                '**/services/supabase.js',
                '**/services/getSupabase',
                '**/services/getSupabase.js',
              ],
              message:
                'Supabase는 services/ 함수로만 불러요. 필요한 함수가 없으면 services/에 추가해 주세요.',
            },
          ],
        },
      ],
    },
  },
  // Prettier와 겹치는 포맷 규칙은 끄기 (항상 마지막에)
  eslintConfigPrettier,
]);
