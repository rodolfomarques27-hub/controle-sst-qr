import {
    SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO,
    TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO,
    normalizarConfiguracaoAuditoriaPublica,
} from "../constants/auditoriaPublicaConstants";

const normalizarTexto = (valor) => String(valor || "").trim();
const normalizarComparacao = (valor) => normalizarTexto(valor).toUpperCase();

export function avaliarSegurancaAuditoriaPublica(configuracao = {}) {
    const config = normalizarConfiguracaoAuditoriaPublica(configuracao);
    const token = normalizarTexto(config.tokenPublico);
    const senhaReferencia = normalizarTexto(config.senhaReferencia);
    const tokenPadrao = normalizarComparacao(TOKEN_AUDITORIA_CAMPO_PUBLICA_PADRAO);
    const senhaPadrao = normalizarTexto(SENHA_REFERENCIA_AUDITORIA_CAMPO_PUBLICA_PADRAO);
    const tokenAtual = normalizarComparacao(token);

    return [
        {
            chave: "token_preenchido",
            label: "Token público preenchido",
            ok: Boolean(token),
            nivel: token ? "ok" : "critico",
            descricao: token ? "Existe token para compor o link público." : "O link público ficaria sem token na URL.",
            recomendacao: token ? "Mantenha o token salvo e gere novos QR Codes quando houver troca." : "Informe um token público antes de gerar QR Codes.",
        },
        {
            chave: "token_nao_padrao",
            label: "Token diferente do padrão inicial",
            ok: tokenAtual && tokenAtual !== tokenPadrao,
            nivel: tokenAtual && tokenAtual !== tokenPadrao ? "ok" : "alerta",
            descricao: tokenAtual && tokenAtual !== tokenPadrao
                ? "O token local configurado não é o valor padrão do roteiro."
                : "O token ainda parece ser o token padrão usado no desenvolvimento.",
            recomendacao: tokenAtual && tokenAtual !== tokenPadrao
                ? "Confirme se esse mesmo token existe e está ativo no Supabase/RPC."
                : "Troque o token padrão por um valor operacional e cadastre/ative o mesmo token no Supabase.",
        },
        {
            chave: "token_tamanho",
            label: "Token com tamanho adequado",
            ok: token.length >= 20,
            nivel: token.length >= 20 ? "ok" : "alerta",
            descricao: token.length >= 20 ? "O token tem tamanho mínimo razoável." : "Token curto facilita tentativa manual e confusão operacional.",
            recomendacao: token.length >= 20 ? "Evite token com nome óbvio de empresa, obra ou usuário." : "Use um token maior, com letras, números e separadores.",
        },
        {
            chave: "senha_referencia",
            label: "Senha de referência documentada",
            ok: Boolean(senhaReferencia),
            nivel: senhaReferencia ? "ok" : "alerta",
            descricao: senhaReferencia ? "Existe uma senha de referência visível para operação." : "A senha de referência local está vazia.",
            recomendacao: senhaReferencia ? "Lembre-se: a validação real continua no Supabase/RPC." : "Documente a senha de referência ou restaure o padrão operacional.",
        },
        {
            chave: "senha_nao_padrao",
            label: "Senha diferente do padrão 2026",
            ok: senhaReferencia && senhaReferencia !== senhaPadrao,
            nivel: senhaReferencia && senhaReferencia !== senhaPadrao ? "ok" : "alerta",
            descricao: senhaReferencia && senhaReferencia !== senhaPadrao
                ? "A senha de referência local não está no padrão inicial."
                : "A senha de referência ainda está como 2026.",
            recomendacao: senhaReferencia && senhaReferencia !== senhaPadrao
                ? "Confirme se a senha real foi alterada também no Supabase/RPC."
                : "Para operação real, altere a senha no Supabase/RPC e documente aqui a referência atualizada.",
        },
        {
            chave: "exigir_senha",
            label: "Acesso público com senha habilitada",
            ok: config.exigirSenha !== false,
            nivel: config.exigirSenha !== false ? "ok" : "critico",
            descricao: config.exigirSenha !== false ? "A configuração local indica exigência de senha." : "A configuração local indica acesso sem exigência de senha.",
            recomendacao: config.exigirSenha !== false ? "Mantenha a validação real no Supabase/RPC." : "Reative a exigência de senha para auditoria pública.",
        },
        {
            chave: "senha_fora_url",
            label: "Senha fora do link público",
            ok: true,
            nivel: "ok",
            descricao: "O link público usa token na URL, mas não inclui senha no endereço.",
            recomendacao: "Nunca coloque a senha no QR Code, na URL ou em texto visível da placa.",
        },
        {
            chave: "validacao_rpc",
            label: "Validação real no Supabase/RPC",
            ok: true,
            nivel: "info",
            descricao: "A tela apenas documenta a configuração operacional. A validação real deve continuar na RPC validar_acesso_auditoria_publica.",
            recomendacao: "Na revisão final, conferir tabela/token ativo, RPC e políticas RLS no Supabase.",
        },
    ];
}

export function calcularResumoSegurancaAuditoriaPublica(avaliacoes = []) {
    const criticos = avaliacoes.filter((item) => item.nivel === "critico").length;
    const alertas = avaliacoes.filter((item) => item.nivel === "alerta").length;
    const ok = avaliacoes.filter((item) => item.nivel === "ok").length;

    if (criticos > 0) {
        return {
            nivel: "critico",
            texto: "Crítico",
            detalhe: `${criticos} ponto(s) crítico(s) precisam de correção`,
            classe: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (alertas > 0) {
        return {
            nivel: "alerta",
            texto: "Atenção",
            detalhe: `${alertas} recomendação(ões) pendente(s)`,
            classe: "bg-orange-50 text-orange-700 ring-orange-200",
        };
    }

    return {
        nivel: "ok",
        texto: "Adequado",
        detalhe: `${ok} verificação(ões) em conformidade`,
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
}

export function montarChecklistSegurancaAuditoriaPublicaTexto(avaliacoes = []) {
    return avaliacoes.map((item) => {
        const status = item.nivel === "ok" ? "OK" : item.nivel === "critico" ? "CRÍTICO" : item.nivel === "alerta" ? "ATENÇÃO" : "INFO";
        return `[${status}] ${item.label}\n- ${item.descricao}\n- Recomendação: ${item.recomendacao}`;
    }).join("\n\n");
}
