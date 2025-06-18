module.exports = {
  // https://eslint.org/docs/user-guide/configuring#configuration-cascading-and-hierarchy
  // This option interrupts the configuration hierarchy at this file
  // Remove this if you have an higher level ESLint config file (it usually happens into a monorepos)
  root: true,

  // https://eslint.vuejs.org/user-guide/#how-to-use-a-custom-parser
  // Must use parserOptions instead of "parser" to allow vue-eslint-parser to keep working
  // `parser: 'vue-eslint-parser'` is already included with any 'plugin:vue/**' config and should be omitted
  parserOptions: {
    parser: require.resolve("@typescript-eslint/parser"),
    extraFileExtensions: [".vue"],
  },

  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true,
  },

  // Rules order is important, please avoid shuffling them
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:vue/vue3-strongly-recommended",
    "standard",
    "plugin:storybook/recommended"
  ],

  plugins: [
    // required to apply rules which need type information
    "@typescript-eslint",
    "unused-imports",
    "import",
    // https://eslint.vuejs.org/user-guide/#why-doesn-t-it-work-on-vue-files
    // required to lint *.vue files
    "vue",
  ],

  globals: {
    ga: "readonly", // Google Analytics
    cordova: "readonly",
    __statics: "readonly",
    __QUASAR_SSR__: "readonly",
    __QUASAR_SSR_SERVER__: "readonly",
    __QUASAR_SSR_CLIENT__: "readonly",
    __QUASAR_SSR_PWA__: "readonly",
    process: "readonly",
    Capacitor: "readonly",
    chrome: "readonly",
  },

  // add your custom rules here
  rules: {
    // allow async-await
    "generator-star-spacing": "off",
    // allow paren-less arrow functions
    "arrow-parens": "off",
    "one-var": "off",
    "no-void": "off",
    "multiline-ternary": "off",

    "import/first": "off",
    "import/namespace": "error",
    "import/default": "error",
    "import/export": "error",
    "import/extensions": "off",
    "import/no-unresolved": "off",
    "import/no-extraneous-dependencies": "off",
    "import/no-relative-packages": "error",
    "no-restricted-imports": [
      "error",
      {
        "patterns": [
          {
            "group": ["@features/*", "@shared/*", "@services/*", "src/*"],
            "message": "Use @/ prefix for path aliases (e.g., @/features/*, @/shared/*, @/services/*)"
          }
        ]
      }
    ],

    // The core 'import/named' rules
    // does not work with type definitions
    "import/named": "off",

    "prefer-promise-reject-errors": "off",

    quotes: "off",

    // this rule, if on, would require explicit return type on the `render` function
    "@typescript-eslint/explicit-function-return-type": "off",

    // in plain CommonJS modules, you can't use `import foo = require('foo')` to pass this rule, so it has to be disabled
    "@typescript-eslint/no-var-requires": "off",

    // The core 'no-unused-vars' rules (in the eslint:recommended ruleset)
    // does not work with type definitions
    "no-unused-vars": "warn",
    "@typescript-eslint/no-unused-vars": "off",

    "space-before-function-paren": "off",
    "no-prototype-builtins": "off",

    "@typescript-eslint/no-explicit-any": "off",

    // allow debugger during development only
    "no-debugger": process.env.NODE_ENV === "production" ? "error" : "off",
    "comma-dangle": "off",
    "@typescript-eslint/comma-dangle": "off",
    camelcase: "off",
    "@typescript-eslint/camelcase": "off",

    "unused-imports/no-unused-imports": "warn",
    "import/order": [
      "warn",
      {
        groups: [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
        ],
        pathGroups: [
          {
            pattern: "vue",
            group: "external",
            position: "before"
          },
          {
            pattern: "@/shared/**",
            group: "internal",
            position: "after"
          },
          {
            pattern: "@/features/**",
            group: "internal",
            position: "after"
          },
          {
            pattern: "@/services/**",
            group: "internal",
            position: "after"
          }
        ],
        "newlines-between": "always",
        alphabetize: { order: "asc", caseInsensitive: true },
      },
    ],
    "space-before-blocks": "warn",
    "eol-last": "warn",
    "semi": "warn",
    "no-trailing-spaces": "warn",
    "padding-line-between-statements": [
      "warn",
      { blankLine: "always", prev: "*", next: "function" },
      { blankLine: "always", prev: "*", next: "if" },
      { blankLine: "always", prev: "if", next: "*" },
      { blankLine: "always", prev: "*", next: "return" },
      // { blankLine: "always", prev: "expression", next: "*" },
    ],
  },
}