/*
 * Relatório de Pendências Cadastrais de Colaboradores
 *
 * Responsabilidade:
 * - identificar somente informações não preenchidas;
 * - não classificar validade documental;
 * - não alterar status operacional do colaborador;
 * - não transformar campo opcional em bloqueio.
 */

export const CAMPOS_PENDENCIAS_CADASTRAIS = Object.freeze([
    {
        chave: "foto",
        rotulo: "Foto",
        grupo: "Identificação",
    },
    {
        chave: "cpf",
        rotulo: "CPF",
        grupo: "Identificação",
    },
    {
        chave: "dataNascimento",
        rotulo: "Data de nascimento",
        grupo: "Identificação",
    },
    {
        chave: "nome",
        rotulo: "Nome",
        grupo: "Cadastro básico",
    },
    {
        chave: "empresa",
        rotulo: "Empresa",
        grupo: "Cadastro básico",
    },
    {
        chave: "funcao",
        rotulo: "Função",
        grupo: "Cadastro básico",
    },
    {
        chave: "telefone",
        rotulo: "Telefone principal",
        grupo: "Dados complementares",
        opcionalNoFormulario: true,
    },
    {
        chave: "matriculaEsocial",
        rotulo: "Matrícula eSocial",
        grupo: "Dados complementares",
        opcionalNoFormulario: true,
    },
    {
        chave: "dataAdmissao",
        rotulo: "Data de admissão",
        grupo: "Dados complementares",
        opcionalNoFormulario: true,
    },
    {
        chave: "contatoEmergenciaNome",
        rotulo: "Emergência - Nome",
        grupo: "Contato de emergência",
    },
    {
        chave: "contatoEmergenciaParentesco",
        rotulo: "Emergência - Parentesco",
        grupo: "Contato de emergência",
    },
    {
        chave: "contatoEmergenciaTelefone",
        rotulo: "Emergência - Telefone",
        grupo: "Contato de emergência",
    },
]);

export const CHAVES_PENDENCIAS_CADASTRAIS =
    Object.freeze(
        CAMPOS_PENDENCIAS_CADASTRAIS.map(
            (campo) =>
                campo.chave
        )
    );

function possuiValorCadastral(...valores) {
    return valores.some(
        (valor) => {
            if (
                typeof valor === "number" ||
                typeof valor === "boolean"
            ) {
                return true;
            }

            const texto =
                String(
                    valor ??
                    ""
                ).trim();

            if (!texto) {
                return false;
            }

            const normalizado =
                texto.toLowerCase();

            return ![
                "-",
                "null",
                "undefined",
                "não informado",
                "nao informado",
            ].includes(
                normalizado
            );
        }
    );
}

export function campoCadastralPreenchido(
    colaborador = {},
    chave = ""
) {
    switch (chave) {
        case "foto":
            return possuiValorCadastral(
                colaborador.fotoUrl,
                colaborador.foto_url,
                colaborador.fotoPath,
                colaborador.foto_path,
                colaborador.fotoStoragePath,
                colaborador.foto_storage_path,
                colaborador.fotoColaborador,
                colaborador.foto_colaborador,
                colaborador.fotoColaboradorUrl,
                colaborador.foto_colaborador_url,
                colaborador.foto
            );

        case "cpf":
            return possuiValorCadastral(
                colaborador.cpf,
                colaborador.cpf_colaborador,
                colaborador.cpfFormatado
            );

        case "dataNascimento":
            return possuiValorCadastral(
                colaborador.dataNascimento,
                colaborador.data_nascimento,
                colaborador.nascimento,
                colaborador.dt_nascimento,
                colaborador.data_de_nascimento
            );

        case "nome":
            return possuiValorCadastral(
                colaborador.nome,
                colaborador.nomeCompleto,
                colaborador.nome_completo
            );

        case "empresa":
            return possuiValorCadastral(
                colaborador.empresa,
                colaborador.empresaNome,
                colaborador.empresa_nome,
                colaborador.empresaExibicao,
                colaborador.empresa_exibicao
            );

        case "funcao":
            return possuiValorCadastral(
                colaborador.funcao,
                colaborador.funcaoNome,
                colaborador.funcao_nome
            );

        case "telefone":
            return possuiValorCadastral(
                colaborador.telefone,
                colaborador.celular,
                colaborador.whatsapp
            );

        case "matriculaEsocial":
            return possuiValorCadastral(
                colaborador.matriculaEsocial,
                colaborador.matricula_esocial,
                colaborador.matricula
            );

        case "dataAdmissao":
            return possuiValorCadastral(
                colaborador.dataAdmissao,
                colaborador.data_admissao
            );

        case "contatoEmergenciaNome":
            return possuiValorCadastral(
                colaborador.contatoEmergenciaNome,
                colaborador.contato_emergencia_nome
            );

        case "contatoEmergenciaParentesco":
            return possuiValorCadastral(
                colaborador.contatoEmergenciaParentesco,
                colaborador.contato_emergencia_parentesco
            );

        case "contatoEmergenciaTelefone":
            return possuiValorCadastral(
                colaborador.contatoEmergenciaTelefone,
                colaborador.contato_emergencia_telefone
            );

        default:
            return true;
    }
}

export function avaliarPendenciasCadastraisColaborador(
    colaborador = {},
    camposSelecionados = CHAVES_PENDENCIAS_CADASTRAIS
) {
    const selecionados =
        new Set(
            Array.isArray(
                camposSelecionados
            )
                ? camposSelecionados
                : []
        );

    const pendencias =
        CAMPOS_PENDENCIAS_CADASTRAIS.filter(
            (campo) =>
                selecionados.has(
                    campo.chave
                ) &&
                !campoCadastralPreenchido(
                    colaborador,
                    campo.chave
                )
        );

    return {
        colaborador,
        pendencias,
        quantidade:
            pendencias.length,
    };
}

export function consolidarPendenciasCadastrais(
    colaboradores = [],
    camposSelecionados = CHAVES_PENDENCIAS_CADASTRAIS
) {
    const lista =
        Array.isArray(
            colaboradores
        )
            ? colaboradores
            : [];

    const campos =
        Array.isArray(
            camposSelecionados
        )
            ? camposSelecionados.filter(
                (chave) =>
                    CHAVES_PENDENCIAS_CADASTRAIS.includes(
                        chave
                    )
            )
            : [];

    const avaliacoes =
        lista
            .map(
                (colaborador) =>
                    avaliarPendenciasCadastraisColaborador(
                        colaborador,
                        campos
                    )
            )
            .filter(
                (avaliacao) =>
                    avaliacao.quantidade > 0
            );

    const totaisPorCampo =
        Object.fromEntries(
            campos.map(
                (chave) => [
                    chave,
                    avaliacoes.filter(
                        (avaliacao) =>
                            avaliacao.pendencias.some(
                                (pendencia) =>
                                    pendencia.chave ===
                                    chave
                            )
                    ).length,
                ]
            )
        );

    const totalPendencias =
        avaliacoes.reduce(
            (
                total,
                avaliacao
            ) =>
                total +
                avaliacao.quantidade,
            0
        );

    return {
        colaboradoresAnalisados:
            lista.length,

        cadastrosComPendencia:
            avaliacoes.length,

        totalPendencias,

        camposSelecionados:
            campos,

        totaisPorCampo,

        avaliacoes,
    };
}