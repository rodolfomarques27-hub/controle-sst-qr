function normalizarTextoAcessosApp(valor) {
    return String(valor || "").trim();
}

function normalizarEmailAcessosApp(valor) {
    return normalizarTextoAcessosApp(valor).toLowerCase();
}

function normalizarPerfilAcessosApp(valor) {
    const perfil = normalizarTextoAcessosApp(valor || "consulta")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");

    if (perfil === "admin") return "administrador";
    if (perfil === "tecnico_de_seguranca" || perfil === "tecnico_seguranca") return "tecnico_sst";

    return ["administrador", "tecnico_sst", "auditor", "gestor", "consulta", "bloqueado"].includes(perfil)
        ? perfil
        : "consulta";
}

function normalizarBooleanoAcessosApp(valor) {
    return valor === true || valor === "true";
}

function extrairErroEdgeFunction(error, data) {
    if (data?.erro) return data.erro;
    if (data?.error) return data.error;
    if (error?.context?.json?.erro) return error.context.json.erro;
    if (error?.message) return error.message;
    return "Não foi possível criar o login do app.";
}

export async function criarLoginAppComSenhaTemporariaService({ supabase, dados }) {
    if (!supabase) {
        throw new Error("Cliente Supabase não informado para criar login do app.");
    }

    const nome = normalizarTextoAcessosApp(dados?.nome);
    const email = normalizarEmailAcessosApp(dados?.email);
    const funcao = normalizarTextoAcessosApp(dados?.funcao);
    const perfil = normalizarPerfilAcessosApp(dados?.perfil);
    const senhaTemporaria = String(dados?.senhaTemporaria || dados?.senha_temporaria || "");
    const ativo = perfil === "bloqueado" ? false : normalizarBooleanoAcessosApp(dados?.ativo ?? true);
    const bloqueado = perfil === "bloqueado" ? true : normalizarBooleanoAcessosApp(dados?.bloqueado ?? false);
    const acessoGlobal = perfil === "administrador" ? normalizarBooleanoAcessosApp(dados?.acesso_global ?? dados?.acessoGlobal ?? false) : false;
    const observacao = normalizarTextoAcessosApp(dados?.observacao);
    const resetarSenhaTemporaria = normalizarBooleanoAcessosApp(dados?.resetarSenhaTemporaria ?? dados?.resetar_senha_temporaria ?? false);

    if (!nome) {
        throw new Error("Informe o nome da pessoa para criar o login.");
    }

    if (!email || !email.includes("@")) {
        throw new Error("Informe um e-mail válido para criar o login.");
    }

    if (!senhaTemporaria || senhaTemporaria.length < 6) {
        throw new Error("Informe uma senha temporária com pelo menos 6 caracteres.");
    }

    if (bloqueado && acessoGlobal) {
        throw new Error("Usuário bloqueado não pode receber acesso global.");
    }

    const { data, error } = await supabase.functions.invoke("admin-criar-login-app", {
        body: {
            nome,
            email,
            funcao,
            perfil,
            senhaTemporaria,
            ativo,
            bloqueado,
            acessoGlobal,
            observacao,
            resetarSenhaTemporaria,
        },
    });

    if (error || data?.ok === false) {
        throw new Error(extrairErroEdgeFunction(error, data));
    }

    return data || { ok: true };
}
