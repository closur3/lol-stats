import eslint from "@eslint/js";

const radiusTokenRule = {
  meta: {
    type: "problem",
    schema: [],
    messages: {
      invalidRadius: "border-radius must use a radius token or 0, received: {{ value }}"
    }
  },
  create(context) {
    const isAllowedRadius = value => value
      .trim()
      .split(/\s+/)
      .every(token => token === "0" || /^var\(--radius-(card|control|badge|circle)\)$/.test(token));

    return {
      TemplateElement(node) {
        const declarations = node.value.raw.matchAll(/border-radius\s*:\s*([^;}]+)/g);
        for (const declaration of declarations) {
          const value = declaration[1].trim();
          if (!isAllowedRadius(value)) {
            context.report({ node, messageId: "invalidRadius", data: { value } });
          }
        }
      }
    };
  }
};

export default [
  {
    ignores: ["node_modules/", ".wrangler/", "tests/", "coverage/"]
  },
  eslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        fetch: "readonly",
        Response: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        HTMLRewriter: "readonly",
        caches: "readonly",
        crypto: "readonly"
      }
    },
    rules: {
      "no-empty": ["warn", { "allowEmptyCatch": true }],
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "caughtErrorsIgnorePattern": "^_" }],
      "no-case-declarations": "warn",
      "no-constant-condition": ["warn", { "checkLoops": false }],
      "camelcase": ["error", { "properties": "never", "ignoreDestructuring": true }],
      "id-length": ["error", { "min": 2 }]
    }
  },
  {
    files: ["src/styles/**/*.js"],
    plugins: {
      "style-contract": {
        rules: {
          "radius-token": radiusTokenRule
        }
      }
    },
    rules: {
      "style-contract/radius-token": "error"
    }
  }
];
