const TABELA_CERTIFICADOS_EVIDENCIAS =
    "certificados_evidencias";

export const TIPOS_EVIDENCIA_CORRENTE =
    Object.freeze([
        "certificado_individual",
        "lista_presenca",
        "evidencia_complementar",
    ]);

export const TIPOS_EVIDENCIA_LEGADA =
    Object.freeze([
        "documento_principal_legado",
        "versao_historica_legada",
    ]);

export const TIPOS_EVIDENCIA_LEITURA =
    Object.freeze([
        ...TIPOS_EVIDENCIA_CORRENTE,
        ...TIPOS_EVIDENCIA_LEGADA,
    ]);

const CAMPOS_EVIDENCIA = [
    "id",
    "certificado_origem_id",
    "certificado_historico_origem_id",
    "colaborador_id",
    "treinamento_id",
    "treinamento_codigo",
    "tipo_treinamento",
    "nome_treinamento",
    "data_realizacao",
    "data_vencimento",
    "tipo_evidencia",
    "arquivo_url",
    "arquivo_nome",
    "arquivo_sha256",
    "arquivo_substituto_url",
    "observacao",
    "status_validacao",
    "principal",
    "historica",
    "origem",
    "origem_legada_tabela",
    "origem_legada_id",
    "created_by",
    "created_at",
    "updated_at",
].join(",");

function textoSeguro(valor = "") {
    return String(
        valor ?? ""
    ).trim();
}

function textoOuNull(valor = "") {
    const texto =
        textoSeguro(valor);

    return texto || null;
}

function validarSupabase(supabase) {
    if (
        !supabase ||
        typeof supabase.from !== "function"
    ) {
        throw new Error(
            "Cliente Supabase não informado para evidências de certificados."
        );
    }
}

function uuidSeguro(
    valor,
    {
        opcional = false,
        rotulo = "UUID",
    } = {}
) {
    const uuid =
        textoSeguro(valor)
            .toLowerCase();

    if (!uuid && opcional) {
        return null;
    }

    if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
            uuid
        )
    ) {
        throw new Error(
            `${rotulo} inválido.`
        );
    }

    return uuid;
}

function inteiroPositivo(
    valor,
    rotulo
) {
    const numero =
        Number(valor);

    if (
        !Number.isInteger(numero) ||
        numero <= 0
    ) {
        throw new Error(
            `${rotulo} inválido.`
        );
    }

    return numero;
}

function dataIsoOuNull(
    valor,
    rotulo
) {
    const texto =
        textoSeguro(valor);

    if (!texto) {
        return null;
    }

    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            texto
        )
    ) {
        throw new Error(
            `${rotulo} inválida.`
        );
    }

    const data =
        new Date(
            `${texto}T00:00:00.000Z`
        );

    if (
        Number.isNaN(data.getTime()) ||
        data.toISOString().slice(0, 10) !==
            texto
    ) {
        throw new Error(
            `${rotulo} inválida.`
        );
    }

    return texto;
}

function booleanoSeguro(
    valor,
    padrao = false
) {
    if (
        valor === undefined ||
        valor === null ||
        valor === ""
    ) {
        return padrao;
    }

    if (
        valor === true ||
        valor === false
    ) {
        return valor;
    }

    if (
        valor === 1 ||
        valor === "1" ||
        valor === "true"
    ) {
        return true;
    }

    if (
        valor === 0 ||
        valor === "0" ||
        valor === "false"
    ) {
        return false;
    }

    throw new Error(
        "Valor booleano inválido."
    );
}

function normalizarIds(
    certificadoIds = []
) {
    const entrada =
        Array.isArray(certificadoIds)
            ? certificadoIds
            : [certificadoIds];

    return Array.from(
        new Set(
            entrada
                .map(textoSeguro)
                .filter(Boolean)
        )
    );
}

export function tipoEvidenciaCorrentePermitido(
    tipo = ""
) {
    return TIPOS_EVIDENCIA_CORRENTE.includes(
        textoSeguro(tipo)
            .toLowerCase()
    );
}

