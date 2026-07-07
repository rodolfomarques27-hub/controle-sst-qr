import React, { useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
    carregarRegistroDdsPorCodigo,
    salvarRegistroDds,
} from "../../services/ddsRegistrosService";
import { executarLeituraDocumentalLocal } from "../../services/documentosOcrService";

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
    ShieldCheck,
    Users,
} from "lucide-react";

const diasDds = [
    { curto: "DOM", nome: "Domingo", data: "14/06/2026", tema: "Trabalho seguro não tem dia de folga", responsavel: "Paulo Toledo" },
    { curto: "SEG", nome: "Segunda-feira", data: "15/06/2026", tema: "Uso correto de EPIs", responsavel: "Paulo Toledo" },
    { curto: "TER", nome: "Terça-feira", data: "16/06/2026", tema: "Acidentes que acontecem por distração", responsavel: "Paulo Toledo" },
    { curto: "QUA", nome: "Quarta-feira", data: "17/06/2026", tema: "Reflexão: acidentes batem recordes", responsavel: "Paulo Toledo" },
    { curto: "QUI", nome: "Quinta-feira", data: "18/06/2026", tema: "Excesso de ruído e suas consequências", responsavel: "Paulo Toledo" },
    { curto: "SEX", nome: "Sexta-feira", data: "19/06/2026", tema: "Organização e limpeza no canteiro", responsavel: "Paulo Toledo" },
    { curto: "SÁB", nome: "Sábado", data: "20/06/2026", tema: "Hidratação e calor", responsavel: "Paulo Toledo" },
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
const LINHAS_COMPLEMENTARES_ULTIMA_FOLHA_DDS = 16;
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
function completarParticipantesUltimaFolhaDds(participantes = [], quantidadeLinhas = 20, numeroInicial = 1) {
    const linhas = Array.isArray(participantes) ? [...participantes] : [];

    while (linhas.length < quantidadeLinhas) {
        linhas.push({
            numero: numeroInicial + linhas.length,
            nome: "",
            funcao: "",
            empresa: "",
            linhaEmBranco: true,
        });
    }

    return linhas;
}
function DdsResumoCard({ icone: Icone, titulo, valor, texto }) {
    return (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                    <Icone className="h-5 w-5" />
                </span>
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{titulo}</p>
                    <p className="mt-1 text-2xl font-black text-slate-950">{valor}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{texto}</p>
                </div>
            </div>
        </div>
    );
}

function DdsCampoObra({ rotulo, valor }) {
    return (
        <div className="border-b border-r border-slate-300 px-3 py-2">
            <p className="text-[8px] font-black uppercase tracking-wide text-slate-500">{rotulo}</p>
            <p className="mt-0.5 text-[11px] font-black uppercase text-slate-950">{valor}</p>
        </div>
    );
}

function QuadradoPresenca() {
    return <span className="inline-block h-3.5 w-3.5 rounded-[2px] border border-slate-700 bg-white align-middle" />;
}


function obterUuidSeguroDds(valor = "") {
    const texto = String(valor ?? "").trim();
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(texto)
        ? texto
        : "";
}

function DdsQrConferenciaImpresso({ url = "", size = 56, fallbackClassName = "h-14 w-14" }) {
    const urlSeguro = String(url || "").trim();

    if (!urlSeguro) {
        return <QrCode className={`${fallbackClassName} text-slate-950`} />;
    }

    return (
        <QRCodeSVG
            value={urlSeguro}
            size={size}
            level="H"
            includeMargin
            bgColor="#ffffff"
            fgColor="#0f172a"
        />
    );
}

function obterIniciaisEmpresaDdsImpresso(nome = "") {
    const texto = String(nome ?? "").trim();

    if (!texto) return "EMP";

    return texto
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 3)
        .map((parte) => parte.charAt(0))
        .join("")
        .toUpperCase() || "EMP";
}

