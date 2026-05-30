import React, { useId } from "react";
import { Camera, FileText, Plus, Upload, UserPlus, X } from "lucide-react";
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
    Liberado: "Conta como mobilizado ativo. Documentos e treinamentos devem permanecer válidos.",
    "Com pendência": "Conta como mobilizado ativo, mas exige regularização das pendências apontadas.",
    Bloqueado: "Não conta como mobilizado ativo. Use para pendência bloqueante ou risco documental.",
    "Em análise": "Não conta como mobilizado ativo. Use enquanto documentos e treinamentos estão em conferência.",
    Desmobilizado: "Não conta como mobilizado ativo. Use quando o colaborador sair da obra.",
    Inativo: "Não conta como mobilizado ativo. Use para cadastro sem atuação atual na obra.",
};

const TIPOS_DOCUMENTOS_MASSA = "ASO, EPI, INTEGRAÇÃO, NR-06, NR-11, NR-12, NR-18, NR-21, NR-25, NR-26, REGISTRO ou OS.";

function CampoTexto({ label, value, onChange, placeholder, type = "text", list, children }) {
    return (
        <label className="novo-colaborador-campo-anterior">
            <span className="novo-colaborador-label-anterior">{label}</span>
            <input
                type={type}
                value={value || ""}
                onChange={(evento) => onChange(evento.target.value)}
                placeholder={placeholder}
                list={list}
                className="novo-colaborador-input-anterior"
            />
            {children}
        </label>
    );
}

