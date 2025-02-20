import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.js"], languageOptions: {sourceType: "commonjs"}},
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  {
    files: ["**/*.js", "**/*.json"], // Apply to both JS and JSON files
    rules: {
      "no-tabs": "error",          // Disallow tabs
      "indent": ["error", 4]       // Enforce 4-space indentation
    }
  }
];