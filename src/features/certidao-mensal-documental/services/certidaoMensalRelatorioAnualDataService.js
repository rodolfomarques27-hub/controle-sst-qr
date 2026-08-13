import {
    resolverDocumentoNaCompetencia,
} from "../domain/certidaoMensalRegraCompetencia.js";

import {
    classificarCompetenciaVigenciaContratual,
} from "../domain/certidaoMensalVigenciaContratual.js";
import {
    montarPerfilDocumentalCompetencia,
} from "../domain/certidaoMensalPerfilDocumental.js";
import {
    DOCUMENTOS_CERTIDAO_MENSAL_BASE,
} from "../constants/certidaoMensalConstants.js";

export const MESES_RELATORIO_ANUAL_CERTIDAO = Object.freeze([
    { numero: 1, rotulo: "JAN" },
    { numero: 2, rotulo: "FEV" },
    { numero: 3, rotulo: "MAR" },
    { numero: 4, rotulo: "ABR" },
    { numero: 5, rotulo: "MAI" },
    { numero: 6, rotulo: "JUN" },
    { numero: 7, rotulo: "JUL" },
    { numero: 8, rotulo: "AGO" },
    { numero: 9, rotulo: "SET" },
    { numero: 10, rotulo: "OUT" },
    { numero: 11, rotulo: "NOV" },
    { numero: 12, rotulo: "DEZ" },
]);

const STATUS_CONFORME = new Set([
    "CONFORME",
]);

const STATUS_FORA_CONTAGEM = new Set([
    "DISPENSADO",
]);

function itemEhNaoAplicavelNaCompetencia(
    item,
) {
    const tipoDocumento =
        textoSeguro(
            item?.tipo_documento ||
            item?.tipoDocumento,
            120,
        )
            .trim()
            .toLowerCase();

    if (
        tipoDocumento !==
        "esocial"
    ) {
        return false;
    }

    return (
        textoSeguro(
            item?.aplicabilidade,
            60,
        )
            .trim()
            .toUpperCase() ===
        "NAO_APLICAVEL"
    );
}

const DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL =
    DOCUMENTOS_CERTIDAO_MENSAL_BASE.filter(
        (documento) => !documento.origemSistema,
    );

const TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL = new Set(
    DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.map(
        (documento) => documento.id,
    ),
);

const TOTAL_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL =
    DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.length;

function criarMapaRegrasPerfilPorEmpresa(
    regrasPerfil = [],
) {
    const mapa = new Map();

    for (
        const regra of
        Array.isArray(regrasPerfil)
            ? regrasPerfil
            : []
    ) {
        const empresaId = String(
            regra?.empresaId ||
            regra?.empresa_id ||
            "",
        ).trim();

        if (!empresaId) {
            continue;
        }

        const lista =
            mapa.get(empresaId) || [];

        lista.push(regra);
        mapa.set(empresaId, lista);
    }

    return mapa;
}

function resolverPerfilExternoCompetencia({
    empresaId,
    competencia,
    regrasPerfil = [],
} = {}) {
    const perfil =
        montarPerfilDocumentalCompetencia({
            empresaId,
            competencia,
            regras:
                regrasPerfil,
        });

    const documentos =
        perfil.documentos.filter(
            (documento) =>
                !documento.origemSistema &&
                documento.exigido !== false,
        );

    return {
        documentos,
        ids:
            new Set(
                documentos.map(
                    (documento) =>
                        documento.id,
                ),
            ),
        total:
            documentos.length,
    };
}

function obterTipoDocumentoResumo(
    item,
) {
    return String(
        item?.tipoDocumento ||
        item?.tipo_documento ||
        "",
    ).trim();
}

const TAMANHO_LOTE_EMPRESAS = 50;
const TAMANHO_LOTE_COMPETENCIAS = 75;

function textoSeguro(valor, limite = 500) {
    return String(valor ?? "")
        .trim()
        .slice(0, limite);
}

function normalizarTextoChave(valor) {
    return textoSeguro(valor, 500)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function normalizarNumero(valor) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ""
    ) {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return null;
    }

    return Math.max(0, Math.round(numero));
}

export function normalizarAnoRelatorioAnualCertidao(valor) {
    const ano = Number(valor);

    if (
        !Number.isInteger(ano) ||
        ano < 2000 ||
        ano > 2100
    ) {
        throw new Error("O ano do relatório anual é inválido.");
    }

    return ano;
}

function obterCompetenciaIso(ano, mes) {
    return `${ano}-${String(mes).padStart(2, "0")}-01`;
}

function obterMesCompetencia(valor) {
    const texto = textoSeguro(valor, 30);
    const correspondencia = /^(\d{4})-(\d{2})/.exec(texto);

    if (!correspondencia) {
        return null;
    }

    const ano = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]);

    if (
        !Number.isInteger(ano) ||
        !Number.isInteger(mes) ||
        mes < 1 ||
        mes > 12
    ) {
        return null;
    }

    return { ano, mes };
}

