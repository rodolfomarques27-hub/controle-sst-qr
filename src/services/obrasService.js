import { supabase } from "../lib/supabaseClient";

function normalizarTextoObra(valor) {
    return String(valor || "").trim();
}

function normalizarCepObra(valor) {
    return normalizarTextoObra(valor).replace(/\D/g, "").slice(0, 8);
}

function erroColunaCepObraNaoExiste(error = {}) {
    const texto = String(error?.message || error?.details || error?.hint || "").toLowerCase();
    const colunasComplementaresObra = ["cep", "numero_obra", "numero_endereco", "tecnico_seguranca_idealiza"];

    return colunasComplementaresObra.some((coluna) => texto.includes(coluna)) && (
        texto.includes("column") ||
        texto.includes("coluna") ||
        texto.includes("schema") ||
        texto.includes("does not exist") ||
        texto.includes("não existe") ||
        texto.includes("nao existe") ||
        texto.includes("could not find")
    );
}

function removerCepPayloadObra(payload = {}) {
    const restante = { ...payload };
    delete restante.cep;
    delete restante.numero_obra;
    delete restante.numero_endereco;
    delete restante.tecnico_seguranca_idealiza;

    return restante;
}

function normalizarStatusObra(status) {
    const texto = normalizarTextoObra(status);
    return texto === "Inativa" ? "Inativa" : "Ativa";
}

function montarPayloadObra(obra = {}) {
    return {
        nome: normalizarTextoObra(obra.nome),
        cep: normalizarCepObra(obra.cep),
        numero_obra: normalizarTextoObra(obra.numeroObra || obra.numero_obra),
        cidade: normalizarTextoObra(obra.cidade),
        uf: normalizarTextoObra(obra.uf).toUpperCase(),
        endereco: normalizarTextoObra(obra.endereco),
        numero_endereco: normalizarTextoObra(obra.numeroEndereco || obra.numero_endereco),
        fiscal_idealiza: normalizarTextoObra(obra.fiscalIdealiza || obra.fiscal_idealiza),
        tecnico_seguranca_idealiza: normalizarTextoObra(obra.tecnicoSegurancaIdealiza || obra.tecnico_seguranca_idealiza),
        lider_encarregado: normalizarTextoObra(obra.liderEncarregado || obra.lider_encarregado),
        status: normalizarStatusObra(obra.status),
        observacoes: normalizarTextoObra(obra.observacoes),
    };
}

function montarPayloadVinculoEmpresaObra(vinculo = {}) {
    return {
        empresa_id: normalizarTextoObra(vinculo.empresaId || vinculo.empresa_id),
        obra_id: normalizarTextoObra(vinculo.obraId || vinculo.obra_id),
        status: normalizarStatusObra(vinculo.status),
        observacoes: normalizarTextoObra(vinculo.observacoes),
    };
}

