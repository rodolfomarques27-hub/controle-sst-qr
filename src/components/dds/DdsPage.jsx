import React, { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    carregarRegistroDdsPorCodigo,
    listarRegistrosDds,
    salvarRegistroDds,
} from "../../services/ddsRegistrosService";
import { executarLeituraDdsLocal } from "../../services/documentosOcrService";

import { obterUrlLogoEmpresa } from "../../services/supabaseServices";
import { gerarCodigoFuncionario } from "../../services/colaboradorDocumentosService";
import {
    BookOpen,
    ChevronDown,
    ChevronUp,
    Gift,
    Megaphone,
    Printer,
    CheckCircle2,
    Building2,
    CalendarClock,
    ClipboardCheck,
    QrCode,
    ListChecks,
    MessageSquareText,
    ClipboardList,
    ShieldCheck,
    Users,
} from "lucide-react";
import dashboardHeroSstDds from "../../assets/dashboard-hero-sst.png";

const diasDds = [
    { curto: "DOM", nome: "Domingo", data: "14/06/2026", tema: "", responsavel: "" },
    { curto: "SEG", nome: "Segunda-feira", data: "15/06/2026", tema: "", responsavel: "" },
    { curto: "TER", nome: "Terça-feira", data: "16/06/2026", tema: "", responsavel: "" },
    { curto: "QUA", nome: "Quarta-feira", data: "17/06/2026", tema: "", responsavel: "" },
    { curto: "QUI", nome: "Quinta-feira", data: "18/06/2026", tema: "", responsavel: "" },
    { curto: "SEX", nome: "Sexta-feira", data: "19/06/2026", tema: "", responsavel: "" },
    { curto: "SÁB", nome: "Sábado", data: "20/06/2026", tema: "", responsavel: "" },
];
function criarTemasEditaveisDds() {
    return diasDds.map((dia) => ({
        tema: String(dia?.tema || "").trim(),
        responsavel: String(dia?.responsavel || "").trim(),
    }));
}


const participantesDds = [
    { nome: "Abílio Soares da Silva", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { nome: "Agnaldo Oliveira Machado", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    { nome: "Anderson Augusto Pereira", funcao: "Líder", empresa: "Ribeiro Aquino" },
    { nome: "André Henrique Ribeiro", funcao: "Engenheiro de Obra", empresa: "Ribeiro Aquino" },
    { nome: "Alcir Pimenta dos Santos", funcao: "Gredista", empresa: "Ribeiro Aquino" },
    { nome: "Aparecido Donizete Veloso", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { nome: "Argemiro Menino", funcao: "Armador", empresa: "Ribeiro Aquino" },
    { nome: "Atila Junio de Sousa", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { nome: "Cláudio dos Santos", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { nome: "Clayton Rodrigues dos Santos", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { nome: "Emerson Gonçalves dos Santos", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    { nome: "Edilson de Carvalho Ribeiro", funcao: "Operador de Máquinas", empresa: "Ribeiro Aquino" },
    { nome: "Erinaldo Rodrigues", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { nome: "Edmilson Francisco de Paula", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { nome: "Eraldo Alves", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
];

const participantesDdsContinuacao = [
    { numero: 16, nome: "Fábio Henrique dos Santos", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
    { numero: 17, nome: "Fernando Alves Pereira", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { numero: 18, nome: "Gilberto Martins de Souza", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { numero: 19, nome: "Hélio Roberto Nascimento", funcao: "Armador", empresa: "Ribeiro Aquino" },
    { numero: 20, nome: "João Carlos Ferreira", funcao: "Eletricista", empresa: "Ribeiro Aquino" },
    { numero: 21, nome: "José Aparecido Lima", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    { numero: 22, nome: "Leonardo Silva Araújo", funcao: "Servente", empresa: "Ribeiro Aquino" },
    { numero: 23, nome: "Lucas Pereira Gomes", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { numero: 24, nome: "Marcelo Antônio Santos", funcao: "Operador de Betoneira", empresa: "Ribeiro Aquino" },
    { numero: 25, nome: "Márcio Roberto Almeida", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { numero: 26, nome: "Paulo Sérgio Oliveira", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
    { numero: 27, nome: "Rafael Augusto Moreira", funcao: "Encanador", empresa: "Ribeiro Aquino" },
    { numero: 28, nome: "Renato José Barbosa", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { numero: 29, nome: "Roberto Carlos Teixeira", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    { numero: 30, nome: "Samuel Batista Rocha", funcao: "Armador", empresa: "Ribeiro Aquino" },
    { numero: 31, nome: "Sérgio Luiz Cardoso", funcao: "Ajudante Geral", empresa: "Ribeiro Aquino" },
    { numero: 32, nome: "Tiago Henrique Costa", funcao: "Pedreiro", empresa: "Ribeiro Aquino" },
    { numero: 33, nome: "Valdir Gomes Nunes", funcao: "Carpinteiro", empresa: "Ribeiro Aquino" },
    { numero: 34, nome: "Wagner Pereira Lopes", funcao: "Ajudante", empresa: "Ribeiro Aquino" },
    { numero: 35, nome: "Willian José Ribeiro", funcao: "Servente", empresa: "Ribeiro Aquino" },
];
const LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS = 10;
const LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS = 20;
const QUANTIDADE_LINHAS_COMPLEMENTARES_DDS = 6;
const aniversariantesDds = [
    { data: "16/06", nome: "Anderson Augusto Pereira" },
    { data: "18/06", nome: "Alcir Pimenta dos Santos" },
];

const CAMPOS_NOME_EMPRESA_DDS = [
    "razao_social",
    "razaoSocial",
    "nome_fantasia",
    "nomeFantasia",
    "nome",
    "empresa",
    "label",
];

const CHAVE_OBRA_SETOR_DDS_POR_EMPRESA = "controle-sst-qr:dds:obra-setor-por-empresa:v1";
const CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA = "controle-sst-qr:dds:fiscal-idealiza-por-empresa:v1";
const CHAVE_EMPRESA_SELECIONADA_DDS = "controle-sst-qr:dds:empresa-selecionada:v1";

const CAMPOS_OBRA_SETOR_DDS = [
    "obra_setor",
    "obraSetor",
    "obra",
    "setor",
    "unidade",
    "local",
    "endereco",
    "endereco_obra",
];

function carregarObrasSetorDdsPorEmpresa() {
    if (typeof window === "undefined" || !window.localStorage) return {};

    try {
        const bruto = window.localStorage.getItem(CHAVE_OBRA_SETOR_DDS_POR_EMPRESA);
        if (!bruto) return {};

        const dados = JSON.parse(bruto);
        return dados && typeof dados === "object" ? dados : {};
    } catch {
        return {};
    }
}

function salvarObrasSetorDdsPorEmpresa(dados = {}) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(CHAVE_OBRA_SETOR_DDS_POR_EMPRESA, JSON.stringify(dados || {}));
    } catch {
        // Ignora navegador sem localStorage disponível.
    }
}

function carregarFiscalIdealizaDdsPorEmpresa() {
    if (typeof window === "undefined" || !window.localStorage) return {};

    try {
        const bruto = window.localStorage.getItem(CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA);
        if (!bruto) return {};

        const dados = JSON.parse(bruto);
        return dados && typeof dados === "object" ? dados : {};
    } catch {
        return {};
    }
}

function salvarFiscalIdealizaDdsPorEmpresa(dados = {}) {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        window.localStorage.setItem(CHAVE_FISCAL_IDEALIZA_DDS_POR_EMPRESA, JSON.stringify(dados || {}));
    } catch {
        // Ignora navegador sem localStorage disponível.
    }
}

function carregarEmpresaSelecionadaDds() {
    if (typeof window === "undefined" || !window.localStorage) return "";

    try {
        return String(window.localStorage.getItem(CHAVE_EMPRESA_SELECIONADA_DDS) || "").trim();
    } catch {
        return "";
    }
}

function salvarEmpresaSelecionadaDds(chaveEmpresa = "") {
    if (typeof window === "undefined" || !window.localStorage) return;

    try {
        if (chaveEmpresa) {
            window.localStorage.setItem(CHAVE_EMPRESA_SELECIONADA_DDS, chaveEmpresa);
        } else {
            window.localStorage.removeItem(CHAVE_EMPRESA_SELECIONADA_DDS);
        }
    } catch {
        // Ignora navegador sem localStorage disponível.
    }
}

const CAMPOS_FUNCAO_DDS = [
    "funcao",
    "função",
    "funcao_nome",
    "funcaoNome",
    "nome_funcao",
    "nomeFuncao",
    "cargo",
    "cargo_atual",
    "cargoAtual",
    "profissao",
    "profissão",
    "ocupacao",
    "ocupação",
    "atividade",
];

const CAMPOS_TST_EMPRESA_DDS = [
    "tst_responsavel",
    "tstResponsavel",
    "responsavel_tecnico",
    "responsavelTecnico",
    "responsavel_sst",
    "responsavelSst",
    "tecnico_responsavel",
    "tecnicoResponsavel",
];

const CAMPOS_ID_EMPRESA_DDS = [
    "id",
    "empresa_id",
    "empresaId",
    "id_empresa",
    "codigo",
    "uuid",
];

function obterIdEmpresaObjetoDds(empresa = null) {
    return obterPrimeiroTextoDds(empresa, CAMPOS_ID_EMPRESA_DDS);
}

function obterObraBaseDds(item = null) {
    if (!item || typeof item !== "object") return {};

    if (item.obra && typeof item.obra === "object") {
        return item.obra;
    }

    return item;
}
function obterEmpresaIdObraDds(obra = null) {
    return (
        obterPrimeiroTextoDds(obra, ["empresaId", "empresa_id", "id_empresa"]) ||
        obterPrimeiroTextoDds(obra?.empresa, ["id", "empresa_id", "empresaId"]) ||
        obterPrimeiroTextoDds(obra, ["empresa"])
    );
}

function obterIdObraEmpresaDds(obra = null, indice = 0) {
    const obraBase = obterObraBaseDds(obra);

    return String(
        obterPrimeiroTextoDds(obra, ["obraId", "obra_id", "id_obra"]) ||
        obterPrimeiroTextoDds(obraBase, ["id", "uuid"]) ||
        obterPrimeiroTextoDds(obra, ["id", "uuid"]) ||
        `obra-${indice}`
    ).trim();
}

function obterNomeObraEmpresaDds(obra = null) {
    const obraBase = obterObraBaseDds(obra);

    return (
        obterPrimeiroTextoDds(obraBase, ["nome", "nome_obra", "nomeObra", "obra_setor", "obraSetor", "obra", "setor", "local"]) ||
        obterPrimeiroTextoDds(obra, ["nome", "nome_obra", "nomeObra", "obra_setor", "obraSetor", "obra", "setor", "local"]) ||
        "Obra cadastrada"
    );
}

function obterFiscalObraEmpresaDds(obra = null) {
    const obraBase = obterObraBaseDds(obra);

    return (
        obterPrimeiroTextoDds(obraBase, ["fiscalIdealiza", "fiscal_idealiza", "fiscal", "fiscal_obra", "fiscalObra"]) ||
        obterPrimeiroTextoDds(obra, ["fiscalIdealiza", "fiscal_idealiza", "fiscal", "fiscal_obra", "fiscalObra"])
    );
}

function obterLiderObraEmpresaDds(obra = null) {
    const obraBase = obterObraBaseDds(obra);

    return (
        obterPrimeiroTextoDds(obraBase, ["liderEncarregado", "lider_encarregado", "lider", "encarregado", "responsavel_obra", "responsavelObra"]) ||
        obterPrimeiroTextoDds(obra, ["liderEncarregado", "lider_encarregado", "lider", "encarregado", "responsavel_obra", "responsavelObra"])
    );
}

function obterChaveEmpresaDds(empresa = null, indice = 0) {
    return String(
        obterIdEmpresaObjetoDds(empresa)
        || obterNomeEmpresaObjetoDds(empresa)
        || `empresa-${indice}`
    ).trim();
}

function normalizarComparacaoDds(valor = "") {
    return normalizarTextoCodigoDds(valor)
        .replace(/\s+/g, " ")
        .trim();
}

function obterNomeEmpresaColaboradorDds(colaborador = null) {
    if (!colaborador || typeof colaborador !== "object") return "";

    if (colaborador.empresa && typeof colaborador.empresa === "object") {
        return obterNomeEmpresaObjetoDds(colaborador.empresa);
    }

    return String(
        colaborador?.empresa
        || colaborador?.empresa_nome
        || colaborador?.empresaNome
        || colaborador?.nome_empresa
        || colaborador?.razao_social
        || colaborador?.razaoSocial
        || colaborador?.nome_fantasia
        || colaborador?.nomeFantasia
        || ""
    ).trim();
}

function obterIdEmpresaColaboradorDds(colaborador = null) {
    if (!colaborador || typeof colaborador !== "object") return "";

    return String(
        colaborador?.empresa_id
        || colaborador?.empresaId
        || colaborador?.id_empresa
        || colaborador?.empresa?.id
        || colaborador?.empresa?.empresa_id
        || ""
    ).trim();
}

function colaboradorPertenceEmpresaDds(colaborador = null, empresa = null) {
    if (!empresa) return true;

    const idEmpresa = obterIdEmpresaObjetoDds(empresa);
    const idColaboradorEmpresa = obterIdEmpresaColaboradorDds(colaborador);

    if (idEmpresa && idColaboradorEmpresa && String(idEmpresa) === String(idColaboradorEmpresa)) {
        return true;
    }

    const nomeEmpresa = normalizarComparacaoDds(obterNomeEmpresaObjetoDds(empresa));
    const nomeEmpresaColaborador = normalizarComparacaoDds(obterNomeEmpresaColaboradorDds(colaborador));

    if (nomeEmpresa && nomeEmpresaColaborador && nomeEmpresa === nomeEmpresaColaborador) {
        return true;
    }

    return false;
}

function filtrarColaboradoresPorEmpresaDds(colaboradores = [], empresa = null) {
    const lista = Array.isArray(colaboradores) ? colaboradores : [];

    if (!empresa) return lista;

    return lista.filter((colaborador) => colaboradorPertenceEmpresaDds(colaborador, empresa));
}

function formatarDataDds(data) {
    const dataSegura = data instanceof Date && !Number.isNaN(data.getTime()) ? data : new Date();
    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(dataSegura);
}

function adicionarDiasDds(data, quantidadeDias = 0) {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() + quantidadeDias);
    return novaData;
}

function obterInicioSemanaDds(dataReferencia = new Date()) {
    const base = dataReferencia instanceof Date && !Number.isNaN(dataReferencia.getTime())
        ? new Date(dataReferencia)
        : new Date();

    base.setHours(0, 0, 0, 0);
    base.setDate(base.getDate() - base.getDay());
    return base;
}

function obterFimSemanaDds(inicioSemana = obterInicioSemanaDds()) {
    return adicionarDiasDds(inicioSemana, 6);
}

function obterResumoSemanaDds(inicioSemana = obterInicioSemanaDds(), fimSemana = obterFimSemanaDds(inicioSemana)) {
    const diaInicio = String(inicioSemana.getDate()).padStart(2, "0");
    const diaFim = String(fimSemana.getDate()).padStart(2, "0");
    const mesInicio = String(inicioSemana.getMonth() + 1).padStart(2, "0");
    const mesFim = String(fimSemana.getMonth() + 1).padStart(2, "0");

    if (mesInicio === mesFim) {
        return `${diaInicio} a ${diaFim}/${mesFim}`;
    }

    return `${diaInicio}/${mesInicio} a ${diaFim}/${mesFim}`;
}

function gerarDiasSemanaDds(inicioSemana = obterInicioSemanaDds()) {
    return diasDds.map((dia, indice) => ({
        ...dia,
        data: formatarDataDds(adicionarDiasDds(inicioSemana, indice)),
    }));
}

function normalizarTextoCodigoDds(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .trim()
        .toUpperCase();
}

function obterSiglaEmpresaDds(nomeEmpresa = "") {
    const palavrasIgnoradas = new Set(["LTDA", "LTD", "ME", "EPP", "SA", "S", "A", "DE", "DA", "DO", "DAS", "DOS", "CONSTRUCOES", "CONSTRUCAO", "SERVICOS"]);
    const palavras = normalizarTextoCodigoDds(nomeEmpresa)
        .split(/\s+/)
        .filter((parte) => parte && !palavrasIgnoradas.has(parte));

    const sigla = palavras.slice(0, 3).map((parte) => parte[0]).join("");
    return sigla || "SST";
}

function gerarCodigoDdsAutomatico(nomeEmpresa = "", inicioSemana = obterInicioSemanaDds()) {
    const ano = inicioSemana.getFullYear();
    const mes = String(inicioSemana.getMonth() + 1).padStart(2, "0");
    const dia = String(inicioSemana.getDate()).padStart(2, "0");
    const sigla = obterSiglaEmpresaDds(nomeEmpresa);

    return `DDS-${ano}-${mes}-${sigla}-${dia}`;
}

function obterPrimeiroTextoDds(objeto = null, campos = []) {
    if (!objeto || typeof objeto !== "object") return "";

    for (const campo of campos) {
        const valor = String(objeto?.[campo] || "").trim();
        if (valor) return valor;
    }

    return "";
}

function obterNomeEmpresaObjetoDds(empresa = null) {
    return obterPrimeiroTextoDds(empresa, CAMPOS_NOME_EMPRESA_DDS);
}

function obterFuncaoPessoaDds(pessoa = null) {
    return obterPrimeiroTextoDds(pessoa, CAMPOS_FUNCAO_DDS);
}

function obterTstEmpresaDds(empresa = null) {
    return obterPrimeiroTextoDds(empresa, CAMPOS_TST_EMPRESA_DDS);
}

function textoContemTermosDds(texto = "", termos = []) {
    const normalizado = normalizarTextoCodigoDds(texto);
    return termos.some((termo) => normalizado.includes(normalizarTextoCodigoDds(termo)));
}

function obterEmpresaBaseDds({ empresasBanco = [], colaboradores = [], empresaSelecionada = null } = {}) {
    if (empresaSelecionada) return empresaSelecionada;
    const empresasValidas = Array.isArray(empresasBanco) ? empresasBanco.filter(Boolean) : [];

    if (empresasValidas.length > 0) {
        return empresasValidas[0];
    }

    const primeiroColaboradorComEmpresa = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) =>
        String(colaborador?.empresa || colaborador?.empresa_nome || colaborador?.empresaNome || "").trim()
    );

    const nomeEmpresaColaborador = String(
        primeiroColaboradorComEmpresa?.empresa
        || primeiroColaboradorComEmpresa?.empresa_nome
        || primeiroColaboradorComEmpresa?.empresaNome
        || ""
    ).trim();

    return nomeEmpresaColaborador ? { nome: nomeEmpresaColaborador } : null;
}

function obterResponsavelTecnicoDds({ colaboradores = [], usuario = null, empresaSelecionada = null } = {}) {
    const tstEmpresa = obterTstEmpresaDds(empresaSelecionada);

    if (tstEmpresa) {
        return {
            nome: tstEmpresa,
            funcao: "Téc. de Segurança do Trabalho",
        };
    }

    const funcaoUsuario = obterFuncaoPessoaDds(usuario);
    const perfilUsuario = String(usuario?.perfil || "").trim();

    if (
        textoContemTermosDds(funcaoUsuario, ["técnico", "tecnico", "segurança do trabalho", "seguranca do trabalho", "tst"])
        || textoContemTermosDds(perfilUsuario, ["tecnico_sst", "técnico sst", "tecnico sst"])
    ) {
        return {
            nome: String(usuario?.nome || usuario?.name || usuario?.displayName || usuario?.email || "Técnico SST").trim(),
            funcao: funcaoUsuario || "Téc. de Segurança do Trabalho",
        };
    }

    const colaboradorTst = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) => {
        const funcao = obterFuncaoPessoaDds(colaborador);
        return textoContemTermosDds(funcao, ["técnico", "tecnico", "segurança do trabalho", "seguranca do trabalho", "tst"]);
    });

    if (colaboradorTst) {
        return {
            nome: String(colaboradorTst.nome || colaboradorTst.nome_completo || colaboradorTst.name || "Técnico SST").trim(),
            funcao: obterFuncaoPessoaDds(colaboradorTst) || "Téc. de Segurança do Trabalho",
        };
    }

    return {
        nome: "Técnico SST não definido",
        funcao: "Téc. de Segurança do Trabalho",
    };
}

function obterLiderDds({ colaboradores = [] } = {}) {
    const colaboradorLider = (Array.isArray(colaboradores) ? colaboradores : []).find((colaborador) => {
        const funcao = obterFuncaoPessoaDds(colaborador);
        return textoContemTermosDds(funcao, ["encarregado", "lider", "líder", "mestre", "supervisor"]);
    });

    if (colaboradorLider) {
        return String(colaboradorLider.nome || colaboradorLider.nome_completo || colaboradorLider.name || "Líder não definido").trim();
    }

    return "Líder não definido";
}

function montarDadosDdsAutomaticos({ empresasBanco = [], colaboradores = [], usuario = null, empresaSelecionada = null, inicioSemana = obterInicioSemanaDds(), fimSemana = obterFimSemanaDds(inicioSemana) } = {}) {
    const empresaBase = obterEmpresaBaseDds({ empresasBanco, colaboradores, empresaSelecionada });
    const nomeEmpresa = obterNomeEmpresaObjetoDds(empresaBase) || "Empresa não definida";
    const obraSetor = obterPrimeiroTextoDds(empresaBase, CAMPOS_OBRA_SETOR_DDS) || "Obra / Setor não definido";
    const responsavelTecnico = obterResponsavelTecnicoDds({ colaboradores, usuario, empresaSelecionada: empresaBase });
    const periodo = `${formatarDataDds(inicioSemana)} a ${formatarDataDds(fimSemana)}`;

    return {
        empresa: nomeEmpresa,
        obraSetor,
        responsavel: responsavelTecnico.nome,
        funcaoResponsavel: responsavelTecnico.funcao,
        turno: "Diurno",
        fiscalIdealiza: "Fiscal Idealiza não definido",
        encarregado: obterLiderDds({ colaboradores }),
        periodo,
        resumoSemana: obterResumoSemanaDds(inicioSemana, fimSemana),
        codigo: gerarCodigoDdsAutomatico(nomeEmpresa, inicioSemana),
    };
}

const dadosDdsPadrao = montarDadosDdsAutomaticos();

const camposDadosDds = [
    { chave: "obraSetor", rotulo: "Obra / Setor" },
    { chave: "responsavel", rotulo: "Responsável / TST" },
    { chave: "turno", rotulo: "Turno" },
    { chave: "fiscalIdealiza", rotulo: "Fiscal Idealiza" },
    { chave: "encarregado", rotulo: "Líder / Encarregado" },
];

function obterValorTextoDds(...valores) {
    const encontrado = valores.find((valor) => String(valor || "").trim());
    return String(encontrado || "-").trim();
}

function abreviarNomePessoaDds(nome = "", limite = 28) {
    const texto = String(nome || "").replace(/\s+/g, " ").trim();

    if (!texto || texto === "-") return "-";
    if (texto.length <= limite) return texto;

    const conectores = new Set(["de", "da", "do", "das", "dos", "e"]);
    const partes = texto.split(" ").filter(Boolean);

    if (partes.length <= 2) return texto;

    const primeira = partes[0];
    const ultima = partes[partes.length - 1];
    const iniciais = partes
        .slice(1, -1)
        .filter((parte) => !conectores.has(parte.toLowerCase()))
        .map((parte) => `${parte[0]}.`);

    const abreviado = [primeira, ...iniciais, ultima].join(" ");

    if (abreviado.length <= limite + 8) return abreviado;

    return `${primeira} ${ultima}`;
}

function abreviarFuncaoResponsavelDds(funcao = "") {
    const texto = String(funcao || "").replace(/\s+/g, " ").trim();

    if (!texto || texto === "-") return "-";

    const normalizado = normalizarTextoCodigoDds(texto);

    if (
        normalizado.includes("SEGURANCA DO TRABALHO")
        || normalizado.includes("SEGURANCA TRABALHO")
        || normalizado.includes("TST")
    ) {
        return "Téc. Seg. Trabalho";
    }

    return texto;
}

function formatarResponsavelCabecalhoDds(dadosDds = {}) {
    const nome = abreviarNomePessoaDds(dadosDds.responsavel);
    const funcao = abreviarFuncaoResponsavelDds(dadosDds.funcaoResponsavel);

    if (!funcao || funcao === "-") return nome;

    return `${nome} — ${funcao}`;
}

function obterCodigoSafescanParticipanteDds(colaborador = {}) {
    if (!colaborador || typeof colaborador !== "object") return "";

    const codigoExistente = obterValorTextoDds(
        colaborador.codigoFuncionario,
        colaborador.codigo_funcionario,
        colaborador.codigoSafescan,
        colaborador.codigoSafeScan,
        colaborador.codigo_safescan,
        colaborador.codigo,
        colaborador.codigo_colaborador,
        colaborador.codigoColaborador,
        colaborador.codigo_qr,
        colaborador.qr_codigo,
        colaborador.codigoQr,
        colaborador.matricula_esocial,
        colaborador.matriculaEsocial,
        colaborador.matricula
    );

    if (codigoExistente) return codigoExistente;

    const nomeColaborador = obterValorTextoDds(
        colaborador.nome,
        colaborador.nomeCompleto,
        colaborador.nome_completo,
        colaborador.colaborador,
        colaborador.nomeColaborador
    );

    return nomeColaborador ? gerarCodigoFuncionario(nomeColaborador) : "";
}
function normalizarParticipantesDdsSistema(colaboradores = []) {
    const base = Array.isArray(colaboradores) ? colaboradores : [];

    return base
        .map((colaborador, indice) => ({
            numero: indice + 1,
            codigoSafescan: obterCodigoSafescanParticipanteDds(colaborador),
            codigoFuncionario: obterCodigoSafescanParticipanteDds(colaborador),
            codigo_funcionario: obterCodigoSafescanParticipanteDds(colaborador),
            nome: obterValorTextoDds(colaborador.nome, colaborador.nomeCompleto, colaborador.nome_completo),
            funcao: obterFuncaoPessoaDds(colaborador),
            empresa: obterValorTextoDds(
                colaborador.empresaExibicao,
                colaborador.empresa_exibicao,
                colaborador.empresaNome,
                colaborador.empresa_nome,
                colaborador.empresa
            ),
        }))
        .filter((participante) => participante.nome && participante.nome !== "-")
        .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }))
        .map((participante, indice) => ({
            ...participante,
            numero: indice + 1,
        }));
}

function dividirParticipantesDds(participantes = [], inicio = 15, tamanho = 20) {
    const folhas = [];

    for (let indice = inicio; indice < participantes.length; indice += tamanho) {
        folhas.push(participantes.slice(indice, indice + tamanho));
    }

    return folhas;
}
function criarLinhasComplementaresDds(quantidadeLinhas = 6, numeroInicial = 1) {
    const quantidade = Math.max(0, Number(quantidadeLinhas) || 0);

    return Array.from({ length: quantidade }, (_, indice) => ({
        numero: numeroInicial + indice,
        nome: "",
        funcao: "",
        empresa: "",
        linhaEmBranco: true,
    }));
}

function montarFolhasDdsComLinhasComplementares(
    participantes = [],
    limitePrimeiraFolha = 10,
    limiteFolhaContinuacao = 20,
    quantidadeLinhasComplementares = 6
) {
    const participantesValidos = Array.isArray(participantes)
        ? participantes
        : [];

    const primeiraFolha = participantesValidos.slice(
        0,
        limitePrimeiraFolha
    );

    const folhasContinuacao = dividirParticipantesDds(
        participantesValidos,
        limitePrimeiraFolha,
        limiteFolhaContinuacao
    ).map((folha) => [...folha]);

    const linhasComplementares = criarLinhasComplementaresDds(
        quantidadeLinhasComplementares,
        participantesValidos.length + 1
    );

    if (folhasContinuacao.length === 0) {
        const vagasPrimeiraFolha =
            limitePrimeiraFolha - primeiraFolha.length;

        if (vagasPrimeiraFolha >= linhasComplementares.length) {
            primeiraFolha.push(...linhasComplementares);
        } else {
            folhasContinuacao.push(linhasComplementares);
        }
    } else {
        const ultimaFolha =
            folhasContinuacao[folhasContinuacao.length - 1];

        const vagasUltimaFolha =
            limiteFolhaContinuacao - ultimaFolha.length;

        if (vagasUltimaFolha >= linhasComplementares.length) {
            ultimaFolha.push(...linhasComplementares);
        } else {
            folhasContinuacao.push(linhasComplementares);
        }
    }

    return {
        primeiraFolhaParticipantes: primeiraFolha,
        folhasContinuacaoDds: folhasContinuacao,
    };
}
function criarParticipantesAdicionaisConferenciaDds(
    participantesBase = [],
    participantesSalvos = []
) {
    const base = Array.isArray(participantesBase)
        ? participantesBase
        : [];

    const maiorNumeroBase = base.reduce(
        (maior, participante, indice) =>
            Math.max(
                maior,
                Number(participante?.numero || indice + 1) || 0
            ),
        0
    );

    const adicionaisSalvos = (
        Array.isArray(participantesSalvos)
            ? participantesSalvos
            : []
    ).filter((participante) => {
        const origem = String(
            participante?.origem || ""
        )
            .trim()
            .toLowerCase();

        const tipo = String(
            participante?.tipo || ""
        )
            .trim()
            .toLowerCase();

        return (
            origem === "adicional" ||
            tipo === "visitante"
        );
    });

    const adicionaisSemLinha = adicionaisSalvos.filter(
        (participante) =>
            !Number(
                participante?.linhaImpressa ||
                participante?.numero ||
                0
            )
    );

    return Array.from(
        { length: QUANTIDADE_LINHAS_COMPLEMENTARES_DDS },
        (_, indice) => {
            const numeroPadrao =
                maiorNumeroBase + indice + 1;

            const salvoPorLinha = adicionaisSalvos.find(
                (participante) =>
                    Number(
                        participante?.linhaImpressa ||
                        participante?.numero ||
                        0
                    ) === numeroPadrao
            );

            const salvo =
                salvoPorLinha ||
                adicionaisSemLinha[indice] ||
                {};

            const linhaSalva = Number(
                salvo?.linhaImpressa ||
                salvo?.numero ||
                0
            );

            const numero =
                linhaSalva > maiorNumeroBase
                    ? linhaSalva
                    : numeroPadrao;

            return {
                idAdicional:
                    salvo?.idAdicional ||
                    "adicional-dds-" + numero,
                numero,
                linhaImpressa: numero,
                nome: String(salvo?.nome || ""),
                funcao: String(salvo?.funcao || ""),
                empresa: String(
                    salvo?.empresa ||
                    salvo?.empresaNome ||
                    ""
                ),
                codigoSafescan: "",
                origem: "adicional",
                tipo: "visitante",
                status: "manual",
            };
        }
    );
}

function DdsResumoCard({ icone: Icone, titulo, valor, texto, cor = "emerald", onClick = null, destaque = false }) {
    const estilos = {
        emerald: {
            topo: "border-t-4 border-t-emerald-500",
            borda: "border-emerald-100 hover:border-emerald-200",
            icone: "bg-emerald-50 text-emerald-700 ring-emerald-100 group-hover:bg-emerald-500 group-hover:text-white",
            titulo: "text-emerald-700",
            brilho: "bg-emerald-500/10",
        },
        sky: {
            topo: "border-t-4 border-t-sky-500",
            borda: "border-sky-100 hover:border-sky-200",
            icone: "bg-sky-50 text-sky-700 ring-sky-100 group-hover:bg-sky-500 group-hover:text-white",
            titulo: "text-sky-700",
            brilho: "bg-sky-500/10",
        },
        violet: {
            topo: "border-t-4 border-t-violet-500",
            borda: "border-violet-100 hover:border-violet-200",
            icone: "bg-violet-50 text-violet-700 ring-violet-100 group-hover:bg-violet-500 group-hover:text-white",
            titulo: "text-violet-700",
            brilho: "bg-violet-500/10",
        },
        amber: {
            topo: "border-t-4 border-t-amber-500",
            borda: "border-amber-100 hover:border-amber-200",
            icone: "bg-amber-50 text-amber-700 ring-amber-100 group-hover:bg-amber-500 group-hover:text-white",
            titulo: "text-amber-700",
            brilho: "bg-amber-500/10",
        },
    };

    const estilo = estilos[cor] || estilos.emerald;
    const CardTag = onClick ? "button" : "div";

    return (
        <CardTag
            type={onClick ? "button" : undefined}
            onClick={onClick || undefined}
            className={`group relative overflow-hidden rounded-[24px] border bg-white p-5 text-left shadow-sm ring-1 ring-slate-100/80 transition ${estilo.topo} ${estilo.borda} ${onClick ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-emerald-200" : "hover:-translate-y-0.5 hover:shadow-lg"}`}
        >
            <div className={`absolute -right-10 -top-10 h-24 w-24 rounded-full ${estilo.brilho} blur-2xl transition group-hover:scale-125`} />

            <div className="relative flex h-full items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 transition ${estilo.icone}`}>
                        <Icone className="h-5 w-5" />
                    </span>

                    <div className="min-w-0 xl:pr-8">
                        <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${estilo.titulo}`}>
                            {titulo}
                        </p>
                        <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                            {valor}
                        </p>
                        {texto && (
                            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                                {texto}
                            </p>
                        )}
                    </div>
                </div>

                {onClick && (
                    <span className={`mt-1 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide transition ${destaque ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-emerald-500 group-hover:text-white"}`}>
                        Abrir
                    </span>
                )}
            </div>
        </CardTag>
    );
}
const CHAVE_LOCAL_CARDS_DDS = "controle-sst-qr:dds:cards-recolhiveis:v1";

const CARDS_DDS_PADRAO = {
    qr: true,
    novo: true,
    temas: true,
    qrConferencia: true,
    recados: true,
    orientacoes: true,
    preview: true,
};

function carregarCardsDdsLocal() {
    if (typeof window === "undefined") return { ...CARDS_DDS_PADRAO };

    try {
        const salvo = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_CARDS_DDS) || "{}");

        return {
            ...CARDS_DDS_PADRAO,
            ...(salvo && typeof salvo === "object" ? salvo : {}),
        };
    } catch {
        return { ...CARDS_DDS_PADRAO };
    }
}

function salvarCardsDdsLocal(cards = {}) {
    if (typeof window === "undefined") return;

    try {
        window.localStorage.setItem(CHAVE_LOCAL_CARDS_DDS, JSON.stringify({
            ...CARDS_DDS_PADRAO,
            ...(cards && typeof cards === "object" ? cards : {}),
        }));
    } catch {
        // Persistência visual não deve bloquear o DDS.
    }
}

function BotaoAlternarCardDds({ aberto = true }) {
    const Icone = aberto ? ChevronUp : ChevronDown;

    return (
        <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white">
            {aberto ? "Fechar" : "Abrir"}
            <Icone className="h-4 w-4" />
        </span>
    );
}
const CHAVE_LOCAL_TEMAS_DDS = "controle-sst-qr:dds:temas-por-codigo:v1";

function criarChaveTemasDdsLocal({ codigo = "" } = {}) {
    const codigoSeguro = String(codigo ?? "").trim();

    return codigoSeguro || "dds-temas-sem-codigo";
}

function normalizarTemasDdsEditaveis(temas = null) {
    const lista = Array.isArray(temas) ? temas : [];

    return diasDds.map((dia, indice) => {
        const item = lista[indice] && typeof lista[indice] === "object" ? lista[indice] : {};
        const temTema = Object.prototype.hasOwnProperty.call(item, "tema");
        const temResponsavel = Object.prototype.hasOwnProperty.call(item, "responsavel");

        return {
            tema: String(temTema ? item.tema : dia?.tema || "").trim(),
            responsavel: String(temResponsavel ? item.responsavel : dia?.responsavel || "").trim(),
        };
    });
}

function carregarTemasDdsLocal(chave = "") {
    if (typeof window === "undefined") return null;

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return null;

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_TEMAS_DDS) || "{}");
        const temasSalvos = mapa?.[chaveSegura];

        return Array.isArray(temasSalvos) ? normalizarTemasDdsEditaveis(temasSalvos) : null;
    } catch {
        return null;
    }
}

function salvarTemasDdsLocal(chave = "", temas = []) {
    if (typeof window === "undefined") return;

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return;

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_TEMAS_DDS) || "{}");

        mapa[chaveSegura] = normalizarTemasDdsEditaveis(temas);
        window.localStorage.setItem(CHAVE_LOCAL_TEMAS_DDS, JSON.stringify(mapa));
    } catch {
        // Persistência local não deve bloquear a impressão do DDS.
    }
}


const ORIENTACOES_PADRAO_DDS = [
    "Use sempre seus EPIs adequadamente.",
    "Siga os procedimentos e ordens de serviço.",
    "Mantenha o canteiro limpo e organizado.",
    "Em caso de dúvida, pare e pergunte.",
    "Segurança é responsabilidade de todos!",
    "Comunique imediatamente qualquer condição insegura.",
];

const CHAVE_LOCAL_ORIENTACOES_DDS = "controle-sst-qr:dds:orientacoes-por-codigo:v1";

function criarOrientacoesPadraoDds() {
    return ORIENTACOES_PADRAO_DDS.map((orientacao) => String(orientacao || "").trim());
}

function normalizarOrientacoesDdsLocal(orientacoes = null) {
    const lista = Array.isArray(orientacoes) ? orientacoes : [];

    return Array.from({ length: 6 }, (_, indice) => (
        Object.prototype.hasOwnProperty.call(lista, indice)
            ? String(lista[indice] ?? "").trim()
            : String(ORIENTACOES_PADRAO_DDS[indice] || "").trim()
    ));
}

function carregarOrientacoesDdsLocal(chave = "") {
    if (typeof window === "undefined") return null;

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return null;

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_ORIENTACOES_DDS) || "{}");
        const orientacoesSalvas = mapa?.[chaveSegura];

        return Array.isArray(orientacoesSalvas) ? normalizarOrientacoesDdsLocal(orientacoesSalvas) : null;
    } catch {
        return null;
    }
}

function salvarOrientacoesDdsLocal(chave = "", orientacoes = []) {
    if (typeof window === "undefined") return;

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return;

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_ORIENTACOES_DDS) || "{}");

        mapa[chaveSegura] = normalizarOrientacoesDdsLocal(orientacoes);
        window.localStorage.setItem(CHAVE_LOCAL_ORIENTACOES_DDS, JSON.stringify(mapa));
    } catch {
        // Persistência local não deve bloquear a impressão do DDS.
    }
}
const CHAVE_LOCAL_RECADOS_DDS = "controle-sst-qr:dds:recados-por-codigo:v1";