function criarDataReferencia(agora) {
    const data = agora instanceof Date
        ? new Date(agora.getTime())
        : new Date(agora || Date.now());

    if (Number.isNaN(data.getTime())) {
        return new Date();
    }

    return data;
}

function competenciaFutura({ ano, mes, agora }) {
    const referencia = criarDataReferencia(agora);
    const anoAtual = referencia.getFullYear();
    const mesAtual = referencia.getMonth() + 1;

    return (
        ano > anoAtual ||
        (ano === anoAtual && mes > mesAtual)
    );
}

function normalizarEmpresa(empresa = {}) {
    return {
        id: textoSeguro(
            empresa.id ||
            empresa.empresaId ||
            empresa.empresa_id,
            60,
        ),
        nome: textoSeguro(
            empresa.nome ||
            empresa.razaoSocial ||
            empresa.razao_social ||
            "Empresa sem nome",
            220,
        ),
        cnpj: textoSeguro(
            empresa.cnpj ||
            empresa.documento ||
            "CNPJ não informado",
            40,
        ),
        logoUrl: textoSeguro(
            empresa.logoUrl ||
            empresa.logo_url,
            2000,
        ),
        tipoEmpresa: textoSeguro(
            empresa.tipoEmpresa ||
            empresa.tipo_empresa,
            80,
        ),
        dataInicioContrato: textoSeguro(
            empresa.dataInicioContrato ||
            empresa.data_inicio_contrato,
            30,
        ),
        dataFimContrato: textoSeguro(
            empresa.dataFimContrato ||
            empresa.data_fim_contrato,
            30,
        ),
    };
}

function empresaFiscalizavel(empresa) {
    return !normalizarTextoChave(
        empresa.tipoEmpresa,
    ).includes("contratante");
}

function obterEmpresaIdColaborador(colaborador = {}) {
    return textoSeguro(
        colaborador.empresaId ||
        colaborador.empresa_id ||
        colaborador.empresa?.id,
        60,
    );
}

function obterEmpresaNomeColaborador(colaborador = {}) {
    return normalizarTextoChave(
        colaborador.empresaNome ||
        colaborador.empresa_nome ||
        colaborador.empresaExibicao ||
        colaborador.empresa_exibicao ||
        colaborador.empresa?.nome ||
        colaborador.empresa,
    );
}

function colaboradorAtivoParaRelatorio(colaborador = {}) {
    if (colaborador.ativo === false) {
        return false;
    }

    const situacao = normalizarTextoChave(
        colaborador.statusMobilizacao ||
        colaborador.status_mobilizacao ||
        colaborador.statusVinculo ||
        colaborador.status_vinculo ||
        colaborador.situacao ||
        colaborador.status,
    );

    if (
        situacao.includes("inativo") ||
        situacao.includes("demitido") ||
        situacao.includes("desligado") ||
        situacao.includes("desmobilizado")
    ) {
        return false;
    }

    const dataDemissao = textoSeguro(
        colaborador.dataDemissao ||
        colaborador.data_demissao,
        30,
    );

    if (/^\d{4}-\d{2}-\d{2}/.test(dataDemissao)) {
        const limite = new Date(`${dataDemissao.slice(0, 10)}T23:59:59`);

        if (
            !Number.isNaN(limite.getTime()) &&
            limite.getTime() <= Date.now()
        ) {
            return false;
        }
    }

    return true;
}

export function contarFuncionariosAtivosEmpresa({
    empresa,
    colaboradores,
} = {}) {
    const empresaNormalizada = normalizarEmpresa(empresa);
    const empresaId = empresaNormalizada.id;
    const empresaNome = normalizarTextoChave(
        empresaNormalizada.nome,
    );

    return (
        Array.isArray(colaboradores)
            ? colaboradores
            : []
    ).filter((colaborador) => {
        if (!colaboradorAtivoParaRelatorio(colaborador)) {
            return false;
        }

        const colaboradorEmpresaId =
            obterEmpresaIdColaborador(colaborador);

        if (empresaId && colaboradorEmpresaId) {
            return colaboradorEmpresaId === empresaId;
        }

        return Boolean(
            empresaNome &&
            obterEmpresaNomeColaborador(colaborador) ===
                empresaNome,
        );
    }).length;
}

function itemDocumentoExterno(item = {}) {
    const origem = textoSeguro(
        item.origem,
        30,
    ).toUpperCase();
    const tipoDocumento = textoSeguro(
        item.tipo_documento ||
        item.tipoDocumento,
        120,
    );

    if (origem && origem !== "UPLOAD") {
        return false;
    }

    if (tipoDocumento) {
        return TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.has(
            tipoDocumento,
        );
    }

    // Compatibilidade defensiva para registros legados sem metadados.
    return !origem;
}

