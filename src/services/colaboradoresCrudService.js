import {
    gerarCodigoFuncionario,
    normalizarColaborador,
    obterStatusInicialColaborador,
} from "./colaboradorDocumentosService";

const SELECT_COLABORADOR_COMPLETO = `
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
    tipo_empresa,
    empresa_pai_id
  )
`;

const SELECT_COLABORADOR_COM_FOTO = `
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
    nome
  )
`;

export async function adicionarColaboradorCrud({
    supabase,
    novo,
    empresa,
    enviarFotoColaborador,
    salvarCertificadosEmMassaColaborador,
}) {
    if (!empresa?.id) {
        throw new Error("Empresa inválida para cadastro do colaborador.");
    }

    let { data, error } = await supabase
        .from("colaboradores")
        .insert({
            empresa_id: empresa.id,
            nome: novo.nome,
            funcao: novo.funcao,
            matricula: novo.matricula || null,
            codigo_funcionario: novo.codigoFuncionario || gerarCodigoFuncionario(novo.nome),
            status_mobilizacao: novo.statusMobilizacao || obterStatusInicialColaborador(),
            data_nascimento: novo.dataNascimento || null,
            mostrar_aniversario_dashboard: novo.mostrarAniversarioDashboard !== false,
            treinamentos_removidos: novo.treinamentosRemovidos || [],
            treinamentos_adicionais: novo.treinamentosAdicionais || [],
            status: "Ativo",
        })
        .select(SELECT_COLABORADOR_COMPLETO)
        .single();

    if (error) {
        throw new Error(`Erro ao cadastrar colaborador: ${error.message}`);
    }

    if (novo.foto) {
        const foto = await enviarFotoColaborador(novo.foto, data.id);

        const { data: colaboradorComFoto, error: fotoError } = await supabase
            .from("colaboradores")
            .update({
                foto_url: foto.fotoUrl,
                foto_nome: foto.fotoNome,
            })
            .eq("id", data.id)
            .select(SELECT_COLABORADOR_COM_FOTO)
            .single();

        if (fotoError) {
            throw new Error(`Colaborador cadastrado, mas houve erro ao salvar a foto: ${fotoError.message}`);
        }

        data = colaboradorComFoto;
    }

    const colaborador = normalizarColaborador(data);
    let resultadoMassa = null;

    if (novo.documentosMassa?.length) {
        resultadoMassa = await salvarCertificadosEmMassaColaborador(colaborador, novo.documentosMassa);
    }

    return { colaborador, resultadoMassa };
}

export async function atualizarColaboradorCrud({
    supabase,
    colaboradorAtualizado,
    empresa,
    enviarFotoColaborador,
}) {
    if (!empresa?.id) {
        throw new Error("Empresa inválida para atualização do colaborador.");
    }

    let fotoAtualizada = {
        foto_url: colaboradorAtualizado.fotoAtual || null,
        foto_nome: colaboradorAtualizado.fotoNomeAtual || null,
    };

    if (colaboradorAtualizado.foto) {
        const foto = await enviarFotoColaborador(colaboradorAtualizado.foto, colaboradorAtualizado.id);
        fotoAtualizada = {
            foto_url: foto.fotoUrl,
            foto_nome: foto.fotoNome,
        };
    }

    const { data, error } = await supabase
        .from("colaboradores")
        .update({
            empresa_id: empresa.id,
            nome: colaboradorAtualizado.nome,
            funcao: colaboradorAtualizado.funcao,
            matricula: colaboradorAtualizado.matricula || null,
            status: colaboradorAtualizado.status || "Ativo",
            status_mobilizacao: colaboradorAtualizado.statusMobilizacao || obterStatusInicialColaborador(),
            data_nascimento: colaboradorAtualizado.dataNascimento || null,
            mostrar_aniversario_dashboard: colaboradorAtualizado.mostrarAniversarioDashboard !== false,
            treinamentos_removidos: colaboradorAtualizado.treinamentosRemovidos || [],
            treinamentos_adicionais: colaboradorAtualizado.treinamentosAdicionais || [],
            foto_url: fotoAtualizada.foto_url,
            foto_nome: fotoAtualizada.foto_nome,
        })
        .eq("id", colaboradorAtualizado.id)
        .select(SELECT_COLABORADOR_COMPLETO)
        .single();

    if (error) {
        throw new Error(`Erro ao atualizar colaborador: ${error.message}`);
    }

    return normalizarColaborador(data);
}

export async function excluirColaboradorCrud({ supabase, colaborador }) {
    if (!colaborador?.id) {
        throw new Error("Colaborador inválido para exclusão.");
    }

    const { error } = await supabase
        .from("colaboradores")
        .delete()
        .eq("id", colaborador.id);

    if (error) {
        throw new Error(`Erro ao excluir colaborador: ${error.message}`);
    }

    return true;
}
