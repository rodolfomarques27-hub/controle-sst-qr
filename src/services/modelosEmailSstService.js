import {
    LIMITES_MODELO_EMAIL_SST,
    ORDEM_TIPOS_MODELO_EMAIL_SST,
    RPC_MODELOS_EMAIL_SST,
    corpoModeloEmailSstContemItens,
    normalizarTipoModeloEmailSst,
    obterMetadadosModeloEmailSst,
    obterVariaveisDesconhecidasModeloEmailSst,
    tipoModeloEmailSstValido,
} from "../constants/modelosEmailSstConstants";

const MENSAGEM_ESTRUTURA_NAO_APLICADA =
    "A persistência dos modelos de e-mail SST ainda não foi aplicada no Supabase.";

function textoSeguro(valor = "") {
    return String(valor ?? "");
}

function textoTratado(valor = "") {
    return textoSeguro(valor)
        .trim();
}

function normalizarBooleano(valor, padrao = true) {
    if (typeof valor === "boolean") {
        return valor;
    }

    if (
        valor === 1 ||
        String(valor || "").trim().toLowerCase() === "true"
    ) {
        return true;
    }

    if (
        valor === 0 ||
        String(valor || "").trim().toLowerCase() === "false"
    ) {
        return false;
    }

    return padrao;
}

function normalizarInteiroPositivo(valor, padrao = 1) {
    const numero =
        Number(valor);

    if (
        Number.isInteger(numero) &&
        numero >= 1
    ) {
        return numero;
    }

    return padrao;
}

function garantirClienteSupabase(supabase, operacao) {
    if (
        !supabase ||
        typeof supabase.rpc !== "function"
    ) {
        throw new Error(
            `Cliente Supabase não informado para ${operacao}.`
        );
    }
}

function primeiroRegistroRetornado(data) {
    if (Array.isArray(data)) {
        return data[0] || null;
    }

    return data || null;
}

function possuiMarcadorVariavelIncompleto(...textos) {
    const conteudoSemVariaveisValidas =
        textos
            .map((valor) => textoSeguro(valor))
            .join("\n")
            .replace(
                /\{\{\s*[a-z0-9_]+\s*\}\}/gi,
                ""
            );

    return (
        conteudoSemVariaveisValidas.includes("{{") ||
        conteudoSemVariaveisValidas.includes("}}")
    );
}