function extrairResumoPersistido(
    competencia,
    totalMaximo = TOTAL_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL,
) {
    const resumo =
        competencia?.resumo &&
        typeof competencia.resumo === "object" &&
        !Array.isArray(competencia.resumo)
            ? competencia.resumo
            : {};

    const perfilCongelado =
        resumo.perfilDocumentalAplicado === true ||
        resumo.perfil_documental_aplicado === true ||
        resumo.criterioExigibilidade ===
            "PERFIL_DOCUMENTAL_V1" ||
        resumo.criterio_exigibilidade ===
            "PERFIL_DOCUMENTAL_V1";

    const itensConfirmadosCongelados =
        resumo.itensConfirmados ??
        resumo.itens_confirmados;

    const itensNaoExigiveisCongelados =
        resumo.itensNaoExigiveis ??
        resumo.itens_nao_exigiveis;

    const itensNaoAplicaveisCongelados =
        resumo.itensNaoAplicaveis ??
        resumo.itens_nao_aplicaveis;

    if (
        perfilCongelado &&
        Array.isArray(
            itensConfirmadosCongelados,
        ) &&
        Array.isArray(
            itensNaoExigiveisCongelados,
        )
    ) {
        const tiposNaoExigiveis =
            new Set(
                itensNaoExigiveisCongelados
                    .map(
                        obterTipoDocumentoResumo,
                    )
                    .filter(
                        (tipoDocumento) =>
                            TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.has(
                                tipoDocumento,
                            ),
                    ),
            );

        const tiposNaoAplicaveis =
            new Set(
                (
                    Array.isArray(
                        itensNaoAplicaveisCongelados,
                    )
                        ? itensNaoAplicaveisCongelados
                        : []
                )
                    .map(
                        obterTipoDocumentoResumo,
                    )
                    .filter(
                        (tipoDocumento) =>
                            TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.has(
                                tipoDocumento,
                            ),
                    ),
            );

        /*
         * União defensiva:
         *
         * caso um snapshot inconsistente contenha o mesmo tipo
         * simultaneamente nas duas listas, ele deve ser
         * subtraído apenas uma vez do denominador.
         */
        const tiposForaDenominador =
            new Set([
                ...tiposNaoExigiveis,
                ...tiposNaoAplicaveis,
            ]);

        /*
         * Snapshot histórico:
         *
         * o fechamento PERFIL_DOCUMENTAL_V1 exige exatamente
         * dois itens de origem SISTEMA antes de congelar a
         * competência. Portanto, o catálogo externo vigente
         * naquela fotografia é o total de itens congelados
         * menos esses dois automáticos.
         *
         * Isso impede que a expansão futura do catálogo
         * altere retroativamente competências já fechadas.
         */
        const totalItensCongelados =
            normalizarNumero(
                resumo.totalItens ??
                resumo.total_itens,
            );

        const totalExternosCongelados =
            totalItensCongelados !== null
                ? Math.max(
                    0,
                    totalItensCongelados - 2,
                )
                : Math.max(
                    0,
                    totalMaximo,
                );

        const totalExigiveisExternos =
            Math.max(
                0,
                totalExternosCongelados -
                    tiposForaDenominador.size,
            );

        const tiposConformes =
            new Set(
                itensConfirmadosCongelados
                    .map(
                        obterTipoDocumentoResumo,
                    )
                    .filter(
                        (tipoDocumento) =>
                            TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL.has(
                                tipoDocumento,
                            ) &&
                            !tiposForaDenominador.has(
                                tipoDocumento,
                            ),
                    ),
            );

        const conformesExternos =
            Math.min(
                tiposConformes.size,
                totalExigiveisExternos,
            );

        return {
            conformes:
                conformesExternos,
            pendentes:
                Math.max(
                    0,
                    totalExigiveisExternos -
                        conformesExternos,
                ),
            total:
                totalExigiveisExternos,
        };
    }

    const total = normalizarNumero(
        resumo.totalExigiveis ??
        resumo.total_exigiveis ??
        resumo.totalItens ??
        resumo.total_itens,
    );

    const conformes = normalizarNumero(
        resumo.totalConfirmados ??
        resumo.total_confirmados ??
        resumo.totalConformes ??
        resumo.total_conformes,
    );

    if (total === null && conformes === null) {
        return null;
    }

    const totalNormalizado = Math.min(
        total ?? conformes ?? 0,
        Math.max(0, totalMaximo),
    );
    const conformesNormalizados = Math.min(
        conformes ?? 0,
        totalNormalizado,
    );

    return {
        conformes: conformesNormalizados,
        pendentes: Math.max(
            0,
            totalNormalizado - conformesNormalizados,
        ),
        total: totalNormalizado,
    };
}

