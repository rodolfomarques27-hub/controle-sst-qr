import { salvarLimitesCarregamentoSistema } from "../constants/sistemaLimitesConstants";
import {
    salvarSenhaConfiguracoesSistema,
    salvarSenhaConfiguracoesSistemaSupabase,
} from "../constants/configuracoesSegurancaConstants";

export function atualizarLimitesCarregamentoSistemaAppService({
    novosLimites,
    setLimitesCarregamentoSistema,
}) {
    const normalizados = salvarLimitesCarregamentoSistema(novosLimites);
    setLimitesCarregamentoSistema(normalizados);
    return normalizados;
}

export function validarSenhaConfiguracoesAppService({
    evento,
    senhaConfiguracoes,
    senhaConfiguracoesSistema,
    setConfiguracoesDesbloqueadas,
    setSenhaConfiguracoes,
    setErroSenhaConfiguracoes,
}) {
    evento?.preventDefault?.();

    if (senhaConfiguracoes.trim() === senhaConfiguracoesSistema) {
        setConfiguracoesDesbloqueadas(true);
        setSenhaConfiguracoes("");
        setErroSenhaConfiguracoes("");
        return true;
    }

    setErroSenhaConfiguracoes("Senha incorreta para acessar Configurações.");
    return false;
}

export function bloquearConfiguracoesSistemaAppService({
    setConfiguracoesDesbloqueadas,
    setSenhaConfiguracoes,
    setErroSenhaConfiguracoes,
    setMostrarSenhaConfiguracoes,
}) {
    setConfiguracoesDesbloqueadas(false);
    setSenhaConfiguracoes("");
    setErroSenhaConfiguracoes("");
    setMostrarSenhaConfiguracoes(false);
}

export async function atualizarSenhaConfiguracoesSistemaAppService({
    supabase,
    usuario,
    novaSenha,
    setSenhaConfiguracoesSistema,
    setOrigemSenhaConfiguracoesSistema,
    setMensagemSenhaConfiguracoesSistema,
}) {
    const senhaLocal = salvarSenhaConfiguracoesSistema(novaSenha);
    setSenhaConfiguracoesSistema(senhaLocal);
    setOrigemSenhaConfiguracoesSistema("local");
    setMensagemSenhaConfiguracoesSistema("Senha salva localmente. Sincronizando com Supabase...");

    const resultado = await salvarSenhaConfiguracoesSistemaSupabase(supabase, senhaLocal, usuario);
    setSenhaConfiguracoesSistema(resultado.senha);
    setOrigemSenhaConfiguracoesSistema(resultado.origem || "local");
    setMensagemSenhaConfiguracoesSistema(resultado.mensagem || "Senha das Configurações atualizada.");

    return resultado;
}
