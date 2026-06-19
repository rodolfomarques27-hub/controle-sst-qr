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


function CampoTexto({ label, value, onChange, placeholder, type = "text", list, children, className = "", inputClassName = "" }) {
    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className="novo-colaborador-label-anterior">{label}</span>
            <input
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

function CampoSelect({ label, value, onChange, children, ajuda, ajudaInline = "", className = "", inputClassName = "" }) {
    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className={classNames("novo-colaborador-label-anterior", ajudaInline && "flex flex-wrap items-center gap-2")}> 
                <span>{label}</span>
                {ajudaInline && <small className="text-[11px] font-semibold normal-case tracking-normal text-slate-500">{ajudaInline}</small>}
            </span>
            <select
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

function CampoFuncaoLivre({ label, value, onChange, funcoesDisponiveis = [], ajuda, className = "" }) {
    const valorAtual = String(value || "");

    return (
        <label className={classNames("novo-colaborador-campo-anterior min-w-0", className)}>
            <span className="novo-colaborador-label-anterior">{label}</span>
            <div className="flex w-full items-stretch gap-2">
                <input
                    type="text"
                    value={valorAtual}
                    onChange={(evento) => onChange(evento.target.value)}
                    placeholder="Digite ou selecione uma função"
                    className="novo-colaborador-input-anterior min-w-0 flex-1 text-center"
                />
                <div className="relative w-[190px] shrink-0">
                    <select
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
                    value={novo.nome}
                    onChange={(valor) => alterarCampo("nome", valor)}
                    placeholder="Ex.: João da Silva"
                    inputClassName="text-center"
                />

                <CampoTexto
                    label="Data de nascimento"
                    type="date"
                    value={novo.dataNascimento}
                    onChange={(valor) => alterarCampo("dataNascimento", valor)}
                    inputClassName="text-center"
                />

                <CampoSelect
                    label="Empresa terceirizada:"
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

            <div className="grid gap-3 lg:grid-cols-[0.76fr_1.48fr_0.96fr]">
                <CampoSelect
                    label="Situação na obra"
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
                    value={novo.funcao}
                    onChange={(valor) => alterarCampo("funcao", valor)}
                    funcoesDisponiveis={funcoesDisponiveis}
                    ajuda={`Matriz automática pela função. ${quantidadeTreinamentos > 0 ? `${quantidadeTreinamentos} treinamento(s) previsto(s).` : "Digite uma função nova ou selecione uma função cadastrada."}`}
                />

                <CampoTexto
                    label="Matrícula da empresa (opcional)"
                    value={novo.matricula}
                    onChange={(valor) => alterarCampo("matricula", valor)}
                    placeholder="Ex.: matrícula da empresa, crachá ou RE"
                    inputClassName="text-center"
                >
                    <p className="novo-colaborador-ajuda-anterior">
                        O código do sistema é gerado automaticamente. A matrícula é opcional e serve para crachá ou RE.
                    </p>
                </CampoTexto>
            </div>

            <div className="novo-colaborador-row-anterior novo-colaborador-uploads-anterior" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>

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