function extrairResumoCompetencia(
    competencia,
    itensCompetencia,
    totalPadrao = TOTAL_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL,
    versoesEmpresa = [],
    regrasPerfil = [],
) {
    const itens = Array.isArray(itensCompetencia)
        ? itensCompetencia
        : [];

    const itensExternos = itens.filter(
        itemDocumentoExterno,
    );

    const statusCompetencia =
        textoSeguro(
            competencia?.status,
            60,
        ).toUpperCase();

    const empresaId =
        textoSeguro(
            competencia?.empresa_id ||
            competencia?.empresaId,
            60,
        );

    const perfilExterno =
        statusCompetencia !== "FECHADA"
            ? resolverPerfilExternoCompetencia({
                empresaId,
                competencia:
                    competencia?.competencia,
                regrasPerfil,
            })
            : null;

    const idsExternosExigiveis =
        perfilExterno?.ids ||
        TIPOS_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL;

    const totalExternoAplicavel =
        perfilExterno?.total ??
        totalPadrao;

    const resumoPersistido =
        extrairResumoPersistido(
            competencia,
            statusCompetencia === "FECHADA"
                ? totalPadrao
                : totalExternoAplicavel,
        );

    if (
        statusCompetencia === "FECHADA" &&
        resumoPersistido
    ) {
        return resumoPersistido;
    }

    const itensExternosExigiveis =
        itensExternos.filter(
            (item) =>
                idsExternosExigiveis.has(
                    textoSeguro(
                        item?.tipo_documento ||
                        item?.tipoDocumento,
                        120,
                    ),
                ) &&
                !itemEhNaoAplicavelNaCompetencia(
                    item,
                ),
        );

    /*
     * Competência fechada permanece congelada.
     * Competências abertas/reabertas podem ser resolvidas
     * dinamicamente pelas versões documentais.
     */
    if (
        statusCompetencia !== "FECHADA" &&
        Array.isArray(versoesEmpresa) &&
        versoesEmpresa.length > 0
    ) {
        const itensPorTipo =
            new Map(
                itensExternos.map(
                    (item) => [
                        textoSeguro(
                            item?.tipo_documento ||
                            item?.tipoDocumento,
                            120,
                        ),
                        item,
                    ],
                ),
            );

        const resolvidos =
            DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL
                .filter(
                    (documento) =>
                        idsExternosExigiveis.has(
                            documento.id,
                        ) &&
                        !itemEhNaoAplicavelNaCompetencia(
                            itensPorTipo.get(
                                documento.id,
                            ),
                        ),
                )
                .map(
                (documento) =>
                    resolverDocumentoNaCompetencia({
                        tipoDocumento:
                            documento.id,

                        competencia:
                            competencia?.competencia,

                        versoes:
                            versoesEmpresa,

                        itemPersistido:
                            itensPorTipo.get(
                                documento.id,
                            ) || null,

                        competenciaFechada:
                            false,
                    }),
            );

        const exigiveis =
            resolvidos.filter(
                (item) =>
                    !STATUS_FORA_CONTAGEM.has(
                        textoSeguro(
                            item?.status,
                            60,
                        ).toUpperCase(),
                    ),
            );

        const conformes =
            exigiveis.filter(
                (item) =>
                    STATUS_CONFORME.has(
                        textoSeguro(
                            item?.status,
                            60,
                        ).toUpperCase(),
                    ),
            ).length;

        return {
            conformes,
            pendentes:
                Math.max(
                    0,
                    exigiveis.length -
                    conformes,
                ),
            total:
                exigiveis.length,
        };
    }

    if (itensExternosExigiveis.length > 0) {
        const exigiveis =
            itensExternosExigiveis.filter(
                (item) => {
                    const status =
                        textoSeguro(
                            item?.status,
                            60,
                        ).toUpperCase();

                    return !STATUS_FORA_CONTAGEM.has(
                        status,
                    );
                },
            );

        const conformes =
            exigiveis.filter(
                (item) =>
                    STATUS_CONFORME.has(
                        textoSeguro(
                            item?.status,
                            60,
                        ).toUpperCase(),
                    ),
            ).length;

        return {
            conformes,
            pendentes:
                Math.max(
                    0,
                    exigiveis.length -
                    conformes,
                ),
            total:
                exigiveis.length,
        };
    }

    if (statusCompetencia !== "FECHADA") {
        return (
            resumoPersistido || {
                conformes:
                    0,
                pendentes:
                    totalExternoAplicavel,
                total:
                    totalExternoAplicavel,
            }
        );
    }

    return resumoPersistido;
}

function criarMapaItensPorCompetencia(itens) {
    const mapa = new Map();

    for (const item of Array.isArray(itens) ? itens : []) {
        const competenciaId = textoSeguro(
            item?.competencia_id ||
            item?.competenciaId,
            60,
        );

        if (!competenciaId) {
            continue;
        }

        const lista = mapa.get(competenciaId) || [];
        lista.push(item);
        mapa.set(competenciaId, lista);
    }

    return mapa;
}