export function normalizarEvidenciaCertificado(
    registro = {}
) {
    const tipoEvidencia =
        textoSeguro(
            registro?.tipo_evidencia ||
            registro?.tipoEvidencia
        ).toLowerCase();

    const codigo =
        Number(
            registro?.treinamento_codigo ??
            registro?.treinamentoCodigo ??
            0
        );

    return {
        id:
            textoOuNull(
                registro?.id
            ),

        certificadoOrigemId:
            textoOuNull(
                registro?.certificado_origem_id ||
                registro?.certificadoOrigemId
            ),

        certificadoHistoricoOrigemId:
            textoOuNull(
                registro?.certificado_historico_origem_id ||
                registro?.certificadoHistoricoOrigemId
            ),

        colaboradorId:
            textoOuNull(
                registro?.colaborador_id ||
                registro?.colaboradorId
            ),

        treinamentoId:
            textoOuNull(
                registro?.treinamento_id ||
                registro?.treinamentoId
            ),

        treinamentoCodigo:
            Number.isFinite(codigo) &&
            codigo > 0
                ? codigo
                : null,

        tipoTreinamento:
            textoOuNull(
                registro?.tipo_treinamento ||
                registro?.tipoTreinamento
            ),

        nomeTreinamento:
            textoOuNull(
                registro?.nome_treinamento ||
                registro?.nomeTreinamento
            ),

        dataRealizacao:
            textoOuNull(
                registro?.data_realizacao ||
                registro?.dataRealizacao
            ),

        dataVencimento:
            textoOuNull(
                registro?.data_vencimento ||
                registro?.dataVencimento
            ),

        tipoEvidencia,

        tipoEvidenciaReconhecido:
            TIPOS_EVIDENCIA_LEITURA.includes(
                tipoEvidencia
            ),

        arquivoUrl:
            textoOuNull(
                registro?.arquivo_url ||
                registro?.arquivoUrl
            ),

        arquivoNome:
            textoOuNull(
                registro?.arquivo_nome ||
                registro?.arquivoNome
            ),

        arquivoSha256:
            textoOuNull(
                registro?.arquivo_sha256 ||
                registro?.arquivoSha256
            ),

        arquivoSubstitutoUrl:
            textoOuNull(
                registro?.arquivo_substituto_url ||
                registro?.arquivoSubstitutoUrl
            ),

        observacao:
            textoOuNull(
                registro?.observacao
            ),

        statusValidacao:
            textoOuNull(
                registro?.status_validacao ||
                registro?.statusValidacao
            ),

        principal:
            booleanoSeguro(
                registro?.principal,
                false
            ),

        historica:
            booleanoSeguro(
                registro?.historica,
                false
            ),

        origem:
            textoOuNull(
                registro?.origem
            ),

        origemLegadaTabela:
            textoOuNull(
                registro?.origem_legada_tabela ||
                registro?.origemLegadaTabela
            ),

        origemLegadaId:
            textoOuNull(
                registro?.origem_legada_id ||
                registro?.origemLegadaId
            ),

        createdBy:
            textoOuNull(
                registro?.created_by ||
                registro?.createdBy
            ),

        createdAt:
            textoOuNull(
                registro?.created_at ||
                registro?.createdAt
            ),

        updatedAt:
            textoOuNull(
                registro?.updated_at ||
                registro?.updatedAt
            ),
    };
}

function ordenarConsulta(consulta) {
    return consulta
        .order(
            "principal",
            {
                ascending: false,
            }
        )
        .order(
            "created_at",
            {
                ascending: false,
            }
        );
}

export async function listarEvidenciasCertificadoService({
    supabase,
    certificadoId,
    incluirHistoricas = false,
} = {}) {
    validarSupabase(supabase);

    const id =
        textoSeguro(certificadoId);

    if (!id) {
        return [];
    }

    let consulta =
        supabase
            .from(
                TABELA_CERTIFICADOS_EVIDENCIAS
            )
            .select(
                CAMPOS_EVIDENCIA
            )
            .eq(
                "certificado_origem_id",
                id
            );

    if (!incluirHistoricas) {
        consulta =
            consulta.eq(
                "historica",
                false
            );
    }

    const {
        data,
        error,
    } =
        await ordenarConsulta(
            consulta
        );

    if (error) {
        throw new Error(
            `Erro ao carregar evidências do certificado: ${error.message}`
        );
    }

    return Array.isArray(data)
        ? data.map(
            normalizarEvidenciaCertificado
        )
        : [];
}

export async function listarEvidenciasCertificadosEmLoteService({
    supabase,
    certificadoIds = [],
    incluirHistoricas = false,
} = {}) {
    validarSupabase(supabase);

    const ids =
        normalizarIds(
            certificadoIds
        );

    if (!ids.length) {
        return [];
    }

    let consulta =
        supabase
            .from(
                TABELA_CERTIFICADOS_EVIDENCIAS
            )
            .select(
                CAMPOS_EVIDENCIA
            )
            .in(
                "certificado_origem_id",
                ids
            );

    if (!incluirHistoricas) {
        consulta =
            consulta.eq(
                "historica",
                false
            );
    }

    const {
        data,
        error,
    } =
        await ordenarConsulta(
            consulta
        );

    if (error) {
        throw new Error(
            `Erro ao carregar evidências dos certificados: ${error.message}`
        );
    }

    return Array.isArray(data)
        ? data.map(
            normalizarEvidenciaCertificado
        )
        : [];
}

