export const TIPOS_MODELO_EMAIL_SST = Object.freeze({
    DOCUMENTO_COLABORADOR: "alerta_documento_colaborador",
    DOCUMENTO_EMPRESA: "alerta_documento_empresa",
    DOCUMENTOS_LOTE: "alerta_documentos_lote",
    TREINAMENTOS: "alerta_treinamentos",
    AUDITORIA: "alerta_auditoria",
});

export const ORDEM_TIPOS_MODELO_EMAIL_SST = Object.freeze([
    TIPOS_MODELO_EMAIL_SST.DOCUMENTO_COLABORADOR,
    TIPOS_MODELO_EMAIL_SST.DOCUMENTO_EMPRESA,
    TIPOS_MODELO_EMAIL_SST.DOCUMENTOS_LOTE,
    TIPOS_MODELO_EMAIL_SST.TREINAMENTOS,
    TIPOS_MODELO_EMAIL_SST.AUDITORIA,
]);

export const LIMITES_MODELO_EMAIL_SST = Object.freeze({
    ASSUNTO: 220,
    CORPO: 12000,
    REMETENTE_NOME: 120,
});

export const RPC_MODELOS_EMAIL_SST = Object.freeze({
    LISTAR: "admin_listar_modelos_email_sst",
    SALVAR: "admin_salvar_modelo_email_sst",
    RESTAURAR: "admin_restaurar_modelo_email_sst",
});

export const VARIAVEIS_MODELO_EMAIL_SST = Object.freeze([
    "saudacao",
    "tst_responsavel",
    "empresa_nome",
    "total_vencidos",
    "total_a_vencer",
    "quantidade_itens",
    "resumo",
    "itens",
    "sistema_nome",
    "url_sistema",
    "data_envio",
]);

export const DETALHES_VARIAVEIS_MODELO_EMAIL_SST = Object.freeze({
    saudacao: Object.freeze({
        rotulo: "Saudação",
        exemplo: "Olá, João.",
        descricao: "Saudação montada de acordo com o responsável SST informado.",
    }),
    tst_responsavel: Object.freeze({
        rotulo: "Responsável SST",
        exemplo: "João da Silva",
        descricao: "Nome do técnico ou responsável SST que receberá o alerta.",
    }),
    empresa_nome: Object.freeze({
        rotulo: "Empresa",
        exemplo: "Empresa Exemplo Ltda.",
        descricao: "Nome da empresa relacionada ao envio.",
    }),
    total_vencidos: Object.freeze({
        rotulo: "Total vencido",
        exemplo: "2",
        descricao: "Quantidade de itens que já estão vencidos.",
    }),
    total_a_vencer: Object.freeze({
        rotulo: "Total a vencer",
        exemplo: "3",
        descricao: "Quantidade de itens com vencimento futuro.",
    }),
    quantidade_itens: Object.freeze({
        rotulo: "Quantidade de itens",
        exemplo: "5",
        descricao: "Quantidade total de itens presentes no e-mail.",
    }),
    resumo: Object.freeze({
        rotulo: "Resumo",
        exemplo: "2 vencidos e 3 a vencer",
        descricao: "Resumo textual calculado para o envio.",
    }),
    itens: Object.freeze({
        rotulo: "Lista de itens",
        exemplo: "1. NR-35 - A vencer em 10 dias",
        descricao: "Relação detalhada dos documentos, treinamentos ou registros.",
        obrigatoriaNoCorpo: true,
    }),
    sistema_nome: Object.freeze({
        rotulo: "Nome do sistema",
        exemplo: "SafeScan Brasil",
        descricao: "Nome institucional exibido na assinatura.",
    }),
    url_sistema: Object.freeze({
        rotulo: "Endereço do sistema",
        exemplo: "https://www.safescanbrasil.com.br",
        descricao: "Endereço oficial para acesso ao sistema.",
    }),
    data_envio: Object.freeze({
        rotulo: "Data do envio",
        exemplo: "26/07/2026",
        descricao: "Data em que o e-mail foi processado.",
    }),
});

