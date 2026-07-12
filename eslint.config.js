import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default [
    {
        ignores: [
            "dist/**",
            "node_modules/**",
            "backups/**",
            "backups-locais/**",
            ".vs/**",
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
            ...reactHooks.configs["recommended-latest"].rules,
            "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
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