function criarMapaCompetencias({
    competencias,
    itens,
    versoes = [],
    ano,
    totalPadrao,
    regrasPerfilPorEmpresa = new Map(),
}) {
    const itensPorCompetencia =
        criarMapaItensPorCompetencia(
            itens,
        );

    const versoesPorEmpresa =
        new Map();

    for (
        const versao of
        Array.isArray(versoes)
            ? versoes
            : []
    ) {
        const empresaId =
            textoSeguro(
                versao?.empresaId ||
                versao?.empresa_id,
                60,
            );

        if (!empresaId) {
            continue;
        }

        const lista =
            versoesPorEmpresa.get(
                empresaId,
            ) || [];

        lista.push(
            versao,
        );

        versoesPorEmpresa.set(
            empresaId,
            lista,
        );
    }

    const mapa =
        new Map();

    for (
        const competencia of
        Array.isArray(competencias)
            ? competencias
            : []
    ) {
        const empresaId =
            textoSeguro(
                competencia?.empresa_id ||
                competencia?.empresaId,
                60,
            );

        const referencia =
            obterMesCompetencia(
                competencia
                    ?.competencia,
            );

        if (
            !empresaId ||
            !referencia ||
            referencia.ano !== ano
        ) {
            continue;
        }

        const competenciaId =
            textoSeguro(
                competencia?.id ||
                competencia?.competencia_id ||
                competencia?.competenciaId,
                60,
            );

        mapa.set(
            `${empresaId}|${referencia.mes}`,
            extrairResumoCompetencia(
                competencia,
                itensPorCompetencia.get(
                    competenciaId,
                ) || [],
                totalPadrao,
                versoesPorEmpresa.get(
                    empresaId,
                ) || [],
                regrasPerfilPorEmpresa.get(
                    empresaId,
                ) || [],
            ),
        );
    }

    return mapa;
}

function somarValoresMeses(meses, propriedade) {
    const valores = meses
        .map((mes) => mes?.[propriedade])
        .filter((valor) => Number.isFinite(valor));

    if (valores.length === 0) {
        return null;
    }

    return valores.reduce(
        (total, valor) => total + valor,
        0,
    );
}

export function consolidarRelatorioAnualCertidaoMensal({
    ano,
    empresas,
    colaboradores = [],
    competencias = [],
    itens = [],
    versoes = [],
    regrasPerfil = [],
    agora = new Date(),
    totalDocumentosPadrao = TOTAL_DOCUMENTOS_EXTERNOS_CERTIDAO_MENSAL,
} = {}) {
    const anoNormalizado =
        normalizarAnoRelatorioAnualCertidao(ano);
    const totalPadrao = Math.max(
        0,
        normalizarNumero(totalDocumentosPadrao) ?? 0,
    );

    const regrasPerfilPorEmpresa =
        criarMapaRegrasPerfilPorEmpresa(
            regrasPerfil,
        );

    const mapaCompetencias =
        criarMapaCompetencias({
            competencias,
            itens,
            versoes,
            ano: anoNormalizado,
            totalPadrao,
            regrasPerfilPorEmpresa,
        });

    const versoesPorEmpresa =
        new Map();

    for (
        const versao of
        Array.isArray(versoes)
            ? versoes
            : []
    ) {
        const empresaId =
            textoSeguro(
                versao?.empresaId ||
                versao?.empresa_id,
                60,
            );

        if (!empresaId) {
            continue;
        }

        const lista =
            versoesPorEmpresa.get(
                empresaId,
            ) || [];

        lista.push(
            versao,
        );

        versoesPorEmpresa.set(
            empresaId,
            lista,
        );
    }

    const empresasNormalizadas = (
        Array.isArray(empresas)
            ? empresas
            : []
    )
        .map(normalizarEmpresa)
        .filter((empresa) => empresa.id && empresa.nome)
        .filter(empresaFiscalizavel)
        .sort((a, b) => a.nome.localeCompare(
            b.nome,
            "pt-BR",
            { sensitivity: "base" },
        ));

    const empresasRelatorio = empresasNormalizadas.map((empresa) => {
        const meses = MESES_RELATORIO_ANUAL_CERTIDAO.map((mes) => {
            const competencia = obterCompetenciaIso(
                anoNormalizado,
                mes.numero,
            );

            const regrasPerfilEmpresa =
                regrasPerfilPorEmpresa.get(
                    empresa.id,
                ) || [];

            const perfilExterno =
                resolverPerfilExternoCompetencia({
                    empresaId:
                        empresa.id,
                    competencia,
                    regrasPerfil:
                        regrasPerfilEmpresa,
                });

            const vigencia = classificarCompetenciaVigenciaContratual({
                empresa,
                competencia,
            });
            const futura = competenciaFutura({
                ano: anoNormalizado,
                mes: mes.numero,
                agora,
            });

            if (!vigencia.exigivel || futura) {
                return {
                    ...mes,
                    competencia,
                    exigivel: vigencia.exigivel,
                    futura,
                    conformes: null,
                    pendentes: null,
                    total: null,
                };
            }

            const resumo =
                mapaCompetencias.get(
                    `${empresa.id}|${mes.numero}`,
                );

            const versoesEmpresa =
                versoesPorEmpresa.get(
                    empresa.id,
                ) || [];

            const resumoDerivado =
                !resumo &&
                versoesEmpresa.length > 0
                    ? extrairResumoCompetencia(
                        {
                            id:
                                "",
                            empresa_id:
                                empresa.id,
                            competencia,
                            status:
                                "ABERTA",
                        },
                        [],
                        perfilExterno.total,
                        versoesEmpresa,
                        regrasPerfilEmpresa,
                    )
                    : null;

            const resultado =
                resumo ||
                resumoDerivado || {
                    conformes:
                        0,
                    pendentes:
                        perfilExterno.total,
                    total:
                        perfilExterno.total,
                };

            return {
                ...mes,
                competencia,
                exigivel: true,
                futura: false,
                conformes: resultado.conformes,
                pendentes: resultado.pendentes,
                total: resultado.total,
            };
        });

        const totalConformes = somarValoresMeses(
            meses,
            "conformes",
        );
        const totalPendentes = somarValoresMeses(
            meses,
            "pendentes",
        );

        return {
            ...empresa,
            funcionarios: contarFuncionariosAtivosEmpresa({
                empresa,
                colaboradores,
            }),
            meses,
            totalConformes,
            totalPendentes,
            totalClassificado:
                (totalConformes ?? 0) +
                (totalPendentes ?? 0),
        };
    });

    const totalConformes = empresasRelatorio.reduce(
        (total, empresa) =>
            total + (empresa.totalConformes ?? 0),
        0,
    );
    const totalPendentes = empresasRelatorio.reduce(
        (total, empresa) =>
            total + (empresa.totalPendentes ?? 0),
        0,
    );
    const totalClassificado =
        totalConformes + totalPendentes;
    const percentualConforme = totalClassificado > 0
        ? Math.round((totalConformes / totalClassificado) * 100)
        : 0;
    const percentualPendente = totalClassificado > 0
        ? Math.max(0, 100 - percentualConforme)
        : 0;

    return {
        ano: anoNormalizado,
        geradoEm: criarDataReferencia(agora).toISOString(),
        empresas: empresasRelatorio,
        totais: {
            conformes: totalConformes,
            pendentes: totalPendentes,
            classificados: totalClassificado,
            percentualConforme,
            percentualPendente,
        },
    };
}

