const FUNCAO_EMAIL_ACESSO_USUARIO = "enviar-email-acesso-usuario";
const RPC_HISTORICO_EMAIL_ACESSO_USUARIO =
    "admin_listar_acesso_usuario_email_envios";

const UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function normalizarTexto(valor) {
    return String(valor ?? "").trim();
}

function normalizarEmail(valor) {
    return normalizarTexto(valor).toLowerCase();
}

function emailValido(valor) {
    const email = normalizarEmail(valor);

    return (
        email.length >= 3 &&
        email.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(email)
    );
}

function ehObjetoPlano(valor) {
    return Boolean(valor) && typeof valor === "object" && !Array.isArray(valor);
}

function listaSegura(valor) {
    return Array.isArray(valor)
        ? valor
            .map((item) => normalizarTexto(item))
            .filter(Boolean)
        : [];
}

function obterJsonContextoErro(error) {
    const candidatos = [
        error?.context?.json,
        error?.context?.body,
        error?.context?.data,
    ];

    return candidatos.find(ehObjetoPlano) || null;
}

function extrairErroComunicacao(error, data) {
    const contexto = obterJsonContextoErro(error);

    return (
        normalizarTexto(data?.erro) ||
        normalizarTexto(contexto?.erro) ||
        normalizarTexto(data?.error) ||
        normalizarTexto(contexto?.error) ||
        normalizarTexto(error?.message) ||
        "Não foi possível concluir a comunicação de acesso."
    );
}

function criarErroComunicacao(error, data) {
    const contexto = obterJsonContextoErro(error);
    const erro = new Error(
        extrairErroComunicacao(error, data)
    );

    erro.codigo =
        normalizarTexto(data?.codigo) ||
        normalizarTexto(contexto?.codigo) ||
        "ERRO_INTERNO";

    erro.envioId =
        normalizarTexto(data?.envioId) ||
        normalizarTexto(contexto?.envioId) ||
        null;

    erro.statusEnvio =
        normalizarTexto(data?.status) ||
        normalizarTexto(contexto?.status) ||
        null;

    return erro;
}

export function gerarChaveIdempotenciaAcessoUsuarioEmail({
    geradorUuid = null,
} = {}) {
    let uuid = "";

    if (typeof geradorUuid === "function") {
        uuid = normalizarTexto(
            geradorUuid()
        );
    } else if (
        typeof globalThis.crypto?.randomUUID === "function"
    ) {
        uuid = normalizarTexto(
            globalThis.crypto.randomUUID()
        );
    }

    if (!UUID_REGEX.test(uuid)) {
        throw new Error(
            "Não foi possível gerar uma chave de idempotência UUID válida."
        );
    }

    return uuid.toLowerCase();
}

export function normalizarRegistroHistoricoAcessoUsuarioEmail(
    registro = null
) {
    if (!ehObjetoPlano(registro)) {
        return null;
    }

    return {
        id:
            normalizarTexto(registro.id) ||
            null,

        usuarioPermissaoId:
            normalizarTexto(registro.usuario_permissao_id) ||
            null,

        usuarioId:
            normalizarTexto(registro.usuario_id) ||
            null,

        usuarioEmail:
            normalizarEmail(registro.usuario_email),

        usuarioNome:
            normalizarTexto(registro.usuario_nome),

        empresaId:
            normalizarTexto(registro.empresa_id) ||
            null,

        empresaNome:
            normalizarTexto(registro.empresa_nome),

        perfil:
            normalizarTexto(registro.perfil_snapshot),

        permissoesSnapshot:
            ehObjetoPlano(registro.permissoes_snapshot)
                ? registro.permissoes_snapshot
                : {},

        modulosLiberados:
            listaSegura(registro.modulos_liberados),

        acoesLiberadas:
            listaSegura(registro.acoes_liberadas),

        restricoes:
            listaSegura(registro.restricoes),

        modeloTipo:
            normalizarTexto(registro.modelo_tipo),

        modeloVersao:
            Number.isInteger(Number(registro.modelo_versao))
                ? Number(registro.modelo_versao)
                : null,

        destinatarioEmail:
            normalizarEmail(registro.destinatario_email),

        remetenteNome:
            normalizarTexto(registro.remetente_nome),

        status:
            normalizarTexto(registro.status).toUpperCase(),

        chaveIdempotencia:
            normalizarTexto(registro.chave_idempotencia).toLowerCase(),

        tentativaNumero:
            Number.isInteger(Number(registro.tentativa_numero))
                ? Number(registro.tentativa_numero)
                : 1,

        reenvioDeId:
            normalizarTexto(registro.reenvio_de_id) ||
            null,

        provedorMensagemId:
            normalizarTexto(registro.provedor_mensagem_id) ||
            null,

        erroCodigo:
            normalizarTexto(
                registro.erro_codigo ??
                registro.mensagem_erro
            ) || null,

        solicitadoPor:
            normalizarTexto(registro.solicitado_por) ||
            null,

        solicitadoPorEmail:
            normalizarEmail(registro.solicitado_por_email) ||
            null,

        iniciadoEm:
            normalizarTexto(registro.iniciado_em) ||
            null,

        enviadoEm:
            normalizarTexto(registro.enviado_em) ||
            null,

        criadoEm:
            normalizarTexto(registro.criado_em) ||
            null,

        atualizadoEm:
            normalizarTexto(registro.atualizado_em) ||
            null,
    };
}

