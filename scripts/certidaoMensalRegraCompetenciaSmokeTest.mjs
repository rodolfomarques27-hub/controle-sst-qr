import assert from "node:assert/strict";

import {
    CERTIDAO_MENSAL_DOCUMENTOS,
    CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS,
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS,
    CERTIDAO_MENSAL_STATUS_EFETIVO,
    criarItensExternosPendentesCompetencia,
    listarPendenciasCobraveisCompetencia,
    montarChecklistEfetivoCompetencia,
    normalizarCompetenciaRegraMensal,
    obterUltimoDiaCompetencia,
    resolverDocumentoNaCompetencia,
} from "../src/features/certidao-mensal-documental/domain/certidaoMensalRegraCompetencia.js";

assert.equal(
    CERTIDAO_MENSAL_DOCUMENTOS.length,
    17,
    "O checklist deve manter dezessete itens.",
);

assert.equal(
    CERTIDAO_MENSAL_DOCUMENTOS_EXTERNOS.length,
    15,
    "O checklist deve manter quinze documentos cobrados da contratada.",
);

assert.equal(
    CERTIDAO_MENSAL_DOCUMENTOS_AUTOMATICOS.length,
    2,
    "O checklist deve manter dois itens automáticos internos.",
);

assert.equal(
    normalizarCompetenciaRegraMensal("07/2026"),
    "2026-07-01",
);

assert.equal(
    normalizarCompetenciaRegraMensal("2026-08"),
    "2026-08-01",
);

assert.equal(
    obterUltimoDiaCompetencia("02/2028"),
    "2028-02-29",
    "O cálculo deve respeitar ano bissexto.",
);

{
    const itens =
        criarItensExternosPendentesCompetencia();

    assert.equal(
        itens.length,
        15,
        "A materialização inicial deve criar quinze itens externos.",
    );

    assert.ok(
        itens.every(
            (item) =>
                item.status ===
                    CERTIDAO_MENSAL_STATUS_EFETIVO.PENDENTE &&
                item.origem ===
                    "UPLOAD" &&
                item.versaoAtualId ===
                    null,
        ),
        "Itens externos novos devem nascer pendentes e sem PDF.",
    );
}

