import { montarUrlPublicaSistema } from "../utils/urlPublicaUtils.js";

const CHAVE_EXTINTORES_VISTORIA = "safescan:vistoria:extintores:v1";
const CHAVE_INSPECOES_EXTINTORES = "safescan:vistoria:inspecoes:v1";
const CHAVE_MANUTENCOES_EXTINTORES = "safescan:vistoria:manutencoes:v1";

export const SITUACOES_EXTINTOR = [
    "Em operação",
    "Em inspeção",
    "Em manutenção",
    "Em recarga",
    "Aguardando retorno",
    "Baixado",
];

export const TIPOS_SERVICO_EXTINTOR = [
    { valor: "Inspeção técnica", situacao: "Em inspeção" },
    { valor: "Manutenção de 1º nível", situacao: "Em manutenção" },
    { valor: "Manutenção de 2º nível / recarga", situacao: "Em recarga" },
    { valor: "Manutenção de 3º nível / ensaio hidrostático", situacao: "Em manutenção" },
    { valor: "Recarga após uso ou perda de carga", situacao: "Em recarga" },
];

const POSICOES_INICIAIS = [
    { top: 18, left: 20 }, { top: 28, left: 52 }, { top: 42, left: 76 }, { top: 58, left: 30 }, { top: 72, left: 62 },
    { top: 82, left: 16 }, { top: 34, left: 24 }, { top: 48, left: 58 }, { top: 66, left: 82 }, { top: 86, left: 48 },
];

export const ITENS_CHECKLIST_EXTINTOR_MENSAL = [
    { id: "acesso", label: "Acesso livre e sinalização visível" },
    { id: "suporte", label: "Fixação, suporte e altura adequados" },
    { id: "lacres", label: "Lacre, pino e selo sem violação" },
    { id: "pressao", label: "Indicador de pressão na faixa verde" },
    { id: "mangueira", label: "Mangueira, esguicho e difusor íntegros" },
    { id: "casco", label: "Casco sem amassado, corrosão ou vazamento" },
    { id: "validade", label: "Validade e identificação legíveis" },
];

export const TIPOS_EXTINTORES_BRASIL = [
    { valor: "PQS ABC", label: "Pó químico seco ABC" },
    { valor: "PQS BC", label: "Pó químico seco BC" },
    { valor: "CO2", label: "Dióxido de carbono (CO2)" },
    { valor: "Água Pressurizada", label: "Água pressurizada" },
    { valor: "Espuma Mecânica", label: "Espuma mecânica" },
];

export function proximoCodigoExtintor(extintores = listarExtintoresVistoria()) {
    const numeros = extintores.map((item) => Number(String(item.codigo || "").replace(/\D/g, ""))).filter(Number.isFinite);
    let proximo = 1;
    while (numeros.includes(proximo)) proximo += 1;
    return `E-${String(proximo).padStart(2, "0")}`;
}

function normalizarCodigoExtintor(codigo) {
    const numero = Number(String(codigo || "").replace(/\D/g, ""));
    return Number.isFinite(numero) && numero > 0
        ? `E-${String(numero).padStart(2, "0")}`
        : String(codigo || "");
}

function lerJson(chave, fallback) {
    if (typeof window === "undefined") return fallback;
    try { return JSON.parse(window.localStorage.getItem(chave) || "null") || fallback; } catch { return fallback; }
}

function salvarJson(chave, valor) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(chave, JSON.stringify(valor));
}

export function criarExtintoresIniciais() {
    return Array.from({ length: 20 }, (_, indice) => {
        const numero = indice + 1;
        return {
            id: `extintor-${numero}`,
            codigo: `E-${String(numero).padStart(2, "0")}`,
            tokenQr: `ext-${numero}-${Math.random().toString(36).slice(2, 10)}`,
            pontoId: "",
            ponto: "",
            localizacao: numero <= 10 ? "Escritório e apoio" : "Frente de obra",
            tipo: numero % 2 === 0 ? "PQS ABC" : "CO2",
            capacidade: "6 kg",
            status: "Ativo",
            situacaoOperacional: "Em operação",
            dataAquisicao: "",
            fabricante: "",
            numeroSerie: "",
            posicao: POSICOES_INICIAIS[(numero - 1) % POSICOES_INICIAIS.length],
            criadoEm: new Date().toISOString(),
        };
    });
}

