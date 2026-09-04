export const CONSOLIDACAO_COLABORADOR_RELATORIO_HTML_SCHEMA_VERSION =
    "consolidacao-colaborador-relatorio-html-v1";

const CONSOLIDACAO_COLABORADOR_EXPORT_SCHEMA_VERSION =
    "consolidacao-colaborador-export-structure-v1";

/*
 * ============================================================
 * G9.2-R9N.1 — PAGINAÇÃO ORIENTADA POR TREINAMENTOS
 * ============================================================
 *
 * O relatório deve priorizar uma única página.
 *
 * Documentos estruturais do colaborador:
 * - pessoais;
 * - ASO;
 * - Ordem de Serviço;
 * - Ficha de EPI;
 *
 * permanecem na página principal.
 *
 * Somente o excesso real de treinamentos cria continuação.
 */

const TREINAMENTOS_MAXIMOS_PAGINA_PRINCIPAL =
    12;

const TREINAMENTOS_MAXIMOS_PAGINA_CONTINUACAO =
    13;
const CATEGORIAS =
    Object.freeze({
        "01_DOCUMENTOS_PESSOAIS":
            "Documentos pessoais",

        "02_ASO":
            "ASO",

        "03_ORDEM_DE_SERVICO":
            "Ordem de Serviço",

        "04_EPI":
            "EPI",

        "05_TREINAMENTOS":
            "Treinamentos",

        DOCUMENTOS_PESSOAIS:
            "Documentos pessoais",

        ASO:
            "ASO",

        ORDEM_DE_SERVICO:
            "Ordem de Serviço",

        EPI:
            "EPI",

        TREINAMENTOS:
            "Treinamentos",
    });

const TIPOS_EVIDENCIA =
    Object.freeze({
        certificado_individual:
            "Certificado individual",

        lista_presenca:
            "Lista de presença",

        evidencia_complementar:
            "Evidência complementar",

        documento_principal_legado:
            "Documento principal",
    });

function textoSeguro(
    valor
) {
    return String(
        valor ?? ""
    ).trim();
}

function listaSegura(
    valor
) {
    return Array.isArray(
        valor
    )
        ? valor
        : [];
}

function escaparHtml(
    valor
) {
    return textoSeguro(
        valor
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );
}

function formatarData(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!texto) {
        return "—";
    }

    const matchIso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (matchIso) {
        return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
    }

    return texto;
}

function formatarDataHora(
    valor
) {
    const texto =
        textoSeguro(
            valor
        );

    if (!texto) {
        return "—";
    }

    const data =
        new Date(
            texto
        );

    if (
        Number.isNaN(
            data.getTime()
        )
    ) {
        return formatarData(
            texto
        );
    }

    try {
        return new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle:
                    "short",

                timeStyle:
                    "short",

                timeZone:
                    "America/Sao_Paulo",
            }
        ).format(
            data
        );
    }
    catch {
        return formatarData(
            texto
        );
    }
}

function obterNomeColaborador(
    estrutura
) {
    return (
        textoSeguro(
            estrutura
                ?.colaborador
                ?.nome
        ) ||
        textoSeguro(
            estrutura
                ?.colaborador
                ?.nomeCompleto
        ) ||
        "Colaborador não identificado"
    );
}

function obterNomeEmpresa(
    estrutura
) {
    return (
        textoSeguro(
            estrutura
                ?.empresa
                ?.nome
        ) ||
        textoSeguro(
            estrutura
                ?.empresa
                ?.empresa
        ) ||
        "Empresa não identificada"
    );
}

function obterNomeObra(
    estrutura
) {
    const obra =
        estrutura?.obra;

    if (
        obra?.status ===
        "SEM_OBRA_ATIVA"
    ) {
        return "Sem obra ativa";
    }

    return (
        textoSeguro(
            obra?.nome
        ) ||
        textoSeguro(
            obra?.obraNome
        ) ||
        "Obra não informada"
    );
}

function obterNomeDocumento(
    documento
) {
    return (
        textoSeguro(
            documento
                ?.nomeTreinamento
        ) ||
        textoSeguro(
            documento
                ?.tipoTreinamento
        ) ||
        (
            documento
                ?.treinamentoCodigo !==
                null &&
            documento
                ?.treinamentoCodigo !==
                undefined
                ? `Documento ${documento.treinamentoCodigo}`
                : "Documento"
        )
    );
}

function obterCategoria(
    documento
) {
    const chave =
        textoSeguro(
            documento
                ?.categoriaConsolidacao
        );

    return (
        CATEGORIAS[
            chave
        ] ||
        chave ||
        "Documento"
    );
}

function obterStatusTemporal(
    documento
) {
    return (
        textoSeguro(
            documento
                ?.statusTemporal
                ?.texto
        ) ||
        textoSeguro(
            documento
                ?.statusTemporal
                ?.status
        ) ||
        "Não informado"
    );
}

/*
 * ============================================================
 * R12.18-PRECEDENCIA-TEMPORAL
 * ============================================================
 *
 * Conferência documental e situação temporal são dimensões
 * diferentes, porém o vencimento deve prevalecer na
 * APRESENTAÇÃO da conferência.
 *
 * Documento vencido:
 * - continua existindo;
 * - evidência continua marcada;
 * - não vira "ausente";
 * - conferência exibida passa para "atenção".
 * ============================================================
 */

function obterConferencia(
    documento
) {
    const situacaoTemporal =
        textoSeguro(
            obterStatusTemporal(
                documento
            )
        )
            .trim()
            .toLocaleLowerCase(
                "pt-BR"
            );

    /*
     * VENCIDO
     */
    if (
        situacaoTemporal ===
            "vencido" ||
        situacaoTemporal ===
            "vencida"
    ) {
        return "atenção";
    }

    /*
     * PRÓXIMO DO VENCIMENTO / A VENCER
     */
    if (
        situacaoTemporal ===
            "a vencer" ||
        situacaoTemporal.includes(
            "próximo do vencimento"
        ) ||
        situacaoTemporal.includes(
            "proximo do vencimento"
        )
    ) {
        return "atenção";
    }

    /*
     * Nos demais casos, preserva a conferência documental
     * original.
     *
     * Exemplos:
     * - Em dia + aprovado        -> aprovado
     * - Sem validade + aprovado  -> aprovado
     * - atenção interna          -> atenção
     * - não conferido            -> Não conferido
     */
    const verificacao =
        documento
            ?.verificacaoDocumental ||
        {};

    return (
        textoSeguro(
            verificacao
                ?.statusVerificacao
        ) ||
        textoSeguro(
            verificacao
                ?.status_verificacao
        ) ||
        textoSeguro(
            verificacao
                ?.status
        ) ||
        textoSeguro(
            verificacao
                ?.resumo
        ) ||
        textoSeguro(
            verificacao
                ?.texto
        ) ||
        "Não conferido"
    );
}

function obterRotuloEvidencia(
    evidencia
) {
    const tipo =
        textoSeguro(
            evidencia
                ?.tipoEvidencia ||
            evidencia
                ?.tipo_evidencia
        );

    if (
        TIPOS_EVIDENCIA[
            tipo
        ]
    ) {
        return TIPOS_EVIDENCIA[
            tipo
        ];
    }

    if (!tipo) {
        return "Arquivo";
    }

    return tipo
        .replaceAll(
            "_",
            " "
        )
        .replace(
            /^\p{L}/u,
            (
                letra
            ) =>
                letra.toUpperCase()
        );
}

function obterNomeArquivoEvidencia(
    evidencia
) {
    return (
        textoSeguro(
            evidencia
                ?.arquivoNomeOriginal
        ) ||
        textoSeguro(
            evidencia
                ?.arquivo_nome_original
        ) ||
        textoSeguro(
            evidencia
                ?.nomeArquivoOriginal
        ) ||
        "Arquivo selecionado"
    );
}

function obterMensagemAlerta(
    alerta
) {
    return (
        textoSeguro(
            alerta?.mensagem
        ) ||
        textoSeguro(
            alerta?.texto
        ) ||
        textoSeguro(
            alerta?.descricao
        )
    );
}

function obterMensagemAusencia(
    ausencia
) {
    const nome =
        textoSeguro(
            ausencia
                ?.nomeTreinamento
        ) ||
        textoSeguro(
            ausencia
                ?.nome
        ) ||
        textoSeguro(
            ausencia
                ?.tipoTreinamento
        );

    if (!nome) {
        return "";
    }

    return `Documento obrigatório ausente: ${nome}.`;
}

function obterObservacoes(
    estrutura
) {
    /*
     * ============================================================
     * G9.2-R9P.2 — COERÊNCIA COM DOCUMENTOS SELECIONADOS
     * ============================================================
     *
     * REGRA:
     *
     * 1. Alertas vinculados a um documento existente só podem
     *    aparecer no PDF quando esse documento também estiver
     *    presente em exportacao.documentosSelecionados.
     *
     * 2. Alertas globais, sem vínculo documental, permanecem.
     *
     * 3. Ausências obrigatórias permanecem sempre, pois justamente
     *    representam documentos que não existem para seleção.
     *
     * 4. Continua valendo a deduplicação R9P.1:
     *    "X está ausente"
     *    perde prioridade para
     *    "Documento obrigatório ausente: X".
     *
     * Isso impede situações como:
     *
     * TABELA:
     *   NR-06 Ficha de EPIs atualizada
     *
     * ATENÇÕES:
     *   NR-06 Uso Correto de EPIs:
     *   conferência documental em "atencao"
     *
     * quando o segundo documento não faz parte do pacote exportado.
     * ============================================================
     */

    const normalizarChaveDocumento =
        (
            valor
        ) =>
            textoSeguro(
                valor
            )
                .normalize(
                    "NFD"
                )
                .replace(
                    /[\u0300-\u036f]/g,
                    ""
                )
                .toLowerCase()
                .replace(
                    /\s+/g,
                    " "
                )
                .replace(
                    /[.\s]+$/g,
                    ""
                )
                .trim();

    const normalizarCodigoTreinamento =
        (
            valor
        ) => {
            const numero =
                Number(
                    valor
                );

            return (
                Number.isInteger(
                    numero
                ) &&
                numero > 0
            )
                ? numero
                : null;
        };

    /*
     * ------------------------------------------------------------
     * DOCUMENTOS QUE REALMENTE APARECEM NA TABELA DO PDF
     * ------------------------------------------------------------
     */

    const documentosSelecionados =
        listaSegura(
            estrutura
                ?.exportacao
                ?.documentosSelecionados
        );

    const idsCertificadosSelecionados =
        new Set(
            documentosSelecionados
                .map(
                    (
                        documento
                    ) =>
                        textoSeguro(
                            documento
                                ?.certificadoId
                        )
                )
                .filter(
                    Boolean
                )
        );

    const codigosTreinamentosSelecionados =
        new Set(
            documentosSelecionados
                .map(
                    (
                        documento
                    ) =>
                        normalizarCodigoTreinamento(
                            documento
                                ?.treinamentoCodigo
                        )
                )
                .filter(
                    Boolean
                )
        );

    /*
     * ------------------------------------------------------------
     * AUSÊNCIAS OBRIGATÓRIAS
     * ------------------------------------------------------------
     */

    const mensagensAusencias =
        listaSegura(
            estrutura
                ?.ausenciasObrigatorias
        )
            .map(
                obterMensagemAusencia
            )
            .map(
                textoSeguro
            )
            .filter(
                Boolean
            );

    /*
     * ------------------------------------------------------------
     * IDENTIFICAÇÃO SEMÂNTICA DA AUSÊNCIA
     * ------------------------------------------------------------
     */

    const obterChaveAusenciaDaMensagem =
        (
            mensagem
        ) => {
            const texto =
                textoSeguro(
                    mensagem
                ).trim();

            if (!texto) {
                return "";
            }

            /*
             * Documento obrigatório ausente:
             * NR-06 Uso Correto de EPIs.
             */
            const matchAusenciaObrigatoria =
                texto.match(
                    /^Documento obrigatório ausente:\s*(.+?)(?:\.\s*)?$/i
                );

            if (
                matchAusenciaObrigatoria
                    ?.[1]
            ) {
                return normalizarChaveDocumento(
                    matchAusenciaObrigatoria[1]
                );
            }

            /*
             * NR-06 Uso Correto de EPIs está ausente.
             */
            const matchAlertaAusente =
                texto.match(
                    /^(.+?)\s+está ausente(?:\.\s*)?$/i
                );

            if (
                matchAlertaAusente
                    ?.[1]
            ) {
                return normalizarChaveDocumento(
                    matchAlertaAusente[1]
                );
            }

            return "";
        };

    const chavesAusencias =
        new Set(
            mensagensAusencias
                .map(
                    obterChaveAusenciaDaMensagem
                )
                .filter(
                    Boolean
                )
        );

    /*
     * ------------------------------------------------------------
     * FILTRO DOS ALERTAS DO ESTRUTURA
     * ------------------------------------------------------------
     *
     * O Estrutura é mais amplo que o pacote do PDF.
     *
     * Portanto um alerta de um certificado que não foi selecionado
     * não pode aparecer ao lado de uma tabela que não contém esse
     * certificado.
     */

    const alertaPertenceAoPacote =
        (
            alerta
        ) => {
            if (
                !alerta ||
                typeof alerta !==
                    "object"
            ) {
                /*
                 * Compatibilidade com alertas antigos que possam
                 * chegar como string.
                 */
                return true;
            }

            const certificadoId =
                textoSeguro(
                    alerta
                        ?.certificadoId
                );

            const treinamentoCodigo =
                normalizarCodigoTreinamento(
                    alerta
                        ?.treinamentoCodigo
                );

            const codigoAlerta =
                textoSeguro(
                    alerta
                        ?.codigo
                )
                    .toUpperCase();

            /*
             * Ausência obrigatória não depende de seleção:
             * o documento está ausente justamente porque não existe
             * uma evidência/documento atual para selecionar.
             */
            if (
                codigoAlerta ===
                "DOCUMENTO_OBRIGATORIO_AUSENTE"
            ) {
                return true;
            }

            /*
             * Alerta sem referência documental é global:
             * obra ambígua, situação histórica etc.
             */
            if (
                !certificadoId &&
                !treinamentoCodigo
            ) {
                return true;
            }

            /*
             * Prioridade para o certificado exato.
             */
            if (
                certificadoId &&
                idsCertificadosSelecionados.has(
                    certificadoId
                )
            ) {
                return true;
            }

            /*
             * Compatibilidade para alertas que possuam apenas
             * treinamentoCodigo.
             */
            if (
                !certificadoId &&
                treinamentoCodigo &&
                codigosTreinamentosSelecionados.has(
                    treinamentoCodigo
                )
            ) {
                return true;
            }

            /*
             * Documento não apresentado na tabela:
             * seu alerta documental não pertence a este PDF.
             */
            return false;
        };

    const alertasAplicaveis =
        listaSegura(
            estrutura
                ?.alertas
        )
            .filter(
                alertaPertenceAoPacote
            );

    const mensagensAlertas =
        alertasAplicaveis
            .map(
                obterMensagemAlerta
            )
            .map(
                textoSeguro
            )
            .filter(
                Boolean
            );

    /*
     * ------------------------------------------------------------
     * DEDUPLICAÇÃO DA AUSÊNCIA
     * ------------------------------------------------------------
     *
     * Se a mesma ausência aparecer como:
     *
     *   NR-06 ... está ausente.
     *
     * e:
     *
     *   Documento obrigatório ausente: NR-06 ...
     *
     * fica somente a forma específica.
     */

    const alertasSemDuplicidadeDeAusencia =
        mensagensAlertas.filter(
            (
                mensagem
            ) => {
                const chave =
                    obterChaveAusenciaDaMensagem(
                        mensagem
                    );

                if (!chave) {
                    return true;
                }

                return (
                    !chavesAusencias.has(
                        chave
                    )
                );
            }
        );

    return [
        ...new Set(
            [
                ...alertasSemDuplicidadeDeAusencia,
                ...mensagensAusencias,
            ]
        ),
    ];
}
function validarEstruturaExportacao(
    estrutura
) {
    if (
        !estrutura ||
        typeof estrutura !==
            "object" ||
        Array.isArray(
            estrutura
        )
    ) {
        throw new Error(
            "Estrutura de Exportação inválido para o relatório."
        );
    }

    const exportacao =
        estrutura
            ?.exportacao;

    if (
        !exportacao ||
        typeof exportacao !==
            "object" ||
        Array.isArray(
            exportacao
        )
    ) {
        throw new Error(
            "Bloco exportacao ausente no Estrutura da Consolidação."
        );
    }

    if (
        exportacao
            .schemaVersion !==
        CONSOLIDACAO_COLABORADOR_EXPORT_SCHEMA_VERSION
    ) {
        throw new Error(
            `Schema de exportação incompatível: ${textoSeguro(
                exportacao
                    ?.schemaVersion
            ) || "não informado"}.`
        );
    }

    const documentos =
        exportacao
            .documentosSelecionados;

    const evidencias =
        exportacao
            .evidenciasSelecionadas;

    if (
        !Array.isArray(
            documentos
        ) ||
        !Array.isArray(
            evidencias
        )
    ) {
        throw new Error(
            "Coleções selecionadas inválidas no Estrutura de Exportação."
        );
    }

    if (
        exportacao
            .totalDocumentos !==
        documentos.length
    ) {
        throw new Error(
            "totalDocumentos diverge da coleção selecionada."
        );
    }

    if (
        exportacao
            .totalArquivos !==
        evidencias.length
    ) {
        throw new Error(
            "totalArquivos diverge da coleção selecionada."
        );
    }

    const totalEvidenciasNosDocumentos =
        documentos.reduce(
            (
                total,
                documento
            ) =>
                total +
                listaSegura(
                    documento
                        ?.evidenciasSelecionadas
                ).length,
            0
        );

    if (
        totalEvidenciasNosDocumentos !==
        evidencias.length
    ) {
        throw new Error(
            "As evidências dos documentos divergem da seleção física global."
        );
    }

    if (
        documentos.length ===
            0 ||
        evidencias.length ===
            0
    ) {
        throw new Error(
            "O relatório não pode ser gerado com seleção vazia."
        );
    }

    if (
        exportacao
            .podeGerar !==
        true
    ) {
        const mensagens =
            [
                ...listaSegura(
                    estrutura
                        ?.bloqueios
                ),

                ...listaSegura(
                    exportacao
                        ?.bloqueios
                ),
            ]
                .map(
                    (
                        bloqueio
                    ) =>
                        textoSeguro(
                            bloqueio
                                ?.mensagem
                        )
                )
                .filter(
                    Boolean
                );

        throw new Error(
            mensagens[0] ||
            "O Estrutura de Exportação está bloqueado para geração."
        );
    }

    return {
        exportacao,
        documentos,
        evidencias,
    };
}

function substituirControlesWindows(
    valor
) {
    return Array.from(
        textoSeguro(
            valor
        )
    )
        .map(
            (
                caractere
            ) => {
                const codigo =
                    caractere.codePointAt(
                        0
                    );

                return (
                    codigo !==
                        undefined &&
                    codigo <=
                        31
                )
                    ? "-"
                    : caractere;
            }
        )
        .join(
            ""
        );
}

