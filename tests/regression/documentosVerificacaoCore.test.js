import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {
    avaliarArquivoBasicoVerificacao,
    avaliarDatasCertificadoVerificacao,
    avaliarDatasDocumentoEmpresaVerificacao,
    criarIndicioVerificacao,
    montarResultadoVerificacaoBase,
} from "../../src/utils/documentosVerificacaoUtils.js";

describe(
    "verificação documental genérica",
    () => {
        beforeEach(
            () => {
                vi.useFakeTimers();

                vi.setSystemTime(
                    new Date(
                        "2026-10-10T12:00:00.000Z",
                    ),
                );
            },
        );

        afterEach(
            () => {
                vi.useRealTimers();
            },
        );

        it(
            "bloqueia registro sem qualquer referência de arquivo",
            () => {
                const indicios =
                    avaliarArquivoBasicoVerificacao();

                expect(
                    indicios,
                ).toHaveLength(
                    1,
                );

                expect(
                    indicios[0],
                ).toMatchObject({
                    codigo:
                        "arquivo_ausente",
                    bloqueia:
                        true,
                });
            },
        );

        it(
            "bloqueia MIME e extensão incompatíveis",
            () => {
                const indicios =
                    avaliarArquivoBasicoVerificacao({
                        arquivoNome:
                            "documento.exe",
                        mimeType:
                            "application/x-msdownload",
                        tamanhoBytes:
                            100000,
                    });

                const codigos =
                    indicios.map(
                        (item) =>
                            item.codigo,
                    );

                expect(
                    codigos,
                ).toContain(
                    "mime_type_nao_recomendado",
                );

                expect(
                    codigos,
                ).toContain(
                    "extensao_nao_recomendada",
                );

                expect(
                    indicios.filter(
                        (item) =>
                            item.bloqueia,
                    ),
                ).toHaveLength(
                    2,
                );
            },
        );

        it(
            "marca nome suspeito sem transformar sozinho o arquivo em bloqueado",
            () => {
                const indicios =
                    avaliarArquivoBasicoVerificacao({
                        arquivoNome:
                            "aso_teste.pdf",
                        mimeType:
                            "application/pdf",
                        tamanhoBytes:
                            100000,
                    });

                expect(
                    indicios,
                ).toHaveLength(
                    1,
                );

                expect(
                    indicios[0],
                ).toMatchObject({
                    codigo:
                        "nome_arquivo_suspeito",
                    bloqueia:
                        false,
                });
            },
        );

        it(
            "não trata documento sem datas como documentalmente completo",
            () => {
                const codigos =
                    avaliarDatasDocumentoEmpresaVerificacao()
                        .map(
                            (item) =>
                                item.codigo,
                        );

                expect(
                    codigos,
                ).toEqual([
                    "sem_data_emissao",
                    "sem_data_vencimento",
                ]);
            },
        );

        it(
            "detecta emissão futura",
            () => {
                const codigos =
                    avaliarDatasDocumentoEmpresaVerificacao({
                        dataEmissao:
                            "2026-10-11",
                        dataVencimento:
                            "2027-10-11",
                    })
                        .map(
                            (item) =>
                                item.codigo,
                        );

                expect(
                    codigos,
                ).toContain(
                    "data_emissao_futura",
                );
            },
        );

        it(
            "bloqueia documento vencido com validade anterior à emissão",
            () => {
                const indicios =
                    avaliarDatasDocumentoEmpresaVerificacao({
                        dataEmissao:
                            "2026-10-20",
                        dataVencimento:
                            "2026-10-09",
                    });

                const bloqueios =
                    indicios
                        .filter(
                            (item) =>
                                item.bloqueia,
                        )
                        .map(
                            (item) =>
                                item.codigo,
                        );

                expect(
                    bloqueios,
                ).toContain(
                    "documento_vencido",
                );

                expect(
                    bloqueios,
                ).toContain(
                    "vencimento_antes_emissao",
                );
            },
        );

        it(
            "não exige vencimento de certificado quando a regra declara validade não aplicável",
            () => {
                const indicios =
                    avaliarDatasCertificadoVerificacao({
                        dataRealizacao:
                            "2026-10-01",
                        dataVencimento:
                            "",
                        exigeVencimento:
                            false,
                    });

                expect(
                    indicios,
                ).toEqual(
                    [],
                );
            },
        );

        it(
            "força resultado bloqueado e risco crítico quando existe indício bloqueante",
            () => {
                const indicio =
                    criarIndicioVerificacao({
                        codigo:
                            "teste_bloqueio",
                        titulo:
                            "Bloqueio",
                        peso:
                            1,
                        bloqueia:
                            true,
                    });

                const resultado =
                    montarResultadoVerificacaoBase({
                        indicios: [
                            indicio,
                        ],
                    });

                expect(
                    resultado,
                ).toMatchObject({
                    status_verificacao:
                        "bloqueado",
                    nivel_risco:
                        "critico",
                    score_risco:
                        100,
                });
            },
        );
    },
);