export const METADADOS_MODELOS_EMAIL_SST = Object.freeze({
    [TIPOS_MODELO_EMAIL_SST.DOCUMENTO_COLABORADOR]: Object.freeze({
        tipo: TIPOS_MODELO_EMAIL_SST.DOCUMENTO_COLABORADOR,
        nome: "Documento de colaborador",
        grupo: "Documentos",
        descricao: "Alertas individuais de documentos e certificados de colaboradores.",
    }),
    [TIPOS_MODELO_EMAIL_SST.DOCUMENTO_EMPRESA]: Object.freeze({
        tipo: TIPOS_MODELO_EMAIL_SST.DOCUMENTO_EMPRESA,
        nome: "Documento da empresa",
        grupo: "Documentos",
        descricao: "Alertas de documentos legais e operacionais das empresas.",
    }),
    [TIPOS_MODELO_EMAIL_SST.DOCUMENTOS_LOTE]: Object.freeze({
        tipo: TIPOS_MODELO_EMAIL_SST.DOCUMENTOS_LOTE,
        nome: "Resumo de documentos em lote",
        grupo: "Documentos",
        descricao: "Resumo contendo vários documentos vencidos ou próximos do vencimento.",
    }),
    [TIPOS_MODELO_EMAIL_SST.TREINAMENTOS]: Object.freeze({
        tipo: TIPOS_MODELO_EMAIL_SST.TREINAMENTOS,
        nome: "Treinamentos e certificados",
        grupo: "Treinamentos",
        descricao: "Alertas de treinamentos, reciclagens e certificados.",
    }),
    [TIPOS_MODELO_EMAIL_SST.AUDITORIA]: Object.freeze({
        tipo: TIPOS_MODELO_EMAIL_SST.AUDITORIA,
        nome: "Auditorias e desvios",
        grupo: "Auditoria",
        descricao: "Alertas relacionados a auditorias, desvios e tratativas de campo.",
    }),
});

const CONJUNTO_VARIAVEIS_MODELO_EMAIL_SST =
    new Set(VARIAVEIS_MODELO_EMAIL_SST);

export function normalizarTipoModeloEmailSst(valor = "") {
    return String(valor || "")
        .trim()
        .toLowerCase();
}

export function tipoModeloEmailSstValido(valor = "") {
    const tipo = normalizarTipoModeloEmailSst(valor);

    return ORDEM_TIPOS_MODELO_EMAIL_SST.includes(tipo);
}

export function obterMetadadosModeloEmailSst(tipo = "") {
    const tipoNormalizado =
        normalizarTipoModeloEmailSst(tipo);

    return (
        METADADOS_MODELOS_EMAIL_SST[tipoNormalizado] ||
        null
    );
}

export function extrairVariaveisModeloEmailSst(...textos) {
    const variaveisEncontradas =
        new Set();

    for (const texto of textos) {
        const conteudo =
            String(texto ?? "");

        const expressao =
            /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

        for (
            const correspondencia of conteudo.matchAll(expressao)
        ) {
            const variavel =
                String(correspondencia?.[1] || "")
                    .trim()
                    .toLowerCase();

            if (variavel) {
                variaveisEncontradas.add(variavel);
            }
        }
    }

    return Array.from(variaveisEncontradas)
        .sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function obterVariaveisDesconhecidasModeloEmailSst(
    ...textos
) {
    return extrairVariaveisModeloEmailSst(...textos)
        .filter(
            (variavel) =>
                !CONJUNTO_VARIAVEIS_MODELO_EMAIL_SST.has(
                    variavel
                )
        );
}

export function corpoModeloEmailSstContemItens(corpo = "") {
    return /\{\{\s*itens\s*\}\}/i.test(
        String(corpo || "")
    );
}