function limparNomeArquivoWindows(
    valor
) {
    return substituirControlesWindows(
        valor
    )
        .replace(
            /[<>:"/\\|?*]/g,
            "-"
        )
        .replace(
            /\s+/g,
            " "
        )
        .replace(
            /[. ]+$/g,
            ""
        ) ||
        "COLABORADOR";
}

export function criarNomeArquivoResumoConsolidacaoColaborador(
    estruturaExportacao
) {
    validarEstruturaExportacao(
        estruturaExportacao
    );

    const nome =
        limparNomeArquivoWindows(
            obterNomeColaborador(
                estruturaExportacao
            )
        );

    return `${nome} - RESUMO DOCUMENTAL.pdf`;
}

function ehTreinamentoParaPaginacao(
    documento
) {
    return (
        obterCategoria(
            documento
        ) ===
        "Treinamentos"
    );
}

function paginarDocumentos(
    documentos
) {
    const lista =
        listaSegura(
            documentos
        );

    /*
     * Mesmo sem documentos, o relatório continua
     * possuindo uma página física válida.
     */
    if (!lista.length) {
        return [
            [],
        ];
    }

    const treinamentos =
        lista.filter(
            ehTreinamentoParaPaginacao
        );

    /*
     * Regra principal:
     *
     * até 12 treinamentos -> tudo em uma página.
     *
     * A quantidade de evidências não controla mais
     * a paginação porque atualmente Certificado e
     * Lista são indicadores compactos na própria linha.
     */
    if (
        treinamentos.length <=
        TREINAMENTOS_MAXIMOS_PAGINA_PRINCIPAL
    ) {
        return [
            lista,
        ];
    }

    /*
     * Somente treinamentos excedentes seguem
     * para página de continuação.
     */
    const treinamentosPrimeiraPagina =
        new Set(
            treinamentos.slice(
                0,
                TREINAMENTOS_MAXIMOS_PAGINA_PRINCIPAL
            )
        );

    const primeiraPagina =
        lista.filter(
            (
                documento
            ) =>
                !ehTreinamentoParaPaginacao(
                    documento
                ) ||
                treinamentosPrimeiraPagina.has(
                    documento
                )
        );

    const treinamentosRestantes =
        treinamentos.slice(
            TREINAMENTOS_MAXIMOS_PAGINA_PRINCIPAL
        );

    const paginas =
        [
            primeiraPagina,
        ];

    /*
     * Normalmente haverá apenas uma continuação.
     *
     * O loop permanece por segurança para um cenário
     * excepcional com volume muito elevado, evitando
     * corte silencioso do conteúdo.
     */
    for (
        let indice = 0;
        indice <
        treinamentosRestantes.length;
        indice +=
            TREINAMENTOS_MAXIMOS_PAGINA_CONTINUACAO
    ) {
        paginas.push(
            treinamentosRestantes.slice(
                indice,
                indice +
                    TREINAMENTOS_MAXIMOS_PAGINA_CONTINUACAO
            )
        );
    }

    return paginas;
}
function montarEvidencias(
    documento
) {
    const evidencias =
        listaSegura(
            documento
                ?.evidenciasSelecionadas
        );

    return evidencias
        .map(
            (
                evidencia
            ) => `
                <li class="evidencia-item">
                    <strong>
                        ${escaparHtml(
                            obterRotuloEvidencia(
                                evidencia
                            )
                        )}
                    </strong>

                    <span>
                        ${escaparHtml(
                            obterNomeArquivoEvidencia(
                                evidencia
                            )
                        )}
                    </span>
                </li>
            `
        )
        .join(
            ""
        );
}

function montarLinhaDocumento(
    documento
) {
    /*
     * ============================================================
     * G9.2-R12.1 — PADRÃO DE CORES DA CONFERÊNCIA
     * ============================================================
     */

    const conferenciaTexto =
        textoSeguro(
            obterConferencia(
                documento
            )
        ) ||
        "—";

    const conferenciaSlug =
        conferenciaTexto
            .normalize(
                "NFD"
            )
            .replace(
                /[\u0300-\u036f]/g,
                ""
            )
            .toLowerCase()
            .trim();

    let conferenciaTom =
        "neutro";

    if (
        conferenciaSlug ===
            "aprovado" ||
        conferenciaSlug ===
            "aprovada" ||
        conferenciaSlug ===
            "conforme"
    ) {
        conferenciaTom =
            "aprovado";
    }
    else if (
        conferenciaSlug.includes(
            "atencao"
        )
    ) {
        conferenciaTom =
            "atencao";
    }
    else if (
        conferenciaSlug.includes(
            "suspeit"
        ) ||
        conferenciaSlug.includes(
            "reprov"
        ) ||
        conferenciaSlug.includes(
            "bloque"
        )
    ) {
        conferenciaTom =
            "critico";
    }
    else if (
        conferenciaSlug.includes(
            "revis"
        )
    ) {
        conferenciaTom =
            "revisar";
    }

    return `
        <tr
            class="documento-row"
            data-documento-relatorio
            data-certificado-id="${escaparHtml(
                documento
                    ?.certificadoId ||
                ""
            )}"
        >
            <td>
                <div class="documento-identidade">
                    <strong>
                        ${escaparHtml(
                            obterNomeDocumento(
                                documento
                            )
                        )}
                    </strong>
                </div>
            </td>

            <td class="celula-central">
                ${escaparHtml(
                    formatarData(
                        documento
                            ?.dataRealizacao
                    )
                )}
            </td>

            <td class="celula-central">
                ${escaparHtml(
                    formatarData(
                        documento
                            ?.dataVencimento
                    )
                )}
            </td>

            <td class="celula-central">
                ${escaparHtml(
                        obterStatusTemporal(
                            documento
                        )
                    )}
            </td>

            <td class="celula-central">
                <span class="conferencia-texto conferencia-texto--${escaparHtml(
                    conferenciaTom
                )}">
                    ${escaparHtml(
                        conferenciaTexto
                    )}
                </span>
            </td>

            <td class="celula-central">
                ${montarIndicadorEvidenciaPdf(
                    contarEvidenciasPdf(
                        documento,
                        "certificado"
                    )
                )}
            </td>

            <td class="celula-central">
                ${montarIndicadorEvidenciaPdf(
                    contarEvidenciasPdf(
                        documento,
                        "lista"
                    )
                )}
            </td>
        </tr>
    `;
}


/* ============================================================
   G9.2-R9A — ORGANIZAÇÃO COMPACTA DAS EVIDÊNCIAS
   ============================================================ */

/*
 * Esta camada NÃO recalcula seleção documental.
 *
 * Ela utiliza exclusivamente documento.evidenciasSelecionadas
 * já entregue ao renderer pelo estrutura de exportação.
 *
 * Regra de APRESENTAÇÃO:
 * - lista_presenca       -> coluna LISTA;
 * - qualquer outra evidência selecionada -> CERTIFICADO.
 *
 * Assim preservamos:
 * - certificado_individual;
 * - documento_principal_legado;
 * - demais tipos físicos eventualmente selecionados.
 */

function obterEvidenciasSelecionadasPdf(
    documento
) {
    return Array.isArray(
        documento
            ?.evidenciasSelecionadas
    )
        ? documento
              .evidenciasSelecionadas
              .filter(Boolean)
        : [];
}

function normalizarTipoEvidenciaPdf(
    evidencia
) {
    return String(
        evidencia
            ?.tipoEvidencia ??
        evidencia
            ?.tipo_evidencia ??
        ""
    )
        .trim()
        .toLowerCase();
}

function contarEvidenciasPdf(
    documento,
    grupo
) {
    const evidencias =
        obterEvidenciasSelecionadasPdf(
            documento
        );

    if (
        grupo ===
        "lista"
    ) {
        return evidencias.filter(
            (evidencia) =>
                normalizarTipoEvidenciaPdf(
                    evidencia
                ) ===
                "lista_presenca"
        ).length;
    }

    return evidencias.filter(
        (evidencia) =>
            normalizarTipoEvidenciaPdf(
                evidencia
            ) !==
            "lista_presenca"
    ).length;
}

function montarIndicadorEvidenciaPdf(
    total
) {
    const quantidade =
        Number(
            total
        ) || 0;

    if (
        quantidade <=
        0
    ) {
        return `
            <span
                style="
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    color:#7a8983;
                    font-weight:700;
                    font-size:12px;
                    line-height:1;
                "
            >
                —
            </span>
        `;
    }

    return `
        <span
            style="
                display:inline-flex;
                align-items:center;
                justify-content:center;
                gap:4px;
                white-space:nowrap;
            "
        >
            <span
                style="
                    display:inline-flex;
                    align-items:center;
                    justify-content:center;
                    width:16px;
                    height:16px;
                    border-radius:3px;
                    background:#0d8b63;
                    color:#ffffff;
                    font-size:11px;
                    font-weight:900;
                    line-height:1;
                "
            >
                ✓
            </span>

            ${
                quantidade > 1
                    ? `
                        <span
                            style="
                                color:#0b6f51;
                                font-size:10px;
                                font-weight:800;
                                line-height:1;
                            "
                        >
                            ${quantidade}
                        </span>
                    `
                    : ""
            }
        </span>
    `;
}
/* ============================================================
   G9.2-R9I — ORDENAÇÃO NUMÉRICA DAS NRs
   ============================================================ */

/*
 * Regra apenas de apresentação do PDF:
 *
 * 1. documentos sem NR permanecem primeiro;
 * 2. documentos NR são ordenados numericamente;
 * 3. NR-18.06 é tratada como 18 + subitem 06;
 * 4. documentos da mesma NR mantêm sua ordem original.
 *
 * Nenhum objeto do estrutura é mutado.
 */

function obterTituloVisivelDocumentoPdf(
    documento
) {
    const html =
        montarLinhaDocumento(
            documento
        );

    const correspondencia =
        html.match(
            /<strong[^>]*>([\s\S]*?)<\/strong>/i
        );

    if (
        !correspondencia
    ) {
        return "";
    }

    return String(
        correspondencia[1] || ""
    )
        .replace(
            /<[^>]+>/g,
            " "
        )
        .replace(
            /&nbsp;/gi,
            " "
        )
        .replace(
            /&amp;/gi,
            "&"
        )
        .replace(
            /&quot;/gi,
            '"'
        )
        .replace(
            /&#39;/gi,
            "'"
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim();
}

function obterChaveNrDocumentoPdf(
    documento,
    indiceOriginal
) {
    const titulo =
        obterTituloVisivelDocumentoPdf(
            documento
        );

    const correspondencia =
        titulo.match(
            /\bNR\s*[-–—]?\s*(\d{1,2})(?:[.,](\d{1,2}))?/i
        );

    if (
        !correspondencia
    ) {
        return {
            grupo: 0,
            nr: 0,
            subitem: 0,
            indiceOriginal,
        };
    }

    return {
        grupo: 1,
        nr:
            Number(
                correspondencia[1]
            ) || 0,
        subitem:
            Number(
                correspondencia[2]
            ) || 0,
        indiceOriginal,
    };
}

function ordenarDocumentosPorNrPdf(
    documentos
) {
    return (
        Array.isArray(
            documentos
        )
            ? documentos
            : []
    )
        .map(
            (
                documento,
                indiceOriginal
            ) => ({
                documento,
                chave:
                    obterChaveNrDocumentoPdf(
                        documento,
                        indiceOriginal
                    ),
            })
        )
        .sort(
            (
                itemA,
                itemB
            ) => {
                const a =
                    itemA.chave;

                const b =
                    itemB.chave;

                if (
                    a.grupo !==
                    b.grupo
                ) {
                    return (
                        a.grupo -
                        b.grupo
                    );
                }

                if (
                    a.grupo ===
                    0
                ) {
                    return (
                        a.indiceOriginal -
                        b.indiceOriginal
                    );
                }

                if (
                    a.nr !==
                    b.nr
                ) {
                    return (
                        a.nr -
                        b.nr
                    );
                }

                if (
                    a.subitem !==
                    b.subitem
                ) {
                    return (
                        a.subitem -
                        b.subitem
                    );
                }

                return (
                    a.indiceOriginal -
                    b.indiceOriginal
                );
            }
        )
        .map(
            (
                item
            ) =>
                item.documento
        );
}
function montarTabela(
    documentos
) {
    return `
        <div class="tabela-container">
            <table class="documentos-tabela">
                <colgroup>
                    <col style="width: 30%;">
                    <col style="width: 10%;">
                    <col style="width: 10%;">
                    <col style="width: 12%;">
                    <col style="width: 12%;">
                    <col style="width: 13%;">
                    <col style="width: 13%;">
                </colgroup>

                <thead>
                    <tr>
                        <th>Documento</th>
                        <th class="celula-central">Emissão</th>
                        <th class="celula-central">Vencimento</th>
                        <th class="celula-central">Situação</th>
                        <th class="celula-central">Conferência</th>
                        <th class="celula-central">Certificado</th>
                        <th class="celula-central">Lista</th>
                    </tr>
                </thead>

                <tbody data-corpo-documentos>
                    ${ordenarDocumentosPorNrPdf(
                        documentos
                    )
                        .map(
                            montarLinhaDocumento
                        )
                        .join(
                            ""
                        )}
                </tbody>
            </table>
        </div>
    `;
}

function montarHero({
    estrutura,
    heroUrl,
    indicePagina,
    totalPaginas,
}) {
    const imagem =
        textoSeguro(
            heroUrl
        );

    return `
        <header class="hero-relatorio">
            ${
                imagem
                    ? `
                        <img
                            class="hero-relatorio__imagem"
                            src="${escaparHtml(
                                imagem
                            )}"
                            alt=""
                        >
                    `
                    : ""
            }

            <div class="hero-relatorio__overlay"></div>

            <div class="hero-relatorio__conteudo">
                <div class="marca-safescan">
                    <strong>
                        SafeScan Brasil
                    </strong>

                    <span>
                        Gestão integrada de SST
                    </span>
                </div>

                <div class="titulo-relatorio">
                    <p>
                        Resumo documental do colaborador
                    </p>
                </div>

                <div class="hero-relatorio__pagina">
                    <span>
                        ${escaparHtml(
                            obterNomeColaborador(
                                estrutura
                            )
                        )}
                    </span>
                </div>
            </div>
        </header>
    `;
}

function montarContextoPrincipal(
    estrutura
) {
    return `
        <section class="contexto-principal">
            <div>
                <span class="contexto-label">
                    Colaborador
                </span>

                <strong>
                    ${escaparHtml(
                        obterNomeColaborador(
                            estrutura
                        )
                    )}
                </strong>
            </div>

            <!--
                G9.2-R9K — FUNÇÃO NO CONTEXTO PRINCIPAL
            -->

            <div>
                <span class="contexto-label">
                    Função
                </span>

                <strong>
                    ${escaparHtml(
                        textoSeguro(
                            estrutura
                                ?.colaborador
                                ?.funcao
                        ) ||
                        "—"
                    )}
                </strong>
            </div>

            <div>
                <span class="contexto-label">
                    Empresa
                </span>

                <strong>
                    ${escaparHtml(
                        obterNomeEmpresa(
                            estrutura
                        )
                    )}
                </strong>
            </div>

            <div>
                <span class="contexto-label">
                    Obra
                </span>

                <strong>
                    ${escaparHtml(
                        obterNomeObra(
                            estrutura
                        )
                    )}
                </strong>
            </div>
        </section>
    `;
}

function montarResumo(
    estrutura,
    exportacao
) {
    return `
        <section class="resumo-selecao">
            <article>
                <span>
                    Documentos
                </span>

                <strong>
                    ${escaparHtml(
                        exportacao
                            .totalDocumentos
                    )}
                </strong>

                <small>
                    selecionados
                </small>
            </article>

            <article>
                <span>
                    Arquivos
                </span>

                <strong>
                    ${escaparHtml(
                        exportacao
                            .totalArquivos
                    )}
                </strong>

                <small>
                    evidências físicas
                </small>
            </article>

            <article>
                <span>
                    Ausências
                </span>

                <strong>
                    ${escaparHtml(
                        listaSegura(
                            estrutura
                                ?.ausenciasObrigatorias
                        ).length
                    )}
                </strong>

                <small>
                    obrigatórias
                </small>
            </article>

            <article>
                <span>
                    Alertas
                </span>

                <strong>
                    ${escaparHtml(
                        listaSegura(
                            estrutura
                                ?.alertas
                        ).length
                    )}
                </strong>

                <small>
                    itens para revisão
                </small>
            </article>
        </section>
    `;
}

/* R12.4K-MARCADOR */
function montarObservacoes(
    estrutura
) {
    /*
     * G9.2-R9O.1 — FONTE CANÔNICA DAS ATENÇÕES
     *
     * Preserva a mesma origem utilizada antes do refinamento visual.
     */
    const observacoesBrutas =
        obterObservacoes(
            estrutura
        );

    const observacoes =
        observacoesBrutas
            .map((item) => {
                if (
                    item === null ||
                    item === undefined
                ) {
                    return null;
                }

                if (
                    typeof item ===
                    "string"
                ) {
                    const textoOriginal =
                        item.trim();

                    if (
                        !textoOriginal
                    ) {
                        return null;
                    }

                    const statusMatch =
                        textoOriginal.match(
                            /em\s+"?([^".]+)"?\.?$/i
                        );

                    const status =
                        (
                            statusMatch?.[1] ??
                            "Revisar"
                        ).trim();

                    const textoSemStatus =
                        statusMatch
                            ? textoOriginal
                                  .replace(
                                      statusMatch[0],
                                      ""
                                  )
                                  .trim()
                            : textoOriginal;

                    const indiceSeparador =
                        textoSemStatus.indexOf(
                            ":"
                        );

                    const titulo =
                        indiceSeparador >= 0
                            ? textoSemStatus
                                  .slice(
                                      0,
                                      indiceSeparador
                                  )
                                  .trim()
                            : textoSemStatus;

                    const detalhe =
                        indiceSeparador >= 0
                            ? textoSemStatus
                                  .slice(
                                      indiceSeparador + 1
                                  )
                                  .trim()
                            : "Verificar conferência documental.";

                    return {
                        titulo,
                        detalhe,
                        status,
                    };
                }

                const titulo =
                    String(
                        item?.documento ??
                            item?.titulo ??
                            item?.nome ??
                            item?.label ??
                            ""
                    ).trim();

                const detalhe =
                    String(
                        item?.detalhe ??
                            item?.descricao ??
                            item?.mensagem ??
                            item?.texto ??
                            "Verificar conferência documental."
                    ).trim();

                const status =
                    String(
                        item?.status ??
                            item?.conferencia ??
                            item?.tipo ??
                            "Revisar"
                    ).trim();

                if (
                    !titulo &&
                    !detalhe
                ) {
                    return null;
                }

                return {
                    titulo:
                        titulo ||
                        "Documento",
                    detalhe,
                    status,
                };
            })
            .filter(Boolean)
            .map((observacao) => {
                /*
                 * ====================================================
                 * G9.2-R12.3B — AUSÊNCIA INVERTIDA
                 * ====================================================
                 *
                 * Antes:
                 * Documento obrigatório ausente
                 * NR-XX ...
                 *
                 * Depois:
                 * NR-XX ...
                 * Documento obrigatório ausente
                 *
                 * Somente esta classificação é invertida.
                 * ====================================================
                 */

                const titulo =
                    String(
                        observacao
                            ?.titulo ??
                            ""
                    ).trim();

                const detalhe =
                    String(
                        observacao
                            ?.detalhe ??
                            ""
                    ).trim();

                const ausenciaObrigatoria =
                    /^Documento obrigatório ausente$/i.test(
                        titulo
                    );

                if (!ausenciaObrigatoria) {
                    return {
                        ...observacao,
                        ausenciaObrigatoria:
                            false,
                    };
                }

                return {
                    ...observacao,

                    titulo:
                        detalhe ||
                        titulo,

                    detalhe:
                        titulo,

                    ausenciaObrigatoria:
                        true,
                };
            });

    if (!observacoes.length) {
        return "";
    }

    const itensHtml =
        observacoes
            .map((observacao) => {
                const statusTexto =
                    String(
                        observacao
                            ?.status ??
                            "Revisar"
                    ).trim();

                const statusSlug =
                    statusTexto
                        .toLowerCase()
                        .normalize("NFD")
                        .replace(
                            /[\u0300-\u036f]/g,
                            ""
                        )
                        .replace(
                            /[^a-z0-9]+/g,
                            "-"
                        )
                        .replace(
                            /^-+|-+$/g,
                            ""
                        ) ||
                    "revisar";

                return `
                    <article class="observacoes-documentais__item${observacao?.ausenciaObrigatoria ? " observacoes-documentais__item--ausencia" : ""}">
                        <span class="observacoes-documentais__ponto"></span>

                        <div
                            class="observacoes-documentais__conteudo">
                            <strong class="observacoes-documentais__documento">
                                ${escaparHtml(
                                    observacao
                                        ?.titulo ??
                                        "Documento"
                                )}
                            </strong>

                            <span class="observacoes-documentais__detalhe">
                                ${escaparHtml(
                                    observacao
                                        ?.detalhe ??
                                        "Verificar conferência documental."
                                )}
                            </span>

                        </div>

                        <span class="observacoes-documentais__estado observacoes-documentais__estado--${escaparHtml(
                            statusSlug
                        )}">
                            ${escaparHtml(
                                statusTexto
                            )}
                        </span>
                    </article>
                `;
            })
            .join("");

    /*
     * G9.2-R9V.1 — preenchimento exclusivamente visual.
     *
     * Completa a última linha da grade de 5 colunas sem criar
     * observações falsas e sem alterar o contador.
     */
    const totalColunasObservacoes =
        5;

    const totalCelulasVazias =
        (
            totalColunasObservacoes -
            (
                observacoes.length %
                totalColunasObservacoes
            )
        ) %
        totalColunasObservacoes;

    const celulasVaziasHtml =
        Array.from(
            {
                length:
                    totalCelulasVazias,
            },
            () =>
                '<span class="observacoes-documentais__vazio" aria-hidden="true"></span>'
        ).join("");

    return `
        <section class="observacoes-documentais-bloco">
            <div class="observacoes-documentais__topo">
                <span class="observacoes-documentais__topo-titulo">
                    Atenções documentais
                </span>

                <span class="observacoes-documentais__topo-separador">
                    /
                </span>

                <span class="observacoes-documentais__topo-contador">
                    ${escaparHtml(
                        `${observacoes.length} registro${
                            observacoes.length > 1
                                ? "s"
                                : ""
                        }`
                    )}
                </span>
            </div>

            <section class="observacoes-documentais">
                <div class="observacoes-documentais__lista">${itensHtml}${celulasVaziasHtml}
                </div>
            </section>
        </section>
    `;
}
/* ============================================================
   G9.2-R9F.1 — RESTAURAÇÃO DO CONTEXTO DE CONTINUAÇÃO
   ============================================================ */

function montarContextoContinuacao(
    estrutura
) {
    return `
        <section class="contexto-continuacao">
            <strong>
                ${escaparHtml(
                    obterNomeColaborador(
                        estrutura
                    )
                )}
            </strong>

            <span>
                ${escaparHtml(
                    obterNomeEmpresa(
                        estrutura
                    )
                )}
                ·
                ${escaparHtml(
                    obterNomeObra(
                        estrutura
                    )
                )}
            </span>
        </section>
    `;
}
function montarRodape({
    estrutura,
    indicePagina,
    totalPaginas,
}) {
    const primeiraPagina =
        indicePagina ===
        1;

    return `
        <div class="rodape-relatorio-bloco">

            ${
                primeiraPagina
                    ? montarObservacoes(
                          estrutura
                      )
                    : ""
            }

            <footer class="rodape-relatorio">
                <span>
                    Gerado pelo SafeScan Brasil
                </span>

                <span>
                    ${escaparHtml(
                        formatarDataHora(
                            estrutura
                                ?.geradoEm
                        )
                    )}
                </span>

                <span data-rodape-pagina>
                    Página
                    ${escaparHtml(
                        indicePagina
                    )}
                    de
                    ${escaparHtml(
                        totalPaginas
                    )}
                </span>
            </footer>
        </div>
    `;
}

function montarPagina({
    estrutura,
    exportacao,
    documentos,
    heroUrl,
    indicePagina,
    totalPaginas,
}) {
    const primeiraPagina =
        indicePagina ===
        1;

    return `
        <section
            class="pagina-relatorio"
            data-pagina-relatorio
            ${
                primeiraPagina
                    ? "data-primeira-pagina"
                    : "data-pagina-continuacao"
            }
        >
            ${montarHero({
                estrutura,
                heroUrl,
                indicePagina,
                totalPaginas,
            })}

            <div class="conteudo-relatorio">
                ${
                    primeiraPagina
                        ? `
                            ${montarContextoPrincipal(
                                estrutura
                            )}

                            ${montarResumo(
                                estrutura,
                                exportacao
                            )}

                        `
                        : montarContextoContinuacao(
                              estrutura
                          )
                }

                ${montarTabela(
                    documentos
                )}
            </div>

            ${montarRodape({
                estrutura,
                indicePagina,
                totalPaginas,
            })}
        </section>
    `;
}

