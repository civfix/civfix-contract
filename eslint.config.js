import eslint from "@eslint/js"
import tseslint from "typescript-eslint"

// The @civfix/contract contract must stay framework-free: never import or re-export react / react-dom /
// react-native (or any react-native-* lib) or @civfix/ui. @civfix/ui depends ON this package, never the
// reverse, and the backend pins @civfix/contract and must not be able to pull React/RN or the design tokens in through it.
/** @type {import("eslint").Linter.RulesRecord} */
const FRAMEWORK_FREE_IMPORTS = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        { name: "react", message: "@civfix/contract must stay framework-free; React belongs in @civfix/ui." },
        { name: "react-dom", message: "@civfix/contract must stay framework-free; react-dom belongs in @civfix/ui." },
        { name: "react-native", message: "@civfix/contract must stay framework-free; react-native belongs in @civfix/ui." },
        { name: "@civfix/ui", message: "@civfix/contract must not depend on @civfix/ui (the dependency runs the other way)." },
        { name: "@civfix/tokens", message: "@civfix/contract must not depend on @civfix/tokens: the backend reads the contract and must not pull UI packages in." },
      ],
      patterns: [
        {
          group: ["react-native-*"],
          message: "@civfix/contract must stay framework-free; react-native-* libs belong in @civfix/ui.",
        },
        {
          group: ["@civfix/ui/*"],
          message: "@civfix/contract must not depend on @civfix/ui subpaths (the dependency runs the other way).",
        },
      ],
    },
  ],
}

/** @type {import("eslint").Linter.RulesRecord} */
const TYPED_RULES = {
  // node:test's test() returns a promise the runner itself tracks.
  "@typescript-eslint/no-floating-promises": [
    "error",
    { allowForKnownSafeCalls: [{ from: "package", package: "node:test", name: ["test", "describe", "it"] }] },
  ],
  "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: { attributes: true } }],
  // A `default` branch is a deliberate catch-all; the rule only has to catch a switch that silently
  // falls through to undefined when a union grows.
  "@typescript-eslint/switch-exhaustiveness-check": ["error", { considerDefaultExhaustiveForUnions: true }],
  "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports", fixStyle: "separate-type-imports" }],
  "@typescript-eslint/no-unsafe-argument": "error",
  "@typescript-eslint/no-unsafe-assignment": "error",
  "@typescript-eslint/no-unsafe-call": "error",
  "@typescript-eslint/no-unsafe-member-access": "error",
  "@typescript-eslint/no-unsafe-return": "error",
  "@typescript-eslint/no-unsafe-enum-comparison": "error",
  "@typescript-eslint/no-unsafe-enum-assignment": "error",
  "@typescript-eslint/no-unsafe-unary-minus": "error",
  "@typescript-eslint/no-unsafe-declaration-merging": "error",
  "@typescript-eslint/no-unsafe-function-type": "error",
  "@typescript-eslint/no-unnecessary-condition": "error",
  "@typescript-eslint/no-unnecessary-type-assertion": "error",
  "@typescript-eslint/restrict-template-expressions": [
    "error",
    { allowNumber: true, allowAny: false, allowBoolean: false, allowNullish: false, allowRegExp: false, allowNever: false },
  ],
  "@typescript-eslint/restrict-plus-operands": "error",
  "@typescript-eslint/prefer-nullish-coalescing": "error",
  "@typescript-eslint/prefer-promise-reject-errors": "error",
  "@typescript-eslint/only-throw-error": "error",
  "@typescript-eslint/no-base-to-string": "error",
  "@typescript-eslint/no-misused-spread": "error",
  "@typescript-eslint/no-dynamic-delete": "error",
  "@typescript-eslint/use-unknown-in-catch-callback-variable": "error",
  "@typescript-eslint/no-non-null-assertion": "error",
}

export default tseslint.config(
  {
    ignores: ["dist/**", "node_modules/**", "*.config.js", "*.config.ts"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: TYPED_RULES,
  },
  {
    files: ["src/**/*.ts", "src/**/*.tsx"],
    rules: FRAMEWORK_FREE_IMPORTS,
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: { process: "readonly", console: "readonly", URL: "readonly" },
      parserOptions: {
        projectService: false,
        project: "./tsconfig.scripts.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: TYPED_RULES,
  },
  {
    files: ["__tests__/**", "src/**/__tests__/**", "scripts/**/*.test.mjs"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
)
