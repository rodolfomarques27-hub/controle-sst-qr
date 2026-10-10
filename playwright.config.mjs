import {
    defineConfig,
    devices,
} from "@playwright/test";

const BASE_URL =
    "http://127.0.0.1:4173";

export default defineConfig({
    testDir:
        "./tests/e2e",

    testMatch:
        "**/*.spec.js",

    outputDir:
        ".playwright-artifacts-reg3a",

    fullyParallel:
        false,

    workers:
        1,

    retries:
        0,

    forbidOnly:
        true,

    timeout:
        15_000,

    expect: {
        timeout:
            5_000,
    },

    reporter: [
        [
            "line",
        ],
    ],

    use: {
        baseURL:
            BASE_URL,

        serviceWorkers:
            "block",

        trace:
            "off",

        screenshot:
            "off",

        video:
            "off",
    },

    webServer: {
        command:
            "node tests/e2e/helpers/startMockVite.mjs",

        url:
            BASE_URL,

        reuseExistingServer:
            false,

        timeout:
            120_000,
    },

    projects: [
        {
            name:
                "chromium",

            use: {
                ...devices[
                    "Desktop Chrome"
                ],
            },
        },
    ],
});