/*
 * Copyright (C) 2025 Garrett Brown
 * This file is part of meditation.surf - https://github.com/eigendude/meditation.surf
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 * See the file LICENSE.txt for more information.
 */

// https://docs.expo.dev/guides/using-eslint/
import expoConfig from "eslint-config-expo/flat.js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import { defineConfig } from "eslint/config";
import * as tseslint from "typescript-eslint";

export default defineConfig([
  // Expo config
  expoConfig,

  // TypeScript + Prettier
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        project: "./tsconfig.json",
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      "simple-import-sort": simpleImportSort,
      prettier: prettierPlugin,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      curly: ["error", "all"],
      "simple-import-sort/imports": "error",
      // Run Prettier as an ESLint rule
      "prettier/prettier": "error",
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^err",
        },
      ],
    },
  },

  // JavaScript in the project root + Prettier
  {
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
      },
    },
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      "prettier/prettier": "error",
    },
  },

  // Turn off any ESLint rules that conflict with Prettier
  prettierConfig,

  // Ignore build output and lockfiles
  {
    ignores: ["dist", "webview", "node_modules", "pnpm-lock.yaml"],
  },
]);