function montarPayloadEvidenciaCorrente(
    evidencia = {}
) {
    const tipoEvidencia =
        textoSeguro(
            evidencia?.tipoEvidencia ||
            evidencia?.tipo_evidencia
        ).toLowerCase();

    if (
        !tipoEvidenciaCorrentePermitido(
            tipoEvidencia
        )
    ) {
        throw new Error(
            "Tipo de evidência não permitido para registro corrente."
        );
    }

    if (
        booleanoSeguro(
            evidencia?.historica,
            false
        )
    ) {
        throw new Error(
            "O cliente não pode registrar evidência histórica."
        );
    }

    const origem =
        textoSeguro(
            evidencia?.origem ||
            "upload"
        ).toLowerCase();

    if (origem !== "upload") {
        throw new Error(
            "A origem de uma evidência corrente criada pelo cliente deve ser upload."
        );
    }

    const marcadoresLegados = [
        evidencia?.certificadoHistoricoOrigemId,
        evidencia?.certificado_historico_origem_id,
        evidencia?.arquivoSubstitutoUrl,
        evidencia?.arquivo_substituto_url,
        evidencia?.origemLegadaTabela,
        evidencia?.origem_legada_tabela,
        evidencia?.origemLegadaId,
        evidencia?.origem_legada_id,
    ];

    if (
        marcadoresLegados.some(
            (valor) =>
                textoSeguro(valor)
        )
    ) {
        throw new Error(
            "Marcadores históricos/legados não podem ser enviados pelo registro corrente."
        );
    }

    const arquivoUrl =
        textoSeguro(
            evidencia?.arquivoUrl ||
            evidencia?.arquivo_url
        );

    if (!arquivoUrl) {
        throw new Error(
            "Arquivo da evidência não informado."
        );
    }

    return {
        certificado_origem_id:
            uuidSeguro(
                evidencia?.certificadoOrigemId ||
                evidencia?.certificado_origem_id,
                {
                    rotulo:
                        "Certificado de origem",
                }
            ),

        certificado_historico_origem_id:
            null,

        colaborador_id:
            uuidSeguro(
                evidencia?.colaboradorId ||
                evidencia?.colaborador_id,
                {
                    rotulo:
                        "Colaborador",
                }
            ),

        treinamento_id:
            uuidSeguro(
                evidencia?.treinamentoId ||
                evidencia?.treinamento_id,
                {
                    opcional: true,
                    rotulo:
                        "Treinamento UUID",
                }
            ),

        treinamento_codigo:
            inteiroPositivo(
                evidencia?.treinamentoCodigo ??
                evidencia?.treinamento_codigo,
                "Código do treinamento"
            ),

        tipo_treinamento:
            textoOuNull(
                evidencia?.tipoTreinamento ||
                evidencia?.tipo_treinamento
            ),

        nome_treinamento:
            textoOuNull(
                evidencia?.nomeTreinamento ||
                evidencia?.nome_treinamento
            ),

        data_realizacao:
            dataIsoOuNull(
                evidencia?.dataRealizacao ||
                evidencia?.data_realizacao,
                "Data de realização"
            ),

        data_vencimento:
            dataIsoOuNull(
                evidencia?.dataVencimento ||
                evidencia?.data_vencimento,
                "Data de vencimento"
            ),

        tipo_evidencia:
            tipoEvidencia,

        arquivo_url:
            arquivoUrl,

        arquivo_nome:
            textoOuNull(
                evidencia?.arquivoNome ||
                evidencia?.arquivo_nome
            ),

        arquivo_substituto_url:
            null,

        observacao:
            textoOuNull(
                evidencia?.observacao
            ),

        status_validacao:
            textoOuNull(
                evidencia?.statusValidacao ||
                evidencia?.status_validacao
            ) ||
            "Pendente de verificação",

        principal:
            booleanoSeguro(
                evidencia?.principal,
                false
            ),

        historica:
            false,

        origem:
            "upload",

        origem_legada_tabela:
            null,

        origem_legada_id:
            null,
    };
}

function normalizarArquivoSha256(
    valor,
    {
        opcional = true,
    } = {}
) {
    const sha =
        textoSeguro(valor)
            .toLowerCase();

    if (!sha) {
        if (opcional) {
            return null;
        }

        throw new Error(
            "SHA-256 do arquivo não informado."
        );
    }

    if (
        !/^[0-9a-f]{64}$/.test(
            sha
        )
    ) {
        throw new Error(
            "SHA-256 do arquivo deve possuir 64 caracteres hexadecimais."
        );
    }

    return sha;
}

