import React, { useEffect, useMemo, useState } from "react";
import {
    BookOpen,
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

function normalizarParticipantesDdsSistema(colaboradores = []) {
    const base = Array.isArray(colaboradores) ? colaboradores : [];

    return base
        .map((colaborador, indice) => ({
            numero: indice + 1,
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
        .filter((participante) => participante.nome && participante.nome !== "-");
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

function DdsPreviewImpresso({ participantes = participantesDds, mostrarAssinaturas = true, dadosDds = dadosDdsPadrao, diasSemana = diasDds, aniversariantes = aniversariantesDds }) {
    return (
        <section className="dds-print-page overflow-hidden rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="overflow-x-auto">
                <div className="dds-print-sheet mx-auto min-w-[1180px] max-w-[1320px] rounded-2xl border border-slate-300 bg-white p-4 text-slate-950">
                    <header className="grid grid-cols-[260px_minmax(0,1fr)_360px] items-center gap-4 border-b border-slate-300 pb-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                                <ShieldCheck className="h-10 w-10" />
                            </div>
                            <div>
                                <p className="text-4xl font-black leading-none text-slate-950">SafeScan</p>
                                <p className="text-2xl font-black uppercase tracking-[0.22em] text-emerald-700">Brasil</p>
                            </div>
                        </div>

                        <div className="text-center">
                            <h2 className="text-4xl font-black uppercase tracking-tight text-slate-950">DDS Semanal de Obra</h2>
                            <p className="mt-1 text-2xl font-black uppercase text-emerald-700">Diálogo Diário de Segurança</p>
                            <p className="mt-1 text-sm font-semibold text-slate-500">Segurança se faz todos os dias. Prevenção, atenção e cuidado.</p>
                        </div>

                        <div className="grid grid-cols-[1fr_94px] gap-3">
                            <div className="rounded-2xl border border-slate-300 p-3">
                                <p className="text-[9px] font-black uppercase text-slate-500">Semana</p>
                                <p className="text-lg font-black text-slate-950">{dadosDds.periodo}</p>
                                <p className="mt-2 text-[9px] font-black uppercase text-slate-500">Código do DDS</p>
                                <p className="rounded-lg bg-slate-950 px-2 py-1 text-center text-sm font-black text-white">{dadosDds.codigo}</p>
                            </div>
                            <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-300 p-2 text-center">
                                <QrCode className="h-14 w-14 text-slate-950" />
                                <p className="mt-1 text-[8px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
                            </div>
                        </div>
                    </header>

                    <section className="mt-3 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-300">
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

                    <section className="mt-3 overflow-hidden rounded-xl border border-slate-300">
                        <div className="bg-slate-950 py-1.5 text-center text-xs font-black uppercase tracking-wide text-white">
                            Temas do DDS por dia da semana
                        </div>
                        <table className="w-full table-fixed border-collapse text-center text-[11px]">
                            <thead>
                                <tr className="bg-slate-900 text-white">
                                    {diasSemana.map((dia) => (
                                        <th key={dia.curto} className="w-[14.285%] border border-slate-400 px-2 py-2">
                                            <span className="block text-xs font-black uppercase">{dia.nome}</span>
                                            <span className="block text-[11px] font-black text-emerald-300">{dia.data}</span>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    {diasSemana.map((dia) => (
                                        <td key={dia.curto} className="h-16 w-[14.285%] border border-slate-300 px-3 py-2 align-middle font-bold leading-tight">
                                            {dia.tema}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    {diasSemana.map((dia) => (
                                        <td key={dia.curto} className="w-[14.285%] border border-slate-300 px-3 py-1.5 text-[10px] font-black text-slate-700">
                                            {dia.responsavel}
                                        </td>
                                    ))}
                                </tr>
                            </tbody>
                        </table>
                    </section>

                    <section className="mt-3 overflow-hidden rounded-xl border border-slate-300">
                        <table className="w-full border-collapse text-[10px]">
                            <thead>
                                <tr className="bg-slate-950 text-white">
                                    <th className="w-10 border border-slate-400 px-1 py-2">Nº</th>
                                    <th className="w-[230px] border border-slate-400 px-2 py-2">Funcionário</th>
                                    <th className="w-[150px] border border-slate-400 px-2 py-2">Função</th>
                                    <th className="w-[140px] border border-slate-400 px-2 py-2">Empresa</th>
                                    {diasSemana.map((dia) => (
                                        <th key={dia.curto} className="w-[72px] border border-slate-400 px-1 py-2">
                                            <span className="block">{dia.curto}</span>
                                            <span className="block text-[9px] text-emerald-300">{dia.data.slice(0, 5)}</span>
                                        </th>
                                    ))}
                                    <th className="w-[74px] border border-slate-400 px-1 py-2">Presente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {participantes.map((participante, indice) => (
                                    <tr key={participante.nome || `linha-em-branco-${participante.numero}`} className="odd:bg-white even:bg-slate-50">
                                        <td className="border border-slate-300 px-1 py-1 text-center font-black">{participante.numero || indice + 1}</td>
                                        <td className="border border-slate-300 px-2 py-1 font-semibold">{participante.nome}</td>
                                        <td className="border border-slate-300 px-2 py-1 text-center font-semibold">{participante.funcao}</td>
                                        <td className="border border-slate-300 px-2 py-1 text-center font-semibold">{participante.empresa}</td>
                                        {diasSemana.map((dia) => (
                                            <td key={dia.curto} className="border border-slate-300 px-1 py-1 text-center">
                                                <span className="block h-5" />
                                            </td>
                                        ))}
                                        <td className="border border-slate-300 px-1 py-1 text-center">
                                            <QuadradoPresenca />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    <footer className="dds-folha1-footer mt-3 space-y-3">
                        <div className="dds-folha1-complementos grid gap-3 lg:grid-cols-[0.82fr_1.1fr_1fr]">
                            <div className="rounded-xl border border-emerald-600 p-2.5">
                                <div className="flex items-center gap-2">
                                    <Gift className="h-5 w-5 text-emerald-700" />
                                    <p className="text-sm font-black uppercase text-emerald-700">Aniversariantes da semana</p>
                                </div>

                                <div className="mt-2 space-y-1 text-[10px] font-bold text-slate-800">
                                    {aniversariantes.map((item) => (
                                        <div key={item.nome} className="grid grid-cols-[48px_1fr] items-center gap-3">
                                            <span>{item.data}</span>
                                            <span className="border-b border-slate-500 pb-0.5">{item.nome}</span>
                                        </div>
                                    ))}

                                    {Array.from({ length: Math.max(0, 3 - aniversariantesDds.length) }).map((_, indice) => (
                                        <div key={`aniversariante-vazio-${indice}`} className="grid grid-cols-[48px_1fr] items-center gap-3">
                                            <span>&nbsp;</span>
                                            <span className="border-b border-slate-500 pb-0.5">&nbsp;</span>
                                        </div>
                                    ))}
                                </div>

                                <p className="mt-2 text-center text-[10px] font-bold leading-4 text-emerald-700">
                                    Parabéns aos aniversariantes da semana.<br />
                                    Segurança também é cuidar das pessoas.
                                </p>
                            </div>

                            <div className="rounded-xl border border-emerald-600 p-2.5">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="h-5 w-5 text-emerald-700" />
                                    <p className="text-sm font-black uppercase text-emerald-700">Recados e pontos reforçados na semana</p>
                                </div>

                                <div className="mt-2 space-y-1.5">
                                    {Array.from({ length: 5 }).map((_, indice) => (
                                        <div key={`recado-dds-${indice}`} className="h-3 border-b border-slate-400" />
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl border border-slate-300 p-2.5">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck className="h-5 w-5 text-emerald-700" />
                                    <p className="text-sm font-black uppercase text-emerald-700">Orientações importantes</p>
                                </div>

                                <div className="mt-2 space-y-1 text-[10px] font-bold leading-4 text-slate-800">
                                    {[
                                        "Use sempre seus EPIs adequadamente.",
                                        "Siga os procedimentos e ordens de serviço.",
                                        "Mantenha o canteiro limpo e organizado.",
                                        "Em caso de dúvida, pare e pergunte.",
                                        "Segurança é responsabilidade de todos!",
                                    ].map((orientacao) => (
                                        <div key={orientacao} className="flex items-start gap-2">
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
                                    <p className="text-sm font-black uppercase text-emerald-700">Encarregado</p>
                                    <div className="mx-auto mt-10 w-[82%] border-b border-slate-800" />
                                    <p className="mt-2 text-[10px] font-bold uppercase text-slate-600">Nome / Assinatura</p>
                                    <p className="mt-5 text-[10px] font-bold text-slate-700">Data: ____/____/______</p>
                                </div>
                            </div>
                        )}
                    </footer>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-300 pt-2 text-[10px] font-black uppercase text-slate-600">
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
                        <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                                <ShieldCheck className="h-7 w-7" />
                            </div>
                            <div>
                                <p className="text-2xl font-black leading-none text-slate-950">SafeScan</p>
                                <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-700">Brasil</p>
                            </div>
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
                                <QrCode className="h-12 w-12 text-slate-950" />
                                <p className="mt-1 text-[7px] font-black uppercase leading-tight text-emerald-700">QR de conferência</p>
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
                                            <td key={dia.curto} className="border border-slate-300 px-1 py-1.5 text-center">
                                                <span className="block h-5" />
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
                        padding: 14px !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        background: #ffffff !important;
                        transform: none !important;
                        transform-origin: center center !important;
                    }

                    .dds-print-area .dds-print-page:first-child .dds-print-sheet {
                        zoom: 0.835 !important;
                    }

                    .dds-print-area .dds-print-page:not(:first-child) .dds-print-sheet {
                        zoom: 0.84 !important;
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

    const colaboradoresEmpresaDds = useMemo(
        () => filtrarColaboradoresPorEmpresaDds(colaboradores, empresaSelecionadaDds),
        [colaboradores, empresaSelecionadaDds]
    );

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
                            onClick={() => window.print()}
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
                    <div className="flex items-center gap-3">
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                            <Building2 className="h-5 w-5" />
                        </span>
                        <div>
                            <h2 className="text-lg font-black text-slate-950">Novo DDS semanal</h2>
                            <p className="text-sm font-semibold text-slate-500">Preencha os dados principais do DDS. A impressão será atualizada automaticamente.</p>
                        </div>
                    </div>

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
            </section>

            <div className="dds-print-area space-y-6">
                <DdsPreviewImpresso
                    participantes={primeiraFolhaParticipantes}
                    mostrarAssinaturas={totalFolhasDds === 1}
                    dadosDds={dadosDds}
                    diasSemana={diasSemanaDds}
                    aniversariantes={aniversariantesDds}
                />

                {folhasContinuacaoDds.map((participantes, indice) => (
                    <DdsPreviewImpressoContinuacao
                        key={`folha-dds-${indice + 2}`}
                        participantes={participantes}
                        dadosDds={dadosDds}
                        diasSemana={diasSemanaDds}
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