function CampoSelect({ label, value, onChange, children, ajuda }) {
    return (
        <label className="novo-colaborador-campo-anterior">
            <span className="novo-colaborador-label-anterior">{label}</span>
            <select
                value={value || ""}
                onChange={(evento) => onChange(evento.target.value)}
                className="novo-colaborador-input-anterior"
            >
                {children}
            </select>
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
    arquivosMassaReconhecidosNovo = [],
    arquivosMassaNaoReconhecidosNovo = [],
    adicionar,
    salvando,
}) {
    const idBase = useId().replace(/:/g, "");
    const funcoesDatalistId = `${idBase}-funcoes`;
    const empresasDisponiveis = Array.from(
        new Map(
            (empresasBanco || [])
                .filter((empresa) => String(empresa?.nome || "").trim())
                .sort((a, b) => String(a.nome || "").localeCompare(String(b.nome || "")))
                .map((empresa) => [String(empresa.nome || "").trim().toLowerCase(), empresa])
        ).values()
    );

    const alterarCampo = (campo, valor) => {
        setNovo((atual) => ({
            ...atual,
            [campo]: valor,
            mostrarAniversarioDashboard: false,
        }));
    };

    const alterarDocumentosMassa = (evento) => {
        const arquivos = Array.from(evento.target.files || []);
        setNovo((atual) => ({
            ...atual,
            documentosMassa: arquivos,
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

    const limparDocumentosMassa = () => {
        setNovo((atual) => ({ ...atual, documentosMassa: [], mostrarAniversarioDashboard: false }));
    };

    const limparFoto = () => {
        setNovo((atual) => ({ ...atual, foto: null, mostrarAniversarioDashboard: false }));
    };

    const quantidadeTreinamentos = Array.isArray(treinamentosAplicadosNovo) ? treinamentosAplicadosNovo.length : 0;
    const documentosSelecionados = Array.from(novo.documentosMassa || []);
    const documentosReconhecidos = Array.isArray(arquivosMassaReconhecidosNovo) ? arquivosMassaReconhecidosNovo.length : 0;
    const documentosNaoReconhecidos = Array.isArray(arquivosMassaNaoReconhecidosNovo) ? arquivosMassaNaoReconhecidosNovo.length : 0;

    return (
        <div className="novo-colaborador-layout-anterior">
            <datalist id={funcoesDatalistId}>
                {(funcoesSugeridas || []).map((funcao) => (
                    <option key={funcao.chave || funcao.rotulo} value={funcao.rotulo || ""} />
                ))}
            </datalist>

            <div className="novo-colaborador-row-anterior novo-colaborador-row-anterior-3">
                <CampoTexto
                    label="Nome completo"
                    value={novo.nome}
                    onChange={(valor) => alterarCampo("nome", valor)}
                    placeholder="Ex.: João da Silva"
                />

                <CampoTexto
                    label="Data de nascimento"
                    type="date"
                    value={novo.dataNascimento}
                    onChange={(valor) => alterarCampo("dataNascimento", valor)}
                />

                <CampoSelect
                    label="Empresa terceirizada"
                    value={novo.empresaNome}
                    onChange={(valor) => alterarCampo("empresaNome", valor)}
                    ajuda={empresasDisponiveis.length ? "Selecione uma empresa já cadastrada no sistema." : "Cadastre uma empresa antes de vincular o colaborador."}
                >
                    <option value="">Selecione uma empresa cadastrada</option>
                    {empresasDisponiveis.map((empresa) => (
                        <option key={empresa.id || empresa.nome} value={empresa.nome || ""}>
                            {empresa.nome || "Empresa sem nome"}
                        </option>
                    ))}
                </CampoSelect>
            </div>

            <div className="novo-colaborador-row-anterior novo-colaborador-row-anterior-3">
                <CampoSelect
                    label="Situação na obra"
                    value={novo.statusMobilizacao}
                    onChange={(valor) => alterarCampo("statusMobilizacao", valor)}
                    ajuda={INFORMACOES_STATUS_OBRA[novo.statusMobilizacao] || "Selecione a situação atual do colaborador na obra."}
                >
                    {STATUS_MOBILIZACAO.map((status) => (
                        <option key={status} value={status}>{status}</option>
                    ))}
                </CampoSelect>

                <CampoTexto
                    label="Função"
                    value={novo.funcao}
                    onChange={(valor) => alterarCampo("funcao", valor)}
                    placeholder="Ex.: Pedreiro, Soldador, Eletricista, Operador de PEMT"
                    list={funcoesDatalistId}
                >
                    <p className="novo-colaborador-ajuda-anterior">
                        Matriz automática pela função. {quantidadeTreinamentos > 0 ? `${quantidadeTreinamentos} treinamento(s) previsto(s).` : "Informe a função."}
                    </p>
                </CampoTexto>

                <CampoTexto
                    label="Matrícula da empresa (opcional)"
                    value={novo.matricula}
                    onChange={(valor) => alterarCampo("matricula", valor)}
                    placeholder="Ex.: matrícula da empresa, crachá ou RE"
                >
                    <p className="novo-colaborador-ajuda-anterior">
                        O código do sistema é gerado automaticamente. A matrícula é opcional e serve para crachá ou RE.
                    </p>
                </CampoTexto>
            </div>

            <div className="novo-colaborador-row-anterior novo-colaborador-row-anterior-2 novo-colaborador-uploads-anterior">
                <div className="novo-colaborador-upload-card-anterior">
                    <input
                        id="novo-colaborador-documentos-massa"
                        type="file"
                        multiple
                        accept=".pdf,.png,.jpg,.jpeg,.webp"
                        onChange={alterarDocumentosMassa}
                        className="sr-only"
                    />
                    <label htmlFor="novo-colaborador-documentos-massa" className="novo-colaborador-upload-label-anterior novo-colaborador-upload-label-documentos">
                        <FileText className="h-4 w-4 shrink-0" />
                        <span className="novo-colaborador-upload-info-anterior">
                            <strong>Subir documentos</strong>
                            <small>{resumoArquivos(documentosSelecionados)}</small>
                            <small className="novo-colaborador-upload-tipos-anterior">{TIPOS_DOCUMENTOS_MASSA}</small>
                        </span>
                        <Upload className="h-4 w-4 shrink-0" />
                    </label>
                    {documentosSelecionados.length > 0 && (
                        <div className="novo-colaborador-upload-status-anterior">
                            <span>{documentosReconhecidos} reconhecido(s)</span>
                            <span>{documentosNaoReconhecidos} para conferir</span>
                            <button type="button" onClick={limparDocumentosMassa} title="Limpar documentos">
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    )}
                </div>

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
