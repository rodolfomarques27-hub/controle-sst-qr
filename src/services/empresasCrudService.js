import { normalizarStatusEmpresa } from "./empresaDocumentosService";
import { normalizarTextoBusca } from "../utils/sstUtils";

const EMPRESA_SELECT = "id, nome, cnpj, responsavel, email, telefone, responsavel_auditoria, email_auditoria, whatsapp_auditoria, receber_auditoria, status, tipo_empresa, logo_url, logo_nome, contrato_url, contrato_nome, numero_contrato, data_inicio_contrato, data_fim_contrato, responsavel_contratante, tst_responsavel, tst_email, tst_whatsapp, escopo_servico, observacao_status, empresa_pai_id";

export async function adicionarEmpresaCrud({
    supabase,
    novaEmpresa,
    empresasBanco = [],
    enviarLogoEmpresa,
    enviarContratoEmpresa,
}) {
    const existente = empresasBanco.find(
        (empresa) => empresa.nome.toLowerCase() === novaEmpresa.nome.toLowerCase()
    );

    if (existente) {
        throw new Error("Essa empresa já está cadastrada.");
    }

    let { data, error } = await supabase
        .from("empresas")
        .insert({
            nome: novaEmpresa.nome,
            cnpj: novaEmpresa.cnpj || null,
            responsavel: novaEmpresa.responsavel || null,
            email: novaEmpresa.email || null,
            telefone: novaEmpresa.telefone || null,
            responsavel_auditoria: novaEmpresa.responsavelAuditoria || null,
            email_auditoria: novaEmpresa.emailAuditoria || null,
            whatsapp_auditoria: novaEmpresa.whatsappAuditoria || null,
            receber_auditoria: novaEmpresa.receberAuditoria !== false,
            tipo_empresa: novaEmpresa.tipoEmpresa || "Terceirizada",
            empresa_pai_id: novaEmpresa.empresaPaiId || null,
            status: "Empresa ativa",
            numero_contrato: novaEmpresa.numeroContrato || null,
            data_inicio_contrato: novaEmpresa.dataInicioContrato || null,
            data_fim_contrato: novaEmpresa.dataFimContrato || null,
            responsavel_contratante: novaEmpresa.responsavelContratante || null,
            tst_responsavel: novaEmpresa.tstResponsavel || null,
            tst_email: novaEmpresa.tstEmail || null,
            tst_whatsapp: novaEmpresa.tstWhatsapp || null,
            escopo_servico: novaEmpresa.escopoServico || null,
            observacao_status: novaEmpresa.observacaoStatus || null,
        })
        .select(EMPRESA_SELECT)
        .single();

    if (error) {
        throw new Error(`Erro ao cadastrar empresa: ${error.message}`);
    }

    if (novaEmpresa.logo || novaEmpresa.contratoArquivo) {
        const atualizacaoArquivos = {};

        if (novaEmpresa.logo) {
            const logo = await enviarLogoEmpresa(novaEmpresa.logo, data.id);
            atualizacaoArquivos.logo_url = logo.logoUrl;
            atualizacaoArquivos.logo_nome = logo.logoNome;
        }

        if (novaEmpresa.contratoArquivo) {
            const contrato = await enviarContratoEmpresa(novaEmpresa.contratoArquivo, data.id);
            atualizacaoArquivos.contrato_url = contrato.contratoUrl;
            atualizacaoArquivos.contrato_nome = contrato.contratoNome;
        }

        const { data: empresaComArquivos, error: arquivosError } = await supabase
            .from("empresas")
            .update(atualizacaoArquivos)
            .eq("id", data.id)
            .select(EMPRESA_SELECT)
            .single();

        if (arquivosError) {
            throw new Error(`Empresa cadastrada, mas houve erro ao salvar arquivos: ${arquivosError.message}`);
        }

        data = empresaComArquivos;
    }

    return data;
}