function normalizarRecadosDdsLocal(valor = "") {
    return String(valor ?? "").replace(/\r\n/g, "\n").trimEnd();
}

function carregarRecadosDdsLocal(chave = "") {
    if (typeof window === "undefined") return "";

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return "";

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_RECADOS_DDS) || "{}");
        const recadoSalvo = mapa?.[chaveSegura];

        return typeof recadoSalvo === "string" ? normalizarRecadosDdsLocal(recadoSalvo) : "";
    } catch {
        return "";
    }
}

function salvarRecadosDdsLocal(chave = "", valor = "") {
    if (typeof window === "undefined") return;

    const chaveSegura = String(chave ?? "").trim();

    if (!chaveSegura) return;

    try {
        const mapa = JSON.parse(window.localStorage.getItem(CHAVE_LOCAL_RECADOS_DDS) || "{}");

        mapa[chaveSegura] = normalizarRecadosDdsLocal(valor);
        window.localStorage.setItem(CHAVE_LOCAL_RECADOS_DDS, JSON.stringify(mapa));
    } catch {
        // Persistência local não deve bloquear a impressão do DDS.
    }
}
function resolverLogoEmpresaDds(valor = "") {
    const texto = String(valor ?? "").trim();

    if (!texto) return "";

    if (/^(https?:|data:|blob:|\/)/i.test(texto)) {
        return texto;
    }

    return obterUrlLogoEmpresa(texto);
}

function obterLogoEmpresaSelecionadaDds({ empresaSelecionada = null, colaboradoresEmpresa = [], dadosDds = {} } = {}) {
    const colaboradores = Array.isArray(colaboradoresEmpresa) ? colaboradoresEmpresa : [];
    const colaboradorComLogo = colaboradores.find((colaborador) =>
        String(colaborador?.empresaLogoUrl || colaborador?.logo_url || colaborador?.logoUrl || "").trim()
    );

    const candidatos = [
        empresaSelecionada?.logo_url,
        empresaSelecionada?.logoUrl,
        empresaSelecionada?.empresaLogoUrl,
        empresaSelecionada?.logoAtual,
        dadosDds?.empresaLogoUrl,
        colaboradorComLogo?.empresaLogoUrl,
        colaboradorComLogo?.logo_url,
        colaboradorComLogo?.logoUrl,
    ];

    const caminhoLogo = candidatos.find((valor) => String(valor ?? "").trim());

    return resolverLogoEmpresaDds(caminhoLogo || "");
}

function normalizarTextoEmpresaDds(valor = "") {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function obterLogoRawEmpresaDds(empresa = null) {
    return (
        empresa?.logo_url ||
        empresa?.logoUrl ||
        empresa?.empresaLogoUrl ||
        empresa?.logoAtual ||
        ""
    );
}

function empresaEhIdealizarCidadesDds(empresa = null) {
    const nome = normalizarTextoEmpresaDds(empresa?.nome);
    const tipo = normalizarTextoEmpresaDds(empresa?.tipo_empresa || empresa?.tipoEmpresa);

    return nome.includes("idealiz") || tipo.includes("idealiz");
}

function obterEmpresaPorIdDds(empresas = [], id = "") {
    const idSeguro = String(id ?? "").trim();
    if (!idSeguro) return null;

    return (Array.isArray(empresas) ? empresas : []).find((empresa) =>
        String(empresa?.id ?? "").trim() === idSeguro
    ) || null;
}

function obterEmpresaContratanteDds({ empresaSelecionada = null, empresasDds = [] } = {}) {
    const empresas = Array.isArray(empresasDds) ? empresasDds.filter(Boolean) : [];
    const paiDireto = obterEmpresaPorIdDds(
        empresas,
        empresaSelecionada?.empresa_pai_id || empresaSelecionada?.empresaPaiId || ""
    );
    const avo = obterEmpresaPorIdDds(
        empresas,
        paiDireto?.empresa_pai_id || paiDireto?.empresaPaiId || ""
    );

    if (empresaEhIdealizarCidadesDds(empresaSelecionada)) return empresaSelecionada;
    if (empresaEhIdealizarCidadesDds(paiDireto)) return paiDireto;
    if (empresaEhIdealizarCidadesDds(avo)) return avo;

    return empresas.find(empresaEhIdealizarCidadesDds) || paiDireto || null;
}


function adicionarLogoEmpresaCabecalhoDds(lista = [], empresa = null) {
    const logoUrl = resolverLogoEmpresaDds(obterLogoRawEmpresaDds(empresa));

    if (!logoUrl) return lista;

    const chave = String(empresa?.id || empresa?.nome || logoUrl || "").trim();

    if (lista.some((item) => item.chave === chave || item.logoUrl === logoUrl)) {
        return lista;
    }

    return [
        ...lista,
        {
            chave,
            logoUrl,
        },
    ];
}

function obterLogosEmpresasCabecalhoDds({ empresaSelecionada = null, empresasDds = [] } = {}) {
    const empresas = Array.isArray(empresasDds) ? empresasDds.filter(Boolean) : [];
    const empresaIdealiza = empresas.find(empresaEhIdealizarCidadesDds) || null;
    const paiDireto = obterEmpresaPorIdDds(
        empresas,
        empresaSelecionada?.empresa_pai_id || empresaSelecionada?.empresaPaiId || ""
    );
    const avo = obterEmpresaPorIdDds(
        empresas,
        paiDireto?.empresa_pai_id || paiDireto?.empresaPaiId || ""
    );

    let logos = [];

    if (empresaEhIdealizarCidadesDds(avo)) {
        logos = adicionarLogoEmpresaCabecalhoDds(logos, avo);
    } else if (empresaIdealiza) {
        logos = adicionarLogoEmpresaCabecalhoDds(logos, empresaIdealiza);
    }

    if (paiDireto && !empresaEhIdealizarCidadesDds(paiDireto)) {
        logos = adicionarLogoEmpresaCabecalhoDds(logos, paiDireto);
    }

    if (empresaSelecionada && !empresaEhIdealizarCidadesDds(empresaSelecionada)) {
        logos = adicionarLogoEmpresaCabecalhoDds(logos, empresaSelecionada);
    }

    if (logos.length === 0 && empresaSelecionada) {
        logos = adicionarLogoEmpresaCabecalhoDds(logos, empresaSelecionada);
    }

    return logos;
}
function MarcaLogosEmpresasDdsImpresso({ logos = [], compacto = false }) {
    const logosNormalizados = (Array.isArray(logos) ? logos : [])
        .map((item) => ({
            logoUrl: resolverLogoEmpresaDds(item?.logoUrl || item),
        }))
        .filter((item) => item.logoUrl);

    const tresOuMaisLogos = logosNormalizados.length >= 3;

    const classeContainer = compacto
        ? "flex w-full translate-x-3 items-center justify-center gap-3"
        : tresOuMaisLogos
            ? "flex w-full translate-x-5 items-center justify-center gap-4"
            : "flex w-full translate-x-5 items-center justify-center gap-7";

    const classeImagem = compacto
        ? tresOuMaisLogos
            ? "h-[52px] max-w-[82px] object-contain"
            : "h-[60px] max-w-[118px] object-contain"
        : tresOuMaisLogos
            ? "h-[82px] max-w-[92px] object-contain"
            : "h-[88px] max-w-[148px] object-contain";

    return (
        <div className={classeContainer}>
            {logosNormalizados.map((item, indice) => (
                <img
                    key={`${item.logoUrl}-${indice}`}
                    src={item.logoUrl}
                    alt="Logo da empresa"
                    className={classeImagem}
                />
            ))}
        </div>
    );
}
function MarcaEmpresaDdsImpresso({ logoUrl = "", compacto = false }) {
    const logoSeguro = resolverLogoEmpresaDds(logoUrl);

    return (
        <div className={compacto
            ? "flex h-14 items-center justify-center rounded-xl border border-slate-300 bg-white p-2"
            : "flex h-20 items-center justify-center rounded-xl border border-slate-300 bg-white p-3"}
        >
            {logoSeguro ? (
                <img
                    src={logoSeguro}
                    alt="Logo da empresa"
                    className={compacto
                        ? "h-11 max-w-[180px] object-contain"
                        : "h-16 max-w-[240px] object-contain"}
                />
            ) : null}
        </div>
    );
}

function normalizarTextoTemaDds(valor = "") {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
}

function temaDdsSemAtividade(dia = {}) {
    const tema = normalizarTextoTemaDds(dia?.tema);

    return tema === "NAO HOUVE ATIVIDADES";
}

function MarcacaoDiaSemAtividadeDds() {
    return (
        <span className="inline-flex h-5 min-w-8 items-center justify-center text-base font-black text-slate-500">
            {"\u2014"}
        </span>
    );
}

function CelulaAssinaturaDiaDds({ dia = {}, compacto = false }) {
    return (
        <td className={compacto
            ? "border border-slate-300 px-1 py-1.5 text-center"
            : "border border-slate-300 px-1 py-1 text-center"}
        >
            {temaDdsSemAtividade(dia) ? <MarcacaoDiaSemAtividadeDds /> : null}
        </td>
    );
}

function BlocoRecadosDdsImpresso({ texto = "" }) {
    const linhas = String(texto ?? "")
        .replace(/\r\n/g, "\n")
        .split("\n")
        .map((linha) => linha.trim())
        .filter(Boolean)
        .slice(0, 6);

    const linhasImpressao = Array.from({ length: 6 }, (_, indice) => linhas[indice] || "");

    return (
        <div className="mt-2 space-y-1.5 text-[10px] font-bold leading-4 text-slate-800">
            {linhasImpressao.map((linha, indice) => (
                <div
                    key={`linha-recado-dds-${indice}`}
                    className="min-h-[14px] border-b border-slate-400 px-1 pb-0.5"
                >
                    <span className="block break-words">
                        {linha || "\u00A0"}
                    </span>
                </div>
            ))}
        </div>
    );
}

function obterDataNascimentoColaboradorDds(colaborador = {}) {
    return (
        colaborador?.dataNascimento ||
        colaborador?.data_nascimento ||
        colaborador?.nascimento ||
        colaborador?.dt_nascimento ||
        colaborador?.data_de_nascimento ||
        colaborador?.data_aniversario ||
        colaborador?.dataAniversario ||
        colaborador?.aniversario ||
        ""
    );
}

function extrairDiaMesNascimentoDds(valor = "") {
    const texto = String(valor ?? "").trim();

    if (!texto) return null;

    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) {
        return {
            dia: Number(iso[3]),
            mes: Number(iso[2]),
        };
    }

    const br = texto.match(/^(\d{1,2})[/-](\d{1,2})(?:[/-]\d{2,4})?/);
    if (br) {
        return {
            dia: Number(br[1]),
            mes: Number(br[2]),
        };
    }

    return null;
}

function limparHoraDataDds(data) {
    const limpa = new Date(data);
    limpa.setHours(0, 0, 0, 0);
    return limpa;
}

function formatarDiaMesDds(data) {
    const dia = String(data.getDate()).padStart(2, "0");
    const mes = String(data.getMonth() + 1).padStart(2, "0");

    return `${dia}/${mes}`;
}

function colaboradorDeveAparecerAniversarioDds(colaborador = {}) {
    return (
        colaborador?.mostrarAniversarioDashboard !== false &&
        colaborador?.mostrar_aniversario_dashboard !== false
    );
}