function erroPareceMigrationAusente(error = null) {
    const codigo =
        textoTratado(error?.code).toUpperCase();

    const mensagem =
        [
            error?.message,
            error?.details,
            error?.hint,
        ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

    return (
        codigo === "PGRST202" ||
        codigo === "42883" ||
        mensagem.includes("could not find the function") ||
        mensagem.includes("does not exist") ||
        mensagem.includes("schema cache")
    );
}

export function formatarErroModelosEmailSst(
    error,
    mensagemPadrao = "Não foi possível processar o modelo de e-mail SST."
) {
    if (erroPareceMigrationAusente(error)) {
        return MENSAGEM_ESTRUTURA_NAO_APLICADA;
    }

    const codigo =
        textoTratado(error?.code);

    const mensagem =
        textoTratado(
            error?.message ||
            error?.details ||
            error?.hint
        );

    if (
        codigo === "42501" ||
        mensagem.toLowerCase().includes("sem permissão")
    ) {
        return "Seu usuário não possui permissão para administrar modelos de e-mail SST.";
    }

    return mensagem || mensagemPadrao;
}

function criarErroModelosEmailSst(
    error,
    mensagemPadrao
) {
    const erro =
        new Error(
            formatarErroModelosEmailSst(
                error,
                mensagemPadrao
            )
        );

    if (error?.code) {
        erro.code = error.code;
    }

    return erro;
}

export function normalizarModeloEmailSst(
    registro = null
) {
    if (
        !registro ||
        typeof registro !== "object"
    ) {
        return null;
    }

    const tipo =
        normalizarTipoModeloEmailSst(
            registro.tipo
        );

    if (!tipoModeloEmailSstValido(tipo)) {
        return null;
    }

    const metadados =
        obterMetadadosModeloEmailSst(tipo);

    const assunto =
        textoSeguro(
            registro.assunto
        );

    const corpo =
        textoSeguro(
            registro.corpo
        );

    const remetenteNome =
        textoSeguro(
            registro.remetente_nome ??
            registro.remetenteNome
        );

    const assuntoPadrao =
        textoSeguro(
            registro.assunto_padrao ??
            registro.assuntoPadrao
        );

    const corpoPadrao =
        textoSeguro(
            registro.corpo_padrao ??
            registro.corpoPadrao
        );

    const remetenteNomePadrao =
        textoSeguro(
            registro.remetente_nome_padrao ??
            registro.remetenteNomePadrao
        );

    const personalizado =
        Boolean(
            assuntoPadrao &&
            corpoPadrao &&
            remetenteNomePadrao &&
            (
                assunto !== assuntoPadrao ||
                corpo !== corpoPadrao ||
                remetenteNome !== remetenteNomePadrao ||
                normalizarBooleano(
                    registro.ativo,
                    true
                ) !== true
            )
        );

    return {
        tipo,
        nome:
            textoTratado(registro.nome) ||
            metadados?.nome ||
            tipo,
        grupo:
            metadados?.grupo ||
            "Comunicação",
        descricao:
            textoTratado(registro.descricao) ||
            metadados?.descricao ||
            "",
        assunto,
        corpo,
        remetenteNome,
        ativo:
            normalizarBooleano(
                registro.ativo,
                true
            ),
        versao:
            normalizarInteiroPositivo(
                registro.versao,
                1
            ),
        atualizadoEm:
            registro.atualizado_em ??
            registro.atualizadoEm ??
            null,
        atualizadoPor:
            registro.atualizado_por ??
            registro.atualizadoPor ??
            null,
        assuntoPadrao,
        corpoPadrao,
        remetenteNomePadrao,
        personalizado,
    };
}

export function validarModeloEmailSst(
    modelo = {}
) {
    const tipo =
        normalizarTipoModeloEmailSst(
            modelo?.tipo
        );

    if (!tipoModeloEmailSstValido(tipo)) {
        throw new Error(
            "Selecione um tipo válido de modelo de e-mail SST."
        );
    }

    const assunto =
        textoTratado(
            modelo?.assunto
        );

    if (!assunto) {
        throw new Error(
            "Informe o assunto do modelo de e-mail SST."
        );
    }

    if (
        assunto.length >
        LIMITES_MODELO_EMAIL_SST.ASSUNTO
    ) {
        throw new Error(
            `O assunto deve possuir no máximo ${LIMITES_MODELO_EMAIL_SST.ASSUNTO} caracteres.`
        );
    }

    if (/[\r\n]/.test(assunto)) {
        throw new Error(
            "O assunto não pode conter quebra de linha."
        );
    }

    const corpo =
        textoTratado(
            modelo?.corpo
        );

    if (!corpo) {
        throw new Error(
            "Informe o corpo do modelo de e-mail SST."
        );
    }

    if (
        corpo.length >
        LIMITES_MODELO_EMAIL_SST.CORPO
    ) {
        throw new Error(
            `O corpo deve possuir no máximo ${LIMITES_MODELO_EMAIL_SST.CORPO.toLocaleString("pt-BR")} caracteres.`
        );
    }

    if (!corpoModeloEmailSstContemItens(corpo)) {
        throw new Error(
            "O corpo do modelo deve conter a variável {{itens}}."
        );
    }

    const remetenteNome =
        textoTratado(
            modelo?.remetenteNome ??
            modelo?.remetente_nome
        );

    if (!remetenteNome) {
        throw new Error(
            "Informe o nome do remetente."
        );
    }

    if (
        remetenteNome.length >
        LIMITES_MODELO_EMAIL_SST.REMETENTE_NOME
    ) {
        throw new Error(
            `O nome do remetente deve possuir no máximo ${LIMITES_MODELO_EMAIL_SST.REMETENTE_NOME} caracteres.`
        );
    }

    if (/[\r\n]/.test(remetenteNome)) {
        throw new Error(
            "O nome do remetente não pode conter quebra de linha."
        );
    }

    if (
        possuiMarcadorVariavelIncompleto(
            assunto,
            corpo
        )
    ) {
        throw new Error(
            "Existe uma variável incompleta. Utilize o formato {{nome_da_variavel}}."
        );
    }

    const variaveisDesconhecidas =
        obterVariaveisDesconhecidasModeloEmailSst(
            assunto,
            corpo
        );

    if (variaveisDesconhecidas.length > 0) {
        throw new Error(
            `Variável não permitida no modelo: {{${variaveisDesconhecidas[0]}}}.`
        );
    }

    return {
        tipo,
        assunto,
        corpo,
        remetenteNome,
        ativo:
            normalizarBooleano(
                modelo?.ativo,
                true
            ),
    };
}

export function aplicarVariaveisModeloEmailSst(
    texto = "",
    valores = {}
) {
    const variaveisDesconhecidas =
        obterVariaveisDesconhecidasModeloEmailSst(
            texto
        );

    if (variaveisDesconhecidas.length > 0) {
        throw new Error(
            `Variável não permitida no modelo: {{${variaveisDesconhecidas[0]}}}.`
        );
    }

    const valoresSeguros =
        valores &&
        typeof valores === "object"
            ? valores
            : {};

    return textoSeguro(texto).replace(
        /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
        (correspondencia, chave) => {
            const chaveNormalizada =
                textoTratado(chave)
                    .toLowerCase();

            if (
                Object.prototype.hasOwnProperty.call(
                    valoresSeguros,
                    chaveNormalizada
                )
            ) {
                return textoSeguro(
                    valoresSeguros[chaveNormalizada]
                );
            }

            return correspondencia;
        }
    );
}

export function criarValoresPrevisualizacaoModeloEmailSst() {
    return {
        saudacao: "Olá, João.",
        tst_responsavel: "João da Silva",
        empresa_nome: "Empresa Exemplo Ltda.",
        total_vencidos: "2",
        total_a_vencer: "3",
        quantidade_itens: "5",
        resumo: "2 vencidos e 3 a vencer",
        itens: [
            "1. NR-35 - VENCIDO HÁ 5 DIAS",
            "2. ASO periódico - A VENCER EM 10 DIAS",
        ].join("\n"),
        sistema_nome: "SafeScan Brasil",
        url_sistema: "https://www.safescanbrasil.com.br",
        data_envio: new Intl.DateTimeFormat(
            "pt-BR"
        ).format(new Date()),
    };
}

export async function listarModelosEmailSstService({
    supabase,
}) {
    garantirClienteSupabase(
        supabase,
        "listar modelos de e-mail SST"
    );

    const { data, error } =
        await supabase.rpc(
            RPC_MODELOS_EMAIL_SST.LISTAR
        );

    if (error) {
        throw criarErroModelosEmailSst(
            error,
            "Não foi possível carregar os modelos de e-mail SST."
        );
    }

    const registros =
        Array.isArray(data)
            ? data
            : data
                ? [data]
                : [];

    const modelos =
        registros
            .map(normalizarModeloEmailSst)
            .filter(Boolean);

    const indiceOrdem =
        new Map(
            ORDEM_TIPOS_MODELO_EMAIL_SST.map(
                (tipo, indice) => [
                    tipo,
                    indice,
                ]
            )
        );

    return modelos.sort(
        (a, b) =>
            (
                indiceOrdem.get(a.tipo) ??
                Number.MAX_SAFE_INTEGER
            ) -
            (
                indiceOrdem.get(b.tipo) ??
                Number.MAX_SAFE_INTEGER
            )
    );
}

export async function salvarModeloEmailSstService({
    supabase,
    modelo,
}) {
    garantirClienteSupabase(
        supabase,
        "salvar modelo de e-mail SST"
    );

    const dados =
        validarModeloEmailSst(
            modelo
        );

    const { data, error } =
        await supabase.rpc(
            RPC_MODELOS_EMAIL_SST.SALVAR,
            {
                p_tipo: dados.tipo,
                p_assunto: dados.assunto,
                p_corpo: dados.corpo,
                p_remetente_nome:
                    dados.remetenteNome,
                p_ativo: dados.ativo,
            }
        );

    if (error) {
        throw criarErroModelosEmailSst(
            error,
            "Não foi possível salvar o modelo de e-mail SST."
        );
    }

    const modeloSalvo =
        normalizarModeloEmailSst({
            ...(modelo || {}),
            ...(primeiroRegistroRetornado(data) || {}),
        });

    if (!modeloSalvo) {
        throw new Error(
            "O modelo foi salvo, mas o Supabase retornou uma resposta inválida."
        );
    }

    return modeloSalvo;
}

export async function restaurarModeloEmailSstService({
    supabase,
    tipo,
    modeloAtual = null,
}) {
    garantirClienteSupabase(
        supabase,
        "restaurar modelo de e-mail SST"
    );

    const tipoNormalizado =
        normalizarTipoModeloEmailSst(
            tipo
        );

    if (!tipoModeloEmailSstValido(tipoNormalizado)) {
        throw new Error(
            "Selecione um tipo válido de modelo para restaurar."
        );
    }

    const { data, error } =
        await supabase.rpc(
            RPC_MODELOS_EMAIL_SST.RESTAURAR,
            {
                p_tipo: tipoNormalizado,
            }
        );

    if (error) {
        throw criarErroModelosEmailSst(
            error,
            "Não foi possível restaurar o modelo padrão."
        );
    }

    const modeloRestaurado =
        normalizarModeloEmailSst({
            ...(modeloAtual || {}),
            ...(primeiroRegistroRetornado(data) || {}),
            tipo: tipoNormalizado,
        });

    if (!modeloRestaurado) {
        throw new Error(
            "O modelo foi restaurado, mas o Supabase retornou uma resposta inválida."
        );
    }

    return modeloRestaurado;
}
