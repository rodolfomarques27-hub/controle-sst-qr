import {
    enviarArquivoCertificado,
    removerArquivoCertificadoStorage,
} from "./certificadosStorageService";
import { enviarFotoColaboradorStorage } from "./arquivosCadastroService";
import {
    adicionarColaboradorCrud,
    atualizarColaboradorCrud,
    excluirColaboradorCrud,
} from "./colaboradoresCrudService";
import {
    analisarArquivosTreinamentoMassa,
    normalizarColaborador,
    normalizarCertificado,
} from "./colaboradorDocumentosService";

function obterFotoUrlColaboradorAppService(colaborador = {}, origem = {}) {
    return String(
        colaborador.fotoUrl ||
        colaborador.foto_url ||
        origem.foto_url ||
        origem.fotoUrl ||
        origem.foto ||
        origem.foto_colaborador ||
        origem.avatar_url ||
        origem.avatarUrl ||
        ""
    ).trim();
}

function obterFotoNomeColaboradorAppService(colaborador = {}, origem = {}) {
    return String(
        colaborador.fotoNome ||
        colaborador.foto_nome ||
        origem.foto_nome ||
        origem.fotoNome ||
        ""
    ).trim();
}

function reforcarCamposFotoColaboradorAppService(colaborador = {}, origem = {}) {
    const fotoUrl = obterFotoUrlColaboradorAppService(colaborador, origem);
    const fotoNome = obterFotoNomeColaboradorAppService(colaborador, origem);

    return {
        ...colaborador,
        fotoUrl,
        foto_url: fotoUrl,
        fotoNome,
        foto_nome: fotoNome,
    };
}

function localizarColaboradorAtualizadoAppService(lista = [], atual = null) {
    if (!atual) return lista[0] || null;

    return (
        lista.find((item) => String(item.id || "") === String(atual.id || "")) ||
        lista.find((item) => String(item.codigoFuncionario || item.codigo_funcionario || "") === String(atual.codigoFuncionario || atual.codigo_funcionario || "")) ||
        atual
    );
}

