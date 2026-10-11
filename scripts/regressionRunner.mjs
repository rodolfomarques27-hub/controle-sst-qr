import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root =
    resolve(
        dirname(
            fileURLToPath(
                import.meta.url,
            ),
        ),
        "..",
    );

const regressionTests =
    Object.freeze([
        "acessoUsuarioEmailEdgeFunctionSmokeTest.mjs",
        "auditoriaCampoFotosMultiplasSmokeTest.mjs",
        "certidaoMensalCicloControllerSmokeTest.mjs",
        "certidaoMensalEdgeRegraParitySmokeTest.mjs",
        "certidaoMensalEmailProvedorSharedSmokeTest.mjs",
        "certidaoMensalEmailTenantFrontendSmokeTest.mjs",
        "certidaoMensalEmailTenantScopeSmokeTest.mjs",
        "certidaoMensalItem15SnapshotConfirmadoSmokeTest.mjs",
        "certidaoMensalItem15TemporalSmokeTest.mjs",
        "certidaoMensalRegraCompetenciaSmokeTest.mjs",
        "certidaoMensalValidadeDuplicataHashSmokeTest.mjs",
        "certidaoMensalValidadeEmpateCompetenciaSmokeTest.mjs",
        "certidaoMensalVigenciaCicloSmokeTest.mjs",
        "certidaoMensalVigenciaContratualSmokeTest.mjs",
        "certidaoMensalVigenciaServidorSmokeTest.mjs",
        "certificadosHistoricoSubstituicoesSmokeTest.mjs",
        "certificadosHistoricoUiSmokeTest.mjs",
        "databaseSecurityCheck.mjs",
        "emailProvedorResolverChannelSmokeTest.mjs",
        "emailTenantAdminEdgeSmokeTest.mjs",
        "emailTenantChannelFoundationSmokeTest.mjs",
        "r12g3r10EmailSmokeTest.mjs",
        "relatorioControleFichasEpiFiltrosSmokeTest.mjs",
        "relatorioControleFichasEpiSmokeTest.mjs",
        "relatorioPendenciasCadastraisQrUtilsSmokeTest.mjs",
        "relatorioPendenciasCadastraisUtilsSmokeTest.mjs",
        "treinamentosRevisaoPersistenciaSmokeTest.mjs",
        "treinamentosRevisaoUiSmokeTest.mjs",
    ]);

const blockedTests =
    Object.freeze([
        {
            name:
                "relatorioColaboradoresTreinamentosSmokeTest.mjs",
            reason:
                "html2canvas,jspdf",
        },
        {
            name:
                "relatorioPendenciasCadastraisServiceSmokeTest.mjs",
            reason:
                "html2canvas,jspdf",
        },
        {
            name:
                "relatorioPendenciasTreinamentosSmokeTest.mjs",
            reason:
                "html2canvas,jspdf",
        },
        {
            name:
                "treinamentosRevisaoMotorSmokeTest.mjs",
            reason:
                "vite,absolute-import",
        },
    ]);

if (regressionTests.length !== 28) {
    throw new Error(
        `REGRESSION_MANIFEST_COUNT_INVALID=${regressionTests.length}`,
    );
}

if (
    new Set(
        regressionTests,
    ).size !==
    regressionTests.length
) {
    throw new Error(
        "REGRESSION_MANIFEST_DUPLICATE_TEST",
    );
}

const blockedNames =
    new Set(
        blockedTests.map(
            ({ name }) =>
                name,
        ),
    );

for (const testName of regressionTests) {
    if (
        blockedNames.has(
            testName,
        )
    ) {
        throw new Error(
            `BLOCKED_TEST_IN_REGRESSION_MANIFEST=${testName}`,
        );
    }
}

function buildChildEnvironment() {
    const childEnvironment = {
        NODE_ENV:
            "test",

        CI:
            "1",

        NO_COLOR:
            "1",
    };

    for (
        const variableName of
        [
            "SystemRoot",
            "WINDIR",
            "TEMP",
            "TMP",
        ]
    ) {
        const value =
            process.env[
                variableName
            ];

        if (value) {
            childEnvironment[
                variableName
            ] =
                value;
        }
    }

    return childEnvironment;
}

const failures =
    [];

let passed =
    0;

for (
    let index = 0;
    index < regressionTests.length;
    index += 1
) {
    const testName =
        regressionTests[
            index
        ];

    const testPath =
        resolve(
            root,
            "scripts",
            testName,
        );

    console.log("");
    console.log(
        `[${index + 1}/${regressionTests.length}] TEST=${testName}`,
    );

    const result =
        spawnSync(
            process.execPath,
            [
                testPath,
            ],
            {
                cwd:
                    root,

                env:
                    buildChildEnvironment(),

                encoding:
                    "utf8",

                windowsHide:
                    true,
            },
        );

    if (result.stdout) {
        process.stdout.write(
            result.stdout,
        );
    }

    if (result.stderr) {
        process.stderr.write(
            result.stderr,
        );
    }

    const exitCode =
        Number.isInteger(
            result.status,
        )
            ? result.status
            : 1;

    if (
        result.error ||
        exitCode !== 0
    ) {
        failures.push({
            testName,
            exitCode,
            error:
                result.error
                    ?.message ||
                null,
        });

        console.error(
            `RESULT=FAIL|TEST=${testName}|EXIT=${exitCode}`,
        );

        continue;
    }

    passed +=
        1;

    console.log(
        `RESULT=PASS|TEST=${testName}|EXIT=0`,
    );
}

console.log("");
console.log(
    "============================================================",
);
console.log(
    " SAFESCAN | NODE REGRESSION SUMMARY",
);
console.log(
    "============================================================",
);
console.log(
    `REGRESSION_EXECUTED=${regressionTests.length}`,
);
console.log(
    `REGRESSION_PASSED=${passed}`,
);
console.log(
    `REGRESSION_FAILED=${failures.length}`,
);
console.log(
    `REGRESSION_BLOCKED=${blockedTests.length}`,
);

for (const blocked of blockedTests) {
    console.log(
        `BLOCKED=${blocked.name}|REASON=${blocked.reason}`,
    );
}

if (failures.length > 0) {
    console.error(
        "REGRESSION_FAILURES_BEGIN",
    );

    for (const failure of failures) {
        console.error(
            `FAILED_TEST=${failure.testName}|EXIT=${failure.exitCode}`,
        );

        if (failure.error) {
            console.error(
                `FAILED_ERROR=${failure.error}`,
            );
        }
    }

    console.error(
        "REGRESSION_FAILURES_END",
    );

    process.exitCode =
        1;
}
else {
    console.log(
        "SAFESCAN_REGRESSION_NODE=GREEN",
    );
}