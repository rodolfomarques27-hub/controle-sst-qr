import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { classNames } from "../../utils/sstUtils";
import { emitirFeedbackSafeScan } from "../../services/safeScanFeedbackService";

const COLUNAS_MODELO_IMPORTACAO = [
    "nome",
    "empresa_terceirizada",
    "funcao",
    "cpf",
    "telefone",
    "data_nascimento",
    "data_admissao",
    "matricula_esocial",
    "contato_emergencia_nome",
    "contato_emergencia_parentesco",
    "contato_emergencia_telefone",
    "mostrar_aniversario_dashboard",
    "status_mobilizacao",
];

const STATUS_MOBILIZACAO_VALIDOS = [
    "Liberado",
    "Com pendência",
    "Bloqueado",
    "Em análise",
    "Desmobilizado",
    "Inativo",
];

const APELIDOS_COLUNAS = {
    nome: "nome",
    "nome completo": "nome",
    funcionario: "nome",
    funcionário: "nome",
    colaborador: "nome",

    empresa: "empresa_terceirizada",
    "empresa terceirizada": "empresa_terceirizada",
    "empresa_terceirizada": "empresa_terceirizada",
    terceirizada: "empresa_terceirizada",

    funcao: "funcao",
    "função": "funcao",
    cargo: "funcao",

    cpf: "cpf",
    telefone: "telefone",
    celular: "telefone",
    whatsapp: "telefone",

    "data nascimento": "data_nascimento",
    "data_nascimento": "data_nascimento",
    nascimento: "data_nascimento",
    "data de nascimento": "data_nascimento",

    "data admissao": "data_admissao",
    "data_admissao": "data_admissao",
    "data admissão": "data_admissao",
    "data de admissão": "data_admissao",
    "data de admissao": "data_admissao",
    admissao: "data_admissao",
    admissão: "data_admissao",

    matricula: "matricula_esocial",
    "matrícula": "matricula_esocial",
    "matricula esocial": "matricula_esocial",
    "matrícula esocial": "matricula_esocial",
    "matricula_esocial": "matricula_esocial",
    esocial: "matricula_esocial",

    "contato emergencia nome": "contato_emergencia_nome",
    "contato emergência nome": "contato_emergencia_nome",
    "contato_emergencia_nome": "contato_emergencia_nome",
    "nome contato emergencia": "contato_emergencia_nome",
    "nome do contato": "contato_emergencia_nome",

    "contato emergencia parentesco": "contato_emergencia_parentesco",
    "contato emergência parentesco": "contato_emergencia_parentesco",
    "contato_emergencia_parentesco": "contato_emergencia_parentesco",
    parentesco: "contato_emergencia_parentesco",

    "contato emergencia telefone": "contato_emergencia_telefone",
    "contato emergência telefone": "contato_emergencia_telefone",
    "contato_emergencia_telefone": "contato_emergencia_telefone",
    "telefone emergencia": "contato_emergencia_telefone",
    "telefone emergência": "contato_emergencia_telefone",

    aniversario: "mostrar_aniversario_dashboard",
    aniversário: "mostrar_aniversario_dashboard",
    "mostrar aniversario dashboard": "mostrar_aniversario_dashboard",
    "mostrar aniversário dashboard": "mostrar_aniversario_dashboard",
    "mostrar_aniversario_dashboard": "mostrar_aniversario_dashboard",

    status: "status_mobilizacao",
    "status mobilizacao": "status_mobilizacao",
    "status mobilização": "status_mobilizacao",
    "status_mobilizacao": "status_mobilizacao",
};