export function listarExtintoresVistoria() {
    const salvo = lerJson(CHAVE_EXTINTORES_VISTORIA, null);
    if (Array.isArray(salvo) && salvo.length) {
        const normalizados = salvo.map((item) => ({
            ...item,
            codigo: normalizarCodigoExtintor(item.codigo),
            situacaoOperacional: item.situacaoOperacional || (item.status === "Ativo" ? "Em operação" : "Baixado"),
            dataAquisicao: item.dataAquisicao || "",
            fabricante: item.fabricante || "",
            numeroSerie: item.numeroSerie || "",
        }));
        if (normalizados.some((item, indice) => item.codigo !== salvo[indice]?.codigo)) {
            salvarJson(CHAVE_EXTINTORES_VISTORIA, normalizados);
        }
        const registrosOficiais = normalizados.filter((item) =>
            identificadorEhUuidExtintor(item.id),
        );

        if (
            registrosOficiais.length &&
            registrosOficiais.length !== normalizados.length
        ) {
            salvarJson(
                CHAVE_EXTINTORES_VISTORIA,
                registrosOficiais,
            );
        }

        // O cache público também conserva registros locais legados para
        // compatibilidade. Quando a carga oficial remota está disponível,
        // os equipamentos legados são removidos do armazenamento local para
        // não voltarem a aparecer como duplicados em futuras conferências.
        return registrosOficiais.length
            ? registrosOficiais
            : normalizados;
    }
    const iniciais = criarExtintoresIniciais();
    salvarJson(CHAVE_EXTINTORES_VISTORIA, iniciais);
    return iniciais;
}

export function salvarExtintoresVistoria(extintores = []) {
    salvarJson(CHAVE_EXTINTORES_VISTORIA, extintores);
    return extintores;
}

export function listarInspecoesExtintores() {
    return lerJson(CHAVE_INSPECOES_EXTINTORES, []);
}

export function salvarInspecaoExtintor(inspecao) {
    const atuais = listarInspecoesExtintores();
    const registro = { ...inspecao, id: inspecao.id || `vistoria-${Date.now()}`, atualizadoEm: new Date().toISOString() };
    const semAtual = atuais.filter((item) => item.id !== registro.id);
    salvarJson(CHAVE_INSPECOES_EXTINTORES, [registro, ...semAtual]);
    return registro;
}

export function listarManutencoesExtintores() {
    const registros = lerJson(CHAVE_MANUTENCOES_EXTINTORES, []);
    return Array.isArray(registros) ? registros : [];
}

export function salvarManutencoesExtintores(registros = []) {
    salvarJson(CHAVE_MANUTENCOES_EXTINTORES, registros);
    return registros;
}

export function registrarEnvioManutencaoExtintor(dados) {
    const atuais = listarManutencoesExtintores();
    const registro = {
        id: dados.id || `manutencao-${Date.now()}`,
        extintorId: dados.extintorId,
        tipoServico: dados.tipoServico,
        motivo: dados.motivo || "Programada",
        empresaNome: dados.empresaNome || "",
        empresaCnpj: dados.empresaCnpj || "",
        registroInmetro: dados.registroInmetro || "",
        ordemServico: dados.ordemServico || "",
        dataSaida: dados.dataSaida || new Date().toISOString().slice(0, 10),
        previsaoRetorno: dados.previsaoRetorno || "",
        dataRetorno: "",
        seloConformidade: "",
        observacoes: dados.observacoes || "",
        status: "Em andamento",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
    };
    salvarManutencoesExtintores([registro, ...atuais.filter((item) => item.id !== registro.id)]);
    return registro;
}

export function concluirManutencaoExtintor(id, dados = {}) {
    const atuais = listarManutencoesExtintores();
    const atualizados = atuais.map((item) => item.id === id ? {
        ...item,
        dataRetorno: dados.dataRetorno || new Date().toISOString().slice(0, 10),
        seloConformidade: dados.seloConformidade || "",
        observacoesRetorno: dados.observacoesRetorno || "",
        proximaManutencao: dados.proximaManutencao || "",
        proximoEnsaioHidrostatico: dados.proximoEnsaioHidrostatico || "",
        status: "Concluído",
        atualizadoEm: new Date().toISOString(),
    } : item);
    salvarManutencoesExtintores(atualizados);
    return atualizados.find((item) => item.id === id) || null;
}

