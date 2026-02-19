import js from "@eslint/js";
import globals from "globals";
import json from "@eslint/json";
import { defineConfig } from "eslint/config";
// import { jest } from "eslint-plugin-jest";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.node },
    ignores:[
      "**/migrations/**",
      "**/seeders/**"
    ],
    rules:{
      "no-unused-vars": "off"
    }
  },
  {
    files: ["**/*.json"],
    plugins: { json },
    language: "json/json",
    extends: ["json/recommended"],
  },
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
