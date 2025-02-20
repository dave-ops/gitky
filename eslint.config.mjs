import globals from "globals";
import pluginJs from "@eslint/js";

/** @type {import('eslint').Linter.Config[]} */
export default [
  // Configuration for JavaScript files
  { 
    files: ["**/*.js"], 
    languageOptions: { 
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        __dirname: 'readonly', // Adding __dirname as a global to avoid 'no-undef' errors
      }
    }
  },
  // Ignore patterns
  {
    ignores: [
      'node_modules',
      'dist',
      'cloned_repos',
      '.workspace'
    ]
  },
  // Recommended rules from @eslint/js
  pluginJs.configs.recommended,
  // Custom rules for JS and JSON files
  {
    files: ["**/*.js", "**/*.json"],
    rules: {
      "no-tabs": "error",          // Disallow tabs
      "indent": ["error", 4]       // Enforce 4-space indentation
    }
  }
];