function montarCss() {
    return `
        :root {
            color-scheme: light;
            font-family: Arial, Helvetica, sans-serif;
            color: #17362c;
            background: #edf2ef;
        }

        * {
            box-sizing: border-box;
        }

        html,
        body {
            margin: 0;
            padding: 0;
            background: #edf2ef;
        }

        body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-font-smoothing: antialiased;
        }

        .relatorio-root {
            display: grid;
            justify-content: center;
            gap: 14px;
            padding: 14px;
        }

        .pagina-relatorio {
            width: 297mm;
            height: 210mm;
            overflow: hidden;
            display: grid;
            grid-template-rows:
                22mm
                minmax(0, 1fr)
                7mm;
            gap: 3mm;
            padding: 7mm 8mm 5mm;
            border-radius: 3mm;
            background: #ffffff;
            box-shadow:
                0 5px 18px
                rgba(20, 55, 44, 0.12);
            break-after: page;
            page-break-after: always;
        }

        .pagina-relatorio:last-child {
            break-after: auto;
            page-break-after: auto;
        }

        .hero-relatorio {
            position: relative;
            overflow: hidden;
            border-radius: 2.8mm;
            color: #ffffff;
            background:
                linear-gradient(
                    105deg,
                    #102f27 0%,
                    #0b6f51 54%,
                    #159268 100%
                );
        }

        .hero-relatorio__imagem,
        .hero-relatorio__overlay {
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
        }

        .hero-relatorio__imagem {
            object-fit: cover;
            object-position: center 58%;
        }

        .hero-relatorio__overlay {
            background:
                linear-gradient(
                    90deg,
                    rgba(8, 42, 33, 0.90) 0%,
                    rgba(8, 91, 64, 0.76) 51%,
                    rgba(7, 131, 62, 0.58) 100%
                );
        }

        .hero-relatorio__conteudo {
            position: relative;
            z-index: 2;
            height: 100%;
            display: grid;
            grid-template-columns:
                1fr
                1.45fr
                1fr;
            align-items: center;
            gap: 5mm;
            padding: 3mm 5mm;
        }

        .marca-safescan,
        .titulo-relatorio,
        .hero-relatorio__pagina {
            min-width: 0;
            display: flex;
            flex-direction: column;
        }

        .marca-safescan strong {
            font-size: 16px;
            letter-spacing: 0.02em;
        }

        .marca-safescan span,
        .hero-relatorio__pagina span {
            margin-top: 1mm;
            font-size: 8px;
            font-weight: 650;
            opacity: 0.88;
        }

        .titulo-relatorio {
            align-items: center;
            text-align: center;
        }

        .titulo-relatorio h1 {
            margin: 0;
            font-size: 22px;
            line-height: 1;
            letter-spacing: -0.025em;
        }

        .titulo-relatorio p {
            margin: 1.2mm 0 0;
            font-size: 9px;
            font-weight: 650;
            opacity: 0.92;
        }

        .hero-relatorio__pagina {
            align-items: flex-end;
            text-align: right;
        }

        .hero-relatorio__pagina strong {
            min-width: 13mm;
            padding: 1.1mm 2mm;
            border:
                0.3mm solid
                rgba(255, 255, 255, 0.32);
            border-radius: 8mm;
            font-size: 9px;
            text-align: center;
            background:
                rgba(255, 255, 255, 0.12);
        }

        .hero-relatorio__pagina span {
            max-width: 60mm;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .conteudo-relatorio {
            min-height: 0;
            display: flex;
            flex-direction: column;
            gap: 2mm;
        }

        .contexto-principal {
            display: grid;
            grid-template-columns:
                1.15fr
                0.9fr
                1fr
                1.45fr;
            gap: 2mm;
        }

        .contexto-principal > div,
        .contexto-continuacao {
            min-width: 0;
            padding: 2mm 2.5mm;
            border:
                0.25mm solid
                #dce8e3;
            border-radius: 2mm;
            background: #f8fbfa;
        }

        .contexto-label {
            display: block;
            margin-bottom: 0.8mm;
            font-size: 6.8px;
            font-weight: 800;
            letter-spacing: 0.07em;
            text-transform: uppercase;
            color: #768a83;
        }

        .contexto-principal strong,
        .contexto-continuacao strong {
            display: block;
            overflow-wrap: anywhere;
            font-size: 9px;
            line-height: 1.25;
            color: #17362c;
        }

        .contexto-continuacao {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 5mm;
        }

        .contexto-continuacao span {
            min-width: 0;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            font-size: 8px;
            font-weight: 650;
            color: #667b74;
        }

        .resumo-selecao {
            display: grid;
            grid-template-columns:
                repeat(
                    4,
                    minmax(0, 1fr)
                );
            gap: 2mm;
        }

        .resumo-selecao article {
            min-height: 13mm;
            display: grid;
            grid-template-columns:
                1fr auto;
            grid-template-rows:
                auto auto;
            align-items: center;
            gap: 0.5mm 2mm;
            padding: 1.8mm 2.4mm;
            border:
                0.25mm solid
                #dce8e3;
            border-radius: 2mm;
            background: #ffffff;
        }

        .resumo-selecao span {
            font-size: 7px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #75877f;
        }

        .resumo-selecao strong {
            grid-row:
                1 /
                span 2;
            grid-column: 2;
            font-size: 19px;
            line-height: 1;
            color: #0b7655;
        }

        .resumo-selecao small {
            font-size: 7px;
            font-weight: 650;
            color: #81918c;
        }

        .observacoes-documentais {
            display: grid;
            grid-template-columns:
                43mm
                minmax(0, 1fr);
            gap: 2mm;
            padding: 1.5mm 2.2mm;
            border:
                0.25mm solid
                #f0d8ad;
            border-radius: 2mm;
            background: #fffaf0;
        }

        .observacoes-documentais__titulo {
            display: flex;
            flex-direction: column;
            justify-content: center;
        }

        .observacoes-documentais__titulo strong {
            font-size: 8px;
            color: #8a5a11;
        }

        .observacoes-documentais__titulo span {
            margin-top: 0.6mm;
            font-size: 6.8px;
            font-weight: 700;
            color: #aa7d3a;
        }

        .observacoes-documentais ul {
            margin: 0;
            padding-left: 4mm;
            font-size: 6.8px;
            line-height: 1.35;
            color: #765b31;
        }

        .tabela-container {
            min-height: 0;
            flex: 1;
            overflow: hidden;
            border:
                0.25mm solid
                #dce5e1;
            border-radius: 2mm;
            background: #ffffff;
        }

        .documentos-tabela {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        .documentos-tabela thead {
            background: #f3f7f5;
        }

        .documentos-tabela th {
            height: 7mm;
            padding: 1.3mm 1.8mm;
            border-bottom:
                0.25mm solid
                #dbe5e1;
            font-size: 6.7px;
            font-weight: 850;
            line-height: 1.15;
            text-align: left;
            text-transform: uppercase;
            letter-spacing: 0.045em;
            color: #687b74;
        }

        .documentos-tabela td {
            padding: 1.5mm 1.8mm;
            border-bottom:
                0.2mm solid
                #e3ebe7;
            vertical-align: middle;
            font-size: 7.2px;
            line-height: 1.28;
            color: #30463e;
        }

        .documentos-tabela tbody tr:last-child td {
            border-bottom: 0;
        }

        .documento-row {
            break-inside: avoid;
            page-break-inside: avoid;
        }

        .documento-identidade {
            display: flex;
            flex-direction: column;
        }

        .documento-identidade strong {
            overflow-wrap: anywhere;
            font-size: 7.8px;
            line-height: 1.25;
            color: #17362c;
        }

        .documento-identidade span {
            margin-top: 0.6mm;
            font-size: 6.5px;
            font-weight: 650;
            color: #82918c;
        }

        .celula-central {
            text-align: center;
        }

        .badge {
            display: inline-flex;
            max-width: 100%;
            align-items: center;
            justify-content: center;
            padding: 1mm 1.8mm;
            border-radius: 8mm;
            font-size: 6.6px;
            font-weight: 800;
            line-height: 1.15;
            text-align: center;
            overflow-wrap: anywhere;
        }

        .badge--situacao {
            border:
                0.2mm solid
                #c2e6d8;
            background: #edf8f4;
            color: #0b7655;
        }

        .badge--conferencia {
            border:
                0.2mm solid
                #d9e4df;
            background: #f5f8f7;
            color: #41594f;
        }

        .evidencias-lista {
            display: grid;
            gap: 0.8mm;
            margin: 0;
            padding: 0;
            list-style: none;
        }

        .evidencia-item {
            min-width: 0;
            padding: 0.8mm 1.2mm;
            border:
                0.2mm solid
                #d5e8e0;
            border-radius: 1.5mm;
            background: #f5fbf8;
        }

        .evidencia-item strong,
        .evidencia-item span {
            display: block;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .evidencia-item strong {
            font-size: 6.5px;
            color: #1d493b;
        }

        .evidencia-item span {
            margin-top: 0.4mm;
            font-size: 5.8px;
            color: #75877f;
        }

        .rodape-relatorio {
            display: grid;
            grid-template-columns:
                1fr
                1fr
                1fr;
            align-items: center;
            border-top:
                0.25mm solid
                #dce6e2;
            font-size: 6.5px;
            font-weight: 650;
            color: #73847e;
        }

        .rodape-relatorio span:nth-child(2) {
            text-align: center;
        }

        .rodape-relatorio span:last-child {
            text-align: right;
        }

        /*
         * G6.4 — página única adaptativa.
         * Apenas espaçamentos são compactados.
         * O validador físico do PDF continua sendo a autoridade final.
         */
        .relatorio-root[data-total-paginas="1"]
            .pagina-relatorio {
            grid-template-rows:
                20mm
                minmax(0, 1fr)
                auto;
            gap: 2mm;
            padding:
                5.5mm
                7mm
                4mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .hero-relatorio__conteudo {
            gap: 4mm;
            padding:
                2.4mm
                4.5mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .conteudo-relatorio {
            gap: 1.5mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .contexto-principal {
            gap: 1.5mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .contexto-principal
            > div {
            padding:
                1.5mm
                2.2mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .contexto-label {
            margin-bottom: 0.55mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .resumo-selecao {
            gap: 1.5mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .resumo-selecao
            article {
            min-height: 10.8mm;
            padding:
                1.25mm
                2.1mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .resumo-selecao
            strong {
            font-size: 18px;
        }

        .relatorio-root[data-total-paginas="1"]
            .observacoes-documentais {
            grid-template-columns:
                40mm
                minmax(0, 1fr);
            gap: 1.5mm;
            padding:
                1.15mm
                2mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .documentos-tabela
            th {
            height: 6.2mm;
            padding:
                1.05mm
                1.6mm;
            font-size: 8.4px;
        }

        .relatorio-root[data-total-paginas="1"]
            .documentos-tabela
            td {
            padding:
                1.15mm
                1.6mm;
            font-size: 9.3px;
            line-height: 1.25;
        }

        .relatorio-root[data-total-paginas="1"]
            .documento-identidade
            strong {
            font-size: 10px;
            line-height: 1.2;
        }

        .relatorio-root[data-total-paginas="1"]
            .documento-identidade
            span {
            margin-top: 0.45mm;
            font-size: 8px;
            line-height: 1.2;
        }

        .relatorio-root[data-total-paginas="1"]
            .badge {
            padding:
                0.8mm
                1.5mm;
            font-size: 8.2px;
        }

        .relatorio-root[data-total-paginas="1"]
            .evidencias-lista {
            gap: 0.55mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .evidencia-item {
            padding:
                0.65mm
                1.1mm;
        }

        .relatorio-root[data-total-paginas="1"]
            .evidencia-item
            strong {
            font-size: 8px;
            line-height: 1.2;
        }

        .relatorio-root[data-total-paginas="1"]
            .evidencia-item
            span {
            margin-top: 0.3mm;
            font-size: 7.4px;
            line-height: 1.2;
        }

        /*
         * Continuação: não cortar empresa/obra com ellipsis.
         */
        .contexto-continuacao {
            display: grid;
            grid-template-columns:
                minmax(0, 1.05fr)
                minmax(0, 1.95fr);
            align-items: start;
            justify-content: stretch;
            gap: 2.5mm;
        }

        .contexto-continuacao span {
            overflow: visible;
            text-overflow: clip;
            white-space: normal;
            overflow-wrap: anywhere;
            line-height: 1.3;
        }

        @page {
            size: A4 landscape;
            margin: 0;
        }

        @media print {
            html,
            body {
                width: 297mm;
                min-height: auto;
                background: #ffffff;
            }

            .relatorio-root {
                display: block;
                padding: 0;
            }

            .pagina-relatorio {
                margin: 0;
                border-radius: 0;
                box-shadow: none;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
        }
    `;
}