export async function calcularSha256ArquivoCertificadoService(
    arquivo = null
) {
    if (
        !arquivo ||
        typeof arquivo.arrayBuffer !==
            "function"
    ) {
        throw new Error(
            "Arquivo inválido para cálculo SHA-256."
        );
    }

    const cryptoApi =
        globalThis.crypto;

    if (
        !cryptoApi?.subtle ||
        typeof cryptoApi.subtle.digest !==
            "function"
    ) {
        throw new Error(
            "Web Crypto SHA-256 indisponível neste ambiente."
        );
    }

    const bytes =
        await arquivo.arrayBuffer();

    const digest =
        await cryptoApi.subtle.digest(
            "SHA-256",
            bytes
        );

    return Array.from(
        new Uint8Array(
            digest
        )
    )
        .map((byte) =>
            byte
                .toString(16)
                .padStart(
                    2,
                    "0"
                )
        )
        .join("");
}

export async function buscarEvidenciaCorrentePorSha256Service({
    supabase,
    colaboradorId,
    treinamentoCodigo,
    dataRealizacao,
    tipoEvidencia,
    arquivoSha256,
} = {}) {
    validarSupabase(
        supabase
    );

    const colaboradorIdSeguro =
        uuidSeguro(
            colaboradorId,
            {
                rotulo:
                    "Colaborador",
            }
        );

    const treinamentoCodigoSeguro =
        inteiroPositivo(
            treinamentoCodigo,
            "Código do treinamento"
        );

    const dataRealizacaoSegura =
        dataIsoOuNull(
            dataRealizacao,
            "Data de realização"
        );

    if (!dataRealizacaoSegura) {
        throw new Error(
            "Data de realização é obrigatória para localizar evidência por SHA-256."
        );
    }

    const tipoSeguro =
        textoSeguro(
            tipoEvidencia
        ).toLowerCase();

    if (
        !tipoEvidenciaCorrentePermitido(
            tipoSeguro
        )
    ) {
        throw new Error(
            "Tipo de evidência inválido para busca SHA-256."
        );
    }

    const shaSeguro =
        normalizarArquivoSha256(
            arquivoSha256,
            {
                opcional:
                    false,
            }
        );

    const {
        data,
        error,
    } =
        await supabase
            .from(
                TABELA_CERTIFICADOS_EVIDENCIAS
            )
            .select(
                CAMPOS_EVIDENCIA
            )
            .eq(
                "historica",
                false
            )
            .eq(
                "colaborador_id",
                colaboradorIdSeguro
            )
            .eq(
                "treinamento_codigo",
                treinamentoCodigoSeguro
            )
            .eq(
                "data_realizacao",
                dataRealizacaoSegura
            )
            .eq(
                "tipo_evidencia",
                tipoSeguro
            )
            .eq(
                "arquivo_sha256",
                shaSeguro
            )
            .order(
                "created_at",
                {
                    ascending:
                        true,
                }
            )
            .limit(
                1
            );

    if (error) {
        throw new Error(
            `Erro ao localizar evidência por SHA-256: ${error.message}`
        );
    }

    const registro =
        Array.isArray(data)
            ? data[0] || null
            : null;

    return registro
        ? normalizarEvidenciaCertificado(
            registro
        )
        : null;
}

export async function registrarEvidenciaCorrenteCertificadoService({
    supabase,
    evidencia,
} = {}) {
    validarSupabase(
        supabase
    );

    const payload =
        montarPayloadEvidenciaCorrente(
            evidencia || {}
        );

    const arquivoSha256 =
        normalizarArquivoSha256(
            evidencia?.arquivoSha256 ||
            evidencia?.arquivo_sha256,
            {
                opcional:
                    true,
            }
        );

    const parametros = {
        p_certificado_origem_id:
            payload.certificado_origem_id,

        p_colaborador_id:
            payload.colaborador_id,

        p_treinamento_codigo:
            payload.treinamento_codigo,

        p_tipo_evidencia:
            payload.tipo_evidencia,

        p_arquivo_url:
            payload.arquivo_url,

        p_treinamento_id:
            payload.treinamento_id,

        p_tipo_treinamento:
            payload.tipo_treinamento,

        p_nome_treinamento:
            payload.nome_treinamento,

        p_data_realizacao:
            payload.data_realizacao,

        p_data_vencimento:
            payload.data_vencimento,

        p_arquivo_nome:
            payload.arquivo_nome,

        p_observacao:
            payload.observacao,

        p_status_validacao:
            payload.status_validacao,

        p_principal:
            payload.principal,
    };

    const rpc =
        arquivoSha256
            ? "registrar_certificado_evidencia_corrente_sha256"
            : "registrar_certificado_evidencia_corrente";

    if (arquivoSha256) {
        parametros.p_arquivo_sha256 =
            arquivoSha256;
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            rpc,
            parametros
        );

    if (error) {
        throw new Error(
            `Erro ao registrar evidência atômica do certificado: ${error.message}`
        );
    }

    const registro =
        Array.isArray(data)
            ? data[0] || null
            : data || null;

    if (!registro) {
        throw new Error(
            "A RPC de evidências não retornou o registro salvo."
        );
    }

    return normalizarEvidenciaCertificado(
        registro
    );
}