export async function carregarColaboradoresAppService({
    supabase,
    carregarEmpresas,
    carregarDocumentosEmpresas,
    setCarregandoBanco,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setCarregandoBanco(true);
    setErroBanco("");

    try {
        const empresas = await carregarEmpresas();
        await carregarDocumentosEmpresas();

        const { data, error } = await supabase
            .from("colaboradores")
            .select(`
          id,
          nome,
          funcao,
          matricula,
          codigo_funcionario,
          status_mobilizacao,
          data_nascimento,
          mostrar_aniversario_dashboard,
          treinamentos_removidos,
          treinamentos_adicionais,
          foto_url,
          foto_nome,
          token_qr,
          status,
          empresa_id,
          empresas (
            id,
            nome,
            cnpj,
            responsavel,
            logo_url,
            logo_nome,
            tipo_empresa,
            empresa_pai_id,
            tst_responsavel,
            tst_email,
            tst_whatsapp,
            email_auditoria,
            whatsapp_auditoria,
            responsavel_auditoria
          )
        `)
            .order("created_at", { ascending: false });

        if (error) {
            throw new Error(`Erro ao carregar colaboradores: ${error.message}`);
        }

        const empresasPorId = (empresas || []).reduce((acc, empresa) => {
            acc[empresa.id] = empresa;
            return acc;
        }, {});

        const normalizados = (data || []).map((item) => {
            const colaborador = reforcarCamposFotoColaboradorAppService(normalizarColaborador(item), item);
            const empresaAtual = empresasPorId[colaborador.empresaId] || null;
            const empresaPai = empresaAtual?.empresa_pai_id ? empresasPorId[empresaAtual.empresa_pai_id] : null;
            const ehSubcontratada = Boolean(empresaPai);

            return {
                ...colaborador,
                empresaTipo: empresaAtual?.tipo_empresa || colaborador.empresaTipo || "",
                empresaCnpj: empresaAtual?.cnpj || empresaPai?.cnpj || colaborador.empresaCnpj || "",
                empresaResponsavel: empresaAtual?.responsavel || empresaAtual?.responsavel_auditoria || empresaPai?.responsavel || empresaPai?.responsavel_auditoria || colaborador.empresaResponsavel || "",
                empresaLogoUrl: empresaAtual?.logo_url || empresaPai?.logo_url || colaborador.empresaLogoUrl || "",
                empresaLogoNome: empresaAtual?.logo_nome || empresaPai?.logo_nome || colaborador.empresaLogoNome || "",
                empresaPaiId: empresaAtual?.empresa_pai_id || colaborador.empresaPaiId || null,
                empresaPaiNome: empresaPai?.nome || colaborador.empresaPaiNome || "",
                empresaTstResponsavel: empresaAtual?.tst_responsavel || empresaPai?.tst_responsavel || "",
                empresaTstEmail: empresaAtual?.tst_email || empresaPai?.tst_email || "",
                empresaTstWhatsapp: empresaAtual?.tst_whatsapp || empresaPai?.tst_whatsapp || "",
                empresaEmailAuditoria: empresaAtual?.email_auditoria || empresaPai?.email_auditoria || empresaAtual?.email || empresaPai?.email || "",
                empresaWhatsappAuditoria: empresaAtual?.whatsapp_auditoria || empresaPai?.whatsapp_auditoria || empresaAtual?.telefone || empresaPai?.telefone || "",
                empresaExibicao: ehSubcontratada
                    ? `${empresaPai.nome} / Subcontratada: ${empresaAtual.nome}`
                    : colaborador.empresa,
            };
        });

        const idsColaboradores = normalizados.map((colaborador) => colaborador.id);
        let certificadosPorColaborador = {};

        if (idsColaboradores.length > 0) {
            const { data: certificadosData, error: certificadosError } = await supabase
                .from("certificados")
                .select("*")
                .in("colaborador_id", idsColaboradores)
                .order("created_at", { ascending: false });

            if (certificadosError) {
                throw new Error(`Erro ao carregar certificados: ${certificadosError.message}`);
            }

            certificadosPorColaborador = (certificadosData || []).reduce((acc, item) => {
                const certificado = normalizarCertificado(item);
                if (!acc[certificado.colaboradorId]) acc[certificado.colaboradorId] = [];
                acc[certificado.colaboradorId].push(certificado);
                return acc;
            }, {});
        }

        const colaboradoresComCertificados = normalizados.map((colaborador) => ({
            ...colaborador,
            treinamentos: certificadosPorColaborador[colaborador.id] || [],
        }));

        setColaboradores(colaboradoresComCertificados);
        setColaboradorSelecionado((atual) => localizarColaboradorAtualizadoAppService(colaboradoresComCertificados, atual));

        if (colaboradoresComCertificados.length === 0 && empresas.length === 0) {
            setColaboradores([]);
        }
    } catch (error) {
        setErroBanco(error.message || "Erro ao conectar ao banco de dados.");
    } finally {
        setCarregandoBanco(false);
    }
}

export async function enviarFotoColaboradorAppService({
    supabase,
    arquivo,
    colaboradorId,
    validarArquivoAntesUpload,
}) {
    return enviarFotoColaboradorStorage({
        supabase,
        arquivo,
        colaboradorId,
        validarArquivoAntesUpload,
    });
}

export async function salvarCertificadosEmMassaColaboradorAppService({
    supabase,
    colaborador,
    arquivos = [],
}) {
    const analise = analisarArquivosTreinamentoMassa(arquivos);
    const reconhecidos = analise.filter((item) => item.reconhecido);
    const ignorados = analise.filter((item) => !item.reconhecido);

    for (const item of reconhecidos) {
        const treinamento = item.treinamento;
        const arquivo = await enviarArquivoCertificado({
            supabase,
            arquivo: item.arquivo,
            colaborador,
            treinamentoId: treinamento.id,
        });

        const payload = {
            colaborador_id: colaborador.id,
            tipo_treinamento: treinamento.nome,
            treinamento_codigo: Number(treinamento.id),
            nome_treinamento: treinamento.nome,
            data_realizacao: item.dataRealizacao,
            data_vencimento: item.dataVencimento,
            arquivo_url: arquivo.arquivoUrl,
            arquivo_nome: item.arquivo.name,
            observacao: "Enviado em massa no cadastro do colaborador",
            status_validacao: "Validado",
        };

        const { data: existentes, error: buscaError } = await supabase
            .from("certificados")
            .select("*")
            .eq("colaborador_id", colaborador.id)
            .eq("tipo_treinamento", treinamento.nome)
            .order("created_at", { ascending: false })
            .limit(1);

        if (buscaError) {
            throw new Error(`Erro ao verificar certificado existente: ${buscaError.message}`);
        }

        const existente = existentes?.[0] || null;
        const consulta = existente?.id
            ? supabase.from("certificados").update(payload).eq("id", existente.id)
            : supabase.from("certificados").insert(payload);

        const { error } = await consulta;

        if (error) {
            throw new Error(`Erro ao salvar ${item.arquivo.name}: ${error.message}`);
        }

        if ((existente?.url_do_arquivo || existente?.arquivo_url) && (existente.url_do_arquivo || existente.arquivo_url) !== arquivo.arquivoUrl) {
            await removerArquivoCertificadoStorage({
                supabase,
                caminho: existente.url_do_arquivo || existente.arquivo_url,
            });
        }
    }

    return {
        reconhecidos: reconhecidos.length,
        ignorados: ignorados.map((item) => item.nomeArquivo),
    };
}

export async function adicionarColaboradorAppService({
    supabase,
    novo,
    obterOuCriarEmpresa,
    enviarFotoColaborador,
    salvarCertificadosEmMassaColaborador,
    carregarColaboradores,
    setErroBanco,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const empresaCriada = await obterOuCriarEmpresa(novo.empresaNome);
        const { colaborador: colaboradorSalvo, resultadoMassa } = await adicionarColaboradorCrud({
            supabase,
            novo,
            empresa: empresaCriada,
            enviarFotoColaborador,
            salvarCertificadosEmMassaColaborador,
        });
        const colaborador = reforcarCamposFotoColaboradorAppService(colaboradorSalvo, colaboradorSalvo);

        await carregarColaboradores();

        setColaboradorSelecionado((atual) => atual || colaborador);

        if (resultadoMassa) {
            const mensagemIgnorados = resultadoMassa.ignorados.length
                ? [
                    "",
                    "",
                    "Arquivos não reconhecidos:",
                    ...resultadoMassa.ignorados.map((nomeArquivo) => `- ${nomeArquivo}`),
                ].join(String.fromCharCode(10))
                : "";

            alert(
                `Colaborador cadastrado. ${resultadoMassa.reconhecidos} documento(s) de treinamento foram vinculados automaticamente.${mensagemIgnorados}`
            );
        }

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao cadastrar colaborador.");
        return false;
    }
}

export async function atualizarColaboradorAppService({
    supabase,
    colaboradorAtualizado,
    colaboradorSelecionado,
    obterOuCriarEmpresa,
    enviarFotoColaborador,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    setErroBanco("");

    try {
        const empresaCriada = await obterOuCriarEmpresa(colaboradorAtualizado.empresaNome);
        const colaboradorSalvo = await atualizarColaboradorCrud({
            supabase,
            colaboradorAtualizado,
            empresa: empresaCriada,
            enviarFotoColaborador,
        });
        const colaborador = reforcarCamposFotoColaboradorAppService(colaboradorSalvo, colaboradorSalvo);

        setColaboradores((atual) =>
            atual.map((item) =>
                item.id === colaborador.id
                    ? {
                        ...item,
                        ...colaborador,
                        treinamentos: item.treinamentos || colaborador.treinamentos || [],
                    }
                    : item
            )
        );

        if (colaboradorSelecionado?.id === colaborador.id) {
            setColaboradorSelecionado((atual) => ({
                ...atual,
                ...colaborador,
                treinamentos: atual?.treinamentos || colaborador.treinamentos || [],
            }));
        }

        return true;
    } catch (error) {
        setErroBanco(error.message || "Erro ao atualizar colaborador.");
        return false;
    }
}

export async function excluirColaboradorAppService({
    supabase,
    colaborador,
    colaboradores,
    colaboradorSelecionado,
    setErroBanco,
    setColaboradores,
    setColaboradorSelecionado,
}) {
    const confirmar = window.confirm(`Deseja realmente excluir o colaborador ${colaborador.nome}?`);

    if (!confirmar) return;

    setErroBanco("");

    try {
        await excluirColaboradorCrud({ supabase, colaborador });

        setColaboradores((atual) => atual.filter((item) => item.id !== colaborador.id));

        if (colaboradorSelecionado?.id === colaborador.id) {
            const restante = colaboradores.filter((item) => item.id !== colaborador.id);
            setColaboradorSelecionado(restante[0] || null);
        }
    } catch (error) {
        setErroBanco(error.message || "Erro ao excluir colaborador.");
    }
}

export function selecionarColaboradorAppService({
    colaborador,
    setColaboradorSelecionado,
    setTela,
    registrarAuditoria,
}) {
    setColaboradorSelecionado(colaborador);
    setTela("qr");
    registrarAuditoria("ACESSO_QR_INTERNO", "colaboradores", `Abriu consulta QR interna de ${colaborador?.nome || "colaborador"}`, colaborador?.id, {
        codigoFuncionario: colaborador?.codigoFuncionario || null,
    });
}

export function abrirEnvioTreinamentoAppService({
    colaborador,
    setColaboradorSelecionado,
    setTela,
}) {
    setColaboradorSelecionado(colaborador);
    setTela("treinamentos");
}
