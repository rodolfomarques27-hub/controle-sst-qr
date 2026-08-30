import React from "react";
import { Camera, ChevronDown, Plus, Upload, UserPlus, X } from "lucide-react";
import { classNames } from "../../utils/sstUtils";

const STATUS_MOBILIZACAO = [
    "Liberado",
    "Com pendência",
    "Bloqueado",
    "Em análise",
    "Desmobilizado",
    "Inativo",
];

const INFORMACOES_STATUS_OBRA = {
    Liberado: "Mobilizado ativo.",
    "Com pendência": "Mobilizado com pendências.",
    Bloqueado: "Bloqueado por pendência crítica.",
    "Em análise": "Em conferência documental.",
    Desmobilizado: "Fora da obra.",
    Inativo: "Cadastro sem atuação atual.",
};


function CampoTexto({ label, name, value, onChange, placeholder, type = "text", list, children, className = "", inputClassName = "" }) {
    const inputId = `novo-colaborador-${name}`;

    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className="novo-colaborador-label-anterior">{label}</span>
            <input
                id={inputId}
                name={name}
                type={type}
                value={value || ""}
                onChange={(evento) => onChange(evento.target.value)}
                placeholder={placeholder}
                list={list}
                className={classNames("novo-colaborador-input-anterior", inputClassName)}
            />
            {children}
        </label>
    );
}

function CampoSelect({ label, name, value, onChange, children, ajuda, ajudaInline = "", className = "", inputClassName = "" }) {
    const inputId = `novo-colaborador-${name}`;

    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className={classNames("novo-colaborador-label-anterior", ajudaInline && "flex flex-wrap items-center gap-2")}> 
                <span>{label}</span>
                {ajudaInline && <small className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">{ajudaInline}</small>}
            </span>
            <select
                id={inputId}
                name={name}
                value={value || ""}
                onChange={(evento) => onChange(evento.target.value)}
                className={classNames("novo-colaborador-input-anterior", inputClassName)}
            >
                {children}
            </select>
            {ajuda && !ajudaInline && <p className="novo-colaborador-ajuda-anterior">{ajuda}</p>}
        </label>
    );
}

