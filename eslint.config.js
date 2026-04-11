import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import { defineConfig, globalIgnores } from "eslint/config";
// import { jest } from "eslint-plugin-jest";
import tseslint from 'typescript-eslint'


export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    ignores: ["**/migrations/**", "**/seeders/**"],
    rules: {
      "no-unused-vars": "off",
    },
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
  {
    files: ["**/*.ts"],
    plugins: { tseslint },
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ]
  }
  // {
  //   files: ["test/**"],
  //   ...jest.configs["flat/recommended"],
  //   rules: {
  //     ...jest.configs["flat/recommended"].rules,
  //     "jest/prefer-expect-assertions": "off",
  //   },
  // },
  // you can also configure jest rules in other objects, so long as some of the `files` match
  // {
  //   files: ["test/**"],
  //   rules: { "jest/prefer-expect-assertions": "off" },
  // },
]);