export function obterManutencaoAbertaExtintor(extintorId) {
    return listarManutencoesExtintores().find((item) =>
        String(item.extintorId) === String(extintorId) && item.status === "Em andamento",
    ) || null;
}

export function gerarUrlQrExtintor(extintor) {
    return montarUrlPublicaSistema(`/?vistoriaQr=${encodeURIComponent(extintor?.tokenQr || "")}`);
}

export async function consultarFichaPublicaAnualExtintor(token = "") {
    const tokenPublico = String(token || "").trim();
    if (!tokenPublico) return null;

    const { data, error } = await (await obterSupabaseExtintores())
        .rpc("consultar_ficha_publica_extintor", {
            p_token: tokenPublico,
        });

    if (error) throw error;
    if (!data?.extintor) return null;

    return {
        extintor: normalizarExtintorRemoto({
            ...data.extintor,
            token_publico: tokenPublico,
        }),
        inspecoes: Array.isArray(data.inspecoes)
            ? data.inspecoes.map(normalizarInspecaoExtintorRemota)
            : [],
    };
}

let clienteSupabaseExtintoresPromise = null;

async function obterSupabaseExtintores() {
    if (!clienteSupabaseExtintoresPromise) {
        clienteSupabaseExtintoresPromise = import(
            "../lib/supabaseClient.js"
        )
            .then((modulo) => modulo.supabase)
            .catch((erro) => {
                clienteSupabaseExtintoresPromise = null;
                throw erro;
            });
    }

    return clienteSupabaseExtintoresPromise;
}

function textoSeguroExtintorRemoto(valor) {
    return String(valor || "").trim();
}

function textoOuNuloExtintorRemoto(valor) {
    const texto = textoSeguroExtintorRemoto(valor);
    return texto || null;
}

function dataOuNuloExtintorRemoto(valor) {
    const texto = textoSeguroExtintorRemoto(valor);

    return /^\d{4}-\d{2}-\d{2}$/.test(texto)
        ? texto
        : null;
}

function objetoSeguroExtintorRemoto(valor) {
    return valor && typeof valor === "object" && !Array.isArray(valor)
        ? valor
        : {};
}

export function identificadorEhUuidExtintor(valor) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        textoSeguroExtintorRemoto(valor),
    );
}

function exigirUuidExtintorRemoto(valor, mensagem) {
    const id = textoSeguroExtintorRemoto(valor);

    if (!identificadorEhUuidExtintor(id)) {
        throw new Error(mensagem);
    }

    return id;
}

function normalizarCompetenciaExtintorBanco(valor) {
    const texto = textoSeguroExtintorRemoto(valor);

    if (/^\d{4}-\d{2}$/.test(texto)) {
        return `${texto}-01`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
        return `${texto.slice(0, 7)}-01`;
    }

    return `${new Date().toISOString().slice(0, 7)}-01`;
}

function normalizarCompetenciaExtintorTela(valor) {
    const texto = textoSeguroExtintorRemoto(valor);

    return /^\d{4}-\d{2}/.test(texto)
        ? texto.slice(0, 7)
        : "";
}

function normalizarPosicaoExtintorRemota(valor) {
    const posicao = objetoSeguroExtintorRemoto(valor);
    const top = Number(posicao.top);
    const left = Number(posicao.left);

    return {
        top: Number.isFinite(top) ? top : 50,
        left: Number.isFinite(left) ? left : 50,
    };
}

export function normalizarExtintorRemoto(registro = {}) {
    const metadados = objetoSeguroExtintorRemoto(
        registro.metadados,
    );

    return {
        id: registro.id || "",
        referenciaLocal: registro.referencia_local || "",
        empresaId: registro.empresa_id || "",
        obraId: registro.obra_id || "",
        pontoId:
            registro.ponto_id ||
            registro.ponto_referencia_local ||
            "",
        pontoIdRemoto: registro.ponto_id || "",
        pontoReferenciaLocal:
            registro.ponto_referencia_local || "",
        codigo: normalizarCodigoExtintor(registro.codigo),
        tokenQr: registro.token_publico || "",
        ponto: registro.ponto_nome || "",
        localizacao: registro.localizacao || "",
        tipo: registro.tipo || "",
        capacidade: registro.capacidade || "",
        status: registro.status || "Ativo",
        situacaoOperacional:
            registro.situacao_operacional ||
            "Em operação",
        dataAquisicao: registro.data_aquisicao || "",
        fabricante: registro.fabricante || "",
        numeroSerie: registro.numero_serie || "",
        ultimaManutencao:
            registro.ultima_manutencao || "",
        proximaManutencao:
            registro.proxima_manutencao || "",
        proximoEnsaioHidrostatico:
            registro.proximo_ensaio_hidrostatico || "",
        posicao: normalizarPosicaoExtintorRemota(
            metadados.posicao,
        ),
        metadados,
        criadoEm: registro.criado_em || "",
        atualizadoEm: registro.atualizado_em || "",
    };
}