export async function listarHistoricoAcessoUsuarioEmailService({
    supabase,
    usuarioId = null,
    usuarioEmail = "",
    limite = 50,
} = {}) {
    if (!supabase?.rpc) {
        throw new Error(
            "Cliente Supabase não informado para consultar o histórico de comunicação de acesso."
        );
    }

    const limiteTratado = Number(limite);

    if (
        !Number.isInteger(limiteTratado) ||
        limiteTratado < 1 ||
        limiteTratado > 200
    ) {
        throw new Error(
            "Limite do histórico deve ser um inteiro entre 1 e 200."
        );
    }

    const usuarioIdTratado =
        normalizarTexto(usuarioId) ||
        null;

    const usuarioEmailTratado =
        normalizarEmail(usuarioEmail) ||
        null;

    const { data, error } =
        await supabase.rpc(
            RPC_HISTORICO_EMAIL_ACESSO_USUARIO,
            {
                p_usuario_id:
                    usuarioIdTratado,

                p_usuario_email:
                    usuarioEmailTratado,

                p_limite:
                    limiteTratado,
            }
        );

    if (error) {
        throw criarErroComunicacao(
            error,
            null
        );
    }

    return (Array.isArray(data) ? data : [])
        .map(
            normalizarRegistroHistoricoAcessoUsuarioEmail
        )
        .filter(Boolean);
}

export async function enviarAcessoUsuarioEmailService({
    supabase,
    usuarioEmail,
    senhaTemporaria,
    permissoesSnapshot,
    chaveIdempotencia = null,
    reenvioDeId = null,
    geradorUuid = null,
} = {}) {
    if (!supabase?.functions?.invoke) {
        throw new Error(
            "Cliente Supabase não informado para enviar a comunicação de acesso."
        );
    }

    const usuarioEmailTratado =
        normalizarEmail(usuarioEmail);

    if (!emailValido(usuarioEmailTratado)) {
        throw new Error(
            "Informe um e-mail válido para enviar a comunicação de acesso."
        );
    }

    const senhaTransitória =
        String(senhaTemporaria ?? "");

    if (
        senhaTransitória.length < 6 ||
        senhaTransitória.length > 200
    ) {
        throw new Error(
            "A senha temporária deve ter entre 6 e 200 caracteres."
        );
    }

    if (
        !ehObjetoPlano(permissoesSnapshot) ||
        Number(permissoesSnapshot.versao) !== 1
    ) {
        throw new Error(
            "Snapshot de permissões inválido para enviar a comunicação de acesso."
        );
    }

    const chaveTratada =
        normalizarTexto(chaveIdempotencia)
            .toLowerCase() ||
        gerarChaveIdempotenciaAcessoUsuarioEmail({
            geradorUuid,
        });

    if (!UUID_REGEX.test(chaveTratada)) {
        throw new Error(
            "Chave de idempotência inválida para a comunicação de acesso."
        );
    }

    const reenvioTratado =
        normalizarTexto(reenvioDeId)
            .toLowerCase() ||
        null;

    if (
        reenvioTratado &&
        !UUID_REGEX.test(reenvioTratado)
    ) {
        throw new Error(
            "Referência de reenvio inválida para a comunicação de acesso."
        );
    }

    const { data, error } =
        await supabase.functions.invoke(
            FUNCAO_EMAIL_ACESSO_USUARIO,
            {
                body: {
                    usuarioEmail:
                        usuarioEmailTratado,

                    senhaTemporaria:
                        senhaTransitória,

                    permissoesSnapshot,

                    chaveIdempotencia:
                        chaveTratada,

                    reenvioDeId:
                        reenvioTratado,
                },
            }
        );

    if (
        error ||
        data?.ok === false
    ) {
        throw criarErroComunicacao(
            error,
            data
        );
    }

    return {
        ok:
            data?.ok === true,

        idempotente:
            data?.idempotente === true,

        envioId:
            normalizarTexto(data?.envioId) ||
            null,

        status:
            normalizarTexto(data?.status)
                .toUpperCase(),

        tipoModelo:
            normalizarTexto(data?.tipoModelo),

        modeloVersao:
            Number.isInteger(Number(data?.modeloVersao))
                ? Number(data.modeloVersao)
                : null,

        chaveIdempotencia:
            chaveTratada,

        reenvioDeId:
            reenvioTratado,
    };
}