{
    const checklist =
        montarChecklistEfetivoCompetencia({
            competencia:
                "08/2026",
        });

    const pendencias =
        listarPendenciasCobraveisCompetencia(
            checklist,
        );

    assert.equal(
        pendencias.length,
        15,
        "Sem nenhum documento, o e-mail deve cobrar os quinze externos.",
    );

    assert.ok(
        pendencias.every(
            (item) =>
                item.status ===
                CERTIDAO_MENSAL_STATUS_EFETIVO.PENDENTE,
        ),
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "fgts",
            competencia:
                "07/2026",
            versoes: [
                {
                    id:
                        "fgts-julho",
                    tipoDocumento:
                        "fgts",
                    competencia:
                        "07/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-07-10",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "FGTS da própria competência deve atender o mês.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "fgts",
            competencia:
                "08/2026",
            versoes: [
                {
                    id:
                        "fgts-julho",
                    tipoDocumento:
                        "fgts",
                    competencia:
                        "07/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-07-10",
                    dataValidadeIso:
                        "2026-12-31",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.PENDENTE,
        "Documento mensal de julho não pode atender agosto.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "08/2026",
            versoes: [
                {
                    id:
                        "cnd-julho",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "07/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-07-10",
                    dataValidadeIso:
                        "2026-12-31",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "Documento anterior ainda válido deve atender o mês seguinte.",
    );

    assert.equal(
        resultado.herdado,
        true,
        "A evidência reutilizada deve ser marcada como herdada.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "08/2026",
            versoes: [
                {
                    id:
                        "cnd-julho-vencida",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "07/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-07-01",
                    dataValidadeIso:
                        "2026-08-15",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "Documento válido em parte do mês deve atender a competência pela interseção da vigência.",
    );

    assert.equal(
        resultado.herdado,
        true,
        "A competência coberta por validade de documento anterior deve manter a origem herdada.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "07/2026",
            versoes: [
                {
                    id:
                        "cnd-agosto",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "08/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-08-02",
                    dataValidadeIso:
                        "2027-01-31",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.PENDENTE,
        "Documento futuro não pode corrigir uma competência anterior.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "08/2026",
            versoes: [
                {
                    id:
                        "cnd-julho-valida",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "07/2026",
                    status:
                        "CONFORME",
                    dataEmissaoIso:
                        "2026-07-01",
                    dataValidadeIso:
                        "2026-12-31",
                },
                {
                    id:
                        "cnd-agosto-nao-conforme",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "08/2026",
                    status:
                        "NAO_CONFORME",
                    dataEmissaoIso:
                        "2026-08-03",
                    dataValidadeIso:
                        "2027-01-31",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.NAO_CONFORME,
        "Uma versão atual não conforme não pode ser escondida pela versão anterior.",
    );
}

{
    const versaoCndReal = {
        id:
            "cnd-real-23-09-2025",
        tipoDocumento:
            "cnd-federal",
        competencia:
            "01/2026",
        status:
            "EM_ANALISE",
        avaliacao: {
            dadosTemporais: {
                dataEmissaoIso:
                    "2025-09-23",
                dataValidadeIso:
                    "2026-03-22",
            },
            regras: [
                {
                    codigo:
                        "TIPO_DOCUMENTAL",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "CNPJ_DOCUMENTO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "NATUREZA_CERTIDAO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "DATA_EMISSAO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "VALIDADE_DOCUMENTO",
                    status:
                        "REPROVADA",
                },
                {
                    codigo:
                        "CODIGO_CONTROLE",
                    status:
                        "APROVADA",
                },
            ],
        },
    };

    for (
        const competenciaCoberta of [
            "09/2025",
            "01/2026",
            "02/2026",
            "03/2026",
        ]
    ) {
        const resultado =
            resolverDocumentoNaCompetencia({
                tipoDocumento:
                    "cnd-federal",
                competencia:
                    competenciaCoberta,
                versoes: [
                    versaoCndReal,
                ],
            });

        assert.equal(
            resultado.status,
            CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
            `${competenciaCoberta} deve ser coberta pela CND emitida em 23/09/2025 e válida até 22/03/2026.`,
        );
    }

    const abril =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "04/2026",
            versoes: [
                versaoCndReal,
            ],
        });

    assert.equal(
        abril.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.VENCIDO,
        "ABR/2026 deve ficar VENCIDO porque existe CND apresentada, mas sua validade terminou em 22/03/2026.",
    );
}

{
    const versaoComDivergenciaTecnica = {
        id:
            "cnd-com-divergencia",
        tipoDocumento:
            "cnd-federal",
        competencia:
            "01/2026",
        status:
            "EM_ANALISE",
        avaliacao: {
            dadosTemporais: {
                dataEmissaoIso:
                    "2025-09-23",
                dataValidadeIso:
                    "2026-03-22",
            },
            regras: [
                {
                    codigo:
                        "TIPO_DOCUMENTAL",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "CNPJ_DOCUMENTO",
                    status:
                        "REPROVADA",
                },
                {
                    codigo:
                        "VALIDADE_DOCUMENTO",
                    status:
                        "REPROVADA",
                },
            ],
        },
    };

    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "01/2026",
            versoes: [
                versaoComDivergenciaTecnica,
            ],
        });

    assert.notEqual(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "Uma divergência técnica real, como CNPJ reprovado, nunca pode ser promovida automaticamente para Conforme.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "08/2026",
            versoes: [
                {
                    id:
                        "cnd-reenvio-expirada",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "01/2026",
                    status:
                        "REENVIO_SOLICITADO",
                    dataEmissaoIso:
                        "2025-09-23",
                    dataValidadeIso:
                        "2026-03-22",
                },
            ],
            itemPersistido: {
                status:
                    "REENVIO_SOLICITADO",
            },
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.VENCIDO,
        "Em AGO/2026, uma CND vencida em 22/03/2026 deve continuar documentalmente VENCIDA mesmo quando o reenvio já foi solicitado.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "02/2026",
            versoes: [
                {
                    id:
                        "cnd-reenvio-ainda-valida",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "01/2026",
                    status:
                        "REENVIO_SOLICITADO",
                    dataEmissaoIso:
                        "2025-09-23",
                    dataValidadeIso:
                        "2026-03-22",
                },
            ],
            itemPersistido: {
                status:
                    "REENVIO_SOLICITADO",
            },
        });

    assert.notEqual(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.VENCIDO,
        "Uma tratativa de reenvio não pode transformar em VENCIDO um documento que ainda estava temporalmente válido na competência.",
    );
}

{
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "07/2026",
            competenciaFechada:
                true,
            itemPersistido: {
                status:
                    "CONFORME",
                versaoOrigemId:
                    "versao-historica",
            },
            versoes: [
                {
                    id:
                        "versao-nova",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "08/2026",
                    status:
                        "NAO_CONFORME",
                },
            ],
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "Competência fechada deve preservar a fotografia histórica.",
    );

    assert.equal(
        resultado.origemResolucao,
        "HISTORICO_FECHADO",
    );
}

console.log(
    "CERTIDÃO MENSAL — REGRA DE COMPETÊNCIA APROVADA",
);

console.log(
    "Cenários validados: 15 documentos externos, ausência total, documento mensal, validade, herança, bloqueio futuro e histórico fechado.",
);

console.log(
    "Nenhuma RPC, conexão Supabase, alteração de banco, deploy ou envio de e-mail foi realizada.",
);


{
    /*
     * D5.2 — CND regida por VALIDADE.
     */
    const versao = {
        id:
            "cnd-reenvio-historico-validade-d52",
        tipoDocumento:
            "cnd-federal",
        competencia:
            "01/2026",
        status:
            "REENVIO_SOLICITADO",
        avaliacao: {
            dadosTemporais: {
                dataEmissaoIso:
                    "2025-09-23",
                dataValidadeIso:
                    "2026-03-22",
            },
            regras: [
                {
                    codigo:
                        "TIPO_DOCUMENTAL",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "CNPJ_DOCUMENTO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "NATUREZA_CERTIDAO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "DATA_EMISSAO",
                    status:
                        "APROVADA",
                },
                {
                    codigo:
                        "VALIDADE_DOCUMENTO",
                    status:
                        "REPROVADA",
                },
                {
                    codigo:
                        "CODIGO_CONTROLE",
                    status:
                        "APROVADA",
                },
            ],
        },
    };

    for (
        const competenciaCoberta of [
            "09/2025",
            "01/2026",
            "02/2026",
            "03/2026",
        ]
    ) {
        const resultado =
            resolverDocumentoNaCompetencia({
                tipoDocumento:
                    "cnd-federal",
                competencia:
                    competenciaCoberta,
                versoes: [
                    versao,
                ],
                itemPersistido: {
                    status:
                        "REENVIO_SOLICITADO",
                },
            });

        assert.equal(
            resultado.status,
            CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
            "A CND deve permanecer CONFORME nas competências cobertas pelo período de 23/09/2025 a 22/03/2026, mesmo com reenvio solicitado posteriormente.",
        );
    }

    for (
        const competenciaVencida of [
            "04/2026",
            "08/2026",
        ]
    ) {
        const resultado =
            resolverDocumentoNaCompetencia({
                tipoDocumento:
                    "cnd-federal",
                competencia:
                    competenciaVencida,
                versoes: [
                    versao,
                ],
                itemPersistido: {
                    status:
                        "REENVIO_SOLICITADO",
                },
            });

        assert.equal(
            resultado.status,
            CERTIDAO_MENSAL_STATUS_EFETIVO.VENCIDO,
            "A CND deve permanecer VENCIDA nas competências posteriores ao término de sua validade em 22/03/2026.",
        );
    }
}

{
    /*
     * Segurança D5.2:
     * divergência técnica real continua soberana.
     */
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "cnd-federal",
            competencia:
                "02/2026",
            versoes: [
                {
                    id:
                        "cnd-reenvio-divergencia-d52",
                    tipoDocumento:
                        "cnd-federal",
                    competencia:
                        "01/2026",
                    status:
                        "REENVIO_SOLICITADO",
                    avaliacao: {
                        dadosTemporais: {
                            dataEmissaoIso:
                                "2025-09-23",
                            dataValidadeIso:
                                "2026-03-22",
                        },
                        regras: [
                            {
                                codigo:
                                    "TIPO_DOCUMENTAL",
                                status:
                                    "APROVADA",
                            },
                            {
                                codigo:
                                    "CNPJ_DOCUMENTO",
                                status:
                                    "REPROVADA",
                            },
                            {
                                codigo:
                                    "VALIDADE_DOCUMENTO",
                                status:
                                    "APROVADA",
                            },
                        ],
                    },
                },
            ],
            itemPersistido: {
                status:
                    "REENVIO_SOLICITADO",
            },
        });

    assert.notEqual(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.CONFORME,
        "CND com divergência técnica real de CNPJ não pode ser promovida para CONFORME.",
    );
}

{
    /*
     * Segurança D5.2:
     * documento mensal não pode herdar regra de VALIDADE.
     */
    const resultado =
        resolverDocumentoNaCompetencia({
            tipoDocumento:
                "fgts",
            competencia:
                "02/2026",
            versoes: [
                {
                    id:
                        "fgts-reenvio-mensal-d52",
                    tipoDocumento:
                        "fgts",
                    competencia:
                        "02/2026",
                    status:
                        "REENVIO_SOLICITADO",
                    avaliacao: {
                        dadosTemporais: {
                            dataEmissaoIso:
                                "2026-02-10",
                            dataValidadeIso:
                                "2026-02-28",
                        },
                        regras: [
                            {
                                codigo:
                                    "TIPO_DOCUMENTAL",
                                status:
                                    "APROVADA",
                            },
                            {
                                codigo:
                                    "CNPJ_DOCUMENTO",
                                status:
                                    "APROVADA",
                            },
                        ],
                    },
                },
            ],
            itemPersistido: {
                status:
                    "REENVIO_SOLICITADO",
            },
        });

    assert.equal(
        resultado.status,
        CERTIDAO_MENSAL_STATUS_EFETIVO.REENVIO_SOLICITADO,
        "FGTS é documento mensal e deve continuar REENVIO_SOLICITADO.",
    );
}