export function prepararExtintorRemoto({
    extintor = {},
    obraId = "",
    empresaId = "",
    pontoId = "",
} = {}) {
    const idObra = exigirUuidExtintorRemoto(
        obraId ||
        extintor.obraId ||
        extintor.obra_id,
        "Obra válida não informada para salvar o extintor.",
    );

    const idEmpresaInformado =
        textoSeguroExtintorRemoto(
            empresaId ||
            extintor.empresaId ||
            extintor.empresa_id,
        );

    if (
        idEmpresaInformado &&
        !identificadorEhUuidExtintor(
            idEmpresaInformado,
        )
    ) {
        throw new Error(
            "Empresa inválida para salvar o extintor.",
        );
    }

    const idPontoInformado =
        textoSeguroExtintorRemoto(
            pontoId ||
            extintor.pontoIdRemoto ||
            extintor.pontoId ||
            extintor.ponto_id,
        );

    const pontoRemotoId =
        identificadorEhUuidExtintor(
            idPontoInformado,
        )
            ? idPontoInformado
            : null;

    const pontoReferenciaLocal = pontoRemotoId
        ? textoOuNuloExtintorRemoto(
            extintor.pontoReferenciaLocal ||
            extintor.ponto_referencia_local,
        )
        : textoOuNuloExtintorRemoto(
            idPontoInformado ||
            extintor.pontoReferenciaLocal ||
            extintor.ponto_referencia_local,
        );

    const idAtual = textoSeguroExtintorRemoto(
        extintor.id,
    );

    const referenciaLocal =
        textoOuNuloExtintorRemoto(
            extintor.referenciaLocal ||
            extintor.referencia_local ||
            (
                !identificadorEhUuidExtintor(idAtual)
                    ? idAtual
                    : ""
            ),
        );

    const codigo = normalizarCodigoExtintor(
        extintor.codigo,
    );

    const localizacao =
        textoSeguroExtintorRemoto(
            extintor.localizacao,
        );

    const tipo = textoSeguroExtintorRemoto(
        extintor.tipo,
    );

    const capacidade =
        textoSeguroExtintorRemoto(
            extintor.capacidade,
        );

    if (!codigo) {
        throw new Error(
            "Código não informado para salvar o extintor.",
        );
    }

    if (!localizacao) {
        throw new Error(
            "Localização não informada para salvar o extintor.",
        );
    }

    if (!tipo) {
        throw new Error(
            "Tipo não informado para salvar o extintor.",
        );
    }

    if (!capacidade) {
        throw new Error(
            "Capacidade não informada para salvar o extintor.",
        );
    }

    const metadadosAtuais =
        objetoSeguroExtintorRemoto(
            extintor.metadados,
        );

    const payload = {
        empresa_id: idEmpresaInformado || null,
        obra_id: idObra,
        ponto_id: pontoRemotoId,
        codigo,
        localizacao,
        ponto_nome: textoOuNuloExtintorRemoto(
            extintor.ponto ||
            extintor.pontoNome ||
            extintor.ponto_nome,
        ),
        ponto_referencia_local:
            pontoReferenciaLocal,
        tipo,
        capacidade,
        status:
            textoSeguroExtintorRemoto(
                extintor.status,
            ) || "Ativo",
        situacao_operacional:
            textoSeguroExtintorRemoto(
                extintor.situacaoOperacional ||
                extintor.situacao_operacional,
            ) || "Em operação",
        data_aquisicao:
            dataOuNuloExtintorRemoto(
                extintor.dataAquisicao ||
                extintor.data_aquisicao,
            ),
        fabricante:
            textoOuNuloExtintorRemoto(
                extintor.fabricante,
            ),
        numero_serie:
            textoOuNuloExtintorRemoto(
                extintor.numeroSerie ||
                extintor.numero_serie,
            ),
        ultima_manutencao:
            dataOuNuloExtintorRemoto(
                extintor.ultimaManutencao ||
                extintor.ultima_manutencao,
            ),
        proxima_manutencao:
            dataOuNuloExtintorRemoto(
                extintor.proximaManutencao ||
                extintor.proxima_manutencao,
            ),
        proximo_ensaio_hidrostatico:
            dataOuNuloExtintorRemoto(
                extintor.proximoEnsaioHidrostatico ||
                extintor.proximo_ensaio_hidrostatico,
            ),
        referencia_local: referenciaLocal,
        metadados: {
            ...metadadosAtuais,
            posicao:
                normalizarPosicaoExtintorRemota(
                    extintor.posicao ||
                    metadadosAtuais.posicao,
                ),
        },
    };

    const tokenQr = textoSeguroExtintorRemoto(
        extintor.tokenQr ||
        extintor.token_publico,
    );

    if (tokenQr) {
        payload.token_publico = tokenQr;
    }

    return payload;
}

