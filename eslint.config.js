import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    {
        ignores: [
            "dist/**",
            ".verify-dist/**",
            "node_modules/**",
            ".vercel/**",
            ".codex-*/**",
        ],
    },
    js.configs.recommended,
    {
        files: ["scripts/**/*.{js,mjs,cjs}", "*.cjs", "*.mjs"],
        languageOptions: {
            globals: {
                ...globals.node,
            },
        },
    },
    {
        files: ["src/**/*.{js,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        plugins: {
            "react-hooks": reactHooks,
            "react-refresh": reactRefresh,
        },
        rules: {
            ...reactHooks.configs.recommended.rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
            "no-unused-vars": "warn",
            "no-undef": "warn",
            "no-constant-binary-expression": "warn",
            "no-extra-boolean-cast": "warn",
            "no-useless-escape": "warn",
            "no-useless-assignment": "warn",
            "no-control-regex": "warn",
            "preserve-caught-error": "warn",
            "react-hooks/set-state-in-effect": "warn",
            "react-hooks/static-components": "warn",
            "react-hooks/use-memo": "warn",
            "react-hooks/preserve-manual-memoization": "warn",
            "react-hooks/incompatible-library": "warn",
            "react-hooks/immutability": "warn",
            "react-hooks/globals": "warn",
            "react-hooks/refs": "warn",
            "react-hooks/error-boundaries": "warn",
            "react-hooks/purity": "warn",
            "react-hooks/set-state-in-render": "warn",
            "react-hooks/unsupported-syntax": "warn",
            "react-hooks/config": "warn",
            "react-hooks/gating": "warn",
        },
    },
    {
        files: [
            "src/components/FileUploadAviso.jsx",
            "src/components/commonComponents.jsx",
            "src/components/qr/AuditoriaCampoQRCode.jsx",
            "src/components/qr/QrCodeComLogo.jsx",
        ],
        rules: {
            "react-refresh/only-export-components": "off",
        },
    },
];
