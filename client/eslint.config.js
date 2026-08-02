import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '_salvage']),
  {
    files: ['**/*.{ts,tsx,jsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // This codebase deliberately uses empty catch blocks ("ignore error,
      // error is surfaced elsewhere") — don't flag them.
      'no-empty': ['error', { allowEmptyCatch: true }],
      // Legacy TS files predate the lint config and use `any` in a few places.
      // Keep the rule on (warn) rather than off so new code stays typed.
      '@typescript-eslint/no-explicit-any': 'warn',
      // React 19 + hook effects that intentionally sync state to route/prop
      // changes (e.g. close mobile drawer on navigation) are legitimate here.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