function normalizarTextoImportacao(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function normalizarChaveColuna(valor = "") {
    const texto = normalizarTextoImportacao(valor);
    return APELIDOS_COLUNAS[texto] || texto.replace(/\s+/g, "_");
}

function apenasDigitos(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function formatarCpf(valor = "") {
    const digitos = apenasDigitos(valor).slice(0, 11);

    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;

    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

function formatarTelefone(valor = "") {
    const digitos = apenasDigitos(valor).slice(0, 11);

    if (!digitos) return "";
    if (digitos.length <= 2) return `(${digitos}`;
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}

function formatarDataImportacao(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (iso) {
        return `${iso[3]}/${iso[2]}/${iso[1]}`;
    }

    const digitos = apenasDigitos(texto).slice(0, 8);

    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

    const dia = digitos.slice(0, 2);
    const mes = digitos.slice(2, 4);
    const ano = digitos.slice(4, 8);

    return `${dia}/${mes}/${ano}`;
}

function validarDataImportacao(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

    if (!partes) return "use o formato dd/mm/aaaa";

    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    const ano = Number(partes[3]);

    if (ano < 1950 || ano > 2099) return "ano fora do intervalo 1950 a 2099";
    if (mes < 1 || mes > 12) return "mês inválido";
    if (dia < 1 || dia > 31) return "dia inválido";

    const data = new Date(ano, mes - 1, dia);

    if (data.getFullYear() !== ano || data.getMonth() !== mes - 1 || data.getDate() !== dia) {
        return "data inválida";
    }

    return "";
}

function normalizarBooleano(valor = "") {
    const texto = normalizarTextoImportacao(valor);

    if (!texto) return true;
    if (["sim", "s", "true", "1", "yes", "y"].includes(texto)) return true;
    if (["nao", "não", "n", "false", "0", "no"].includes(texto)) return false;

    return true;
}

function normalizarStatusMobilizacao(valor = "") {
    const texto = normalizarTextoImportacao(valor);

    if (!texto) return "";

    return STATUS_MOBILIZACAO_VALIDOS.find((status) => normalizarTextoImportacao(status) === texto) || valor.trim();
}

function detectarSeparador(linha = "") {
    const separadores = [";", "\t", ","];
    const contagem = separadores.map((separador) => ({
        separador,
        total: linha.split(separador).length,
    }));

    return contagem.sort((a, b) => b.total - a.total)[0]?.separador || ";";
}

function quebrarLinhaCsv(linha = "", separador = ";") {
    const celulas = [];
    let atual = "";
    let dentroAspas = false;

    for (let indice = 0; indice < linha.length; indice += 1) {
        const caractere = linha[indice];
        const proximo = linha[indice + 1];

        if (caractere === '"' && dentroAspas && proximo === '"') {
            atual += '"';
            indice += 1;
            continue;
        }

        if (caractere === '"') {
            dentroAspas = !dentroAspas;
            continue;
        }

        if (caractere === separador && !dentroAspas) {
            celulas.push(atual.trim());
            atual = "";
            continue;
        }

        atual += caractere;
    }

    celulas.push(atual.trim());

    return celulas;
}

function parsePlanilhaTexto(conteudo = "") {
    const linhas = String(conteudo || "")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((linha) => linha.trim());

    if (linhas.length < 2) {
        throw new Error("A planilha precisa ter cabeçalho e pelo menos uma linha preenchida.");
    }

    const separador = detectarSeparador(linhas[0]);
    const cabecalhos = quebrarLinhaCsv(linhas[0], separador).map(normalizarChaveColuna);

    return linhas.slice(1).map((linha, indice) => {
        const celulas = quebrarLinhaCsv(linha, separador);
        const item = { linha: indice + 2 };

        cabecalhos.forEach((cabecalho, posicao) => {
            item[cabecalho] = celulas[posicao] || "";
        });

        return item;
    });
}

function prepararLinhaImportacao(linha = {}, cpfsArquivo = new Map(), cpfsExistentes = new Set()) {
    const cpf = formatarCpf(linha.cpf || "");
    const telefone = formatarTelefone(linha.telefone || "");
    const contatoEmergenciaTelefone = formatarTelefone(linha.contato_emergencia_telefone || "");
    const dataNascimento = formatarDataImportacao(linha.data_nascimento || "");
    const dataAdmissao = formatarDataImportacao(linha.data_admissao || "");
    const statusMobilizacao = normalizarStatusMobilizacao(linha.status_mobilizacao || "");
    const erros = [];

    if (!String(linha.nome || "").trim()) erros.push("nome obrigatório");
if (!String(linha.funcao || "").trim()) erros.push("função obrigatória");

    if (cpf && apenasDigitos(cpf).length !== 11) erros.push("CPF incompleto");
    if (telefone && ![10, 11].includes(apenasDigitos(telefone).length)) erros.push("telefone principal incompleto");
    if (contatoEmergenciaTelefone && ![10, 11].includes(apenasDigitos(contatoEmergenciaTelefone).length)) erros.push("telefone de emergência incompleto");

    const erroNascimento = validarDataImportacao(dataNascimento);
    const erroAdmissao = validarDataImportacao(dataAdmissao);

    if (erroNascimento) erros.push(`data de nascimento: ${erroNascimento}`);
    if (erroAdmissao) erros.push(`data de admissão: ${erroAdmissao}`);

    if (statusMobilizacao && !STATUS_MOBILIZACAO_VALIDOS.includes(statusMobilizacao)) {
        erros.push("status de mobilização inválido");
    }

    const cpfDigitos = apenasDigitos(cpf);

    if (cpfDigitos) {
        if ((cpfsArquivo.get(cpfDigitos) || 0) > 1) erros.push("CPF duplicado na planilha");
        if (cpfsExistentes.has(cpfDigitos)) erros.push("CPF já existe na base");
    }

    return {
        linha: linha.linha,
        nome: String(linha.nome || "").trim(),
        empresaNome: String(linha.empresa_terceirizada || "").trim(),
        funcao: String(linha.funcao || "").trim(),
        matricula: String(linha.matricula_esocial || "").trim(),
        cpf,
        telefone,
        dataNascimento,
        dataAdmissao,
        contatoEmergenciaNome: String(linha.contato_emergencia_nome || "").trim(),
        contatoEmergenciaParentesco: String(linha.contato_emergencia_parentesco || "").trim(),
        contatoEmergenciaTelefone,
        mostrarAniversarioDashboard: normalizarBooleano(linha.mostrar_aniversario_dashboard || ""),
        statusMobilizacao: statusMobilizacao || "Liberado",
        erros,
        valido: erros.length === 0,
    };
}

function montarConteudoModeloCsv() {
    const linhas = [
        COLUNAS_MODELO_IMPORTACAO.join(";"),
        [
            "JOAO DA SILVA",
            "EMPRESA EXEMPLO LTDA",
            "PEDREIRO",
            "000.000.000-00",
            "(12) 99999-9999",
            "27/11/1991",
            "01/06/2026",
            "MAT-001",
            "MARIA DA SILVA",
            "ESPOSA",
            "(12) 98888-7777",
            "sim",
            "Liberado",
        ].join(";"),
    ];

    return `\uFEFF${linhas.join("\r\n")}`;
}

function baixarModeloCsv() {
    const blob = new Blob([montarConteudoModeloCsv()], {
        type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "modelo-importacao-colaboradores-safescan.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
}

export function ImportacaoMassaColaboradores({
    colaboradores = [],
    empresasBanco = [],
    podeCadastrar = true,
    mensagemBloqueio = "Sem permissão para cadastrar colaboradores.",
    onImportar,
    importando = false,
}) {
    const inputRef = useRef(null);
    const disparoImportacaoRef = useRef(false);
    const [arquivoNome, setArquivoNome] = useState("");
    const [linhas, setLinhas] = useState([]);
    const [erroLeitura, setErroLeitura] = useState("");
    const [resultado, setResultado] = useState(null);
    const [progressoImportacao, setProgressoImportacao] = useState(null);
    const [empresaSelecionadaId, setEmpresaSelecionadaId] = useState("");

    const cpfsExistentes = useMemo(() => {
        return new Set(
            (colaboradores || [])
                .map((colaborador) => apenasDigitos(colaborador.cpf || colaborador.cpf_colaborador || ""))
                .filter(Boolean)
        );
    }, [colaboradores]);

    const empresasDisponiveis = useMemo(() => {
        const mapa = new Map();

        const adicionarEmpresa = (empresa) => {
            const id = String(empresa?.id || empresa?.empresaId || empresa?.empresa_id || "").trim();
            const nome = String(empresa?.nome || empresa?.empresa || empresa?.empresaNome || empresa?.empresa_nome || "").trim();

            if (!id || !nome) return;

            mapa.set(id, {
                id,
                nome,
            });
        };

        (empresasBanco || []).forEach(adicionarEmpresa);

        if (mapa.size === 0) {
            (colaboradores || []).forEach((colaborador) => {
                adicionarEmpresa({
                    id: colaborador.empresaId || colaborador.empresa_id,
                    nome: colaborador.empresa || colaborador.empresaNome || colaborador.empresa_nome,
                });
            });
        }

        return Array.from(mapa.values())
            .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR"));
    }, [empresasBanco, colaboradores]);

    const empresaSelecionada = useMemo(() => {
        return empresasDisponiveis.find((empresa) => String(empresa.id) === String(empresaSelecionadaId)) || null;
    }, [empresasDisponiveis, empresaSelecionadaId]);

    const resumo = useMemo(() => {
        const validos = linhas.filter((linha) => linha.valido).length;
        const erros = linhas.length - validos;

        return {
            total: linhas.length,
            validos,
            erros,
        };
    }, [linhas]);

    const limpar = () => {
        if (importando || disparoImportacaoRef.current) return;

        setArquivoNome("");
        setLinhas([]);
        setErroLeitura("");
        setResultado(null);
        setProgressoImportacao(null);

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const processarArquivo = async (evento) => {
        if (importando || disparoImportacaoRef.current) {
            if (evento?.target) evento.target.value = "";
            return;
        }

        const arquivo = evento.target.files?.[0];

        setErroLeitura("");
        setResultado(null);
        setProgressoImportacao(null);
        setLinhas([]);

        if (!arquivo) return;

        setArquivoNome(arquivo.name);

        try {
            const texto = await arquivo.text();
            const linhasBrutas = parsePlanilhaTexto(texto);
            const cpfsArquivo = new Map();

            linhasBrutas.forEach((linha) => {
                const cpf = apenasDigitos(linha.cpf || "");
                if (!cpf) return;

                cpfsArquivo.set(cpf, (cpfsArquivo.get(cpf) || 0) + 1);
            });

            const normalizadas = linhasBrutas.map((linha) => prepararLinhaImportacao(linha, cpfsArquivo, cpfsExistentes));

            setLinhas(normalizadas);
        } catch (error) {
            setErroLeitura(error.message || "Não foi possível ler a planilha.");
        }
    };

    const importar = async () => {
        if (disparoImportacaoRef.current || importando) return;

        if (!podeCadastrar) {
            emitirFeedbackSafeScan({
                tipo: "atencao",
                titulo: "Importação não permitida",
                mensagem: mensagemBloqueio,
            });
            return;
        }

        const validos = linhas.filter((linha) => linha.valido);

        if (validos.length === 0) {
            emitirFeedbackSafeScan({
                tipo: "atencao",
                titulo: "Nenhuma linha válida",
                mensagem: "Nenhuma linha válida para importar.",
            });
            return;
        }

        if (!empresaSelecionada) {
            emitirFeedbackSafeScan({
                tipo: "atencao",
                titulo: "Empresa do lote não selecionada",
                mensagem: "Selecione a empresa do lote antes de importar.",
            });
            return;
        }

        const validosComEmpresa = validos.map((linha) => ({
            ...linha,
            empresaId: empresaSelecionada.id,
            empresaNome: empresaSelecionada.nome,
        }));

        disparoImportacaoRef.current = true;
        setResultado(null);
        setProgressoImportacao({
            total: validosComEmpresa.length,
            processados: 0,
            cadastrados: 0,
            erros: 0,
            percentual: 0,
        });

        try {
            const resposta = await onImportar?.(
                validosComEmpresa,
                (progressoAtual = {}) => {
                    const total =
                        Number(progressoAtual.total) ||
                        validosComEmpresa.length;

                    const processados =
                        Number(progressoAtual.processados) ||
                        0;

                    const cadastrados =
                        Number(progressoAtual.cadastrados) ||
                        0;

                    const erros =
                        Number(progressoAtual.erros) ||
                        0;

                    let percentual =
                        Number(progressoAtual.percentual);

                    if (!Number.isFinite(percentual)) {
                        percentual =
                            total > 0
                                ? Math.round((processados / total) * 100)
                                : 0;
                    }

                    percentual =
                        Math.min(
                            100,
                            Math.max(
                                0,
                                percentual
                            )
                        );

                    setProgressoImportacao({
                        total,
                        processados,
                        cadastrados,
                        erros,
                        percentual,
                    });
                }
            );

            setResultado(resposta || null);

            if (resposta) {
                const totalErros =
                    Array.isArray(resposta.erros)
                        ? resposta.erros.length
                        : 0;

                emitirFeedbackSafeScan({
                    tipo:
                        totalErros > 0
                            ? "atencao"
                            : "sucesso",
                    titulo:
                        totalErros > 0
                            ? "Importação concluída com ressalvas"
                            : "Importação concluída",
                    mensagem:
                        totalErros > 0
                            ? `Cadastrados: ${resposta.sucesso || 0}. Não cadastrados: ${totalErros}.`
                            : `${resposta.sucesso || 0} colaborador(es) cadastrado(s) com sucesso.`,
                });
            }
        } finally {
            disparoImportacaoRef.current = false;
        }
    };

    return (
        <section className="colaboradores-importacao-card colaboradores-importacao-card--planilha rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="colaboradores-importacao-card__header flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="colaboradores-importacao-card__icone flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
                        <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Cadastro em massa</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">Importar colaboradores por planilha</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Baixe o CSV, preencha e importe com pré-validação.
                        </p>
                    </div>
                </div>

                <div className="colaboradores-importacao-card__acoes flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={baixarModeloCsv}
                        className="colaboradores-importacao-card__botao colaboradores-importacao-card__botao--secundario inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Download className="h-4 w-4" />
                        Baixar modelo
                    </button>

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={!podeCadastrar || importando}
                        title={podeCadastrar ? "Selecionar planilha CSV" : mensagemBloqueio}
                        className="colaboradores-importacao-card__botao colaboradores-importacao-card__botao--primario inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        <Upload className="h-4 w-4" />
                        Selecionar CSV
                    </button>
                </div>
            </div>
<input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv,.txt"
                onChange={processarArquivo}
                disabled={importando}
                className="hidden"
            />

            {arquivoNome && (
                <>
                    <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                        <span className="truncate">
                            <strong>Arquivo:</strong> {arquivoNome}
                        </span>
                        <button
                            type="button"
                            onClick={limpar}
                            disabled={importando}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <X className="h-3.5 w-3.5" />
                            Limpar
                        </button>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <label className="block text-xs font-black uppercase tracking-wide text-blue-700">
                            EMPRESA DO LOTE
                        </label>
                        <select
                            value={empresaSelecionadaId}
                            onChange={(e) => setEmpresaSelecionadaId(e.target.value)}
                            disabled={!podeCadastrar || importando || empresasDisponiveis.length === 0}
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <option value="">Selecione a empresa cadastrada</option>
                            {empresasDisponiveis.map((empresa) => (
                                <option key={empresa.id} value={empresa.id}>
                                    {empresa.nome}
                                </option>
                            ))}
                        </select>
                        <p className="mt-2 text-xs font-semibold text-slate-500">
                            Todos os colaboradores válidos serão vinculados à empresa selecionada. A empresa escrita na planilha não cria cadastro automaticamente.
                        </p>
                    </div>
                </>
            )}

            {erroLeitura && (
                <div className="mt-4 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{erroLeitura}</span>
                </div>
            )}

            {linhas.length > 0 && (
                <div className="mt-5 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Linhas lidas</p>
                            <p className="mt-1 text-2xl font-black text-slate-950">{resumo.total}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
                            <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Válidas</p>
                            <p className="mt-1 text-2xl font-black text-emerald-700">{resumo.validos}</p>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-4 text-center ring-1 ring-red-100">
                            <p className="text-xs font-black uppercase tracking-wide text-red-700">Com erro</p>
                            <p className="mt-1 text-2xl font-black text-red-700">{resumo.erros}</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200">
                        <div className="max-h-80 overflow-auto">
                            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                                <thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-3 py-2 font-black">Linha</th>
                                        <th className="px-3 py-2 font-black">Status</th>
                                        <th className="px-3 py-2 font-black">Nome</th>
                                        <th className="px-3 py-2 font-black">Empresa</th>
                                        <th className="px-3 py-2 font-black">Função</th>
                                        <th className="px-3 py-2 font-black">CPF</th>
                                        <th className="px-3 py-2 font-black">Erros</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white">
                                    {linhas.slice(0, 80).map((linha) => (
                                        <tr key={`${linha.linha}-${linha.nome}-${linha.cpf}`} className={linha.valido ? "bg-white" : "bg-red-50/50"}>
                                            <td className="px-3 py-2 font-bold text-slate-500">{linha.linha}</td>
                                            <td className="px-3 py-2">
                                                <span
                                                    className={classNames(
                                                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black",
                                                        linha.valido
                                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                                            : "bg-red-50 text-red-700 ring-1 ring-red-100"
                                                    )}
                                                >
                                                    {linha.valido ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                                    {linha.valido ? "OK" : "Erro"}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 font-semibold text-slate-800">{linha.nome || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{empresaSelecionada?.nome || linha.empresaNome || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{linha.funcao || "-"}</td>
                                            <td className="px-3 py-2 text-slate-600">{linha.cpf || "-"}</td>
                                            <td className="px-3 py-2 text-red-700">{linha.erros.join("; ") || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {linhas.length > 80 && (
                        <p className="text-center text-xs font-semibold text-slate-500">
                            Prévia limitada às primeiras 80 linhas para manter a tela leve.
                        </p>
                    )}

                    {progressoImportacao && (
                        <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-100">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <p className="text-sm font-black text-slate-950">
                                        {importando ? "Importação em andamento" : "Progresso da última importação"}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Acompanhe o lote sem sair desta tela.
                                    </p>
                                </div>

                                <span className="rounded-full bg-white px-3 py-1 text-sm font-black text-blue-700 ring-1 ring-blue-100">
                                    {progressoImportacao.percentual || 0}%
                                </span>
                            </div>

                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white ring-1 ring-blue-100">
                                <div
                                    className="h-full rounded-full bg-blue-700 transition-all duration-200"
                                    style={{ width: `${progressoImportacao.percentual || 0}%` }}
                                />
                            </div>

                            <div className="mt-4 grid gap-3 sm:grid-cols-4">
                                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Total</p>
                                    <p className="mt-1 text-xl font-black text-slate-950">{progressoImportacao.total || 0}</p>
                                </div>

                                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Processados</p>
                                    <p className="mt-1 text-xl font-black text-blue-700">{progressoImportacao.processados || 0}</p>
                                </div>

                                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Cadastrados</p>
                                    <p className="mt-1 text-xl font-black text-emerald-700">{progressoImportacao.cadastrados || 0}</p>
                                </div>

                                <div className="rounded-xl bg-white p-3 text-center ring-1 ring-slate-200">
                                    <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">Erros</p>
                                    <p className="mt-1 text-xl font-black text-red-700">{progressoImportacao.erros || 0}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-black text-slate-950">Salvar colaboradores válidos</p>
                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                Linhas com erro não serão importadas. Corrija a planilha e importe novamente, se necessário.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={importar}
                            disabled={!podeCadastrar || importando || resumo.validos === 0 || !empresaSelecionada}
                            title={podeCadastrar ? "Cadastrar linhas válidas" : mensagemBloqueio}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Upload className="h-4 w-4" />
                            {importando ? "Importando..." : `Importar ${resumo.validos} válido(s)`}
                        </button>
                    </div>
                </div>
            )}

            {resultado && (
                <div
                    className={classNames(
                        "mt-4 rounded-2xl p-4 ring-1",
                        resultado.erros?.length
                            ? "bg-amber-50 text-amber-900 ring-amber-100"
                            : "bg-emerald-50 text-emerald-800 ring-emerald-100"
                    )}
                >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <p className="text-sm font-black">
                                {resultado.erros?.length ? "Importação concluída com ressalvas" : "Importação concluída"}
                            </p>

                            <p className="mt-1 text-xs font-semibold opacity-80">
                                O resumo permanece visível até selecionar outro arquivo ou limpar esta importação.
                            </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-black ring-1 ring-slate-200">
                            Lote finalizado
                        </span>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-emerald-100">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                Cadastrados
                            </p>

                            <p className="mt-1 text-2xl font-black text-emerald-700">
                                {resultado.sucesso || 0}
                            </p>
                        </div>

                        <div className="rounded-xl bg-white p-3 text-center ring-1 ring-red-100">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">
                                Não cadastrados
                            </p>

                            <p className="mt-1 text-2xl font-black text-red-700">
                                {resultado.erros?.length || 0}
                            </p>
                        </div>
                    </div>

                    {resultado.erros?.length > 0 && (
                        <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                            <p className="font-black text-slate-950">
                                Principais ocorrências
                            </p>

                            <ul className="mt-2 space-y-1 text-xs font-semibold text-slate-600">
                                {resultado.erros.slice(0, 8).map((erro, indice) => (
                                    <li key={`${indice}-${erro}`}>
                                        • {erro}
                                    </li>
                                ))}
                            </ul>

                            {resultado.erros.length > 8 && (
                                <p className="mt-2 text-xs font-bold text-slate-500">
                                    + {resultado.erros.length - 8} ocorrência(s) adicional(is).
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
