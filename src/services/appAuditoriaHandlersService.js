import {
    carregarAuditoriaSistemaService,
    carregarAuditoriasCampoService,
    carregarEmailsEnviadosService,
    carregarMaisAuditoriaSistemaService,
    carregarMaisAuditoriasCampoService,
    registrarAuditoriaSistemaService,
    registrarEmailEnviadoService,
} from "./auditoriaSistemaCrudService";
import {
    alternarUsuarioAutorizadoAuditoriaService,
    carregarUsuariosAutorizadosAuditoriaService,
    salvarUsuarioAutorizadoAuditoriaService,
    verificarAcessoAuditoriaService,
} from "./auditoriaPermissoesService";

export async function carregarAuditoriaAppService({
    supabase,
    limite,
    setCarregandoAuditoria,
    setAuditoria,
    setExisteMaisAuditoria,
    setAuditoriaCarregada,
}) {
    setCarregandoAuditoria(true);

    try {
        const resultado = await carregarAuditoriaSistemaService({
            supabase,
            limite,
        });

        setAuditoria(resultado.registros);
        setExisteMaisAuditoria(resultado.existeMais);
        return resultado.registros;
    } catch (error) {
        console.warn("Erro ao carregar auditoria:", error.message);
        setAuditoria([]);
        setExisteMaisAuditoria(false);
        return [];
    } finally {
        setCarregandoAuditoria(false);
        setAuditoriaCarregada(true);
    }
}

export async function carregarMaisAuditoriaAppService({
    supabase,
    auditoria,
    carregandoMaisAuditoria,
    limite,
    setCarregandoMaisAuditoria,
    setAuditoria,
    setAuditoriaCarregada,
    setExisteMaisAuditoria,
}) {
    if (carregandoMaisAuditoria) return [];

    const offsetAtual = auditoria.length;
    setCarregandoMaisAuditoria(true);

    try {
        const resultado = await carregarMaisAuditoriaSistemaService({
            supabase,
            offsetAtual,
            limite,
        });

        setAuditoria((atual) => {
            const idsAtuais = new Set(atual.map((item) => item.id));
            const novosSemDuplicidade = resultado.registros.filter((item) => !idsAtuais.has(item.id));
            return [...atual, ...novosSemDuplicidade];
        });

        setAuditoriaCarregada(true);
        setExisteMaisAuditoria(resultado.existeMais);
        return resultado.registros;
    } catch (error) {
        console.warn("Erro ao carregar mais registros da auditoria:", error.message);
        alert(`Erro ao carregar mais registros da Auditoria de sistema: ${error.message}`);
        return [];
    } finally {
        setCarregandoMaisAuditoria(false);
    }
}

export async function carregarEmailsEnviadosAppService({
    supabase,
    limite,
    setEmailsEnviados,
    setEmailsEnviadosCarregados,
}) {
    try {
        const registros = await carregarEmailsEnviadosService({
            supabase,
            limite,
        });

        setEmailsEnviados(registros);
        return registros;
    } catch (error) {
        console.warn("Erro ao carregar histórico de e-mails:", error.message);
        setEmailsEnviados([]);
        return [];
    } finally {
        setEmailsEnviadosCarregados(true);
    }
}

export async function carregarAuditoriasCampoAppService({
    supabase,
    limite,
    setCarregandoAuditoriasCampo,
    setErroAuditoriasCampo,
    setAuditoriasCampo,
    setExisteMaisAuditoriasCampo,
    setAuditoriasCampoCarregadas,
}) {
    setCarregandoAuditoriasCampo(true);
    setErroAuditoriasCampo("");

    try {
        const resultado = await carregarAuditoriasCampoService({
            supabase,
            limite,
        });

        setAuditoriasCampo(resultado.auditorias);
        setExisteMaisAuditoriasCampo(resultado.existeMais);
        return resultado.auditorias;
    } catch (error) {
        console.warn("Erro ao carregar auditorias de campo:", error.message);
        setErroAuditoriasCampo(error.message || "Erro ao carregar auditorias de campo.");
        setAuditoriasCampo([]);
        setExisteMaisAuditoriasCampo(false);
        return [];
    } finally {
        setAuditoriasCampoCarregadas(true);
        setCarregandoAuditoriasCampo(false);
    }
}

export async function carregarMaisAuditoriasCampoAppService({
    supabase,
    auditoriasCampo,
    carregandoMaisAuditoriasCampo,
    carregandoAuditoriasCampo,
    limite,
    setCarregandoMaisAuditoriasCampo,
    setErroAuditoriasCampo,
    setAuditoriasCampo,
    setAuditoriasCampoCarregadas,
    setExisteMaisAuditoriasCampo,
}) {
    if (carregandoMaisAuditoriasCampo || carregandoAuditoriasCampo) return [];

    const offsetAtual = auditoriasCampo.length;
    setCarregandoMaisAuditoriasCampo(true);
    setErroAuditoriasCampo("");

    try {
        const resultado = await carregarMaisAuditoriasCampoService({
            supabase,
            offsetAtual,
            limite,
        });

        setAuditoriasCampo((atual) => {
            const chavesAtuais = new Set(
                atual.map((item) => String(item.id || item.numeroAuditoria || item.createdAt || ""))
            );
            const novosSemDuplicidade = resultado.auditorias.filter((item) => {
                const chave = String(item.id || item.numeroAuditoria || item.createdAt || "");
                return chave && !chavesAtuais.has(chave);
            });

            return [...atual, ...novosSemDuplicidade];
        });

        setAuditoriasCampoCarregadas(true);
        setExisteMaisAuditoriasCampo(resultado.existeMais);
        return resultado.auditorias;
    } catch (error) {
        console.warn("Erro ao carregar mais auditorias de campo:", error.message);
        setErroAuditoriasCampo(error.message || "Erro ao carregar mais auditorias de campo.");
        alert(`Erro ao carregar mais auditorias de campo: ${error.message}`);
        return [];
    } finally {
        setCarregandoMaisAuditoriasCampo(false);
    }
}