function montarAniversariantesSemanaDds({ colaboradores = [], inicioSemana = new Date(), fimSemana = new Date() } = {}) {
    const lista = Array.isArray(colaboradores) ? colaboradores : [];
    const inicio = limparHoraDataDds(inicioSemana);
    const fim = limparHoraDataDds(fimSemana);
    const anoInicial = inicio.getFullYear();
    const anosPossiveis = Array.from(new Set([anoInicial, fim.getFullYear(), anoInicial + 1]));

    return lista
        .filter(colaboradorDeveAparecerAniversarioDds)
        .map((colaborador) => {
            const dataNascimento = extrairDiaMesNascimentoDds(obterDataNascimentoColaboradorDds(colaborador));

            if (!dataNascimento?.dia || !dataNascimento?.mes) return null;

            const dataAniversario = anosPossiveis
                .map((ano) => limparHoraDataDds(new Date(ano, dataNascimento.mes - 1, dataNascimento.dia)))
                .find((data) => data >= inicio && data <= fim);

            if (!dataAniversario) return null;

            return {
                data: formatarDiaMesDds(dataAniversario),
                nome: String(colaborador?.nome || colaborador?.nomeCompleto || colaborador?.colaborador || "").trim(),
                ordem: dataAniversario.getTime(),
            };
        })
        .filter((item) => item?.nome)
        .sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome))
        .slice(0, 5)
        .map(({ data, nome }) => ({ data, nome }));
}
function DdsQrConferenciaImpresso({ url = "", size = 56, fallbackClassName = "h-14 w-14" }) {
    const urlSeguro = String(url || "").trim();

    if (!urlSeguro) {
        return (
            <div className={`flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-[9px] font-black uppercase text-slate-400 ${fallbackClassName}`}>
                QR
            </div>
        );
    }

    return (
        <QRCodeSVG
            value={urlSeguro}
            size={size}
            level="M"
            includeMargin
            className="rounded-lg bg-white p-1"
        />
    );
}
function DdsCampoObra({ rotulo = "", valor = "" }) {
    const valorSeguro = String(valor || "-").trim() || "-";

    return (
        <div className="border-b border-r border-slate-300 px-3 py-2 last:border-r-0">
            <p className="text-[8px] font-black uppercase tracking-wide text-slate-500">
                {rotulo}
            </p>
            <p className="mt-0.5 text-[11px] font-black uppercase leading-tight text-slate-950">
                {valorSeguro}
            </p>
        </div>
    );
}
function obterUuidSeguroDds(valor = "") {
    const texto = String(valor || "").trim();
    const encontrado = texto.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);

    return encontrado ? encontrado[0].toLowerCase() : "";
}
function QuadradoPresenca() {
    return (
        <div className="flex h-full min-h-[18px] w-full items-center justify-center">
            <span className="block h-[8px] w-[12px] border border-slate-300 bg-white" />
        </div>
    );
}
function DdsPreviewImpresso({ participantes = participantesDds, mostrarAssinaturas = true, dadosDds = dadosDdsPadrao, diasSemana = diasDds, aniversariantes = aniversariantesDds }) {
    return (
        <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
                <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-xl border border-slate-300 bg-white p-3 text-slate-950">
                    <header className="grid grid-cols-[250px_minmax(0,1fr)_350px] items-center gap-3 border-b border-slate-300 pb-2">
                        <div className="space-y-2">
                            <MarcaLogosEmpresasDdsImpresso
                                logos={dadosDds.logosEmpresasCabecalho}
                            />
                        </div>

                        <div className="text-center">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">DDS Semanal de Obra</h2>
                            <p className="mt-0.5 text-xl font-black uppercase text-emerald-700">Diálogo Diário de Segurança</p>
                            <p className="mt-0.5 text-xs font-semibold text-slate-500">Segurança se faz todos os dias. Prevenção, atenção e cuidado.</p>
                        </div>

                        <div className="grid grid-cols-[1fr_94px] gap-3">
                            <div className="rounded-xl border border-slate-300 p-2.5">
                                <p className="text-[9px] font-black uppercase text-slate-500">Semana</p>
                                <p className="text-base font-black text-slate-950">{dadosDds.periodo}</p>
                                <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                <p className="rounded-lg bg-slate-950 px-2 py-0.5 text-center text-xs font-black text-white">{dadosDds.codigo}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-300 p-2 text-center">
                                <DdsQrConferenciaImpresso url={dadosDds.qrConferenciaUrl} size={72} fallbackClassName="h-[72px] w-[72px]" />
                                <p className="mt-0.5 text-[5.5px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
                            </div>
                        </div>
                    </header>

                    <section className="mt-2 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-300">
                        <DdsCampoObra rotulo="Empresa" valor={dadosDds.empresa} />
                        <DdsCampoObra rotulo="Obra / Setor" valor={dadosDds.obraSetor} />
                        <DdsCampoObra rotulo="Turno" valor={dadosDds.turno} />
                        <DdsCampoObra
                            rotulo="Responsável pelo DDS"
                            valor={formatarResponsavelCabecalhoDds(dadosDds)}
                        />
                        <DdsCampoObra rotulo="Fiscal Idealiza" valor={dadosDds.fiscalIdealiza} />
                        <DdsCampoObra rotulo="Líder / Encarregado" valor={dadosDds.encarregado} />
                    </section>

                    <section className="mt-2 overflow-hidden rounded-xl border border-slate-300">
                        <div className="bg-slate-950 py-1 text-center text-[10px] font-black uppercase tracking-wide text-white">
                            Temas do DDS por dia da semana
                        </div>
                        <table className="dds-tabela-temas-semanal w-full table-fixed border-collapse text-center text-[11px]" style={{ tableLayout: "fixed", width: "100%" }}>
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    {diasSemana.map((dia) => (
                                        <th key={dia.curto} className="w-[14.285%] border border-slate-400 px-2 py-1.5">
                                            <span className="block text-xs font-black uppercase">{dia.nome}</span>
                                            <span className="block text-[11px] font-black text-emerald-300">{dia.data}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                                                        <tbody>
                                <tr>
                                    {diasSemana.map((dia) => {
                                        const diaSemAtividade = temaDdsSemAtividade(dia);
                                        const temaDia = diaSemAtividade ? "NÃO HOUVE ATIVIDADES" : (dia.tema || "");
                                        const responsavelDia = diaSemAtividade ? "" : (dia.responsavel || "");

                                        return (
                                            <td
                                                key={dia.curto}
                                                className="dds-tema-celula h-24 w-[14.285%] max-w-0 border border-slate-300 align-top"
                                            >
                                                <div className="flex h-full min-h-[104px] flex-col">
                                                    <div className="border-b border-slate-300 bg-slate-50 py-1 text-center text-[8px] font-black uppercase tracking-[0.18em] text-slate-500">
                                                        Tema
                                                    </div>
                                                    <div className="flex min-h-[58px] flex-1 items-center justify-center border-b border-slate-200 px-2 py-1.5 text-center text-[9.5px] font-bold leading-[1.22] text-slate-950">
                                                        <span
                                                            className="block w-full max-w-full whitespace-normal break-words"
                                                            style={{
                                                                overflowWrap: "anywhere",
                                                                wordBreak: "break-word",
                                                                hyphens: "auto",
                                                            }}
                                                        >
                                                            {temaDia || "\u00A0"}
                                                        </span>
                                                    </div>
                                                    <div className="flex min-h-[26px] items-center justify-center px-1.5 py-1 text-center text-[8px] font-bold leading-tight text-slate-700">
                                                        {responsavelDia ? (
                                                            <>
                                                                <span className="mr-1 font-black uppercase tracking-[0.12em] text-slate-400">
                                                                    Resp.
                                                                </span>
                                                                {responsavelDia}
                                                            </>
                                                        ) : (
                                                            <span>&nbsp;</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mt-2 overflow-hidden rounded-xl border border-slate-300">
                        <table className="w-full border-collapse text-[9.5px]">
                            <thead>
                                <tr className="bg-slate-950 text-white">
                                    <th className="w-10 border border-slate-400 px-1 py-1.5">Nº</th>
                                    <th className="w-[230px] border border-slate-400 px-2 py-1.5">Funcionário</th>
                                    <th className="w-[150px] border border-slate-400 px-2 py-1.5">Função</th>
                                    <th className="w-[140px] border border-slate-400 px-2 py-1.5">Empresa</th>
                                    {diasSemana.map((dia) => (
                                        <th key={dia.curto} className="w-[72px] border border-slate-400 px-1 py-1.5">
                                            <span className="block">{dia.curto}</span>
                                            <span className="block text-[9px] text-emerald-300">{dia.data.slice(0, 5)}</span>
                                        </th>
                                    ))}
                                    <th className="w-[74px] border border-slate-400 px-1 py-1.5">Semana completa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participantes.map((participante, indice) => (
                                    <tr key={participante.nome || `linha-em-branco-${participante.numero}`} className="odd:bg-white even:bg-slate-50">
                                        <td className="border border-slate-300 px-1 py-0.5 text-center font-black">{participante.numero || indice + 1}</td>
                                        <td className="border border-slate-300 px-2 py-0.5 font-semibold">{participante.nome}</td>
                                        <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold">{participante.funcao}</td>
                                        <td className="border border-slate-300 px-2 py-0.5 text-center font-semibold">{participante.empresa}</td>
                                        {diasSemana.map((dia) => (
                                            <td key={dia.curto} className="border border-slate-300 px-1 py-0.5 text-center align-middle">
                                                {dia.semAtividade ? <MarcacaoDiaSemAtividadeDds /> : null}
                                            </td>
                                        ))}
                                        <td className="border border-slate-300 px-1 py-0.5 text-center">
                                            <QuadradoPresenca />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <footer className="dds-folha1-footer mt-2 space-y-2">
                        <div className="dds-folha1-complementos grid gap-2 lg:grid-cols-[0.82fr_1.1fr_1fr]">
                            <div className="rounded-xl border border-emerald-600 p-2">
                                <div className="flex items-center gap-2">
                                    <Gift className="h-4 w-4 text-emerald-700" />
                                    <p className="text-[12px] font-black uppercase text-emerald-700">Aniversariantes da semana</p>
                                </div>

                                <div className="mt-1.5 grid min-h-[84px] grid-rows-5 gap-0.5 text-[10px] font-bold text-slate-800">
                                    {aniversariantes.map((item) => (
                                        <div key={item.nome} className="grid min-h-[15px] grid-cols-[42px_14px_minmax(0,1fr)] items-center gap-1 border-b border-slate-300 px-1 pb-0.5 last:border-b-0">
                                            <span className="font-black text-slate-700">{item.data}</span>
                                            <span className="text-center font-black text-slate-400">—</span>
                                            <span className="truncate font-black text-slate-900">{item.nome}</span>
                                        </div>
                                    ))}

                                    {Array.from({ length: Math.max(0, 5 - aniversariantes.length) }).map((_, indice) => (
                                        <div key={`aniversariante-vazio-${indice}`} className="min-h-[15px] border-b border-slate-300 px-1 pb-0.5 last:border-b-0">
                                            &nbsp;
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-1 border-t border-emerald-100 pt-1 text-center text-[10px] font-black leading-[13px] text-emerald-700">
                                    Parabéns aos aniversariantes da semana.<br />
                                    Segurança também é cuidar das pessoas.
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-600 p-2">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-4 w-4 text-emerald-700" />
                                    <p className="text-[12px] font-black uppercase text-emerald-700">Recados e pontos reforçados na semana</p>
                                </div>

                                <BlocoRecadosDdsImpresso texto={dadosDds.recadosSemana} />
                            </div>

                            <div className="rounded-xl border border-emerald-600 p-2">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-4 w-4 text-emerald-700" />
                                    <p className="text-[12px] font-black uppercase text-emerald-700">Orientações importantes</p>
                                </div>

                                <div className="mt-1.5 grid min-h-[108px] grid-rows-6 gap-0.5 text-[9.5px] font-bold leading-3 text-slate-800">
                                    {(Array.isArray(dadosDds.orientacoesImportantes) ? dadosDds.orientacoesImportantes : criarOrientacoesPadraoDds())
                                        .map((orientacao) => String(orientacao || "").trim())
                                        .filter(Boolean)
                                        .slice(0, 6)
                                        .map((orientacao, indice) => (
                                            <div key={`orientacao-impressa-dds-${indice}`} className="flex min-h-[15px] items-center gap-1.5 border-b border-slate-200 px-1 pb-0.5 last:border-b-0">
                                                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700" />
                                                <span>{orientacao}</span>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>

                        {mostrarAssinaturas && (
                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-xl border border-slate-300 p-3 text-center">
                                    <p className="text-sm font-black uppercase text-slate-950">Responsável pelo DDS</p>
                                    <div className="mx-auto mt-10 w-[82%] border-b border-slate-800" />
                                    <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                    <p className="mt-5 text-[10px] font-bold text-slate-700">Data: ____/____/______</p>
                                </div>

                                <div className="rounded-xl border border-emerald-600 p-3 text-center">
                                    <p className="text-[12px] font-black uppercase text-emerald-700">Encarregado</p>
                                    <div className="mx-auto mt-10 w-[82%] border-b border-slate-800" />
                                    <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                    <p className="mt-5 text-[10px] font-bold text-slate-700">Data: ____/____/______</p>
                                </div>
                            </div>
                        )}
                    </footer>

                    <div className="mt-2 flex items-center justify-between border-t border-slate-300 pt-1.5 text-[9px] font-black uppercase text-slate-600">
                        <span>Segurança é valor.</span>
                        <span>Prevenção é atitude.</span>
                        <span>Todos juntos, nenhum acidente.</span>
                        <span>Documento gerado pelo SafeScan Brasil.</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

function DdsPreviewImpressoContinuacao({ participantes = participantesDdsContinuacao, numeroPagina = 2, totalPaginas = 2, ultimaFolha = true, numeroInicial = 16, dadosDds = dadosDdsPadrao, diasSemana = diasDds }) {
    const participantesFolha = Array.isArray(participantes)
        ? participantes
        : [];
    return (
        <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
                <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-xl border border-slate-300 bg-white p-4 text-slate-950">
                    <header className="grid grid-cols-[240px_minmax(0,1fr)_330px] items-center gap-4 border-b border-slate-300 pb-3">
                        <div className="space-y-2">
                            <MarcaLogosEmpresasDdsImpresso
                                logos={dadosDds.logosEmpresasCabecalho}
                                compacto
                            />
                        </div>

                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">{`Página ${numeroPagina} de ${totalPaginas}`}</p>
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-950">Continuação da Lista de Presença</h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">DDS Semanal de Obra — {dadosDds.periodo}</p>
                        </div>

                        <div className="grid grid-cols-[1fr_82px] gap-3">
                            <div className="rounded-xl border border-slate-300 p-3">
                                <p className="text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                <p className="rounded-lg bg-slate-950 px-2 py-1 text-center text-sm font-black text-white">{dadosDds.codigo}</p>
                                <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Obra / Setor</p>
                                <p className="text-xs font-black uppercase text-slate-950">{dadosDds.obraSetor}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-300 p-2 text-center">
                                <DdsQrConferenciaImpresso url={dadosDds.qrConferenciaUrl} size={64} fallbackClassName="h-16 w-16" />
                                <p className="mt-0.5 text-[5px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
                            </div>
                        </div>
                    </header>

                    <section className="mt-3 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-300 text-[10px]">
                        <div className="border-r border-slate-300 px-3 py-2">
                            <p className="font-black uppercase tracking-wide text-slate-500">Empresa</p>
                            <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.empresa}</p>
                        </div>
                        <div className="border-r border-slate-300 px-3 py-2">
                            <p className="font-black uppercase tracking-wide text-slate-500">Responsável pelo DDS</p>
                            <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.responsavel}</p>
                        </div>
                        <div className="border-r border-slate-300 px-3 py-2">
                            <p className="font-black uppercase tracking-wide text-slate-500">Encarregado</p>
                            <p className="mt-1 font-black uppercase text-slate-950">{dadosDds.encarregado}</p>
                        </div>
                        <div className="px-3 py-2">
                            <p className="font-black uppercase tracking-wide text-slate-500">Controle</p>
                            <p className="mt-1 font-black uppercase text-slate-950">Folha complementar de presença</p>
                        </div>
                    </section>

                    <section className="mt-3 overflow-hidden rounded-xl border border-slate-300">
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-slate-950 text-white">
                                    <th className="w-10 border border-slate-400 px-1 py-2">Nº</th>
                                    <th className="w-[250px] border border-slate-400 px-2 py-2">Funcionário</th>
                                    <th className="w-[155px] border border-slate-400 px-2 py-2">Função</th>
                                    <th className="w-[145px] border border-slate-400 px-2 py-2">Empresa</th>
                                    {diasSemana.map((dia) => (
                                        <th key={dia.curto} className="w-[76px] border border-slate-400 px-1 py-2">
                                            <span className="block">{dia.curto}</span>
                                            <span className="block text-[9px] text-emerald-300">{dia.data.slice(0, 5)}</span>
                                        </th>
                                    ))}
                                    <th className="w-[78px] border border-slate-400 px-1 py-2">Semana completa</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participantesFolha.map((participante) => (
                                    <tr key={participante.nome || `linha-em-branco-${participante.numero}`} className="odd:bg-white even:bg-slate-50">
                                        <td className="border border-slate-300 px-1 py-1.5 text-center font-black">{participante.numero}</td>
                                        <td className="border border-slate-300 px-2 py-1.5 font-semibold">{participante.nome}</td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{participante.funcao}</td>
                                        <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">{participante.empresa}</td>
                                        {diasSemana.map((dia) => (
                                            <td key={dia.curto} className="border border-slate-300 px-1 py-1.5 text-center align-middle">
                                                {dia.semAtividade ? <MarcacaoDiaSemAtividadeDds /> : null}
                                            </td>
                                        ))}
                                        <td className="border border-slate-300 px-1 py-1.5 text-center">
                                            <QuadradoPresenca />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                                        {ultimaFolha ? (
                        <footer className="mt-3 grid grid-cols-2 gap-3">
                            <div className="rounded-xl border border-slate-300 p-3 text-center">
                                <p className="text-xs font-black uppercase text-slate-950">Responsável pelo DDS</p>
                                <div className="mx-auto mt-8 w-[82%] border-b border-slate-800" />
                                <p className="mt-2 text-[9px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                            </div>
                            <div className="rounded-xl border border-emerald-600 p-3 text-center">
                                <p className="text-xs font-black uppercase text-emerald-700">Encarregado</p>
                                <div className="mx-auto mt-8 w-[82%] border-b border-slate-800" />
                                <p className="mt-2 text-[9px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                            </div>
                        </footer>
                    ) : (
                        <footer className="mt-3 rounded-xl border border-slate-300 p-3 text-center">
                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-600">
                                Continuação automática da lista de presença. Assinaturas finais somente na última folha.
                            </p>
                        </footer>
                    )}

                    <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-2 text-[10px] font-black uppercase text-slate-600">
                        <span>{`Folha ${numeroPagina} — continuação de presença.`}</span>
                        <span>Documento vinculado ao QR de conferência.</span>
                        <span>Preencher, assinar e arquivar junto à folha 1.</span>
                    </div>
                </div>
            </div>
        </section>
    );
}
function DdsPrintStyles() {
    return (
        <style>
            {`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 2mm;
                    }

                    html,
                    body {
                        width: 297mm !important;
                        min-width: 297mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    body {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    .dds-no-print {
                        display: none !important;
                    }

                    .dds-print-area,
                    .dds-print-area * {
                        visibility: visible !important;
                    }

                    .dds-print-area {
                        position: absolute !important;
                        inset: 0 auto auto 0 !important;
                        width: 293mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        background: #ffffff !important;
                    }

                    .dds-print-page {
                        position: relative !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: 293mm !important;
                        height: 206mm !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        border: 0 !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        overflow: hidden !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                        break-after: page !important;
                        page-break-after: always !important;
                    }



    .dds-tabela-temas-semanal {
        table-layout: fixed !important;
        width: 100% !important;
    }

    .dds-tabela-temas-semanal .dds-tema-celula,
    .dds-tabela-temas-semanal .dds-tema-celula span {
        max-width: 100% !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
        hyphens: auto !important;
    }
/* dds-print-tema-quebra */
    .dds-print-page td,
    .dds-print-page th {
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
    }

    .dds-print-page .dds-tema-texto,
    .dds-print-page .dds-tema-celula {
        min-height: 82px !important;
        white-space: normal !important;
        overflow-wrap: anywhere !important;
        word-break: break-word !important;
        vertical-align: top !important;
    }
/* DDS folha 1 compacta pós-rodapé */
                    .dds-print-area .dds-print-page:first-child .dds-print-sheet {
                        zoom: 0.82 !important;
                        padding: 9px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet header {
                        padding-bottom: 6px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet section {
                        margin-top: 6px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet table {
                        line-height: 1.04 !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet th,
                    .dds-print-area .dds-print-page:first-child .dds-print-sheet td {
                        padding-top: 2px !important;
                        padding-bottom: 2px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-folha1-footer {
                        margin-top: 5px !important;
                        gap: 5px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-folha1-complementos {
                        gap: 6px !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-folha1-complementos > div {
                        padding: 6px !important;
                        min-height: 0 !important;
                    }
                    .dds-print-page:last-child {
                        break-after: auto !important;
                        page-break-after: auto !important;
                    }

                    .dds-print-page > div {
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        width: auto !important;
                        height: auto !important;
                        max-width: none !important;
                        margin: 0 auto !important;
                        padding: 0 !important;
                        overflow: visible !important;
                    }

                    .dds-print-sheet {
                        position: relative !important;
                        width: 1320px !important;
                        max-width: 1320px !important;
                        min-width: 1320px !important;
                        margin: 0 auto !important;
                        padding: 9px !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        transform: none !important;
                        transform-origin: center center !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet {
                        zoom: 0.82 !important;
                    }

                    .dds-print-area .dds-print-page:not(:first-child) .dds-print-sheet {
                        zoom: 0.82 !important;
                    }

                    .dds-print-sheet header {
                        gap: 8px !important;
                        padding-bottom: 6px !important;
                    }

                    .dds-print-sheet table {
                        line-height: 1.08 !important;
                    }

                    .dds-print-sheet th,
                    .dds-print-sheet td {
                        padding-top: 3px !important;
                        padding-bottom: 3px !important;
                    }

                    .dds-folha1-footer {
                        margin-top: 5px !important;
                    }

                    .dds-folha1-complementos {
                        display: grid !important;
                        grid-template-columns: 0.82fr 1.1fr 1fr !important;
                        gap: 7px !important;
                    }

                    .dds-folha1-complementos > div {
                        padding: 7px !important;
                        min-height: 0 !important;
                    }

                    .dds-folha1-complementos p {
                        line-height: 1.12 !important;
                    }

                    .dds-print-sheet p,
                    .dds-print-sheet span,
                    .dds-print-sheet div,
                    .dds-print-sheet th,
                    .dds-print-sheet td {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}
        </style>
    );
}
export function DdsPage({
    supabase = null,
    colaboradores = [],
    empresasBanco = [],
    obrasEmpresasBanco = [],
    usuario = null,
}) {
    const empresasDds = useMemo(
        () => (Array.isArray(empresasBanco) ? empresasBanco.filter(Boolean) : []),
        [empresasBanco]
    );

    const obrasEmpresasDds = useMemo(
        () => (Array.isArray(obrasEmpresasBanco) ? obrasEmpresasBanco.filter(Boolean) : []),
        [obrasEmpresasBanco]
    );

    const [empresaSelecionadaChaveDds, setEmpresaSelecionadaChaveDds] = useState(() => carregarEmpresaSelecionadaDds());
    const [obraSelecionadaIdDds, setObraSelecionadaIdDds] = useState("");
    const [deslocamentoSemanasDds, setDeslocamentoSemanasDds] = useState(0);
    const [obrasSetorPorEmpresaDds, setObrasSetorPorEmpresaDds] = useState(() => carregarObrasSetorDdsPorEmpresa());
    const [fiscalIdealizaPorEmpresaDds, setFiscalIdealizaPorEmpresaDds] = useState(() => carregarFiscalIdealizaDdsPorEmpresa());

    function atualizarEmpresaSelecionadaDds(chaveEmpresa) {
        setEmpresaSelecionadaChaveDds(chaveEmpresa);
        setObraSelecionadaIdDds("");
        salvarEmpresaSelecionadaDds(chaveEmpresa);
    }

    useEffect(() => {
        if (empresasDds.length === 0) {
            setEmpresaSelecionadaChaveDds("");
            salvarEmpresaSelecionadaDds("");
            return;
        }

        const existeEmpresaSelecionada = empresasDds.some((empresa, indice) =>
            obterChaveEmpresaDds(empresa, indice) === empresaSelecionadaChaveDds
        );

        if (!empresaSelecionadaChaveDds || !existeEmpresaSelecionada) {
            const chaveEmpresaInicial = obterChaveEmpresaDds(empresasDds[0], 0);
            setEmpresaSelecionadaChaveDds(chaveEmpresaInicial);
            salvarEmpresaSelecionadaDds(chaveEmpresaInicial);
        }
    }, [empresasDds, empresaSelecionadaChaveDds]);

    const empresaSelecionadaDds = useMemo(
        () => empresasDds.find((empresa, indice) =>
            obterChaveEmpresaDds(empresa, indice) === empresaSelecionadaChaveDds
        ) || null,
        [empresasDds, empresaSelecionadaChaveDds]
    );

    const colaboradoresEmpresaDds = useMemo(() => {
        const colaboradoresFiltradosDds = filtrarColaboradoresPorEmpresaDds(colaboradores, empresaSelecionadaDds);
        const colaboradoresOriginaisDds = Array.isArray(colaboradores) ? colaboradores : [];

        return colaboradoresFiltradosDds.map((colaboradorFiltrado) => {
            const idFiltradoDds = obterValorTextoDds(colaboradorFiltrado?.id, colaboradorFiltrado?.colaborador_id, colaboradorFiltrado?.token);
            const nomeFiltradoDds = normalizarTextoCodigoDds(obterValorTextoDds(
                colaboradorFiltrado?.nome,
                colaboradorFiltrado?.nomeCompleto,
                colaboradorFiltrado?.nome_completo,
                colaboradorFiltrado?.colaborador,
                colaboradorFiltrado?.nomeColaborador
            ));
            const empresaFiltradaDds = normalizarTextoCodigoDds(obterValorTextoDds(
                colaboradorFiltrado?.empresaExibicao,
                colaboradorFiltrado?.empresa_exibicao,
                colaboradorFiltrado?.empresaNome,
                colaboradorFiltrado?.empresa_nome,
                colaboradorFiltrado?.empresa
            ));

            const colaboradorOriginalDds = colaboradoresOriginaisDds.find((colaboradorOriginal) => {
                const idOriginalDds = obterValorTextoDds(colaboradorOriginal?.id, colaboradorOriginal?.colaborador_id, colaboradorOriginal?.token);

                if (idFiltradoDds && idOriginalDds && idFiltradoDds === idOriginalDds) {
                    return true;
                }

                const nomeOriginalDds = normalizarTextoCodigoDds(obterValorTextoDds(
                    colaboradorOriginal?.nome,
                    colaboradorOriginal?.nomeCompleto,
                    colaboradorOriginal?.nome_completo,
                    colaboradorOriginal?.colaborador,
                    colaboradorOriginal?.nomeColaborador
                ));

                if (!nomeFiltradoDds || !nomeOriginalDds || nomeFiltradoDds !== nomeOriginalDds) {
                    return false;
                }

                const empresaOriginalDds = normalizarTextoCodigoDds(obterValorTextoDds(
                    colaboradorOriginal?.empresaExibicao,
                    colaboradorOriginal?.empresa_exibicao,
                    colaboradorOriginal?.empresaNome,
                    colaboradorOriginal?.empresa_nome,
                    colaboradorOriginal?.empresa
                ));

                return !empresaFiltradaDds ||
                    !empresaOriginalDds ||
                    empresaOriginalDds.includes(empresaFiltradaDds) ||
                    empresaFiltradaDds.includes(empresaOriginalDds);
            });

            const codigoFuncionarioDds = obterValorTextoDds(
                colaboradorFiltrado?.codigoFuncionario,
                colaboradorFiltrado?.codigo_funcionario,
                colaboradorFiltrado?.codigoSafescan,
                colaboradorFiltrado?.codigoSafeScan,
                colaboradorFiltrado?.codigo_safescan,
                colaboradorFiltrado?.codigo,
                colaboradorFiltrado?.codigo_colaborador,
                colaboradorOriginalDds?.codigoFuncionario,
                colaboradorOriginalDds?.codigo_funcionario,
                colaboradorOriginalDds?.codigoSafescan,
                colaboradorOriginalDds?.codigoSafeScan,
                colaboradorOriginalDds?.codigo_safescan,
                colaboradorOriginalDds?.codigo,
                colaboradorOriginalDds?.codigo_colaborador
            );

            return {
                ...(colaboradorOriginalDds || {}),
                ...colaboradorFiltrado,
                codigoFuncionario: codigoFuncionarioDds,
                codigo_funcionario: codigoFuncionarioDds,
                codigoSafescan: obterValorTextoDds(colaboradorFiltrado?.codigoSafescan, codigoFuncionarioDds),
            };
        });
    }, [colaboradores, empresaSelecionadaDds]);

    const obrasEmpresaSelecionadaDds = useMemo(() => {
        const empresaIdSelecionada = obterIdEmpresaObjetoDds(empresaSelecionadaDds);

        if (!empresaIdSelecionada) return [];

        return obrasEmpresasDds.filter((item) => {
            const obraBase = obterObraBaseDds(item);

            return (
                obterEmpresaIdObraDds(item) === empresaIdSelecionada &&
                item?.status !== "Inativa" &&
                obraBase?.status !== "Inativa"
            );
        });
    }, [empresaSelecionadaDds, obrasEmpresasDds]);

    const inicioSemanaDds = useMemo(
        () => adicionarDiasDds(obterInicioSemanaDds(), deslocamentoSemanasDds * 7),
        [deslocamentoSemanasDds]
    );
    const fimSemanaDds = useMemo(() => obterFimSemanaDds(inicioSemanaDds), [inicioSemanaDds]);
    const diasSemanaDds = useMemo(() => gerarDiasSemanaDds(inicioSemanaDds), [inicioSemanaDds]);

    const dadosDdsAutomaticos = useMemo(() => {
        const dadosAutomaticos = montarDadosDdsAutomaticos({
            colaboradores: colaboradoresEmpresaDds,
            empresasBanco,
            empresaSelecionada: empresaSelecionadaDds,
            usuario,
            inicioSemana: inicioSemanaDds,
            fimSemana: fimSemanaDds,
        });

        const obraSetorSalva = String(obrasSetorPorEmpresaDds?.[empresaSelecionadaChaveDds] || "").trim();
        const fiscalIdealizaFoiSalvoAutomatico = empresaSelecionadaChaveDds
            ? Object.prototype.hasOwnProperty.call(fiscalIdealizaPorEmpresaDds || {}, empresaSelecionadaChaveDds)
            : false;
        const fiscalIdealizaSalvo = fiscalIdealizaFoiSalvoAutomatico
            ? String(fiscalIdealizaPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
            : "";

        return {
            ...dadosAutomaticos,
            obraSetor: obraSetorSalva || dadosAutomaticos.obraSetor,
            fiscalIdealiza: fiscalIdealizaFoiSalvoAutomatico ? fiscalIdealizaSalvo : dadosAutomaticos.fiscalIdealiza,
        };
    }, [
        colaboradoresEmpresaDds,
        empresasBanco,
        empresaSelecionadaDds,
        usuario,
        inicioSemanaDds,
        fimSemanaDds,
        obrasSetorPorEmpresaDds,
        fiscalIdealizaPorEmpresaDds,
        empresaSelecionadaChaveDds,
    ]);

    const [dadosDds, setDadosDds] = useState(dadosDdsAutomaticos);
    const [temasDdsEditaveis, setTemasDdsEditaveis] = useState(() => criarTemasEditaveisDds());
    const [chaveTemasDdsCarregada, setChaveTemasDdsCarregada] = useState("");
    const [recadosDdsEditaveis, setRecadosDdsEditaveis] = useState("");
    const [chaveRecadosDdsCarregada, setChaveRecadosDdsCarregada] = useState("");

    const [orientacoesDdsEditaveis, setOrientacoesDdsEditaveis] = useState(() => criarOrientacoesPadraoDds());
    const [chaveOrientacoesDdsCarregada, setChaveOrientacoesDdsCarregada] = useState("");
    const [cardsDdsAbertos, setCardsDdsAbertos] = useState(() => carregarCardsDdsLocal());
    const [registroDdsConferencia, setRegistroDdsConferencia] = useState(null);
    const [salvandoRegistroDds, setSalvandoRegistroDds] = useState(false);
    const [erroRegistroDds, setErroRegistroDds] = useState("");
    const [codigoConferenciaDds, setCodigoConferenciaDds] = useState("");
    const [registroScannerDds, setRegistroScannerDds] = useState(null);
    const [carregandoScannerDds, setCarregandoScannerDds] = useState(false);
    const [erroScannerDds, setErroScannerDds] = useState("");
    const [arquivoScannerDds, setArquivoScannerDds] = useState(null);
    const [erroArquivoScannerDds, setErroArquivoScannerDds] = useState("");
    const [leituraArquivoScannerDds, setLeituraArquivoScannerDds] = useState(null);
    const [carregandoLeituraArquivoScannerDds, setCarregandoLeituraArquivoScannerDds] = useState(false);
    const [erroLeituraArquivoScannerDds, setErroLeituraArquivoScannerDds] = useState("");
    const [conferenciaAssistidaDds, setConferenciaAssistidaDds] = useState({});
    const [participantesAdicionaisConferenciaDds, setParticipantesAdicionaisConferenciaDds] = useState(() =>
        criarParticipantesAdicionaisConferenciaDds()
    );
    const [salvandoConferenciaAssistidaDds, setSalvandoConferenciaAssistidaDds] = useState(false);
    const [erroConferenciaAssistidaDds, setErroConferenciaAssistidaDds] = useState("");
    const [conferenciaAssistidaSalvaEmDds, setConferenciaAssistidaSalvaEmDds] = useState("");
    const [salvandoFechamentoConferenciaDds, setSalvandoFechamentoConferenciaDds] = useState(false);
    const [erroFechamentoConferenciaDds, setErroFechamentoConferenciaDds] = useState("");
    const [fechamentoConferenciaAssistidaDds, setFechamentoConferenciaAssistidaDds] = useState(null);
    const [reciboFinalEmitidoEmDds, setReciboFinalEmitidoEmDds] = useState("");
    const [mesHistoricoMaoDeObraDds, setMesHistoricoMaoDeObraDds] = useState(() => {
        const data = new Date();
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        return ano + "-" + mes;
    });
    const [historicoMensalMaoDeObraDds, setHistoricoMensalMaoDeObraDds] = useState([]);
    const [carregandoHistoricoMensalMaoDeObraDds, setCarregandoHistoricoMensalMaoDeObraDds] = useState(false);
    const [erroHistoricoMensalMaoDeObraDds, setErroHistoricoMensalMaoDeObraDds] = useState("");
    const [historicoMensalConsultadoEmDds, setHistoricoMensalConsultadoEmDds] = useState("");

    const [salvandoReciboFinalDds, setSalvandoReciboFinalDds] = useState(false);
    const [erroReciboFinalDds, setErroReciboFinalDds] = useState("");
    const [codigoReciboCopiadoDds, setCodigoReciboCopiadoDds] = useState(false);
    const reciboConferenciaFinalRef = useRef(null);


    useEffect(() => {
        salvarCardsDdsLocal(cardsDdsAbertos);
    }, [cardsDdsAbertos]);

    function cardDdsAberto(chaveCard) {
        return cardsDdsAbertos?.[chaveCard] !== false;
    }

    function alternarCardDds(chaveCard) {
        setCardsDdsAbertos((cardsAtuais) => ({
            ...CARDS_DDS_PADRAO,
            ...(cardsAtuais || {}),
            [chaveCard]: cardsAtuais?.[chaveCard] === false,
        }));
    }
    const empresaContratanteDds = useMemo(() => obterEmpresaContratanteDds({
        empresaSelecionada: empresaSelecionadaDds,
        empresasDds,
    }), [empresaSelecionadaDds, empresasDds]);

    const logoContratanteDds = useMemo(
        () => resolverLogoEmpresaDds(obterLogoRawEmpresaDds(empresaContratanteDds)),
        [empresaContratanteDds]
    );
    const logosEmpresasCabecalhoDds = useMemo(() => obterLogosEmpresasCabecalhoDds({
        empresaSelecionada: empresaSelecionadaDds,
        empresasDds,
    }), [empresaSelecionadaDds, empresasDds]);
    const logoEmpresaDds = useMemo(() => obterLogoEmpresaSelecionadaDds({
        empresaSelecionada: empresaSelecionadaDds,
        colaboradoresEmpresa: colaboradoresEmpresaDds,
        dadosDds,
    }), [empresaSelecionadaDds, colaboradoresEmpresaDds, dadosDds]);

    const dadosDdsComRegistro = useMemo(() => ({
        ...dadosDds,
        tokenDds: registroDdsConferencia?.tokenPublico || "",
        qrConferenciaUrl: registroDdsConferencia?.urlConferencia || "",
        empresaLogoUrl: logoEmpresaDds,
        empresaLogoNome: empresaSelecionadaDds?.logo_nome || empresaSelecionadaDds?.logoNome || "",
        contratanteLogoUrl: logoContratanteDds,
        contratanteLogoNome: empresaContratanteDds?.logo_nome || empresaContratanteDds?.logoNome || "",
        contratanteNome: empresaContratanteDds?.nome || "",
        logosEmpresasCabecalho: logosEmpresasCabecalhoDds,
        recadosSemana: recadosDdsEditaveis,
        orientacoesImportantes: orientacoesDdsEditaveis,
    }), [dadosDds, registroDdsConferencia, logoEmpresaDds, empresaSelecionadaDds, logoContratanteDds, empresaContratanteDds, logosEmpresasCabecalhoDds, recadosDdsEditaveis, orientacoesDdsEditaveis]);

    const participantesRegistroScannerDds = useMemo(
        () => Array.isArray(registroScannerDds?.dados?.participantes) ? registroScannerDds.dados.participantes : [],
        [registroScannerDds]
    );

    const diasRegistroScannerDds = useMemo(
        () => Array.isArray(registroScannerDds?.dados?.diasSemana) ? registroScannerDds.dados.diasSemana : [],
        [registroScannerDds]
    );

    const resumoArquivoScannerDds = useMemo(() => {
        if (!arquivoScannerDds) return null;

        const tamanhoMb = arquivoScannerDds.size / (1024 * 1024);
        const tamanhoFormatado = tamanhoMb >= 1
            ? `${tamanhoMb.toFixed(2)} MB`
            : `${Math.max(1, Math.round(arquivoScannerDds.size / 1024))} KB`;

        return {
            nome: arquivoScannerDds.name || "Arquivo sem nome",
            tipo: arquivoScannerDds.type || "Tipo não identificado",
            tamanho: tamanhoFormatado,
        };
    }, [arquivoScannerDds]);

    const avisosLeituraArquivoScannerDds = useMemo(
        () => Array.isArray(leituraArquivoScannerDds?.avisos) ? leituraArquivoScannerDds.avisos : [],
        [leituraArquivoScannerDds]
    );

    const linhasLeituraArquivoScannerDds = useMemo(
        () => Array.isArray(leituraArquivoScannerDds?.linhasOcr) ? leituraArquivoScannerDds.linhasOcr : [],
        [leituraArquivoScannerDds]
    );

    const textoPreviaArquivoScannerDds = useMemo(() => {
        const texto = String(leituraArquivoScannerDds?.textoPrevia || leituraArquivoScannerDds?.textoExtraido || "").trim();

        if (!texto) return "";

        return texto.length > 900 ? `${texto.slice(0, 900).trim()}...` : texto;
    }, [leituraArquivoScannerDds]);

    const qualidadeLeituraArquivoScannerDds = useMemo(() => {
        if (!leituraArquivoScannerDds) {
            return {
                textoStatus: "-",
                statusConferencia: "Aguardando leitura",
                confiavel: false,
            };
        }

        const avisosTexto = avisosLeituraArquivoScannerDds.join(" ").toLowerCase();
        const confianca = Number(leituraArquivoScannerDds?.confianca || 0);
        const diagnosticoDdsOcr = leituraArquivoScannerDds?.diagnosticoDdsOcr || {};
        const scoreDdsOcr = Number(diagnosticoDdsOcr?.score || 0);
        const possuiAlvoDds =
            Boolean(diagnosticoDdsOcr?.encontrouCodigo) ||
            scoreDdsOcr >= 45 ||
            Number(diagnosticoDdsOcr?.termosLocalizados || 0) >= 3;
        const possuiTexto = Boolean(textoPreviaArquivoScannerDds);
        const possuiLinhas = linhasLeituraArquivoScannerDds.length > 0;
        const avisoSemTextoConfiavel =
            avisosTexto.includes("não encontrou texto documental confiável") ||
            avisosTexto.includes("nao encontrou texto documental confiavel") ||
            avisosTexto.includes("não foi encontrado texto confiável") ||
            avisosTexto.includes("nao foi encontrado texto confiavel") ||
            avisosTexto.includes("conferência manual");

        if (!possuiTexto) {
            return {
                textoStatus: "Não localizado",
                statusConferencia: "Exige conferência manual",
                confiavel: false,
            };
        }

        if (possuiTexto && possuiAlvoDds && confianca >= 45) {
            return {
                textoStatus: "Localizado para DDS",
                statusConferencia: "Leitura direcionada DDS aproveitável",
                confiavel: true,
            };
        }

        if (avisoSemTextoConfiavel || !possuiLinhas || confianca < 65) {
            return {
                textoStatus: "Parcial / não confiável",
                statusConferencia: "Exige conferência manual",
                confiavel: false,
            };
        }

        return {
            textoStatus: "Localizado",
            statusConferencia: "Leitura inicial aproveitável",
            confiavel: true,
        };
    }, [avisosLeituraArquivoScannerDds, leituraArquivoScannerDds, linhasLeituraArquivoScannerDds, textoPreviaArquivoScannerDds]);

    const diagnosticoEstruturalScannerDds = useMemo(() => {
        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const dataParaBr = (valor = "") => {
            const texto = String(valor || "").trim();
            const matchIso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

            if (matchIso) {
                return `${matchIso[3]}/${matchIso[2]}/${matchIso[1]}`;
            }

            return texto;
        };

        const textoLido = [
            leituraArquivoScannerDds?.textoExtraido || "",
            leituraArquivoScannerDds?.textoPrevia || "",
            ...linhasLeituraArquivoScannerDds.map((linha) => linha?.texto || ""),
        ].join(" ");

        const textoNormalizado = normalizar(textoLido);
        const contem = (...valores) => valores
            .map((valor) => normalizar(valor))
            .filter((valor) => valor.length >= 3)
            .some((valor) => textoNormalizado.includes(valor));

        const codigoEsperado = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";
        const empresaEsperada = registroScannerDds?.empresaNome || registroScannerDds?.dados?.empresaNome || "";
        const obraEsperada = registroScannerDds?.obraNome || registroScannerDds?.dados?.obraNome || "";
        const periodoInicio = registroScannerDds?.periodoInicio || registroScannerDds?.dados?.periodoInicio || "";
        const periodoFim = registroScannerDds?.periodoFim || registroScannerDds?.dados?.periodoFim || "";
        const participantesEsperados = participantesRegistroScannerDds.length;

        const gabaritoCarregado = Boolean(registroScannerDds);
        const folhaAnexada = Boolean(arquivoScannerDds);
        const leituraExecutada = Boolean(leituraArquivoScannerDds);

        const codigoLocalizado = leituraExecutada && contem(codigoEsperado);
        const empresaLocalizada = leituraExecutada && contem(empresaEsperada);
        const obraLocalizada = leituraExecutada && contem(obraEsperada);
        const periodoLocalizado = leituraExecutada && (
            contem(periodoInicio, dataParaBr(periodoInicio)) ||
            contem(periodoFim, dataParaBr(periodoFim))
        );

        let statusGeral = "Aguardando gabarito e folha";
        let statusVisual = "pendente";

        if (!gabaritoCarregado) {
            statusGeral = "Carregue o gabarito digital do DDS";
            statusVisual = "pendente";
        } else if (!folhaAnexada) {
            statusGeral = "Anexe a folha assinada";
            statusVisual = "pendente";
        } else if (!leituraExecutada) {
            statusGeral = "Execute a leitura inicial";
            statusVisual = "pendente";
        } else if (!qualidadeLeituraArquivoScannerDds.confiavel) {
            statusGeral = "Exige conferência manual";
            statusVisual = "manual";
        } else if (codigoLocalizado || empresaLocalizada || obraLocalizada || periodoLocalizado) {
            statusGeral = "Pré-conferência estrutural compatível";
            statusVisual = "ok";
        } else {
            statusGeral = "Leitura parcial: conferir manualmente";
            statusVisual = "manual";
        }

        const montarItem = ({ titulo, detalhe, status }) => ({ titulo, detalhe, status });

        return {
            statusGeral,
            statusVisual,
            codigoEsperado,
            empresaEsperada,
            obraEsperada,
            periodoTexto: [periodoInicio, periodoFim].filter(Boolean).join(" a "),
            participantesEsperados,
            itens: [
                montarItem({
                    titulo: "Gabarito digital",
                    detalhe: gabaritoCarregado ? "Registro DDS carregado pelo código." : "Busque o registro DDS antes da conferência.",
                    status: gabaritoCarregado ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "Folha anexada",
                    detalhe: folhaAnexada ? "Arquivo recebido para análise local." : "Anexe PDF ou imagem da folha assinada.",
                    status: folhaAnexada ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "Leitura inicial",
                    detalhe: leituraExecutada
                        ? `${qualidadeLeituraArquivoScannerDds.textoStatus}; ${linhasLeituraArquivoScannerDds.length} linha(s) OCR.`
                        : "Leitura ainda não executada.",
                    status: leituraExecutada
                        ? (qualidadeLeituraArquivoScannerDds.confiavel ? "ok" : "manual")
                        : "pendente",
                }),
                montarItem({
                    titulo: "Código DDS",
                    detalhe: !leituraExecutada
                        ? "Aguardando leitura."
                        : codigoLocalizado
                            ? `Código ${codigoEsperado} localizado no texto lido.`
                            : `Código ${codigoEsperado || "-"} não localizado com segurança.`,
                    status: !leituraExecutada ? "pendente" : (codigoLocalizado ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Empresa",
                    detalhe: !empresaEsperada
                        ? "Empresa não informada no gabarito."
                        : empresaLocalizada
                            ? `Empresa localizada: ${empresaEsperada}.`
                            : `Empresa esperada: ${empresaEsperada}.`,
                    status: !leituraExecutada || !empresaEsperada ? "pendente" : (empresaLocalizada ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Obra / setor",
                    detalhe: !obraEsperada
                        ? "Obra/setor não informado no gabarito."
                        : obraLocalizada
                            ? `Obra/setor localizado: ${obraEsperada}.`
                            : `Obra/setor esperado: ${obraEsperada}.`,
                    status: !leituraExecutada || !obraEsperada ? "pendente" : (obraLocalizada ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Período semanal",
                    detalhe: !periodoInicio && !periodoFim
                        ? "Período não informado no gabarito."
                        : periodoLocalizado
                            ? `Período localizado: ${[periodoInicio, periodoFim].filter(Boolean).join(" a ")}.`
                            : `Período esperado: ${[periodoInicio, periodoFim].filter(Boolean).join(" a ")}.`,
                    status: !leituraExecutada || (!periodoInicio && !periodoFim) ? "pendente" : (periodoLocalizado ? "ok" : "manual"),
                }),
                montarItem({
                    titulo: "Participantes esperados",
                    detalhe: `${participantesEsperados} participante(s) no gabarito digital.`,
                    status: participantesEsperados > 0 ? "ok" : "pendente",
                }),
                montarItem({
                    titulo: "OCR visual auxiliar",
                    detalhe: "Não avaliada automaticamente. Permanece como conferência visual provável/manual, sem validação grafológica.",
                    status: "pendente",
                }),
            ],
        };
    }, [
        arquivoScannerDds,
        codigoConferenciaDds,
        dadosDds.codigo,
        leituraArquivoScannerDds,
        linhasLeituraArquivoScannerDds,
        participantesRegistroScannerDds.length,
        qualidadeLeituraArquivoScannerDds,
        registroScannerDds,
    ]);

    const preConferenciaParticipantesScannerDds = useMemo(() => {
        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const participantesBase = Array.isArray(participantesRegistroScannerDds) ? participantesRegistroScannerDds : [];
        const totalPaginasArquivo = Number(leituraArquivoScannerDds?.totalPaginas || leituraArquivoScannerDds?.paginasLidas || 0);
        const paginasMarcacoesArquivoDds = new Set(
            (Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias) ? leituraArquivoScannerDds.marcacoesDdsDias : [])
                .map((item) => Number(item?.pagina || 0))
                .filter((pagina) => Number.isFinite(pagina) && pagina > 0)
        );

        const palavrasIgnoradas = new Set(["de", "da", "do", "das", "dos", "e"]);

        const paginaEsperadaPorNumero = (numero = 0) => {
            const valor = Number(numero || 0);

            if (!Number.isFinite(valor) || valor <= 0) return 1;
            if (valor <= 10) return 1;

            return Math.floor((valor - 11) / 20) + 2;
        };

        const textosPorPagina = (() => {
            const mapa = new Map();

            const registrar = (pagina, texto = "") => {
                const numeroPagina = Number(pagina || 0);
                const textoSeguro = String(texto || "").trim();

                if (!Number.isFinite(numeroPagina) || numeroPagina <= 0 || !textoSeguro) return;

                const atual = mapa.get(numeroPagina) || "";
                mapa.set(numeroPagina, `${atual} ${textoSeguro}`.trim());
            };

            for (const linha of linhasLeituraArquivoScannerDds) {
                registrar(linha?.pagina, linha?.texto || "");
            }

            const textoExtraido = String(leituraArquivoScannerDds?.textoExtraido || leituraArquivoScannerDds?.textoPrevia || "");
            const regexPagina = /Página\s+(\d+):\s*([\s\S]*?)(?=Página\s+\d+:|$)/gi;
            let match = regexPagina.exec(textoExtraido);

            while (match) {
                registrar(Number(match[1]), match[2] || "");
                match = regexPagina.exec(textoExtraido);
            }

            if (mapa.size === 0 && textoExtraido.trim()) {
                registrar(1, textoExtraido);
            }

            return mapa;
        })();

        const normalizarPagina = (pagina) => normalizar(textosPorPagina.get(pagina) || "");

        const contemTextoPagina = (pagina, valor = "") => {
            const termo = normalizar(valor);
            const textoPagina = normalizarPagina(pagina);

            if (!termo || termo.length < 3 || !textoPagina) return false;

            return textoPagina.includes(termo);
        };

        const contemNomeParcialPagina = (pagina, nome = "") => {
            const termoNome = normalizar(nome);
            const textoPagina = normalizarPagina(pagina);
            const palavrasNome = termoNome
                .split(" ")
                .filter((palavra) => palavra.length >= 4 && !palavrasIgnoradas.has(palavra));

            if (!textoPagina || palavrasNome.length === 0) return false;

            const encontradas = palavrasNome.filter((palavra) => textoPagina.includes(palavra)).length;

            if (palavrasNome.length === 1) {
                return encontradas === 1;
            }

            return encontradas >= Math.min(2, palavrasNome.length);
        };

        const participantes = participantesBase.map((participante, indice) => {
            const numero = Number(participante?.numero || indice + 1);
            const paginaEsperada = paginaEsperadaPorNumero(numero);
            const nome = participante?.nome || "";
            const funcao = participante?.funcao || "";
            const codigoSafescan =
                participante?.codigoSafescan ||
                participante?.codigoSafeScan ||
                participante?.codigoFuncionario ||
                participante?.codigo_funcionario ||
                participante?.codigo ||
                "";

            const paginaFoiAnalisada = Boolean(
                (totalPaginasArquivo >= paginaEsperada && paginaEsperada > 0) ||
                textosPorPagina.has(paginaEsperada) ||
                linhasLeituraArquivoScannerDds.some((linha) => Number(linha?.pagina || 0) === paginaEsperada) ||
                paginasMarcacoesArquivoDds.has(paginaEsperada)
            );

            if (!leituraExecutada) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "pendente",
                    statusTexto: "Aguardando leitura",
                    detalhe: "Execute a leitura inicial da folha assinada.",
                };
            }

            if (!paginaFoiAnalisada) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "pagina_nao_analisada",
                    statusTexto: "Página não anexada/lida",
                    detalhe: `Participante esperado na página ${paginaEsperada}, mas essa página não foi anexada/lida no arquivo atual.`,
                };
            }

            if (!leituraConfiavel) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "manual",
                    statusTexto: "Exige conferência manual",
                    detalhe: "OCR parcial/não confiável nesta página. Conferir participante manualmente.",
                };
            }
            const codigoLocalizado = contemTextoPagina(paginaEsperada, codigoSafescan);
            const nomeLocalizado = contemNomeParcialPagina(paginaEsperada, nome);

            if (codigoLocalizado || nomeLocalizado) {
                return {
                    numero,
                    paginaEsperada,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "localizado",
                    statusTexto: "Localizado na página esperada",
                    detalhe: codigoLocalizado
                        ? `Código SafeScan localizado na página ${paginaEsperada}.`
                        : `Nome localizado na página ${paginaEsperada}.`,
                };
            }

            return {
                numero,
                paginaEsperada,
                nome,
                funcao,
                codigoSafescan,
                status: "nao_localizado",
                statusTexto: "Não localizado",
                detalhe: `Nome/código não localizado com segurança na página ${paginaEsperada}.`,
            };
        });

        const total = participantes.length;
        const localizados = participantes.filter((item) => item.status === "localizado").length;
        const naoLocalizados = participantes.filter((item) => item.status === "nao_localizado").length;
        const paginasNaoAnalisadas = participantes.filter((item) => item.status === "pagina_nao_analisada").length;
        const manuaisDiretos = participantes.filter((item) => item.status === "manual").length;
        const manuais = manuaisDiretos;
        const pendentes = participantes.filter((item) => item.status === "pendente").length;

        let statusGeral = "Aguardando participantes";
        let statusVisual = "pendente";

        if (total === 0) {
            statusGeral = "Carregue o gabarito DDS";
            statusVisual = "pendente";
        } else if (!leituraExecutada) {
            statusGeral = "Execute a leitura inicial";
            statusVisual = "pendente";
        } else if (!leituraConfiavel) {
            statusGeral = "Exige conferência manual";
            statusVisual = "manual";
        } else if (paginasNaoAnalisadas > 0) {
            statusGeral = "Conferência parcial: há páginas não anexadas/lidas";
            statusVisual = "parcial";
        } else if (localizados === total) {
            statusGeral = "Participantes localizados na página esperada";
            statusVisual = "ok";
        } else if (localizados > 0) {
            statusGeral = "Conferência parcial de participantes";
            statusVisual = "manual";
        } else {
            statusGeral = "Participantes não localizados com segurança";
            statusVisual = "manual";
        }

        return {
            statusGeral,
            statusVisual,
            total,
            localizados,
            naoLocalizados,
            paginasNaoAnalisadas,
            manuais,
            pendentes,
            leituraExecutada,
            leituraConfiavel,
            participantes,
        };
    }, [
        leituraArquivoScannerDds,
        linhasLeituraArquivoScannerDds,
        participantesRegistroScannerDds,
        qualidadeLeituraArquivoScannerDds,
    ]);


    const diasAtivosConferenciaAssistidaDds = useMemo(() => {
        const textoSemAtividade = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return diasRegistroScannerDds
            .map((dia, posicao) => {
                const textoBase = [
                    dia?.data,
                    dia?.curto,
                    dia?.nome,
                    dia?.tema,
                    dia?.titulo,
                    dia?.descricao,
                ].filter(Boolean).join("-");

                return {
                    ...dia,
                    indiceAssistido: Number.isFinite(Number(dia?.indice)) ? Number(dia.indice) : posicao + 1,
                    chaveAssistida: `${posicao + 1}-${textoBase || "dia"}`
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-zA-Z0-9_-]+/g, "-")
                        .replace(/-+/g, "-")
                        .replace(/^-|-$/g, ""),
                };
            })
            .filter((dia) => {
                const tema = textoSemAtividade(dia?.tema || dia?.titulo || dia?.descricao || "");
                const semAtividadeTexto =
                    tema.includes("nao houve atividade") ||
                    tema.includes("sem atividade") ||
                    tema.includes("nao teve atividade");

                return !dia.semAtividade && !semAtividadeTexto;
            });
    }, [diasRegistroScannerDds]);

    const participantesCadastradosConferenciaAssistidaDds = useMemo(() => {
        const participantes = Array.isArray(preConferenciaParticipantesScannerDds?.participantes)
            ? preConferenciaParticipantesScannerDds.participantes
            : [];

        return participantes
            .filter((participante) => (
                participante?.status !== "pagina_nao_analisada" &&
                participante?.status !== "pendente"
            ))
            .map((participante) => ({
                ...participante,
                origem: participante?.origem || "cadastro",
                tipo: participante?.tipo || "colaborador",
            }));
    }, [preConferenciaParticipantesScannerDds]);

    const participantesAdicionaisAtivosConferenciaDds = useMemo(
        () =>
            participantesAdicionaisConferenciaDds
                .filter((participante) =>
                    String(participante?.nome || "").trim()
                )
                .map((participante) => ({
                    ...participante,
                    nome: String(participante.nome || "").trim(),
                    funcao: String(participante.funcao || "").trim(),
                    empresa: String(participante.empresa || "").trim(),
                    codigoSafescan: "",
                    origem: "adicional",
                    tipo: "visitante",
                })),
        [participantesAdicionaisConferenciaDds]
    );

    const participantesConferenciaAssistidaDds = useMemo(
        () => [
            ...participantesCadastradosConferenciaAssistidaDds,
            ...participantesAdicionaisAtivosConferenciaDds,
        ],
        [
            participantesCadastradosConferenciaAssistidaDds,
            participantesAdicionaisAtivosConferenciaDds,
        ]
    );

    const obterChaveFrequenciaAssistidaDds = (numero, diaRef) => {
        const chaveDia = typeof diaRef === "object" && diaRef !== null
            ? (diaRef.chaveAssistida || diaRef.indiceAssistido || diaRef.indice || diaRef.data || diaRef.nome || diaRef.curto)
            : diaRef;

        return `${numero}-${chaveDia}`;
    };

    const obterStatusFrequenciaAssistidaDds = (numero, diaRef) => (
        conferenciaAssistidaDds[obterChaveFrequenciaAssistidaDds(numero, diaRef)] || "manual"
    );

    const estatisticasConferenciaAssistidaDds = useMemo(() => {
        const dias = diasAtivosConferenciaAssistidaDds.map((dia) => ({
            ...dia,
            presentes: 0,
            ausentes: 0,
            manuais: 0,
            homemDia: 0,
        }));

        const cadastrados = {
            participantes: 0,
            presencas: 0,
            ausencias: 0,
            manuais: 0,
            homemDia: 0,
            semanaCompleta: 0,
        };

        const adicionais = {
            participantes: 0,
            presencas: 0,
            ausencias: 0,
            manuais: 0,
            homemDia: 0,
            semanaCompleta: 0,
        };

        let presencas = 0;
        let ausencias = 0;
        let manuais = 0;
        let homemDia = 0;
        let funcionariosSemanaCompleta = 0;

        for (
            const participante of
            participantesConferenciaAssistidaDds
        ) {
            const numero = Number(
                participante?.numero || 0
            );

            if (!numero) continue;

            const origem = String(
                participante?.origem || ""
            ).trim().toLowerCase();

            const tipo = String(
                participante?.tipo || ""
            ).trim().toLowerCase();

            const categoria = (
                origem === "adicional" ||
                tipo === "visitante"
            )
                ? adicionais
                : cadastrados;

            categoria.participantes += 1;

            let todosDiasPresentes =
                dias.length > 0;

            dias.forEach((dia, indiceDia) => {
                const status =
                    conferenciaAssistidaDds[
                        obterChaveFrequenciaAssistidaDds(
                            numero,
                            dia
                        )
                    ] || "manual";

                if (status === "presente") {
                    dias[indiceDia].presentes += 1;
                    dias[indiceDia].homemDia += 1;

                    presencas += 1;
                    homemDia += 1;

                    categoria.presencas += 1;
                    categoria.homemDia += 1;
                } else if (status === "ausente") {
                    dias[indiceDia].ausentes += 1;

                    ausencias += 1;
                    categoria.ausencias += 1;
                    todosDiasPresentes = false;
                } else {
                    dias[indiceDia].manuais += 1;

                    manuais += 1;
                    categoria.manuais += 1;
                    todosDiasPresentes = false;
                }
            });

            if (todosDiasPresentes) {
                funcionariosSemanaCompleta += 1;
                categoria.semanaCompleta += 1;
            }
        }

        return {
            dias,
            participantes:
                participantesConferenciaAssistidaDds.length,
            participantesCadastrados:
                cadastrados.participantes,
            participantesAdicionais:
                adicionais.participantes,
            presencas,
            presencasCadastrados:
                cadastrados.presencas,
            presencasAdicionais:
                adicionais.presencas,
            ausencias,
            ausenciasCadastrados:
                cadastrados.ausencias,
            ausenciasAdicionais:
                adicionais.ausencias,
            manuais,
            manuaisCadastrados:
                cadastrados.manuais,
            manuaisAdicionais:
                adicionais.manuais,
            homemDia,
            homemDiaCadastrados:
                cadastrados.homemDia,
            homemDiaAdicionais:
                adicionais.homemDia,
            funcionariosSemanaCompleta,
            semanaCompletaCadastrados:
                cadastrados.semanaCompleta,
            semanaCompletaAdicionais:
                adicionais.semanaCompleta,
        };
    }, [
        conferenciaAssistidaDds,
        diasAtivosConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
    ]);

    const conferenciaOficialConcluidaDds = fechamentoConferenciaAssistidaDds?.status === "concluida";

    function limparFrequenciaParticipanteAdicionalDds(numero) {
        const numeroSeguro = Number(numero || 0);

        if (!numeroSeguro) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                delete proximo[
                    obterChaveFrequenciaAssistidaDds(
                        numeroSeguro,
                        dia
                    )
                ];
            }

            return proximo;
        });
    }

    function atualizarParticipanteAdicionalConferenciaDds(
        indice,
        campo,
        valor
    ) {
        if (conferenciaOficialConcluidaDds) return;

        const valorSeguro = String(valor ?? "");
        const participanteAtual =
            participantesAdicionaisConferenciaDds[indice];

        if (
            campo === "nome" &&
            !valorSeguro.trim() &&
            participanteAtual?.numero
        ) {
            limparFrequenciaParticipanteAdicionalDds(
                participanteAtual.numero
            );
        }

        setParticipantesAdicionaisConferenciaDds((atuais) =>
            atuais.map((participante, indiceAtual) =>
                indiceAtual === indice
                    ? {
                        ...participante,
                        [campo]: valorSeguro,
                    }
                    : participante
            )
        );
    }

    function limparParticipanteAdicionalConferenciaDds(indice) {
        if (conferenciaOficialConcluidaDds) return;

        const participante =
            participantesAdicionaisConferenciaDds[indice];

        limparFrequenciaParticipanteAdicionalDds(
            participante?.numero
        );

        setParticipantesAdicionaisConferenciaDds((atuais) =>
            atuais.map((item, indiceAtual) =>
                indiceAtual === indice
                    ? {
                        ...item,
                        nome: "",
                        funcao: "",
                        empresa: "",
                    }
                    : item
            )
        );
    }

    function definirStatusFrequenciaAssistidaDds(numero, diaRef, status) {
        if (conferenciaOficialConcluidaDds) return;

        const chave = obterChaveFrequenciaAssistidaDds(numero, diaRef);

        setConferenciaAssistidaDds((atual) => ({
            ...atual,
            [chave]: status,
        }));
    }

    function marcarSemanaCompletaAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "presente";
            }

            return proximo;
        });
    }

    function limparParticipanteConferenciaAssistidaDds(numero) {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds((atual) => {
            const proximo = { ...atual };

            for (const dia of diasAtivosConferenciaAssistidaDds) {
                proximo[obterChaveFrequenciaAssistidaDds(numero, dia)] = "manual";
            }

            return proximo;
        });
    }

    function limparConferenciaAssistidaDds() {
        if (conferenciaOficialConcluidaDds) return;

        setConferenciaAssistidaDds({});
        setParticipantesAdicionaisConferenciaDds(
            criarParticipantesAdicionaisConferenciaDds(
                participantesRegistroScannerDds
            )
        );
        setFechamentoConferenciaAssistidaDds(null);
        setReciboFinalEmitidoEmDds("");
        setErroFechamentoConferenciaDds("");
        setErroReciboFinalDds("");
    }
    async function salvarConferenciaAssistidaDds() {
        if (salvandoConferenciaAssistidaDds) return;

        if (conferenciaOficialConcluidaDds) {
            setErroConferenciaAssistidaDds("A conferência já foi concluída oficialmente. Reabra antes de editar ou salvar novamente.");
            return;
        }

        if (!supabase) {
            setErroConferenciaAssistidaDds("Cliente Supabase não disponível para salvar a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroConferenciaAssistidaDds("Busque ou gere um DDS antes de salvar a Conferência Assistida.");
            return;
        }

        setSalvandoConferenciaAssistidaDds(true);
        setErroConferenciaAssistidaDds("");

        try {
            const atualizadoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};

            const conferenciaAssistida = {
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    indice: dia.indice,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento: dadosAtuais?.conferenciaAssistida?.fechamento || fechamentoConferenciaAssistidaDds || null,
                reciboFinal: dadosAtuais?.conferenciaAssistida?.reciboFinal || null,
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.frequencia || conferenciaAssistidaDds);
            setConferenciaAssistidaSalvaEmDds(registroAtualizado?.dados?.conferenciaAssistida?.atualizadoEm || atualizadoEm);
        } catch (error) {
            setErroConferenciaAssistidaDds(error?.message || "Não foi possível salvar a Conferência Assistida DDS.");
        } finally {
            setSalvandoConferenciaAssistidaDds(false);
        }
    }


    async function concluirConferenciaAssistidaDds() {
        if (salvandoFechamentoConferenciaDds) return;

        if (!supabase) {
            setErroFechamentoConferenciaDds("Cliente Supabase não disponível para concluir a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroFechamentoConferenciaDds("Busque ou gere um DDS antes de concluir a Conferência Assistida.");
            return;
        }

        if (estatisticasConferenciaAssistidaDds.participantes <= 0 || diasAtivosConferenciaAssistidaDds.length <= 0) {
            setErroFechamentoConferenciaDds("Não há base suficiente para concluir a conferência oficial.");
            return;
        }

        if (estatisticasConferenciaAssistidaDds.manuais > 0) {
            setErroFechamentoConferenciaDds("Ainda existem campos Manual/vazio. Troque todos os ? por P ou X antes de concluir.");
            return;
        }

        setSalvandoFechamentoConferenciaDds(true);
        setErroFechamentoConferenciaDds("");

        try {
            const concluidoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};

            const fechamento = {
                versao: 1,
                status: "concluida",
                origem: "fechamento_conferencia_assistida_dds",
                concluidoEm,
                codigo,
                estatisticas: estatisticasConferenciaAssistidaDds,
                resumo: {
                    participantes: estatisticasConferenciaAssistidaDds.participantes,
                    participantesCadastrados: estatisticasConferenciaAssistidaDds.participantesCadastrados,
                    participantesAdicionais: estatisticasConferenciaAssistidaDds.participantesAdicionais,
                    presencas: estatisticasConferenciaAssistidaDds.presencas,
                    presencasCadastrados: estatisticasConferenciaAssistidaDds.presencasCadastrados,
                    presencasAdicionais: estatisticasConferenciaAssistidaDds.presencasAdicionais,
                    ausencias: estatisticasConferenciaAssistidaDds.ausencias,
                    ausenciasCadastrados: estatisticasConferenciaAssistidaDds.ausenciasCadastrados,
                    ausenciasAdicionais: estatisticasConferenciaAssistidaDds.ausenciasAdicionais,
                    manuais: estatisticasConferenciaAssistidaDds.manuais,
                    manuaisCadastrados: estatisticasConferenciaAssistidaDds.manuaisCadastrados,
                    manuaisAdicionais: estatisticasConferenciaAssistidaDds.manuaisAdicionais,
                    homemDia: estatisticasConferenciaAssistidaDds.homemDia,
                    homemDiaCadastrados: estatisticasConferenciaAssistidaDds.homemDiaCadastrados,
                    homemDiaAdicionais: estatisticasConferenciaAssistidaDds.homemDiaAdicionais,
                    diasAtivos: diasAtivosConferenciaAssistidaDds.length,
                    funcionariosSemanaCompleta: estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta,
                    semanaCompletaCadastrados: estatisticasConferenciaAssistidaDds.semanaCompletaCadastrados,
                    semanaCompletaAdicionais: estatisticasConferenciaAssistidaDds.semanaCompletaAdicionais,
                },
            };

            const conferenciaAssistida = {
                ...(dadosAtuais.conferenciaAssistida || {}),
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm: concluidoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    indice: dia.indice,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
                fechamento,
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.frequencia || conferenciaAssistidaDds);
            setConferenciaAssistidaSalvaEmDds(registroAtualizado?.dados?.conferenciaAssistida?.atualizadoEm || concluidoEm);
            setFechamentoConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.fechamento || fechamento);
        } catch (error) {
            setErroFechamentoConferenciaDds(error?.message || "Não foi possível concluir a Conferência Assistida DDS.");
        } finally {
            setSalvandoFechamentoConferenciaDds(false);
        }
    }


    async function reabrirConferenciaAssistidaDds() {
        if (salvandoFechamentoConferenciaDds || salvandoConferenciaAssistidaDds) return;

        if (!supabase) {
            setErroFechamentoConferenciaDds("Cliente Supabase não disponível para reabrir a conferência.");
            return;
        }

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) {
            setErroFechamentoConferenciaDds("Busque o DDS antes de reabrir a conferência.");
            return;
        }

        setSalvandoFechamentoConferenciaDds(true);
        setErroFechamentoConferenciaDds("");

        try {
            const reabertoEm = new Date().toISOString();
            const dadosAtuais = registroScannerDds?.dados || {};
            const conferenciaAtual = dadosAtuais.conferenciaAssistida || {};
            const { fechamento, reciboFinal, ...conferenciaSemFechamento } = conferenciaAtual;

            const conferenciaAssistida = {
                ...conferenciaSemFechamento,
                versao: 1,
                origem: "conferencia_assistida_dds",
                atualizadoEm: reabertoEm,
                reabertoEm,
                frequencia: conferenciaAssistidaDds,
                estatisticas: estatisticasConferenciaAssistidaDds,
                diasAtivos: diasAtivosConferenciaAssistidaDds.map((dia) => ({
                    indice: dia.indice,
                    chaveAssistida: dia.chaveAssistida,
                    nome: dia.nome,
                    curto: dia.curto,
                    data: dia.data,
                    tema: dia.tema,
                })),
                participantes: participantesConferenciaAssistidaDds.map((participante) => ({
                    numero: participante.numero,
                    linhaImpressa: participante.linhaImpressa || participante.numero,
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa || participante.empresaNome || "",
                    codigoSafescan: participante.codigoSafescan || "",
                    origem: participante.origem || "cadastro",
                    tipo: participante.tipo || (
                        participante.origem === "adicional"
                            ? "visitante"
                            : "colaborador"
                    ),
                    idAdicional: participante.idAdicional || "",
                })),
            };

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida,
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setConferenciaAssistidaDds(registroAtualizado?.dados?.conferenciaAssistida?.frequencia || conferenciaAssistidaDds);
            setConferenciaAssistidaSalvaEmDds(registroAtualizado?.dados?.conferenciaAssistida?.atualizadoEm || reabertoEm);
            setFechamentoConferenciaAssistidaDds(null);
            setReciboFinalEmitidoEmDds("");
            setErroReciboFinalDds("");
        } catch (error) {
            setErroFechamentoConferenciaDds(error?.message || "Não foi possível reabrir a Conferência Assistida DDS.");
        } finally {
            setSalvandoFechamentoConferenciaDds(false);
        }
    }

    // Restaurar Conferência Assistida salva no JSON dados.conferenciaAssistida.
    useEffect(() => {
        const conferenciaSalva =
            registroScannerDds?.dados?.conferenciaAssistida;

        const participantesSalvos = Array.isArray(
            conferenciaSalva?.participantes
        )
            ? conferenciaSalva.participantes
            : [];

        setParticipantesAdicionaisConferenciaDds(
            criarParticipantesAdicionaisConferenciaDds(
                participantesRegistroScannerDds,
                participantesSalvos
            )
        );

        if (
            conferenciaSalva?.frequencia &&
            typeof conferenciaSalva.frequencia === "object"
        ) {
            setConferenciaAssistidaDds(
                conferenciaSalva.frequencia
            );
            setConferenciaAssistidaSalvaEmDds(
                conferenciaSalva.atualizadoEm || ""
            );
            setFechamentoConferenciaAssistidaDds(
                conferenciaSalva.fechamento || null
            );
            setReciboFinalEmitidoEmDds(
                conferenciaSalva.reciboFinal?.emitidoEm || ""
            );
            setErroConferenciaAssistidaDds("");
            setErroReciboFinalDds("");
            setErroFechamentoConferenciaDds("");
            return;
        }

        setConferenciaAssistidaDds({});
        setConferenciaAssistidaSalvaEmDds("");
        setFechamentoConferenciaAssistidaDds(null);
        setReciboFinalEmitidoEmDds("");
        setErroConferenciaAssistidaDds("");
        setErroFechamentoConferenciaDds("");
        setErroReciboFinalDds("");
    }, [
        registroScannerDds?.codigo,
        registroScannerDds?.dados?.conferenciaAssistida?.atualizadoEm,
        participantesRegistroScannerDds,
    ]);
    const apuracaoDiariaScannerDds = useMemo(() => {
        const nomesDias = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        const curtosDias = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

        const normalizar = (valor = "") => String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toUpperCase()
            .trim();

        const diasBase = Array.isArray(diasRegistroScannerDds) && diasRegistroScannerDds.length
            ? diasRegistroScannerDds
            : diasDds;

        const dias = Array.from({ length: 7 }, (_, indice) => {
            const dia = diasBase[indice] || {};
            const tema = String(dia?.tema || "").trim();
            const responsavel = String(dia?.responsavel || "").trim();
            const domingo = indice === 0 || normalizar(dia?.curto || dia?.dia || "").includes("DOM");
            const semAtividade = normalizar(tema) === "NAO HOUVE ATIVIDADES";

            return {
                indice,
                curto: dia?.curto || dia?.dia || curtosDias[indice],
                nome: dia?.nome || nomesDias[indice],
                data: dia?.data || "",
                tema: tema || "-",
                responsavel: responsavel || "-",
                semAtividade,
            };
        });

        const marcacoes = Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias)
            ? leituraArquivoScannerDds.marcacoesDdsDias
            : [];

        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraTextoConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const leituraVisualComMarcacoes = marcacoes.some((item) => (
            item?.tipoMarcacao === "dia" ||
            item?.tipoMarcacao === "semana_completa" ||
            item?.assinatura_visual ||
            item?.x_visual
        ));
        const leituraConfiavel = leituraTextoConfiavel || leituraVisualComMarcacoes;
        const participantes = Array.isArray(preConferenciaParticipantesScannerDds?.participantes)
            ? preConferenciaParticipantesScannerDds.participantes
            : [];

        const obterMarcacao = ({ paginaEsperada, numeroLinha, diaIndice }) => marcacoes.find((item) => (
            Number(item?.pagina || 0) === Number(paginaEsperada || 0) &&
            Number(item?.numeroLinha || 0) === Number(numeroLinha || 0) &&
            Number(item?.diaIndice || 0) === Number(diaIndice || 0)
        ));

        const obterMarcacaoSemanaCompleta = ({ paginaEsperada, numeroLinha }) => marcacoes.find((item) => (
            Number(item?.pagina || 0) === Number(paginaEsperada || 0) &&
            Number(item?.numeroLinha || 0) === Number(numeroLinha || 0) &&
            (
                item?.tipoMarcacao === "semana_completa" ||
                Number(item?.diaIndice || 0) === 7
            )
        ));

        const diasAtivosDebugScannerDds = dias.filter((dia) => !dia.semAtividade);

        const debugLinhasScannerDds = participantes.map((participante) => {
            const paginaEsperada = Number(participante?.paginaEsperada || 0);
            const numero = Number(participante?.numero || 0);
            const numeroLinha = paginaEsperada <= 1
                ? numero
                : numero - 10 - ((paginaEsperada - 2) * 20);

            const linhaNaoAnalisada = participante?.status === "pagina_nao_analisada" || !paginaEsperada || numeroLinha <= 0;

            const marcacaoSemanaCompleta = linhaNaoAnalisada
                ? null
                : obterMarcacaoSemanaCompleta({ paginaEsperada, numeroLinha });

            const semanaCompleta = Boolean(marcacaoSemanaCompleta?.assinatura_visual);

            return {
                numero,
                nome: participante?.nome || "-",
                paginaEsperada,
                numeroLinha,
                linhaNaoAnalisada,
                semanaCompleta,
                semanaDensidade: Number(marcacaoSemanaCompleta?.assinatura_densidade || 0),
                dias: diasAtivosDebugScannerDds.map((dia) => {
                    const marcacao = linhaNaoAnalisada
                        ? null
                        : obterMarcacao({
                            paginaEsperada,
                            numeroLinha,
                            diaIndice: dia.indice,
                        });

                    const xVisual = Boolean(marcacao?.x_visual);
                    const presencaVisual = Boolean(marcacao?.assinatura_visual);

                    let status = "vazio";

                    if (linhaNaoAnalisada) {
                        status = "nao_analisado";
                    } else if (xVisual) {
                        status = "x";
                    } else if (presencaVisual) {
                        status = "presenca";
                    } else if (semanaCompleta) {
                        status = "semana_completa";
                    }

                    return {
                        indice: dia.indice,
                        curto: dia.curto,
                        status,
                        xVisual,
                        presencaVisual,
                        semanaCompleta,
                        densidade: Number(marcacao?.assinatura_densidade || 0),
                        densidadeAzul: Number(marcacao?.assinatura_densidade_azul || 0),
                        xDensidade: Number(marcacao?.x_densidade || 0),
                        xDensidadeEscura: Number(marcacao?.x_densidade_escura || 0),
                        xDensidadeAzul: Number(marcacao?.x_densidade_azul || 0),
                        xDiagPrincipal: Number(marcacao?.x_proporcao_diagonal_principal || 0),
                        xDiagSecundaria: Number(marcacao?.x_proporcao_diagonal_secundaria || 0),
                    };
                }),
            };
        }).filter((linha) => linha.numero > 0).slice(0, 30);

        const diasApurados = dias.map((dia) => {
            let presentesProvaveis = 0;
            let ausentesProvaveis = 0;
            let naoAnalisados = 0;
            let conferenciaManual = 0;
            let semanaCompletaMarcada = 0;

            const amostra = [];

            for (const participante of participantes) {
                const paginaEsperada = Number(participante?.paginaEsperada || 0);
                const numero = Number(participante?.numero || 0);
                const numeroLinha = paginaEsperada <= 1
                    ? numero
                    : numero - 10 - ((paginaEsperada - 2) * 20);

                if (dia.semAtividade) {
                    continue;
                }

                if (!leituraExecutada || !leituraConfiavel) {
                    conferenciaManual += 1;
                    continue;
                }

                if (participante?.status === "pagina_nao_analisada" || !paginaEsperada || numeroLinha <= 0) {
                    naoAnalisados += 1;
                    continue;
                }

                const marcacao = obterMarcacao({
                    paginaEsperada,
                    numeroLinha,
                    diaIndice: dia.indice,
                });

                const marcacaoSemanaCompleta = obterMarcacaoSemanaCompleta({
                    paginaEsperada,
                    numeroLinha,
                });

                const ausenciaMarcadaComX = Boolean(marcacao?.x_visual);
                const presencaNoDia = Boolean(marcacao?.assinatura_visual);
                const presencaSemanaCompleta = Boolean(marcacaoSemanaCompleta?.assinatura_visual);

                if (ausenciaMarcadaComX) {
                    ausentesProvaveis += 1;
                } else if (presencaNoDia || presencaSemanaCompleta) {
                    presentesProvaveis += 1;

                    if (presencaSemanaCompleta && !presencaNoDia) {
                        semanaCompletaMarcada += 1;
                    }

                    if (amostra.length < 5) {
                        amostra.push({
                            numero,
                            nome: participante?.nome || "-",
                            codigoSafescan: participante?.codigoSafescan || "-",
                            densidade: Number((marcacao || marcacaoSemanaCompleta)?.assinatura_densidade || 0),
                            origem: presencaSemanaCompleta && !presencaNoDia ? "semana_completa" : "dia",
                        });
                    }
                } else {
                    conferenciaManual += 1;
                }
            }

            let status = "Aguardando leitura";

            if (dia.semAtividade) {
                status = "Sem atividade";
            } else if (!leituraExecutada) {
                status = "Aguardando leitura";
            } else if (!leituraConfiavel) {
                status = "Exige conferência manual";
            } else if (naoAnalisados > 0) {
                status = "Parcial";
            } else {
                status = "Apurado";
            }

            return {
                ...dia,
                status,
                presentesProvaveis,
                ausentesProvaveis,
                naoAnalisados,
                conferenciaManual,
                semanaCompletaMarcada,
                homemDia: presentesProvaveis,
                amostra,
            };
        });

        const totais = diasApurados.reduce((acc, dia) => {
            acc.presentesProvaveis += dia.presentesProvaveis;
            acc.ausentesProvaveis += dia.ausentesProvaveis;
            acc.naoAnalisados += dia.naoAnalisados;
            acc.conferenciaManual += dia.conferenciaManual;
            acc.semanaCompletaMarcada += dia.semanaCompletaMarcada;
            acc.homemDiaSemana += dia.homemDia;
            return acc;
        }, {
            presentesProvaveis: 0,
            ausentesProvaveis: 0,
            naoAnalisados: 0,
            conferenciaManual: 0,
            semanaCompletaMarcada: 0,
            homemDiaSemana: 0,
        });

        return {
            dias: diasApurados,
            totais,
            debugLinhas: debugLinhasScannerDds,
            marcacoesEncontradas: marcacoes.filter((item) => item?.assinatura_visual || item?.x_visual).length,
            leituraExecutada,
            leituraConfiavel,
        };
    }, [
        diasRegistroScannerDds,
        leituraArquivoScannerDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
    ]);

    const resultadoFinalScannerDds = useMemo(() => {
        const gabaritoCarregado = Boolean(registroScannerDds);
        const folhaAnexada = Boolean(arquivoScannerDds);
        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraTextoConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const leituraVisualComMarcacoesResultadoDds = Array.isArray(leituraArquivoScannerDds?.marcacoesDdsDias) && leituraArquivoScannerDds.marcacoesDdsDias.some((item) => (
            item?.tipoMarcacao === "dia" ||
            item?.tipoMarcacao === "semana_completa" ||
            item?.assinatura_visual ||
            item?.x_visual
        ));
        const leituraConfiavel = leituraTextoConfiavel || leituraVisualComMarcacoesResultadoDds;
        const participantesTotal = Number(preConferenciaParticipantesScannerDds?.total || 0);
        const participantesLocalizados = Number(preConferenciaParticipantesScannerDds?.localizados || 0);
        const participantesManuais = Number(preConferenciaParticipantesScannerDds?.manuais || 0);
        const participantesNaoLocalizados = Number(preConferenciaParticipantesScannerDds?.naoLocalizados || 0);
        const participantesPendentes = Number(preConferenciaParticipantesScannerDds?.pendentes || 0);
        const participantesPaginasNaoAnalisadas = Number(preConferenciaParticipantesScannerDds?.paginasNaoAnalisadas || 0);

        const itens = [
            {
                titulo: "Gabarito digital",
                ok: gabaritoCarregado,
                detalhe: gabaritoCarregado ? "Registro DDS carregado." : "Gabarito DDS ainda não carregado.",
            },
            {
                titulo: "Folha assinada",
                ok: folhaAnexada,
                detalhe: folhaAnexada ? "Arquivo anexado para conferência." : "Folha assinada ainda não anexada.",
            },
            {
                titulo: "Leitura inicial",
                ok: leituraExecutada && leituraConfiavel,
                detalhe: leituraExecutada
                    ? qualidadeLeituraArquivoScannerDds.statusConferencia
                    : "Leitura inicial ainda não executada.",
                manual: leituraExecutada && !leituraConfiavel,
            },
            {
                titulo: "Diagnóstico estrutural",
                ok: diagnosticoEstruturalScannerDds?.statusVisual === "ok",
                detalhe: diagnosticoEstruturalScannerDds?.statusGeral || "Aguardando diagnóstico estrutural.",
                manual: diagnosticoEstruturalScannerDds?.statusVisual === "manual",
            },
            {
                titulo: "Participantes",
                ok: participantesTotal > 0 && participantesLocalizados === participantesTotal,
                detalhe: `${participantesLocalizados}/${participantesTotal} participante(s) localizado(s); ${participantesManuais} em conferência manual; ${participantesPaginasNaoAnalisadas} em página não anexada/lida.`,
                manual: participantesTotal > 0 && (participantesManuais > 0 || participantesNaoLocalizados > 0 || participantesPendentes > 0),
            },
            {
                titulo: "OCR visual auxiliar",
                ok: false,
                detalhe: "Não há validação grafológica automática. A assinatura permanece como conferência visual provável/manual.",
                manual: true,
            },
        ];

        let statusFinal = "Exige conferência manual";
        let statusVisual = "manual";
        let titulo = "Exige conferência manual";
        let descricao = "A conferência automática não tem base suficiente para concluir o DDS sem revisão humana.";

        if (!gabaritoCarregado || !folhaAnexada || !leituraExecutada) {
            statusFinal = "Parcial";
            statusVisual = "parcial";
            titulo = "Conferência parcial";
            descricao = "Ainda faltam etapas obrigatórias para concluir a conferência do DDS.";
        } else if (
            leituraConfiavel &&
            diagnosticoEstruturalScannerDds?.statusVisual === "ok" &&
            participantesTotal > 0 &&
            participantesLocalizados === participantesTotal
        ) {
            statusFinal = "Conferido";
            statusVisual = "ok";
            titulo = "DDS conferido tecnicamente";
            descricao = "Gabarito, folha, leitura e participantes ficaram compatíveis. O OCR visual é apenas apoio técnico; a frequência oficial deve ser confirmada na Conferência Assistida.";
        } else if (
            leituraConfiavel &&
            participantesLocalizados > 0 &&
            participantesLocalizados < participantesTotal
        ) {
            statusFinal = "Parcial";
            statusVisual = "parcial";
            titulo = "Conferência parcial";
            descricao = "Parte dos dados foi localizada, mas ainda existem páginas complementares não anexadas/lidas.";
        }

        const recomendacoes = [];

        if (!gabaritoCarregado) {
            recomendacoes.push("Buscar o registro DDS pelo código impresso antes de concluir.");
        }

        if (!folhaAnexada) {
            recomendacoes.push("Anexar a folha DDS assinada em PDF ou imagem.");
        }

        if (!leituraExecutada) {
            recomendacoes.push("Executar a leitura inicial do arquivo anexado.");
        }

        if (leituraExecutada && !leituraConfiavel) {
            recomendacoes.push("Refazer o scan em melhor qualidade, preferencialmente alinhado, sem rotação e com boa iluminação.");
        }

        if (participantesManuais > 0 || participantesNaoLocalizados > 0 || participantesPaginasNaoAnalisadas > 0) {
            recomendacoes.push("Conferir manualmente as linhas dos participantes marcados como manual/não localizados e anexar as páginas complementares quando houver página não analisada.");
        }

        recomendacoes.push("Não usar o resultado como validação grafológica; manter conferência visual/documental.");

        return {
            statusFinal,
            statusVisual,
            titulo,
            descricao,
            itens,
            recomendacoes,
            resumo: {
                participantesTotal,
                participantesLocalizados,
                participantesManuais,
                participantesNaoLocalizados,
                participantesPendentes,
                participantesPaginasNaoAnalisadas,
            },
        };
    }, [
        arquivoScannerDds,
        diagnosticoEstruturalScannerDds,
        leituraArquivoScannerDds,
        preConferenciaParticipantesScannerDds,
        qualidadeLeituraArquivoScannerDds,
        registroScannerDds,
    ]);


    const obraSetorFoiSalvaParaEmpresaDds = empresaSelecionadaChaveDds
        ? Object.prototype.hasOwnProperty.call(obrasSetorPorEmpresaDds || {}, empresaSelecionadaChaveDds)
        : false;

    const obraSetorSalvaEmpresaDds = obraSetorFoiSalvaParaEmpresaDds
        ? String(obrasSetorPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
        : "";

    const valorObraSetorDds = obraSetorFoiSalvaParaEmpresaDds
        ? obraSetorSalvaEmpresaDds
        : String(dadosDds.obraSetor || "");

    const fiscalIdealizaFoiSalvoParaEmpresaDds = empresaSelecionadaChaveDds
        ? Object.prototype.hasOwnProperty.call(fiscalIdealizaPorEmpresaDds || {}, empresaSelecionadaChaveDds)
        : false;

    const fiscalIdealizaSalvoEmpresaDds = fiscalIdealizaFoiSalvoParaEmpresaDds
        ? String(fiscalIdealizaPorEmpresaDds?.[empresaSelecionadaChaveDds] || "")
        : "";

    const valorFiscalIdealizaDds = fiscalIdealizaFoiSalvoParaEmpresaDds
        ? fiscalIdealizaSalvoEmpresaDds
        : String(dadosDds.fiscalIdealiza || "");

    useEffect(() => {
        setDadosDds({
            ...dadosDdsAutomaticos,
            obraSetor: obraSetorFoiSalvaParaEmpresaDds
                ? obraSetorSalvaEmpresaDds
                : dadosDdsAutomaticos.obraSetor,
            fiscalIdealiza: fiscalIdealizaFoiSalvoParaEmpresaDds
                ? fiscalIdealizaSalvoEmpresaDds
                : dadosDdsAutomaticos.fiscalIdealiza,
        });
    }, [
        dadosDdsAutomaticos,
        obraSetorFoiSalvaParaEmpresaDds,
        obraSetorSalvaEmpresaDds,
        fiscalIdealizaFoiSalvoParaEmpresaDds,
        fiscalIdealizaSalvoEmpresaDds,
    ]);

    function aplicarObraCadastradaDds(idObra) {
        setObraSelecionadaIdDds(idObra);

        const obra = obrasEmpresaSelecionadaDds.find((item, indice) =>
            obterIdObraEmpresaDds(item, indice) === idObra
        );

        if (!obra) return;

        const nomeObra = obterNomeObraEmpresaDds(obra);
        const fiscalObra = obterFiscalObraEmpresaDds(obra);
        const liderObra = obterLiderObraEmpresaDds(obra);

        if (nomeObra) atualizarObraSetorDds(nomeObra);
        if (fiscalObra) atualizarFiscalIdealizaDds(fiscalObra);
        if (liderObra) {
            setDadosDds((dadosAtuais) => ({
                ...dadosAtuais,
                encarregado: liderObra,
            }));
        }
    }

    function atualizarObraSetorDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            obraSetor: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setObrasSetorPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarObrasSetorDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarFiscalIdealizaDds(valor) {
        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            fiscalIdealiza: valor,
        }));

        if (empresaSelecionadaChaveDds) {
            setFiscalIdealizaPorEmpresaDds((dadosAtuais) => {
                const atualizados = {
                    ...(dadosAtuais || {}),
                    [empresaSelecionadaChaveDds]: valor,
                };

                salvarFiscalIdealizaDdsPorEmpresa(atualizados);
                return atualizados;
            });
        }
    }

    function atualizarCampoDadosDds(chave, valor) {
        if (chave === "obraSetor") {
            atualizarObraSetorDds(valor);
            return;
        }

        if (chave === "fiscalIdealiza") {
            atualizarFiscalIdealizaDds(valor);
            return;
        }

        setDadosDds((dadosAtuais) => ({
            ...dadosAtuais,
            [chave]: valor,
        }));
    }





    const chaveOrientacoesDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    useEffect(() => {
        const orientacoesSalvas = carregarOrientacoesDdsLocal(chaveOrientacoesDds);

        setOrientacoesDdsEditaveis(orientacoesSalvas || criarOrientacoesPadraoDds());
        setChaveOrientacoesDdsCarregada(chaveOrientacoesDds);
    }, [chaveOrientacoesDds]);

    useEffect(() => {
        if (!chaveOrientacoesDds || chaveOrientacoesDdsCarregada !== chaveOrientacoesDds) return;

        salvarOrientacoesDdsLocal(chaveOrientacoesDds, orientacoesDdsEditaveis);
    }, [chaveOrientacoesDds, chaveOrientacoesDdsCarregada, orientacoesDdsEditaveis]);

    function atualizarOrientacaoDds(indiceOrientacao, valor) {
        setOrientacoesDdsEditaveis((orientacoesAtuais) => {
            const atualizadas = normalizarOrientacoesDdsLocal(orientacoesAtuais);

            atualizadas[indiceOrientacao] = valor;

            return atualizadas;
        });
    }

    function restaurarOrientacoesPadraoDds() {
        setOrientacoesDdsEditaveis(criarOrientacoesPadraoDds());
    }
    const chaveRecadosDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    useEffect(() => {
        const recadosSalvos = carregarRecadosDdsLocal(chaveRecadosDds);

        setRecadosDdsEditaveis(recadosSalvos);
        setChaveRecadosDdsCarregada(chaveRecadosDds);
    }, [chaveRecadosDds]);

    useEffect(() => {
        if (!chaveRecadosDds || chaveRecadosDdsCarregada !== chaveRecadosDds) return;

        salvarRecadosDdsLocal(chaveRecadosDds, recadosDdsEditaveis);
    }, [chaveRecadosDds, chaveRecadosDdsCarregada, recadosDdsEditaveis]);
    const chaveTemasDds = useMemo(() => criarChaveTemasDdsLocal({
        codigo: dadosDds.codigo,
    }), [dadosDds.codigo]);

    useEffect(() => {
        if (!chaveTemasDds) return;

        // Cada novo DDS inicia sem tema e sem responsável preenchidos.
        setTemasDdsEditaveis(criarTemasEditaveisDds());
        setChaveTemasDdsCarregada(chaveTemasDds);
    }, [chaveTemasDds]);

    useEffect(() => {
        if (!chaveTemasDds || chaveTemasDdsCarregada !== chaveTemasDds) return;

        salvarTemasDdsLocal(chaveTemasDds, temasDdsEditaveis);
    }, [chaveTemasDds, chaveTemasDdsCarregada, temasDdsEditaveis]);
    const diasSemanaComTemasDds = useMemo(() => (
        diasSemanaDds.map((dia, indice) => {
            const temaEditavel = temasDdsEditaveis[indice] || {};
            const temaFinal = String(temaEditavel.tema ?? "").trim();
            const responsavelFinal = String(temaEditavel.responsavel ?? "").trim();
            const temaNormalizado = normalizarTextoTemaDds(temaFinal);
            const semAtividade = temaNormalizado === "NAO HOUVE ATIVIDADES";

            return {
                ...dia,
                tema: temaFinal,
                responsavel: responsavelFinal,
                semAtividade,
            };
        })
    ), [diasSemanaDds, temasDdsEditaveis]);
    function atualizarTemaDiaDds(indiceDia, campo, valor) {
        setTemasDdsEditaveis((temasAtuais) => {
            const atualizados = criarTemasEditaveisDds().map((temaPadrao, indice) => ({
                ...temaPadrao,
                ...(temasAtuais[indice] || {}),
            }));

            atualizados[indiceDia] = {
                ...(atualizados[indiceDia] || {}),
                [campo]: valor,
            };

            return atualizados;
        });
    }

    const aniversariantesSemanaDds = useMemo(() => montarAniversariantesSemanaDds({
        colaboradores: colaboradoresEmpresaDds,
        inicioSemana: inicioSemanaDds,
        fimSemana: fimSemanaDds,
    }), [colaboradoresEmpresaDds, inicioSemanaDds, fimSemanaDds]);
    const participantesSistemaDds = useMemo(
        () => normalizarParticipantesDdsSistema(colaboradoresEmpresaDds),
        [colaboradoresEmpresaDds]
    );
    const {
        primeiraFolhaParticipantes,
        folhasContinuacaoDds,
    } = useMemo(
        () =>
            montarFolhasDdsComLinhasComplementares(
                participantesSistemaDds,
                LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS,
                LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS,
                QUANTIDADE_LINHAS_COMPLEMENTARES_DDS
            ),
        [participantesSistemaDds]
    );
    const totalFolhasDds = Math.max(1, 1 + folhasContinuacaoDds.length);

    const resultadoFinalApresentacaoDds = useMemo(() => {
        const valoresConferencia = Object.values(conferenciaAssistidaDds || {});
        const temAlgumaConfirmacaoAssistida = valoresConferencia.some((status) =>
            status === "presente" || status === "ausente" || status === "manual"
        );

        const temBaseAssistida = Boolean(
            temAlgumaConfirmacaoAssistida &&
            diasAtivosConferenciaAssistidaDds.length > 0 &&
            estatisticasConferenciaAssistidaDds.participantes > 0
        );

        if (!temBaseAssistida) {
            return resultadoFinalScannerDds;
        }

        const participantes = Number(estatisticasConferenciaAssistidaDds.participantes || 0);
        const presencas = Number(estatisticasConferenciaAssistidaDds.presencas || 0);
        const ausencias = Number(estatisticasConferenciaAssistidaDds.ausencias || 0);
        const manuais = Number(estatisticasConferenciaAssistidaDds.manuais || 0);
        const homemDia = Number(estatisticasConferenciaAssistidaDds.homemDia || 0);
        const diasAtivos = Number(diasAtivosConferenciaAssistidaDds.length || 0);
        const funcionariosSemanaCompleta = Number(estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta || 0);
        const totalCampos = participantes * diasAtivos;
        const conferenciaConcluidaOficialmente = fechamentoConferenciaAssistidaDds?.status === "concluida";

        const conferenciaFechada = totalCampos > 0 && manuais === 0;
        const statusVisual = conferenciaFechada ? "ok" : "parcial";
        const statusFinal = conferenciaConcluidaOficialmente ? "Conferência concluída oficialmente" : conferenciaFechada ? "Conferido oficialmente" : "Conferência assistida parcial";
        const titulo = conferenciaConcluidaOficialmente
            ? "Conferência DDS concluída oficialmente"
            : conferenciaFechada
                ? "Frequência oficial conferida"
                : "Frequência oficial com campos pendentes";
        const descricao = conferenciaConcluidaOficialmente
            ? "A Conferência Assistida foi concluída oficialmente e salva no registro DDS. O OCR visual permanece apenas como apoio técnico."
            : conferenciaFechada
                ? "A frequência oficial do DDS foi confirmada pela Conferência Assistida. O OCR visual permanece apenas como apoio técnico."
                : "A Conferência Assistida já possui dados oficiais, mas ainda existem campos marcados como manual/vazio para revisar.";

        const itens = [
            {
                titulo: "Conferência Assistida",
                ok: conferenciaFechada,
                manual: !conferenciaFechada,
                detalhe: `${presencas} presença(s), ${ausencias} ausência(s), ${manuais} manual/vazio e ${homemDia} homem-dia confirmado(s).`,
            },
            {
                titulo: "Dias ativos",
                ok: diasAtivos > 0,
                detalhe: `${diasAtivos} dia(s) com atividade usado(s) no cálculo oficial.`,
            },
            {
                titulo: "OCR visual auxiliar",
                ok: false,
                manual: true,
                detalhe: "Leitura automática usada apenas como apoio; a estatística oficial vem da Conferência Assistida.",
            },
        ];

        const recomendacoes = [];

        if (manuais > 0) {
            recomendacoes.push("Revisar os campos marcados como ? para fechar a frequência oficial sem pendências.");
        } else {
            recomendacoes.push("Manter a Conferência Assistida salva como base oficial da estatística DDS.");
        }

        recomendacoes.push("Usar o OCR visual apenas como apoio técnico, sem substituir a confirmação P / X / ?.");
        recomendacoes.push("Não usar o resultado como validação grafológica; manter conferência visual/documental.");

        return {
            ...resultadoFinalScannerDds,
            modoAssistido: true,
            statusFinal,
            statusVisual,
            titulo,
            descricao,
            itens,
            recomendacoes,
            resumo: {
                ...(resultadoFinalScannerDds?.resumo || {}),
                participantesTotal: participantes,
                participantesLocalizados: participantes,
                participantesManuais: manuais,
                participantesNaoLocalizados: ausencias,
                participantesPaginasNaoAnalisadas: 0,
                presencas,
                ausencias,
                manuais,
                homemDia,
                diasAtivos,
                totalCampos,
                funcionariosSemanaCompleta,
            },
        };
    }, [
        conferenciaAssistidaDds,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        fechamentoConferenciaAssistidaDds,
        resultadoFinalScannerDds,
    ]);



    const resumoControleMaoDeObraDds = useMemo(() => {
        const funcoes = new Set();

        participantesConferenciaAssistidaDds.forEach((participante) => {
            const funcao = String(participante?.funcao || "Sem função").trim() || "Sem função";
            funcoes.add(funcao.toUpperCase());
        });

        const datasLancadas = diasAtivosConferenciaAssistidaDds
            .map((dia) => String(dia?.data || dia?.dataDds || dia?.dia || "").trim())
            .filter(Boolean);

        const primeiraData = datasLancadas[0] || dadosDds.periodoInicio || registroScannerDds?.periodoInicio || "";
        let mesReferencia = "-";

        if (primeiraData) {
            const data = new Date(primeiraData.includes("/") ? primeiraData.split("/").reverse().join("-") : primeiraData);
            if (!Number.isNaN(data.getTime())) {
                mesReferencia = data.toLocaleDateString("pt-BR", { month: "2-digit", year: "numeric" });
            }
        }

        return {
            funcoes: funcoes.size,
            diasLancados: datasLancadas.length,
            homemDia: Number(estatisticasConferenciaAssistidaDds?.homemDia || 0),
            mesReferencia,
        };
    }, [
        dadosDds.periodoInicio,
        diasAtivosConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        participantesConferenciaAssistidaDds,
        registroScannerDds,
    ]);



    const registroHistoricoMensalConcluidoDds = (registro) => {
        const status = String(
            registro?.dados?.conferenciaAssistida?.fechamento?.status ||
            registro?.dados?.fechamento?.status ||
            registro?.statusConferencia ||
            ""
        ).trim().toLowerCase();

        return status === "concluida";
    };

    const resumoHistoricoMensalMaoDeObraDds = useMemo(() => {
        const registros = Array.isArray(historicoMensalMaoDeObraDds) ? historicoMensalMaoDeObraDds : [];
        const registrosConcluidos = registros.filter((registro) => registroHistoricoMensalConcluidoDds(registro));
        const diasApurados = new Set();
        const empresas = new Set();
        const funcoes = new Set();

        let acumuladoPeriodo = 0;

        registrosConcluidos.forEach((registro) => {
            const dados = registro?.dados || {};
            const conferencia = dados?.conferenciaAssistida || {};
            const fechamento = conferencia?.fechamento || {};
            const estatisticas = fechamento?.estatisticas || conferencia?.estatisticas || {};
            const participantes = Array.isArray(conferencia?.participantes) ? conferencia.participantes : [];
            const diasAtivos = Array.isArray(conferencia?.diasAtivos) ? conferencia.diasAtivos : [];

            const presencasRegistro = Number(
                estatisticas?.presencas ??
                estatisticas?.homemDia ??
                fechamento?.resumo?.presencas ??
                0
            );

            if (Number.isFinite(presencasRegistro)) {
                acumuladoPeriodo += presencasRegistro;
            }

            const empresaNome = String(registro?.empresaNome || dados?.empresaNome || dados?.empresa || "").trim();
            if (empresaNome) empresas.add(empresaNome);

            diasAtivos.forEach((dia) => {
                const dataDia = String(dia?.data || dia?.dataDds || dia?.dia || "").trim();
                if (dataDia) diasApurados.add(dataDia);
            });

            participantes.forEach((participante) => {
                const funcao = String(participante?.funcao || participante?.cargo || "").trim();
                if (funcao) funcoes.add(funcao);
            });
        });

        const quantidadeDias = diasApurados.size;
        const efetivoMedio = quantidadeDias > 0 ? acumuladoPeriodo / quantidadeDias : 0;
        const ddsConcluidos = registrosConcluidos.length;
        const ddsPendentes = Math.max(registros.length - ddsConcluidos, 0);

        return {
            ddsEncontrados: registros.length,
            ddsConcluidos,
            ddsPendentes,
            diasApurados: quantidadeDias,
            acumuladoPeriodo,
            efetivoMedio,
            empresas: empresas.size,
            funcoes: funcoes.size,
            possuiPendencias: ddsPendentes > 0,
        };
    }, [historicoMensalMaoDeObraDds]);

    const reciboConferenciaFinalDds = useMemo(() => {
        if (!conferenciaOficialConcluidaDds || !fechamentoConferenciaAssistidaDds || !resultadoFinalApresentacaoDds?.modoAssistido) {
            return null;
        }

        const dadosRegistro = registroScannerDds?.dados || {};
        const resumoResultado = resultadoFinalApresentacaoDds?.resumo || {};
        const resumoFechamento = fechamentoConferenciaAssistidaDds?.resumo || {};
        const estatisticasFechamento = fechamentoConferenciaAssistidaDds?.estatisticas || {};

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || fechamentoConferenciaAssistidaDds.codigo || "";
        const empresa = registroScannerDds?.empresaNome || dadosRegistro.empresaNome || dadosRegistro.empresa || dadosDds.empresaNome || "Empresa não informada";
        const obra = registroScannerDds?.obraNome || dadosRegistro.obraNome || dadosRegistro.obra || dadosDds.obraNome || "Obra não informada";
        const periodoInicio = registroScannerDds?.periodoInicio || dadosRegistro.periodoInicio || dadosDds.periodoInicio || "-";
        const periodoFim = registroScannerDds?.periodoFim || dadosRegistro.periodoFim || dadosDds.periodoFim || "-";
        const urlConferencia = registroScannerDds?.urlConferencia || dadosRegistro.urlConferencia || dadosDds.qrConferenciaUrl || "";

        const obterNumeroReciboDds = (
            valor,
            fallback = 0
        ) => {
            const numero = Number(
                valor ?? fallback ?? 0
            );

            return Number.isFinite(numero)
                ? numero
                : 0;
        };

        const participantes = obterNumeroReciboDds(
            resumoFechamento.participantes ??
            resumoResultado.participantesTotal
        );

        const presencas = obterNumeroReciboDds(
            resumoFechamento.presencas ??
            resumoResultado.presencas
        );

        const ausencias = obterNumeroReciboDds(
            resumoFechamento.ausencias ??
            resumoResultado.ausencias
        );

        const manuais = obterNumeroReciboDds(
            resumoFechamento.manuais ??
            resumoResultado.manuais
        );

        const homemDia = obterNumeroReciboDds(
            resumoFechamento.homemDia ??
            resumoResultado.homemDia
        );

        const funcionariosSemanaCompleta =
            obterNumeroReciboDds(
                resumoFechamento.funcionariosSemanaCompleta ??
                resumoResultado.funcionariosSemanaCompleta
            );

        const participantesAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.participantesAdicionais ??
                resumoResultado.participantesAdicionais ??
                estatisticasFechamento.participantesAdicionais ?? estatisticasConferenciaAssistidaDds.participantesAdicionais
            );

        const presencasAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.presencasAdicionais ??
                resumoResultado.presencasAdicionais ??
                estatisticasFechamento.presencasAdicionais ?? estatisticasConferenciaAssistidaDds.presencasAdicionais
            );

        const ausenciasAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.ausenciasAdicionais ??
                resumoResultado.ausenciasAdicionais ??
                estatisticasFechamento.ausenciasAdicionais ?? estatisticasConferenciaAssistidaDds.ausenciasAdicionais
            );

        const manuaisAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.manuaisAdicionais ??
                resumoResultado.manuaisAdicionais ??
                estatisticasFechamento.manuaisAdicionais ?? estatisticasConferenciaAssistidaDds.manuaisAdicionais
            );

        const homemDiaAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.homemDiaAdicionais ??
                resumoResultado.homemDiaAdicionais ??
                estatisticasFechamento.homemDiaAdicionais ?? estatisticasConferenciaAssistidaDds.homemDiaAdicionais
            );

        const semanaCompletaAdicionais =
            obterNumeroReciboDds(
                resumoFechamento.semanaCompletaAdicionais ??
                resumoResultado.semanaCompletaAdicionais ??
                estatisticasFechamento.semanaCompletaAdicionais ?? estatisticasConferenciaAssistidaDds.semanaCompletaAdicionais
            );

        return {
            codigo,
            empresa,
            obra,
            periodoInicio,
            periodoFim,
            urlConferencia,
            concluidoEm:
                fechamentoConferenciaAssistidaDds.concluidoEm ||
                "",
            status:
                "Conferência concluída oficialmente",
            participantes,
            participantesCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.participantesCadastrados ??
                    resumoResultado.participantesCadastrados ??
                    estatisticasFechamento.participantesCadastrados ?? estatisticasConferenciaAssistidaDds.participantesCadastrados,
                    Math.max(
                        0,
                        participantes -
                        participantesAdicionais
                    )
                ),
            participantesAdicionais,
            presencas,
            presencasCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.presencasCadastrados ??
                    resumoResultado.presencasCadastrados ??
                    estatisticasFechamento.presencasCadastrados ?? estatisticasConferenciaAssistidaDds.presencasCadastrados,
                    Math.max(
                        0,
                        presencas -
                        presencasAdicionais
                    )
                ),
            presencasAdicionais,
            ausencias,
            ausenciasCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.ausenciasCadastrados ??
                    resumoResultado.ausenciasCadastrados ??
                    estatisticasFechamento.ausenciasCadastrados ?? estatisticasConferenciaAssistidaDds.ausenciasCadastrados,
                    Math.max(
                        0,
                        ausencias -
                        ausenciasAdicionais
                    )
                ),
            ausenciasAdicionais,
            manuais,
            manuaisCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.manuaisCadastrados ??
                    resumoResultado.manuaisCadastrados ??
                    estatisticasFechamento.manuaisCadastrados ?? estatisticasConferenciaAssistidaDds.manuaisCadastrados,
                    Math.max(
                        0,
                        manuais -
                        manuaisAdicionais
                    )
                ),
            manuaisAdicionais,
            homemDia,
            homemDiaCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.homemDiaCadastrados ??
                    resumoResultado.homemDiaCadastrados ??
                    estatisticasFechamento.homemDiaCadastrados ?? estatisticasConferenciaAssistidaDds.homemDiaCadastrados,
                    Math.max(
                        0,
                        homemDia -
                        homemDiaAdicionais
                    )
                ),
            homemDiaAdicionais,
            diasAtivos: obterNumeroReciboDds(
                resumoFechamento.diasAtivos ??
                resumoResultado.diasAtivos ??
                estatisticasFechamento.diasAtivos
            ),
            funcionariosSemanaCompleta,
            semanaCompletaCadastrados:
                obterNumeroReciboDds(
                    resumoFechamento.semanaCompletaCadastrados ??
                    resumoResultado.semanaCompletaCadastrados ??
                    estatisticasFechamento.semanaCompletaCadastrados ?? estatisticasConferenciaAssistidaDds.semanaCompletaCadastrados,
                    Math.max(
                        0,
                        funcionariosSemanaCompleta -
                        semanaCompletaAdicionais
                    )
                ),
            semanaCompletaAdicionais,
        };
    }, [
        codigoConferenciaDds,
        conferenciaOficialConcluidaDds,
        dadosDds,
        fechamentoConferenciaAssistidaDds,
        estatisticasConferenciaAssistidaDds,
        registroScannerDds,
        resultadoFinalApresentacaoDds,
    ]);




    const historicoDds = useMemo(() => {
        const eventos = [];
        const dadosRegistro = registroScannerDds?.dados || {};

        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";
        const geradoEm = registroScannerDds?.geradoEm || registroScannerDds?.created_at || dadosRegistro.geradoEm || dadosRegistro.created_at || dadosDds.geradoEm || "";

        if (codigo || geradoEm) {
            eventos.push({
                titulo: "DDS gerado",
                detalhe: codigo ? `Código ${codigo}` : "Registro inicial criado.",
                data: geradoEm,
                status: "ok",
            });
        }

        if (leituraArquivoScannerDds) {
            const linhas = Array.isArray(leituraArquivoScannerDds?.linhas) ? leituraArquivoScannerDds.linhas.length : 0;
            const paginas = Number(leituraArquivoScannerDds?.paginas || leituraArquivoScannerDds?.totalPaginas || 0);

            eventos.push({
                titulo: "Arquivo analisado",
                detalhe: linhas > 0 || paginas > 0
                    ? `${paginas || "-"} página(s), ${linhas || "-"} linha(s) identificada(s).`
                    : "Leitura técnica executada.",
                data: "",
                status: "ok",
            });
        }

        if (conferenciaAssistidaSalvaEmDds) {
            eventos.push({
                titulo: "Conferência Assistida salva",
                detalhe: "Frequência confirmada na tabela P / X / ?.",
                data: conferenciaAssistidaSalvaEmDds,
                status: "ok",
            });
        }

        if (fechamentoConferenciaAssistidaDds?.concluidoEm) {
            eventos.push({
                titulo: "Conferência concluída oficialmente",
                detalhe: "Resultado oficial travado para auditoria.",
                data: fechamentoConferenciaAssistidaDds.concluidoEm,
                status: "ok",
            });
        }

        if (reciboFinalEmitidoEmDds) {
            eventos.push({
                titulo: "Recibo final emitido",
                detalhe: "Recibo impresso/gerado para conferência do registro.",
                data: reciboFinalEmitidoEmDds,
                status: "ok",
            });
        }

        return eventos;
    }, [
        codigoConferenciaDds,
        dadosDds,
        conferenciaAssistidaSalvaEmDds,
        fechamentoConferenciaAssistidaDds,
        leituraArquivoScannerDds,
        reciboFinalEmitidoEmDds,
        registroScannerDds,
    ]);



    function escaparHtmlControleMaoDeObraDds(valor = "") {
        return String(valor ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function parseDataControleMaoDeObraDds(valor = "") {
        const texto = String(valor || "").trim();

        if (!texto) return null;

        if (/^\d{4}-\d{2}-\d{2}/.test(texto)) {
            const [ano, mes, dia] = texto.slice(0, 10).split("-").map(Number);
            return new Date(ano, mes - 1, dia);
        }

        if (/^\d{2}\/\d{2}\/\d{4}/.test(texto)) {
            const [dia, mes, ano] = texto.slice(0, 10).split("/").map(Number);
            return new Date(ano, mes - 1, dia);
        }

        const data = new Date(texto);
        return Number.isNaN(data.getTime()) ? null : data;
    }

    function formatarDataControleMaoDeObraDds(valor = "") {
        const data = parseDataControleMaoDeObraDds(valor);

        if (!data) return "-";

        return data.toLocaleDateString("pt-BR");
    }

    function normalizarNomeEmpresaMaoDeObraDds(valor = "") {
        return String(valor || "Empresa não informada").trim().toUpperCase() || "EMPRESA NÃO INFORMADA";
    }

    function normalizarFuncaoMaoDeObraDds(valor = "") {
        return String(valor || "Sem função").trim().toUpperCase() || "SEM FUNÇÃO";
    }


    function formatarNumeroMaoDeObraDds(valor = 0) {
        const numero = Number(valor || 0);

        if (Number.isInteger(numero)) {
            return String(numero);
        }

        return numero.toFixed(1).replace(".", ",");
    }



    const calendariosMaoDeObraDds = [
        {
            id: "sao-jose-dos-campos-sp",
            cidade: "São José dos Campos",
            uf: "SP",
            rotulo: "São José dos Campos / SP",
            feriadosMunicipaisFixos: [
                { mes: 3, dia: 19, nome: "São José" },
                { mes: 7, dia: 27, nome: "Aniversário de São José dos Campos" },
            ],
            feriadosEstaduaisFixos: [
                { mes: 7, dia: 9, nome: "Revolução Constitucionalista" },
            ],
        },
        {
            id: "sao-paulo-sp",
            cidade: "São Paulo",
            uf: "SP",
            rotulo: "São Paulo / SP",
            feriadosMunicipaisFixos: [
                { mes: 1, dia: 25, nome: "Aniversário de São Paulo" },
            ],
            feriadosEstaduaisFixos: [
                { mes: 7, dia: 9, nome: "Revolução Constitucionalista" },
            ],
        },
    ];

    function normalizarChaveCalendarioMaoDeObraDds(valor = "") {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .trim();
    }

    function obterObrasDisponiveisCalendarioMaoDeObraDds() {
        const fontes = [];

        if (typeof obrasDds !== "undefined" && Array.isArray(obrasDds)) fontes.push(...obrasDds);
        if (typeof obras !== "undefined" && Array.isArray(obras)) fontes.push(...obras);
        if (typeof listaObrasDds !== "undefined" && Array.isArray(listaObrasDds)) fontes.push(...listaObrasDds);
        if (typeof obrasConfiguracoes !== "undefined" && Array.isArray(obrasConfiguracoes)) fontes.push(...obrasConfiguracoes);
        if (typeof obrasCadastradas !== "undefined" && Array.isArray(obrasCadastradas)) fontes.push(...obrasCadastradas);

        return fontes.filter(Boolean);
    }

    function obterIdObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obraId ||
            reciboConferenciaFinalDds?.obra_id ||
            registroScannerDds?.obraId ||
            registroScannerDds?.obra_id ||
            registroScannerDds?.dados?.obraId ||
            registroScannerDds?.dados?.obra_id ||
            dadosDds?.obraId ||
            dadosDds?.obra_id ||
            obraSelecionadaIdDds ||
            ""
        ).trim();
    }

    function obterNomeObraCalendarioMaoDeObraDds() {
        return String(
            reciboConferenciaFinalDds?.obra ||
            reciboConferenciaFinalDds?.obraNome ||
            registroScannerDds?.obraNome ||
            registroScannerDds?.dados?.obraNome ||
            dadosDds?.obraNome ||
            dadosDds?.obraSetor ||
            dadosDds?.obra ||
            ""
        ).trim();
    }

    function obterObraReferenciaCalendarioMaoDeObraDds() {
        const obraId = obterIdObraCalendarioMaoDeObraDds();
        const obraNome = obterNomeObraCalendarioMaoDeObraDds();
        const obraIdBusca = normalizarChaveCalendarioMaoDeObraDds(obraId);
        const obraNomeBusca = normalizarChaveCalendarioMaoDeObraDds(obraNome);
        const obrasDisponiveis = obterObrasDisponiveisCalendarioMaoDeObraDds();

        const obraEncontrada = obrasDisponiveis.find((obra) => {
            const id = normalizarChaveCalendarioMaoDeObraDds(obra?.id || obra?.obraId || obra?.obra_id);
            const nome = normalizarChaveCalendarioMaoDeObraDds(obra?.nome || obra?.obraNome || obra?.obra_nome || obra?.obra || obra?.descricao);

            return (obraIdBusca && id && id === obraIdBusca) || (obraNomeBusca && nome && nome === obraNomeBusca);
        });

        if (obraEncontrada) return obraEncontrada;

        return {
            id: obraId,
            nome: obraNome,
            cidade:
                reciboConferenciaFinalDds?.cidade ||
                reciboConferenciaFinalDds?.obraCidade ||
                registroScannerDds?.cidade ||
                registroScannerDds?.obraCidade ||
                registroScannerDds?.dados?.cidade ||
                registroScannerDds?.dados?.obraCidade ||
                dadosDds?.cidade ||
                dadosDds?.obraCidade ||
                "",
            uf:
                reciboConferenciaFinalDds?.uf ||
                reciboConferenciaFinalDds?.obraUf ||
                registroScannerDds?.uf ||
                registroScannerDds?.obraUf ||
                registroScannerDds?.dados?.uf ||
                registroScannerDds?.dados?.obraUf ||
                dadosDds?.uf ||
                dadosDds?.obraUf ||
                "",
        };
    }

    function resolverCalendarioMaoDeObraDds(obraReferencia = null) {
        const cidade = String(
            obraReferencia?.cidade ||
            obraReferencia?.municipio ||
            obraReferencia?.município ||
            obraReferencia?.cidade_nome ||
            obraReferencia?.obraCidade ||
            ""
        ).trim();

        const uf = String(
            obraReferencia?.uf ||
            obraReferencia?.estado ||
            obraReferencia?.obraUf ||
            obraReferencia?.obraEstado ||
            ""
        ).trim().toUpperCase().slice(0, 2);

        const cidadeBusca = normalizarChaveCalendarioMaoDeObraDds(cidade);
        const ufBusca = normalizarChaveCalendarioMaoDeObraDds(uf);

        if (!cidadeBusca && !ufBusca) {
            return {
                ...calendariosMaoDeObraDds[0],
                origem: "fallback padrão",
            };
        }

        const preset = calendariosMaoDeObraDds.find((calendario) =>
            normalizarChaveCalendarioMaoDeObraDds(calendario.cidade) === cidadeBusca &&
            normalizarChaveCalendarioMaoDeObraDds(calendario.uf) === ufBusca
        );

        if (preset) {
            return {
                ...preset,
                origem: "cadastro da obra",
            };
        }

        const feriadosEstaduaisFixos =
            uf === "SP"
                ? [{ mes: 7, dia: 9, nome: "Revolução Constitucionalista" }]
                : [];

        const cidadeRotulo = cidade || "Município não informado";
        const ufRotulo = uf || "UF não informada";

        return {
            id: "obra-" + normalizarChaveCalendarioMaoDeObraDds(cidadeRotulo + "-" + ufRotulo).replace(/\s+/g, "-"),
            cidade: cidadeRotulo,
            uf: ufRotulo,
            rotulo: cidadeRotulo + " / " + ufRotulo,
            feriadosMunicipaisFixos: [],
            feriadosEstaduaisFixos,
            origem: "cadastro da obra",
        };
    }

    const obraReferenciaCalendarioMaoDeObraDds = obterObraReferenciaCalendarioMaoDeObraDds();
    const calendarioMaoDeObraSelecionadoDds = resolverCalendarioMaoDeObraDds(obraReferenciaCalendarioMaoDeObraDds);

    function baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html) {
        const blob = new Blob(["\ufeff" + html], {
            type: "application/vnd.ms-excel;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function montarDadosControleMaoDeObraDds() {
        if (!participantesConferenciaAssistidaDds.length || !diasAtivosConferenciaAssistidaDds.length) {
            return null;
        }

        const codigo = reciboConferenciaFinalDds?.codigo || registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "DDS";
        const empresaPrincipal = reciboConferenciaFinalDds?.empresa || registroScannerDds?.empresaNome || dadosDds.empresaNome || "";
        const obra = reciboConferenciaFinalDds?.obra || registroScannerDds?.obraNome || dadosDds.obraNome || "";
        const periodoInicio = reciboConferenciaFinalDds?.periodoInicio || registroScannerDds?.periodoInicio || dadosDds.periodoInicio || "";
        const periodoFim = reciboConferenciaFinalDds?.periodoFim || registroScannerDds?.periodoFim || dadosDds.periodoFim || "";
        const dataBase = parseDataControleMaoDeObraDds(periodoInicio) || parseDataControleMaoDeObraDds(diasAtivosConferenciaAssistidaDds[0]?.data) || new Date();
        const mesBase = dataBase.getMonth();
        const anoBase = dataBase.getFullYear();
        const totalDiasMes = new Date(anoBase, mesBase + 1, 0).getDate();
        const diasMes = Array.from({ length: totalDiasMes }, (_, indice) => indice + 1);
        const diasComLancamento = new Set();

        const porEmpresaFuncao = new Map();
        const totaisDia = Object.fromEntries(diasMes.map((dia) => [dia, 0]));
        const totaisPorEmpresa = new Map();

        const obterLinha = (empresa, funcao) => {
            const empresaNome = normalizarNomeEmpresaMaoDeObraDds(empresa || empresaPrincipal);
            const funcaoNome = normalizarFuncaoMaoDeObraDds(funcao);
            const chave = `${empresaNome}||${funcaoNome}`;

            if (!porEmpresaFuncao.has(chave)) {
                porEmpresaFuncao.set(chave, {
                    empresa: empresaNome,
                    funcao: funcaoNome,
                    dias: Object.fromEntries(diasMes.map((dia) => [dia, 0])),
                    total: 0,
                });
            }

            return porEmpresaFuncao.get(chave);
        };

        participantesConferenciaAssistidaDds.forEach((participante) => {
            const numero = participante?.numero || participante?.ordem || participante?.indice || "";
            const empresaParticipante = participante?.empresa || participante?.empresaNome || empresaPrincipal || "Empresa não informada";
            const funcao = participante?.funcao || "Sem função";
            const linha = obterLinha(empresaParticipante, funcao);

            diasAtivosConferenciaAssistidaDds.forEach((dia) => {
                const data = parseDataControleMaoDeObraDds(dia?.data || dia?.dataDds || dia?.dia || "");

                if (!data || data.getMonth() !== mesBase || data.getFullYear() !== anoBase) return;

                const diaMes = data.getDate();
                const status = obterStatusFrequenciaAssistidaDds(numero, dia);

                if (status === "presente") {
                    linha.dias[diaMes] += 1;
                    linha.total += 1;
                    totaisDia[diaMes] += 1;
                    diasComLancamento.add(diaMes);

                    const totalEmpresaAtual = totaisPorEmpresa.get(linha.empresa) || 0;
                    totaisPorEmpresa.set(linha.empresa, totalEmpresaAtual + 1);
                }
            });
        });

        const linhas = Array.from(porEmpresaFuncao.values()).sort((a, b) => {
            const empresaComparacao = a.empresa.localeCompare(b.empresa, "pt-BR");
            if (empresaComparacao !== 0) return empresaComparacao;
            return a.funcao.localeCompare(b.funcao, "pt-BR");
        });

        const totalHomemDia = linhas.reduce((total, linha) => total + linha.total, 0);
        const quantidadeDiasLancados = Math.max(diasComLancamento.size, 1);
        const mediaMes = totalHomemDia / quantidadeDiasLancados;
        const empresas = Array.from(totaisPorEmpresa.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

        return {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicio,
            periodoFim,
            periodoInicioFormatado: formatarDataControleMaoDeObraDds(periodoInicio),
            periodoFimFormatado: formatarDataControleMaoDeObraDds(periodoFim),
            dataBase,
            calendarioMaoDeObra: calendarioMaoDeObraSelecionadoDds,
            calendarioRotulo: calendarioMaoDeObraSelecionadoDds.rotulo,
            calendarioOrigem: calendarioMaoDeObraSelecionadoDds.origem,
            mesBase: dataBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            empresas,
            totaisPorEmpresa,
            expediente: {
                jornada: "07:00 às 17:00",
                almoco: "12:00 às 13:00",
                dds: "07:00 às 07:10",
            },
        };
    }




    function somarDiasMaoDeObraDds(data, dias) {
        const novaData = new Date(data);
        novaData.setDate(novaData.getDate() + dias);
        return novaData;
    }

    function chaveDataMaoDeObraDds(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        return ano + "-" + mes + "-" + dia;
    }

    function calcularPascoaMaoDeObraDds(ano) {
        const a = ano % 19;
        const b = Math.floor(ano / 100);
        const c = ano % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31);
        const dia = ((h + l - 7 * m + 114) % 31) + 1;

        return new Date(ano, mes - 1, dia);
    }


    function obterFeriadosCalendarioMaoDeObraDds(ano, calendario = calendarioMaoDeObraSelecionadoDds) {
        const pascoa = calcularPascoaMaoDeObraDds(ano);
        const sextaSanta = somarDiasMaoDeObraDds(pascoa, -2);
        const corpusChristi = somarDiasMaoDeObraDds(pascoa, 60);

        const feriados = new Set([
            ano + "-01-01",
            chaveDataMaoDeObraDds(sextaSanta),
            ano + "-04-21",
            ano + "-05-01",
            chaveDataMaoDeObraDds(corpusChristi),
            ano + "-09-07",
            ano + "-10-12",
            ano + "-11-02",
            ano + "-11-15",
            ano + "-11-20",
            ano + "-12-25",
        ]);

        [...(calendario?.feriadosEstaduaisFixos || []), ...(calendario?.feriadosMunicipaisFixos || [])].forEach((feriado) => {
            const mes = String(feriado.mes).padStart(2, "0");
            const dia = String(feriado.dia).padStart(2, "0");

            feriados.add(ano + "-" + mes + "-" + dia);
        });

        return feriados;
    }

    function obterClasseCalendarioMaoDeObraDds(data, calendario = calendarioMaoDeObraSelecionadoDds) {
        const feriados = obterFeriadosCalendarioMaoDeObraDds(data.getFullYear(), calendario);
        const chave = chaveDataMaoDeObraDds(data);

        if (feriados.has(chave)) return " dia-feriado";
        if (data.getDay() === 0) return " dia-domingo";
        if (data.getDay() === 6) return " dia-sabado";

        return "";
    }

    function agruparLinhasControleMaoDeObraDds(linhas = []) {
        const mapa = new Map();

        linhas.forEach((linha) => {
            const empresa = normalizarNomeEmpresaMaoDeObraDds(linha?.empresa || "Empresa não informada");

            if (!mapa.has(empresa)) {
                mapa.set(empresa, {
                    empresa,
                    total: 0,
                    linhas: [],
                });
            }

            const grupo = mapa.get(empresa);
            grupo.total += Number(linha?.total || 0);
            grupo.linhas.push(linha);
        });

        return Array.from(mapa.values()).sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
    }



    function montarDadosHistoricoMensalMaoDeObraDds() {
        const registrosEncontrados = Array.isArray(historicoMensalMaoDeObraDds) ? historicoMensalMaoDeObraDds : [];
        const registros = registrosEncontrados.filter((registro) => registroHistoricoMensalConcluidoDds(registro));
        const periodo = obterPeriodoHistoricoMensalMaoDeObraDds();

        if (!registros.length || !periodo) {
            return null;
        }

        const dataBase = parseDataControleMaoDeObraDds(periodo.inicio) || new Date();
        const mesBaseNumero = dataBase.getMonth();
        const anoBase = dataBase.getFullYear();
        const totalDiasMes = new Date(anoBase, mesBaseNumero + 1, 0).getDate();
        const diasMes = Array.from({ length: totalDiasMes }, (_, indice) => indice + 1);
        const diasComLancamento = new Set();
        const porEmpresaFuncao = new Map();
        const totaisDia = Object.fromEntries(diasMes.map((dia) => [dia, 0]));
        const totaisPorEmpresa = new Map();

        const empresaPrincipal =
            registros[0]?.empresaNome ||
            registros[0]?.dados?.empresaNome ||
            dadosDds.empresaNome ||
            dadosDds.empresa ||
            "";

        const obra =
            dadosDds.obraSetor ||
            registros[0]?.obraNome ||
            registros[0]?.dados?.obraNome ||
            dadosDds.obraNome ||
            "";

        const obterLinha = (empresa, funcao) => {
            const empresaNome = normalizarNomeEmpresaMaoDeObraDds(empresa || empresaPrincipal || "Empresa não informada");
            const funcaoNome = normalizarFuncaoMaoDeObraDds(funcao || "Sem função");
            const chave = empresaNome + "||" + funcaoNome;

            if (!porEmpresaFuncao.has(chave)) {
                porEmpresaFuncao.set(chave, {
                    empresa: empresaNome,
                    funcao: funcaoNome,
                    dias: Object.fromEntries(diasMes.map((dia) => [dia, 0])),
                    total: 0,
                });
            }

            return porEmpresaFuncao.get(chave);
        };

        registros.forEach((registro) => {
            const dadosRegistro = registro?.dados || {};
            const conferencia = dadosRegistro?.conferenciaAssistida || {};
            const frequencia = conferencia?.frequencia || {};
            const participantes = Array.isArray(conferencia?.participantes) ? conferencia.participantes : [];
            const diasAtivos = Array.isArray(conferencia?.diasAtivos) ? conferencia.diasAtivos : [];
            const empresaRegistro =
                registro?.empresaNome ||
                dadosRegistro?.empresaNome ||
                dadosRegistro?.empresa ||
                empresaPrincipal ||
                "Empresa não informada";

            participantes.forEach((participante) => {
                const numero = participante?.numero || participante?.ordem || participante?.indice || "";
                const empresaParticipante = participante?.empresa || participante?.empresaNome || empresaRegistro;
                const funcao = participante?.funcao || participante?.cargo || "Sem função";
                const linha = obterLinha(empresaParticipante, funcao);

                diasAtivos.forEach((dia) => {
                    const data = parseDataControleMaoDeObraDds(dia?.data || dia?.dataDds || dia?.dia || "");

                    if (!data || data.getMonth() !== mesBaseNumero || data.getFullYear() !== anoBase) return;

                    const chave = obterChaveFrequenciaAssistidaDds(numero, dia);
                    const status = String(frequencia?.[chave] || "").trim().toLowerCase();

                    if (status === "presente" || status === "p") {
                        const diaMes = data.getDate();

                        linha.dias[diaMes] += 1;
                        linha.total += 1;
                        totaisDia[diaMes] += 1;
                        diasComLancamento.add(diaMes);

                        const totalEmpresaAtual = totaisPorEmpresa.get(linha.empresa) || 0;
                        totaisPorEmpresa.set(linha.empresa, totalEmpresaAtual + 1);
                    }
                });
            });
        });

        const linhas = Array.from(porEmpresaFuncao.values())
            .filter((linha) => Number(linha.total || 0) > 0)
            .sort((a, b) => {
                const empresaComparacao = a.empresa.localeCompare(b.empresa, "pt-BR");
                if (empresaComparacao !== 0) return empresaComparacao;
                return a.funcao.localeCompare(b.funcao, "pt-BR");
            });

        if (!linhas.length) {
            return null;
        }

        const totalHomemDia = linhas.reduce((total, linha) => total + Number(linha.total || 0), 0);
        const quantidadeDiasLancados = Math.max(diasComLancamento.size, 1);
        const mediaMes = totalHomemDia / quantidadeDiasLancados;
        const empresas = Array.from(totaisPorEmpresa.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

        return {
            codigo: "HISTORICO-" + mesHistoricoMaoDeObraDds,
            empresaPrincipal,
            obra,
            periodoInicio: periodo.inicio,
            periodoFim: periodo.fim,
            periodoInicioFormatado: formatarDataControleMaoDeObraDds(periodo.inicio),
            periodoFimFormatado: formatarDataControleMaoDeObraDds(periodo.fim),
            dataBase,
            calendarioMaoDeObra: calendarioMaoDeObraSelecionadoDds,
            calendarioRotulo: calendarioMaoDeObraSelecionadoDds.rotulo,
            calendarioOrigem: calendarioMaoDeObraSelecionadoDds.origem,
            mesBase: dataBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            empresas,
            totaisPorEmpresa,
            registrosOrigem: registrosEncontrados.length,
            registrosConcluidos: registros.length,
            registrosPendentes: Math.max(registrosEncontrados.length - registros.length, 0),
            expediente: {
                jornada: "07:00 às 17:00",
                almoco: "12:00 às 13:00",
                dds: "07:00 às 07:10",
            },
        };
    }

    function exportarHistoricoMensalMaoDeObraDds() {
        const dadosControle = montarDadosHistoricoMensalMaoDeObraDds();

        if (!dadosControle) {
            alert("Busque um histórico mensal com DDS concluídos e presenças oficiais antes de exportar. DDS em aberto não entram na consolidação oficial.");
            return;
        }

        const {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
            registrosOrigem,
            registrosConcluidos,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const margem = '<td class="margem"></td><td class="margem"></td>';
        const colspanConteudoExcel = diasMes.length + 3;
        const colspanTotalExcel = diasMes.length + 5;
        const colunasDiasExcel = diasMes.map(() => '<col style="width:22px" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "valor" : "zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = linha.total / quantidadeDiasLancados;

                return [
                    '<tr>',
                    margem,
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<tr class="grupo-empresa">',
                margem,
                '<td colspan="' + colspanConteudoExcel + '">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</td>',
                '</tr>',
                '<tr class="cabecalho">',
                margem,
                '<th>Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                linhasGrupo,
            ].join("");
        }).join("");

        const linhaTotalDia = diasMes.map((dia) => '<td class="total-dia">' + (totaisDia[dia] || 0) + '</td>').join("");
        const nomeArquivo = "mao-de-obra-mensal-" + String(obraTitulo + "-" + mesHistoricoMaoDeObraDds).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".xls";

        const html = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<style>',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #0f172a; }',
            'table { border-collapse: collapse; width: auto; table-layout: fixed; }',
            'th, td { border: 1px solid #b7c7d8; padding: 3px 4px; text-align: center; font-size: 10px; }',
            '.margem { width: 18px; min-width: 18px; background: #ffffff; border: 0 !important; }',
            '.linha-vazia td { height: 10px; border: 0 !important; background: #ffffff; }',
            '.titulo { background: #ffffff; color: #111827; font-size: 15px; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #94a3b8; }',
            '.subtitulo { background: #ffffff; color: #111827; font-weight: 800; text-align: center; vertical-align: middle; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; }',
            '.jornada { background: #f8fafc; color: #334155; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; }',
            '.resumo-linha { background: #f8fafc; color: #0f172a; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; }',
            '.legenda { background: #ffffff; color: #334155; font-weight: 700; text-align: center; vertical-align: middle; border: 1px solid #e5e7eb; font-size: 9px; height: 22px; }',
            '.grupo-empresa td:not(.margem) { background: #f1f5f9; color: #0f172a; font-weight: 900; text-align: center; border-top: 2px solid #94a3b8; border-bottom: 1px solid #cbd5e1; letter-spacing: .02em; }',
            '.cabecalho th { background: #334155; color: #ffffff; font-weight: 900; text-transform: uppercase; }',
            '.dia { background: #334155; color: #ffffff; width: 22px; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao { background: #ffffff; color: #0f172a; font-weight: 900; text-align: center; width: 120px; }',
            '.valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.zero { background: #ffffff; color: #94a3b8; }',
            '.linha-total td:not(.margem) { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '.total, .total-dia { background: #ffffff; color: #047857; font-weight: 900; }',
            '.media { background: #ffffff; color: #0f172a; font-weight: 900; }',
            '</style>',
            '</head>',
            '<body>',
            '<table>',
            '<colgroup>',
            '<col style="width:18px" />',
            '<col style="width:18px" />',
            '<col style="width:120px" />',
            colunasDiasExcel,
            '<col style="width:64px" />',
            '<col style="width:64px" />',
            '</colgroup>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            '<tr>',
            margem,
            '<td class="titulo" colspan="' + colspanConteudoExcel + '">CONTROLE MENSAL DE MÃO DE OBRA CONSOLIDADO (SAFESCAN BRASIL) - OBRA / SETOR: ', escaparHtmlControleMaoDeObraDds(obraTitulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Empresa principal: ', escaparHtmlControleMaoDeObraDds(empresaPrincipal), ' | Obra/Setor: ', escaparHtmlControleMaoDeObraDds(obra), ' | DDS encontrados: ', registrosOrigem, ' | Concluídos: ', registrosConcluidos, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Período consolidado: ', periodoInicioFormatado, ' a ', periodoFimFormatado, ' | Mês base: ', escaparHtmlControleMaoDeObraDds(mesBase), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="jornada" colspan="' + colspanConteudoExcel + '">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="resumo-linha" colspan="' + colspanConteudoExcel + '">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="legenda" colspan="' + colspanConteudoExcel + '"><strong>Legenda:</strong> <span style="color:#16a34a;font-size:13px;font-weight:900;">&#9632;</span> Presença registrada &nbsp; <span style="color:#facc15;font-size:13px;font-weight:900;">&#9632;</span> Sábado &nbsp; <span style="color:#ef4444;font-size:13px;font-weight:900;">&#9632;</span> Domingo &nbsp; <span style="color:#60a5fa;font-size:13px;font-weight:900;">&#9632;</span> Feriado</td>',
            '</tr>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            linhasTabela,
            '<tr class="linha-total">',
            margem,
            '<td>Total diário</td>',
            linhaTotalDia,
            '<td>', totalHomemDia, '</td>',
            '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
            '</tr>',
            '</table>',
            '</body>',
            '</html>',
        ].join("");

        baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html);
    }

    function imprimirHistoricoMensalMaoDeObraDds() {
        const dadosControle = montarDadosHistoricoMensalMaoDeObraDds();

        if (!dadosControle) {
            alert("Busque um histórico mensal com DDS concluídos e presenças oficiais antes de imprimir. DDS em aberto não entram na consolidação oficial.");
            return;
        }

        const {
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
            registrosOrigem,
            registrosConcluidos,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtmlControleMaoDeObraDds(heroUrl) + '" alt="" />' : "";
        const colunasDiasPdf = diasMes.map(() => '<col class="dia-col" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "dia-valor" : "dia-zero") + '">' + valor + '</td>';
                }).join("");

                return [
                    '<tr>',
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<section class="empresa-bloco">',
                '<div class="empresa-faixa">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</div>',
                '<table>',
                '<colgroup>',
                '<col class="funcao-col" />',
                colunasDiasPdf,
                '<col class="total-col" />',
                '</colgroup>',
                '<thead>',
                '<tr>',
                '<th class="funcao">Função</th>',
                thDias,
                '<th>Total</th>',
                '</tr>',
                '</thead>',
                '<tbody>',
                linhasGrupo,
                '<tr class="linha-total">',
                '<td>Total diário</td>',
                diasMes.map((dia) => '<td>' + (totaisDia[dia] || 0) + '</td>').join(""),
                '<td>', totalHomemDia, '</td>',
                '</tr>',
                '</tbody>',
                '</table>',
                '</section>',
            ].join("");
        }).join("");

        const janela = window.open("", "_blank", "width=1280,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            '<!doctype html>',
            '<html lang="pt-BR">',
            '<head>',
            '<meta charset="utf-8" />',
            '<title>Controle mensal consolidado de mão de obra</title>',
            '<style>',
            '@page { size: A4 landscape; margin: 8mm; }',
            '* { box-sizing: border-box; }',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
            '.page { min-height: 190mm; border: 1px solid #dbe3ef; overflow: hidden; }',
            '.hero { position: relative; overflow: hidden; min-height: 62px; padding: 11px 15px; color: #fff; background: #0f172a; }',
            '.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .36; }',
            '.hero:after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,.97), rgba(15,23,42,.84), rgba(15,23,42,.52)); }',
            '.hero-content { position: relative; z-index: 1; }',
            '.brand { margin: 0 0 3px; font-size: 9px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #bbf7d0; }',
            'h1 { margin: 0; font-size: 18px; line-height: 1.1; }',
            '.subtitle { margin: 4px 0 0; font-size: 10px; font-weight: 700; color: #e2e8f0; }',
            '.cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; padding: 7px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }',
            '.card { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; padding: 5px 7px; min-height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }',
            '.card span { display: block; width: 100%; font-size: 7px; line-height: 1.15; text-align: center; text-transform: uppercase; font-weight: 900; color: #64748b; letter-spacing: .08em; }',
            '.card strong { display: block; width: 100%; margin-top: 2px; font-size: 10px; line-height: 1.15; font-weight: 900; text-align: center; color: #0f172a; overflow-wrap: anywhere; }',
            '.jornada, .resumo-pdf { margin: 6px 7px 0; border: 1px solid #dbe3ef; border-radius: 8px; background: #f8fafc; padding: 5px 8px; font-size: 9px; font-weight: 900; text-align: center; }',
            '.legenda-pdf { margin: 6px 7px 0; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; padding: 5px 8px; font-size: 8px; font-weight: 800; color: #334155; text-align: center; }',
            '.legenda-item { display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }',
            '.cor-legenda { display: inline-block; width: 9px; height: 9px; border-radius: 2px; border: 1px solid rgba(15,23,42,.25); }',
            '.cor-presenca { background: #16a34a; }',
            '.cor-sabado { background: #facc15; }',
            '.cor-domingo { background: #ef4444; }',
            '.cor-feriado { background: #60a5fa; }',
            '.empresa-bloco { margin: 7px; page-break-inside: avoid; }',
            '.empresa-faixa { background: #e2e8f0; color: #0f172a; border: 1px solid #cbd5e1; border-bottom: 0; border-radius: 8px 8px 0 0; padding: 5px 8px; text-align: center; font-size: 10px; font-weight: 900; }',
            'table { width: 100%; border-collapse: collapse; table-layout: fixed; }',
            'th, td { border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-size: 7px; line-height: 1.15; }',
            'th { background: #334155; color: #fff; font-weight: 900; text-transform: uppercase; }',
            '.funcao-col { width: 90px; }',
            '.dia-col { width: 19px; }',
            '.total-col { width: 38px; }',
            '.funcao { text-align: center; font-weight: 900; color: #0f172a; background: #fff; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.dia-valor { color: #047857; font-weight: 900; background: #fff; }',
            '.dia-zero { color: #94a3b8; background: #fff; }',
            '.total { color: #047857; font-weight: 900; background: #fff; }',
            '.linha-total td { background: #f1f5f9; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '</style>',
            '</head>',
            '<body>',
            '<main class="page">',
            '<section class="hero">',
            heroImgHtml,
            '<div class="hero-content">',
            '<p class="brand">SafeScan Brasil | DDS</p>',
            '<h1>Controle mensal consolidado de mão de obra</h1>',
            '<p class="subtitle">Obra / setor: ', escaparHtmlControleMaoDeObraDds(obraTitulo), ' — consolidado por empresa/contratada e função a partir do histórico mensal DDS.</p>',
            '</div>',
            '</section>',
            '<section class="cards">',
            '<div class="card"><span>Empresa principal</span><strong>', escaparHtmlControleMaoDeObraDds(empresaPrincipal || "-"), '</strong></div>',
            '<div class="card"><span>Obra / setor</span><strong>', escaparHtmlControleMaoDeObraDds(obra || "-"), '</strong></div>',
            '<div class="card"><span>Período</span><strong>', periodoInicioFormatado, ' a ', periodoFimFormatado, '</strong></div>',
            '<div class="card"><span>Mês base</span><strong>', escaparHtmlControleMaoDeObraDds(mesBase), '</strong></div>',
            '<div class="card"><span>DDS</span><strong>', registrosConcluidos, '/', registrosOrigem, '</strong></div>',
            '<div class="card"><span>Efetivo médio</span><strong>', formatarNumeroMaoDeObraDds(mediaMes), '</strong></div>',
            '</section>',
            '<section class="jornada">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</section>',
            '<section class="resumo-pdf">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</section>',
            '<section class="legenda-pdf">',
            '<strong>Legenda:</strong>',
            '<span class="legenda-item"><i class="cor-legenda cor-presenca"></i>Presença registrada</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-sabado"></i>Sábado</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-domingo"></i>Domingo</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-feriado"></i>Feriado</span>',
            '</section>',
            linhasTabela,
            '</main>',
            '<script>window.onload = function(){ window.focus(); window.print(); };</script>',
            '</body>',
            '</html>',
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    function exportarControleMaoDeObraDds() {
        const dadosControle = montarDadosControleMaoDeObraDds();

        if (!dadosControle) {
            alert("Não há participantes/dias suficientes para gerar o controle de mão de obra.");
            return;
        }

        const {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const margem = '<td class="margem"></td><td class="margem"></td>';
        const colspanConteudoExcel = diasMes.length + 3;
        const colspanTotalExcel = diasMes.length + 5;
        const colunasDiasExcel = diasMes.map(() => '<col style="width:22px" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "valor" : "zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = linha.total / quantidadeDiasLancados;

                return [
                    '<tr>',
                    margem,
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<tr class="grupo-empresa">',
                margem,
                '<td colspan="' + colspanConteudoExcel + '">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</td>',
                '</tr>',
                '<tr class="cabecalho">',
                '<td class="margem"></td><td class="margem"></td>',
                '<th>Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                linhasGrupo,
            ].join("");
        }).join("");

        const linhaTotalDia = diasMes.map((dia) => '<td class="total-dia">' + (totaisDia[dia] || 0) + '</td>').join("");
        const nomeArquivo = "mao-de-obra-" + String(codigo).replace(/[^a-z0-9_-]+/gi, "-") + ".xls";

        const html = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<style>',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #0f172a; }',
            'table { border-collapse: collapse; width: auto; table-layout: fixed; }',
            'th, td { border: 1px solid #b7c7d8; padding: 3px 4px; text-align: center; font-size: 10px; }',
            '.margem { width: 18px; min-width: 18px; background: #ffffff; border: 0 !important; }',
            '.linha-vazia td { height: 10px; border: 0 !important; background: #ffffff; }',
            '.titulo { background: #ffffff; color: #111827; font-size: 15px; font-weight: 900; text-align: center; border: 1px solid #94a3b8; }',
            '.subtitulo { background: #ffffff; color: #111827; font-weight: 800; text-align: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; }',
            '.jornada { background: #f8fafc; color: #334155; font-weight: 900; text-align: center; border: 1px solid #cbd5e1; }',
            '.resumo-linha { background: #f8fafc; color: #0f172a; font-weight: 900; text-align: center; border: 1px solid #cbd5e1; }',
            '.legenda { background: #ffffff; color: #64748b; font-weight: 700; text-align: center; border: 1px solid #e5e7eb; font-size: 9px; }',
            '.legenda strong { color: #334155; font-weight: 900; }',
            '.legenda-verde { color: #047857; font-weight: 800; }',
            '.legenda-domingo { color: #dc2626; font-weight: 800; }',
            '.legenda-sabado { color: #b7791f; font-weight: 800; }',
            '.legenda-feriado { color: #2563eb; font-weight: 800; }',
            '.grupo-empresa td:not(.margem) { background: #f1f5f9; color: #0f172a; font-weight: 900; text-align: center; border-top: 2px solid #94a3b8; border-bottom: 1px solid #cbd5e1; letter-spacing: .02em; }',
            '.cabecalho th { background: #334155; color: #ffffff; font-weight: 900; text-transform: uppercase; }',
            '.dia { background: #334155; color: #ffffff; width: 22px; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao { background: #ffffff; color: #0f172a; font-weight: 900; text-align: center; width: 120px; }',
            '.valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.zero { background: #ffffff; color: #94a3b8; }',
            '.linha-total td:not(.margem) { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '.total { background: #ffffff; color: #047857; font-weight: 900; }',
            '.media { background: #ffffff; color: #0f172a; font-weight: 900; }',
            '</style>',
            '</head>',
            '<body>',
            '<table>',
            '<colgroup>',
            '<col style="width:18px" />',
            '<col style="width:18px" />',
            '<col style="width:120px" />',
            colunasDiasExcel,
            '<col style="width:64px" />',
            '<col style="width:64px" />',
            '</colgroup>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            '<tr>',
            margem,
            '<td class="titulo" colspan="' + colspanConteudoExcel + '">CONTROLE MENSAL DE MÃO DE OBRA (SAFESCAN BRASIL) - OBRA / SETOR: ', escaparHtmlControleMaoDeObraDds(obraTitulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Código DDS: ', escaparHtmlControleMaoDeObraDds(codigo), ' | Empresa principal: ', escaparHtmlControleMaoDeObraDds(empresaPrincipal), ' | Obra/Setor: ', escaparHtmlControleMaoDeObraDds(obra), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Período DDS: ', periodoInicioFormatado, ' a ', periodoFimFormatado, ' | Mês base: ', escaparHtmlControleMaoDeObraDds(mesBase), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="jornada" colspan="' + colspanConteudoExcel + '">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="resumo-linha" colspan="' + colspanConteudoExcel + '">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="legenda" colspan="' + colspanConteudoExcel + '"><strong>Legenda:</strong> <span style="color:#16a34a;font-size:13px;font-weight:900;">&#9632;</span> Presença registrada &nbsp; <span style="color:#facc15;font-size:13px;font-weight:900;">&#9632;</span> Sábado &nbsp; <span style="color:#ef4444;font-size:13px;font-weight:900;">&#9632;</span> Domingo &nbsp; <span style="color:#60a5fa;font-size:13px;font-weight:900;">&#9632;</span> Feriado</td>',
            '</tr>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            linhasTabela || '<tr><td colspan="' + colspanTotalExcel + '">Sem dados de mão de obra para exportar.</td></tr>',
            '<tr class="linha-total">',
            margem,
            '<td>Total diário</td>',
            linhaTotalDia,
            '<td>', totalHomemDia, '</td>',
            '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
            '</tr>',
            '</table>',
            '</body>',
            '</html>',
        ].join("");

        baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html);
    }

    function imprimirControleMaoDeObraDds() {
        const dadosControle = montarDadosControleMaoDeObraDds();

        if (!dadosControle) {
            alert("Não há participantes/dias suficientes para imprimir o controle de mão de obra.");
            return;
        }

        const {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtmlControleMaoDeObraDds(heroUrl) + '" alt="" />' : "";
        const colunasDiasPdf = diasMes.map(() => '<col class="dia-col" />').join("");
        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "dia-valor" : "dia-zero") + '">' + valor + '</td>';
                }).join("");

                return [
                    '<tr>',
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<section class="empresa-bloco">',
                '<div class="empresa-faixa">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</div>',
                '<table>',
                '<colgroup>',
                '<col class="funcao-col" />',
                colunasDiasPdf,
                '<col class="total-col" />',
                '</colgroup>',
                '<thead>',
                '<tr>',
                '<th class="funcao">Função</th>',
                thDias,
                '<th>Total</th>',
                '</tr>',
                '</thead>',
                '<tbody>',
                linhasGrupo,
                '<tr class="linha-total">',
                '<td>Total diário</td>',
                diasMes.map((dia) => '<td>' + (totaisDia[dia] || 0) + '</td>').join(""),
                '<td>', totalHomemDia, '</td>',
                '</tr>',
                '</tbody>',
                '</table>',
                '</section>',
            ].join("");
        }).join("");

        const janela = window.open("", "_blank", "width=1280,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            '<!doctype html>',
            '<html lang="pt-BR">',
            '<head>',
            '<meta charset="utf-8" />',
            '<title>Controle de mão de obra - ', escaparHtmlControleMaoDeObraDds(codigo), '</title>',
            '<style>',
            '@page { size: A4 landscape; margin: 8mm; }',
            '* { box-sizing: border-box; }',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
            '.page { min-height: 190mm; border: 1px solid #dbe3ef; overflow: hidden; }',
            '.hero { position: relative; overflow: hidden; min-height: 62px; padding: 11px 15px; color: #fff; background: #0f172a; }',
            '.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .36; }',
            '.hero:after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,.97), rgba(15,23,42,.84), rgba(15,23,42,.52)); }',
            '.hero-content { position: relative; z-index: 1; }',
            '.brand { margin: 0 0 3px; font-size: 8px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #86efac; }',
            'h1 { margin: 0; font-size: 19px; line-height: 1.05; }',
            '.subtitle { margin: 3px 0 0; font-size: 9.5px; font-weight: 700; color: #e2e8f0; }',
            '.content { padding: 9px 11px; }',
            '.identity-cards { display: grid; grid-template-columns: 1.05fr 1.2fr 1fr 1.2fr 1fr; gap: 4px; margin-bottom: 4px; }',
            '.metric-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 6px; }',
            '.card { min-height: 34px; border: 1px solid #dbe3ef; border-radius: 7px; padding: 4px 5px; background: #f8fafc; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }',
            '.card span { display: block; font-size: 6.9px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }',
            '.card strong { display: block; margin-top: 1px; font-size: 10.2px; line-height: 1.1; font-weight: 900; max-width: 100%; overflow-wrap: anywhere; }',
            '.jornada { margin-bottom: 4px; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 7px; padding: 5px 7px; background: #fff7ed; color: #7c2d12; font-size: 9px; font-weight: 900; text-align: center; }',
            '.resumo-pdf { margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 7px; padding: 5px 7px; background: #f8fafc; color: #0f172a; font-size: 8.8px; font-weight: 900; text-align: center; }',
            '.legenda-pdf { margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; border: 1px solid #e5e7eb; border-radius: 7px; padding: 4px 6px; background: #ffffff; color: #334155; font-size: 8px; font-weight: 800; text-align: center; }',
            '.legenda-item { display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }',
            '.cor-legenda { display: inline-block; width: 9px; height: 9px; border-radius: 2px; border: 1px solid rgba(15,23,42,.25); }',
            '.cor-presenca { background: #16a34a; }',
            '.cor-sabado { background: #facc15; }',
            '.cor-domingo { background: #ef4444; }',
            '.cor-feriado { background: #60a5fa; }',
            '.empresa-bloco { margin-top: 6px; }',
            '.empresa-faixa { background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; font-size: 8.1px; font-weight: 900; text-align: center; padding: 4px 6px; text-transform: uppercase; letter-spacing: .03em; }',
            'table { width: 100%; border-collapse: collapse; table-layout: fixed; }',
            'th, td { border: 1px solid #cbd5e1; padding: 2px 2px; text-align: center; font-size: 6.4px; line-height: 1.05; }',
            'th { background: #334155; color: #ffffff; font-weight: 900; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao-col { width: 74px; }',
            '.dia-col { width: 15.5px; }',
            '.total-col { width: 28px; }',
            '.funcao { text-align: center; font-weight: 900; background: #ffffff; color: #0f172a; overflow-wrap: anywhere; }',
            '.dia-valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.dia-zero { background: #ffffff; color: #94a3b8; }',
            '.total { font-weight: 900; background: #ffffff; color: #047857; }',
            '.linha-total td { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 1.5px solid #94a3b8; }',
            '@media print { .page { border: 0; } .hero { background: #0f172a !important; } .hero-img { display: block !important; } }',
            '</style>',
            '</head>',
            '<body>',
            '<article class="page">',
            '<header class="hero">',
            heroImgHtml,
            '<div class="hero-content">',
            '<p class="brand">SafeScan Brasil | Implantação / Obra</p>',
            '<h1>Controle mensal de mão de obra</h1>',
            '<p class="subtitle">Obra / setor: ', escaparHtmlControleMaoDeObraDds(obraTitulo), ' — consolidado por empresa/contratada e função.</p>',
            '</div>',
            '</header>',
            '<main class="content">',
            '<section class="identity-cards">',
            '<div class="card"><span>Código DDS</span><strong>', escaparHtmlControleMaoDeObraDds(codigo), '</strong></div>',
            '<div class="card"><span>Empresa principal</span><strong>', escaparHtmlControleMaoDeObraDds(empresaPrincipal || "-"), '</strong></div>',
            '<div class="card"><span>Obra / setor</span><strong>', escaparHtmlControleMaoDeObraDds(obra || "-"), '</strong></div>',
            '<div class="card"><span>Período</span><strong>', periodoInicioFormatado, ' a ', periodoFimFormatado, '</strong></div>',
            '<div class="card"><span>Mês base</span><strong>', escaparHtmlControleMaoDeObraDds(mesBase), '</strong></div>',
            '</section>',
            '<section class="metric-cards">',
            '<div class="card"><span>Empresas</span><strong>', empresas.length, '</strong></div>',
            '<div class="card"><span>Funções</span><strong>', linhas.length, '</strong></div>',
            '<div class="card"><span>Dias apurados</span><strong>', quantidadeDiasLancados, '</strong></div>',
            '<div class="card"><span>Acumulado do período</span><strong>', totalHomemDia, '</strong></div>',
            '<div class="card"><span>Efetivo médio</span><strong>', formatarNumeroMaoDeObraDds(mediaMes), '</strong></div>',
            '</section>',
            '<section class="jornada">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</section>',
            '<section class="resumo-pdf">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</section>',
            '<section class="legenda-pdf">',
            '<strong>Legenda:</strong>',
            '<span class="legenda-item"><i class="cor-legenda cor-presenca"></i>Presença registrada</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-sabado"></i>Sábado</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-domingo"></i>Domingo</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-feriado"></i>Feriado</span>',
            '</section>',
            linhasTabela,
            '</main>',
            '</article>',
            '<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},700);};</script>',
            '</body>',
            '</html>',
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    async function registrarEmissaoReciboFinalDds() {
        const recibo = reciboConferenciaFinalDds;

        if (!recibo) return "";

        const emitidoEm = new Date().toISOString();
        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || recibo.codigo || "";

        const reciboFinal = {
            versao: 1,
            origem: "recibo_final_dds",
            emitidoEm,
            codigo,
            status: recibo.status || "Conferência concluída oficialmente",
            concluidoEm: recibo.concluidoEm || "",
            periodoInicio: recibo.periodoInicio || "",
            periodoFim: recibo.periodoFim || "",
            resumo: {
                participantes: Number(recibo.participantes || 0),
                participantesCadastrados: Number(recibo.participantesCadastrados || 0),
                participantesAdicionais: Number(recibo.participantesAdicionais || 0),
                presencas: Number(recibo.presencas || 0),
                presencasCadastrados: Number(recibo.presencasCadastrados || 0),
                presencasAdicionais: Number(recibo.presencasAdicionais || 0),
                ausencias: Number(recibo.ausencias || 0),
                ausenciasCadastrados: Number(recibo.ausenciasCadastrados || 0),
                ausenciasAdicionais: Number(recibo.ausenciasAdicionais || 0),
                manuais: Number(recibo.manuais || 0),
                manuaisCadastrados: Number(recibo.manuaisCadastrados || 0),
                manuaisAdicionais: Number(recibo.manuaisAdicionais || 0),
                homemDia: Number(recibo.homemDia || 0),
                homemDiaCadastrados: Number(recibo.homemDiaCadastrados || 0),
                homemDiaAdicionais: Number(recibo.homemDiaAdicionais || 0),
                diasAtivos: Number(recibo.diasAtivos || 0),
                funcionariosSemanaCompleta: Number(recibo.funcionariosSemanaCompleta || 0),
                semanaCompletaCadastrados: Number(recibo.semanaCompletaCadastrados || 0),
                semanaCompletaAdicionais: Number(recibo.semanaCompletaAdicionais || 0),
            },
        };

        setReciboFinalEmitidoEmDds(emitidoEm);
        setErroReciboFinalDds("");

        if (!supabase || !registroScannerDds || !codigo) {
            return emitidoEm;
        }

        setSalvandoReciboFinalDds(true);

        try {
            const dadosAtuais = registroScannerDds?.dados || {};
            const conferenciaAtual = dadosAtuais.conferenciaAssistida || {};

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida: {
                            ...conferenciaAtual,
                            reciboFinal,
                        },
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setReciboFinalEmitidoEmDds(registroAtualizado?.dados?.conferenciaAssistida?.reciboFinal?.emitidoEm || emitidoEm);

            return emitidoEm;
        } catch (error) {
            setErroReciboFinalDds(error?.message || "Não foi possível registrar a emissão do recibo. A impressão foi liberada mesmo assim.");
            return emitidoEm;
        } finally {
            setSalvandoReciboFinalDds(false);
        }
    }


    function abrirConsultaPublicaReciboDds() {
        const url = reciboConferenciaFinalDds?.urlConferencia || registroScannerDds?.urlConferencia || "";

        if (!url) return;

        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function copiarCodigoReciboDds() {
        const codigo = reciboConferenciaFinalDds?.codigo || registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(codigo);
            } else {
                const area = document.createElement("textarea");
                area.value = codigo;
                area.setAttribute("readonly", "readonly");
                area.style.position = "fixed";
                area.style.opacity = "0";
                document.body.appendChild(area);
                area.select();
                document.execCommand("copy");
                document.body.removeChild(area);
            }

            setCodigoReciboCopiadoDds(true);
            window.setTimeout(() => setCodigoReciboCopiadoDds(false), 1800);
        } catch (error) {
            setErroReciboFinalDds(error?.message || "Não foi possível copiar o código DDS.");
        }
    }

    async function imprimirReciboConferenciaDds() {
        if (!reciboConferenciaFinalDds || !reciboConferenciaFinalRef.current) return;

        await registrarEmissaoReciboFinalDds();

        const escaparHtml = (valor = "") => String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const formatarData = (valor = "") => {
            if (!valor) return "-";
            const data = new Date(valor);
            if (Number.isNaN(data.getTime())) return escaparHtml(valor);
            return data.toLocaleString("pt-BR");
        };

        const recibo = reciboConferenciaFinalDds;
        const codigo = escaparHtml(recibo.codigo || "-");
        const empresa = escaparHtml(recibo.empresa || "-");
        const obra = escaparHtml(recibo.obra || "-");
        const periodo = escaparHtml(recibo.periodoInicio || "-") + " a " + escaparHtml(recibo.periodoFim || "-");
        const concluidoEm = formatarData(recibo.concluidoEm);
        const status = escaparHtml(recibo.status || "Conferência concluída oficialmente");
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtml(heroUrl) + '" alt="" />' : "";

        const qrElemento = reciboConferenciaFinalRef.current.querySelector("svg, canvas, img");
        let qrHtml = "";

        if (qrElemento?.tagName?.toLowerCase() === "canvas") {
            try {
                qrHtml = '<img src="' + qrElemento.toDataURL("image/png") + '" alt="QR Code de conferência" />';
            } catch {
                qrHtml = "";
            }
        } else if (qrElemento) {
            qrHtml = qrElemento.outerHTML;
        }

        const cardInfo = (rotulo, valor) =>
            '<div class="info-card">' +
                '<span class="label">' + escaparHtml(rotulo) + '</span>' +
                '<strong>' + valor + '</strong>' +
            '</div>';

        const cardMetrica = (rotulo, valor, tom) =>
            '<div class="metric metric-' + tom + '">' +
                '<span>' + escaparHtml(rotulo) + '</span>' +
                '<strong>' + escaparHtml(valor) + '</strong>' +
            '</div>';

        const cardsMetricas = [
            cardMetrica("Participantes", recibo.participantes, "green"),
            cardMetrica("Presenças", recibo.presencas, "green"),
            cardMetrica("Ausências", recibo.ausencias, "red"),
            cardMetrica("Acumulado do período", recibo.homemDia, "orange"),
            cardMetrica("Dias ativos", recibo.diasAtivos, "slate"),
            cardMetrica("Semana completa", recibo.funcionariosSemanaCompleta, "slate"),
            cardMetrica("Manual/vazio", recibo.manuais, "slate"),
            cardMetrica("Status oficial", "OK", "blue"),
        ].join("");

        const cardCategoriaRecibo = (
            rotulo,
            participantes,
            presencas,
            ausencias,
            homemDia,
            tom
        ) =>
            '<div class="category-card category-' + tom + '">' +
                '<div class="category-head">' +
                    '<span>' + escaparHtml(rotulo) + '</span>' +
                    '<strong>' + escaparHtml(participantes) + '</strong>' +
                '</div>' +
                '<div class="category-metrics">' +
                    '<div><span>Presenças</span><strong>' + escaparHtml(presencas) + '</strong></div>' +
                    '<div><span>Ausências</span><strong>' + escaparHtml(ausencias) + '</strong></div>' +
                    '<div><span>Homem-dia</span><strong>' + escaparHtml(homemDia) + '</strong></div>' +
                '</div>' +
            '</div>';

        const cardsCategoriasRecibo = [
            cardCategoriaRecibo(
                "Colaboradores cadastrados",
                recibo.participantesCadastrados,
                recibo.presencasCadastrados,
                recibo.ausenciasCadastrados,
                recibo.homemDiaCadastrados,
                "slate"
            ),
            cardCategoriaRecibo(
                "Adicionais / visitantes",
                recibo.participantesAdicionais,
                recibo.presencasAdicionais,
                recibo.ausenciasAdicionais,
                recibo.homemDiaAdicionais,
                "cyan"
            ),
        ].join("");

        const janela = window.open("", "_blank", "width=1100,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            "<!doctype html>",
            "<html lang=\"pt-BR\">",
            "<head>",
            "<meta charset=\"utf-8\">",
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
            "<title>Recibo DDS - ", codigo, "</title>",
            "<style>",
            "@page{size:A4 portrait;margin:10mm;}",
            "*{box-sizing:border-box;}",
            "html,body{margin:0;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;}",
            "body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
            ".page{min-height:277mm;border:1px solid #dbe3ef;background:#fff;display:flex;flex-direction:column;overflow:hidden;}",
            ".header{position:relative;overflow:hidden;padding:14px 22px 15px;color:#fff;background:#0f172a;}",
            ".hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;}",
            ".header:after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.96),rgba(15,23,42,.84),rgba(15,23,42,.46));}",
            ".header-content{position:relative;z-index:1;}",
            ".header-top{display:block;}",
            ".brand{margin:0 0 6px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:#86efac;}",
            "h1{margin:0;font-size:24px;line-height:1.04;font-weight:900;letter-spacing:-.035em;}",
            ".subtitle{margin:6px 0 0;max-width:none;font-size:10.5px;line-height:1.25;color:#e2e8f0;font-weight:700;white-space:nowrap;}",
            ".status-strip{margin:0 0 14px;border:1px solid #dbe3ef;border-left:5px solid #10b981;background:#f8fafc;border-radius:13px;padding:10px 12px;color:#0f172a;}",
            ".status-title{display:block;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#047857;margin-bottom:3px;}",
            ".status-text{margin:0;font-size:11px;font-weight:700;line-height:1.35;color:#475569;}",
            ".content{flex:1;display:flex;flex-direction:column;padding:20px 24px 18px;}",
            ".section-title{margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#475569;}",
            ".info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px;}",
            ".info-card{border:1px solid #e2e8f0;border-radius:13px;padding:11px 12px;background:#f8fafc;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}",
            ".label{display:block;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.11em;color:#64748b;margin-bottom:5px;}",
            ".info-card strong{font-size:14px;font-weight:900;color:#0f172a;line-height:1.2;}",
            ".main-grid{display:grid;grid-template-columns:1fr 148px;gap:12px;align-items:stretch;}",
            ".metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;}",
            ".metric{border:1px solid #e2e8f0;border-radius:13px;padding:10px 10px;background:#fff;min-height:61px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;}",
            ".metric span{font-size:8.3px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:5px;}",
            ".metric strong{font-size:22px;line-height:1;font-weight:900;color:#0f172a;}",
            ".metric-green{border-color:#bbf7d0;background:#f0fdf4;}",
            ".metric-green span,.metric-green strong{color:#047857;}",
            ".metric-red{border-color:#fecaca;background:#fef2f2;}",
            ".metric-red span,.metric-red strong{color:#b91c1c;}",
            ".metric-orange{border-color:#fed7aa;background:#fff7ed;}",
            ".metric-orange span,.metric-orange strong{color:#c2410c;}",
            ".metric-blue{border-color:#bae6fd;background:#f0f9ff;}",
            ".metric-blue span,.metric-blue strong{color:#0369a1;}",
            ".category-section{margin-top:12px;}",
            ".category-title{margin:0 0 7px;text-align:center;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.13em;color:#64748b;}",
            ".category-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}",
            ".category-card{border:1px solid #e2e8f0;border-radius:13px;padding:8px;background:#f8fafc;break-inside:avoid;page-break-inside:avoid;}",
            ".category-card.category-cyan{border-color:#a5f3fc;background:#ecfeff;}",
            ".category-head{text-align:center;}",
            ".category-head span{display:block;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569;}",
            ".category-head strong{display:block;margin-top:2px;font-size:18px;line-height:1;font-weight:900;color:#0f172a;}",
            ".category-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px;}",
            ".category-metrics div{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:5px 4px;text-align:center;}",
            ".category-metrics span{display:block;font-size:6.8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#64748b;}",
            ".category-metrics strong{display:block;margin-top:2px;font-size:12px;line-height:1;font-weight:900;color:#0f172a;}",
            ".qr-panel{border:1px solid #dbe3ef;border-radius:15px;background:#f8fafc;padding:12px 10px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;}",
            ".qr-box{width:110px;height:110px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;padding:7px;margin:0 auto 9px;}",
            ".qr-box svg,.qr-box img,.qr-box canvas{width:94px!important;height:94px!important;display:block;}",
            ".qr-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:0 0 4px;}",
            ".qr-date{font-size:10.5px;font-weight:900;line-height:1.25;color:#0f172a;margin:0;}",
            ".auth{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
            ".auth-card{border:1px solid #bfdbfe;border-left:5px solid #0284c7;border-radius:13px;background:#f8fafc;padding:13px 14px;}",
            ".auth-card p{margin:0;font-size:11.5px;font-weight:700;line-height:1.65;color:#334155;}",
            ".auth-card strong{color:#0f172a;}",
            ".signatures{margin-top:auto;padding-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:22px;}",
            ".signature{border-top:1px solid #94a3b8;padding-top:8px;text-align:center;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569;}",
            ".footer{margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;font-size:9.5px;font-weight:700;color:#64748b;}",
            "@media print{body{background:#fff!important;}.page{border:0;min-height:277mm;}.header{color:#fff!important;background:#0f172a!important;}.hero-img{display:block!important;}.status-strip{background:#f8fafc!important;color:#0f172a!important;}.info-card,.metric,.qr-panel,.auth-card{break-inside:avoid;page-break-inside:avoid;}}",
            "</style>",
            "</head>",
            "<body>",
            "<article class=\"page\">",
            "<header class=\"header\">",
            heroImgHtml,
            "<div class=\"header-content\">",
            "<div class=\"header-top\">",
            "<p class=\"brand\">SafeScan Brasil | DDS</p>",
            "<h1>Recibo da Conferência DDS</h1>",
            "<p class=\"subtitle\">Comprovante técnico da apuração oficial da Conferência Assistida do Diálogo Diário de Segurança.</p>",
            "</div>",

            "</div>",
            "</header>",
            "<main class=\"content\">",
            "<section class=\"status-strip\">",
            "<span class=\"status-title\">Registro final do DDS</span>",
            "<p class=\"status-text\">Apuração salva no sistema e vinculada ao QR/código do documento.</p>",
            "</section>",
            "<p class=\"section-title\">Dados do registro</p>",
            "<section class=\"info-grid\">",
            cardInfo("Código DDS", codigo),
            cardInfo("Empresa", empresa),
            cardInfo("Obra / setor", obra),
            cardInfo("Período", periodo),
            "</section>",
            "<p class=\"section-title\">Resumo oficial da apuração</p>",
            "<section class=\"main-grid\">",
            "<div class=\"metrics\">", cardsMetricas, "</div>",
            "<aside class=\"qr-panel\">",
            "<div class=\"qr-box\">", (qrHtml || "<span class=\"label\">Sem QR</span>"), "</div>",
            "<p class=\"qr-title\">Conclusão oficial</p>",
            "<p class=\"qr-date\">", concluidoEm, "</p>",
            "</aside>",
            "</section>",
            "<section class=\"category-section\">",
            "<p class=\"category-title\">Composição dos participantes</p>",
            "<div class=\"category-grid\">",
            cardsCategoriasRecibo,
            "</div>",
            "</section>",
            "<section class=\"auth\">",
            "<div class=\"auth-card\"><p><strong>Autenticidade:</strong> o QR/código vincula este comprovante ao registro digital do DDS para conferência e auditoria.</p></div>",
            "<div class=\"auth-card\"><p><strong>Critério:</strong> a estatística oficial foi calculada pela Conferência Assistida confirmada e concluída no sistema.</p></div>",
            "</section>",
            "<section class=\"signatures\">",
            "<div class=\"signature\">Responsável pela conferência</div>",
            "<div class=\"signature\">Representante da obra / empresa</div>",
            "</section>",
            "<footer class=\"footer\">",
            "<span>Gerado pelo SafeScan Brasil</span>",
            "<span>Código: ", codigo, "</span>",
            "</footer>",
            "</main>",
            "</article>",
            "<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},700);};<" + "/script>",
            "</body>",
            "</html>"
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    async function imprimirDdsComQrConferencia() {
        if (salvandoRegistroDds) return;

        if (!supabase) {
            window.print();
            return;
        }

        setSalvandoRegistroDds(true);
        setErroRegistroDds("");

        try {
            const registro = await salvarRegistroDds({
                supabase,
                registro: {
                    codigo: dadosDds.codigo,
                    empresaId: obterUuidSeguroDds(obterIdEmpresaObjetoDds(empresaSelecionadaDds)),
                    obraId: obterUuidSeguroDds(obraSelecionadaIdDds),
                    empresaNome: dadosDds.empresa,
                    obraNome: dadosDds.obraSetor,
                    periodoInicio: inicioSemanaDds,
                    periodoFim: fimSemanaDds,
                    responsavelNome: dadosDds.responsavel,
                    fiscalIdealiza: dadosDds.fiscalIdealiza,
                    liderEncarregado: dadosDds.encarregado,
                    dados: {
                        periodo: dadosDds.periodo,
                        resumoSemana: dadosDds.resumoSemana,
                        turno: dadosDds.turno,
                        funcaoResponsavel: dadosDds.funcaoResponsavel,
                        totalParticipantes: participantesSistemaDds.length,
                        totalFolhas: folhasContinuacaoDds.length + 1,
                        recadosSemana: recadosDdsEditaveis,
                        orientacoesImportantes: orientacoesDdsEditaveis,
                        aniversariantesSemana: aniversariantesSemanaDds,
                        logosEmpresasCabecalho: dadosDdsComRegistro.logosEmpresasCabecalho || [],
                        empresaLogoUrl: dadosDdsComRegistro.empresaLogoUrl || "" ,
                        empresaLogoNome: dadosDdsComRegistro.empresaLogoNome || "" ,
                        contratanteLogoUrl: dadosDdsComRegistro.contratanteLogoUrl || "" ,
                        contratanteLogoNome: dadosDdsComRegistro.contratanteLogoNome || "" ,
                        participantes: participantesSistemaDds.map((participante, indice) => ({
                            numero: participante.numero || indice + 1,
                            codigoSafescan:
                                participante.codigoFuncionario ||
                                participante.codigo_funcionario ||
                                participante.codigoSafescan ||
                                participante.codigoSafeScan ||
                                participante.codigo_safescan ||
                                participante.codigo ||
                                participante.codigo_colaborador ||
                                participante.codigoColaborador ||
                                participante.codigo_qr ||
                                participante.qr_codigo ||
                                participante.codigoQr ||
                                participante.matricula_esocial ||
                                participante.matriculaEsocial ||
                                participante.matricula ||
                                "",
                            nome: participante.nome,
                            funcao: participante.funcao,
                            empresa: participante.empresa,
                        })),
                        diasSemana: diasSemanaComTemasDds.map((dia) => ({
                            dia: dia.dia,
                            data: dia.data,
                            tema: dia.tema,
                            responsavel: dia.responsavel,
                        })),
                    },
                    status: "Ativo",
                },
            });

            setRegistroDdsConferencia(registro);
            window.setTimeout(() => window.print(), 150);
        } catch (error) {
            const mensagem = error?.message || "Não foi possível gerar o QR de conferência do DDS.";
            setErroRegistroDds(mensagem);
            window.alert(mensagem);
        } finally {
            setSalvandoRegistroDds(false);
        }
    }


    function obterPeriodoHistoricoMensalMaoDeObraDds() {
        const mesBase = String(mesHistoricoMaoDeObraDds || "").trim();
        const partes = mesBase.split("-");

        if (partes.length !== 2) {
            return null;
        }

        const ano = Number(partes[0]);
        const mes = Number(partes[1]);

        if (!ano || !mes || mes < 1 || mes > 12) {
            return null;
        }

        const ultimoDia = new Date(ano, mes, 0).getDate();

        return {
            inicio: String(ano).padStart(4, "0") + "-" + String(mes).padStart(2, "0") + "-01",
            fim: String(ano).padStart(4, "0") + "-" + String(mes).padStart(2, "0") + "-" + String(ultimoDia).padStart(2, "0"),
        };
    }



    function normalizarBuscaObraHistoricoMensalDds(valor = "") {
        const textoNormalizado = String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const placeholdersInvalidos = new Set([
            "obra setor nao definido",
            "obra nao informada",
            "setor nao definido",
            "selecione uma obra cadastrada no dds",
            "nao informado",
            "nao informada",
            "nao definido",
            "nao definida"
        ]);

        return placeholdersInvalidos.has(textoNormalizado) ? "" : textoNormalizado;
    }


    function registroAtualPertenceAoMesHistoricoDds(registro, periodo) {
        if (!registro || !periodo?.inicio || !periodo?.fim) return false;

        const inicio = parseDataControleMaoDeObraDds(periodo.inicio);
        const fim = parseDataControleMaoDeObraDds(periodo.fim);

        if (!inicio || !fim) return false;

        const codigo = String(registro?.codigo || registro?.dados?.codigo || "").trim();
        const codigoMes = codigo.match(/DDS-(\d{4})-(\d{2})/i);

        if (codigoMes) {
            const anoCodigo = Number(codigoMes[1]);
            const mesCodigo = Number(codigoMes[2]) - 1;

            if (anoCodigo === inicio.getFullYear() && mesCodigo === inicio.getMonth()) {
                return true;
            }
        }

        const datas = [
            registro?.periodoInicio,
            registro?.periodoFim,
            registro?.dataInicio,
            registro?.dataFim,
            registro?.data,
            registro?.criadoEm,
            registro?.createdAt,
            registro?.created_at,
            registro?.updatedAt,
            registro?.updated_at,
            registro?.dados?.periodoInicio,
            registro?.dados?.periodoFim,
            registro?.dados?.dataInicio,
            registro?.dados?.dataFim,
            registro?.dados?.data,
            registro?.dados?.salvoEm,
            registro?.dados?.conferenciaAssistida?.salvoEm,
            registro?.dados?.conferenciaAssistida?.fechamento?.concluidoEm,
            registro?.dados?.conferenciaAssistida?.fechamento?.data,
        ];

        return datas.some((valor) => {
            const data = parseDataControleMaoDeObraDds(valor);
            return data && data >= inicio && data <= fim;
        });
    }


    async function buscarHistoricoMensalMaoDeObraDds() {
        if (carregandoHistoricoMensalMaoDeObraDds) return;

        if (!supabase) {
            setErroHistoricoMensalMaoDeObraDds("Supabase não disponível para buscar o histórico mensal DDS.");
            return;
        }

        const empresaId = obterUuidSeguroDds(
            obterIdEmpresaObjetoDds(empresaSelecionadaDds) ||
            registroScannerDds?.empresaId ||
            registroScannerDds?.empresa_id ||
            registroScannerDds?.dados?.empresaId ||
            registroScannerDds?.dados?.empresa_id ||
            dadosDds.empresaId ||
            dadosDds.empresa_id ||
            ""
        );

        const obraId = obterUuidSeguroDds(
            obraSelecionadaIdDds ||
            registroScannerDds?.obraId ||
            registroScannerDds?.obra_id ||
            registroScannerDds?.dados?.obraId ||
            registroScannerDds?.dados?.obra_id ||
            dadosDds.obraId ||
            dadosDds.obra_id ||
            ""
        );

        const obraNomeBase = String(
            dadosDds.obraSetor ||
            dadosDds.obraNome ||
            dadosDds.obra ||
            registroScannerDds?.obraNome ||
            registroScannerDds?.dados?.obraNome ||
            registroScannerDds?.dados?.obra ||
            ""
        ).trim();

        const obraNomeComparacao = normalizarBuscaObraHistoricoMensalDds(obraNomeBase);
        const periodo = obterPeriodoHistoricoMensalMaoDeObraDds();

        if (!periodo) {
            setErroHistoricoMensalMaoDeObraDds("Informe um mês/ano válido para buscar o histórico mensal.");
            return;
        }

        // Obra indefinida não bloqueia o histórico mensal; nesse caso a busca usa empresa/período.

        setCarregandoHistoricoMensalMaoDeObraDds(true);
        setErroHistoricoMensalMaoDeObraDds("");

        try {
            const registrosBase = await listarRegistrosDds({
                supabase,
                empresaId,
                obraId,
                periodoInicio: periodo.inicio,
                periodoFim: periodo.fim,
                limite: 300,
            });

            let registros = obraId
                ? registrosBase
                : registrosBase.filter((registro) => {
                    const nomeRegistro = normalizarBuscaObraHistoricoMensalDds(
                        registro?.obraNome ||
                        registro?.dados?.obraNome ||
                        registro?.dados?.obra ||
                        ""
                    );

                    if (!nomeRegistro || !obraNomeComparacao) return false;

                    return (
                        nomeRegistro === obraNomeComparacao ||
                        nomeRegistro.includes(obraNomeComparacao) ||
                        obraNomeComparacao.includes(nomeRegistro)
                    );
                });

            // Fallback: incluir DDS carregado quando o histórico por consulta não retornar registros.
            if (!registros.length && registroAtualPertenceAoMesHistoricoDds(registroScannerDds, periodo)) {
                registros = [registroScannerDds];
            }

            setHistoricoMensalMaoDeObraDds(registros);
            setHistoricoMensalConsultadoEmDds(new Date().toISOString());

            if (!registros.length) {
                setErroHistoricoMensalMaoDeObraDds("Nenhum DDS localizado para o mês selecionado. Confirme se o DDS foi salvo/concluído nesse mês ou se a obra está vinculada corretamente.");
            }
        } catch (error) {
            setHistoricoMensalMaoDeObraDds([]);
            setErroHistoricoMensalMaoDeObraDds(error?.message || "Não foi possível buscar o histórico mensal DDS.");
        } finally {
            setCarregandoHistoricoMensalMaoDeObraDds(false);
        }
    }

    async function carregarRegistroHistoricoMensalDds(registroHistorico) {
        if (carregandoScannerDds) return;

        const codigo = String(registroHistorico?.codigo || "").trim();

        if (!codigo) {
            setErroScannerDds("DDS do histórico mensal sem código para carregar.");
            return;
        }

        if (!supabase) {
            setErroScannerDds("Supabase não disponível para carregar o DDS do histórico mensal.");
            return;
        }

        setCarregandoScannerDds(true);
        setErroScannerDds("");

        try {
            const registro = await carregarRegistroDdsPorCodigo({
                supabase,
                codigo,
            });

            if (!registro) {
                setRegistroScannerDds(null);
                setErroScannerDds("Nenhum registro de DDS foi localizado para este código.");
                return;
            }

            setRegistroScannerDds(registro);
            setCodigoConferenciaDds(registro.codigo || codigo);

            window.setTimeout(() => {
                document
                    .querySelector("[data-dds-registro-localizado]")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
        } catch (error) {
            setRegistroScannerDds(null);
            setErroScannerDds(error?.message || "Não foi possível carregar o DDS do histórico mensal.");
        } finally {
            setCarregandoScannerDds(false);
        }
    }

    async function buscarRegistroScannerDds(evento = null) {
        evento?.preventDefault?.();

        if (carregandoScannerDds) return;

        const codigoBusca = String(codigoConferenciaDds || dadosDds.codigo || "").trim();

        if (!codigoBusca) {
            setErroScannerDds("Informe o código do DDS impresso.");
            setRegistroScannerDds(null);
            return;
        }

        if (!supabase) {
            setErroScannerDds("Supabase não disponível para carregar o registro do DDS.");
            setRegistroScannerDds(null);
            return;
        }

        setCarregandoScannerDds(true);
        setErroScannerDds("");

        try {
            const registro = await carregarRegistroDdsPorCodigo({
                supabase,
                codigo: codigoBusca,
            });

            if (!registro) {
                setRegistroScannerDds(null);
                setErroScannerDds("Nenhum registro de DDS foi localizado para este código.");
                return;
            }

            setRegistroScannerDds(registro);
            setCodigoConferenciaDds(registro.codigo || codigoBusca);
        } catch (error) {
            setRegistroScannerDds(null);
            setErroScannerDds(error?.message || "Não foi possível carregar o registro do DDS.");
        } finally {
            setCarregandoScannerDds(false);
        }
    }

    function selecionarArquivoScannerDds(evento) {
        const arquivo = evento?.target?.files?.[0] || null;

        setErroArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);
        setErroLeituraArquivoScannerDds("");
        setCarregandoLeituraArquivoScannerDds(false);


        if (!arquivo) {
            setArquivoScannerDds(null);
            return;
        }

        const nomeArquivo = String(arquivo.name || "").toLowerCase();
        const tipoArquivo = String(arquivo.type || "").toLowerCase();
        const extensaoPermitida = /\.(pdf|png|jpg|jpeg|webp)$/i.test(nomeArquivo);
        const tipoPermitido = tipoArquivo === "application/pdf" || tipoArquivo.startsWith("image/");

        if (!extensaoPermitida || !tipoPermitido) {
            setArquivoScannerDds(null);
            setErroArquivoScannerDds("Anexe apenas PDF ou imagem nos formatos PNG, JPG, JPEG ou WEBP.");
            evento.target.value = "";
            return;
        }

        const limiteBytes = 25 * 1024 * 1024;

        if (arquivo.size > limiteBytes) {
            setArquivoScannerDds(null);
            setErroArquivoScannerDds("O arquivo deve ter no máximo 25 MB.");
            evento.target.value = "";
            return;
        }

        setArquivoScannerDds(arquivo);
    }

    function limparArquivoScannerDds() {
        setArquivoScannerDds(null);
        setErroArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);
        setErroLeituraArquivoScannerDds("");
        setCarregandoLeituraArquivoScannerDds(false);
    }

    async function executarLeituraArquivoScannerDds() {
        if (!arquivoScannerDds) {
            setErroLeituraArquivoScannerDds("Anexe a folha DDS assinada antes de executar a leitura inicial.");
            return;
        }

        if (carregandoLeituraArquivoScannerDds) return;

        setCarregandoLeituraArquivoScannerDds(true);
        setErroLeituraArquivoScannerDds("");
        setLeituraArquivoScannerDds(null);

        try {
            const leitura = await executarLeituraDdsLocal({
                arquivo: arquivoScannerDds,
                arquivoNome: arquivoScannerDds.name || "",
                mimeType: arquivoScannerDds.type || "",
                contextoDds: {
                    codigo: registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "",
                    empresaNome: registroScannerDds?.empresaNome || registroScannerDds?.dados?.empresaNome || "",
                    obraNome: registroScannerDds?.obraNome || registroScannerDds?.dados?.obraNome || "",
                    periodoInicio: registroScannerDds?.periodoInicio || registroScannerDds?.dados?.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || registroScannerDds?.dados?.periodoFim || "",
                    participantes: participantesRegistroScannerDds,
                },
            });

            setLeituraArquivoScannerDds(leitura || null);

            if (leitura?.erro) {
                setErroLeituraArquivoScannerDds(leitura.erro);
            }
        } catch (error) {
            setLeituraArquivoScannerDds(null);
            setErroLeituraArquivoScannerDds(error?.message || "Não foi possível executar a leitura inicial da folha DDS.");
        } finally {
            setCarregandoLeituraArquivoScannerDds(false);
        }
    }

    return (
        <div className="space-y-6">
            <DdsPrintStyles />
            <section className="dds-no-print relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_22px_60px_rgba(15,23,42,0.20)] sm:p-7 lg:p-8">
                <img
                    src={dashboardHeroSstDds}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full object-cover opacity-60"
                />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.90),rgba(15,23,42,0.72),rgba(15,23,42,0.42)),radial-gradient(circle_at_top_left,rgba(16,185,129,0.26),transparent_32%)]" />
                <div className="absolute inset-0 bg-slate-950/5" />

                <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="max-w-4xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-200 backdrop-blur">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.8)]" />
                            SafeScan Brasil
                        </div>

                        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-white drop-shadow-sm sm:text-4xl lg:text-[42px]">
                            DDS — Diálogo Diário de Segurança
                        </h1>

                        <p className="mt-3 max-w-5xl text-sm font-semibold leading-6 text-slate-100 sm:text-[15px] xl:whitespace-nowrap">
                            Gere o DDS semanal de obra com assinatura manual, QR de conferência, temas por dia e controle visual para fiscalização.
                        </p>
                    </div>
</div>
            </section>
            <section className="dds-no-print grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <DdsResumoCard
                    icone={CalendarClock}
                    titulo="Semana atual"
                    valor={dadosDds.resumoSemana || "14 a 20/06"}
                    texto={dadosDds.periodo || "Domingo como primeiro dia da semana."}
                    cor="emerald"
                />
                <DdsResumoCard
                    icone={BookOpen}
                    titulo="Temas"
                    valor="7 dias"
                    texto="Tema e responsável por dia."
                    cor="sky"
                />
                <DdsResumoCard
                    icone={Users}
                    titulo="Participantes"
                    valor={String(participantesSistemaDds.length)}
                    texto="Todos os colaboradores carregados do sistema."
                    cor="violet"
                />
                <DdsResumoCard
                    icone={Printer}
                    titulo="Impressão"
                    valor="Imprimir DDS"
                    texto=""
                    cor="amber"
                    destaque
                    onClick={imprimirDdsComQrConferencia}
                />
            </section>

            <section className="dds-no-print space-y-4">
                <div className="min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-blue-500 bg-white p-4 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("novo")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("novo"); }}
                        className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 rounded-xl transition hover:bg-slate-50"
                    >
                        <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Novo DDS semanal</h2>
                            <p className="text-sm font-semibold text-slate-500">Preencha os dados principais do DDS. A impressão será atualizada automaticamente.</p>
                        </div>
                    </div>
                        <button
                            type="button"
                            onClick={(evento) => { evento.stopPropagation(); alternarCardDds("novo"); }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("novo")} />
                        </button>
                    </div>

                    {cardDdsAberto("novo") && (
                    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                        <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa cadastrada</span>
                            <select
                                value={empresaSelecionadaChaveDds}
                                onChange={(evento) => atualizarEmpresaSelecionadaDds(evento.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            >
                                {empresasDds.length === 0 && (
                                    <option value="">Nenhuma empresa cadastrada</option>
                                )}
                                {empresasDds.map((empresa, indice) => {
                                    const chaveEmpresa = obterChaveEmpresaDds(empresa, indice);
                                    const nomeEmpresa = obterNomeEmpresaObjetoDds(empresa) || `Empresa ${indice + 1}`;

                                    return (
                                        <option key={chaveEmpresa} value={chaveEmpresa}>
                                            {nomeEmpresa}
                                        </option>
                                    );
                                })}
                            </select>
                        </label>

                        <label className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">Obra cadastrada</span>
                            <select
                                value={obraSelecionadaIdDds}
                                onChange={(evento) => aplicarObraCadastradaDds(evento.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            >
                                <option value="">
                                    {obrasEmpresaSelecionadaDds.length > 0 ? "Selecionar obra" : "Nenhuma obra cadastrada"}
                                </option>
                                {obrasEmpresaSelecionadaDds.map((obra, indice) => {
                                    const idObra = obterIdObraEmpresaDds(obra, indice);
                                    const nomeObra = obterNomeObraEmpresaDds(obra) || `Obra ${indice + 1}`;

                                    return (
                                        <option key={idObra} value={idObra}>
                                            {nomeObra}
                                        </option>
                                    );
                                })}
                            </select>
                            <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                Ao selecionar, o DDS preenche Obra / Setor, Fiscal Idealiza e Líder / Encarregado.
                            </span>
                        </label>

                        {camposDadosDds.map((campo) => (
                            <label key={campo.chave} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">{campo.rotulo}</span>
                                <input
                                    type="text"
                                    value={
                                        campo.chave === "obraSetor"
                                            ? valorObraSetorDds
                                            : campo.chave === "fiscalIdealiza"
                                                ? valorFiscalIdealizaDds
                                                : dadosDds[campo.chave] || ""
                                    }
                                    onChange={(evento) => atualizarCampoDadosDds(campo.chave, evento.target.value)}
                                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                                {campo.chave === "obraSetor" && (
                                    <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                        Salvo automaticamente para a empresa selecionada neste computador.
                                    </span>
                                )}
                                {campo.chave === "fiscalIdealiza" && (
                                    <span className="mt-2 block text-[11px] font-bold text-slate-500">
                                        Salvo automaticamente para a empresa selecionada neste computador.
                                    </span>
                                )}

                            </label>
                        ))}

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 md:col-span-2 xl:col-span-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Semana do DDS</p>
                                    <p className="mt-1 text-sm font-black text-slate-800">{dadosDds.periodo}</p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Código automático: <span className="font-black text-slate-800">{dadosDds.codigo}</span>
                                    </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds((valor) => valor - 1)}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
                                    >
                                        Semana anterior
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds(0)}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50"
                                    >
                                        Semana atual
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDeslocamentoSemanasDds((valor) => valor + 1)}
                                        className="rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-black text-emerald-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-emerald-50"
                                    >
                                        Próxima semana
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}
                </div>

                <div
                    className="min-h-[92px] cursor-pointer rounded-3xl border border-slate-200 border-t-4 border-t-emerald-500 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-200"
                    role="button"
                    tabIndex={0}
                    onClick={() => alternarCardDds("qrConferencia")}
                    onKeyDown={(evento) => {
                        if (evento.key === "Enter" || evento.key === " ") {
                            evento.preventDefault();
                            alternarCardDds("qrConferencia");
                        }
                    }}
                >
                    <div className="flex min-h-[52px] flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                                <QrCode className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-emerald-950">QR de conferência</h2>
                                <p className="text-sm font-semibold text-emerald-800">
                                    O QR valida o documento. A assinatura continua manual.
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();
                                alternarCardDds("qrConferencia");
                            }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("qrConferencia")} />
                        </button>
                    </div>

                    {cardDdsAberto("qrConferencia") && (
                        <div className="mt-4 rounded-xl bg-white p-4 text-sm font-bold leading-6 text-slate-600 ring-1 ring-emerald-100">
                            A folha semanal terá domingo a sábado, rubrica nos dias com atividade, X preto/escuro para ausência e coluna final Semana completa para marcar presença nos dias úteis/com atividade.
                        </div>
                    )}
                </div>
                <div className="self-start rounded-3xl border border-slate-200 border-t-4 border-t-cyan-500 bg-white p-4 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("conferencia")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("conferencia"); }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-xl transition hover:bg-white/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-cyan-700 ring-1 ring-cyan-100">
                                <ShieldCheck className="h-5 w-5" />
                            </span>
                            <div>
                                <h2 className="text-lg font-black text-cyan-950">Conferência DDS</h2>
                                <p className="text-sm font-semibold text-cyan-800">
                                    Busque o DDS salvo pelo código impresso antes de analisar a folha assinada.
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={(evento) => { evento.stopPropagation(); alternarCardDds("conferencia"); }}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("conferencia")} />
                        </button>
                    </div>

                    {cardDdsAberto("conferencia") && (
                        <div className="mt-3 grid grid-cols-1 gap-3">
                            <form
                                onSubmit={buscarRegistroScannerDds}
                                className="flex flex-nowrap items-end gap-2 overflow-x-auto pb-1 lg:max-w-[640px]"
                            >
                                <label className="block w-[200px] shrink-0">
                                    <span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                        Código do DDS
                                    </span>
                                    <input
                                        type="text"
                                        value={codigoConferenciaDds}
                                        onChange={(evento) => setCodigoConferenciaDds(evento.target.value)}
                                        placeholder={dadosDds.codigo || "Ex.: DDS-EMP-2026-06-14"}
                                        className="mt-2 w-full rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm font-black text-slate-800 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                    />
                                </label>

                                <div className="mt-3 flex flex-wrap gap-2">
                                    <button
                                        type="submit"
                                        disabled={carregandoScannerDds}
                                        className="h-9 whitespace-nowrap shrink-0 rounded-xl bg-cyan-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {carregandoScannerDds ? "Buscando..." : "Buscar registro"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodigoConferenciaDds(dadosDds.codigo || "")}
                                        className="h-9 whitespace-nowrap shrink-0 rounded-xl border border-cyan-200 bg-white px-3 py-2 text-[11px] font-black text-cyan-800 shadow-sm transition hover:bg-cyan-50"
                                    >
                                        Usar código atual
                                    </button>
                                </div>

                                {erroScannerDds && (
                                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                        {erroScannerDds}
                                    </p>
                                )}
                            </form>



                            <div className="rounded-xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50 lg:col-span-2">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                            Folha assinada
                                        </p>
                                        <h3 className="mt-1 text-base font-black text-slate-950">
                                            Upload da folha DDS assinada
                                        </h3>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">
                                            Anexe o PDF escaneado ou a foto da folha assinada. Depois execute a leitura inicial para gerar diagnóstico e resultado final.
                                        </p>
                                    </div>

                                    {arquivoScannerDds && (
                                        <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800">
                                            Folha anexada para conferência
                                        </span>
                                    )}
                                </div>

                                <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                                    <label className="block">
                                        <span className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                            Selecionar arquivo
                                        </span>
                                        <input
                                            type="file"
                                            accept=".pdf,image/png,image/jpeg,image/webp"
                                            onChange={selecionarArquivoScannerDds}
                                            className="mt-2 block w-full cursor-pointer rounded-xl border border-cyan-100 bg-cyan-50/60 px-3 py-2 text-sm font-bold text-slate-700 outline-none transition file:mr-3 file:rounded-lg file:border-0 file:bg-cyan-600 file:px-3 file:py-2 file:text-xs file:font-black file:text-white hover:bg-cyan-50 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
                                        />
                                    </label>

                                    <button
                                        type="button"
                                        onClick={limparArquivoScannerDds}
                                        disabled={!arquivoScannerDds && !erroArquivoScannerDds}
                                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Limpar arquivo
                                    </button>
                                </div>

                                {erroArquivoScannerDds && (
                                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                        {erroArquivoScannerDds}
                                    </p>
                                )}

                                {resumoArquivoScannerDds && (
                                    <>
                                        <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Arquivo</p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={resumoArquivoScannerDds.nome}>
                                                    {resumoArquivoScannerDds.nome}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tamanho</p>
                                                <p className="mt-1 text-sm font-black text-slate-900">{resumoArquivoScannerDds.tamanho}</p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Tipo</p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={resumoArquivoScannerDds.tipo}>
                                                    {resumoArquivoScannerDds.tipo}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-black text-slate-900">Leitura inicial do arquivo</p>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    Executa leitura local do PDF/imagem para identificar texto, páginas e linhas. Ainda não valida assinatura nem presença.
                                                        {carregandoLeituraArquivoScannerDds && (
                                                            <div className="mt-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 ring-1 ring-cyan-100">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ring-1 ring-cyan-100">
                                                                        <div className="absolute h-7 w-7 animate-ping rounded-full bg-cyan-200/60" />
                                                                        <div className="relative h-5 w-5 animate-spin rounded-full border-4 border-cyan-100 border-t-cyan-600" />
                                                                    </div>

                                                                    <div className="min-w-0 flex-1">
                                                                        <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                                                            Análise do documento em andamento
                                                                        </p>
                                                                        <p className="mt-0.5 text-[11px] font-bold leading-4 text-slate-600">
                                                                            Identificando texto, páginas, linhas, código DDS e dados para a pré-conferência.
                                                                        </p>
                                                                    </div>

                                                                    <div className="hidden min-w-[200px] overflow-hidden rounded-full bg-cyan-100 sm:block">
                                                                        <style>
                                                                            {`
                                                                                @keyframes ddsScannerProgress {
                                                                                    0% {
                                                                                        transform: translateX(-105%);
                                                                                        width: 35%;
                                                                                    }
                                                                                    45% {
                                                                                        width: 70%;
                                                                                    }
                                                                                    100% {
                                                                                        transform: translateX(285%);
                                                                                        width: 35%;
                                                                                    }
                                                                                }
                                                                            `}
                                                                        </style>
                                                                        <div className="relative h-2 overflow-hidden rounded-full bg-cyan-100">
                                                                            <div
                                                                                className="absolute left-0 top-0 h-full rounded-full bg-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.45)]"
                                                                                style={{ animation: "ddsScannerProgress 1.35s ease-in-out infinite" }}
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={executarLeituraArquivoScannerDds}
                                                disabled={!arquivoScannerDds || carregandoLeituraArquivoScannerDds}
                                                className="rounded-xl bg-cyan-600 px-3 py-2 text-[11px] font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {carregandoLeituraArquivoScannerDds ? "Lendo arquivo..." : leituraArquivoScannerDds ? "Analisar novamente" : "Ler arquivo anexado"}
                                            </button>
                                        </div>
                                    </>
                                )}

                                {erroLeituraArquivoScannerDds && (
                                    <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                                        {erroLeituraArquivoScannerDds}
                                    </p>
                                )}

                                {leituraArquivoScannerDds && (
                                    <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4 ring-1 ring-indigo-50">
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700">
                                                    Diagnóstico inicial do arquivo
                                                </p>
                                                <h4 className="mt-1 text-base font-black text-slate-950">
                                                    Leitura executada
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-600">
                                                    Resultado técnico de apoio. OCR visual mantido apenas como apoio; a estatística oficial vem da Conferência Assistida.
                                                </p>
                                            </div>
                                            <span className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-800">
                                                {String(leituraArquivoScannerDds.tipoLeitura || "leitura_inicial").replace(/_/g, " ")}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Páginas lidas</p>
                                                <p className="mt-1 text-base font-black text-slate-950">
                                                    {leituraArquivoScannerDds.paginasLidas || 0}/{leituraArquivoScannerDds.totalPaginas || 0}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Linhas OCR</p>
                                                <p className="mt-1 text-base font-black text-slate-950">{linhasLeituraArquivoScannerDds.length}</p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Texto</p>
                                                <p className="mt-1 text-base font-black text-slate-950">
                                                    {qualidadeLeituraArquivoScannerDds.textoStatus}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confiança</p>
                                                <p className="mt-1 text-base font-black text-slate-950">
                                                    {Number.isFinite(Number(leituraArquivoScannerDds.confianca)) ? `${Math.round(Number(leituraArquivoScannerDds.confianca))}%` : "-"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className={`mt-4 rounded-xl border p-3 ${
                                            qualidadeLeituraArquivoScannerDds.confiavel
                                                ? "border-emerald-100 bg-emerald-50 text-emerald-800"
                                                : "border-amber-100 bg-amber-50 text-amber-800"
                                        }`}>
                                            <p className="text-[10px] font-black uppercase tracking-wide">Status técnico da leitura</p>
                                            <p className="mt-1 text-sm font-black">
                                                {qualidadeLeituraArquivoScannerDds.statusConferencia}
                                            </p>
                                            {!qualidadeLeituraArquivoScannerDds.confiavel && (
                                                <p className="mt-1 text-xs font-bold">
                                                    O arquivo foi lido, mas o texto retornado não tem qualidade suficiente para comparar presença ou assinatura automaticamente.
                                                </p>
                                            )}
                                        </div>

                                        {leituraArquivoScannerDds?.diagnosticoDdsOcr && (
           <div className="mt-4 rounded-xl border border-cyan-100 bg-cyan-50 p-3">
               <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                   <div>
                       <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">OCR direcionado DDS</p>
                       <p className="mt-1 text-xs font-bold text-cyan-900">
                           Score {leituraArquivoScannerDds.diagnosticoDdsOcr.score || 0}/100
                           {leituraArquivoScannerDds.diagnosticoDdsOcr.pagina ? ` • página ${leituraArquivoScannerDds.diagnosticoDdsOcr.pagina}` : ""}
                           {leituraArquivoScannerDds.diagnosticoDdsOcr.rotacao ? ` • rotação ${leituraArquivoScannerDds.diagnosticoDdsOcr.rotacao}°` : ""}
                       </p>
                   </div>
                   <span className="rounded-xl border border-cyan-200 bg-white px-3 py-2 text-xs font-black text-cyan-800">
                       {leituraArquivoScannerDds.diagnosticoDdsOcr.encontrouCodigo ? "Código DDS localizado" : "Busca por código/cabeçalho"}
                   </span>
               </div>
               {Array.isArray(leituraArquivoScannerDds.diagnosticoDdsOcr.indicios) && leituraArquivoScannerDds.diagnosticoDdsOcr.indicios.length > 0 && (
                   <p className="mt-2 text-xs font-bold leading-5 text-cyan-800">
                       Indícios: {leituraArquivoScannerDds.diagnosticoDdsOcr.indicios.slice(0, 6).join(", ")}
                   </p>
               )}
           </div>
       )}

       {textoPreviaArquivoScannerDds && (
                                            <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Prévia do texto lido</p>
                                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">
                                                    {textoPreviaArquivoScannerDds}
                                                </pre>
                                            </div>
                                        )}




            {avisosLeituraArquivoScannerDds.length > 0 && (
    <details className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-bold leading-5 text-amber-800">
        <summary className="cursor-pointer select-none text-[10px] font-black uppercase tracking-wide text-amber-700">
            Detalhes técnicos da leitura
        </summary>

        <p className="mt-2 text-[11px] font-bold leading-5 text-amber-800">
            Informações técnicas do OCR mantidas apenas para auditoria e suporte.
        </p>

        <ul className="mt-2 space-y-1">
            {avisosLeituraArquivoScannerDds.slice(0, 6).map((aviso, indice) => (
                <li key={`aviso-leitura-dds-${indice}`}>• {aviso}</li>
            ))}
        </ul>
    </details>
)}

                                        {linhasLeituraArquivoScannerDds.length > 0 && (
                                            <div className="mt-4 overflow-hidden rounded-xl border border-indigo-100 bg-white">
                                                <div className="max-h-56 overflow-auto">
                                                    <table className="w-full border-collapse text-left text-xs">
                                                        <thead className="sticky top-0 bg-indigo-50 text-[10px] uppercase tracking-wide text-indigo-500">
                                                            <tr>
                                                                <th className="px-3 py-2">Página</th>
                                                                <th className="px-3 py-2">Linha lida</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-indigo-50">
                                                            {linhasLeituraArquivoScannerDds.slice(0, 12).map((linha, indice) => (
                                                                <tr key={`linha-leitura-dds-${linha?.pagina || "p"}-${linha?.indice ?? indice}`}>
                                                                    <td className="w-20 px-3 py-2 font-black text-slate-500">{linha?.pagina || "-"}</td>
                                                                    <td className="px-3 py-2 font-semibold text-slate-700">{linha?.texto || "-"}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {diagnosticoEstruturalScannerDds && (
                                    <div className="mt-4 rounded-xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                                                    Diagnóstico estrutural DDS
                                                </p>
                                                <h4 className="mt-1 text-base font-black text-slate-950">
                                                    Pré-conferência da folha assinada
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    Compara gabarito digital, arquivo anexado e leitura inicial. Ainda não valida assinatura nem presença.
                                                </p>
                                            </div>

                                            <span className={`rounded-xl border px-3 py-2 text-xs font-black ${
                                                diagnosticoEstruturalScannerDds.statusVisual === "ok"
                                                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                    : diagnosticoEstruturalScannerDds.statusVisual === "manual"
                                                        ? "border-amber-200 bg-amber-50 text-amber-800"
                                                        : "border-slate-200 bg-slate-50 text-slate-700"
                                            }`}>
                                                {diagnosticoEstruturalScannerDds.statusGeral}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Código esperado</p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={diagnosticoEstruturalScannerDds.codigoEsperado}>
                                                    {diagnosticoEstruturalScannerDds.codigoEsperado || "-"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa / obra</p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={`${diagnosticoEstruturalScannerDds.empresaEsperada || "-"} • ${diagnosticoEstruturalScannerDds.obraEsperada || "-"}`}>
                                                    {diagnosticoEstruturalScannerDds.empresaEsperada || "-"} • {diagnosticoEstruturalScannerDds.obraEsperada || "-"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Período</p>
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={diagnosticoEstruturalScannerDds.periodoTexto}>
                                                    {diagnosticoEstruturalScannerDds.periodoTexto || "-"}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
                                                <p className="mt-1 text-sm font-black text-slate-900">
                                                    {diagnosticoEstruturalScannerDds.participantesEsperados}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-2 lg:grid-cols-3">
                                            {diagnosticoEstruturalScannerDds.itens.map((item, indice) => (
                                                <div
                                                    key={`diagnostico-estrutural-dds-${indice}`}
                                                    className={`rounded-xl border p-3 ${
                                                        item.status === "ok"
                                                            ? "border-emerald-100 bg-emerald-50"
                                                            : item.status === "manual"
                                                                ? "border-amber-100 bg-amber-50"
                                                                : "border-slate-100 bg-slate-50"
                                                    }`}
                                                >
                                                    <p className={`text-[10px] font-black uppercase tracking-wide ${
                                                        item.status === "ok"
                                                            ? "text-emerald-700"
                                                            : item.status === "manual"
                                                                ? "text-amber-700"
                                                                : "text-slate-400"
                                                    }`}>
                                                        {item.status === "ok" ? "OK" : item.status === "manual" ? "Conferir" : "Pendente"}
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-slate-950">{item.titulo}</p>
                                                    <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.detalhe}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {preConferenciaParticipantesScannerDds.total > 0 && (
<div className="rounded-xl border border-violet-100 bg-white p-4 ring-1 ring-violet-50 lg:col-span-2">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">
                Pré-conferência de participantes
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Participantes do gabarito x páginas anexadas
            </h4>
            <p className="mt-1 text-xs font-bold text-slate-500">
                Conferência técnica auxiliar. Não valida assinatura, biometria ou grafia; indica apenas se o participante foi localizado na página esperada da folha.
            </p>
        </div>

        <span className={`rounded-xl border px-3 py-2 text-xs font-black ${
            preConferenciaParticipantesScannerDds.statusVisual === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : preConferenciaParticipantesScannerDds.statusVisual === "manual"
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-slate-50 text-slate-700"
        }`}>
            {preConferenciaParticipantesScannerDds.statusGeral}
        </span>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
            <p className="mt-1 text-base font-black text-slate-950">{preConferenciaParticipantesScannerDds.total}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Localizados</p>
            <p className="mt-1 text-base font-black text-emerald-900">{preConferenciaParticipantesScannerDds.localizados}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Manual</p>
            <p className="mt-1 text-base font-black text-amber-900">{preConferenciaParticipantesScannerDds.manuais}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 text-center ring-1 ring-red-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Não localizados</p>
            <p className="mt-1 text-base font-black text-red-900">{preConferenciaParticipantesScannerDds.naoLocalizados}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Pág. não anexada</p>
            <p className="mt-1 text-base font-black text-orange-900">{preConferenciaParticipantesScannerDds.paginasNaoAnalisadas}</p>
        </div>
    </div>

    {!preConferenciaParticipantesScannerDds.leituraConfiavel && preConferenciaParticipantesScannerDds.leituraExecutada && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
            A leitura atual não tem qualidade suficiente para localizar participantes com segurança. A tabela abaixo fica como apoio de conferência manual.
        </div>
    )}

    <div className="mt-4 overflow-hidden rounded-xl border border-violet-100">
        <div className="max-h-72 overflow-auto">
            <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-violet-50 text-[10px] uppercase tracking-wide text-violet-500">
                    <tr>
                        <th className="px-3 py-2">Nº</th>
                        <th className="px-3 py-2">Nome</th>
                        <th className="px-3 py-2">Função</th>
                        <th className="px-3 py-2">Código SafeScan</th>
                        <th className="px-3 py-2">Localização textual</th>
                        <th className="px-3 py-2">Evidência</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-violet-50">
                    {preConferenciaParticipantesScannerDds.participantes.slice(0, 80).map((participante, indice) => (
                        <tr key={`pre-conferencia-dds-${participante.codigoSafescan || participante.nome || indice}`}>
                            <td className="px-3 py-2 font-black text-slate-500">{participante.numero || indice + 1}</td>
                            <td className="px-3 py-2 font-bold text-slate-800">{participante.nome || "-"}</td>
                            <td className="px-3 py-2 text-slate-600">{participante.funcao || "-"}</td>
                            <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{participante.codigoSafescan || "-"}</td>
                            <td className="px-3 py-2">
                                <span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-black uppercase tracking-wide ${
                                    participante.status === "localizado"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : participante.status === "manual" || participante.status === "pagina_nao_analisada"
                                            ? "border-amber-200 bg-amber-50 text-amber-800"
                                            : participante.status === "nao_localizado"
                                                ? "border-red-200 bg-red-50 text-red-700"
                                                : "border-slate-200 bg-slate-50 text-slate-600"
                                }`}>
                                    {participante.statusTexto}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-slate-600">{participante.detalhe}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>

    <p className="mt-3 text-[11px] font-bold leading-5 text-slate-500">
        Observação: esta etapa não substitui conferência visual da assinatura. O status indica apenas localização textual provável ou necessidade de conferência manual.
    </p>
</div>
)}


{participantesConferenciaAssistidaDds.length > 0 && diasAtivosConferenciaAssistidaDds.length > 0 && (
<div className="rounded-xl border border-cyan-200 bg-cyan-50/70 p-5 ring-1 ring-cyan-100 lg:col-span-2">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                Conferência assistida de frequência DDS
            </p>
            <h4 className="mt-1 text-xl font-black text-slate-950">
                Apuração oficial para estatísticas
            </h4>
            <p className="mt-1 max-w-4xl text-sm font-bold leading-6 text-slate-700">
                Use P para confirmar presença, X para registrar ausência e ? para deixar o campo pendente de revisão.
                <br />
                Em Semana completa, o sistema preenche automaticamente todos os dias com atividade.
            </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:max-w-[500px] lg:items-stretch">
            {(conferenciaAssistidaSalvaEmDds || fechamentoConferenciaAssistidaDds?.status === "concluida") && (
                <div className="grid gap-2 sm:grid-cols-2">
                    {conferenciaAssistidaSalvaEmDds && (
                        <div className="rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-center shadow-sm">
                            <p className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Salva em</p>
                            <p className="mt-0.5 text-[11px] font-black text-emerald-900">
                                {new Date(conferenciaAssistidaSalvaEmDds).toLocaleString("pt-BR")}
                            </p>
                        </div>
                    )}

                    {fechamentoConferenciaAssistidaDds?.status === "concluida" && (
                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-center shadow-sm">
                            <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Concluída oficialmente em</p>
                            <p className="mt-0.5 text-[11px] font-black text-emerald-950">
                                {new Date(fechamentoConferenciaAssistidaDds.concluidoEm).toLocaleString("pt-BR")}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {(erroFechamentoConferenciaDds || erroConferenciaAssistidaDds) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-right text-[11px] font-bold text-red-700">
                    {erroFechamentoConferenciaDds || erroConferenciaAssistidaDds}
                </div>
            )}

            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {conferenciaOficialConcluidaDds && (
                    <button
                        type="button"
                        onClick={reabrirConferenciaAssistidaDds}
                        disabled={salvandoFechamentoConferenciaDds}
                        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-amber-800 shadow-sm transition hover:border-amber-400 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {salvandoFechamentoConferenciaDds ? "Reabrindo..." : "Reabrir conferência"}
                    </button>
                )}

                <button
                    type="button"
                    onClick={concluirConferenciaAssistidaDds}
                    disabled={conferenciaOficialConcluidaDds || salvandoFechamentoConferenciaDds || estatisticasConferenciaAssistidaDds.manuais > 0 || estatisticasConferenciaAssistidaDds.participantes <= 0}
                    className="w-full rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                    title={estatisticasConferenciaAssistidaDds.manuais > 0 ? "Troque todos os ? por P ou X antes de concluir." : "Registrar fechamento oficial da Conferência Assistida."}
                >
                    {salvandoFechamentoConferenciaDds ? "Concluindo..." : "Concluir conferência oficial"}
                </button>

                <button
                    type="button"
                    onClick={salvarConferenciaAssistidaDds}
                    disabled={salvandoConferenciaAssistidaDds || conferenciaOficialConcluidaDds}
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-600 px-3 py-1.5 text-center text-[11px] font-black leading-tight text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {salvandoConferenciaAssistidaDds ? "Salvando..." : "Salvar conferência"}
                </button>

                <button
                    type="button"
                    onClick={limparConferenciaAssistidaDds}
                    disabled={conferenciaOficialConcluidaDds}
                    className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-center text-[11px] font-black leading-tight text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Limpar conferência
                </button>
            </div>
        </div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes da página</p>
            <p className="mt-1 text-base font-black text-slate-950">{estatisticasConferenciaAssistidaDds.participantes}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Presenças</p>
            <p className="mt-1 text-base font-black text-emerald-900">{estatisticasConferenciaAssistidaDds.presencas}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Ausências</p>
            <p className="mt-1 text-base font-black text-red-900">{estatisticasConferenciaAssistidaDds.ausencias}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Manual/vazio</p>
            <p className="mt-1 text-base font-black text-amber-900">{estatisticasConferenciaAssistidaDds.manuais}</p>
        </div>
        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-cyan-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Semana completa</p>
            <p className="mt-1 text-base font-black text-violet-900">{estatisticasConferenciaAssistidaDds.funcionariosSemanaCompleta}</p>
        </div>
    </div>

    <div className="mt-2">
        <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            Indicadores por categoria de participante
        </p>

        <div className="grid gap-2 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex min-h-[76px] flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        Colaboradores cadastrados
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                        {estatisticasConferenciaAssistidaDds.participantesCadastrados}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-slate-100 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600">
                        Cadastro SafeScan
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-emerald-700">
                            Presenças
                        </p>
                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                            {estatisticasConferenciaAssistidaDds.presencasCadastrados}
                        </p>
                    </div>

                    <div className="rounded-lg bg-red-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-red-700">
                            Ausências
                        </p>
                        <p className="mt-0.5 text-sm font-black text-red-900">
                            {estatisticasConferenciaAssistidaDds.ausenciasCadastrados}
                        </p>
                    </div>

                    <div className="rounded-lg bg-violet-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-violet-700">
                            Homem-dia
                        </p>
                        <p className="mt-0.5 text-sm font-black text-violet-900">
                            {estatisticasConferenciaAssistidaDds.homemDiaCadastrados}
                        </p>
                    </div>
                </div>
            </div>

            <div className="rounded-xl border border-cyan-200 bg-white p-3 shadow-sm">
                <div className="flex min-h-[76px] flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                        Adicionais / visitantes
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none text-cyan-950">
                        {estatisticasConferenciaAssistidaDds.participantesAdicionais}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-cyan-50 px-3 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                        Registro manual
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-emerald-700">
                            Presenças
                        </p>
                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                            {estatisticasConferenciaAssistidaDds.presencasAdicionais}
                        </p>
                    </div>

                    <div className="rounded-lg bg-red-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-red-700">
                            Ausências
                        </p>
                        <p className="mt-0.5 text-sm font-black text-red-900">
                            {estatisticasConferenciaAssistidaDds.ausenciasAdicionais}
                        </p>
                    </div>

                    <div className="rounded-lg bg-violet-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-violet-700">
                            Homem-dia
                        </p>
                        <p className="mt-0.5 text-sm font-black text-violet-900">
                            {estatisticasConferenciaAssistidaDds.homemDiaAdicionais}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div className="mt-4 overflow-x-auto rounded-xl border border-cyan-100 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <tr>
                    <th className="px-3 py-2">Nº</th>
                    <th className="px-3 py-2">Funcionário</th>
                    {diasAtivosConferenciaAssistidaDds.map((dia) => (
                        <th key={`dia-assistido-header-${dia.chaveAssistida}`} className="px-3 py-2 text-center">
                            <span>{dia.curto || dia.nome}</span>
                            <span className="block text-[9px] font-bold text-slate-400">{dia.data}</span>
                        </th>
                    ))}
                    <th className="px-3 py-2 text-center">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {participantesConferenciaAssistidaDds.map((participante) => {
                    const numero = Number(participante?.numero || 0);

                    return (
                        <tr key={`participante-assistido-${numero}`} className="align-top">
                            <td className="px-3 py-3 font-black text-slate-900">{numero}</td>
                            <td className="px-3 py-3">
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="font-black text-slate-900">{participante.nome}</p>

                                    {participante.origem === "adicional" && (
                                        <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                                            Adicional
                                        </span>
                                    )}
                                </div>
                                <p className="mt-0.5 text-[11px] font-bold uppercase text-slate-400">{participante.funcao || "-"}</p>
                            </td>

                            {diasAtivosConferenciaAssistidaDds.map((dia) => {
                                const status = obterStatusFrequenciaAssistidaDds(numero, dia);

                                return (
                                    <td key={`assistido-${numero}-${dia.chaveAssistida}`} className="px-3 py-2">
                                        <div className="flex justify-center gap-1">
                                            <button
                                                type="button"
                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "presente")}
                                                                            disabled={conferenciaOficialConcluidaDds}
                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "presente" ? "border-emerald-400 bg-emerald-100 text-emerald-900" : "border-slate-200 bg-white text-slate-400 hover:border-emerald-300"}`}
                                                title="Presente"
                                            >
                                                P
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "ausente")}
                                                                            disabled={conferenciaOficialConcluidaDds}
                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "ausente" ? "border-red-400 bg-red-100 text-red-900" : "border-slate-200 bg-white text-slate-400 hover:border-red-300"}`}
                                                title="Ausente / falta"
                                            >
                                                X
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => definirStatusFrequenciaAssistidaDds(numero, dia, "manual")}
                                                                            disabled={conferenciaOficialConcluidaDds}
                                                className={`h-8 w-8 rounded-lg border text-xs font-black transition ${status === "manual" ? "border-amber-400 bg-amber-100 text-amber-900" : "border-slate-200 bg-white text-slate-400 hover:border-amber-300"}`}
                                                title="Manual / vazio"
                                            >
                                                ?
                                            </button>
                                        </div>
                                    </td>
                                );
                            })}

                            <td className="px-3 py-2">
                                <div className="flex flex-col gap-1">
                                    <button
                                        type="button"
                                        onClick={() => marcarSemanaCompletaAssistidaDds(numero)}
                                        disabled={conferenciaOficialConcluidaDds}
                                        className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black text-violet-800 transition hover:border-violet-300"
                                    >
                                        Semana completa
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => limparParticipanteConferenciaAssistidaDds(numero)}
                                        disabled={conferenciaOficialConcluidaDds}
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-black text-slate-500 transition hover:border-slate-300"
                                    >
                                        Limpar linha
                                    </button>
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>

    <details className="mt-4 overflow-hidden rounded-xl border border-cyan-200 bg-white shadow-sm">
        <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-3 transition hover:bg-cyan-50/60 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                    Participantes adicionais / visitantes
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500">
                    Abra somente quando houver visitante ou funcionário não cadastrado.
                </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <span className="rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                    {participantesAdicionaisAtivosConferenciaDds.length}/{QUANTIDADE_LINHAS_COMPLEMENTARES_DDS} preenchidos
                </span>

                <span className="rounded-lg border border-cyan-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-cyan-800">
                    Abrir / recolher
                </span>
            </div>
        </summary>

        <div className="border-t border-cyan-100 bg-cyan-50/20 p-4">
            <div className="space-y-2">
                {participantesAdicionaisConferenciaDds.map(
                    (participante, indice) => (
                        <div
                            key={participante.idAdicional}
                            className="grid gap-2 rounded-xl bg-slate-50 p-2 ring-1 ring-slate-100 md:grid-cols-[70px_minmax(0,1.3fr)_minmax(0,.9fr)_minmax(0,.9fr)_auto] md:items-end"
                        >
                            <div>
                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                    Linha
                                </span>
                                <div className="flex h-9 items-center justify-center rounded-lg bg-white text-xs font-black text-slate-700 ring-1 ring-slate-200">
                                    {participante.numero}
                                </div>
                            </div>

                            <label className="block min-w-0">
                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                    Nome
                                </span>
                                <input
                                    type="text"
                                    value={participante.nome}
                                    onChange={(evento) =>
                                        atualizarParticipanteAdicionalConferenciaDds(
                                            indice,
                                            "nome",
                                            evento.target.value
                                        )
                                    }
                                    disabled={conferenciaOficialConcluidaDds}
                                    placeholder="Visitante ou não cadastrado"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block min-w-0">
                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                    Função
                                </span>
                                <input
                                    type="text"
                                    value={participante.funcao}
                                    onChange={(evento) =>
                                        atualizarParticipanteAdicionalConferenciaDds(
                                            indice,
                                            "funcao",
                                            evento.target.value
                                        )
                                    }
                                    disabled={conferenciaOficialConcluidaDds}
                                    placeholder="Função"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                />
                            </label>

                            <label className="block min-w-0">
                                <span className="mb-1 block text-[9px] font-black uppercase tracking-wide text-slate-400">
                                    Empresa
                                </span>
                                <input
                                    type="text"
                                    value={participante.empresa}
                                    onChange={(evento) =>
                                        atualizarParticipanteAdicionalConferenciaDds(
                                            indice,
                                            "empresa",
                                            evento.target.value
                                        )
                                    }
                                    disabled={conferenciaOficialConcluidaDds}
                                    placeholder="Empresa"
                                    className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none focus:border-cyan-300 focus:ring-4 focus:ring-cyan-100 disabled:bg-slate-100"
                                />
                            </label>

                            <button
                                type="button"
                                onClick={() =>
                                    limparParticipanteAdicionalConferenciaDds(
                                        indice
                                    )
                                }
                                disabled={
                                    conferenciaOficialConcluidaDds ||
                                    (
                                        !participante.nome &&
                                        !participante.funcao &&
                                        !participante.empresa
                                    )
                                }
                                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-[10px] font-black uppercase tracking-wide text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Limpar
                            </button>
                        </div>
                    )
                )}
            </div>
        </div>
    </details>

    <div className="mt-4 overflow-x-auto rounded-xl border border-cyan-100 bg-white">
        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
            <thead className="bg-cyan-50 text-[10px] font-black uppercase tracking-wide text-cyan-700">
                <tr>
                    <th className="px-3 py-2">Dia</th>
                    <th className="px-3 py-2 text-center">Presentes</th>
                    <th className="px-3 py-2 text-center">Ausentes</th>
                    <th className="px-3 py-2 text-center">Manual/vazio</th>
                    <th className="px-3 py-2 text-center">Acumulado do período</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {estatisticasConferenciaAssistidaDds.dias.map((dia) => (
                    <tr key={`resumo-assistido-${dia.chaveAssistida}`}>
                        <td className="px-3 py-2 font-black text-slate-900">{dia.curto || dia.nome} <span className="text-slate-400">{dia.data}</span></td>
                        <td className="px-3 py-2 text-center font-black text-emerald-800">{dia.presentes}</td>
                        <td className="px-3 py-2 text-center font-black text-red-800">{dia.ausentes}</td>
                        <td className="px-3 py-2 text-center font-black text-amber-800">{dia.manuais}</td>
                        <td className="px-3 py-2 text-center font-black text-slate-900">{dia.homemDia}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>

    <p className="mt-3 text-[11px] font-bold leading-5 text-cyan-900">
        Esta é a base oficial para estatísticas do DDS. O OCR pode apoiar a conferência, mas a contagem final deve ser confirmada nesta tabela.
        {conferenciaOficialConcluidaDds && (
            <span className="mt-2 block rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-emerald-800">
                Edição bloqueada após conclusão oficial. Use Reabrir conferência para corrigir.
            </span>
        )}
    </p>
</div>
)}
{resultadoFinalApresentacaoDds && (
<div className={`rounded-xl border p-5 ring-1 lg:col-span-2 ${
    resultadoFinalApresentacaoDds.statusVisual === "ok"
        ? "border-emerald-200 bg-emerald-50 ring-emerald-100"
        : resultadoFinalApresentacaoDds.statusVisual === "parcial"
            ? "border-amber-200 bg-amber-50 ring-amber-100"
            : "border-red-200 bg-red-50 ring-red-100"
}`}>
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
            <p className={`text-[10px] font-black uppercase tracking-wide ${
                resultadoFinalApresentacaoDds.statusVisual === "ok"
                    ? "text-emerald-700"
                    : resultadoFinalApresentacaoDds.statusVisual === "parcial"
                        ? "text-amber-700"
                        : "text-red-700"
            }`}>
                {resultadoFinalApresentacaoDds.modoAssistido ? "Resultado oficial da Conferência Assistida DDS" : "Resultado final da conferência DDS"}
            </p>
            <h4 className="mt-1 text-xl font-black text-slate-950">
                {resultadoFinalApresentacaoDds.titulo}
            </h4>
            <p className="mt-1 max-w-4xl text-sm font-bold leading-6 text-slate-700">
                {resultadoFinalApresentacaoDds.descricao}
            </p>
        </div>

        <span className={`rounded-xl border px-4 py-2 text-sm font-black ${
            resultadoFinalApresentacaoDds.statusVisual === "ok"
                ? "border-emerald-300 bg-white text-emerald-800"
                : resultadoFinalApresentacaoDds.statusVisual === "parcial"
                    ? "border-amber-300 bg-white text-amber-800"
                    : "border-red-300 bg-white text-red-800"
        }`}>
            {resultadoFinalApresentacaoDds.statusFinal}
        </span>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
            <p className="mt-1 text-base font-black text-slate-950">{resultadoFinalApresentacaoDds.resumo.participantesTotal}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Presenças" : "Localizados"}</p>
            <p className="mt-1 text-base font-black text-emerald-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.presencas : resultadoFinalApresentacaoDds.resumo.participantesLocalizados}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Ausências" : "Manual"}</p>
            <p className="mt-1 text-base font-black text-amber-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.ausencias : resultadoFinalApresentacaoDds.resumo.participantesManuais}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Manual/vazio" : "Não localizados"}</p>
            <p className="mt-1 text-base font-black text-red-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.manuais : resultadoFinalApresentacaoDds.resumo.participantesNaoLocalizados}</p>
        </div>
        <div className="rounded-xl bg-white/80 p-3 text-center ring-1 ring-white">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">{resultadoFinalApresentacaoDds.modoAssistido ? "Acumulado do período" : "Pág. não anexada"}</p>
            <p className="mt-1 text-base font-black text-orange-900">{resultadoFinalApresentacaoDds.modoAssistido ? resultadoFinalApresentacaoDds.resumo.homemDia : resultadoFinalApresentacaoDds.resumo.participantesPaginasNaoAnalisadas}</p>
        </div>
    </div>

    <div className="mt-4 grid gap-2 lg:grid-cols-3">
        {resultadoFinalApresentacaoDds.itens.map((item, indice) => (
            <div
                key={`resultado-final-dds-${indice}`}
                className="rounded-xl bg-white/80 p-3 ring-1 ring-white"
            >
                <p className={`text-[10px] font-black uppercase tracking-wide ${
                    item.ok
                        ? "text-emerald-700"
                        : item.manual
                            ? "text-amber-700"
                            : "text-slate-400"
                }`}>
                    {item.ok ? "OK" : item.manual ? "Manual" : "Pendente"}
                </p>
                <p className="mt-1 text-sm font-black text-slate-950">{item.titulo}</p>
                <p className="mt-1 text-xs font-bold leading-5 text-slate-600">{item.detalhe}</p>
            </div>
        ))}
    </div>

</div>
)}


{reciboConferenciaFinalDds && (
<div ref={reciboConferenciaFinalRef} className="rounded-xl border border-slate-200 bg-white p-3 ring-1 ring-slate-100 lg:col-span-2">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] xl:items-start">
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Recibo da Conferência DDS
            </p>
            <h4 className="mt-1 text-xl font-black text-slate-950">
                Fechamento oficial registrado
            </h4>
            <p className="mt-1 max-w-4xl text-sm font-bold leading-6 text-slate-600">
                Resumo final da Conferência Assistida, com totais oficiais salvos no registro do DDS.
            </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
            <button
                type="button"
                onClick={imprimirReciboConferenciaDds}
                disabled={salvandoReciboFinalDds}
                className="dds-recibo-no-print rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
                {salvandoReciboFinalDds ? "Registrando..." : "Imprimir recibo"}
            </button>

            {reciboConferenciaFinalDds.urlConferencia && (
                <button
                    type="button"
                    onClick={abrirConsultaPublicaReciboDds}
                    className="dds-recibo-no-print rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-[11px] font-black text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-100"
                >
                    Abrir consulta pública
                </button>
            )}

            <button
                type="button"
                onClick={copiarCodigoReciboDds}
                className="dds-recibo-no-print rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-[11px] font-black text-violet-800 shadow-sm transition hover:border-violet-300 hover:bg-violet-100"
            >
                {codigoReciboCopiadoDds ? "Código copiado" : "Copiar código"}
            </button>

            <span className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-emerald-800">
                {reciboConferenciaFinalDds.status}
            </span>
        </div>
    </div>

    {(reciboFinalEmitidoEmDds || erroReciboFinalDds) && (
        <div className="dds-recibo-no-print mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-600">
            {reciboFinalEmitidoEmDds && (
                <p>
                    <span className="font-black uppercase tracking-wide text-emerald-700">Recibo emitido em:</span>{" "}
                    {new Date(reciboFinalEmitidoEmDds).toLocaleString("pt-BR")}
                </p>
            )}
            {erroReciboFinalDds && (
                <p className="mt-1 text-amber-700">{erroReciboFinalDds}</p>
            )}
        </div>
    )}

    <div className="mt-3 grid items-center gap-2 lg:grid-cols-[1fr_112px]">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Código DDS</p>
                <p className="mt-0.5 break-all text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.codigo || "-"}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Empresa</p>
                <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.empresa}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Obra / setor</p>
                <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">{reciboConferenciaFinalDds.obra}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-slate-50 px-2 py-2 text-center ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Período</p>
                <p className="mt-0.5 text-sm font-black leading-tight text-slate-950">
                    {reciboConferenciaFinalDds.periodoInicio} a {reciboConferenciaFinalDds.periodoFim}
                </p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Participantes</p>
                <p className="mt-0.5 text-lg font-black leading-none text-emerald-900">{reciboConferenciaFinalDds.participantes}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-emerald-50 px-2 py-2 text-center ring-1 ring-emerald-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Presenças</p>
                <p className="mt-0.5 text-lg font-black leading-none text-emerald-900">{reciboConferenciaFinalDds.presencas}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-red-50 px-2 py-2 text-center ring-1 ring-red-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Ausências</p>
                <p className="mt-0.5 text-lg font-black leading-none text-red-900">{reciboConferenciaFinalDds.ausencias}</p>
            </div>

            <div className="flex min-h-[62px] flex-col items-center justify-center rounded-xl bg-orange-50 px-2 py-2 text-center ring-1 ring-orange-100">
                <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado do período</p>
                <p className="mt-0.5 text-lg font-black leading-none text-orange-900">{reciboConferenciaFinalDds.homemDia}</p>
            </div>
        </div>

        <div className="flex h-fit self-center flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 text-center">
            {reciboConferenciaFinalDds.urlConferencia ? (
                <DdsQrConferenciaImpresso
                    url={reciboConferenciaFinalDds.urlConferencia}
                    size={76}
                    fallbackClassName="h-[76px] w-[76px]"
                />
            ) : (
                <div className="flex h-[76px] w-[76px] items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white text-[10px] font-black uppercase text-slate-400">
                    Sem QR
                </div>
            )}

            <p className="mt-2 text-[9px] font-black uppercase tracking-wide text-slate-400">Conclusão oficial</p>
            <p className="mt-0.5 text-[11px] font-black leading-tight text-slate-950">
                {reciboConferenciaFinalDds.concluidoEm
                    ? new Date(reciboConferenciaFinalDds.concluidoEm).toLocaleString("pt-BR")
                    : "-"}
            </p>
        </div>
    </div>

    <div className="mt-3">
        <p className="mb-2 text-center text-[9px] font-black uppercase tracking-[0.14em] text-slate-400">
            Composição dos participantes
        </p>

        <div className="grid gap-2 lg:grid-cols-2">
            <div className="h-full rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                <div className="flex min-h-[94px] flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                        Colaboradores cadastrados
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none text-slate-950">
                        {reciboConferenciaFinalDds.participantesCadastrados}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wide text-slate-600 ring-1 ring-slate-200">
                        Cadastro SafeScan
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-emerald-700">
                            Presenças
                        </p>
                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                            {reciboConferenciaFinalDds.presencasCadastrados}
                        </p>
                    </div>

                    <div className="rounded-lg bg-red-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-red-700">
                            Ausências
                        </p>
                        <p className="mt-0.5 text-sm font-black text-red-900">
                            {reciboConferenciaFinalDds.ausenciasCadastrados}
                        </p>
                    </div>

                    <div className="rounded-lg bg-orange-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-orange-700">
                            Homem-dia
                        </p>
                        <p className="mt-0.5 text-sm font-black text-orange-900">
                            {reciboConferenciaFinalDds.homemDiaCadastrados}
                        </p>
                    </div>
                </div>
            </div>

            <div className="h-full rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
                <div className="flex min-h-[94px] flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-black uppercase tracking-wide text-cyan-700">
                        Adicionais / visitantes
                    </p>

                    <p className="mt-1 text-2xl font-black leading-none text-cyan-950">
                        {reciboConferenciaFinalDds.participantesAdicionais}
                    </p>

                    <span className="mt-2 inline-flex rounded-full bg-white px-3 py-1 text-[9px] font-black uppercase tracking-wide text-cyan-700 ring-1 ring-cyan-200">
                        Registro manual
                    </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-emerald-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-emerald-700">
                            Presenças
                        </p>
                        <p className="mt-0.5 text-sm font-black text-emerald-900">
                            {reciboConferenciaFinalDds.presencasAdicionais}
                        </p>
                    </div>

                    <div className="rounded-lg bg-red-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-red-700">
                            Ausências
                        </p>
                        <p className="mt-0.5 text-sm font-black text-red-900">
                            {reciboConferenciaFinalDds.ausenciasAdicionais}
                        </p>
                    </div>

                    <div className="rounded-lg bg-orange-50 px-2 py-2">
                        <p className="text-[8px] font-black uppercase text-orange-700">
                            Homem-dia
                        </p>
                        <p className="mt-0.5 text-sm font-black text-orange-900">
                            {reciboConferenciaFinalDds.homemDiaAdicionais}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Dias ativos</p>
            <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.diasAtivos}</p>
        </div>

        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Semana completa</p>
            <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.funcionariosSemanaCompleta}</p>
        </div>

        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl bg-white px-2 py-2 text-center ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Manual/vazio</p>
            <p className="mt-0.5 text-lg font-black leading-none text-slate-950">{reciboConferenciaFinalDds.manuais}</p>
        </div>
    </div>

    <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold leading-5 text-slate-600">
        Este recibo resume a apuração oficial da Conferência Assistida DDS. O QR/código serve para conferência do registro digital vinculado.
    </p>
</div>
)}


{historicoDds.length > 0 && (
<div className="rounded-xl border border-slate-200 bg-white p-4 ring-1 ring-slate-100 lg:col-span-2">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                Histórico do DDS
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Linha do tempo do registro
            </h4>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600">
                Acompanhe as principais etapas registradas para conferência, auditoria e rastreabilidade.
            </p>
        </div>

        <span className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
            {historicoDds.length} evento(s)
        </span>
    </div>

    <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        {historicoDds.map((evento, indice) => (
            <div
                key={`historico-dds-${indice}`}
                className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 ring-1 ring-emerald-50"
            >
                <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-[11px] font-black text-emerald-700 ring-1 ring-emerald-100">
                        {indice + 1}
                    </span>

                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                            {evento.titulo}
                        </p>
                        <p className="mt-1 text-[11px] font-bold leading-4 text-slate-700">
                            {evento.detalhe}
                        </p>
                        {evento.data && (
                            <p className="mt-2 text-[10px] font-black text-slate-500">
                                {new Date(evento.data).toLocaleString("pt-BR")}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        ))}
    </div>
</div>
)}


{reciboConferenciaFinalDds && (
<div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 ring-1 ring-sky-100 lg:col-span-2">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">
                Implantação / obra
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Controle mensal de mão de obra
            </h4>
            <p className="mt-1 max-w-4xl text-xs font-bold leading-5 text-slate-600">
                Gera PDF e Excel consolidado por empresa/contratada e função, usando a Conferência Assistida como base de presença. Expediente normal: 07:00 às 17:00, almoço das 12:00 às 13:00 e DDS das 07:00 às 07:10.
            </p>
        </div>

        <div className="flex flex-wrap gap-2">
            <button
                type="button"
                onClick={imprimirControleMaoDeObraDds}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-[11px] font-black text-emerald-800 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
            >
                Imprimir PDF
            </button>

            <button
                type="button"
                onClick={exportarControleMaoDeObraDds}
                className="rounded-xl border border-sky-300 bg-white px-3 py-2 text-[11px] font-black text-sky-800 shadow-sm transition hover:border-sky-400 hover:bg-sky-50"
            >
                Exportar Excel
            </button>
        </div>
    </div>

    <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Funções</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoControleMaoDeObraDds.funcoes}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Dias apurados</p>
            <p className="mt-1 text-base font-black text-sky-900">{resumoControleMaoDeObraDds.diasLancados}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado do período</p>
            <p className="mt-1 text-base font-black text-orange-900">{resumoControleMaoDeObraDds.homemDia}</p>
        </div>
        <div className="rounded-xl bg-white px-3 py-3 text-center ring-1 ring-sky-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Mês base</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoControleMaoDeObraDds.mesReferencia}</p>
        </div>
    </div>

    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-center text-xs font-bold leading-5 text-orange-900">
        <span className="font-black uppercase tracking-wide">Jornada padrão:</span>{" "}
        Expediente normal das 07:00 às 17:00, almoço das 12:00 às 13:00 e DDS das 07:00 às 07:10.
    </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 xl:flex-nowrap">
            <span className="shrink-0 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                Calendário do relatório
            </span>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="min-w-0 flex-1 xl:whitespace-nowrap">
                Aplicado automaticamente a partir da cidade/UF cadastrada na obra.
            </span>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="shrink-0 whitespace-nowrap text-slate-500">
                Calendário aplicado:
            </span>

            <strong className="shrink-0 whitespace-nowrap text-slate-950">
                {calendarioMaoDeObraSelecionadoDds.rotulo}
            </strong>

            <span
                aria-hidden="true"
                className="hidden h-4 w-px shrink-0 bg-slate-200 xl:block"
            />

            <span className="shrink-0 whitespace-nowrap text-slate-500">
                Origem:
            </span>

            <strong className="shrink-0 whitespace-nowrap text-slate-950">
                {calendarioMaoDeObraSelecionadoDds.origem === "cadastro da obra"
                    ? "cadastro da obra"
                    : "padrão SafeScan"}
            </strong>
        </div>
</div>
)}


<section className="dds-no-print col-span-full w-full rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
        <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">
                Histórico mensal
            </p>
            <h3 className="mt-1 whitespace-nowrap text-lg font-black text-slate-950">
                Histórico mensal de mão de obra
            </h3>
            <p className="mt-1 max-w-[620px] whitespace-nowrap text-xs font-semibold text-slate-500">
                Busca os DDS da obra selecionada no mês informado e resume a base oficial salva na Conferência Assistida.
            </p>
        </div>

        <div className="flex flex-wrap items-end gap-2 xl:flex-nowrap xl:justify-end xl:min-w-[760px]">
            <label className="block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Mês/Ano
                </span>
                <input
                    type="month"
                    value={mesHistoricoMaoDeObraDds}
                    onChange={(evento) => setMesHistoricoMaoDeObraDds(evento.target.value)}
                    className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-800 outline-none transition focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
            </label>
            <button
                type="button"
                onClick={buscarHistoricoMensalMaoDeObraDds}
                disabled={carregandoHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[170px] shrink-0 whitespace-nowrap rounded-xl bg-slate-950 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {carregandoHistoricoMensalMaoDeObraDds ? "Buscando..." : "Buscar DDS do mês"}
            </button>

            <button
                type="button"
                onClick={imprimirHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[180px] shrink-0 whitespace-nowrap rounded-xl border border-slate-200 bg-white px-4 text-xs font-black uppercase tracking-wide text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50"
            >
                Imprimir PDF mensal
            </button>

            <button
                type="button"
                onClick={exportarHistoricoMensalMaoDeObraDds}
                className="h-8 min-w-[190px] shrink-0 whitespace-nowrap rounded-xl bg-emerald-600 px-4 text-xs font-black uppercase tracking-wide text-white shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 hover:bg-emerald-700"
            >
                Exportar Excel mensal
            </button>
        </div>
    </div>

    <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600">
        Obra base: <span className="font-black text-slate-900">{dadosDds.obraSetor || registroScannerDds?.obraNome || "Selecione uma obra cadastrada no DDS"}</span>
        {historicoMensalConsultadoEmDds && (
            <span className="text-[11px] font-bold text-slate-400">
                Consulta: {new Date(historicoMensalConsultadoEmDds).toLocaleString("pt-BR")}
            </span>
        )}
    </div>

    {erroHistoricoMensalMaoDeObraDds && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
            {erroHistoricoMensalMaoDeObraDds}
        </div>
    )}

    <div className="mt-3 grid gap-2.5 md:grid-cols-3 xl:grid-cols-7">
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">DDS encontrados</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoHistoricoMensalMaoDeObraDds.ddsEncontrados}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Concluídos</p>
            <p className="mt-1 text-base font-black text-emerald-900">{resumoHistoricoMensalMaoDeObraDds.ddsConcluidos}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-sky-100 bg-sky-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-sky-700">Dias apurados</p>
            <p className="mt-1 text-base font-black text-sky-900">{resumoHistoricoMensalMaoDeObraDds.diasApurados}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-orange-100 bg-orange-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-orange-700">Acumulado</p>
            <p className="mt-1 text-base font-black text-orange-900">{formatarNumeroMaoDeObraDds(resumoHistoricoMensalMaoDeObraDds.acumuladoPeriodo)}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-violet-100 bg-violet-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-violet-700">Efetivo médio</p>
            <p className="mt-1 text-base font-black text-violet-900">{formatarNumeroMaoDeObraDds(resumoHistoricoMensalMaoDeObraDds.efetivoMedio)}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Em aberto</p>
            <p className="mt-1 text-base font-black text-amber-900">{resumoHistoricoMensalMaoDeObraDds.ddsPendentes}</p>
        </div>
        <div className="flex min-h-[58px] flex-col items-center justify-center rounded-xl border border-slate-100 bg-white p-3 text-center">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Funções</p>
            <p className="mt-1 text-base font-black text-slate-950">{resumoHistoricoMensalMaoDeObraDds.funcoes}</p>
        </div>
    </div>

    {resumoHistoricoMensalMaoDeObraDds.possuiPendencias && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-bold text-amber-800">
            Existem DDS em aberto fora da consolidação oficial. O PDF/Excel mensal considera somente DDS concluídos.
        </div>
    )}

    {historicoMensalMaoDeObraDds.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-slate-100">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 bg-slate-50 px-4 py-2 text-[10px] font-black uppercase tracking-wide text-slate-500">
                <span>DDS</span>
                <span>Período</span>
                <span>Status</span>
                <span>Ação</span>
            </div>
            {historicoMensalMaoDeObraDds.slice(0, 8).map((registro) => {
                const status = registroHistoricoMensalConcluidoDds(registro) ? "Concluído" : "Em aberto";

                return (
                    <div key={registro.id || registro.codigo} className="grid grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3 border-t border-slate-100 px-3 py-2.5 text-xs font-bold text-slate-600">
                        <span className="truncate text-slate-900">{registro.codigo || "DDS sem código"}</span>
                        <span>{formatarDataControleMaoDeObraDds(registro.periodoInicio)} a {formatarDataControleMaoDeObraDds(registro.periodoFim)}</span>
                        <span className={status === "Concluído" ? "text-emerald-700" : "text-amber-700"}>{status}</span>
                        <button
                            type="button"
                            onClick={() => carregarRegistroHistoricoMensalDds(registro)}
                            disabled={carregandoScannerDds}
                            className={status === "Concluído"
                                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                                : "rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"}
                        >
                            {status === "Concluído" ? "Carregar DDS" : "Revisar DDS"}
                        </button>
                    </div>
                );
            })}
        </div>
    )}
</section>

{registroScannerDds && (
                                <div data-dds-registro-localizado className="rounded-xl border border-emerald-100 bg-white p-4 ring-1 ring-emerald-50 lg:col-span-2">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                                                Registro localizado
                                            </p>
                                            <h3 className="mt-1 text-xl font-black text-slate-950">
                                                {registroScannerDds.codigo}
                                            </h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-600">
                                                {registroScannerDds.empresaNome || "Empresa não informada"} • {registroScannerDds.obraNome || "Obra não informada"}
                                            </p>
                                            <p className="mt-1 text-xs font-bold text-slate-500">
                                                Período: {registroScannerDds.periodoInicio || "-"} a {registroScannerDds.periodoFim || "-"}
                                            </p>
                                        </div>

                                        {registroScannerDds.urlConferencia && (
                                            <a
                                                href={registroScannerDds.urlConferencia}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-800 transition hover:bg-emerald-100"
                                            >
                                                Abrir QR público
                                            </a>
                                        )}
                                    </div>

                                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
                                            <p className="mt-1 text-base font-black text-slate-950">{participantesRegistroScannerDds.length}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Dias DDS</p>
                                            <p className="mt-1 text-base font-black text-slate-950">{diasRegistroScannerDds.length || 7}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</p>
                                            <p className="mt-1 text-base font-black text-emerald-700">Gabarito carregado</p>
                                        </div>
                                    </div>

                                    {participantesRegistroScannerDds.length > 0 && (
                                        <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                                            <div className="max-h-64 overflow-auto">
                                                <table className="w-full border-collapse text-left text-xs">
                                                    <thead className="sticky top-0 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                                                        <tr>
                                                            <th className="px-3 py-2">Nº</th>
                                                            <th className="px-3 py-2">Nome</th>
                                                            <th className="px-3 py-2">Função</th>
                                                            <th className="px-3 py-2">Código SafeScan</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-100">
                                                        {participantesRegistroScannerDds.slice(0, 80).map((participante, indice) => (
                                                            <tr key={`${participante.nome || "participante"}-${indice}`}>
                                                                <td className="px-3 py-2 font-black text-slate-500">{participante.numero || indice + 1}</td>
                                                                <td className="px-3 py-2 font-bold text-slate-800">{participante.nome || "-"}</td>
                                                                <td className="px-3 py-2 text-slate-600">{participante.funcao || "-"}</td>
                                                                <td className="px-3 py-2 font-mono text-[11px] font-bold text-slate-700">{participante.codigoSafescan || participante.codigoFuncionario || "-"}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </section>



            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-sky-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("temas")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("temas"); }}
                    className="flex min-h-[52px] cursor-pointer flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700 ring-1 ring-sky-100">
                            <ClipboardList className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Temas por dia da semana
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Preencha o tema e o responsável de cada dia quando necessário.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("temas")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("temas")} />
                        </button>
                    </div>
                </div>
                {cardDdsAberto("temas") && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
                    {diasSemanaComTemasDds.map((dia, indice) => (
                        <div
                            key={`${dia.curto}-${dia.data}`}
                            className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                            <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
                                <p className="text-[10px] font-black uppercase tracking-wide">
                                    {dia.nome}
                                </p>
                                <p className="mt-0.5 text-xs font-black text-emerald-200">
                                    {dia.data}
                                </p>
                            </div>

                            <label className="mt-3 block">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Tema
                                </span>
                                <textarea
                                    value={temasDdsEditaveis[indice]?.tema || ""}
                                    onChange={(evento) => atualizarTemaDiaDds(indice, "tema", evento.target.value)}
                                    rows={3}
                                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                            </label>

                            <label className="mt-2 block">
                                <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                    Responsável
                                </span>
                                <input
                                    type="text"
                                    value={temasDdsEditaveis[indice]?.responsavel || ""}
                                    onChange={(evento) => atualizarTemaDiaDds(indice, "responsavel", evento.target.value)}
                                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                />
                            </label>
                        </div>
                    ))}
                </div>
                )}
            </section>

            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-amber-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("recados")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("recados"); }}
                    className="flex min-h-[52px] cursor-pointer flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
                            <MessageSquareText className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Recados da semana
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Mensagem opcional impressa no rodapé. Deixe em branco se não houver recado.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setRecadosDdsEditaveis("")}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                    >
                        Limpar recados
                    </button>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("recados")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("recados")} />
                        </button>
                    </div>
                </div>

                {cardDdsAberto("recados") && (
                <textarea
                    value={recadosDdsEditaveis}
                    onChange={(evento) => setRecadosDdsEditaveis(evento.target.value)}
                    rows={4}
                    placeholder="Ex.: Reforçar uso de óculos de segurança, organização do canteiro, atenção em atividades com máquinas..."
                    className="mt-4 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                )}
            </section>

            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-violet-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("orientacoes")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("orientacoes"); }}
                    className="flex min-h-[52px] cursor-pointer flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                            <ListChecks className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                Orientações importantes
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Itens fixos de segurança exibidos no rodapé da folha.
                            </p>
                        </div>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={restaurarOrientacoesPadraoDds}
                        className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                    >
                        Restaurar orientações padrão
                    </button>
                        <button
                            type="button"
                            onClick={() => alternarCardDds("orientacoes")}
                            className="shrink-0"
                        >
                            <BotaoAlternarCardDds aberto={cardDdsAberto("orientacoes")} />
                        </button>
                    </div>
                </div>

                {cardDdsAberto("orientacoes") && (
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {orientacoesDdsEditaveis.map((orientacao, indice) => (
                        <label
                            key={`orientacao-dds-${indice}`}
                            className="block rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                            <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                Orientação {indice + 1}
                            </span>
                            <textarea
                                value={orientacao}
                                onChange={(evento) => atualizarOrientacaoDds(indice, evento.target.value)}
                                rows={3}
                                className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold leading-5 text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                            />
                        </label>
                    ))}
                </div>
                )}
            </section>
            <section className="dds-no-print min-h-[92px] rounded-3xl border border-slate-200 border-t-4 border-t-slate-500 bg-white p-4 shadow-sm">
                <div
                    onClick={() => alternarCardDds("preview")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("preview"); }}
                    className="flex min-h-[52px] cursor-pointer flex-col gap-3 rounded-xl transition hover:bg-slate-50 lg:flex-row lg:items-center lg:justify-between"
                >
                    <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700 ring-1 ring-slate-100">
                            <Printer className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">
                                DDS impresso
                            </h2>
                            <p className="mt-1 text-sm font-semibold text-slate-500">
                                Prévia da folha semanal gerada para impressão.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(evento) => { evento.stopPropagation(); alternarCardDds("preview"); }}
                        className="shrink-0"
                    >
                        <BotaoAlternarCardDds aberto={cardDdsAberto("preview")} />
                    </button>
                </div>
            </section>
            <div className={`dds-print-area space-y-6 ${cardDdsAberto("preview") ? "" : "hidden print:block"}`}>
                <DdsPreviewImpresso
                    participantes={primeiraFolhaParticipantes}
                    mostrarAssinaturas={totalFolhasDds === 1}
                    dadosDds={dadosDdsComRegistro}
                    diasSemana={diasSemanaComTemasDds}
                    aniversariantes={aniversariantesSemanaDds}
                />

                {folhasContinuacaoDds.map((participantes, indice) => (
                    <DdsPreviewImpressoContinuacao
                        key={`folha-dds-${indice + 2}`}
                        participantes={participantes}
                        dadosDds={dadosDdsComRegistro}
                        diasSemana={diasSemanaComTemasDds}
                        numeroPagina={indice + 2}
                        totalPaginas={totalFolhasDds}
                        ultimaFolha={indice === folhasContinuacaoDds.length - 1}
                        numeroInicial={LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS + 1 + (indice * LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS)}
                    />
                ))}
            </div>
        </div>
    );
}

export default DdsPage;