function dividirEmLotes(lista, tamanho) {
    const itens = Array.isArray(lista) ? lista : [];
    const lotes = [];

    for (let indice = 0; indice < itens.length; indice += tamanho) {
        lotes.push(itens.slice(indice, indice + tamanho));
    }

    return lotes;
}

function obterMensagemErroSupabase(erro, fallback) {
    return (
        textoSeguro(erro?.message, 1000) ||
        textoSeguro(erro?.details, 1000) ||
        textoSeguro(erro?.hint, 1000) ||
        fallback
    );
}

async function obterClienteSupabasePadrao() {
    const { supabase } = await import(
        "../../../lib/supabaseClient.js"
    );

    return supabase;
}

function validarClienteSupabase(clienteSupabase) {
    if (
        !clienteSupabase ||
        typeof clienteSupabase.from !== "function"
    ) {
        throw new Error(
            "Cliente Supabase inválido para o relatório anual.",
        );
    }

    return clienteSupabase;
}

async function buscarRegrasPerfilDocumental({
    clienteSupabase,
    empresaIds,
}) {
    const registros = [];

    for (
        const lote of
        dividirEmLotes(
            empresaIds,
            TAMANHO_LOTE_EMPRESAS,
        )
    ) {
        const {
            data,
            error,
        } =
            await clienteSupabase
                .from(
                    "certidao_mensal_perfil_documental_regras",
                )
                .select(
                    "id, empresa_id, tipo_documento, exigido, competencia_inicio, motivo, criado_em, atualizado_em",
                )
                .in(
                    "empresa_id",
                    lote,
                )
                .order(
                    "competencia_inicio",
                    { ascending: true },
                );

        if (error) {
            throw new Error(
                obterMensagemErroSupabase(
                    error,
                    "Não foi possível carregar as regras do perfil documental do relatório anual.",
                ),
            );
        }

        registros.push(
            ...(
                Array.isArray(data)
                    ? data
                    : []
            ),
        );
    }

    return registros;
}

async function buscarCompetenciasAno({
    clienteSupabase,
    empresaIds,
    ano,
}) {
    const registros = [];
    const inicio = `${ano}-01-01`;
    const fim = `${ano + 1}-01-01`;

    for (const lote of dividirEmLotes(
        empresaIds,
        TAMANHO_LOTE_EMPRESAS,
    )) {
        const { data, error } = await clienteSupabase
            .from("certidao_mensal_competencias")
            .select("id, empresa_id, competencia, status, resumo")
            .in("empresa_id", lote)
            .gte("competencia", inicio)
            .lt("competencia", fim)
            .order("competencia", { ascending: true });

        if (error) {
            throw new Error(
                obterMensagemErroSupabase(
                    error,
                    "Não foi possível carregar as competências do relatório anual.",
                ),
            );
        }

        registros.push(...(Array.isArray(data) ? data : []));
    }

    return registros;
}