export async function listarExtintoresRemotos({
    obraId = "",
    empresaId = "",
} = {}) {
    let consulta = (await obterSupabaseExtintores())
        .from("extintores")
        .select("*")
        .order("codigo", {
            ascending: true,
        });

    const idObra =
        textoSeguroExtintorRemoto(obraId);

    const idEmpresa =
        textoSeguroExtintorRemoto(empresaId);

    if (idObra) {
        exigirUuidExtintorRemoto(
            idObra,
            "Obra inválida para listar extintores.",
        );

        consulta = consulta.eq(
            "obra_id",
            idObra,
        );
    }

    if (idEmpresa) {
        exigirUuidExtintorRemoto(
            idEmpresa,
            "Empresa inválida para listar extintores.",
        );

        consulta = consulta.eq(
            "empresa_id",
            idEmpresa,
        );
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return Array.isArray(data)
        ? data.map(normalizarExtintorRemoto)
        : [];
}

export async function salvarExtintorRemoto({
    extintor = {},
    obraId = "",
    empresaId = "",
    pontoId = "",
} = {}) {
    const payload = prepararExtintorRemoto({
        extintor,
        obraId,
        empresaId,
        pontoId,
    });

    const idRemoto =
        identificadorEhUuidExtintor(extintor.id)
            ? extintor.id
            : "";

    let registroExistenteId = idRemoto;

    if (
        !registroExistenteId &&
        payload.referencia_local
    ) {
        const {
            data: existente,
            error: erroBusca,
        } = await (await obterSupabaseExtintores())
            .from("extintores")
            .select("id")
            .eq("obra_id", payload.obra_id)
            .eq(
                "referencia_local",
                payload.referencia_local,
            )
            .maybeSingle();

        if (erroBusca) {
            throw erroBusca;
        }

        registroExistenteId =
            existente?.id || "";
    }

    const consulta = registroExistenteId
        ? (await obterSupabaseExtintores())
            .from("extintores")
            .update(payload)
            .eq("id", registroExistenteId)
            .select()
            .single()
        : (await obterSupabaseExtintores())
            .from("extintores")
            .insert(payload)
            .select()
            .single();

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return normalizarExtintorRemoto(data);
}

export async function excluirExtintorRemoto(id) {
    const extintorId = exigirUuidExtintorRemoto(
        id,
        "Extintor remoto inválido para exclusão.",
    );

    const { error } = await (await obterSupabaseExtintores())
        .from("extintores")
        .delete()
        .eq("id", extintorId);

    if (error) {
        throw error;
    }

    return true;
}

export function normalizarInspecaoExtintorRemota(
    registro = {},
) {
    return {
        id: registro.id || "",
        extintorId: registro.extintor_id || "",
        codigo:
            registro.extintor?.codigo ||
            registro.codigo ||
            "",
        competencia:
            normalizarCompetenciaExtintorTela(
                registro.competencia,
            ),
        respostas:
            objetoSeguroExtintorRemoto(
                registro.respostas,
            ),
        observacoes: registro.observacoes || "",
        responsavel: registro.responsavel || "",
        status:
            registro.status || "Em andamento",
        origem: registro.origem || "sistema",
        criadoEm: registro.criado_em || "",
        atualizadoEm:
            registro.atualizado_em || "",
    };
}

export async function listarInspecoesExtintoresRemotas({
    extintorId = "",
} = {}) {
    let consulta = (await obterSupabaseExtintores())
        .from("extintores_inspecoes")
        .select(
            "*, extintor:extintores(codigo)",
        )
        .order("atualizado_em", {
            ascending: false,
        });

    const idExtintor =
        textoSeguroExtintorRemoto(extintorId);

    if (idExtintor) {
        exigirUuidExtintorRemoto(
            idExtintor,
            "Extintor inválido para listar inspeções.",
        );

        consulta = consulta.eq(
            "extintor_id",
            idExtintor,
        );
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return Array.isArray(data)
        ? data.map(
            normalizarInspecaoExtintorRemota,
        )
        : [];
}

export async function salvarInspecaoExtintorRemota(
    inspecao = {},
) {
    const extintorId =
        exigirUuidExtintorRemoto(
            inspecao.extintorId ||
            inspecao.extintor_id,
            "Extintor remoto inválido para salvar a inspeção.",
        );

    const payload = {
        extintor_id: extintorId,
        competencia:
            normalizarCompetenciaExtintorBanco(
                inspecao.competencia,
            ),
        respostas:
            objetoSeguroExtintorRemoto(
                inspecao.respostas,
            ),
        observacoes:
            textoOuNuloExtintorRemoto(
                inspecao.observacoes,
            ),
        responsavel:
            textoOuNuloExtintorRemoto(
                inspecao.responsavel,
            ),
        status:
            textoSeguroExtintorRemoto(
                inspecao.status,
            ) || "Em andamento",
        origem:
            textoSeguroExtintorRemoto(
                inspecao.origem,
            ) || "sistema",
    };

    const idRemoto =
        identificadorEhUuidExtintor(inspecao.id)
            ? inspecao.id
            : "";

    const consulta = idRemoto
        ? (await obterSupabaseExtintores())
            .from("extintores_inspecoes")
            .update(payload)
            .eq("id", idRemoto)
            .select(
                "*, extintor:extintores(codigo)",
            )
            .single()
        : (await obterSupabaseExtintores())
            .from("extintores_inspecoes")
            .insert(payload)
            .select(
                "*, extintor:extintores(codigo)",
            )
            .single();

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return normalizarInspecaoExtintorRemota(
        data,
    );
}

export function normalizarManutencaoExtintorRemota(
    registro = {},
) {
    return {
        id: registro.id || "",
        extintorId: registro.extintor_id || "",
        codigo: registro.extintor?.codigo || "",
        tipoServico: registro.tipo_servico || "",
        motivo: registro.motivo || "Programada",
        empresaNome: registro.empresa_nome || "",
        empresaCnpj: registro.empresa_cnpj || "",
        registroInmetro:
            registro.registro_inmetro || "",
        ordemServico:
            registro.ordem_servico || "",
        dataSaida: registro.data_saida || "",
        previsaoRetorno:
            registro.previsao_retorno || "",
        dataRetorno: registro.data_retorno || "",
        seloConformidade:
            registro.selo_conformidade || "",
        observacoes: registro.observacoes || "",
        observacoesRetorno:
            registro.observacoes_retorno || "",
        proximaManutencao:
            registro.proxima_manutencao || "",
        proximoEnsaioHidrostatico:
            registro.proximo_ensaio_hidrostatico ||
            "",
        status:
            registro.status || "Em andamento",
        criadoEm: registro.criado_em || "",
        atualizadoEm:
            registro.atualizado_em || "",
    };
}

export async function listarManutencoesExtintoresRemotas({
    extintorId = "",
} = {}) {
    let consulta = (await obterSupabaseExtintores())
        .from("extintores_manutencoes")
        .select(
            "*, extintor:extintores(codigo)",
        )
        .order("atualizado_em", {
            ascending: false,
        });

    const idExtintor =
        textoSeguroExtintorRemoto(extintorId);

    if (idExtintor) {
        exigirUuidExtintorRemoto(
            idExtintor,
            "Extintor inválido para listar manutenções.",
        );

        consulta = consulta.eq(
            "extintor_id",
            idExtintor,
        );
    }

    const { data, error } = await consulta;

    if (error) {
        throw error;
    }

    return Array.isArray(data)
        ? data.map(
            normalizarManutencaoExtintorRemota,
        )
        : [];
}

export async function registrarEnvioManutencaoExtintorRemota(
    dados = {},
) {
    const extintorId =
        exigirUuidExtintorRemoto(
            dados.extintorId ||
            dados.extintor_id,
            "Extintor remoto inválido para registrar manutenção.",
        );

    const payload = {
        extintor_id: extintorId,
        tipo_servico:
            textoSeguroExtintorRemoto(
                dados.tipoServico ||
                dados.tipo_servico,
            ),
        motivo:
            textoSeguroExtintorRemoto(
                dados.motivo,
            ) || "Programada",
        empresa_nome:
            textoOuNuloExtintorRemoto(
                dados.empresaNome ||
                dados.empresa_nome,
            ),
        empresa_cnpj:
            textoOuNuloExtintorRemoto(
                dados.empresaCnpj ||
                dados.empresa_cnpj,
            ),
        registro_inmetro:
            textoOuNuloExtintorRemoto(
                dados.registroInmetro ||
                dados.registro_inmetro,
            ),
        ordem_servico:
            textoOuNuloExtintorRemoto(
                dados.ordemServico ||
                dados.ordem_servico,
            ),
        data_saida:
            dataOuNuloExtintorRemoto(
                dados.dataSaida ||
                dados.data_saida,
            ) ||
            new Date().toISOString().slice(0, 10),
        previsao_retorno:
            dataOuNuloExtintorRemoto(
                dados.previsaoRetorno ||
                dados.previsao_retorno,
            ),
        observacoes:
            textoOuNuloExtintorRemoto(
                dados.observacoes,
            ),
        status: "Em andamento",
    };

    if (!payload.tipo_servico) {
        throw new Error(
            "Tipo de serviço não informado para a manutenção.",
        );
    }

    const { data, error } = await (await obterSupabaseExtintores())
        .from("extintores_manutencoes")
        .insert(payload)
        .select(
            "*, extintor:extintores(codigo)",
        )
        .single();

    if (error) {
        throw error;
    }

    return normalizarManutencaoExtintorRemota(
        data,
    );
}

export async function obterManutencaoAbertaExtintorRemota(
    extintorId,
) {
    const idExtintor =
        exigirUuidExtintorRemoto(
            extintorId,
            "Extintor remoto inválido para consultar manutenção.",
        );

    const { data, error } = await (await obterSupabaseExtintores())
        .from("extintores_manutencoes")
        .select(
            "*, extintor:extintores(codigo)",
        )
        .eq("extintor_id", idExtintor)
        .eq("status", "Em andamento")
        .order("atualizado_em", {
            ascending: false,
        })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data
        ? normalizarManutencaoExtintorRemota(
            data,
        )
        : null;
}

export async function concluirManutencaoExtintorRemota(
    id,
    dados = {},
) {
    const manutencaoId =
        exigirUuidExtintorRemoto(
            id,
            "Manutenção remota inválida para conclusão.",
        );

    const payload = {
        data_retorno:
            dataOuNuloExtintorRemoto(
                dados.dataRetorno ||
                dados.data_retorno,
            ) ||
            new Date().toISOString().slice(0, 10),
        selo_conformidade:
            textoOuNuloExtintorRemoto(
                dados.seloConformidade ||
                dados.selo_conformidade,
            ),
        observacoes_retorno:
            textoOuNuloExtintorRemoto(
                dados.observacoesRetorno ||
                dados.observacoes_retorno,
            ),
        proxima_manutencao:
            dataOuNuloExtintorRemoto(
                dados.proximaManutencao ||
                dados.proxima_manutencao,
            ),
        proximo_ensaio_hidrostatico:
            dataOuNuloExtintorRemoto(
                dados.proximoEnsaioHidrostatico ||
                dados.proximo_ensaio_hidrostatico,
            ),
        status: "Concluído",
    };

    const { data, error } = await (await obterSupabaseExtintores())
        .from("extintores_manutencoes")
        .update(payload)
        .eq("id", manutencaoId)
        .select(
            "*, extintor:extintores(codigo)",
        )
        .single();

    if (error) {
        throw error;
    }

    return normalizarManutencaoExtintorRemota(
        data,
    );
}
