import { supabase } from "../lib/supabaseClient";

function normalizarTextoObra(valor) {
    return String(valor || "").trim();
}

function normalizarStatusObra(status) {
    const texto = normalizarTextoObra(status);
    return texto === "Inativa" ? "Inativa" : "Ativa";
}

export function normalizarObraEmpresaBanco(obra = {}) {
    return {
        id: obra.id,
        empresaId: obra.empresa_id || obra.empresaId || "",
        empresa_id: obra.empresa_id || obra.empresaId || "",
        nome: obra.nome || "",
        cidade: obra.cidade || "",
        uf: obra.uf || "",
        endereco: obra.endereco || "",
        responsavelObra: obra.responsavel_obra || obra.responsavelObra || "",
        responsavel_obra: obra.responsavel_obra || obra.responsavelObra || "",
        fiscalIdealiza: obra.fiscal_idealiza || obra.fiscalIdealiza || "",
        fiscal_idealiza: obra.fiscal_idealiza || obra.fiscalIdealiza || "",
        liderEncarregado: obra.lider_encarregado || obra.liderEncarregado || "",
        lider_encarregado: obra.lider_encarregado || obra.liderEncarregado || "",
        status: normalizarStatusObra(obra.status),
        observacoes: obra.observacoes || "",
        criadoPor: obra.criado_por || "",
        atualizadoPor: obra.atualizado_por || "",
        createdAt: obra.created_at || "",
        updatedAt: obra.updated_at || "",
    };
}

export async function listarObrasEmpresas() {
    const { data, error } = await supabase
        .from("obras_empresas")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao listar obras das empresas:", error);
        throw error;
    }

    return (data || []).map(normalizarObraEmpresaBanco);
}

export async function listarObrasPorEmpresa(empresaId) {
    const idEmpresa = normalizarTextoObra(empresaId);

    if (!idEmpresa) return [];

    const { data, error } = await supabase
        .from("obras_empresas")
        .select("*")
        .eq("empresa_id", idEmpresa)
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao listar obras por empresa:", error);
        throw error;
    }

    return (data || []).map(normalizarObraEmpresaBanco);
}

export async function adicionarObraEmpresa(obra = {}) {
    const empresaId = normalizarTextoObra(obra.empresaId || obra.empresa_id);
    const nome = normalizarTextoObra(obra.nome);

    if (!empresaId) {
        throw new Error("Empresa obrigatória para cadastrar obra.");
    }

    if (!nome) {
        throw new Error("Nome da obra obrigatório.");
    }

    const payload = {
        empresa_id: empresaId,
        nome,
        cidade: normalizarTextoObra(obra.cidade),
        uf: normalizarTextoObra(obra.uf).toUpperCase(),
        endereco: normalizarTextoObra(obra.endereco),
        responsavel_obra: normalizarTextoObra(obra.responsavelObra || obra.responsavel_obra),
        fiscal_idealiza: normalizarTextoObra(obra.fiscalIdealiza || obra.fiscal_idealiza),
        lider_encarregado: normalizarTextoObra(obra.liderEncarregado || obra.lider_encarregado),
        status: normalizarStatusObra(obra.status),
        observacoes: normalizarTextoObra(obra.observacoes),
    };

    const { data, error } = await supabase
        .from("obras_empresas")
        .insert(payload)
        .select("*")
        .single();

    if (error) {
        console.error("Erro ao cadastrar obra da empresa:", error);
        throw error;
    }

    return normalizarObraEmpresaBanco(data);
}

export async function atualizarObraEmpresa(obra = {}) {
    const id = normalizarTextoObra(obra.id);

    if (!id) {
        throw new Error("ID da obra obrigatório para atualizar.");
    }

    const payload = {
        nome: normalizarTextoObra(obra.nome),
        cidade: normalizarTextoObra(obra.cidade),
        uf: normalizarTextoObra(obra.uf).toUpperCase(),
        endereco: normalizarTextoObra(obra.endereco),
        responsavel_obra: normalizarTextoObra(obra.responsavelObra || obra.responsavel_obra),
        fiscal_idealiza: normalizarTextoObra(obra.fiscalIdealiza || obra.fiscal_idealiza),
        lider_encarregado: normalizarTextoObra(obra.liderEncarregado || obra.lider_encarregado),
        status: normalizarStatusObra(obra.status),
        observacoes: normalizarTextoObra(obra.observacoes),
    };

    if (!payload.nome) {
        throw new Error("Nome da obra obrigatório.");
    }

    const { data, error } = await supabase
        .from("obras_empresas")
        .update(payload)
        .eq("id", id)
        .select("*")
        .single();

    if (error) {
        console.error("Erro ao atualizar obra da empresa:", error);
        throw error;
    }

    return normalizarObraEmpresaBanco(data);
}

export async function excluirObraEmpresa(id) {
    const obraId = normalizarTextoObra(id);

    if (!obraId) {
        throw new Error("ID da obra obrigatório para excluir.");
    }

    const { error } = await supabase
        .from("obras_empresas")
        .delete()
        .eq("id", obraId);

    if (error) {
        console.error("Erro ao excluir obra da empresa:", error);
        throw error;
    }

    return true;
}