export function montarHtmlRelatorioConsolidacaoColaborador({
    estruturaExportacao,
    heroUrl = "",
} = {}) {
    const {
        exportacao,
        documentos,
    } =
        validarEstruturaExportacao(
            estruturaExportacao
        );

    const paginasDocumentos =
        paginarDocumentos(
            documentos
        );

    const totalPaginas =
        paginasDocumentos
            .length;

    const paginasHtml =
        paginasDocumentos
            .map(
                (
                    documentosPagina,
                    indice
                ) =>
                    montarPagina({
                        estrutura:
                            estruturaExportacao,

                        exportacao,

                        documentos:
                            documentosPagina,

                        heroUrl,

                        indicePagina:
                            indice +
                            1,

                        totalPaginas,
                    })
            )
            .join(
                ""
            );

    return `
        <!doctype html>
        <html lang="pt-BR">
            <head>
                <meta charset="utf-8">

                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                >

                <title>
                    ${escaparHtml(
                        criarNomeArquivoResumoConsolidacaoColaborador(
                            estruturaExportacao
                        ).replace(
                            /\.pdf$/i,
                            ""
                        )
                    )}
                </title>

                <style>
                    ${montarCss()}

        /* ============================================================
           G9.2-R9C — ALINHAMENTO E DIVISÓRIAS
           ============================================================ */

        /*
         * Padrão visual aprovado:
         *
         * - Documento continua alinhado à esquerda;
         * - demais colunas centralizadas;
         * - valores centralizados verticalmente;
         * - divisórias verticais somente no corpo;
         * - divisórias não sobem pelo cabeçalho;
         * - divisórias não encostam nas linhas horizontais.
         */

        /* ============================================================
           CABEÇALHO
           ============================================================ */

        .documentos-tabela thead th:not(:first-child) {
            text-align: center !important;
            vertical-align: middle !important;
        }

        /* ============================================================
           CORPO — CENTRALIZAÇÃO
           ============================================================ */

        .documentos-tabela tbody td:not(:first-child) {
            position: relative;

            text-align: center !important;
            vertical-align: middle !important;
        }

        .documentos-tabela tbody td.celula-central {
            text-align: center !important;
            vertical-align: middle !important;
        }

        /* ============================================================
           CERTIFICADO / LISTA
           ============================================================ */

        .documentos-tabela tbody td:not(:first-child)
        > span,
        .documentos-tabela tbody td:not(:first-child)
        > div {
            margin-left: auto;
            margin-right: auto;
        }

        /* ============================================================
           DIVISÓRIAS VERTICAIS
           ============================================================ */

        /*
         * A linha é desenhada dentro de cada célula.
         *
         * top/bottom criam a folga visual:
         *
         *      ───────── linha horizontal
         *
         *          │
         *          │   divisória
         *          │
         *
         *      ───────── linha horizontal
         *
         * Dessa forma ela NÃO encosta no topo nem
         * atravessa o cabeçalho.
         */

        .documentos-tabela tbody td:not(:first-child)::before {
            content: "";

            position: absolute;

            top: 7px;
            bottom: 7px;
            left: 0;

            width: 1px;

            background:
                rgba(
                    76,
                    108,
                    98,
                    0.18
                );

            pointer-events: none;
        }

        /* ============================================================
           PRIMEIRA LINHA DO CORPO
           ============================================================ */

        /*
         * Mantém uma pequena distância da faixa do cabeçalho.
         */

        .documentos-tabela tbody tr:first-child
        td:not(:first-child)::before {
            top: 9px;
        }

        /* ============================================================
           ÚLTIMA LINHA
           ============================================================ */

        .documentos-tabela tbody tr:last-child
        td:not(:first-child)::before {
            bottom: 9px;
        }

        /* ============================================================
           IMPRESSÃO
           ============================================================ */

        @media print {

            .documentos-tabela thead
            th:not(:first-child),

            .documentos-tabela tbody
            td:not(:first-child) {
                text-align: center !important;
                vertical-align: middle !important;
            }

            .documentos-tabela tbody
            td:not(:first-child)::before {
                background:
                    rgba(
                        76,
                        108,
                        98,
                        0.20
                    ) !important;

                -webkit-print-color-adjust:
                    exact;

                print-color-adjust:
                    exact;
            }
        }

        /* ============================================================
           G9.2-R9D — CENTRALIZAÇÃO VERTICAL
           G9.2-R9E — CALIBRAÇÃO ÓPTICA
           ============================================================ */

        /*
         * Ajuste exclusivamente vertical.
         *
         * Preserva:
         * - alinhamento horizontal;
         * - divisórias R9C;
         * - colunas;
         * - ícones;
         * - cores;
         * - cabeçalho.
         */

        .documentos-tabela tbody td {
            vertical-align:
                middle !important;

            padding-top:
                3px !important;

            padding-bottom:
                11px !important;

            line-height:
                1.2 !important;
        }

        /*
         * Documento continua alinhado à esquerda.
         */

        .documentos-tabela tbody td:first-child {
            text-align:
                left !important;
        }

        /*
         * Demais informações continuam centralizadas.
         */

        .documentos-tabela tbody td:not(:first-child) {
            text-align:
                center !important;
        }

        /*
         * Mantém ícones/checks exatamente no centro da célula.
         */

        .documentos-tabela tbody td
        > span,
        .documentos-tabela tbody td
        > div {
            vertical-align:
                middle !important;
        }

        @media print {

            .documentos-tabela tbody td {
                vertical-align:
                    middle !important;

                padding-top:
                3px !important;

                padding-bottom:
                11px !important;

                line-height:
                    1.2 !important;
            }
        }

        /* ============================================================
           G9.2-R9F — SUBIR CONTEÚDO E TICK
           ============================================================ */

        /*
         * A calibração da célula desloca os textos.
         *
         * Os indicadores verdes são elementos inline-flex próprios
         * e recebem correção óptica explícita.
         *
         * Coluna 6 = CERTIFICADO
         * Coluna 7 = LISTA
         */

        .documentos-tabela tbody
        td:nth-child(6)
        > span,

        .documentos-tabela tbody
        td:nth-child(7)
        > span {
            transform:
                none !important;
        }

        @media print {

            .documentos-tabela tbody
            td:nth-child(6)
            > span,

            .documentos-tabela tbody
            td:nth-child(7)
            > span {
                transform:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R9G — CHECK BRANCO CENTRALIZADO
           ============================================================ */

        /*
         * O quadrado verde permanece parado.
         *
         * A marca branca original é ocultada visualmente
         * e redesenhada no centro geométrico do quadrado.
         */

        .documentos-tabela tbody
        td:nth-child(6)
        > span
        > span:first-child,

        .documentos-tabela tbody
        td:nth-child(7)
        > span
        > span:first-child {
            position:
                relative;

            font-size:
                0 !important;
        }

        .documentos-tabela tbody
        td:nth-child(6)
        > span
        > span:first-child::before,

        .documentos-tabela tbody
        td:nth-child(7)
        > span
        > span:first-child::before {
            content:
                "";

            display:
                block;

            width:
                4px;

            height:
                8px;

            box-sizing:
                border-box;

            border-right:
                2px solid #ffffff;

            border-bottom:
                2px solid #ffffff;

            transform:
                translateY(-1px)
                rotate(45deg);

            transform-origin:
                center;
        }

        @media print {

            .documentos-tabela tbody
            td:nth-child(6)
            > span
            > span:first-child,

            .documentos-tabela tbody
            td:nth-child(7)
            > span
            > span:first-child {
                font-size:
                    0 !important;
            }

            .documentos-tabela tbody
            td:nth-child(6)
            > span
            > span:first-child::before,

            .documentos-tabela tbody
            td:nth-child(7)
            > span
            > span:first-child::before {
                border-right:
                    2px solid #ffffff;

                border-bottom:
                    2px solid #ffffff;
            }
        }

        /* ============================================================
           G9.2-R9H — DESCIDA FINA DO INDICADOR
           ============================================================ */

        /*
         * Ajuste fino:
         * - desce apenas o quadrado verde 2 px;
         * - mantém o check branco centralizado pelo R9G;
         * - não altera textos, divisórias ou colunas.
         */

        .documentos-tabela tbody
        td:nth-child(6)
        > span,

        .documentos-tabela tbody
        td:nth-child(7)
        > span {
            transform:
                translateY(2px) !important;
        }

        @media print {

            .documentos-tabela tbody
            td:nth-child(6)
            > span,

            .documentos-tabela tbody
            td:nth-child(7)
            > span {
                transform:
                    translateY(2px) !important;
            }
        }

        /* ============================================================
           G9.2-R9L — INDICADORES ORGANIZADOS
           ============================================================ */

        /*
         * Organização visual:
         *
         * RÓTULO                         VALOR
         * detalhe                        VALOR
         *
         * O número ocupa as duas linhas à direita,
         * centralizado verticalmente.
         *
         * Não altera nenhum valor funcional.
         */

        .resumo-selecao {
            display:
                grid !important;

            grid-template-columns:
                repeat(
                    4,
                    minmax(0, 1fr)
                ) !important;

            gap:
                2mm !important;

            align-items:
                stretch !important;
        }

        /* ============================================================
           CARD
           ============================================================ */

        .resumo-selecao > article {
            min-width:
                0;

            min-height:
                11mm !important;

            box-sizing:
                border-box;

            display:
                grid !important;

            grid-template-columns:
                minmax(0, 1fr)
                auto !important;

            grid-template-rows:
                auto
                auto !important;

            column-gap:
                2.4mm !important;

            row-gap:
                0.35mm !important;

            align-content:
                center !important;

            align-items:
                center !important;

            padding:
                1.7mm
                2.4mm !important;
        }

        /* ============================================================
           RÓTULO
           ============================================================ */

        .resumo-selecao > article > span {
            grid-column:
                1;

            grid-row:
                1;

            align-self:
                end !important;

            justify-self:
                start !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1.05 !important;

            white-space:
                nowrap;
        }

        /* ============================================================
           DETALHE
           ============================================================ */

        .resumo-selecao > article > small {
            grid-column:
                1;

            grid-row:
                2;

            align-self:
                start !important;

            justify-self:
                start !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1.1 !important;

            white-space:
                nowrap;
        }

        /* ============================================================
           NÚMERO
           ============================================================ */

        .resumo-selecao > article > strong {
            grid-column:
                2;

            grid-row:
                1 / 3;

            align-self:
                center !important;

            justify-self:
                end !important;

            display:
                flex;

            align-items:
                center;

            justify-content:
                center;

            min-width:
                7mm;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1 !important;

            text-align:
                center !important;
        }

        /* ============================================================
           IMPRESSÃO
           ============================================================ */

        @media print {

            .resumo-selecao {
                grid-template-columns:
                    repeat(
                        4,
                        minmax(0, 1fr)
                    ) !important;

                gap:
                    2mm !important;
            }

            .resumo-selecao > article {
                min-height:
                    11mm !important;

                padding:
                    1.7mm
                    2.4mm !important;
            }
        }

        /* ============================================================
           G9.2-R9N.1 — ATENÇÕES NA REGIÃO DE RODAPÉ
           ============================================================ */

        /*
         * O conjunto inteiro ocupa a região inferior da página.
         * A tabela deixa de ter o bloco amarelo acima dela.
         */

        .rodape-relatorio-bloco {
            width:
                100%;

            margin-top:
                auto;

            display:
                flex;

            flex-direction:
                column;

            gap:
                1mm;

            box-sizing:
                border-box;
        }

        .rodape-relatorio-bloco
        .observacoes-documentais {
            margin:
                0 !important;

            flex:
                0 0 auto;
        }

        .rodape-relatorio-bloco
        .rodape-relatorio {
            margin-top:
                0 !important;

            flex:
                0 0 auto;
        }

        @media print {

            .rodape-relatorio-bloco {
                margin-top:
                    auto;

                gap:
                    1mm;
            }

            .rodape-relatorio-bloco
            .observacoes-documentais {
                margin:
                    0 !important;
            }
        }

        /* ============================================================
           G9.2-R9N.3-R3 — PÁGINA ÚNICA COM RODAPÉ AUTO
           ============================================================ */

        /*
         * Página única:
         * hero | conteúdo flexível | Atenções + rodapé em auto.
         *
         * Continuações preservam o rodapé convencional.
         */

        /* ============================================================
           G9.2-R9O — BLOCO VISUAL DE ATENÇÕES DOCUMENTAIS
           ============================================================ */

        .observacoes-documentais {
            display:
                grid;
            grid-template-columns:
                42mm
                minmax(0, 1fr);
            align-items:
                center;
            gap:
                2.4mm;
            padding:
                2mm
                3mm;
            border:
                0.35mm solid #e4c58d;
            border-radius:
                2.2mm;
            background:
                #fffaf2;
            box-sizing:
                border-box;
        }

        .observacoes-documentais__cabecalho {
            display:
                flex;
            flex-direction:
                column;
            justify-content:
                center;
            align-items:
                flex-start;
            gap:
                0.6mm;
            min-width:
                0;
        }

        .observacoes-documentais__titulo {
            font-size:
                8.2px;
            font-weight:
                700;
            line-height:
                1.15;
            color:
                #9a6a16;
            text-transform:
                none;
        }

        .observacoes-documentais__contador {
            display:
                inline-flex;
            align-items:
                center;
            justify-content:
                center;
            padding:
                0.6mm
                1.4mm;
            border-radius:
                999px;
            background:
                #fff1d8;
            color:
                #8d6216;
            font-size:
                7.1px;
            font-weight:
                700;
            line-height:
                1;
            white-space:
                nowrap;
        }

        .observacoes-documentais__lista {
            display:
                flex;
            flex-direction:
                column;
            justify-content:
                center;
            gap:
                0;
            min-width:
                0;
        }

        .observacoes-documentais__item {
            display:
                grid;
            grid-template-columns:
                1.8mm
                46mm
                14mm
                1fr;
            align-items:
                center;
            justify-content:
                start;
            column-gap:
                1.4mm;
            row-gap:
                0;
            min-width:
                0;
            padding:
                0.9mm
                0;
        }

        .observacoes-documentais__item + .observacoes-documentais__item {
            border-top:
                0.28mm solid rgba(154, 106, 22, 0.26);
        }

        .observacoes-documentais__ponto {
            width:
                1.1mm;
            height:
                1.1mm;
            border-radius:
                999px;
            background:
                #d19a32;
            display:
                inline-block;
        }

        .observacoes-documentais__conteudo {
            display:
                flex;
            flex-direction:
                column;
            justify-content:
                center;
            align-self:
                center;
            gap:
                0.25mm;
            min-width:
                0;
        }

        .observacoes-documentais__documento {
            font-size:
                7.2px;
            line-height:
                1.15;
            font-weight:
                700;
            color:
                #6d541f;
            overflow-wrap:
                anywhere;
        }

        .observacoes-documentais__detalhe {
            font-size:
                6.8px;
            line-height:
                1.15;
            color:
                #8a6a39;
            overflow-wrap:
                anywhere;
        }

        .observacoes-documentais__estado {
            display:
                block;
            width:
                14mm;
            margin:
                0;
            padding:
                0;
            border:
                0;
            border-radius:
                0;
            background:
                transparent;
            font-size:
                6.9px;
            line-height:
                1.1;
            font-weight:
                700;
            text-align:
                left;
            text-transform:
                capitalize;
            white-space:
                nowrap;
            justify-self:
                start;
            align-self:
                center;
        }

        .observacoes-documentais__estado--atencao,
        .observacoes-documentais__estado--atencao-documental {
            color:
                #946315;
        }

        .observacoes-documentais__estado--suspeito {
            color:
                #a33e33;
        }

        .observacoes-documentais__estado--revisar {
            color:
                #6d56b7;
        }

        @media print {
            .observacoes-documentais {
                grid-template-columns:
                    42mm
                    minmax(0, 1fr);
                gap:
                    2.2mm;
                padding:
                    2mm
                    3mm;
            }

            .observacoes-documentais__lista {
                gap:
                    0.7mm;
            }

            .observacoes-documentais__item {
                padding:
                    0.6mm
                    0;
            }
        }

        /* ============================================================
           G9.2-R9O.2 — STATUS TEXTUAL SEM BALÕES
           ============================================================ */

        /* ============================================================
           G9.2-R9O.3 — STATUS SIMPLES À DIREITA
           ============================================================ */

        /* ============================================================
           G9.2-R9O.4 — STATUS MAIS PRÓXIMO
           Aproxima o status do conteúdo e preserva área livre à direita.
           ============================================================ */

        /* ============================================================
           G9.2-R9O.5 — AJUSTE FINO DE PROXIMIDADE
           Status mais próximo, alinhamento vertical refinado
           e linha de separação mais perceptível.
           ============================================================ */

        /* ============================================================
           G9.2-R9O.6 — LAYOUT COMPACTO DAS ATENÇÕES
           ============================================================ */

        /*
         * Mudança visual explícita:
         *
         * ponto | documento | status | espaço futuro
         *
         * Status alinhado à linha principal do documento.
         * Divisor vertical separa documento de status.
         */

        .observacoes-documentais
        .observacoes-documentais__item {
            display:
                grid !important;

            grid-template-columns:
                1.8mm
                38mm
                13mm
                minmax(0, 1fr) !important;

            column-gap:
                1mm !important;

            row-gap:
                0 !important;

            align-items:
                start !important;

            justify-content:
                start !important;

            padding:
                1mm
                0 !important;
        }

        /* ============================================================
           DOCUMENTO
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__conteudo {
            grid-column:
                2 !important;

            align-self:
                start !important;

            justify-self:
                stretch !important;

            gap:
                0.15mm !important;

            margin:
                0 !important;
        }

        .observacoes-documentais
        .observacoes-documentais__documento {
            line-height:
                1.05 !important;

            margin:
                0 !important;
        }

        .observacoes-documentais
        .observacoes-documentais__detalhe {
            line-height:
                1.05 !important;

            margin:
                0.15mm
                0
                0 !important;
        }

        /* ============================================================
           PONTO
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__ponto {
            grid-column:
                1 !important;

            align-self:
                start !important;

            margin-top:
                0.7mm !important;
        }

        /* ============================================================
           STATUS
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__estado {
            grid-column:
                3 !important;

            align-self:
                start !important;

            justify-self:
                start !important;

            width:
                13mm !important;

            min-width:
                0 !important;

            margin:
                0 !important;

            padding:
                0
                0
                0
                2mm !important;

            border:
                0 !important;

            border-left:
                0.28mm solid rgba(
                    154,
                    106,
                    22,
                    0.30
                ) !important;

            border-radius:
                0 !important;

            background:
                transparent !important;

            line-height:
                1.05 !important;

            text-align:
                left !important;
        }

        /* ============================================================
           LINHA ENTRE REGISTROS
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__item
        + .observacoes-documentais__item {
            border-top:
                0.30mm solid rgba(
                    154,
                    106,
                    22,
                    0.28
                ) !important;
        }

        /* ============================================================
           LISTA
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__lista {
            gap:
                0 !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__item {
                grid-template-columns:
                    1.8mm
                    38mm
                    13mm
                    minmax(0, 1fr) !important;

                column-gap:
                    1mm !important;

                padding:
                    1mm
                    0 !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado {
                padding-left:
                    2mm !important;

                border-left:
                    0.28mm solid rgba(
                        154,
                        106,
                        22,
                        0.30
                    ) !important;
            }
        }

        /* ============================================================
           G9.2-R9O.7 — GEOMETRIA LATERAL DAS ATENÇÕES
           ============================================================ */

        /*
         * Objetivo:
         * - manter o cabeçalho das atenções na coluna esquerda;
         * - deslocar a lista inteira para a direita;
         * - aproximar o status do conteúdo;
         * - deixar área livre à direita;
         * - reforçar a separação visual entre linhas.
         */

        .observacoes-documentais {
            display:
                grid !important;
            grid-template-columns:
                26mm
                minmax(0, 1fr) !important;
            align-items:
                start !important;
            column-gap:
                4mm !important;
            row-gap:
                0 !important;
            padding:
                2mm
                3mm !important;
        }

        .observacoes-documentais__cabecalho {
            grid-column:
                1 !important;
            align-self:
                start !important;
            justify-self:
                start !important;
            display:
                flex !important;
            flex-direction:
                column !important;
            align-items:
                flex-start !important;
            justify-content:
                flex-start !important;
            gap:
                0.7mm !important;
            padding-top:
                1mm !important;
            margin:
                0 !important;
        }

        .observacoes-documentais__lista {
            grid-column:
                2 !important;
            align-self:
                start !important;
            justify-self:
                stretch !important;
            width:
                100% !important;
            min-width:
                0 !important;
            margin:
                0 !important;
            display:
                flex !important;
            flex-direction:
                column !important;
            gap:
                0 !important;
        }

        .observacoes-documentais__item {
            display:
                grid !important;
            grid-template-columns:
                1.8mm
                minmax(0, 44mm)
                14mm
                minmax(0, 1fr) !important;
            align-items:
                start !important;
            justify-content:
                start !important;
            column-gap:
                1.2mm !important;
            row-gap:
                0 !important;
            min-width:
                0 !important;
            padding:
                1mm
                0 !important;
        }

        .observacoes-documentais__item + .observacoes-documentais__item {
            border-top:
                0.30mm solid rgba(154, 106, 22, 0.28) !important;
        }

        .observacoes-documentais__ponto {
            grid-column:
                1 !important;
            align-self:
                start !important;
            justify-self:
                center !important;
            margin-top:
                0.7mm !important;
        }

        .observacoes-documentais__conteudo {
            grid-column:
                2 !important;
            align-self:
                start !important;
            justify-self:
                stretch !important;
            display:
                flex !important;
            flex-direction:
                column !important;
            justify-content:
                flex-start !important;
            gap:
                0.15mm !important;
            min-width:
                0 !important;
            margin:
                0 !important;
        }

        .observacoes-documentais__documento {
            line-height:
                1.05 !important;
            margin:
                0 !important;
        }

        .observacoes-documentais__detalhe {
            line-height:
                1.05 !important;
            margin:
                0.15mm
                0
                0 !important;
        }

        .observacoes-documentais__estado {
            grid-column:
                3 !important;
            align-self:
                start !important;
            justify-self:
                start !important;
            width:
                14mm !important;
            min-width:
                0 !important;
            margin:
                0 !important;
            padding:
                0
                0
                0
                1.8mm !important;
            border:
                0 !important;
            border-left:
                0.28mm solid rgba(154, 106, 22, 0.30) !important;
            border-radius:
                0 !important;
            background:
                transparent !important;
            font-size:
                6.9px !important;
            line-height:
                1.05 !important;
            font-weight:
                700 !important;
            text-align:
                left !important;
            text-transform:
                capitalize !important;
            white-space:
                nowrap !important;
        }

        @media print {
            .observacoes-documentais {
                grid-template-columns:
                    26mm
                    minmax(0, 1fr) !important;
                column-gap:
                    4mm !important;
            }

            .observacoes-documentais__item {
                grid-template-columns:
                    1.8mm
                    minmax(0, 44mm)
                    14mm
                    minmax(0, 1fr) !important;
                column-gap:
                    1.2mm !important;
                padding:
                    1mm
                    0 !important;
            }

            .observacoes-documentais__estado {
                width:
                    14mm !important;
                padding-left:
                    1.8mm !important;
                border-left:
                    0.28mm solid rgba(154, 106, 22, 0.30) !important;
            }
        }

        /* ============================================================
           G9.2-R9O.8 — GRADE HORIZONTAL DE ATENÇÕES
           ============================================================ */

        /*
         * Correção estrutural:
         *
         * O problema anterior estava na LISTA externa:
         * ela continuava flex-direction: column.
         *
         * Agora:
         *
         * Cabeçalho | atenção 1 | atenção 2 | atenção 3 | atenção 4
         *           | atenção 5 | atenção 6 | atenção 7 | atenção 8
         *           | ...
         *
         * Para 14 registros:
         * 4 + 4 + 4 + 2.
         */

        .observacoes-documentais {
            display:
                grid !important;

            grid-template-columns:
                27mm
                minmax(0, 1fr) !important;

            column-gap:
                3mm !important;

            align-items:
                stretch !important;

            padding:
                2mm
                3mm !important;
        }

        /* ============================================================
           CABEÇALHO LATERAL
           ============================================================ */

        .observacoes-documentais__cabecalho {
            grid-column:
                1 !important;

            display:
                flex !important;

            flex-direction:
                column !important;

            align-items:
                flex-start !important;

            justify-content:
                center !important;

            align-self:
                stretch !important;

            gap:
                0.7mm !important;

            margin:
                0 !important;

            padding:
                0
                1.5mm
                0
                0 !important;
        }

        /* ============================================================
           LISTA — AQUI ESTÁ A MUDANÇA PRINCIPAL
           ============================================================ */

        .observacoes-documentais__lista {
            grid-column:
                2 !important;

            display:
                grid !important;

            grid-template-columns:
                repeat(
                    4,
                    minmax(0, 1fr)
                ) !important;

            grid-auto-flow:
                row !important;

            align-items:
                stretch !important;

            justify-items:
                stretch !important;

            column-gap:
                0 !important;

            row-gap:
                0 !important;

            width:
                100% !important;

            min-width:
                0 !important;

            margin:
                0 !important;
        }

        /* ============================================================
           CADA ATENÇÃO
           ============================================================ */

        .observacoes-documentais__item {
            display:
                grid !important;

            grid-template-columns:
                1.6mm
                minmax(0, 1fr)
                12mm !important;

            column-gap:
                1mm !important;

            row-gap:
                0 !important;

            align-items:
                start !important;

            min-width:
                0 !important;

            min-height:
                8.5mm !important;

            box-sizing:
                border-box !important;

            padding:
                1mm
                2mm !important;

            border-top:
                0 !important;

            border-bottom:
                0.24mm solid rgba(
                    154,
                    106,
                    22,
                    0.24
                ) !important;
        }

        /* ============================================================
           DIVISORES VERTICAIS ENTRE AS 4 COLUNAS
           ============================================================ */

        .observacoes-documentais__item:nth-child(4n + 2),
        .observacoes-documentais__item:nth-child(4n + 3),
        .observacoes-documentais__item:nth-child(4n + 4) {
            border-left:
                0.24mm solid rgba(
                    154,
                    106,
                    22,
                    0.24
                ) !important;
        }

        /* ============================================================
           PONTO
           ============================================================ */

        .observacoes-documentais__ponto {
            grid-column:
                1 !important;

            align-self:
                start !important;

            justify-self:
                center !important;

            margin-top:
                0.7mm !important;
        }

        /* ============================================================
           CONTEÚDO
           ============================================================ */

        .observacoes-documentais__conteudo {
            grid-column:
                2 !important;

            display:
                flex !important;

            flex-direction:
                column !important;

            align-items:
                flex-start !important;

            justify-content:
                flex-start !important;

            align-self:
                start !important;

            gap:
                0.25mm !important;

            min-width:
                0 !important;

            margin:
                0 !important;
        }

        .observacoes-documentais__documento {
            display:
                block !important;

            margin:
                0 !important;

            font-size:
                6.7px !important;

            line-height:
                1.08 !important;

            font-weight:
                700 !important;

            overflow-wrap:
                anywhere !important;
        }

        .observacoes-documentais__detalhe {
            display:
                block !important;

            margin:
                0 !important;

            font-size:
                6.2px !important;

            line-height:
                1.08 !important;

            overflow-wrap:
                anywhere !important;
        }

        /* ============================================================
           STATUS
           ============================================================ */

        .observacoes-documentais__estado {
            grid-column:
                3 !important;

            align-self:
                start !important;

            justify-self:
                end !important;

            width:
                12mm !important;

            min-width:
                0 !important;

            margin:
                0 !important;

            padding:
                0
                0
                0
                1.3mm !important;

            border:
                0 !important;

            border-left:
                0.22mm solid rgba(
                    154,
                    106,
                    22,
                    0.28
                ) !important;

            border-radius:
                0 !important;

            background:
                transparent !important;

            font-size:
                6.4px !important;

            font-weight:
                700 !important;

            line-height:
                1.08 !important;

            text-align:
                left !important;

            white-space:
                nowrap !important;
        }

        /* ============================================================
           IMPRESSÃO
           ============================================================ */

        @media print {

            .observacoes-documentais {
                grid-template-columns:
                    27mm
                    minmax(0, 1fr) !important;

                column-gap:
                    3mm !important;
            }

            .observacoes-documentais__lista {
                grid-template-columns:
                    repeat(
                        4,
                        minmax(0, 1fr)
                    ) !important;
            }

            .observacoes-documentais__item {
                grid-template-columns:
                    1.6mm
                    minmax(0, 1fr)
                    12mm !important;

                min-height:
                    8.5mm !important;

                padding:
                    1mm
                    2mm !important;
            }
        }

        /* ============================================================
           G9.2-R9O.9 — CABEÇALHO LATERAL NO TOPO
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__cabecalho {
            align-self:
                stretch !important;

            justify-content:
                flex-start !important;

            align-items:
                flex-start !important;

            padding:
                1.2mm
                1.5mm
                5mm
                0 !important;

            margin:
                0 !important;
        }

        .observacoes-documentais
        .observacoes-documentais__titulo {
            margin:
                0 !important;

            line-height:
                1.05 !important;
        }

        .observacoes-documentais
        .observacoes-documentais__contador {
            margin-top:
                0.7mm !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__cabecalho {
                justify-content:
                    flex-start !important;

                padding:
                    1.2mm
                    1.5mm
                    5mm
                    0 !important;
            }
        }

        /* ============================================================
           G9.2-R9O.10 — TITULO EXTERNO DAS ATENCOES
           ============================================================ */

        .observacoes-documentais-bloco {
            display:
                block !important;
            margin:
                0 !important;
            padding:
                0 !important;
        }

        .observacoes-documentais__topo {
            display:
                flex !important;
            flex-wrap:
                wrap !important;
            align-items:
                baseline !important;
            justify-content:
                flex-start !important;
            gap:
                1mm !important;
            margin:
                0 0 1.4mm 0 !important;
            padding:
                0 0 0 0.6mm !important;
        }

        .observacoes-documentais__topo-titulo {
            display:
                inline !important;
            margin:
                0 !important;
            padding:
                0 !important;
            font-size:
                8px !important;
            line-height:
                1.05 !important;
            font-weight:
                700 !important;
            color:
                #9a6a16 !important;
        }

        .observacoes-documentais__topo-separador {
            display:
                inline !important;
            margin:
                0 !important;
            padding:
                0 !important;
            font-size:
                7.6px !important;
            line-height:
                1 !important;
            font-weight:
                700 !important;
            color:
                #b58838 !important;
        }

        .observacoes-documentais__topo-contador {
            display:
                inline !important;
            margin:
                0 !important;
            padding:
                0 !important;
            border:
                0 !important;
            border-radius:
                0 !important;
            background:
                transparent !important;
            font-size:
                7.6px !important;
            line-height:
                1.05 !important;
            font-weight:
                700 !important;
            color:
                #9a6a16 !important;
            white-space:
                nowrap !important;
        }

        /* esconde o cabeçalho antigo caso ainda exista em algum render */
        .observacoes-documentais__cabecalho {
            display:
                none !important;
        }

        .observacoes-documentais {
            display:
                block !important;
            margin:
                0 !important;
            padding:
                0 !important;
            border:
                0.35mm solid #e4c58d !important;
            border-radius:
                2.2mm !important;
            background:
                #fffaf2 !important;
            box-sizing:
                border-box !important;
            overflow:
                hidden !important;
        }

        .observacoes-documentais__lista {
            display:
                grid !important;
            grid-template-columns:
                repeat(4, minmax(0, 1fr)) !important;
            grid-auto-flow:
                row !important;
            column-gap:
                0 !important;
            row-gap:
                0 !important;
            width:
                100% !important;
            min-width:
                0 !important;
            margin:
                0 !important;
            padding:
                0 !important;
        }

        .observacoes-documentais__item {
            display:
                grid !important;
            grid-template-columns:
                1.6mm
                minmax(0, 1fr)
                12mm !important;
            column-gap:
                1mm !important;
            row-gap:
                0 !important;
            align-items:
                start !important;
            min-width:
                0 !important;
            min-height:
                8.8mm !important;
            box-sizing:
                border-box !important;
            padding:
                1.1mm 2mm !important;
            border-top:
                0 !important;
            border-bottom:
                0.24mm solid rgba(154, 106, 22, 0.24) !important;
        }

        .observacoes-documentais__item:nth-child(4n + 2),
        .observacoes-documentais__item:nth-child(4n + 3),
        .observacoes-documentais__item:nth-child(4n + 4) {
            border-left:
                0.24mm solid rgba(154, 106, 22, 0.24) !important;
        }

        .observacoes-documentais__ponto {
            grid-column:
                1 !important;
            align-self:
                start !important;
            justify-self:
                center !important;
            margin-top:
                0.7mm !important;
        }

        .observacoes-documentais__conteudo {
            grid-column:
                2 !important;
            display:
                flex !important;
            flex-direction:
                column !important;
            align-items:
                flex-start !important;
            justify-content:
                flex-start !important;
            align-self:
                start !important;
            gap:
                0.25mm !important;
            min-width:
                0 !important;
            margin:
                0 !important;
        }

        .observacoes-documentais__documento {
            display:
                block !important;
            margin:
                0 !important;
            font-size:
                6.7px !important;
            line-height:
                1.08 !important;
            font-weight:
                700 !important;
            overflow-wrap:
                anywhere !important;
        }

        .observacoes-documentais__detalhe {
            display:
                block !important;
            margin:
                0 !important;
            font-size:
                6.2px !important;
            line-height:
                1.08 !important;
            overflow-wrap:
                anywhere !important;
        }

        .observacoes-documentais__estado {
            grid-column:
                3 !important;
            align-self:
                start !important;
            justify-self:
                end !important;
            width:
                12mm !important;
            min-width:
                0 !important;
            margin:
                0 !important;
            padding:
                0 0 0 1.3mm !important;
            border:
                0 !important;
            border-left:
                0.22mm solid rgba(154, 106, 22, 0.28) !important;
            border-radius:
                0 !important;
            background:
                transparent !important;
            font-size:
                6.4px !important;
            font-weight:
                700 !important;
            line-height:
                1.08 !important;
            text-align:
                left !important;
            white-space:
                nowrap !important;
        }

        @media print {
            .observacoes-documentais__topo {
                margin:
                    0 0 1.4mm 0 !important;
                padding:
                    0 0 0 0.6mm !important;
            }

            .observacoes-documentais__lista {
                grid-template-columns:
                    repeat(4, minmax(0, 1fr)) !important;
            }

            .observacoes-documentais__item {
                grid-template-columns:
                    1.6mm
                    minmax(0, 1fr)
                    12mm !important;
                min-height:
                    8.8mm !important;
                padding:
                    1.1mm 2mm !important;
            }
        }

        /* ============================================================
           G9.2-R9O.10.1 — BOLINHA E DIVISOR
           ============================================================ */

        /* mantém tudo como está e corrige só:
           1) posição da bolinha
           2) linha vertical perdida
        */

        .observacoes-documentais__item {
            position:
                relative !important;
            overflow:
                hidden !important;
            align-items:
                center !important;
        }

        .observacoes-documentais__ponto {
            align-self:
                center !important;
            justify-self:
                center !important;
            margin:
                0 0 0 0.45mm !important;
            transform:
                translateY(-0.1mm) !important;
        }

        .observacoes-documentais__conteudo {
            align-self:
                center !important;
        }

        .observacoes-documentais__estado {
            position:
                relative !important;
            align-self:
                center !important;
            justify-self:
                start !important;
            border-left:
                0 !important;
            padding-left:
                1.35mm !important;
            margin-left:
                0.2mm !important;
        }

        .observacoes-documentais__estado::before {
            content:
                "" !important;
            position:
                absolute !important;
            left:
                0 !important;
            top:
                18% !important;
            bottom:
                18% !important;
            width:
                0.18mm !important;
            background:
                rgba(154, 106, 22, 0.14) !important;
        }

        /* remove qualquer linha vertical antiga sobrando */
        .observacoes-documentais__item:nth-child(4n + 2),
        .observacoes-documentais__item:nth-child(4n + 3),
        .observacoes-documentais__item:nth-child(4n + 4) {
            border-left:
                0 !important;
        }

        @media print {
            .observacoes-documentais__item {
                align-items:
                    center !important;
                overflow:
                    hidden !important;
            }

            .observacoes-documentais__ponto {
                margin-left:
                    0.45mm !important;
            }

            .observacoes-documentais__estado {
                border-left:
                    0 !important;
                padding-left:
                    1.35mm !important;
                margin-left:
                    0.2mm !important;
            }

            .observacoes-documentais__estado::before {
                top:
                    18% !important;
                bottom:
                    18% !important;
            }
        }

        /* ============================================================
           G9.2-R9O.10.2 — AJUSTE REAL DA BOLINHA
           Somente posição da bolinha + remoção total do divisor interno.
           ============================================================ */

        /*
         * Dá espaço real para a bolinha ficar dentro da célula.
         */
        .observacoes-documentais
        .observacoes-documentais__item {
            grid-template-columns:
                4mm
                minmax(0, 1fr)
                11mm !important;

            padding-left:
                1.4mm !important;

            align-items:
                start !important;
        }

        /*
         * Bolinha alinhada ao título e afastada da borda.
         */
        .observacoes-documentais
        .observacoes-documentais__ponto {
            width:
                1.1mm !important;

            height:
                1.1mm !important;

            margin:
                0.65mm
                0
                0
                0 !important;

            transform:
                none !important;

            justify-self:
                center !important;

            align-self:
                start !important;
        }

        /*
         * Remove de verdade a linha anterior ao status.
         */
        .observacoes-documentais
        .observacoes-documentais__estado {
            border-left:
                0 !important;

            padding-left:
                0 !important;

            margin-left:
                0.8mm !important;
        }

        /*
         * O ajuste anterior recriou a linha por pseudo-elemento.
         * Agora ela é eliminada completamente.
         */
        .observacoes-documentais
        .observacoes-documentais__estado::before {
            content:
                none !important;

            display:
                none !important;

            width:
                0 !important;

            background:
                none !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__item {
                grid-template-columns:
                    4mm
                    minmax(0, 1fr)
                    11mm !important;

                padding-left:
                    1.4mm !important;
            }

            .observacoes-documentais
            .observacoes-documentais__ponto {
                margin-top:
                    0.65mm !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado {
                border-left:
                    0 !important;

                padding-left:
                    0 !important;

                margin-left:
                    0.8mm !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado::before {
                content:
                    none !important;

                display:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R9O.10.3 — BORDA EXTERNA ÚNICA
           ============================================================ */

        /*
         * Somente o container desenha o perímetro externo.
         * Os itens desenham apenas separadores internos.
         */

        .observacoes-documentais-bloco {
            border:
                0 !important;

            outline:
                0 !important;

            box-shadow:
                none !important;
        }

        .observacoes-documentais {
            border:
                0.28mm solid rgba(190, 139, 48, 0.55) !important;

            outline:
                0 !important;

            box-shadow:
                none !important;
        }

        /*
         * Zera todas as bordas herdadas dos itens.
         */
        .observacoes-documentais__item,
        .observacoes-documentais__item + .observacoes-documentais__item,
        .observacoes-documentais__item:nth-child(4n + 2),
        .observacoes-documentais__item:nth-child(4n + 3),
        .observacoes-documentais__item:nth-child(4n + 4) {
            border:
                0 !important;
        }

        /*
         * Linhas horizontais somente ENTRE as linhas da grade.
         * A primeira linha não recebe borda superior.
         */
        .observacoes-documentais__item:nth-child(n + 5) {
            border-top:
                0.18mm solid rgba(154, 106, 22, 0.14) !important;
        }

        /*
         * Linhas verticais somente ENTRE as quatro colunas.
         * A primeira coluna não recebe borda esquerda.
         */
        .observacoes-documentais__item:not(:nth-child(4n + 1)) {
            border-left:
                0.18mm solid rgba(154, 106, 22, 0.14) !important;
        }

        /*
         * Garante que nenhum divisor residual apareça junto do status.
         */
        .observacoes-documentais__estado {
            border:
                0 !important;

            border-left:
                0 !important;
        }

        .observacoes-documentais__estado::before {
            content:
                none !important;

            display:
                none !important;
        }

        @media print {

            .observacoes-documentais {
                border:
                    0.28mm solid rgba(190, 139, 48, 0.55) !important;
            }

            .observacoes-documentais__item:nth-child(n + 5) {
                border-top:
                    0.18mm solid rgba(154, 106, 22, 0.14) !important;
            }

            .observacoes-documentais__item:not(:nth-child(4n + 1)) {
                border-left:
                    0.18mm solid rgba(154, 106, 22, 0.14) !important;
            }
        }

        /* ============================================================
           G9.2-R9O.12 — SEPARADORES POR GAP
           Uma única origem visual para todas as divisórias.
           ============================================================ */

        /* ------------------------------------------------------------
           BLOCO EXTERNO
           ------------------------------------------------------------ */

        .observacoes-documentais-bloco {
            border:
                0 !important;

            outline:
                0 !important;

            box-shadow:
                none !important;

            background:
                transparent !important;
        }

        .observacoes-documentais {
            border:
                0.24mm solid rgba(
                    190,
                    139,
                    48,
                    0.48
                ) !important;

            outline:
                0 !important;

            box-shadow:
                none !important;

            background:
                #e8d8ba !important;

            overflow:
                hidden !important;
        }

        /* ------------------------------------------------------------
           GRADE

           O fundo da grade aparece somente no gap.
           Isso cria UMA única linha entre duas células.
           ------------------------------------------------------------ */

        .observacoes-documentais
        .observacoes-documentais__lista {
            display:
                grid !important;

            grid-template-columns:
                repeat(
                    4,
                    minmax(0, 1fr)
                ) !important;

            gap:
                0.18mm !important;

            margin:
                0 !important;

            padding:
                0 !important;

            background:
                rgba(
                    154,
                    106,
                    22,
                    0.15
                ) !important;

            background-image:
                none !important;

            border:
                0 !important;

            outline:
                0 !important;
        }

        /* ------------------------------------------------------------
           ITEM

           Nenhuma borda individual.
           ------------------------------------------------------------ */

        .observacoes-documentais
        .observacoes-documentais__item,
        .observacoes-documentais
        .observacoes-documentais__item
        + .observacoes-documentais__item,
        .observacoes-documentais
        .observacoes-documentais__item:nth-child(n),
        .observacoes-documentais
        .observacoes-documentais__item:nth-child(4n + 1),
        .observacoes-documentais
        .observacoes-documentais__item:nth-child(4n + 2),
        .observacoes-documentais
        .observacoes-documentais__item:nth-child(4n + 3),
        .observacoes-documentais
        .observacoes-documentais__item:nth-child(4n + 4) {
            display:
                grid !important;

            grid-template-columns:
                3.8mm
                minmax(0, 1fr)
                11mm !important;

            column-gap:
                0.9mm !important;

            row-gap:
                0 !important;

            align-items:
                center !important;

            min-width:
                0 !important;

            min-height:
                8mm !important;

            box-sizing:
                border-box !important;

            margin:
                0 !important;

            padding:
                0.8mm
                1.6mm !important;

            border:
                0 !important;

            border-top:
                0 !important;

            border-right:
                0 !important;

            border-bottom:
                0 !important;

            border-left:
                0 !important;

            outline:
                0 !important;

            box-shadow:
                none !important;

            background:
                #fffaf2 !important;
        }

        /* ------------------------------------------------------------
           BOLINHA

           Centralizada pela célula. Sem compensações artificiais.
           ------------------------------------------------------------ */

        .observacoes-documentais
        .observacoes-documentais__ponto {
            grid-column:
                1 !important;

            width:
                1.15mm !important;

            height:
                1.15mm !important;

            margin:
                0 !important;

            padding:
                0 !important;

            align-self:
                center !important;

            justify-self:
                center !important;

            place-self:
                center !important;

            transform:
                none !important;

            position:
                static !important;
        }

        /* ------------------------------------------------------------
           CONTEÚDO
           ------------------------------------------------------------ */

        .observacoes-documentais
        .observacoes-documentais__conteudo {
            grid-column:
                2 !important;

            min-width:
                0 !important;

            margin:
                0 !important;

            padding:
                0 !important;

            align-self:
                center !important;
        }

        /* ------------------------------------------------------------
           STATUS
           ------------------------------------------------------------ */

        .observacoes-documentais
        .observacoes-documentais__estado {
            grid-column:
                3 !important;

            width:
                11mm !important;

            margin:
                0 !important;

            padding:
                0 !important;

            align-self:
                center !important;

            justify-self:
                end !important;

            border:
                0 !important;

            border-left:
                0 !important;

            outline:
                0 !important;

            box-shadow:
                none !important;

            background:
                transparent !important;
        }

        .observacoes-documentais
        .observacoes-documentais__estado::before,
        .observacoes-documentais
        .observacoes-documentais__estado::after,
        .observacoes-documentais
        .observacoes-documentais__item::before,
        .observacoes-documentais
        .observacoes-documentais__item::after {
            content:
                none !important;

            display:
                none !important;

            border:
                0 !important;

            background:
                none !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__lista {
                gap:
                    0.18mm !important;

                background:
                    rgba(
                        154,
                        106,
                        22,
                        0.15
                    ) !important;

                background-image:
                    none !important;
            }

            .observacoes-documentais
            .observacoes-documentais__item {
                grid-template-columns:
                    3.8mm
                    minmax(0, 1fr)
                    11mm !important;

                border:
                    0 !important;

                background:
                    #fffaf2 !important;
            }

            .observacoes-documentais
            .observacoes-documentais__ponto {
                margin:
                    0 !important;

                transform:
                    none !important;

                place-self:
                    center !important;
            }
        }

        /* ============================================================
           G9.2-R9V.1 — ACABAMENTO VISUAL SEGURO
           Não altera tipografia, conteúdo ou estrutura lógica.
           ============================================================ */

        /*
         * Célula vazia:
         * mesma superfície visual dos demais registros.
         */
        .observacoes-documentais
        .observacoes-documentais__vazio {
            display:
                block;

            min-width:
                0;

            min-height:
                8mm;

            margin:
                0;

            padding:
                0;

            border:
                0;

            outline:
                0;

            box-shadow:
                none;

            background:
                #fffaf2;
        }

        /*
         * Bolinha alinhada com a primeira linha do título.
         * Não altera tamanho nem tipografia do conteúdo.
         */
        .observacoes-documentais
        .observacoes-documentais__ponto {
            align-self:
                start !important;

            justify-self:
                center !important;

            margin:
                0.55mm
                0
                0
                0 !important;

            transform:
                none !important;
        }

        /*
         * Revisar alinhado com a primeira linha.
         * Sem alterar fonte ou line-height.
         */
        .observacoes-documentais
        .observacoes-documentais__estado {
            align-self:
                start !important;

            margin-top:
                0.08mm !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__vazio {
                min-height:
                    8mm;

                background:
                    #fffaf2;
            }

            .observacoes-documentais
            .observacoes-documentais__ponto {
                align-self:
                    start !important;

                margin-top:
                    0.55mm !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado {
                align-self:
                    start !important;

                margin-top:
                    0.08mm !important;
            }
        }

        /* ============================================================
           G9.2-PDF-FIX-004 — MARGEM FÍSICA A4
           ============================================================

           DIAG-003 confirmou:

           página clientHeight = 794px
           página scrollHeight = 806px
           excesso vertical     = 12px
           excesso horizontal   = 0px

           Tabela, conteúdo, Atenções e rodapé não possuem overflow
           interno. Portanto, a correção atua SOMENTE nos espaços
           estruturais da página única.

           Economia:
           - gaps:    4mm -> 2mm = -2mm
           - padding: 9,5mm -> 8mm = -1,5mm
           - total:                  -3,5mm (~13,2px)
           ============================================================ */

        .relatorio-root[data-total-paginas="1"]
        .pagina-relatorio {
            /*
             * Mantém exatamente as três regiões atuais:
             *
             * 1. Hero
             * 2. Conteúdo
             * 3. Atenções + rodapé
             */
            grid-template-rows:
                20mm
                minmax(0, 1fr)
                auto !important;

            /*
             * Antes: 2mm entre cada faixa.
             * Duas separações = 4mm.
             *
             * Agora: 1mm.
             * Duas separações = 2mm.
             */
            gap:
                1mm !important;

            /*
             * Antes:
             * 5,5mm superior
             * 7mm laterais
             * 4mm inferior
             *
             * Agora:
             * 5mm superior
             * 7mm laterais
             * 3mm inferior
             *
             * Laterais permanecem intactas.
             */
            padding:
                5mm
                7mm
                3mm !important;
        }

        @media print {

            .relatorio-root[data-total-paginas="1"]
            .pagina-relatorio {
                grid-template-rows:
                    20mm
                    minmax(0, 1fr)
                    auto !important;

                gap:
                    1mm !important;

                padding:
                    5mm
                    7mm
                    3mm !important;
            }
        }

        /* ============================================================
           G9.2-R9O.5 — SOMENTE POSICIONAMENTO

           NÃO ALTERAR:
           - HTML
           - textos
           - fonte
           - line-height
           - padding
           - tamanho das células
           - grid
           - bordas
           - paginação

           Ajustar somente:
           1. título externo um pouco para cima
           2. bolinha + bloco de texto + Revisar no mesmo centro vertical
           ============================================================ */

        /*
         * Atenções documentais / 7 registros
         *
         * Sobe visualmente, mas mantém exatamente
         * o mesmo espaço físico no documento.
         */
        .observacoes-documentais__topo {
            transform:
                translateY(-1.2mm) !important;
        }

        /*
         * A célula continua exatamente do mesmo tamanho.
         * Apenas centralizamos seus três componentes.
         */
        .observacoes-documentais
        .observacoes-documentais__item {
            align-items:
                center !important;
        }

        /*
         * Bolinha no centro vertical da célula.
         */
        .observacoes-documentais
        .observacoes-documentais__ponto {
            align-self:
                center !important;

            justify-self:
                center !important;

            margin:
                0 !important;

            transform:
                none !important;
        }

        /*
         * O bloco de duas linhas permanece intacto.
         *
         * Documento obrigatório ausente
         * NR-XX ...
         *
         * Apenas o bloco inteiro fica centralizado.
         */
        .observacoes-documentais
        .observacoes-documentais__conteudo {
            align-self:
                center !important;

            margin-top:
                0 !important;

            margin-bottom:
                0 !important;

            transform:
                none !important;
        }

        /*
         * Revisar no mesmo centro vertical
         * da bolinha e do bloco de texto.
         */
        .observacoes-documentais
        .observacoes-documentais__estado {
            align-self:
                center !important;

            justify-self:
                end !important;

            margin-top:
                0 !important;

            margin-bottom:
                0 !important;

            transform:
                none !important;
        }

        @media print {

            .observacoes-documentais__topo {
                transform:
                    translateY(-1.2mm) !important;
            }

            .observacoes-documentais
            .observacoes-documentais__item {
                align-items:
                    center !important;
            }

            .observacoes-documentais
            .observacoes-documentais__ponto,
            .observacoes-documentais
            .observacoes-documentais__conteudo,
            .observacoes-documentais
            .observacoes-documentais__estado {
                align-self:
                    center !important;

                margin-top:
                    0 !important;

                margin-bottom:
                    0 !important;

                transform:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R9O.6.1 — REMOVER BOLINHA SEM COMPRIMIR TEXTO

           Somente:
           - remove bolinha
           - texto ocupa a largura disponível
           - texto centralizado verticalmente
           - Revisar centralizado verticalmente

           Não altera:
           - fonte
           - line-height do conteúdo
           - altura das células
           - padding
           - bordas
           - paginação
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__ponto {
            display:
                none !important;
        }

        /*
         * Usa flex somente para posicionar:
         *
         * [ texto de duas linhas ............... ] [ Revisar ]
         */
        .observacoes-documentais
        .observacoes-documentais__item {
            display:
                flex !important;

            flex-direction:
                row !important;

            align-items:
                center !important;

            justify-content:
                flex-start !important;
        }

        /*
         * Texto ocupa todo o espaço restante.
         * Nenhuma largura fixa.
         */
        .observacoes-documentais
        .observacoes-documentais__conteudo {
            flex:
                1 1 auto !important;

            width:
                auto !important;

            max-width:
                none !important;

            min-width:
                0 !important;

            align-self:
                center !important;

            margin:
                0 !important;

            transform:
                none !important;
        }

        /*
         * Preserva exatamente as duas linhas existentes.
         */
        .observacoes-documentais
        .observacoes-documentais__documento,
        .observacoes-documentais
        .observacoes-documentais__detalhe {
            width:
                auto !important;

            max-width:
                none !important;
        }

        /*
         * Revisar fica do lado direito,
         * centralizado verticalmente.
         */
        .observacoes-documentais
        .observacoes-documentais__estado,
        .observacoes-documentais
        .observacoes-documentais__apoio,
        .observacoes-documentais
        .observacoes-documentais__status {
            flex:
                0 0 auto !important;

            width:
                auto !important;

            align-self:
                center !important;

            margin-top:
                0 !important;

            margin-bottom:
                0 !important;

            margin-left:
                2mm !important;

            transform:
                none !important;

            white-space:
                nowrap !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__ponto {
                display:
                    none !important;
            }

            .observacoes-documentais
            .observacoes-documentais__item {
                display:
                    flex !important;

                flex-direction:
                    row !important;

                align-items:
                    center !important;

                justify-content:
                    flex-start !important;
            }

            .observacoes-documentais
            .observacoes-documentais__conteudo {
                flex:
                    1 1 auto !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                min-width:
                    0 !important;

                align-self:
                    center !important;

                margin:
                    0 !important;

                transform:
                    none !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado,
            .observacoes-documentais
            .observacoes-documentais__apoio,
            .observacoes-documentais
            .observacoes-documentais__status {
                flex:
                    0 0 auto !important;

                width:
                    auto !important;

                align-self:
                    center !important;

                margin-left:
                    2mm !important;

                transform:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R9O.6.2 — CENTRALIZAÇÃO VERTICAL FINAL
           ============================================================

           ALTERAÇÃO EXCLUSIVA:

           - bloco de texto: sobe 0,55mm
           - Revisar:        sobe 0,35mm

           PRESERVADO:

           - bolinha continua removida
           - texto continua em duas linhas
           - flex atual
           - largura atual
           - altura atual
           - padding atual
           - fontes atuais
           - bordas atuais
           - quatro colunas
           - paginação
           - sete registros
           ============================================================ */

        /*
         * Sobe somente o BLOCO DE TEXTO completo.
         *
         * Documento obrigatório ausente
         * NR-XX ...
         *
         * As duas linhas permanecem exatamente como estão.
         */
        .observacoes-documentais
        .observacoes-documentais__conteudo {
            transform:
                translateY(-0.55mm) !important;
        }

        /*
         * Sobe somente a ação Revisar.
         * Mantém alinhamento à direita.
         */
        .observacoes-documentais
        .observacoes-documentais__estado,
        .observacoes-documentais
        .observacoes-documentais__apoio,
        .observacoes-documentais
        .observacoes-documentais__status {
            transform:
                translateY(-0.35mm) !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__conteudo {
                transform:
                    translateY(-0.55mm) !important;
            }

            .observacoes-documentais
            .observacoes-documentais__estado,
            .observacoes-documentais
            .observacoes-documentais__apoio,
            .observacoes-documentais
            .observacoes-documentais__status {
                transform:
                    translateY(-0.35mm) !important;
            }
        }

        /* ============================================================
           G9.2-R9O.7 — 5 ITENS POR LINHA NAS ATENÇÕES DOCUMENTAIS
           ============================================================

           ALTERAÇÃO EXCLUSIVA:
           - bloco "Atenções documentais" passa de 4 para 5 itens por linha

           PRESERVADO:
           - alinhamento vertical já aprovado
           - texto
           - fontes
           - bordas
           - altura das células
           - paginação
           - contagem
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__lista {
            grid-template-columns:
                repeat(5, minmax(0, 1fr)) !important;
        }

        @media print {
            .observacoes-documentais
            .observacoes-documentais__lista {
                grid-template-columns:
                    repeat(5, minmax(0, 1fr)) !important;
            }
        }

        /* ============================================================
           G9.2-R9R.1 — ALINHAMENTO DOS INDICADORES
           ============================================================

           Mantém:
           - quatro cards;
           - mesma altura;
           - mesmo padding;
           - mesmas bordas;
           - mesmas cores;
           - mesma paginação.

           Ajusta somente:
           - bloco textual à esquerda;
           - número à direita;
           - número centralizado verticalmente.
           ============================================================ */

        .resumo-selecao article {
            display:
                grid !important;

            grid-template-columns:
                minmax(0, 1fr)
                auto !important;

            grid-template-rows:
                auto
                auto !important;

            align-content:
                center !important;

            align-items:
                center !important;

            column-gap:
                2mm !important;

            row-gap:
                0.35mm !important;
        }

        /*
         * DOCUMENTOS / ARQUIVOS / AUSÊNCIAS / ALERTAS
         */
        .resumo-selecao article > span {
            grid-column:
                1 !important;

            grid-row:
                1 !important;

            align-self:
                end !important;

            justify-self:
                start !important;

            margin:
                0 !important;

            padding:
                0 !important;
        }

        /*
         * selecionados / evidências físicas /
         * obrigatórias / do estrutura
         */
        .resumo-selecao article > small {
            grid-column:
                1 !important;

            grid-row:
                2 !important;

            align-self:
                start !important;

            justify-self:
                start !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1.05 !important;
        }

        /*
         * Número:
         * ocupa as duas linhas e fica no centro vertical.
         */
        .resumo-selecao article > strong {
            grid-column:
                2 !important;

            grid-row:
                1 / 3 !important;

            align-self:
                center !important;

            justify-self:
                end !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1 !important;

            text-align:
                right !important;
        }

        @media print {

            .resumo-selecao article {
                display:
                    grid !important;

                grid-template-columns:
                    minmax(0, 1fr)
                    auto !important;

                grid-template-rows:
                    auto
                    auto !important;

                align-content:
                    center !important;

                align-items:
                    center !important;

                column-gap:
                    2mm !important;

                row-gap:
                    0.35mm !important;
            }

            .resumo-selecao article > span {
                grid-column:
                    1 !important;

                grid-row:
                    1 !important;
            }

            .resumo-selecao article > small {
                grid-column:
                    1 !important;

                grid-row:
                    2 !important;
            }

            .resumo-selecao article > strong {
                grid-column:
                    2 !important;

                grid-row:
                    1 / 3 !important;

                align-self:
                    center !important;

                justify-self:
                    end !important;

                margin:
                    0 !important;

                line-height:
                    1 !important;
            }
        }

        /* ============================================================
           G9.2-R9R.2 — CENTRALIZAÇÃO FÍSICA REAL
           ============================================================

           HTML real do card:

           <article>
               <span>DOCUMENTOS</span>
               <strong>4</strong>
               <small>selecionados</small>
           </article>

           Portanto deixamos de depender do grid para a posição
           vertical e usamos o centro físico do próprio card.

           NÃO ALTERA:
           - altura
           - largura
           - padding
           - borda
           - cor
           - tamanho do número
           - valores
           ============================================================ */

        .resumo-selecao > article {
            position:
                relative !important;

            display:
                block !important;
        }

        /*
         * LABEL
         *
         * DOCUMENTOS
         * ARQUIVOS
         * AUSÊNCIAS
         * ALERTAS
         *
         * Fica imediatamente acima do centro vertical.
         */
        .resumo-selecao > article > span {
            position:
                absolute !important;

            left:
                2.1mm !important;

            top:
                50% !important;

            right:
                auto !important;

            bottom:
                auto !important;

            margin:
                0 !important;

            padding:
                0 !important;

            transform:
                translateY(-115%) !important;

            white-space:
                nowrap !important;
        }

        /*
         * SUBTÍTULO
         *
         * selecionados
         * evidências físicas
         * obrigatórias
         * do estrutura
         *
         * Fica imediatamente abaixo do centro vertical.
         */
        .resumo-selecao > article > small {
            position:
                absolute !important;

            left:
                2.1mm !important;

            top:
                50% !important;

            right:
                auto !important;

            bottom:
                auto !important;

            margin:
                0 !important;

            padding:
                0 !important;

            transform:
                translateY(18%) !important;

            white-space:
                nowrap !important;
        }

        /*
         * NÚMERO
         *
         * Centro vertical matemático do card.
         */
        .resumo-selecao > article > strong {
            position:
                absolute !important;

            right:
                2.1mm !important;

            top:
                50% !important;

            left:
                auto !important;

            bottom:
                auto !important;

            margin:
                0 !important;

            padding:
                0 !important;

            transform:
                translateY(-50%) !important;

            line-height:
                1 !important;

            text-align:
                right !important;

            white-space:
                nowrap !important;
        }

        @media print {

            .resumo-selecao > article {
                position:
                    relative !important;

                display:
                    block !important;
            }

            .resumo-selecao > article > span {
                position:
                    absolute !important;

                left:
                    2.1mm !important;

                top:
                    50% !important;

                transform:
                    translateY(-115%) !important;
            }

            .resumo-selecao > article > small {
                position:
                    absolute !important;

                left:
                    2.1mm !important;

                top:
                    50% !important;

                transform:
                    translateY(18%) !important;
            }

            .resumo-selecao > article > strong {
                position:
                    absolute !important;

                right:
                    2.1mm !important;

                top:
                    50% !important;

                transform:
                    translateY(-50%) !important;

                line-height:
                    1 !important;
            }
        }

        /* ============================================================
           G9.2-R9S.2 — CENTRALIZAÇÃO VERTICAL REAL DO CONTEXTO
           ============================================================

           Estrutura REAL:

           <section class="contexto-principal">
               <div>
                   <span class="contexto-label">...</span>
                   <strong>...</strong>
               </div>
           </section>

           Portanto, atuamos SOMENTE em:
           .contexto-principal > div

           Objetivo:
           centralizar verticalmente rótulo + valor como um único bloco.

           NÃO ALTERA:
           - grid externo
           - largura dos cards
           - altura dos cards
           - padding
           - bordas
           - cores
           - fontes
           - textos
           ============================================================ */

        .contexto-principal > div {
            display:
                flex !important;

            flex-direction:
                column !important;

            justify-content:
                center !important;

            align-items:
                flex-start !important;
        }

        /*
         * Rótulo:
         * COLABORADOR / FUNÇÃO / EMPRESA / OBRA
         *
         * Mantemos o espaçamento existente,
         * eliminando somente compensações verticais externas.
         */
        .contexto-principal
        > div
        > .contexto-label {
            flex:
                0 0 auto !important;

            margin-top:
                0 !important;

            transform:
                none !important;
        }

        /*
         * Valor:
         * nome, função, empresa e obra.
         */
        .contexto-principal
        > div
        > strong {
            flex:
                0 0 auto !important;

            margin-top:
                0 !important;

            margin-bottom:
                0 !important;

            transform:
                none !important;
        }

        @media print {

            .contexto-principal > div {
                display:
                    flex !important;

                flex-direction:
                    column !important;

                justify-content:
                    center !important;

                align-items:
                    flex-start !important;
            }

            .contexto-principal
            > div
            > .contexto-label {
                flex:
                    0 0 auto !important;

                margin-top:
                    0 !important;

                transform:
                    none !important;
            }

            .contexto-principal
            > div
            > strong {
                flex:
                    0 0 auto !important;

                margin-top:
                    0 !important;

                margin-bottom:
                    0 !important;

                transform:
                    none !important;
            }
        }


        /* ============================================================
           G9.2-R9S.4 — CENTRALIZAÇÃO VERTICAL VERDADEIRA
           ============================================================

           Estrutura real:

           .contexto-principal
               > div
                   > .contexto-label
                   > strong

           Não há translateY positivo ou negativo.

           O próprio card calcula o centro vertical do conjunto:
           RÓTULO + VALOR.
           ============================================================ */

        .contexto-principal > div {
            box-sizing:
                border-box !important;

            display:
                flex !important;

            flex-direction:
                column !important;

            justify-content:
                center !important;

            align-items:
                flex-start !important;

            transform:
                none !important;
        }

        .contexto-principal
        > div
        > .contexto-label {
            position:
                static !important;

            flex:
                0 0 auto !important;

            margin-top:
                0 !important;

            margin-bottom:
                0.55mm !important;

            padding:
                0 !important;

            transform:
                none !important;
        }

        .contexto-principal
        > div
        > strong {
            position:
                static !important;

            flex:
                0 0 auto !important;

            margin:
                0 !important;

            padding:
                0 !important;

            transform:
                none !important;
        }

        /*
         * Página de uma folha:
         * preserva exatamente o padding já existente.
         */
        .relatorio-root[data-total-paginas="1"]
        .contexto-principal
        > div {
            padding:
                1.5mm
                2.2mm !important;

            justify-content:
                center !important;
        }

        @media print {

            .contexto-principal > div {
                box-sizing:
                    border-box !important;

                display:
                    flex !important;

                flex-direction:
                    column !important;

                justify-content:
                    center !important;

                align-items:
                    flex-start !important;

                transform:
                    none !important;
            }

            .contexto-principal
            > div
            > .contexto-label,
            .contexto-principal
            > div
            > strong {
                position:
                    static !important;

                transform:
                    none !important;
            }

            .relatorio-root[data-total-paginas="1"]
            .contexto-principal
            > div {
                padding:
                    1.5mm
                    2.2mm !important;

                justify-content:
                    center !important;
            }
        }

        /* ============================================================
           G9.2-R9S.5 — CENTRALIZAÇÃO VERTICAL REAL DOS CARDS DE CONTEXTO
           ============================================================

           DIAGNÓSTICO:
           Antes, o justify-content:center não tinha efeito visual
           suficiente porque o card não possuía altura útil interna.

           CORREÇÃO:
           - define altura mínima interna real;
           - centraliza o conjunto:
                contexto-label
                strong
           - remove qualquer deslocamento vertical artificial.

           ALVO:
           .contexto-principal > div
           ============================================================ */

        .contexto-principal > div {
            box-sizing:
                border-box !important;

            display:
                flex !important;

            flex-direction:
                column !important;

            justify-content:
                center !important;

            align-items:
                flex-start !important;

            min-height:
                10.8mm !important;

            padding:
                1.5mm 2.2mm !important;

            row-gap:
                0.45mm !important;

            transform:
                none !important;
        }

        .contexto-principal
        > div
        > .contexto-label {
            position:
                static !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1 !important;

            transform:
                none !important;

            flex:
                0 0 auto !important;
        }

        .contexto-principal
        > div
        > strong {
            position:
                static !important;

            margin:
                0 !important;

            padding:
                0 !important;

            line-height:
                1.05 !important;

            transform:
                none !important;

            flex:
                0 0 auto !important;
        }

        @media print {

            .contexto-principal > div {
                box-sizing:
                    border-box !important;

                display:
                    flex !important;

                flex-direction:
                    column !important;

                justify-content:
                    center !important;

                align-items:
                    flex-start !important;

                min-height:
                    10.8mm !important;

                padding:
                    1.5mm 2.2mm !important;

                row-gap:
                    0.45mm !important;

                transform:
                    none !important;
            }

            .contexto-principal
            > div
            > .contexto-label {
                position:
                    static !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                line-height:
                    1 !important;

                transform:
                    none !important;

                flex:
                    0 0 auto !important;
            }

            .contexto-principal
            > div
            > strong {
                position:
                    static !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                line-height:
                    1.05 !important;

                transform:
                    none !important;

                flex:
                    0 0 auto !important;
            }
        }

        /* ============================================================
           G9.2-R9S.6 — SUBIR CONTEÚDO DOS CARDS 0,55MM
           ============================================================

           Ajuste visual fino após R9S.5.

           Sobe SOMENTE:
           - COLABORADOR + nome
           - FUNÇÃO + função
           - EMPRESA + empresa
           - OBRA + obra

           Não altera:
           - card
           - altura
           - largura
           - padding
           - borda
           - fonte
           - grid
           ============================================================ */

        .contexto-principal
        > div
        > .contexto-label {
            transform:
                translateY(-0.55mm) !important;
        }

        .contexto-principal
        > div
        > strong {
            transform:
                translateY(-0.55mm) !important;
        }

        @media print {

            .contexto-principal
            > div
            > .contexto-label {
                transform:
                    translateY(-0.55mm) !important;
            }

            .contexto-principal
            > div
            > strong {
                transform:
                    translateY(-0.55mm) !important;
            }
        }

        /* ============================================================
           G9.2-R10.1 — SUBIR A LINHA SUPERIOR DE ATENÇÕES DOCUMENTAIS
           ============================================================

           Objetivo:
           - afastar a linha superior do texto
             "Atenções documentais / X registros"

           Efeito visual:
           - mais respiro acima do título
           - bloco continua no mesmo padrão
           - sem alterar tabela / cards / PDF geral
           ============================================================ */

        .atencoes-documentais-titulo,
        .atencoes-documentais__titulo,
        .bloco-atencoes__titulo,
        .rodape-atencoes__titulo {
            display:
                block !important;

            margin-top:
                1.6mm !important;

            margin-bottom:
                0.9mm !important;

            position:
                relative !important;

            z-index:
                2 !important;
        }

        .atencoes-documentais,
        .atencoes-documentais-bloco,
        .bloco-atencoes,
        .rodape-atencoes {
            padding-top:
                1.3mm !important;
        }

        @media print {

            .atencoes-documentais-titulo,
            .atencoes-documentais__titulo,
            .bloco-atencoes__titulo,
            .rodape-atencoes__titulo {
                display:
                    block !important;

                margin-top:
                    1.6mm !important;

                margin-bottom:
                    0.9mm !important;

                position:
                    relative !important;

                z-index:
                    2 !important;
            }

            .atencoes-documentais,
            .atencoes-documentais-bloco,
            .bloco-atencoes,
            .rodape-atencoes {
                padding-top:
                    1.3mm !important;
            }
        }

        /* ============================================================
           G9.2-R10.2 — SUBIR SOMENTE A LINHA ACIMA DAS ATENÇÕES
           ============================================================

           A linha visual é a borda inferior da .tabela-container.

           Como .tabela-container usa flex: 1, uma margem inferior
           consome parte do espaço flexível e faz sua borda inferior
           terminar um pouco mais acima.

           O título "Atenções documentais / X registros"
           NÃO é deslocado.
           ============================================================ */

        .relatorio-root[data-total-paginas="1"]
        .tabela-container {
            margin-bottom:
                1.4mm !important;
        }

        @media print {

            .relatorio-root[data-total-paginas="1"]
            .tabela-container {
                margin-bottom:
                    1.4mm !important;
            }
        }

        /* ============================================================
           G9.2-R11.2 — AJUSTE FINAL DO CABEÇALHO
           ============================================================

           Somente as classes reais do Hero são modificadas.

           - marca SafeScan centralizada verticalmente;
           - texto central centralizado verticalmente;
           - nome do colaborador à direita centralizado verticalmente;
           - paginação superior removida no HTML;
           - paginação inferior permanece intacta.
           ============================================================ */

        .marca-safescan,
        .titulo-relatorio,
        .hero-relatorio__pagina {
            align-self:
                stretch !important;

            justify-content:
                center !important;
        }

        .marca-safescan {
            align-items:
                flex-start !important;
        }

        .titulo-relatorio {
            align-items:
                center !important;

            text-align:
                center !important;
        }

        .titulo-relatorio p {
            margin:
                0 !important;

            padding:
                0 !important;
        }

        .hero-relatorio__pagina {
            align-items:
                flex-end !important;

            text-align:
                right !important;
        }

        .hero-relatorio__pagina span {
            margin-top:
                0 !important;
        }

        @media print {

            .marca-safescan,
            .titulo-relatorio,
            .hero-relatorio__pagina {
                align-self:
                    stretch !important;

                justify-content:
                    center !important;
            }

            .marca-safescan {
                align-items:
                    flex-start !important;
            }

            .titulo-relatorio {
                align-items:
                    center !important;

                text-align:
                    center !important;
            }

            .titulo-relatorio p {
                margin:
                    0 !important;

                padding:
                    0 !important;
            }

            .hero-relatorio__pagina {
                align-items:
                    flex-end !important;

                text-align:
                    right !important;
            }

            .hero-relatorio__pagina span {
                margin-top:
                    0 !important;
            }
        }

        /* ============================================================
           G9.2-R11.3 — CORREÇÃO VISUAL DO HERO
           ============================================================

           Nova composição:

           ESQUERDA
           SafeScan Brasil
           Gestão integrada de SST

                       CENTRO
              Resumo documental
                 do colaborador

                                             DIREITA
                                    Nome do colaborador

           Todos centralizados verticalmente.

           O número X/Y permanece removido do Hero.
           A paginação continua somente no rodapé.
           ============================================================ */

        /*
         * A grade passa a usar toda a altura disponível.
         */
        .hero-relatorio__conteudo {
            align-items:
                stretch !important;
        }

        /*
         * Os três grupos ocupam toda a altura do Hero.
         */
        .marca-safescan,
        .titulo-relatorio,
        .hero-relatorio__pagina {
            box-sizing:
                border-box !important;

            height:
                100% !important;

            min-height:
                0 !important;

            display:
                flex !important;

            flex-direction:
                column !important;

            justify-content:
                center !important;

            transform:
                none !important;
        }

        /*
         * ========================================================
         * ESQUERDA
         * ========================================================
         */

        .marca-safescan {
            align-items:
                flex-start !important;

            text-align:
                left !important;
        }

        .marca-safescan strong,
        .marca-safescan span {
            transform:
                none !important;
        }

        /*
         * ========================================================
         * CENTRO
         * ========================================================
         *
         * Este P era originalmente um subtítulo de 9px.
         * Agora ele é o título principal do Hero.
         */

        .titulo-relatorio {
            align-items:
                center !important;

            justify-content:
                center !important;

            text-align:
                center !important;
        }

        .titulo-relatorio h1 {
            display:
                none !important;
        }

        .titulo-relatorio p {
            display:
                block !important;

            margin:
                0 !important;

            padding:
                0 !important;

            font-size:
                17px !important;

            font-weight:
                750 !important;

            line-height:
                1.08 !important;

            letter-spacing:
                -0.015em !important;

            opacity:
                1 !important;

            color:
                #ffffff !important;

            white-space:
                nowrap !important;

            transform:
                none !important;
        }

        /*
         * ========================================================
         * DIREITA
         * ========================================================
         *
         * Antes o span ficava abaixo da pílula X/Y.
         * Como a pílula foi removida, o nome passa a ser o único
         * conteúdo e ocupa o centro vertical do bloco.
         */

        .hero-relatorio__pagina {
            align-items:
                flex-end !important;

            justify-content:
                center !important;

            text-align:
                right !important;

            overflow:
                visible !important;
        }

        /*
         * Segurança adicional:
         * nenhuma paginação superior pode reaparecer.
         */
        .hero-relatorio__pagina > strong {
            display:
                none !important;
        }

        /*
         * Nome do colaborador:
         * remove as regras antigas de corte.
         */
        .hero-relatorio__pagina > span {
            position:
                static !important;

            display:
                block !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            overflow:
                visible !important;

            text-overflow:
                clip !important;

            white-space:
                nowrap !important;

            font-size:
                9px !important;

            font-weight:
                700 !important;

            line-height:
                1.1 !important;

            opacity:
                0.96 !important;

            color:
                #ffffff !important;

            transform:
                none !important;
        }

        /*
         * ========================================================
         * IMPRESSÃO
         * ========================================================
         */

        @media print {

            .hero-relatorio__conteudo {
                align-items:
                    stretch !important;
            }

            .marca-safescan,
            .titulo-relatorio,
            .hero-relatorio__pagina {
                box-sizing:
                    border-box !important;

                height:
                    100% !important;

                min-height:
                    0 !important;

                display:
                    flex !important;

                flex-direction:
                    column !important;

                justify-content:
                    center !important;

                transform:
                    none !important;
            }

            .marca-safescan {
                align-items:
                    flex-start !important;
            }

            .titulo-relatorio {
                align-items:
                    center !important;

                text-align:
                    center !important;
            }

            .titulo-relatorio h1 {
                display:
                    none !important;
            }

            .titulo-relatorio p {
                display:
                    block !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                font-size:
                    17px !important;

                font-weight:
                    750 !important;

                line-height:
                    1.08 !important;

                letter-spacing:
                    -0.015em !important;

                opacity:
                    1 !important;

                color:
                    #ffffff !important;

                white-space:
                    nowrap !important;

                transform:
                    none !important;
            }

            .hero-relatorio__pagina {
                align-items:
                    flex-end !important;

                justify-content:
                    center !important;

                text-align:
                    right !important;

                overflow:
                    visible !important;
            }

            .hero-relatorio__pagina > strong {
                display:
                    none !important;
            }

            .hero-relatorio__pagina > span {
                position:
                    static !important;

                display:
                    block !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                overflow:
                    visible !important;

                text-overflow:
                    clip !important;

                white-space:
                    nowrap !important;

                font-size:
                    9px !important;

                font-weight:
                    700 !important;

                line-height:
                    1.1 !important;

                opacity:
                    0.96 !important;

                color:
                    #ffffff !important;

                transform:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R11.4 — REMOVER NOME REDUNDANTE DO HERO
           ============================================================

           Remove SOMENTE o nome do colaborador localizado
           no lado direito do banner superior.

           A identificação do colaborador permanece no card
           COLABORADOR logo abaixo do Hero.

           PRESERVADO:
           - SafeScan Brasil;
           - Gestão integrada de SST;
           - Resumo documental do colaborador;
           - fundo verde;
           - altura do Hero;
           - paginação somente no rodapé.
           ============================================================ */

        .hero-relatorio__pagina > span {
            display:
                none !important;

            visibility:
                hidden !important;
        }

        /*
         * O container direito continua existindo para manter
         * o equilíbrio estrutural e o título central realmente
         * centralizado no Hero.
         */
        .hero-relatorio__pagina {
            min-width:
                0 !important;

            overflow:
                hidden !important;
        }

        @media print {

            .hero-relatorio__pagina > span {
                display:
                    none !important;

                visibility:
                    hidden !important;
            }

            .hero-relatorio__pagina {
                min-width:
                    0 !important;

                overflow:
                    hidden !important;
            }
        }

        /* ============================================================
           G9.2-R11.6 — RESTAURAR HERO E AJUSTAR SOMENTE O Y DO TEXTO
           ============================================================

           REGRA DESTE PROJETO:
           "Ajustar verticalmente" = mover somente o texto
           no eixo Y, sem alterar mais nada.

           Este ajuste:
           - restaura o estado anterior removendo o R11.5;
           - move SOMENTE os blocos de texto do Hero;
           - não altera fonte, tamanho, peso, largura,
             altura, espaçamento, layout, rodapé ou cards.
           ============================================================ */

        .marca-safescan,
        .titulo-relatorio {
            position:
                relative !important;

            top:
                -4px !important;
        }

        @media print {

            .marca-safescan,
            .titulo-relatorio {
                position:
                    relative !important;

                top:
                    -4px !important;
            }
        }

        /* ============================================================
           G9.2-R12.1 — PADRÃO DE CORES DA CONFERÊNCIA
           ============================================================

           PADRÃO:
           - aprovado / conforme = verde
           - atenção             = âmbar
           - suspeito            = vermelho
           - reprovado           = vermelho
           - bloqueado           = vermelho
           - revisar             = roxo
           - demais              = neutro

           Somente COR DO TEXTO.
           Sem badge, sem fundo, sem cápsula.
           ============================================================ */

        .conferencia-texto {
            display:
                inline !important;

            margin:
                0 !important;

            padding:
                0 !important;

            background:
                transparent !important;

            border:
                0 !important;

            border-radius:
                0 !important;

            font-weight:
                600 !important;

            line-height:
                inherit !important;

            white-space:
                nowrap !important;
        }

        /*
         * VERDE — condição regular / aprovada
         */
        .conferencia-texto--aprovado {
            color:
                #087a57 !important;
        }

        /*
         * ÂMBAR — requer atenção
         */
        .conferencia-texto--atencao {
            color:
                #946315 !important;
        }

        /*
         * VERMELHO — situação crítica
         */
        .conferencia-texto--critico {
            color:
                #a33e33 !important;
        }

        /*
         * ROXO — revisão humana
         */
        .conferencia-texto--revisar {
            color:
                #6d56b7 !important;
        }

        /*
         * NEUTRO
         */
        .conferencia-texto--neutro {
            color:
                #53655f !important;
        }

        @media print {

            .conferencia-texto--aprovado {
                color:
                    #087a57 !important;
            }

            .conferencia-texto--atencao {
                color:
                    #946315 !important;
            }

            .conferencia-texto--critico {
                color:
                    #a33e33 !important;
            }

            .conferencia-texto--revisar {
                color:
                    #6d56b7 !important;
            }

            .conferencia-texto--neutro {
                color:
                    #53655f !important;
            }
        }
        }

        /* ============================================================
           G9.2-R12.2B — UNIFICAR SOMENTE A COR DOS 5 QUADRADOS DO RODAPÉ
           ============================================================

           AJUSTE EXATO SOLICITADO:
           - mexer somente na grade de 5 quadrados das Atenções;
           - deixar todos no mesmo tom;
           - não alterar título, bordas, textos, layout ou posições.

           IMPORTANTE:
           - NÃO aplicar fundo no bloco .observacoes-documentais
           - aplicar fundo SOMENTE na lista e nas células da lista
           ============================================================ */

        .observacoes-documentais__lista {
            background:
                #fffaf2 !important;
        }

        .observacoes-documentais__lista > * {
            background:
                #fffaf2 !important;
        }

        @media print {

            .observacoes-documentais__lista {
                background:
                    #fffaf2 !important;
            }

            .observacoes-documentais__lista > * {
                background:
                    #fffaf2 !important;
            }
        }

        /* ============================================================
           G9.2-R12.2C — CINCO QUADRADOS UNIFORMES
           ============================================================

           CORREÇÃO EXCLUSIVA:

           - todos os 5 espaços usam #fffaf2;
           - remove a imagem de fundo antiga baseada em 4 colunas;
           - redesenha SOMENTE as quatro linhas divisórias;
           - mantém a grade atual com 5 colunas.

           NÃO ALTERA:
           - título;
           - contador;
           - texto;
           - tamanho;
           - altura;
           - borda externa;
           - alinhamento;
           - grid-template-columns.
           ============================================================ */

        .observacoes-documentais
        .observacoes-documentais__lista {
            background-color:
                #fffaf2 !important;

            /*
             * Substitui o background-image legado.
             *
             * 5 quadrados iguais:
             *
             * | 20% | 20% | 20% | 20% | 20% |
             *
             * A imagem contém SOMENTE as linhas verticais.
             */
            background-image:
                linear-gradient(
                    to right,

                    transparent
                    0,

                    transparent
                    calc(20% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(20% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(20% + 0.11mm),

                    transparent
                    calc(20% + 0.11mm),

                    transparent
                    calc(40% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(40% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(40% + 0.11mm),

                    transparent
                    calc(40% + 0.11mm),

                    transparent
                    calc(60% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(60% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(60% + 0.11mm),

                    transparent
                    calc(60% + 0.11mm),

                    transparent
                    calc(80% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(80% - 0.11mm),

                    rgba(154, 106, 22, 0.16)
                    calc(80% + 0.11mm),

                    transparent
                    calc(80% + 0.11mm),

                    transparent
                    100%
                ) !important;

            background-repeat:
                no-repeat !important;

            background-size:
                100% 100% !important;
        }

        /*
         * O item real continua com a mesma cor dos espaços vazios.
         * Nenhuma dimensão ou posicionamento é alterado.
         */
        .observacoes-documentais
        .observacoes-documentais__lista
        > .observacoes-documentais__item {
            background-color:
                #fffaf2 !important;
        }

        @media print {

            .observacoes-documentais
            .observacoes-documentais__lista {
                background-color:
                    #fffaf2 !important;

                background-image:
                    linear-gradient(
                        to right,

                        transparent
                        0,

                        transparent
                        calc(20% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(20% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(20% + 0.11mm),

                        transparent
                        calc(20% + 0.11mm),

                        transparent
                        calc(40% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(40% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(40% + 0.11mm),

                        transparent
                        calc(40% + 0.11mm),

                        transparent
                        calc(60% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(60% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(60% + 0.11mm),

                        transparent
                        calc(60% + 0.11mm),

                        transparent
                        calc(80% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(80% - 0.11mm),

                        rgba(154, 106, 22, 0.16)
                        calc(80% + 0.11mm),

                        transparent
                        calc(80% + 0.11mm),

                        transparent
                        100%
                    ) !important;

                background-repeat:
                    no-repeat !important;

                background-size:
                    100% 100% !important;
            }

            .observacoes-documentais
            .observacoes-documentais__lista
            > .observacoes-documentais__item {
                background-color:
                    #fffaf2 !important;
            }
        }

        /* ============================================================
           G9.2-R12.2D — COR ÚNICA NOS 5 QUADRADOS
           ============================================================

           CORREÇÃO CIRÚRGICA:

           Os cinco espaços recebem EXATAMENTE:
               #fffaf2

           A antiga imagem de fundo é anulada.

           Depois são desenhadas somente quatro divisórias verticais:
               20%
               40%
               60%
               80%

           NÃO ALTERA:
           - texto;
           - título;
           - contador;
           - altura;
           - largura;
           - posições;
           - borda externa;
           - grid de 5 colunas.
           ============================================================ */

        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista {

            background-color:
                #fffaf2 !important;

            /*
             * Substitui QUALQUER background-image legado.
             *
             * As quatro imagens abaixo são apenas linhas.
             * Nenhuma delas contém preenchimento de fundo.
             */
            background-image:
                linear-gradient(
                    to bottom,
                    rgba(154, 106, 22, 0.16),
                    rgba(154, 106, 22, 0.16)
                ),
                linear-gradient(
                    to bottom,
                    rgba(154, 106, 22, 0.16),
                    rgba(154, 106, 22, 0.16)
                ),
                linear-gradient(
                    to bottom,
                    rgba(154, 106, 22, 0.16),
                    rgba(154, 106, 22, 0.16)
                ),
                linear-gradient(
                    to bottom,
                    rgba(154, 106, 22, 0.16),
                    rgba(154, 106, 22, 0.16)
                ) !important;

            background-size:
                0.18mm 100%,
                0.18mm 100%,
                0.18mm 100%,
                0.18mm 100% !important;

            background-position:
                20% 0,
                40% 0,
                60% 0,
                80% 0 !important;

            background-repeat:
                no-repeat !important;
        }

        /*
         * Remove qualquer camada auxiliar antiga da lista.
         * Não toca nos itens reais.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista::before,

        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista::after {

            content:
                none !important;

            display:
                none !important;

            background:
                none !important;

            background-image:
                none !important;

            box-shadow:
                none !important;
        }

        /*
         * O item preenchido usa exatamente o mesmo fundo.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > .observacoes-documentais__item {

            background-color:
                #fffaf2 !important;

            background-image:
                none !important;
        }

        @media print {

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista {

                background-color:
                    #fffaf2 !important;

                background-image:
                    linear-gradient(
                        to bottom,
                        rgba(154, 106, 22, 0.16),
                        rgba(154, 106, 22, 0.16)
                    ),
                    linear-gradient(
                        to bottom,
                        rgba(154, 106, 22, 0.16),
                        rgba(154, 106, 22, 0.16)
                    ),
                    linear-gradient(
                        to bottom,
                        rgba(154, 106, 22, 0.16),
                        rgba(154, 106, 22, 0.16)
                    ),
                    linear-gradient(
                        to bottom,
                        rgba(154, 106, 22, 0.16),
                        rgba(154, 106, 22, 0.16)
                    ) !important;

                background-size:
                    0.18mm 100%,
                    0.18mm 100%,
                    0.18mm 100%,
                    0.18mm 100% !important;

                background-position:
                    20% 0,
                    40% 0,
                    60% 0,
                    80% 0 !important;

                background-repeat:
                    no-repeat !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista::before,

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista::after {

                content:
                    none !important;

                display:
                    none !important;

                background:
                    none !important;

                background-image:
                    none !important;

                box-shadow:
                    none !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > .observacoes-documentais__item {

                background-color:
                    #fffaf2 !important;

                background-image:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R12.2F — SEM PATTERN / CÉLULAS EXISTENTES
           ============================================================

           ESTADO CONFIRMADO:
           - as células vazias JÁ EXISTEM no DOM;
           - não recriar nenhuma célula;
           - não alterar montarObservacoes.

           CORREÇÃO:
           - remover background-image/pattern da grade;
           - todos os quadrados usam exatamente #fffaf2;
           - divisórias são bordas CSS normais.

           NÃO ALTERA:
           - título;
           - contador;
           - textos;
           - tamanho;
           - posição;
           - altura;
           - quantidade de células;
           - grid de 5 colunas;
           - restante do PDF.
           ============================================================ */

        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista {
            grid-template-columns:
                repeat(5, minmax(0, 1fr)) !important;

            /*
             * background shorthand é proposital:
             * além da cor, ele zera background-image.
             */
            background:
                #fffaf2 !important;

            background-image:
                none !important;

            background-repeat:
                no-repeat !important;
        }

        /*
         * ITEM REAL + CÉLULA VAZIA:
         * exatamente a mesma cor.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > .observacoes-documentais__item,

        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > .observacoes-documentais__vazio {
            box-sizing:
                border-box !important;

            background:
                #fffaf2 !important;

            background-image:
                none !important;

            box-shadow:
                none !important;
        }

        /*
         * A célula vazia usa somente o espaço que o Grid lhe dá.
         * Nenhuma imagem, canvas ou pattern.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__vazio {
            display:
                block !important;

            min-width:
                0 !important;

            width:
                auto !important;

            min-height:
                0 !important;

            align-self:
                stretch !important;

            background:
                #fffaf2 !important;

            background-image:
                none !important;
        }

        /*
         * Remove apenas as divisórias antigas dos itens.
         * Depois redesenha para a grade de 5 colunas.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > * {
            border-left:
                0 !important;

            border-top:
                0 !important;
        }

        /*
         * COLUNAS:
         *
         * 1 | 2 | 3 | 4 | 5
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > *:not(:nth-child(5n + 1)) {
            border-left:
                1px solid rgba(154, 106, 22, 0.14) !important;
        }

        /*
         * LINHAS:
         * da segunda linha em diante.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        > *:nth-child(n + 6) {
            border-top:
                1px solid rgba(154, 106, 22, 0.14) !important;
        }

        /*
         * Nenhuma camada gráfica auxiliar na lista.
         */
        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista::before,

        main.relatorio-root[data-consolidacao-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista::after {
            content:
                none !important;

            display:
                none !important;

            background:
                none !important;

            background-image:
                none !important;

            box-shadow:
                none !important;
        }

        @media print {

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista {
                grid-template-columns:
                    repeat(5, minmax(0, 1fr)) !important;

                background:
                    #fffaf2 !important;

                background-image:
                    none !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > .observacoes-documentais__item,

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > .observacoes-documentais__vazio {
                background:
                    #fffaf2 !important;

                background-image:
                    none !important;

                box-shadow:
                    none !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__vazio {
                display:
                    block !important;

                min-width:
                    0 !important;

                width:
                    auto !important;

                min-height:
                    0 !important;

                align-self:
                    stretch !important;

                background:
                    #fffaf2 !important;

                background-image:
                    none !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > * {
                border-left:
                    0 !important;

                border-top:
                    0 !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > *:not(:nth-child(5n + 1)) {
                border-left:
                    1px solid rgba(154, 106, 22, 0.14) !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            > *:nth-child(n + 6) {
                border-top:
                    1px solid rgba(154, 106, 22, 0.14) !important;
            }

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista::before,

            main.relatorio-root[data-consolidacao-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista::after {
                content:
                    none !important;

                display:
                    none !important;

                background:
                    none !important;

                background-image:
                    none !important;

                box-shadow:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R12.2G — DIVISÓRIAS FÍSICAS
           ============================================================

           ÚNICA ALTERAÇÃO VISUAL:

                | 1 | 2 | 3 | 4 | 5 |

           Linhas em:
           - 20%
           - 40%
           - 60%
           - 80%

           NÃO altera:
           - fundo;
           - cor;
           - texto;
           - tamanho;
           - altura;
           - posição do conteúdo;
           - borda externa;
           - paginação.

           Não usa:
           - gradient;
           - background-image;
           - pattern;
           - canvas.
           ============================================================ */

        .observacoes-documentais__lista {
            position:
                relative !important;
        }

        /*
         * Retira divisórias antigas dos filhos.
         * Evita linha dupla.
         */
        .observacoes-documentais__lista
        > .observacoes-documentais__item,

        .observacoes-documentais__lista
        > .observacoes-documentais__vazio {
            border-left:
                0 !important;
        }

        /*
         * As quatro linhas são absolutas.
         * Portanto NÃO participam do Grid.
         */
        .observacoes-documentais__divisoria {
            position:
                absolute !important;

            top:
                0 !important;

            bottom:
                0 !important;

            width:
                1px !important;

            height:
                auto !important;

            padding:
                0 !important;

            margin:
                0 !important;

            background:
                rgba(
                    154,
                    106,
                    22,
                    0.16
                ) !important;

            border:
                0 !important;

            pointer-events:
                none !important;

            z-index:
                4 !important;
        }

        .observacoes-documentais__divisoria--1 {
            left:
                20% !important;
        }

        .observacoes-documentais__divisoria--2 {
            left:
                40% !important;
        }

        .observacoes-documentais__divisoria--3 {
            left:
                60% !important;
        }

        .observacoes-documentais__divisoria--4 {
            left:
                80% !important;
        }

        @media print {

            .observacoes-documentais__lista {
                position:
                    relative !important;
            }

            .observacoes-documentais__lista
            > .observacoes-documentais__item,

            .observacoes-documentais__lista
            > .observacoes-documentais__vazio {
                border-left:
                    0 !important;
            }

            .observacoes-documentais__divisoria {
                position:
                    absolute !important;

                top:
                    0 !important;

                bottom:
                    0 !important;

                width:
                    1px !important;

                height:
                    auto !important;

                padding:
                    0 !important;

                margin:
                    0 !important;

                background:
                    rgba(
                        154,
                        106,
                        22,
                        0.16
                    ) !important;

                border:
                    0 !important;

                pointer-events:
                    none !important;

                z-index:
                    4 !important;
            }

            .observacoes-documentais__divisoria--1 {
                left:
                    20% !important;
            }

            .observacoes-documentais__divisoria--2 {
                left:
                    40% !important;
            }

            .observacoes-documentais__divisoria--3 {
                left:
                    60% !important;
            }

            .observacoes-documentais__divisoria--4 {
                left:
                    80% !important;
            }
        }

        /* ============================================================
           G9.2-R12.2H — UMA ÚNICA DIVISÓRIA
           ============================================================

           CORREÇÃO EXCLUSIVA:

           - desliga as 4 linhas absolutas adicionadas no R12.2G;
           - mantém somente UMA borda entre as células reais.

           NÃO ALTERA:
           - fundo;
           - cor;
           - título;
           - textos;
           - tamanho;
           - altura;
           - largura;
           - borda externa;
           - posição.
           ============================================================ */

        /*
         * REMOVE SOMENTE AS LINHAS EXTRAS.
         */
        .observacoes-documentais__divisoria {
            display:
                none !important;

            visibility:
                hidden !important;
        }

        /*
         * Zera divisórias internas anteriores para impedir linha dupla.
         */
        .observacoes-documentais__lista
        > .observacoes-documentais__item,

        .observacoes-documentais__lista
        > .observacoes-documentais__vazio {
            border-left:
                0 !important;
        }

        /*
         * Adiciona UMA única divisão nas células 2, 3, 4 e 5.
         */
        .observacoes-documentais__lista
        > .observacoes-documentais__item:not(:nth-child(5n + 1)),

        .observacoes-documentais__lista
        > .observacoes-documentais__vazio:not(:nth-child(5n + 1)) {
            border-left:
                1px solid rgba(154, 106, 22, 0.14) !important;
        }

        @media print {

            .observacoes-documentais__divisoria {
                display:
                    none !important;

                visibility:
                    hidden !important;
            }

            .observacoes-documentais__lista
            > .observacoes-documentais__item,

            .observacoes-documentais__lista
            > .observacoes-documentais__vazio {
                border-left:
                    0 !important;
            }

            .observacoes-documentais__lista
            > .observacoes-documentais__item:not(:nth-child(5n + 1)),

            .observacoes-documentais__lista
            > .observacoes-documentais__vazio:not(:nth-child(5n + 1)) {
                border-left:
                    1px solid rgba(154, 106, 22, 0.14) !important;
            }
        }

        /* ============================================================
           G9.2-R12.3B — SEPARAÇÃO DA AUSÊNCIA OBRIGATÓRIA
           ============================================================

           Somente aumenta o espaço entre:

           NR-XX ...
           Documento obrigatório ausente

           Não altera fonte, cor, tamanho, grid ou demais itens.
           ============================================================ */

        .observacoes-documentais__item--ausencia
        .observacoes-documentais__detalhe {
            display:
                block !important;

            margin-top:
                0.65mm !important;
        }

        @media print {

            .observacoes-documentais__item--ausencia
            .observacoes-documentais__detalhe {
                display:
                    block !important;

                margin-top:
                    0.65mm !important;
            }
        }

        /* ============================================================
           G9.2-R12.4 — LINHAS SEM QUEBRA
           ============================================================

           PADRÃO SAFE SCAN:

           Linha 1:
           NR-XX Nome completo do documento.

           Linha 2:
           Documento obrigatório ausente

           Regras:
           - cada informação fica em UMA linha;
           - bloco deslocado 0,8mm para a direita;
           - Revisar permanece no lugar;
           - nenhuma alteração de fonte ou estrutura.
           ============================================================ */

        .observacoes-documentais__conteudo {
            min-width:
                0 !important;

            width:
                100% !important;

            max-width:
                none !important;

            overflow:
                visible !important;

            transform:
                translateX(0.8mm) !important;
        }

        /*
         * TÍTULO / NR
         */
        .observacoes-documentais__documento {
            display:
                block !important;

            width:
                max-content !important;

            max-width:
                none !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        /*
         * DETALHE
         */
        .observacoes-documentais__detalhe {
            display:
                block !important;

            width:
                max-content !important;

            max-width:
                none !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        /*
         * STATUS NÃO MUDA DE POSIÇÃO.
         */
        .observacoes-documentais__estado {
            white-space:
                nowrap !important;
        }

        @media print {

            .observacoes-documentais__conteudo {
                min-width:
                    0 !important;

                width:
                    100% !important;

                max-width:
                    none !important;

                overflow:
                    visible !important;

                transform:
                    translateX(0.8mm) !important;
            }

            .observacoes-documentais__documento,
            .observacoes-documentais__detalhe {
                display:
                    block !important;

                width:
                    max-content !important;

                max-width:
                    none !important;

                white-space:
                    nowrap !important;

                overflow:
                    visible !important;

                overflow-wrap:
                    normal !important;

                word-break:
                    normal !important;

                text-overflow:
                    clip !important;
            }

            .observacoes-documentais__estado {
                white-space:
                    nowrap !important;
            }
        }

        /* ============================================================
           G9.2-R12.4B — LARGURA ÚTIL À DIREITA
           ============================================================

           CORREÇÃO EXATA:

           O início do texto NÃO muda.

           Apenas a área disponível do texto cresce 6mm
           para o lado DIREITO, aproveitando o espaço livre
           existente antes do status "Revisar".

           NÃO ALTERA:
           - posição inicial do texto;
           - fonte;
           - tamanho;
           - peso;
           - altura;
           - grid;
           - divisórias;
           - fundo;
           - Revisar;
           - status;
           - rodapé.
           ============================================================ */

        .observacoes-documentais__conteudo {
            /*
             * Corrige o R12.4 anterior:
             * não deslocar o bloco.
             */
            transform:
                none !important;

            /*
             * Mantém exatamente o mesmo início,
             * mas estende a borda direita do conteúdo.
             */
            width:
                calc(100% + 6mm) !important;

            max-width:
                none !important;

            overflow:
                visible !important;
        }

        /*
         * Linha 1:
         * NR-XX + nome completo.
         */
        .observacoes-documentais__documento {
            display:
                block !important;

            white-space:
                nowrap !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            overflow:
                visible !important;

            text-overflow:
                clip !important;

            max-width:
                none !important;
        }

        /*
         * Linha 2:
         * Documento obrigatório ausente.
         */
        .observacoes-documentais__detalhe {
            display:
                block !important;

            white-space:
                nowrap !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            overflow:
                visible !important;

            text-overflow:
                clip !important;

            max-width:
                none !important;
        }

        /*
         * Revisar continua exatamente onde já estava.
         */
        .observacoes-documentais__estado {
            white-space:
                nowrap !important;
        }

        @media print {

            .observacoes-documentais__conteudo {
                transform:
                    none !important;

                width:
                    calc(100% + 6mm) !important;

                max-width:
                    none !important;

                overflow:
                    visible !important;
            }

            .observacoes-documentais__documento,
            .observacoes-documentais__detalhe {
                white-space:
                    nowrap !important;

                overflow-wrap:
                    normal !important;

                word-break:
                    normal !important;

                overflow:
                    visible !important;

                text-overflow:
                    clip !important;

                max-width:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R12.4C — UMA LINHA TIPOGRÁFICA
           ============================================================

           PADRÃO:

           NR-XX Nome...   Documento obrigatório ausente   Revisar

           Remove exclusivamente o efeito de "escada".

           NÃO ALTERA:
           - grid de 5 colunas
           - fundo
           - divisórias
           - altura
           - borda externa
           - posição do Revisar
           ============================================================ */

        .observacoes-documentais__item {
            align-items:
                center !important;
        }

        /*
         * Documento + detalhe passam a formar UMA linha.
         */
        .observacoes-documentais__conteudo {
            display:
                flex !important;

            flex-direction:
                row !important;

            align-items:
                baseline !important;

            justify-content:
                flex-start !important;

            gap:
                1.2mm !important;

            width:
                auto !important;

            max-width:
                none !important;

            min-width:
                0 !important;

            margin:
                0 !important;

            transform:
                none !important;

            overflow:
                visible !important;

            white-space:
                nowrap !important;
        }

        .observacoes-documentais__documento {
            display:
                inline !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        .observacoes-documentais__detalhe {
            display:
                inline !important;

            width:
                auto !important;

            max-width:
                none !important;

            /*
             * cancela o espaço vertical criado anteriormente
             * para a segunda linha
             */
            margin:
                0 !important;

            margin-top:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        /*
         * A classe específica de ausência também deixa de criar
         * duas linhas.
         */
        .observacoes-documentais__conteudo--ausencia {
            display:
                flex !important;

            flex-direction:
                row !important;

            align-items:
                baseline !important;

            gap:
                1.2mm !important;
        }

        .observacoes-documentais__item--ausencia
        .observacoes-documentais__detalhe {
            margin-top:
                0 !important;
        }

        /*
         * Revisar continua em uma única linha e no mesmo lugar.
         */
        .observacoes-documentais__estado {
            align-self:
                center !important;

            white-space:
                nowrap !important;
        }

        @media print {

            .observacoes-documentais__conteudo,
            .observacoes-documentais__conteudo--ausencia {
                display:
                    flex !important;

                flex-direction:
                    row !important;

                align-items:
                    baseline !important;

                gap:
                    1.2mm !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                margin:
                    0 !important;

                transform:
                    none !important;

                overflow:
                    visible !important;

                white-space:
                    nowrap !important;
            }

            .observacoes-documentais__documento,
            .observacoes-documentais__detalhe {
                display:
                    inline !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                white-space:
                    nowrap !important;

                overflow:
                    visible !important;

                overflow-wrap:
                    normal !important;

                word-break:
                    normal !important;

                text-overflow:
                    clip !important;
            }
        }

        /* ============================================================
           G9.2-R12.4D — DUAS LINHAS DESLOCADAS
           ============================================================

           RESULTADO:

               NR-XX Nome completo do documento
               Documento obrigatório ausente

           As duas linhas:
           - continuam separadas;
           - não quebram;
           - são deslocadas JUNTAS 2.2mm para a direita.

           O status "Revisar":
           - NÃO se move.

           Não altera:
           - fonte;
           - tamanho;
           - peso;
           - altura;
           - fundo;
           - divisórias;
           - grid;
           - largura das células.
           ============================================================ */

        /*
         * RESTAURA A ORGANIZAÇÃO EM DUAS LINHAS.
         *
         * Este bloco sobrescreve o R12.4C,
         * que havia colocado documento + detalhe lado a lado.
         */
        .observacoes-documentais__conteudo,
        .observacoes-documentais__conteudo--ausencia {
            display:
                flex !important;

            flex-direction:
                column !important;

            align-items:
                flex-start !important;

            justify-content:
                center !important;

            gap:
                0.55mm !important;

            min-width:
                0 !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            /*
             * ÚNICO MOVIMENTO SOLICITADO.
             *
             * Move as DUAS linhas juntas.
             */
            transform:
                translateX(2.2mm) !important;

            overflow:
                visible !important;
        }

        /*
         * PRIMEIRA LINHA
         *
         * NR-XX Nome...
         */
        .observacoes-documentais__documento {
            display:
                block !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        /*
         * SEGUNDA LINHA
         *
         * Documento obrigatório ausente
         */
        .observacoes-documentais__detalhe {
            display:
                block !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            margin-top:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;
        }

        /*
         * Cancela especificamente qualquer regra antiga
         * que tente criar espaçamento adicional na ausência.
         */
        .observacoes-documentais__item--ausencia
        .observacoes-documentais__detalhe {
            margin-top:
                0 !important;
        }

        /*
         * REVISAR NÃO SE MOVE.
         *
         * Nenhum transform.
         */
        .observacoes-documentais__estado {
            transform:
                none !important;

            white-space:
                nowrap !important;
        }

        @media print {

            .observacoes-documentais__conteudo,
            .observacoes-documentais__conteudo--ausencia {
                display:
                    flex !important;

                flex-direction:
                    column !important;

                align-items:
                    flex-start !important;

                justify-content:
                    center !important;

                gap:
                    0.55mm !important;

                min-width:
                    0 !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                transform:
                    translateX(2.2mm) !important;

                overflow:
                    visible !important;
            }

            .observacoes-documentais__documento,
            .observacoes-documentais__detalhe {
                display:
                    block !important;

                width:
                    auto !important;

                max-width:
                    none !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                white-space:
                    nowrap !important;

                overflow:
                    visible !important;

                overflow-wrap:
                    normal !important;

                word-break:
                    normal !important;

                text-overflow:
                    clip !important;
            }

            .observacoes-documentais__item--ausencia
            .observacoes-documentais__detalhe {
                margin-top:
                    0 !important;
            }

            .observacoes-documentais__estado {
                transform:
                    none !important;

                white-space:
                    nowrap !important;
            }
        }

        /* ============================================================
           G9.2-R12.4E — REVISAR NA PRIMEIRA LINHA
           ============================================================

           RESULTADO:

           NR-XX Nome do documento                         Revisar
           Documento obrigatório ausente

           ALTERAÇÃO EXCLUSIVA:
           - subir o status para alinhar com a primeira linha.

           NÃO ALTERA:
           - NR / título;
           - detalhe;
           - fonte;
           - tamanho;
           - posição horizontal;
           - divisórias;
           - fundo;
           - grid;
           - altura.
           ============================================================ */

        .observacoes-documentais__estado {
            align-self:
                start !important;

            margin-top:
                0 !important;

            margin-bottom:
                0 !important;

            transform:
                none !important;
        }

        @media print {

            .observacoes-documentais__estado {
                align-self:
                    start !important;

                margin-top:
                    0 !important;

                margin-bottom:
                    0 !important;

                transform:
                    none !important;
            }
        }

        /* ============================================================
           G9.2-R12.4F — POSIÇÃO + ESPAÇAMENTO
           ============================================================

           SOMENTE:
           1. bloco das duas linhas +3,2mm para a direita;
           2. espaço entre as duas linhas = 1,0mm.

           Nenhuma outra propriedade visual é alterada.
           ============================================================ */

        .observacoes-documentais__conteudo,
        .observacoes-documentais__conteudo--ausencia {
            transform:
                translateX(3.2mm) !important;

            gap:
                1mm !important;
        }

        @media print {

            .observacoes-documentais__conteudo,
            .observacoes-documentais__conteudo--ausencia {
                transform:
                    translateX(3.2mm) !important;

                gap:
                    1mm !important;
            }
        }

        /* ============================================================
           G9.2-R12.4G — BLOCO DIRETO
           ============================================================

           Ajuste aplicado diretamente em:
           .observacoes-documentais__conteudo

           - left: 5mm
           - row-gap: 1.2mm

           Nenhuma nova regra CSS visual adicionada.
           ============================================================ */

        /* ============================================================
           R12.4J.1 — GRID SEM COLUNA MORTA
           ============================================================

           DUAS ALTERAÇÕES EXCLUSIVAS:

           1. REMOVE ESPAÇO MORTO À ESQUERDA
              Antes:
                  1.8mm | conteúdo | Revisar
                    ↑
                  coluna antiga da bolinha

              Agora:
                  conteúdo | Revisar

           2. CENTRALIZA VERTICALMENTE O CONTEÚDO
              dentro do retângulo.

           NÃO ALTERA:
           - texto;
           - fonte;
           - tamanho;
           - Revisar;
           - fundo;
           - divisórias;
           - altura;
           - quantidade de colunas externas.
           ============================================================ */

        .observacoes-documentais__item {
            /*
             * A bolinha não é mais usada.
             * Portanto a primeira coluna fixa de 1.8mm deixa de existir.
             */
            grid-template-columns:
                minmax(0, 1fr)
                auto !important;

            /*
             * Centralização vertical REAL dos filhos da célula.
             */
            align-items:
                center !important;

            /*
             * Mantém apenas a distância necessária
             * entre o texto e Revisar.
             */
            column-gap:
                1.2mm !important;
        }

        /*
         * Segurança:
         * a antiga bolinha não ocupa nenhuma posição do Grid.
         */
        .observacoes-documentais__ponto {
            display:
                none !important;
        }

        /*
         * Centraliza somente o bloco textual na altura da célula.
         */
        .observacoes-documentais__conteudo {
            align-self:
                center !important;
        }

        @media print {

            .observacoes-documentais__item {
                grid-template-columns:
                    minmax(0, 1fr)
                    auto !important;

                align-items:
                    center !important;

                column-gap:
                    1.2mm !important;
            }

            .observacoes-documentais__ponto {
                display:
                    none !important;
            }

            .observacoes-documentais__conteudo {
                align-self:
                    center !important;
            }
        }

        /* ============================================================
           R12.5-FINAL-ATENCOES
           ============================================================

           FONTE ÚNICA DE VERDADE PARA O CONTEÚDO DAS CÉLULAS.

           Objetivo visual:

           | NR-01 Integração / Mobilização SST.        Revisar |
           | Documento obrigatório ausente                      |

           - texto próximo da divisória esquerda;
           - duas linhas separadas;
           - bloco centralizado SOMENTE verticalmente;
           - Revisar no extremo direito;
           - nenhuma coluna reservada para bolinha.
           ============================================================ */

        html body .observacoes-documentais__item {

            display:
                grid !important;

            grid-template-columns:
                minmax(0, 1fr)
                auto !important;

            /*
             * CENTRO VERTICAL.
             */
            align-items:
                center !important;

            /*
             * O item ocupa fisicamente toda a célula.
             */
            align-self:
                stretch !important;

            justify-self:
                stretch !important;

            width:
                100% !important;

            height:
                100% !important;

            min-width:
                0 !important;

            box-sizing:
                border-box !important;

            /*
             * ECONOMIA DO ESPAÇO DA ESQUERDA.
             *
             * Apenas 0,6mm entre divisória e texto.
             */
            padding-left:
                0.2mm !important;

            padding-right:
                0.6mm !important;

            /*
             * Espaço somente entre texto e Revisar.
             */
            column-gap:
                1.2mm !important;

            margin:
                0 !important;

            position:
                relative !important;
        }

        /*
         * A bolinha antiga deixa de existir visualmente
         * e NÃO reserva espaço no Grid.
         */
        html body .observacoes-documentais__ponto {

            display:
                none !important;

            width:
                0 !important;

            height:
                0 !important;

            margin:
                0 !important;

            padding:
                0 !important;
        }

        /*
         * BLOCO COM AS DUAS LINHAS.
         */
        html body .observacoes-documentais__conteudo,
        html body .observacoes-documentais__conteudo--ausencia {

            display:
                flex !important;

            flex-direction:
                column !important;

            /*
             * Não centraliza horizontalmente.
             */
            align-items:
                flex-start !important;

            /*
             * Centro dentro da própria altura.
             */
            justify-content:
                center !important;

            /*
             * Centro vertical dentro do item.
             */
            align-self:
                center !important;

            /*
             * Ocupa toda a coluna disponível,
             * mas o texto começa à esquerda.
             */
            justify-self:
                stretch !important;

            width:
                100% !important;

            min-width:
                0 !important;

            max-width:
                none !important;

            /*
             * Separação real entre:
             * NR
             * Documento obrigatório ausente
             */
            row-gap:
                1.35mm !important;

            margin:
                0 !important;

            padding:
                0 !important;

            position:
                static !important;

            left:
                auto !important;

            right:
                auto !important;

            top:
                auto !important;

            bottom:
                auto !important;

            transform:
                none !important;

            text-align:
                left !important;

            overflow:
                visible !important;
        }

        /*
         * PRIMEIRA LINHA — NR / documento.
         */
        html body .observacoes-documentais__documento {

            display:
                block !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;

            text-align:
                left !important;
        }

        /*
         * SEGUNDA LINHA.
         */
        html body .observacoes-documentais__detalhe {

            display:
                block !important;

            width:
                auto !important;

            max-width:
                none !important;

            margin:
                0 !important;

            margin-top:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            overflow:
                visible !important;

            overflow-wrap:
                normal !important;

            word-break:
                normal !important;

            text-overflow:
                clip !important;

            text-align:
                left !important;
        }

        /*
         * STATUS.
         *
         * Não participa do movimento do texto.
         */
        html body .observacoes-documentais__estado {

            align-self:
                center !important;

            justify-self:
                end !important;

            margin:
                0 !important;

            position:
                static !important;

            transform:
                none !important;

            white-space:
                nowrap !important;
        }

        @media print {

            html body .observacoes-documentais__item {

                display:
                    grid !important;

                grid-template-columns:
                    minmax(0, 1fr)
                    auto !important;

                align-items:
                    center !important;

                align-self:
                    stretch !important;

                justify-self:
                    stretch !important;

                width:
                    100% !important;

                height:
                    100% !important;

                padding-left:
                    0.2mm !important;

                padding-right:
                    0.6mm !important;

                column-gap:
                    1.2mm !important;
            }

            html body .observacoes-documentais__ponto {

                display:
                    none !important;
            }

            html body .observacoes-documentais__conteudo,
            html body .observacoes-documentais__conteudo--ausencia {

                display:
                    flex !important;

                flex-direction:
                    column !important;

                align-items:
                    flex-start !important;

                justify-content:
                    center !important;

                align-self:
                    center !important;

                justify-self:
                    stretch !important;

                width:
                    100% !important;

                row-gap:
                    1.35mm !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                position:
                    static !important;

                transform:
                    none !important;

                text-align:
                    left !important;
            }

            html body .observacoes-documentais__documento,
            html body .observacoes-documentais__detalhe {

                display:
                    block !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                white-space:
                    nowrap !important;

                overflow-wrap:
                    normal !important;

                word-break:
                    normal !important;

                text-align:
                    left !important;
            }

            html body .observacoes-documentais__estado {

                align-self:
                    center !important;

                justify-self:
                    end !important;

                margin:
                    0 !important;

                position:
                    static !important;

                transform:
                    none !important;

                white-space:
                    nowrap !important;
            }
        }

        /* ============================================================
           R12.8-COMPUTED-FIX
           ============================================================

           CORREÇÃO BASEADA NO COMPUTED STYLE REAL DO IFRAME.

           MEDIDO ANTES:
           ------------------------------------------------------------
           ITEM grid:
               14.3576px | 138.16px | 41.5625px

           esquerda ITEM -> CONTEUDO:
               23.78px

           composição:
               padding-left  = 6.047px
               coluna morta  = 14.358px
               column-gap    = 3.402px

           distância NR -> detalhe:
               1.11px

           conteúdo:
               translateY(-2.07874px)

           OBJETIVO:
           ------------------------------------------------------------
           - eliminar somente a coluna morta;
           - reduzir recuo esquerdo para 0.8mm;
           - aumentar distância vertical para 0.9mm;
           - remover deslocamento vertical artificial;
           - manter Revisar.
           ============================================================ */


        /*
         * ============================================================
         * ITEM REAL
         * ============================================================
         *
         * Seletor propositalmente específico para vencer
         * os overrides antigos com !important.
         */

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item.observacoes-documentais__item {

            /*
             * ERA:
             *
             * 3.8mm | conteúdo | estado
             *
             * AGORA:
             *
             * conteúdo | estado
             */
            grid-template-columns:
                minmax(0, 1fr)
                auto !important;

            /*
             * 0.8mm ~= 3.02px.
             *
             * Antes eram 23.78px até o texto.
             */
            padding-left:
                0.8mm !important;

            /*
             * Preserva o lado direito atual.
             * Computed atual = 6.047px ~= 1.6mm.
             */
            padding-right:
                1.6mm !important;

            /*
             * Mantém a distância atual texto -> Revisar.
             */
            column-gap:
                0.9mm !important;

            /*
             * Centro vertical real.
             */
            align-items:
                center !important;

            align-self:
                stretch !important;

            justify-self:
                stretch !important;

            width:
                100% !important;

            box-sizing:
                border-box !important;
        }


        /*
         * ============================================================
         * BOLINHA ANTIGA
         * ============================================================
         *
         * Continua sem renderização e agora também não existe
         * coluna reservada para ela.
         */

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item
        >
        .observacoes-documentais__ponto {

            display:
                none !important;

            width:
                0 !important;

            height:
                0 !important;

            margin:
                0 !important;

            padding:
                0 !important;
        }


        /*
         * ============================================================
         * BLOCO NR + DETALHE
         * ============================================================
         */

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item
        >
        .observacoes-documentais__conteudo.observacoes-documentais__conteudo,

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item
        >
        .observacoes-documentais__conteudo--ausencia {

            display:
                flex !important;

            flex-direction:
                column !important;

            /*
             * DUAS LINHAS:
             *
             * NR...
             *
             * Documento obrigatório ausente
             */
            gap:
                0.9mm
                0 !important;

            row-gap:
                0.9mm !important;

            column-gap:
                0 !important;

            align-items:
                flex-start !important;

            justify-content:
                center !important;

            align-self:
                center !important;

            justify-self:
                stretch !important;

            width:
                100% !important;

            min-width:
                0 !important;

            max-width:
                none !important;

            margin:
                0 !important;

            padding:
                0 !important;

            /*
             * REMOVE O -2.07874px MEDIDO.
             */
            transform:
                none !important;

            position:
                static !important;

            left:
                auto !important;

            right:
                auto !important;

            top:
                auto !important;

            bottom:
                auto !important;

            text-align:
                left !important;

            overflow:
                visible !important;
        }


        /*
         * ============================================================
         * PRIMEIRA LINHA
         * ============================================================
         */

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item
        .observacoes-documentais__documento {

            display:
                block !important;

            margin:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            transform:
                none !important;
        }


        /*
         * ============================================================
         * SEGUNDA LINHA
         * ============================================================
         *
         * O computed style mostrou:
         *
         * margin-top = 0.566929px
         *
         * Isso estava somando com o gap.
         *
         * Agora a distância é controlada SOMENTE pelo row-gap.
         */

        html
        body
        main.relatorio-root[data-consolidacao-relatorio]
        [data-pagina-relatorio]
        .rodape-relatorio-bloco
        .observacoes-documentais
        .observacoes-documentais__lista
        >
        article.observacoes-documentais__item
        .observacoes-documentais__detalhe {

            display:
                block !important;

            margin:
                0 !important;

            margin-top:
                0 !important;

            padding:
                0 !important;

            white-space:
                nowrap !important;

            transform:
                none !important;
        }


        /*
         * ============================================================
         * PRINT
         * ============================================================
         *
         * Mesmo resultado na impressão.
         */

        @media print {

            html
            body
            main.relatorio-root[data-consolidacao-relatorio]
            [data-pagina-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            >
            article.observacoes-documentais__item.observacoes-documentais__item {

                grid-template-columns:
                    minmax(0, 1fr)
                    auto !important;

                padding-left:
                    0.8mm !important;

                padding-right:
                    1.6mm !important;

                column-gap:
                    0.9mm !important;

                align-items:
                    center !important;

                align-self:
                    stretch !important;

                justify-self:
                    stretch !important;

                width:
                    100% !important;
            }

            html
            body
            main.relatorio-root[data-consolidacao-relatorio]
            [data-pagina-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            >
            article.observacoes-documentais__item
            >
            .observacoes-documentais__conteudo.observacoes-documentais__conteudo,

            html
            body
            main.relatorio-root[data-consolidacao-relatorio]
            [data-pagina-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            >
            article.observacoes-documentais__item
            >
            .observacoes-documentais__conteudo--ausencia {

                display:
                    flex !important;

                flex-direction:
                    column !important;

                gap:
                    0.9mm
                    0 !important;

                row-gap:
                    0.9mm !important;

                align-items:
                    flex-start !important;

                justify-content:
                    center !important;

                align-self:
                    center !important;

                justify-self:
                    stretch !important;

                width:
                    100% !important;

                margin:
                    0 !important;

                padding:
                    0 !important;

                transform:
                    none !important;

                position:
                    static !important;
            }

            html
            body
            main.relatorio-root[data-consolidacao-relatorio]
            [data-pagina-relatorio]
            .rodape-relatorio-bloco
            .observacoes-documentais
            .observacoes-documentais__lista
            >
            article.observacoes-documentais__item
            .observacoes-documentais__detalhe {

                margin:
                    0 !important;

                margin-top:
                    0 !important;
            }
        }
</style>
            </head>

            <body>
                <main
                    class="relatorio-root"
                    data-consolidacao-relatorio
                    data-schema="${CONSOLIDACAO_COLABORADOR_RELATORIO_HTML_SCHEMA_VERSION}"
                    data-total-paginas="${totalPaginas}"
                    data-selecao-id="${escaparHtml(
                        exportacao
                            ?.selecaoId ||
                        ""
                    )}"
                >
                    ${paginasHtml}
                </main>
            </body>
        </html>
    `;
}
/* ============================================================
   G9.2-R9B-R3 — TABELA LIMPA
   ============================================================ */

/*
 * PDF:
 * - categoria/código removidos;
 * - cápsulas de Situação e Conferência removidas;
 * - valores textuais preservados.
 */