async function buscarItensCompetencias({
    clienteSupabase,
    competenciaIds,
}) {
    const registros = [];

    for (const lote of dividirEmLotes(
        competenciaIds,
        TAMANHO_LOTE_COMPETENCIAS,
    )) {
        let resposta =
            await clienteSupabase
                .from(
                    "certidao_mensal_itens",
                )
                .select(
                    "id, competencia_id, tipo_documento, origem, status, aplicabilidade, versao_atual_id",
                )
                .in(
                    "competencia_id",
                    lote,
                );

        if (resposta?.error) {
            const textoErro =
                [
                    resposta.error?.message,
                    resposta.error?.details,
                    resposta.error?.hint,
                    resposta.error?.code,
                ]
                    .filter(Boolean)
                    .join(" ")
                    .toLowerCase();

            const colunaAplicabilidadeAusente =
                textoErro.includes(
                    "aplicabilidade",
                ) &&
                (
                    textoErro.includes(
                        "column",
                    ) ||
                    textoErro.includes(
                        "coluna",
                    ) ||
                    textoErro.includes(
                        "schema",
                    ) ||
                    textoErro.includes(
                        "could not find",
                    ) ||
                    textoErro.includes(
                        "does not exist",
                    ) ||
                    textoErro.includes(
                        "nao existe",
                    ) ||
                    textoErro.includes(
                        "não existe",
                    )
                );

            if (
                !colunaAplicabilidadeAusente
            ) {
                throw new Error(
                    obterMensagemErroSupabase(
                        resposta.error,
                        "Não foi possível carregar os itens do relatório anual.",
                    ),
                );
            }

            resposta =
                await clienteSupabase
                    .from(
                        "certidao_mensal_itens",
                    )
                    .select(
                        "id, competencia_id, tipo_documento, origem, status, versao_atual_id",
                    )
                    .in(
                        "competencia_id",
                        lote,
                    );
        }

        if (resposta?.error) {
            throw new Error(
                obterMensagemErroSupabase(
                    resposta.error,
                    "Não foi possível carregar os itens do relatório anual.",
                ),
            );
        }

        const dados =
            Array.isArray(
                resposta?.data,
            )
                ? resposta.data
                : [];

        registros.push(
            ...dados.map(
                (item) => {
                    const tipoDocumento =
                        textoSeguro(
                            item?.tipo_documento,
                            120,
                        )
                            .trim()
                            .toLowerCase();

                    return {
                        ...item,

                        aplicabilidade:
                            item?.aplicabilidade ||
                            (
                                tipoDocumento ===
                                    "esocial"
                                    ? "PENDENTE_DEFINICAO"
                                    : "APLICAVEL"
                            ),
                    };
                },
            ),
        );
    }

    return registros;
}

async function buscarVersoesAtuaisItens({
    clienteSupabase,
    itens,
    competencias,
}) {
    const itensLista =
        Array.isArray(itens)
            ? itens
            : [];

    const competenciasLista =
        Array.isArray(competencias)
            ? competencias
            : [];

    const versaoIds =
        [
            ...new Set(
                itensLista
                    .map(
                        (item) =>
                            textoSeguro(
                                item
                                    ?.versao_atual_id,
                                60,
                            )
                    )
                    .filter(Boolean)
            ),
        ];

    if (!versaoIds.length) {
        return [];
    }

    const registros =
        [];

    for (
        const lote of
        dividirEmLotes(
            versaoIds,
            TAMANHO_LOTE_COMPETENCIAS,
        )
    ) {
        const {
            data,
            error,
        } =
            await clienteSupabase
                .from(
                    "certidao_mensal_versoes"
                )
                .select(
                    [
                        "id",
                        "item_id",
                        "numero_versao",
                        "bucket_id",
                        "caminho_storage",
                        "nome_original",
                        "status_resultado",
                        "diagnostico",
                        "payload",
                        "criado_em",
                    ].join(",")
                )
                .in(
                    "id",
                    lote
                );

        if (error) {
            throw new Error(
                obterMensagemErroSupabase(
                    error,
                    "Não foi possível carregar as versões do relatório anual.",
                ),
            );
        }

        registros.push(
            ...(
                Array.isArray(data)
                    ? data
                    : []
            )
        );
    }

    const itensPorId =
        new Map(
            itensLista.map(
                (item) => [
                    textoSeguro(
                        item?.id,
                        60,
                    ),
                    item,
                ],
            ),
        );

    const competenciasPorId =
        new Map(
            competenciasLista.map(
                (competencia) => [
                    textoSeguro(
                        competencia?.id,
                        60,
                    ),
                    competencia,
                ],
            ),
        );

    const normalizarDataTemporal =
        (valor) => {
            const texto =
                textoSeguro(
                    valor,
                    30,
                ).slice(
                    0,
                    10
                );

            if (
                /^\d{4}-\d{2}-\d{2}$/
                    .test(
                        texto
                    )
            ) {
                return texto;
            }

            const br =
                /^(\d{2})\/(\d{2})\/(\d{4})$/
                    .exec(
                        texto
                    );

            return br
                ? (
                    br[3] +
                    "-" +
                    br[2] +
                    "-" +
                    br[1]
                )
                : "";
        };

    return registros
        .map(
            (versao) => {
                const item =
                    itensPorId.get(
                        textoSeguro(
                            versao?.item_id,
                            60,
                        )
                    );

                if (!item) {
                    return null;
                }

                const competencia =
                    competenciasPorId.get(
                        textoSeguro(
                            item
                                ?.competencia_id,
                            60,
                        )
                    );

                if (!competencia) {
                    return null;
                }

                const diagnostico =
                    (
                        versao
                            ?.diagnostico &&
                        typeof versao
                            .diagnostico ===
                            "object"
                    )
                        ? versao.diagnostico
                        : (
                            versao
                                ?.payload
                                ?.diagnostico ||
                            {}
                        );

                const dadosTemporais =
                    diagnostico
                        ?.avaliacao
                        ?.dadosTemporais ||
                    {};

                return {
                    ...versao,

                    empresaId:
                        textoSeguro(
                            competencia
                                ?.empresa_id,
                            60,
                        ),

                    tipoDocumento:
                        textoSeguro(
                            item
                                ?.tipo_documento,
                            120,
                        ),

                    competencia:
                        textoSeguro(
                            competencia
                                ?.competencia,
                            30,
                        ),

                    status:
                        textoSeguro(
                            item?.status ||
                            versao
                                ?.status_resultado,
                            60,
                        ).toUpperCase(),

                    dataEmissaoIso:
                        normalizarDataTemporal(
                            dadosTemporais
                                ?.dataEmissaoIso ||
                            dadosTemporais
                                ?.dataEmissao
                        ),

                    dataValidadeIso:
                        normalizarDataTemporal(
                            dadosTemporais
                                ?.dataValidadeIso ||
                            dadosTemporais
                                ?.dataValidade
                        ),
                };
            }
        )
        .filter(Boolean);
}