export async function registrarEmailEnviadoAppService({
    supabase,
    usuario,
    empresaId = null,
    colaboradorId = null,
    documentoId = null,
    destinatario = "",
    assunto = "",
    tipoAlerta = "",
    documento = "",
    statusEnvio = "",
    erro = "",
    setEmailsEnviadosCarregados,
    setEmailsEnviados,
}) {
    const resultado = await registrarEmailEnviadoService({
        supabase,
        usuario,
        empresaId,
        colaboradorId,
        documentoId,
        destinatario,
        assunto,
        tipoAlerta,
        documento,
        statusEnvio,
        erro,
    });

    if (!resultado.ok) return false;

    setEmailsEnviadosCarregados(true);
    setEmailsEnviados((atual) => [{ id: `${Date.now()}`, ...resultado.payload }, ...atual].slice(0, 300));
    return true;
}

export async function registrarAuditoriaAppService({
    supabase,
    usuario,
    acao,
    tabela,
    descricao,
    registroId = null,
    dados = {},
}) {
    return registrarAuditoriaSistemaService({
        supabase,
        usuario,
        acao,
        tabela,
        descricao,
        registroId,
        dados,
    });
}

export async function carregarUsuariosAutorizadosAuditoriaAppService({ supabase }) {
    try {
        return await carregarUsuariosAutorizadosAuditoriaService({ supabase });
    } catch (error) {
        alert(`Erro ao carregar usuários autorizados: ${error.message}`);
        return [];
    }
}

export async function salvarUsuarioAutorizadoAuditoriaAppService({
    supabase,
    usuarioAutorizado,
    registrarAuditoria,
}) {
    try {
        await salvarUsuarioAutorizadoAuditoriaService({
            supabase,
            usuarioAutorizado,
        });

        await registrarAuditoria(
            "USUARIO_AUDITORIA_AUTORIZADO",
            "auditoria_usuarios_autorizados",
            `Autorizou usuário para Auditoria: ${usuarioAutorizado.email}`,
            usuarioAutorizado.email,
            usuarioAutorizado
        );

        return true;
    } catch (error) {
        alert(error.message || "Erro ao autorizar usuário.");
        return false;
    }
}

export async function alternarUsuarioAutorizadoAuditoriaAppService({
    supabase,
    usuarioAutorizado,
    usuario,
    registrarAuditoria,
}) {
    try {
        const resultado = await alternarUsuarioAutorizadoAuditoriaService({
            supabase,
            usuarioAutorizado,
            usuario,
        });

        await registrarAuditoria(
            resultado.novoAcessoAuditoria ? "USUARIO_AUDITORIA_LIBERADO" : "USUARIO_AUDITORIA_BLOQUEADO",
            "auditoria_usuarios_autorizados",
            `${resultado.novoAcessoAuditoria ? "Liberou" : "Bloqueou"} acesso à Auditoria de sistema: ${usuarioAutorizado.email}`,
            usuarioAutorizado.id,
            {
                email: usuarioAutorizado.email,
                pode_acessar_auditoria: resultado.novoAcessoAuditoria,
                ativo: usuarioAutorizado.ativo,
            }
        );

        return true;
    } catch (error) {
        alert(error.message || "Erro ao atualizar permissão da Auditoria.");
        return false;
    }
}

export async function verificarAcessoAuditoriaAppService({
    supabase,
    usuario,
    setPodeAcessarAuditoria,
    setVerificandoAcessoAuditoria,
}) {
    if (!usuario?.email) {
        setPodeAcessarAuditoria(false);
        return false;
    }

    setVerificandoAcessoAuditoria(true);

    try {
        const acesso = await verificarAcessoAuditoriaService({ supabase, usuario });
        setPodeAcessarAuditoria(Boolean(acesso));
        return Boolean(acesso);
    } catch (error) {
        console.warn("Erro ao verificar permissão da Auditoria de sistema:", error.message);
        setPodeAcessarAuditoria(false);
        return false;
    } finally {
        setVerificandoAcessoAuditoria(false);
    }
}

export async function liberarAuditoriaAppService({
    verificarAcessoAuditoria,
    setAuditoriaLiberada,
    carregarAuditoria,
    registrarAuditoria,
}) {
    const autorizadoAuditoria = await verificarAcessoAuditoria();

    if (!autorizadoAuditoria) {
        alert("Seu usuário não está autorizado no Supabase para acessar a Auditoria.");
        return;
    }

    try {
        window.sessionStorage.setItem("auditoriaLiberada", "true");
    } catch {
        // Sessão indisponível; mantém apenas em memória.
    }

    setAuditoriaLiberada(true);
    carregarAuditoria();
    registrarAuditoria("ACESSO_AUDITORIA", "auditoria_sistema", "Liberou acesso à tela de Auditoria pela regra do Supabase");
}

export function bloquearAuditoriaAppService({
    setAuditoriaLiberada,
    registrarAuditoria,
}) {
    try {
        window.sessionStorage.removeItem("auditoriaLiberada");
    } catch {
        // Sessão indisponível; mantém apenas em memória.
    }

    setAuditoriaLiberada(false);
    registrarAuditoria("BLOQUEIO_AUDITORIA", "auditoria_sistema", "Bloqueou novamente o acesso à tela de Auditoria");
}