function MarcaIdealizaDdsImpresso({ compacto = false }) {
    return (
        <div className="flex items-center gap-3">
            <div className={compacto
                ? "flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"
                : "flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700"}
            >
                <span className={compacto ? "text-xl font-black" : "text-2xl font-black"}>I</span>
            </div>
            <div>
                <p className={compacto
                    ? "text-2xl font-black leading-none text-slate-950"
                    : "text-4xl font-black leading-none text-slate-950"}
                >
                    IDEALIZA
                </p>
                <p className={compacto
                    ? "text-[10px] font-black uppercase tracking-[0.18em] text-amber-700"
                    : "text-base font-black uppercase tracking-[0.18em] text-amber-700"}
                >
                    Segurança do Trabalho
                </p>
            </div>
        </div>
    );
}




const CHAVE_LOCAL_CARDS_DDS = "controle-sst-qr:dds:cards-recolhiveis:v1";

const CARDS_DDS_PADRAO = {
    qr: true,
    novo: true,
    temas: true,
    recados: true,
    orientacoes: true,
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
        <span className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 shadow-sm transition hover:bg-white">
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
            ? "flex h-14 items-center justify-center rounded-2xl border border-slate-300 bg-white p-2"
            : "flex h-20 items-center justify-center rounded-2xl border border-slate-300 bg-white p-3"}
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

    return tema.includes("NAO HOUVE ATIVIDADE");
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
function DdsPreviewImpresso({ participantes = participantesDds, mostrarAssinaturas = true, dadosDds = dadosDdsPadrao, diasSemana = diasDds, aniversariantes = aniversariantesDds }) {
    return (
        <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
                <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-2xl border border-slate-300 bg-white p-3 text-slate-950">
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
                            <div className="rounded-2xl border border-slate-300 p-2.5">
                                <p className="text-[9px] font-black uppercase text-slate-500">Semana</p>
                                <p className="text-base font-black text-slate-950">{dadosDds.periodo}</p>
                                <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                <p className="rounded-lg bg-slate-950 px-2 py-0.5 text-center text-xs font-black text-white">{dadosDds.codigo}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 p-2 text-center">
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
                        <div className="bg-slate-950 py-1 text-center text-[11px] font-black uppercase tracking-wide text-white">
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
                                    <th className="w-[74px] border border-slate-400 px-1 py-1.5">Presente</th>
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
    const participantesFolha = ultimaFolha
        ? completarParticipantesUltimaFolhaDds(participantes, LINHAS_COMPLEMENTARES_ULTIMA_FOLHA_DDS, numeroInicial)
        : participantes;
    return (
        <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
                <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-2xl border border-slate-300 bg-white p-4 text-slate-950">
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
                            <div className="rounded-2xl border border-slate-300 p-3">
                                <p className="text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                <p className="rounded-lg bg-slate-950 px-2 py-1 text-center text-sm font-black text-white">{dadosDds.codigo}</p>
                                <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Obra / Setor</p>
                                <p className="text-xs font-black uppercase text-slate-950">{dadosDds.obraSetor}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 p-2 text-center">
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
                                    <th className="w-[78px] border border-slate-400 px-1 py-2">Presente</th>
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
                    titulo: "Assinatura / presença",
                    detalhe: "Não avaliada nesta etapa. Próxima fase fará análise provável por linha, sem validação grafológica.",
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

        const textoLido = [
            leituraArquivoScannerDds?.textoExtraido || "",
            leituraArquivoScannerDds?.textoPrevia || "",
            ...linhasLeituraArquivoScannerDds.map((linha) => linha?.texto || ""),
        ].join(" ");

        const textoNormalizado = normalizar(textoLido);
        const leituraExecutada = Boolean(leituraArquivoScannerDds);
        const leituraConfiavel = Boolean(qualidadeLeituraArquivoScannerDds?.confiavel);
        const participantesBase = Array.isArray(participantesRegistroScannerDds) ? participantesRegistroScannerDds : [];

        const palavrasIgnoradas = new Set(["de", "da", "do", "das", "dos", "e"]);
        const contemTexto = (valor = "") => {
            const termo = normalizar(valor);

            if (!termo || termo.length < 3 || !textoNormalizado) return false;

            return textoNormalizado.includes(termo);
        };

        const contemNomeParcial = (nome = "") => {
            const termoNome = normalizar(nome);
            const palavrasNome = termoNome
                .split(" ")
                .filter((palavra) => palavra.length >= 4 && !palavrasIgnoradas.has(palavra));

            if (!textoNormalizado || palavrasNome.length === 0) return false;

            const encontradas = palavrasNome.filter((palavra) => textoNormalizado.includes(palavra)).length;

            if (palavrasNome.length === 1) {
                return encontradas === 1;
            }

            return encontradas >= Math.min(2, palavrasNome.length);
        };

        const participantes = participantesBase.map((participante, indice) => {
            const nome = participante?.nome || "";
            const funcao = participante?.funcao || "";
            const codigoSafescan =
                participante?.codigoSafescan ||
                participante?.codigoSafeScan ||
                participante?.codigoFuncionario ||
                participante?.codigo_funcionario ||
                participante?.codigo ||
                "";

            const nomeLocalizado = leituraExecutada && leituraConfiavel && contemNomeParcial(nome);
            const codigoLocalizado = leituraExecutada && leituraConfiavel && contemTexto(codigoSafescan);

            if (!leituraExecutada) {
                return {
                    numero: participante?.numero || indice + 1,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "pendente",
                    statusTexto: "Aguardando leitura",
                    detalhe: "Execute a leitura inicial da folha assinada.",
                };
            }

            if (!leituraConfiavel) {
                return {
                    numero: participante?.numero || indice + 1,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "manual",
                    statusTexto: "Exige conferência manual",
                    detalhe: "OCR parcial/não confiável. Não é seguro comparar presença automaticamente.",
                };
            }

            if (nomeLocalizado || codigoLocalizado) {
                return {
                    numero: participante?.numero || indice + 1,
                    nome,
                    funcao,
                    codigoSafescan,
                    status: "localizado",
                    statusTexto: "Localizado no texto",
                    detalhe: codigoLocalizado
                        ? "Código SafeScan localizado na leitura."
                        : "Nome localizado na leitura.",
                };
            }

            return {
                numero: participante?.numero || indice + 1,
                nome,
                funcao,
                codigoSafescan,
                status: "nao_localizado",
                statusTexto: "Não localizado",
                detalhe: "Nome/código não localizado com segurança no texto lido.",
            };
        });

        const total = participantes.length;
        const localizados = participantes.filter((item) => item.status === "localizado").length;
        const naoLocalizados = participantes.filter((item) => item.status === "nao_localizado").length;
        const manuais = participantes.filter((item) => item.status === "manual").length;
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
        } else if (localizados === total) {
            statusGeral = "Participantes localizados no texto";
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
        const temasSalvos = carregarTemasDdsLocal(chaveTemasDds);

        setTemasDdsEditaveis(temasSalvos || criarTemasEditaveisDds());
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
            const semAtividade = temaNormalizado.includes("NAO HOUVE ATIVIDADE");

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

    function restaurarTemasPadraoDds() {
        setTemasDdsEditaveis(criarTemasEditaveisDds());
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
    const primeiraFolhaParticipantes = participantesSistemaDds.slice(0, LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS);
    const folhasContinuacaoDds = useMemo(
        () => dividirParticipantesDds(participantesSistemaDds, LIMITE_PARTICIPANTES_PRIMEIRA_FOLHA_DDS, LIMITE_PARTICIPANTES_FOLHA_CONTINUACAO_DDS),
        [participantesSistemaDds]
    );
    const totalFolhasDds = Math.max(1, 1 + folhasContinuacaoDds.length);
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
            const leitura = await executarLeituraDocumentalLocal({
                arquivo: arquivoScannerDds,
                arquivoNome: arquivoScannerDds.name || "",
                mimeType: arquivoScannerDds.type || "",
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
            <section className="dds-no-print relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.32),transparent_34%),linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.94))]" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.26em] text-emerald-300">SafeScan Brasil</p>
                        <h1 className="mt-2 text-4xl font-black tracking-tight">DDS — Diálogo Diário de Segurança</h1>
                        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-200">
                            Gere o DDS semanal de obra com assinatura manual, QR de conferência, temas por dia e controle visual para fiscalização.
                        </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-black text-white backdrop-blur">
                            Modelo aprovado: A4 horizontal
                        </div>
                        <button
                            type="button"
                            onClick={imprimirDdsComQrConferencia}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-black text-white shadow-lg shadow-emerald-950/20 transition hover:bg-emerald-400"
                        >
                            <Printer className="h-4 w-4" />
                            Imprimir DDS
                        </button>
                    </div>
                </div>
            </section>

            <section className="dds-no-print grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <DdsResumoCard
                    icone={CalendarClock}
                    titulo="Semana atual"
                    valor={dadosDds.resumoSemana || "14 a 20/06"}
                    texto={dadosDds.periodo || "Domingo como primeiro dia da semana."}
                />
                <DdsResumoCard
                    icone={BookOpen}
                    titulo="Temas"
                    valor="7 dias"
                    texto="Tema e responsável por dia."
                />
                <DdsResumoCard
                    icone={Users}
                    titulo="Participantes"
                    valor={String(participantesSistemaDds.length)}
                    texto="Todos os colaboradores carregados do sistema."
                />
                <DdsResumoCard
                    icone={ClipboardCheck}
                    titulo="Presença"
                    valor="Manual"
                    texto="Assinatura por dia e coluna Presente com marcação."
                />
            </section>

            <section className="dds-no-print space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("novo")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("novo"); }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl transition hover:bg-slate-50"
                    >
                        <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
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
                        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Empresa cadastrada</span>
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

                        <label className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                            <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">Obra cadastrada</span>
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
                            <label key={campo.chave} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                                <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{campo.rotulo}</span>
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

                        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 md:col-span-2 xl:col-span-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">Semana do DDS</p>
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

                <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-emerald-700 ring-1 ring-emerald-100">
                            <QrCode className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-emerald-950">QR de conferência</h2>
                            <p className="text-sm font-semibold text-emerald-800">O QR valida o documento. A assinatura continua manual.</p>
                        </div>
                    </div>
                    <div className="mt-4 rounded-2xl bg-white p-4 text-sm font-bold leading-6 text-slate-600 ring-1 ring-emerald-100">
                        A folha semanal terá domingo a sábado, assinatura/rubrica nos dias e uma coluna final Presente com quadrado para marcação.
                    </div>
                </div>

                <div className="rounded-3xl border border-cyan-100 bg-cyan-50 p-5 shadow-sm">
                    <div
                        onClick={() => alternarCardDds("conferencia")}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("conferencia"); }}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl transition hover:bg-white/50"
                    >
                        <div className="flex items-center gap-3">
                            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-cyan-700 ring-1 ring-cyan-100">
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
                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
                            <form
                                onSubmit={buscarRegistroScannerDds}
                                className="rounded-2xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50"
                            >
                                <label className="block">
                                    <span className="text-[11px] font-black uppercase tracking-wide text-cyan-700">
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
                                        className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {carregandoScannerDds ? "Buscando..." : "Buscar registro"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCodigoConferenciaDds(dadosDds.codigo || "")}
                                        className="rounded-xl border border-cyan-200 bg-white px-4 py-2 text-xs font-black text-cyan-800 shadow-sm transition hover:bg-cyan-50"
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

                            <div className="rounded-2xl border border-cyan-100 bg-white p-4 text-sm font-bold leading-6 text-slate-600 ring-1 ring-cyan-50">
                                <p className="font-black text-cyan-900">Primeira etapa do scanner DDS</p>
                                <p className="mt-1">
                                    Nesta etapa o sistema carrega o gabarito digital salvo na impressão. Depois vamos anexar a folha assinada e comparar presença/assinaturas por linha.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50 lg:col-span-2">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                    <div>
                                        <p className="text-[11px] font-black uppercase tracking-wide text-cyan-700">
                                            Folha assinada
                                        </p>
                                        <h3 className="mt-1 text-lg font-black text-slate-950">
                                            Upload da folha DDS assinada
                                        </h3>
                                        <p className="mt-1 text-sm font-semibold text-slate-500">
                                            Anexe o PDF escaneado ou a foto da folha assinada. A leitura automática será adicionada na próxima etapa.
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
                                        <span className="text-[11px] font-black uppercase tracking-wide text-cyan-700">
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
                                        className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
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

                                        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                                            <div>
                                                <p className="text-xs font-black text-slate-900">Leitura inicial do arquivo</p>
                                                <p className="mt-1 text-xs font-bold text-slate-500">
                                                    Executa leitura local do PDF/imagem para identificar texto, páginas e linhas. Ainda não valida assinatura nem presença.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={executarLeituraArquivoScannerDds}
                                                disabled={!arquivoScannerDds || carregandoLeituraArquivoScannerDds}
                                                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-black text-white shadow-sm transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                                            >
                                                {carregandoLeituraArquivoScannerDds ? "Lendo arquivo..." : "Ler arquivo anexado"}
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
                                    <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 ring-1 ring-indigo-50">
                                        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-indigo-700">
                                                    Diagnóstico inicial do arquivo
                                                </p>
                                                <h4 className="mt-1 text-base font-black text-slate-950">
                                                    Leitura executada
                                                </h4>
                                                <p className="mt-1 text-xs font-bold text-slate-600">
                                                    Resultado técnico de apoio. A conferência de assinatura/presença será feita nas próximas etapas.
                                                </p>
                                            </div>
                                            <span className="rounded-xl border border-indigo-200 bg-white px-3 py-2 text-xs font-black text-indigo-800">
                                                {String(leituraArquivoScannerDds.tipoLeitura || "leitura_inicial").replace(/_/g, " ")}
                                            </span>
                                        </div>

                                        <div className="mt-4 grid gap-2 sm:grid-cols-4">
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Páginas lidas</p>
                                                <p className="mt-1 text-lg font-black text-slate-950">
                                                    {leituraArquivoScannerDds.paginasLidas || 0}/{leituraArquivoScannerDds.totalPaginas || 0}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Linhas OCR</p>
                                                <p className="mt-1 text-lg font-black text-slate-950">{linhasLeituraArquivoScannerDds.length}</p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Texto</p>
                                                <p className="mt-1 text-lg font-black text-slate-950">
                                                    {qualidadeLeituraArquivoScannerDds.textoStatus}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Confiança</p>
                                                <p className="mt-1 text-lg font-black text-slate-950">
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

                                        {textoPreviaArquivoScannerDds && (
                                            <div className="mt-4 rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Prévia do texto lido</p>
                                                <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-700">
                                                    {textoPreviaArquivoScannerDds}
                                                </pre>
                                            </div>
                                        )}

                                        {avisosLeituraArquivoScannerDds.length > 0 && (
                                            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
                                                <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Avisos da leitura</p>
                                                <ul className="mt-2 space-y-1 text-xs font-bold text-amber-800">
                                                    {avisosLeituraArquivoScannerDds.slice(0, 6).map((aviso, indice) => (
                                                        <li key={`aviso-leitura-dds-${indice}`}>• {aviso}</li>
                                                    ))}
                                                </ul>
                                            </div>
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
                                    <div className="mt-4 rounded-2xl border border-cyan-100 bg-white p-4 ring-1 ring-cyan-50">
                                        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                            <div>
                                                <p className="text-[11px] font-black uppercase tracking-wide text-cyan-700">
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
                                                <p className="mt-1 truncate text-sm font-black text-slate-900" title={`${diagnosticoEstruturalScannerDds.empresaEsperada || "-"} · ${diagnosticoEstruturalScannerDds.obraEsperada || "-"}`}>
                                                    {diagnosticoEstruturalScannerDds.empresaEsperada || "-"} · {diagnosticoEstruturalScannerDds.obraEsperada || "-"}
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
<div className="rounded-2xl border border-violet-100 bg-white p-4 ring-1 ring-violet-50 lg:col-span-2">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
            <p className="text-[11px] font-black uppercase tracking-wide text-violet-700">
                Pré-conferência de presença
            </p>
            <h4 className="mt-1 text-base font-black text-slate-950">
                Participantes do gabarito x leitura da folha
            </h4>
            <p className="mt-1 text-xs font-bold text-slate-500">
                Conferência técnica auxiliar. Não valida assinatura, biometria ou grafia; indica apenas localização provável por texto/código quando a leitura permite.
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
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
            <p className="mt-1 text-lg font-black text-slate-950">{preConferenciaParticipantesScannerDds.total}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-emerald-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">Localizados</p>
            <p className="mt-1 text-lg font-black text-emerald-900">{preConferenciaParticipantesScannerDds.localizados}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3 ring-1 ring-amber-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-amber-700">Conferência manual</p>
            <p className="mt-1 text-lg font-black text-amber-900">{preConferenciaParticipantesScannerDds.manuais}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-3 ring-1 ring-red-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-red-700">Não localizados</p>
            <p className="mt-1 text-lg font-black text-red-900">{preConferenciaParticipantesScannerDds.naoLocalizados}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Pendentes</p>
            <p className="mt-1 text-lg font-black text-slate-950">{preConferenciaParticipantesScannerDds.pendentes}</p>
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
                        <th className="px-3 py-2">Status provável</th>
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
                                        : participante.status === "manual"
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

{registroScannerDds && (
                                <div className="rounded-2xl border border-emerald-100 bg-white p-4 ring-1 ring-emerald-50 lg:col-span-2">
                                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                        <div>
                                            <p className="text-[11px] font-black uppercase tracking-wide text-emerald-700">
                                                Registro localizado
                                            </p>
                                            <h3 className="mt-1 text-xl font-black text-slate-950">
                                                {registroScannerDds.codigo}
                                            </h3>
                                            <p className="mt-1 text-sm font-semibold text-slate-600">
                                                {registroScannerDds.empresaNome || "Empresa não informada"} · {registroScannerDds.obraNome || "Obra não informada"}
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
                                            <p className="mt-1 text-lg font-black text-slate-950">{participantesRegistroScannerDds.length}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Dias DDS</p>
                                            <p className="mt-1 text-lg font-black text-slate-950">{diasRegistroScannerDds.length || 7}</p>
                                        </div>
                                        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Status</p>
                                            <p className="mt-1 text-lg font-black text-emerald-700">Gabarito carregado</p>
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


            <section className="dds-no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div
                    onClick={() => alternarCardDds("temas")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("temas"); }}
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl transition hover:bg-slate-50 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                            Editor dos temas do DDS
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">
                            Temas por dia da semana
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Ajuste o tema e o responsável de cada dia antes de imprimir. A folha impressa será atualizada automaticamente.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                        <button
                            type="button"
                            onClick={restaurarTemasPadraoDds}
                            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                        >
                            Restaurar temas padrão
                        </button>

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
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-3"
                        >
                            <div className="rounded-xl bg-slate-950 px-3 py-2 text-center text-white">
                                <p className="text-[11px] font-black uppercase tracking-wide">
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

            <section className="dds-no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div
                    onClick={() => alternarCardDds("recados")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("recados"); }}
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl transition hover:bg-slate-50 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                            Editor de recados do DDS
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">
                            Recados e pontos reforçados da semana
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            O texto abaixo será impresso no rodapé do DDS. Se apagar, o campo fica em branco.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setRecadosDdsEditaveis("")}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
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
                    className="mt-4 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                />
                )}
            </section>

            <section className="dds-no-print rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div
                    onClick={() => alternarCardDds("orientacoes")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(evento) => { if (evento.key === "Enter" || evento.key === " ") alternarCardDds("orientacoes"); }}
                    className="flex cursor-pointer flex-col gap-3 rounded-2xl transition hover:bg-slate-50 lg:flex-row lg:items-start lg:justify-between"
                >
                    <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-600">
                            Editor de orientações importantes do DDS
                        </p>
                        <h2 className="mt-1 text-lg font-black text-slate-950">
                            Orientações importantes
                        </h2>
                        <p className="mt-1 text-sm font-semibold text-slate-500">
                            Ajuste as orientações que serão impressas no rodapé do DDS.
                        </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap items-center gap-2" onClick={(evento) => evento.stopPropagation()}>
                    <button
                        type="button"
                        onClick={restaurarOrientacoesPadraoDds}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-black text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
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
                            className="block rounded-2xl border border-slate-200 bg-slate-50 p-3"
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
            <div className="dds-print-area space-y-6">
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