export async function carregarDadosRelatorioAnualCertidaoMensal({
    ano,
    empresas,
    colaboradores = [],
    clienteSupabase = null,
    agora = new Date(),
} = {}) {
    const anoNormalizado =
        normalizarAnoRelatorioAnualCertidao(ano);
    const empresasNormalizadas = (
        Array.isArray(empresas)
            ? empresas
            : []
    )
        .map(normalizarEmpresa)
        .filter((empresa) => empresa.id && empresaFiscalizavel(empresa));

    if (empresasNormalizadas.length === 0) {
        return consolidarRelatorioAnualCertidaoMensal({
            ano: anoNormalizado,
            empresas: [],
            colaboradores,
            competencias: [],
            itens: [],
            agora,
        });
    }

    const cliente = validarClienteSupabase(
        clienteSupabase ||
        await obterClienteSupabasePadrao(),
    );
    const empresaIds = empresasNormalizadas.map(
        (empresa) => empresa.id,
    );

    const regrasPerfil =
        await buscarRegrasPerfilDocumental({
            clienteSupabase:
                cliente,
            empresaIds,
        });

    const competencias =
        await buscarCompetenciasAno({
            clienteSupabase:
                cliente,
            empresaIds,
            ano:
                anoNormalizado,
        });

    const competenciasAnterior =
        anoNormalizado > 2000
            ? await buscarCompetenciasAno({
                clienteSupabase:
                    cliente,
                empresaIds,
                ano:
                    anoNormalizado - 1,
            })
            : [];

    const competenciasPosterior =
        await buscarCompetenciasAno({
            clienteSupabase:
                cliente,
            empresaIds,
            ano:
                anoNormalizado + 1,
        });

    const competenciasCandidatas =
        [
            ...new Map(
                [
                    ...competenciasAnterior,
                    ...competencias,
                    ...competenciasPosterior,
                ].map(
                    (registro) => [
                        textoSeguro(
                            registro?.id,
                            60,
                        ),
                        registro,
                    ],
                ),
            ).values(),
        ];

    const competenciaIdsCandidatas =
        competenciasCandidatas
            .map(
                (registro) =>
                    textoSeguro(
                        registro?.id,
                        60,
                    )
            )
            .filter(Boolean);

    const itensCandidatos =
        competenciaIdsCandidatas.length > 0
            ? await buscarItensCompetencias({
                clienteSupabase:
                    cliente,
                competenciaIds:
                    competenciaIdsCandidatas,
            })
            : [];

    const competenciaIdsRelatorio =
        new Set(
            competencias
                .map(
                    (registro) =>
                        textoSeguro(
                            registro?.id,
                            60,
                        )
                )
                .filter(Boolean)
        );

    const itens =
        itensCandidatos.filter(
            (item) =>
                competenciaIdsRelatorio.has(
                    textoSeguro(
                        item
                            ?.competencia_id,
                        60,
                    )
                )
        );

    const versoes =
        await buscarVersoesAtuaisItens({
            clienteSupabase:
                cliente,
            itens:
                itensCandidatos,
            competencias:
                competenciasCandidatas,
        });

    return consolidarRelatorioAnualCertidaoMensal({
        ano:
            anoNormalizado,
        empresas:
            empresasNormalizadas,
        colaboradores,
        competencias,
        itens,
        versoes,
        regrasPerfil,
        agora,
    });
}
