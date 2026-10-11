import process from "node:process";
import { createServer } from "vite";

process.env.VITE_SUPABASE_URL = "http://127.0.0.1:4173/__mock_supabase__";
process.env.VITE_SUPABASE_ANON_KEY = "reg3b-local-anon-key";

const server = await createServer({
    configLoader: "runner",
    logLevel: "warn",
    server: {
        host: "127.0.0.1",
        port: 4173,
        strictPort: true,
    },
});

await server.listen();

async function encerrar() {
    try {
        await server.close();
    } finally {
        process.exit(0);
    }
}

process.once("SIGTERM", () => {
    void encerrar();
});

process.once("SIGINT", () => {
    void encerrar();
});