export async function atualizarEmpresaCrud({
    supabase,
    empresaAtualizada,
    enviarLogoEmpresa,
    enviarContratoEmpresa,
}) {
    let logoAtualizada = {
        logo_url: empresaAtualizada.logoAtual || null,
        logo_nome: empresaAtualizada.logoNomeAtual || null,
    };

    if (empresaAtualizada.logo) {
        const logo = await enviarLogoEmpresa(empresaAtualizada.logo, empresaAtualizada.id);
        logoAtualizada = {
            logo_url: logo.logoUrl,
            logo_nome: logo.logoNome,
        };
    }

    let contratoAtualizado = {
        contrato_url: empresaAtualizada.contratoUrlAtual || null,
        contrato_nome: empresaAtualizada.contratoNomeAtual || null,
    };

    if (empresaAtualizada.contratoArquivo) {
        const contrato = await enviarContratoEmpresa(empresaAtualizada.contratoArquivo, empresaAtualizada.id);
        contratoAtualizado = {
            contrato_url: contrato.contratoUrl,
            contrato_nome: contrato.contratoNome,
        };
    }

    const { data, error } = await supabase
        .from("empresas")
        .update({
            nome: empresaAtualizada.nome,
            cnpj: empresaAtualizada.cnpj || null,
            responsavel: empresaAtualizada.responsavel || null,
            email: empresaAtualizada.email || null,
            telefone: empresaAtualizada.telefone || null,
            responsavel_auditoria: empresaAtualizada.responsavelAuditoria || null,
            email_auditoria: empresaAtualizada.emailAuditoria || null,
            whatsapp_auditoria: empresaAtualizada.whatsappAuditoria || null,
            receber_auditoria: empresaAtualizada.receberAuditoria !== false,
            status: normalizarStatusEmpresa(empresaAtualizada.status),
            tipo_empresa: empresaAtualizada.tipoEmpresa || "Terceirizada",
            empresa_pai_id: empresaAtualizada.tipoEmpresa === "Subcontratada" ? empresaAtualizada.empresaPaiId : null,
            logo_url: logoAtualizada.logo_url,
            logo_nome: logoAtualizada.logo_nome,
            contrato_url: contratoAtualizado.contrato_url,
            contrato_nome: contratoAtualizado.contrato_nome,
            numero_contrato: empresaAtualizada.numeroContrato || null,
            data_inicio_contrato: empresaAtualizada.dataInicioContrato || null,
            data_fim_contrato: empresaAtualizada.dataFimContrato || null,
            responsavel_contratante: empresaAtualizada.responsavelContratante || null,
            tst_responsavel: empresaAtualizada.tstResponsavel || null,
            tst_email: empresaAtualizada.tstEmail || null,
            tst_whatsapp: empresaAtualizada.tstWhatsapp || null,
            escopo_servico: empresaAtualizada.escopoServico || null,
            observacao_status: empresaAtualizada.observacaoStatus || null,
        })
        .eq("id", empresaAtualizada.id)
        .select(EMPRESA_SELECT)
        .single();

    if (error) {
        throw new Error(`Erro ao atualizar empresa: ${error.message}`);
    }

    return data;
}

export async function excluirEmpresaCrud({ supabase, empresa, colaboradores = [] }) {
    if (!empresa?.id) {
        throw new Error("Empresa inválida para exclusão.");
    }

    const nomeEmpresaNormalizado = normalizarTextoBusca(empresa.nome || "");

    const colaboradoresVinculadosEstado = colaboradores.filter((colaborador) => {
        const mesmoId = String(colaborador.empresaId || colaborador.empresa_id || "") === String(empresa.id);
        const mesmoNome = nomeEmpresaNormalizado && normalizarTextoBusca(colaborador.empresa || colaborador.empresaExibicao || "") === nomeEmpresaNormalizado;
        return mesmoId || mesmoNome;
    });

    if (colaboradoresVinculadosEstado.length > 0) {
        throw new Error(
            `Não foi possível excluir ${empresa.nome || "esta empresa"}: existem ${colaboradoresVinculadosEstado.length} colaborador(es) vinculado(s). Desmobilize, transfira ou exclua os colaboradores antes de remover a empresa para preservar o histórico.`
        );
    }

    const { data, error } = await supabase.rpc("excluir_empresa_segura", {
        p_empresa_id: empresa.id,
    });

    if (error) {
        throw new Error(error.message || "Erro ao excluir empresa no Supabase.");
    }

    if (!data?.ok) {
        throw new Error(data?.mensagem || "A empresa não foi excluída. Atualize a página e tente novamente.");
    }

    return {
        data,
        mensagem: data.mensagem || `Empresa ${empresa.nome || "selecionada"} excluída com sucesso.`,
        nomeEmpresaNormalizado,
        normalizarNomeEmpresa: normalizarTextoBusca,
    };
}

export async function obterOuCriarEmpresaCrud({ supabase, nomeEmpresa, empresasBanco = [] }) {
    const nomeTratado = nomeEmpresa.trim();

    const existente = empresasBanco.find(
        (empresa) => empresa.nome.toLowerCase() === nomeTratado.toLowerCase()
    );

    if (existente) {
        return {
            empresa: existente,
            criada: false,
        };
    }

    const { data: existenteBanco, error: erroConsultaBanco } = await supabase
        .from("empresas")
        .select(EMPRESA_SELECT)
        .ilike("nome", nomeTratado)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (erroConsultaBanco) {
        throw new Error(`Erro ao consultar empresa existente: ${erroConsultaBanco.message}`);
    }

    if (existenteBanco) {
        return {
            empresa: existenteBanco,
            criada: false,
        };
    }

    const { data, error } = await supabase
        .from("empresas")
        .insert({
            nome: nomeTratado,
            status: "Empresa ativa",
        })
        .select(EMPRESA_SELECT)
        .single();

    if (error) {
        throw new Error(`Erro ao criar empresa: ${error.message}`);
    }

    return {
        empresa: data,
        criada: true,
    };
}
