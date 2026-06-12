import { supabase } from "../lib/supabaseClient";

export const CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA = "auditoriaSistemaEventosVerificados";
export const TABELA_CONFIG_AUDITORIA_SISTEMA = "auditoria_sistema_configuracoes";
export const CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA = "eventos_verificados";

const criarEventoAuditoriaSistema = ({ chave, label, categoria, modulo, nivel = "informacao", descricao }) => ({
    chave,
    label,
    categoria,
    modulo,
    nivel,
    descricao,
});

export const EVENTOS_AUDITORIA_SISTEMA_PADRAO = [
    criarEventoAuditoriaSistema({
        chave: "ACESSO",
        label: "Acesso ao sistema",
        categoria: "Login/Acesso",
        modulo: "Login/Acesso",
        nivel: "informacao",
        descricao: "Registra entrada no sistema e eventos gerais de acesso.",
    }),
    criarEventoAuditoriaSistema({
        chave: "ACESSO_TELA",
        label: "Troca de tela",
        categoria: "Login/Acesso",
        modulo: "Login/Acesso",
        nivel: "informacao",
        descricao: "Registra quando o usuário acessa as telas do sistema.",
    }),
    criarEventoAuditoriaSistema({
        chave: "ACESSO_QR_INTERNO",
        label: "Consulta QR interna",
        categoria: "QR Code",
        modulo: "QR Code",
        nivel: "informacao",
        descricao: "Registra abertura de QR Code de colaborador dentro do sistema.",
    }),
    criarEventoAuditoriaSistema({
        chave: "ACESSO_AUDITORIA",
        label: "Acesso à Auditoria do Sistema",
        categoria: "Permissões",
        modulo: "Auditoria do Sistema",
        nivel: "seguranca",
        descricao: "Registra liberação e acesso à área restrita da Auditoria do Sistema.",
    }),
    criarEventoAuditoriaSistema({
        chave: "BLOQUEIO_AUDITORIA",
        label: "Bloqueio da Auditoria do Sistema",
        categoria: "Permissões",
        modulo: "Auditoria do Sistema",
        nivel: "seguranca",
        descricao: "Registra bloqueio manual da Auditoria do Sistema.",
    }),
    criarEventoAuditoriaSistema({
        chave: "ATUALIZAR_DASHBOARD_SST",
        label: "Atualização do Dashboard SST",
        categoria: "Dashboard",
        modulo: "Dashboard SST",
        nivel: "informacao",
        descricao: "Registra atualização manual das informações do Dashboard SST.",
    }),
    criarEventoAuditoriaSistema({
        chave: "INSERT",
        label: "Inclusão no banco",
        categoria: "Banco de dados",
        modulo: "Sistema",
        nivel: "informacao",
        descricao: "Evento técnico genérico para novos registros salvos no banco.",
    }),
    criarEventoAuditoriaSistema({
        chave: "UPDATE",
        label: "Alteração no banco",
        categoria: "Banco de dados",
        modulo: "Sistema",
        nivel: "alerta",
        descricao: "Evento técnico genérico para alterações em registros existentes.",
    }),
    criarEventoAuditoriaSistema({
        chave: "DELETE",
        label: "Exclusão no banco",
        categoria: "Banco de dados",
        modulo: "Sistema",
        nivel: "critico",
        descricao: "Evento técnico genérico para exclusões de registros do sistema.",
    }),
    criarEventoAuditoriaSistema({
        chave: "DELETE_STORAGE",
        label: "Exclusão de arquivo no Storage",
        categoria: "Storage",
        modulo: "Storage",
        nivel: "critico",
        descricao: "Registra remoção de arquivos armazenados sem vínculo ou por limpeza.",
    }),

    criarEventoAuditoriaSistema({ chave: "USUARIO_ADICIONADO", label: "Usuário adicionado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra inclusão de usuário na gestão de permissões." }),
    criarEventoAuditoriaSistema({ chave: "USUARIO_EDITADO", label: "Usuário editado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra alteração de dados cadastrais ou função do usuário." }),
    criarEventoAuditoriaSistema({ chave: "USUARIO_BLOQUEADO", label: "Usuário bloqueado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra bloqueio operacional de usuário." }),
    criarEventoAuditoriaSistema({ chave: "USUARIO_DESBLOQUEADO", label: "Usuário desbloqueado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra desbloqueio operacional de usuário." }),
    criarEventoAuditoriaSistema({ chave: "LOGIN_APP_CRIADO", label: "Login do app criado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra criação ou redefinição de login real do app com senha temporária." }),
    criarEventoAuditoriaSistema({ chave: "PERMISSAO_ACESSO_SALVA", label: "Permissão de acesso salva", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra salvamento de permissão individual na aba Acessos do App." }),
    criarEventoAuditoriaSistema({ chave: "ACESSO_APP_EXCLUIDO", label: "Acesso do app excluído", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "critico", descricao: "Registra exclusão definitiva de acesso do app." }),
    criarEventoAuditoriaSistema({ chave: "FOTO_ACESSO_ALTERADA", label: "Foto do acesso alterada", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "informacao", descricao: "Registra alteração da foto usada na identificação visual do usuário do app." }),
    criarEventoAuditoriaSistema({ chave: "PERFIL_ALTERADO", label: "Perfil alterado", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra alteração de perfil, como Administrador, Técnico SST, Auditor, Gestor, Consulta ou Bloqueado." }),
    criarEventoAuditoriaSistema({ chave: "ACESSO_GLOBAL_CONCEDIDO", label: "Acesso global concedido", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "critico", descricao: "Registra concessão de acesso global ao sistema." }),
    criarEventoAuditoriaSistema({ chave: "ACESSO_GLOBAL_REMOVIDO", label: "Acesso global removido", categoria: "Permissões e usuários", modulo: "Permissões", nivel: "seguranca", descricao: "Registra remoção de acesso global do usuário." }),
    criarEventoAuditoriaSistema({ chave: "SOLICITACAO_ACESSO_CRIADA", label: "Solicitação de acesso criada", categoria: "Solicitação de acesso", modulo: "Permissões", nivel: "informacao", descricao: "Registra pedido de acesso feito por usuário sem permissão." }),
    criarEventoAuditoriaSistema({ chave: "SOLICITACAO_ACESSO_APROVADA", label: "Solicitação de acesso aprovada", categoria: "Solicitação de acesso", modulo: "Permissões", nivel: "seguranca", descricao: "Registra aprovação de solicitação de acesso." }),
    criarEventoAuditoriaSistema({ chave: "SOLICITACAO_ACESSO_RECUSADA", label: "Solicitação de acesso recusada", categoria: "Solicitação de acesso", modulo: "Permissões", nivel: "alerta", descricao: "Registra recusa de solicitação de acesso." }),
    criarEventoAuditoriaSistema({ chave: "SOLICITACAO_ACESSO_CONCLUIDA", label: "Solicitação de acesso concluída", categoria: "Solicitação de acesso", modulo: "Permissões", nivel: "seguranca", descricao: "Registra conclusão após a permissão ser salva." }),
    criarEventoAuditoriaSistema({ chave: "SOLICITACAO_ACESSO_ATUALIZADA", label: "Solicitação de acesso atualizada", categoria: "Solicitação de acesso", modulo: "Permissões", nivel: "seguranca", descricao: "Registra atualização administrativa de solicitação de acesso." }),
    criarEventoAuditoriaSistema({ chave: "PERFIL_PADRAO_EDITADO", label: "Perfil padrão editado", categoria: "Perfis padrão", modulo: "Permissões", nivel: "seguranca", descricao: "Registra alteração do perfil padrão editável usado para permissões." }),
    criarEventoAuditoriaSistema({ chave: "PERFIL_PADRAO_RESTAURADO", label: "Perfil padrão restaurado", categoria: "Perfis padrão", modulo: "Permissões", nivel: "alerta", descricao: "Registra restauração do perfil padrão para a configuração original." }),
    criarEventoAuditoriaSistema({ chave: "PERFIL_PADRAO_APLICADO_USUARIOS", label: "Perfil padrão aplicado aos usuários", categoria: "Perfis padrão", modulo: "Permissões", nivel: "critico", descricao: "Registra aplicação em massa de um perfil padrão editável aos usuários existentes." }),

    criarEventoAuditoriaSistema({ chave: "SENHA_CONFIGURACOES_ALTERADA", label: "Senha de configurações alterada", categoria: "Configurações", modulo: "Configurações", nivel: "critico", descricao: "Registra alteração de senha ou proteção de configurações." }),
    criarEventoAuditoriaSistema({ chave: "LIMITE_CARREGAMENTO_ALTERADO", label: "Limite de carregamento alterado", categoria: "Configurações", modulo: "Configurações", nivel: "alerta", descricao: "Registra alteração de limites de carregamento das telas." }),
    criarEventoAuditoriaSistema({ chave: "CONFIGURACAO_RESTAURADA", label: "Configuração restaurada", categoria: "Configurações", modulo: "Configurações", nivel: "alerta", descricao: "Registra restauração de configuração para o padrão." }),
    criarEventoAuditoriaSistema({ chave: "TOKEN_PUBLICO_ATUALIZADO", label: "Token público atualizado", categoria: "Configurações", modulo: "Configurações", nivel: "seguranca", descricao: "Registra atualização de token público usado em auditoria ou consulta." }),
    criarEventoAuditoriaSistema({ chave: "CONFIGURACAO_AUDITORIA_PUBLICA_ALTERADA", label: "Configuração de auditoria pública alterada", categoria: "Configurações", modulo: "Configurações", nivel: "seguranca", descricao: "Registra alteração de regras da auditoria pública." }),

    criarEventoAuditoriaSistema({ chave: "EMPRESA_CRIADA", label: "Empresa criada", categoria: "Dados operacionais", modulo: "Empresas", nivel: "informacao", descricao: "Registra criação de empresa." }),
    criarEventoAuditoriaSistema({ chave: "EMPRESA_EDITADA", label: "Empresa editada", categoria: "Dados operacionais", modulo: "Empresas", nivel: "alerta", descricao: "Registra alteração de dados de empresa." }),
    criarEventoAuditoriaSistema({ chave: "EMPRESA_EXCLUIDA", label: "Empresa excluída", categoria: "Dados operacionais", modulo: "Empresas", nivel: "critico", descricao: "Registra exclusão de empresa." }),
    criarEventoAuditoriaSistema({ chave: "COLABORADOR_CRIADO", label: "Colaborador criado", categoria: "Dados operacionais", modulo: "Colaboradores", nivel: "informacao", descricao: "Registra criação de colaborador." }),
    criarEventoAuditoriaSistema({ chave: "COLABORADOR_EDITADO", label: "Colaborador editado", categoria: "Dados operacionais", modulo: "Colaboradores", nivel: "alerta", descricao: "Registra alteração de dados de colaborador." }),
    criarEventoAuditoriaSistema({ chave: "COLABORADOR_EXCLUIDO", label: "Colaborador excluído", categoria: "Dados operacionais", modulo: "Colaboradores", nivel: "critico", descricao: "Registra exclusão de colaborador." }),
    criarEventoAuditoriaSistema({ chave: "CERTIFICADO_ENVIADO", label: "Certificado enviado", categoria: "Treinamentos", modulo: "Treinamentos", nivel: "informacao", descricao: "Registra envio de certificado de treinamento." }),
    criarEventoAuditoriaSistema({ chave: "CERTIFICADO_EDITADO", label: "Certificado editado", categoria: "Treinamentos", modulo: "Treinamentos", nivel: "alerta", descricao: "Registra revisão ou alteração de certificado." }),
    criarEventoAuditoriaSistema({ chave: "CERTIFICADO_EXCLUIDO", label: "Certificado excluído", categoria: "Treinamentos", modulo: "Treinamentos", nivel: "critico", descricao: "Registra exclusão de certificado." }),
    criarEventoAuditoriaSistema({ chave: "DOCUMENTO_EMPRESA_ENVIADO", label: "Documento de empresa enviado", categoria: "Documentos", modulo: "Empresas", nivel: "informacao", descricao: "Registra envio de PGR, PCMSO, LTCAT ou documento empresarial." }),
    criarEventoAuditoriaSistema({ chave: "DOCUMENTO_EMPRESA_REVISADO", label: "Documento de empresa revisado", categoria: "Documentos", modulo: "Empresas", nivel: "alerta", descricao: "Registra revisão documental de empresa." }),
    criarEventoAuditoriaSistema({ chave: "DOCUMENTO_EXCLUIDO", label: "Documento excluído", categoria: "Documentos", modulo: "Empresas", nivel: "critico", descricao: "Registra exclusão de documento." }),

    criarEventoAuditoriaSistema({ chave: "AUDITORIA_CAMPO_CRIADA", label: "Auditoria de campo criada", categoria: "Auditoria de campo", modulo: "Auditoria", nivel: "informacao", descricao: "Registra criação de auditoria de campo." }),
    criarEventoAuditoriaSistema({ chave: "AUDITORIA_CAMPO_REABERTA", label: "Auditoria de campo reaberta", categoria: "Auditoria de campo", modulo: "Auditoria", nivel: "alerta", descricao: "Registra reabertura de auditoria de campo." }),
    criarEventoAuditoriaSistema({ chave: "AUDITORIA_CAMPO_ATUALIZADA", label: "Auditoria de campo atualizada", categoria: "Auditoria de campo", modulo: "Auditoria", nivel: "alerta", descricao: "Registra atualização de auditoria de campo." }),
    criarEventoAuditoriaSistema({ chave: "EVIDENCIA_ENVIADA", label: "Evidência enviada", categoria: "Auditoria de campo", modulo: "Auditoria", nivel: "informacao", descricao: "Registra envio de evidência antes/depois ou anexo." }),
    criarEventoAuditoriaSistema({ chave: "RELATORIO_VISUALIZADO", label: "Relatório visualizado", categoria: "Relatórios", modulo: "Relatórios", nivel: "informacao", descricao: "Registra abertura ou visualização de relatório." }),
    criarEventoAuditoriaSistema({ chave: "RELATORIO_EXPORTADO", label: "Relatório exportado", categoria: "Relatórios", modulo: "Relatórios", nivel: "informacao", descricao: "Registra exportação de relatório ou CSV." }),

    criarEventoAuditoriaSistema({ chave: "ARQUIVO_LISTADO", label: "Arquivo listado", categoria: "Storage", modulo: "Storage", nivel: "informacao", descricao: "Registra consulta/listagem de arquivos no Storage." }),
    criarEventoAuditoriaSistema({ chave: "ARQUIVO_EXCLUIDO", label: "Arquivo excluído", categoria: "Storage", modulo: "Storage", nivel: "critico", descricao: "Registra exclusão individual de arquivo." }),
    criarEventoAuditoriaSistema({ chave: "LIMPEZA_STORAGE_EXECUTADA", label: "Limpeza de Storage executada", categoria: "Storage", modulo: "Storage", nivel: "critico", descricao: "Registra limpeza de arquivos sem vínculo." }),
    criarEventoAuditoriaSistema({ chave: "ERRO_ACESSO_ARQUIVO", label: "Erro ao acessar arquivo", categoria: "Storage", modulo: "Storage", nivel: "critico", descricao: "Registra falha ao acessar, abrir ou localizar arquivo." }),
    criarEventoAuditoriaSistema({ chave: "URL_ASSINADA_GERADA", label: "URL assinada gerada", categoria: "Storage", modulo: "Storage", nivel: "seguranca", descricao: "Registra geração de URL assinada para arquivo privado." }),

    criarEventoAuditoriaSistema({ chave: "TENTATIVA_ACESSO_BLOQUEADO", label: "Tentativa de acesso bloqueado", categoria: "Segurança", modulo: "Login/Acesso", nivel: "seguranca", descricao: "Registra tentativa de acesso bloqueada pela regra do sistema." }),
    criarEventoAuditoriaSistema({ chave: "ACESSO_NEGADO_PERFIL", label: "Acesso negado por perfil", categoria: "Segurança", modulo: "Permissões", nivel: "seguranca", descricao: "Registra acesso negado por perfil ou ausência de permissão." }),
    criarEventoAuditoriaSistema({ chave: "ERRO_RPC", label: "Erro de RPC", categoria: "Segurança", modulo: "Sistema", nivel: "critico", descricao: "Registra falha em chamada RPC do Supabase." }),
    criarEventoAuditoriaSistema({ chave: "ERRO_SUPABASE", label: "Erro de Supabase", categoria: "Segurança", modulo: "Sistema", nivel: "critico", descricao: "Registra erro técnico retornado pelo Supabase." }),
    criarEventoAuditoriaSistema({ chave: "OPERACAO_SEM_PERMISSAO", label: "Operação sem permissão", categoria: "Segurança", modulo: "Permissões", nivel: "seguranca", descricao: "Registra tentativa de operação sem permissão suficiente." }),
];

const MAPA_EVENTOS_AUDITORIA_SISTEMA = EVENTOS_AUDITORIA_SISTEMA_PADRAO.reduce((acc, evento) => {
    acc[evento.chave] = evento;
    return acc;
}, {});

export function normalizarChaveAcaoAuditoria(acao) {
    return String(acao || "")
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "_");
}

function normalizarTextoAuditoria(valor) {
    return String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function montarLabelEventoAuditoria(chave) {
    return String(chave || "")
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

export function obterEventoAuditoriaSistemaPorAcao(acao) {
    const chave = normalizarChaveAcaoAuditoria(acao);
    return MAPA_EVENTOS_AUDITORIA_SISTEMA[chave] || null;
}

export function obterRotuloAcaoAuditoriaSistema(acao) {
    const chave = normalizarChaveAcaoAuditoria(acao);
    const evento = obterEventoAuditoriaSistemaPorAcao(chave);
    return evento?.label || montarLabelEventoAuditoria(chave || acao || "Evento registrado");
}

export function obterModuloAuditoriaSistemaPorRegistro(registro = {}) {
    const evento = obterEventoAuditoriaSistemaPorAcao(registro?.acao);
    if (evento?.modulo) return evento.modulo;

    const tabela = String(registro?.tabela || "").trim();
    const acao = normalizarChaveAcaoAuditoria(registro?.acao);
    const texto = normalizarTextoAuditoria(`${registro?.tabela || ""} ${registro?.acao || ""} ${registro?.descricao || ""}`);

    if (texto.includes("permiss") || texto.includes("solicitacao_acesso") || texto.includes("usuario_permissao")) return "Permissões";
    if (texto.includes("config") || texto.includes("token")) return "Configurações";
    if (texto.includes("storage") || acao.includes("STORAGE") || texto.includes("arquivo")) return "Storage";
    if (texto.includes("treinamento") || texto.includes("certificado")) return "Treinamentos";
    if (texto.includes("colaborador")) return "Colaboradores";
    if (texto.includes("empresa") || texto.includes("documento")) return "Empresas";
    if (texto.includes("auditoria") && !texto.includes("auditoria_sistema")) return "Auditoria";
    if (texto.includes("qr")) return "QR Code";
    if (acao.includes("ACESSO") || texto.includes("login")) return "Login/Acesso";

    return tabela || "Sistema";
}

export function obterNivelAuditoriaSistemaPorRegistro(registro = {}) {
    const evento = obterEventoAuditoriaSistemaPorAcao(registro?.acao);
    if (evento?.nivel) return evento.nivel;

    const texto = normalizarTextoAuditoria(`${registro?.acao || ""} ${registro?.tabela || ""} ${registro?.descricao || ""}`);

    if (texto.includes("bloque") || texto.includes("negad") || texto.includes("sem permiss") || texto.includes("token") || texto.includes("url assinada")) return "seguranca";
    if (texto.includes("erro") || texto.includes("rpc") || texto.includes("supabase") || texto.includes("delete") || texto.includes("exclus") || texto.includes("limpeza")) return "critico";
    if (texto.includes("update") || texto.includes("alter") || texto.includes("desabilit") || texto.includes("recus") || texto.includes("reabert")) return "alerta";

    return "informacao";
}

export function configuracaoPadraoEventosAuditoriaSistema() {
    return EVENTOS_AUDITORIA_SISTEMA_PADRAO.reduce((acc, evento) => {
        acc[evento.chave] = true;
        return acc;
    }, {});
}

export function normalizarConfiguracaoEventosAuditoriaSistema(configuracao = {}) {
    const padrao = configuracaoPadraoEventosAuditoriaSistema();

    if (!configuracao || typeof configuracao !== "object") {
        return padrao;
    }

    return { ...padrao, ...configuracao };
}

export function obterConfiguracaoEventosAuditoriaSistemaLocal() {
    if (typeof window === "undefined") {
        return configuracaoPadraoEventosAuditoriaSistema();
    }

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA) || "null");
        return normalizarConfiguracaoEventosAuditoriaSistema(salvo);
    } catch {
        return configuracaoPadraoEventosAuditoriaSistema();
    }
}

export function obterConfiguracaoEventosAuditoriaSistema() {
    return obterConfiguracaoEventosAuditoriaSistemaLocal();
}

export function salvarConfiguracaoEventosAuditoriaSistema(configuracao) {
    if (typeof window === "undefined") {
        return;
    }

    window.localStorage.setItem(
        CHAVE_CONFIG_EVENTOS_AUDITORIA_SISTEMA,
        JSON.stringify(normalizarConfiguracaoEventosAuditoriaSistema(configuracao))
    );
}

export async function carregarConfiguracaoEventosAuditoriaSistemaSupabase() {
    const configuracaoLocal = obterConfiguracaoEventosAuditoriaSistemaLocal();

    try {
        const { data, error } = await supabase
            .from(TABELA_CONFIG_AUDITORIA_SISTEMA)
            .select("valor, atualizado_em")
            .eq("chave", CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA)
            .maybeSingle();

        if (error) {
            return {
                configuracao: configuracaoLocal,
                origem: "local",
                atualizadoEm: null,
                erro: error.message,
            };
        }

        if (!data?.valor) {
            return {
                configuracao: configuracaoLocal,
                origem: "local",
                atualizadoEm: null,
                erro: "Configuração ainda não cadastrada no Supabase.",
            };
        }

        const configuracao = normalizarConfiguracaoEventosAuditoriaSistema(data.valor);
        salvarConfiguracaoEventosAuditoriaSistema(configuracao);

        return {
            configuracao,
            origem: "supabase",
            atualizadoEm: data.atualizado_em || null,
            erro: "",
        };
    } catch (error) {
        return {
            configuracao: configuracaoLocal,
            origem: "local",
            atualizadoEm: null,
            erro: error?.message || "Não foi possível carregar a configuração do Supabase.",
        };
    }
}

export async function salvarConfiguracaoEventosAuditoriaSistemaSupabase(configuracao) {
    const configuracaoNormalizada = normalizarConfiguracaoEventosAuditoriaSistema(configuracao);
    salvarConfiguracaoEventosAuditoriaSistema(configuracaoNormalizada);

    try {
        const { error } = await supabase
            .from(TABELA_CONFIG_AUDITORIA_SISTEMA)
            .upsert(
                {
                    chave: CHAVE_REGISTRO_EVENTOS_AUDITORIA_SISTEMA,
                    valor: configuracaoNormalizada,
                    atualizado_em: new Date().toISOString(),
                },
                { onConflict: "chave" }
            );

        if (error) {
            return {
                ok: false,
                origem: "local",
                erro: error.message,
            };
        }

        return {
            ok: true,
            origem: "supabase",
            erro: "",
        };
    } catch (error) {
        return {
            ok: false,
            origem: "local",
            erro: error?.message || "Não foi possível salvar a configuração no Supabase.",
        };
    }
}

export function auditoriaEventoHabilitado(acao, configuracao = null) {
    const chave = normalizarChaveAcaoAuditoria(acao);
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();

    return config[chave] !== false;
}

export function montarEventosAuditoriaSistema(registros = [], configuracao = null) {
    const config = configuracao || obterConfiguracaoEventosAuditoriaSistema();
    const mapa = new Map();

    EVENTOS_AUDITORIA_SISTEMA_PADRAO.forEach((evento) => {
        mapa.set(evento.chave, {
            ...evento,
            total: 0,
            habilitado: config[evento.chave] !== false,
            origem: "padrao",
        });
    });

    registros.forEach((registro) => {
        const chave = normalizarChaveAcaoAuditoria(registro?.acao);
        if (!chave) return;

        const existente = mapa.get(chave);

        if (existente) {
            mapa.set(chave, {
                ...existente,
                total: existente.total + 1,
                habilitado: config[chave] !== false,
            });
            return;
        }

        mapa.set(chave, {
            chave,
            label: obterRotuloAcaoAuditoriaSistema(chave),
            categoria: "Evento identificado",
            modulo: obterModuloAuditoriaSistemaPorRegistro(registro),
            nivel: obterNivelAuditoriaSistemaPorRegistro(registro),
            descricao: "Evento encontrado no histórico da Auditoria do Sistema.",
            total: 1,
            habilitado: config[chave] !== false,
            origem: "historico",
        });
    });

    return Array.from(mapa.values()).sort((a, b) => {
        const categoria = String(a.categoria || "").localeCompare(String(b.categoria || ""), "pt-BR");
        if (categoria !== 0) return categoria;

        const modulo = String(a.modulo || "").localeCompare(String(b.modulo || ""), "pt-BR");
        if (modulo !== 0) return modulo;

        return String(a.label || a.chave).localeCompare(String(b.label || b.chave), "pt-BR");
    });
}

export const TABELA_AUDITORIA_TOKENS_PUBLICOS = "auditoria_tokens_publicos";

const textoTokenAuditoriaPublica = (valor) => String(valor ?? "").trim();

function tokenAuditoriaPublicaValido(valor) {
    const token = textoTokenAuditoriaPublica(valor);
    return token.length >= 10 ? token : "";
}

function normalizarRegistroTokenAuditoriaPublica(registro = {}, origem = "supabase") {
    const token = tokenAuditoriaPublicaValido(registro?.token);

    return {
        ok: Boolean(token),
        origem,
        tokenPublico: token,
        id: registro?.id || null,
        descricao: registro?.descricao || registro?.nome || "",
        requerSenha: registro?.requer_senha !== false,
        ativo: registro?.ativo === true,
        dataExpiracao: registro?.data_expiracao || null,
        criadoEm: registro?.created_at || registro?.criado_em || null,
        erro: token ? "" : "Token ativo não encontrado.",
    };
}

export async function carregarTokenAuditoriaPublicaAtivoSupabase() {
    try {
        const { data, error } = await supabase
            .from(TABELA_AUDITORIA_TOKENS_PUBLICOS)
            .select("id, token, descricao, ativo, requer_senha, data_expiracao, created_at")
            .eq("ativo", true)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            return {
                ok: false,
                origem: "supabase",
                tokenPublico: "",
                id: null,
                descricao: "",
                requerSenha: true,
                ativo: false,
                dataExpiracao: null,
                criadoEm: null,
                erro: error.message || "Não foi possível carregar o token público ativo.",
            };
        }

        if (!data?.token) {
            return {
                ok: false,
                origem: "supabase",
                tokenPublico: "",
                id: null,
                descricao: "",
                requerSenha: true,
                ativo: false,
                dataExpiracao: null,
                criadoEm: null,
                erro: "Nenhum token público ativo encontrado na tabela auditoria_tokens_publicos.",
            };
        }

        return normalizarRegistroTokenAuditoriaPublica(data, "supabase");
    } catch (error) {
        return {
            ok: false,
            origem: "supabase",
            tokenPublico: "",
            id: null,
            descricao: "",
            requerSenha: true,
            ativo: false,
            dataExpiracao: null,
            criadoEm: null,
            erro: error?.message || "Não foi possível carregar o token público ativo.",
        };
    }
}

