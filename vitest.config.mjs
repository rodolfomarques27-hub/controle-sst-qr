import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment:
            "node",

        globals:
            false,

        include: [
            "tests/regression/**/*.test.js",
        ],

        exclude: [
            "node_modules/**",
            "dist/**",
            ".verify-dist/**",
        ],

        clearMocks:
            true,

        mockReset:
            true,

        restoreMocks:
            true,

        isolate:
            true,

        passWithNoTests:
            false,
    },
});