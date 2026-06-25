import React, { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

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
    if (!String(linha.empresa_terceirizada || "").trim()) erros.push("empresa terceirizada obrigatória");
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
    podeCadastrar = true,
    mensagemBloqueio = "Sem permissão para cadastrar colaboradores.",
    onImportar,
    importando = false,
}) {
    const inputRef = useRef(null);
    const [arquivoNome, setArquivoNome] = useState("");
    const [linhas, setLinhas] = useState([]);
    const [erroLeitura, setErroLeitura] = useState("");
    const [resultado, setResultado] = useState(null);

    const cpfsExistentes = useMemo(() => {
        return new Set(
            (colaboradores || [])
                .map((colaborador) => apenasDigitos(colaborador.cpf || colaborador.cpf_colaborador || ""))
                .filter(Boolean)
        );
    }, [colaboradores]);

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
        setArquivoNome("");
        setLinhas([]);
        setErroLeitura("");
        setResultado(null);

        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    const processarArquivo = async (evento) => {
        const arquivo = evento.target.files?.[0];

        setErroLeitura("");
        setResultado(null);
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
        if (!podeCadastrar) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueio);
            return;
        }

        const validos = linhas.filter((linha) => linha.valido);

        if (validos.length === 0) {
            if (typeof window !== "undefined") window.alert("Nenhuma linha válida para importar.");
            return;
        }

        const resposta = await onImportar?.(validos);

        setResultado(resposta || null);
    };

    return (
        <section className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700 ring-1 ring-blue-100">
                        <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-xs font-black uppercase tracking-wide text-blue-700">Cadastro em massa</p>
                        <h2 className="mt-1 text-xl font-black text-slate-950">Importar colaboradores por planilha</h2>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                            Baixe o modelo CSV, preencha no Excel ou Google Sheets e importe com pré-validação antes de salvar.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                        type="button"
                        onClick={baixarModeloCsv}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm hover:bg-slate-50"
                    >
                        <Download className="h-4 w-4" />
                        Baixar modelo
                    </button>

                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={!podeCadastrar || importando}
                        title={podeCadastrar ? "Selecionar planilha CSV" : mensagemBloqueio}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-sm hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="hidden"
            />

            {arquivoNome && (
                <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                    <span className="truncate">
                        <strong>Arquivo:</strong> {arquivoNome}
                    </span>
                    <button
                        type="button"
                        onClick={limpar}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        <X className="h-3.5 w-3.5" />
                        Limpar
                    </button>
                </div>
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
                                            <td className="px-3 py-2 text-slate-600">{linha.empresaNome || "-"}</td>
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
                            disabled={!podeCadastrar || importando || resumo.validos === 0}
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
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 ring-1 ring-emerald-100">
                    Resultado: {resultado.sucesso || 0} colaborador(es) cadastrado(s)
                    {resultado.erros?.length ? `, ${resultado.erros.length} não cadastrado(s).` : "."}
                </div>
            )}
        </section>
    );
}
