import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const projectRoot = process.cwd();
const npmCli = process.env.npm_execpath;
let buildDirectory = "";

function executarNpm(argumentos) {
    if (!npmCli) {
        throw new Error("npm_execpath nao esta disponivel; execute pelo script npm check:release.");
    }

    console.log(`\n[RELEASE] npm ${argumentos.join(" ")}`);
    execFileSync(process.execPath, [npmCli, ...argumentos], {
        cwd: projectRoot,
        stdio: "inherit",
        windowsHide: true,
    });
}

try {
    JSON.parse(readFileSync(path.join(projectRoot, "vercel.json"), "utf8"));
    buildDirectory = mkdtempSync(path.join(os.tmpdir(), "controle-sst-release-"));

    executarNpm(["run", "check:integridade"]);
    executarNpm(["run", "lint"]);
    executarNpm(["audit", "--omit=dev", "--audit-level=high"]);
    executarNpm([
        "run",
        "build",
        "--",
        "--configLoader",
        "runner",
        "--outDir",
        buildDirectory,
        "--emptyOutDir",
    ]);

    console.log("\n[RELEASE] Pacote aprovado para revisao final e publicacao.");
} catch (error) {
    console.error(`\n[RELEASE] Verificacao interrompida: ${error?.message || error}`);
    process.exitCode = error?.status || 1;
} finally {
    if (buildDirectory) {
        try {
            rmSync(buildDirectory, { recursive: true, force: true });
        } catch {
            console.warn(`[RELEASE] Nao foi possivel limpar ${buildDirectory}.`);
        }
    }
}