function CampoFuncaoLivre({ label, name, value, onChange, funcoesDisponiveis = [], ajuda, className = "" }) {
    const valorAtual = String(value || "");
    const inputId = `novo-colaborador-${name}`;
    const selectId = `${inputId}-cadastrada`;

    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className="novo-colaborador-label-anterior">{label}</span>
            <div className="flex w-full items-stretch gap-2">
                <input
                    id={inputId}
                    name={name}
                    type="text"
                    value={valorAtual}
                    onChange={(evento) => onChange(evento.target.value)}
                    placeholder="Digite ou selecione uma função"
                    className="novo-colaborador-input-anterior min-w-0 flex-1 text-center"
                />
                <div className="relative w-[190px] shrink-0">
                    <select
                        id={selectId}
                        name={`${name}Cadastrada`}
                        aria-label="Selecionar função cadastrada"
                        value=""
                        onChange={(evento) => {
                            const proximaFuncao = evento.target.value;
                            if (proximaFuncao) onChange(proximaFuncao);
                        }}
                        className="novo-colaborador-input-anterior h-full w-full cursor-pointer appearance-none px-3 pr-10 text-center text-xs font-bold text-slate-950"
                    >
                        <option value="">Selecionar função</option>
                        {funcoesDisponiveis.map((funcao) => (
                            <option key={funcao.chave || funcao.rotulo} value={funcao.rotulo || ""} className="text-slate-900">
                                {funcao.rotulo || "Função sem nome"}
                            </option>
                        ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-700" />
                </div>
            </div>
            {ajuda && <p className="novo-colaborador-ajuda-anterior">{ajuda}</p>}
        </label>
    );
}

function resumoArquivos(arquivos = []) {
    const lista = Array.from(arquivos || []);

    if (lista.length === 0) return "Nenhum arquivo selecionado";
    if (lista.length === 1) return lista[0]?.name || "1 arquivo selecionado";

    return `${lista.length} arquivos selecionados`;
}

function apenasDigitosColaborador(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function formatarCpfColaboradorCampo(valor = "") {
    const digitos = apenasDigitosColaborador(valor).slice(0, 11);

    if (digitos.length <= 3) return digitos;
    if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
    if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;

    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9, 11)}`;
}

function formatarTelefoneColaboradorCampo(valor = "") {
    const digitos = apenasDigitosColaborador(valor).slice(0, 11);

    if (!digitos) return "";
    if (digitos.length <= 2) return `(${digitos}`;
    if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
    if (digitos.length <= 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;

    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7, 11)}`;
}
function formatarDataColaboradorCampo(valor = "") {
    const texto = String(valor || "").trim();
    const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (iso) {
        const [, ano, mes, dia] = iso;
        return `${dia}/${mes}/${ano}`;
    }

    const digitos = texto.replace(/\D/g, "").slice(0, 8);

    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

    const dia = digitos.slice(0, 2);
    const mes = digitos.slice(2, 4);
    const anoDigitado = digitos.slice(4, 8);

    if (anoDigitado.length < 4) {
        return `${dia}/${mes}/${anoDigitado}`;
    }

    const anoNumero = Number(anoDigitado);
    const anoTravado = Math.min(2099, Math.max(1950, anoNumero));

    return `${dia}/${mes}/${anoTravado}`;
}
export function FormularioNovoColaborador({
    novo,
    setNovo,
    empresasBanco = [],
    funcoesSugeridas = [],
    treinamentosAplicadosNovo = [],
    adicionar,
    salvando,
}) {
    const empresasDisponiveis = Array.from(
        new Map(
            (empresasBanco || [])
                .filter((empresa) => String(empresa?.nome || "").trim())
                .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")))
                .map((empresa) => [String(empresa.nome || "").trim().toLowerCase(), empresa])
        ).values()
    );

    const funcoesDisponiveis = Array.from(
        new Map(
            (funcoesSugeridas || [])
                .filter((funcao) => String(funcao?.rotulo || "").trim())
                .sort((a, b) => String(a.rotulo || "").localeCompare(String(b.rotulo || "")))
                .map((funcao) => [String(funcao.rotulo || "").trim().toLowerCase(), funcao])
        ).values()
    );
    const alterarCampo = (campo, valor) => {
        setNovo((atual) => ({
            ...atual,
            [campo]: valor,
            mostrarAniversarioDashboard: false,
        }));
    };


    const alterarFoto = (evento) => {
        const arquivo = evento.target.files?.[0] || null;
        setNovo((atual) => ({
            ...atual,
            foto: arquivo,
            mostrarAniversarioDashboard: false,
        }));
    };


    const limparFoto = () => {
        setNovo((atual) => ({ ...atual, foto: null, mostrarAniversarioDashboard: false }));
    };

    const quantidadeTreinamentos = Array.isArray(treinamentosAplicadosNovo) ? treinamentosAplicadosNovo.length : 0;

    return (
        <div className="novo-colaborador-layout-anterior">
            <div className="grid gap-3 lg:grid-cols-[1fr_0.72fr_1.55fr]">
                <CampoTexto
                    label="Nome completo"
                    name="nome"
                    value={novo.nome}
                    onChange={(valor) => alterarCampo("nome", valor)}
                    placeholder="Ex.: João da Silva"
                    inputClassName="text-center"
                />

                <CampoTexto
                    label="Data de nascimento"
                    name="dataNascimento"
                    type="text"
                    value={formatarDataColaboradorCampo(novo.dataNascimento)}
                    placeholder="dd/mm/aaaa"
                    onChange={(valor) => alterarCampo("dataNascimento", formatarDataColaboradorCampo(valor))}
                    inputClassName="text-center"
                />

                <CampoSelect
                    label="Empresa terceirizada:"
                    name="empresaNome"
                    value={novo.empresaNome}
                    onChange={(valor) => alterarCampo("empresaNome", valor)}
                    ajudaInline={empresasDisponiveis.length ? "(Selecione uma empresa cadastrada)" : "(Cadastre uma empresa antes)"}
                    inputClassName="text-center"
                >
                    <option value="">Selecione uma empresa cadastrada</option>
                    {empresasDisponiveis.map((empresa) => (
                        <option key={empresa.id || empresa.nome} value={empresa.nome || ""}>
                            {empresa.nome || "Empresa sem nome"}
                        </option>
                    ))}
                </CampoSelect>
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
                <CampoTexto
                    label="CPF"
                    name="cpf"
                    value={novo.cpf}
                    onChange={(valor) => alterarCampo("cpf", formatarCpfColaboradorCampo(valor))}
                    placeholder="Ex.: 000.000.000-00"
                    inputClassName="text-center"
                />
                <CampoTexto
                    label="Telefone principal (opcional)"
                    name="telefone"
                    value={novo.telefone}
                    onChange={(valor) => alterarCampo("telefone", formatarTelefoneColaboradorCampo(valor))}
                    placeholder="Ex.: (12) 99999-9999"
                    inputClassName="text-center"
                />
                <CampoTexto
                    label="Data de admissão (opcional)"
                    name="dataAdmissao"
                    type="text"
                    value={formatarDataColaboradorCampo(novo.dataAdmissao)}
                    placeholder="dd/mm/aaaa"
                    onChange={(valor) => alterarCampo("dataAdmissao", formatarDataColaboradorCampo(valor))}
                    inputClassName="text-center"
                />
            </div>

            <div className="grid gap-3 lg:grid-cols-[0.76fr_1.48fr_0.96fr]">
                <CampoSelect
                    label="Situação na obra"
                    name="statusMobilizacao"
                    value={novo.statusMobilizacao}
                    onChange={(valor) => alterarCampo("statusMobilizacao", valor)}
                    ajuda={INFORMACOES_STATUS_OBRA[novo.statusMobilizacao] || "Selecione a situação atual do colaborador na obra."}
                    inputClassName="text-center"
                >
                    {STATUS_MOBILIZACAO.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </CampoSelect>

                <CampoFuncaoLivre
                    label="Função"
                    name="funcao"
                    value={novo.funcao}
                    onChange={(valor) => alterarCampo("funcao", valor)}
                    funcoesDisponiveis={funcoesDisponiveis}
                    ajuda={`Matriz automática pela função. ${quantidadeTreinamentos > 0 ? `${quantidadeTreinamentos} treinamento(s) previsto(s).` : "Digite uma função nova ou selecione uma função cadastrada."}`}
                />

                <CampoTexto
                    label="Matrícula eSocial (opcional)"
                    name="matricula"
                    value={novo.matricula}
                    onChange={(valor) => alterarCampo("matricula", valor)}
                    placeholder="Ex.: matrícula eSocial"
                    inputClassName="text-center"
                >
                    <p className="novo-colaborador-ajuda-anterior">
                        O código do sistema é gerado automaticamente. A matrícula eSocial é opcional e pode ser preenchida depois.
                    </p>
                </CampoTexto>
            </div>

            <div className="novo-colaborador-row-anterior novo-colaborador-uploads-anterior" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>

    
            <details className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 text-left ring-1 ring-slate-200 [&::-webkit-details-marker]:hidden">
                    <div>
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Contato de emergência</p>
                        <p className="mt-1 text-xs font-semibold text-slate-500">
                            Opcional. Abra somente se quiser informar contato de referência agora.
                        </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white">
                        Abrir / fechar
                    </span>
                </summary>

                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                    <CampoTexto
                        label="Nome do contato"
                        name="contatoEmergenciaNome"
                        value={novo.contatoEmergenciaNome}
                        onChange={(valor) => alterarCampo("contatoEmergenciaNome", valor)}
                        placeholder="Ex.: Maria Aparecida"
                        inputClassName="text-center"
                    />
                    <CampoTexto
                        label="Parentesco"
                        name="contatoEmergenciaParentesco"
                        value={novo.contatoEmergenciaParentesco}
                        onChange={(valor) => alterarCampo("contatoEmergenciaParentesco", valor)}
                        placeholder="Ex.: esposa, filho, mãe"
                        inputClassName="text-center"
                    />
                    <CampoTexto
                        label="Telefone de emergência"
                        name="contatoEmergenciaTelefone"
                        value={novo.contatoEmergenciaTelefone}
                        onChange={(valor) => alterarCampo("contatoEmergenciaTelefone", formatarTelefoneColaboradorCampo(valor))}
                        placeholder="Ex.: (12) 99999-9999"
                        inputClassName="text-center"
                    />
                </div>
            </details>
            <div className="novo-colaborador-upload-card-anterior">
                    <input
                        id="novo-colaborador-foto"
                        type="file"
                        accept="image/*"
                        onChange={alterarFoto}
                        className="sr-only"
                    />
                    <label htmlFor="novo-colaborador-foto" className="novo-colaborador-upload-label-anterior">
                        <Camera className="h-4 w-4 shrink-0" />
                        <span className="novo-colaborador-upload-info-anterior">
                            <strong>Adicionar foto</strong>
                            <small>{novo.foto?.name || "Nenhuma foto selecionada"}</small>
                        </span>
                        <Upload className="h-4 w-4 shrink-0" />
                    </label>
                    {novo.foto && (
                        <div className="novo-colaborador-upload-status-anterior">
                            <span className="truncate">{novo.foto.name}</span>
                            <button type="button" onClick={limparFoto} title="Remover foto">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={adicionar}
                disabled={salvando}
                className={classNames(
                    "novo-colaborador-botao-cadastrar-anterior",
                    salvando && "cursor-not-allowed opacity-70"
                )}
            >
                {salvando ? (
                    "Cadastrando colaborador..."
                ) : (
                    <>
                        <Plus className="h-5 w-5" />
                        Cadastrar colaborador
                        <UserPlus className="h-5 w-5" />
                    </>
                )}
            </button>
        </div>
    );
}