export function normalizarObraBanco(obra = {}) {
    return {
        id: obra.id || "",
        nome: obra.nome || "",
        cep: obra.cep || "",
        numeroObra: obra.numero_obra || obra.numeroObra || "",
        numero_obra: obra.numero_obra || obra.numeroObra || "",
        cidade: obra.cidade || "",
        uf: obra.uf || "",
        endereco: obra.endereco || "",
        numeroEndereco: obra.numero_endereco || obra.numeroEndereco || "",
        numero_endereco: obra.numero_endereco || obra.numeroEndereco || "",
        fiscalIdealiza: obra.fiscal_idealiza || obra.fiscalIdealiza || "",
        fiscal_idealiza: obra.fiscal_idealiza || obra.fiscalIdealiza || "",
        tecnicoSegurancaIdealiza: obra.tecnico_seguranca_idealiza || obra.tecnicoSegurancaIdealiza || "",
        tecnico_seguranca_idealiza: obra.tecnico_seguranca_idealiza || obra.tecnicoSegurancaIdealiza || "",
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

export function normalizarVinculoEmpresaObraBanco(vinculo = {}) {
    const obraNormalizada = vinculo.obra ? normalizarObraBanco(vinculo.obra) : null;
    const empresa = vinculo.empresa || null;

    return {
        id: vinculo.id || "",
        empresaId: vinculo.empresa_id || vinculo.empresaId || "",
        empresa_id: vinculo.empresa_id || vinculo.empresaId || "",
        obraId: vinculo.obra_id || vinculo.obraId || obraNormalizada?.id || "",
        obra_id: vinculo.obra_id || vinculo.obraId || obraNormalizada?.id || "",
        status: normalizarStatusObra(vinculo.status),
        observacoes: vinculo.observacoes || "",
        obra: obraNormalizada,
        empresa,
        criadoPor: vinculo.criado_por || "",
        atualizadoPor: vinculo.atualizado_por || "",
        createdAt: vinculo.created_at || "",
        updatedAt: vinculo.updated_at || "",
    };
}

export async function listarObras() {
    const { data, error } = await supabase
        .from("obras")
        .select("*")
        .order("nome", { ascending: true });

    if (error) {
        console.error("Erro ao listar obras:", error);
        throw error;
    }

    return (data || []).map(normalizarObraBanco);
}

export async function adicionarObra(obra = {}) {
    const payload = montarPayloadObra(obra);

    let { data, error } = await supabase
        .from("obras")
        .insert(payload)
        .select()
        .single();

    if (error && erroColunaCepObraNaoExiste(error)) {
        console.warn("Coluna cep ainda não existe em obras. Salvando obra sem cep até aplicar a migration.");
        const payloadSemCep = removerCepPayloadObra(payload);

        ({ data, error } = await supabase
            .from("obras")
            .insert(payloadSemCep)
            .select()
            .single());
    }

    if (error) {
        console.error("Erro ao adicionar obra:", error);
        throw error;
    }

    return normalizarObraBanco(data);
}

export async function atualizarObra(obra = {}) {
    const id = normalizarTextoObra(obra.id);

    if (!id) throw new Error("ID da obra não informado para atualização.");

    const payload = montarPayloadObra(obra);

    let { data, error } = await supabase
        .from("obras")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

    if (error && erroColunaCepObraNaoExiste(error)) {
        console.warn("Coluna cep ainda não existe em obras. Atualizando obra sem cep até aplicar a migration.");
        const payloadSemCep = removerCepPayloadObra(payload);

        ({ data, error } = await supabase
            .from("obras")
            .update(payloadSemCep)
            .eq("id", id)
            .select()
            .single());
    }

    if (error) {
        console.error("Erro ao atualizar obra:", error);
        throw error;
    }

    return normalizarObraBanco(data);
}

export async function excluirObra(id) {
    const obraId = normalizarTextoObra(id);

    if (!obraId) {
        throw new Error("ID da obra obrigatorio para excluir.");
    }

    const { error } = await supabase
        .from("obras")
        .delete()
        .eq("id", obraId);

    if (error) {
        console.error("Erro ao excluir obra:", error);
        throw error;
    }

    return true;
}

export async function listarVinculosEmpresasObras() {
    const { data, error } = await supabase
        .from("empresas_obras")
        .select(`
            *,
            empresa:empresas(id, nome, status),
            obra:obras(*)
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Erro ao listar vinculos empresa/obra:", error);
        throw error;
    }

    return (data || []).map(normalizarVinculoEmpresaObraBanco);
}

export async function listarObrasPorEmpresa(empresaId) {
    const idEmpresa = normalizarTextoObra(empresaId);

    if (!idEmpresa) return [];

    const { data, error } = await supabase
        .from("empresas_obras")
        .select(`
            *,
            obra:obras(*)
        `)
        .eq("empresa_id", idEmpresa)
        .eq("status", "Ativa");

    if (error) {
        console.error("Erro ao listar obras por empresa:", error);
        throw error;
    }

    return (data || [])
        .map(normalizarVinculoEmpresaObraBanco)
        .map((vinculo) => vinculo.obra)
        .filter(Boolean)
        .filter((obra) => obra.status !== "Inativa")
        .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
}

export async function vincularEmpresaObra(empresaId, obraId, dados = {}) {
    const payload = montarPayloadVinculoEmpresaObra({
        ...dados,
        empresaId,
        obraId,
    });

    if (!payload.empresa_id) {
        throw new Error("Empresa obrigatoria para vincular obra.");
    }

    if (!payload.obra_id) {
        throw new Error("Obra obrigatoria para vincular empresa.");
    }

    const { data, error } = await supabase
        .from("empresas_obras")
        .insert(payload)
        .select(`
            *,
            empresa:empresas(id, nome, status),
            obra:obras(*)
        `)
        .single();

    if (error) {
        console.error("Erro ao vincular empresa e obra:", error);
        throw error;
    }

    return normalizarVinculoEmpresaObraBanco(data);
}

export async function atualizarVinculoEmpresaObra(vinculo = {}) {
    const id = normalizarTextoObra(vinculo.id);
    const payload = montarPayloadVinculoEmpresaObra(vinculo);

    if (!id) {
        throw new Error("ID do vinculo obrigatorio para atualizar.");
    }

    if (!payload.empresa_id) {
        delete payload.empresa_id;
    }

    if (!payload.obra_id) {
        delete payload.obra_id;
    }

    const { data, error } = await supabase
        .from("empresas_obras")
        .update(payload)
        .eq("id", id)
        .select(`
            *,
            empresa:empresas(id, nome, status),
            obra:obras(*)
        `)
        .single();

    if (error) {
        console.error("Erro ao atualizar vinculo empresa/obra:", error);
        throw error;
    }

    return normalizarVinculoEmpresaObraBanco(data);
}

export async function excluirVinculoEmpresaObra(id) {
    const vinculoId = normalizarTextoObra(id);

    if (!vinculoId) {
        throw new Error("ID do vinculo obrigatorio para excluir.");
    }

    const { error } = await supabase
        .from("empresas_obras")
        .delete()
        .eq("id", vinculoId);

    if (error) {
        console.error("Erro ao excluir vinculo empresa/obra:", error);
        throw error;
    }

    return true;
}
