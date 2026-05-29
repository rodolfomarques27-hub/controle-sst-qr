/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
    ChevronDown,
    ChevronUp,
    Database,
    Download,
    Lock,
    RefreshCw,
    Search,
} from "lucide-react";
import { CardRecolhivel, Header } from "../commonComponents";
import { AuditoriaAtividades } from "./AuditoriaAtividades";
import { LIMITE_STORAGE_MB } from "../../constants/sstConstants";
import {
    normalizarTextoBusca,
    formatarBytes,
    calcularPercentualUsoStorage,
    classNames,
} from "../../utils/sstUtils";
import {
    auditoriaEventoHabilitado,
    carregarConfiguracaoEventosAuditoriaSistemaSupabase,
    configuracaoPadraoEventosAuditoriaSistema,
    montarEventosAuditoriaSistema,
    normalizarConfiguracaoEventosAuditoriaSistema,
    obterConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistema,
    salvarConfiguracaoEventosAuditoriaSistemaSupabase,
} from "../../services/auditoriaSistemaConfigService";

const hoje = new Date();

export function RelatorioAuditoria({
    auditoria = [],
    emailsEnviados = [],
    carregando,
    carregandoMaisAuditoria = false,
    existeMaisAuditoria = false,
    onAtualizar,
    onCarregarMaisAuditoria,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onListarUsuariosAuditoria,
    onSalvarUsuarioAuditoria,
    onAlternarUsuarioAuditoria,
    onBloquear,
}) {
    const [busca, setBusca] = useState("");
    const [filtroAcao, setFiltroAcao] = useState("Todas");
    const [filtrosStorage, setFiltrosStorage] = useState({
        empresa: "Todas",
        colaborador: "Todos",
        tipo: "Todos",
        dataInicio: "",
        dataFim: "",
        tamanho: "Todos",
        vinculo: "Todos",
    });
    const [arquivosStorageAuditoria, setArquivosStorageAuditoria] = useState([]);
    const [carregandoStorageAuditoria, setCarregandoStorageAuditoria] = useState(false);
    const [excluindoStorageAuditoria, setExcluindoStorageAuditoria] = useState("");
    const [usuariosAuditoria, setUsuariosAuditoria] = useState([]);
    const [carregandoUsuariosAuditoria, setCarregandoUsuariosAuditoria] = useState(false);
    const [salvandoUsuarioAuditoria, setSalvandoUsuarioAuditoria] = useState(false);
    const [alterandoUsuarioAuditoria, setAlterandoUsuarioAuditoria] = useState("");
    const [novoUsuarioAuditoria, setNovoUsuarioAuditoria] = useState({
        email: "",
        nome: "",
        funcao: "",
    });
    const [detalhesAuditoriaAbertos, setDetalhesAuditoriaAbertos] = useState({});
    const [configEventosAuditoria, setConfigEventosAuditoria] = useState(() =>
        obterConfiguracaoEventosAuditoriaSistema()
    );
    const [origemConfigEventosAuditoria, setOrigemConfigEventosAuditoria] = useState("local");
    const [mensagemConfigEventosAuditoria, setMensagemConfigEventosAuditoria] = useState("");
    const [carregandoConfigEventosAuditoria, setCarregandoConfigEventosAuditoria] = useState(false);
    const [salvandoConfigEventosAuditoria, setSalvandoConfigEventosAuditoria] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const timer = window.setTimeout(async () => {
            setCarregandoConfigEventosAuditoria(true);

            try {
                const resultado = await carregarConfiguracaoEventosAuditoriaSistemaSupabase();
                setConfigEventosAuditoria(resultado.configuracao);
                setOrigemConfigEventosAuditoria(resultado.origem);

                if (resultado.erro) {
                    setMensagemConfigEventosAuditoria(
                        `Usando configuração local. Supabase: ${resultado.erro}`
                    );
                } else if (resultado.origem === "supabase") {
                    setMensagemConfigEventosAuditoria("Configuração carregada do Supabase.");
                }
            } finally {
                setCarregandoConfigEventosAuditoria(false);
            }
        }, 0);

        return () => window.clearTimeout(timer);
    }, []);

    const persistirConfiguracaoEventosAuditoria = async (configuracao, mensagemSucesso = "Configuração salva.") => {
        const normalizada = normalizarConfiguracaoEventosAuditoriaSistema(configuracao);
        setConfigEventosAuditoria(normalizada);
        salvarConfiguracaoEventosAuditoriaSistema(normalizada);
        setSalvandoConfigEventosAuditoria(true);
        setMensagemConfigEventosAuditoria("Salvando configuração...");

        try {
            const resultado = await salvarConfiguracaoEventosAuditoriaSistemaSupabase(normalizada);
            setOrigemConfigEventosAuditoria(resultado.origem || "local");

            if (resultado.ok) {
                setMensagemConfigEventosAuditoria(`${mensagemSucesso} Configuração sincronizada no Supabase.`);
            } else {
                setMensagemConfigEventosAuditoria(
                    `${mensagemSucesso} Mantida localmente. Supabase: ${resultado.erro}`
                );
            }
        } finally {
            setSalvandoConfigEventosAuditoria(false);
        }
    };

    const alternarEventoAuditoria = (chave) => {
        const proxima = {
            ...configEventosAuditoria,
            [chave]: configEventosAuditoria[chave] === false,
        };

        persistirConfiguracaoEventosAuditoria(proxima, "Evento atualizado.");
    };

    const definirTodosEventosAuditoria = (habilitado) => {
        const proxima = eventosAuditoriaSistema.reduce((acc, evento) => {
            acc[evento.chave] = habilitado;
            return acc;
        }, { ...configEventosAuditoria });

        persistirConfiguracaoEventosAuditoria(
            proxima,
            habilitado ? "Todos os eventos foram habilitados." : "Todos os eventos foram desabilitados."
        );
    };

    const restaurarPadraoEventosAuditoria = () => {
        persistirConfiguracaoEventosAuditoria(
            configuracaoPadraoEventosAuditoriaSistema(),
            "Configuração padrão restaurada."
        );
    };

    const alternarDetalhesAuditoria = (id) => {
        setDetalhesAuditoriaAbertos((atual) => ({
            ...atual,
            [id]: !atual[id],
        }));
    };

    const eventosAuditoriaSistema = useMemo(
        () => montarEventosAuditoriaSistema(auditoria, configEventosAuditoria),
        [auditoria, configEventosAuditoria]
    );

    const auditoriaVerificada = useMemo(
        () => auditoria.filter((item) => auditoriaEventoHabilitado(item.acao, configEventosAuditoria)),
        [auditoria, configEventosAuditoria]
    );

    const eventosHabilitadosAuditoria = eventosAuditoriaSistema.filter((evento) => evento.habilitado).length;
    const eventosDesabilitadosAuditoria = eventosAuditoriaSistema.length - eventosHabilitadosAuditoria;

    const acoes = useMemo(
        () => Array.from(new Set(auditoriaVerificada.map((item) => item.acao).filter(Boolean))).sort(),
        [auditoriaVerificada]
    );

    const registrosFiltrados = useMemo(() => {
        const termo = normalizarTextoBusca(busca);

        return auditoriaVerificada.filter((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};
            const texto = normalizarTextoBusca(
                `${item.usuario_email || ""} ${item.acao || ""} ${item.tabela || ""} ${item.descricao || ""} ${item.registro_id || ""} ${origemAcesso.url || ""} ${origemAcesso.pagina || ""} ${origemAcesso.navegador || ""} ${origemAcesso.plataforma || ""}`
            );

            const bateBusca = !termo || texto.includes(termo);
            const bateAcao = filtroAcao === "Todas" || item.acao === filtroAcao;

            return bateBusca && bateAcao;
        });
    }, [auditoriaVerificada, busca, filtroAcao]);

    const ultimosAcessosAuditoria = auditoriaVerificada
        .filter((item) => normalizarTextoBusca(`${item.acao || ""} ${item.descricao || ""}`).includes("acesso"))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
        .slice(0, 8);

    const mesAtualEmails = hoje.getMonth();
    const anoAtualEmails = hoje.getFullYear();
    const emailsMesAuditoria = emailsEnviados.filter((item) => {
        const data = item.data_envio ? new Date(item.data_envio) : null;
        return data && data.getMonth() === mesAtualEmails && data.getFullYear() === anoAtualEmails;
    });
    const emailsSucessoAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("sucesso"));
    const emailsErroAuditoria = emailsMesAuditoria.filter((item) => normalizarTextoBusca(item.status_envio).includes("erro"));
    const ultimosEmailsAuditoria = [...emailsEnviados]
        .sort((a, b) => new Date(b.data_envio || 0) - new Date(a.data_envio || 0))
        .slice(0, 8);

    const obterEmpresaArquivoStorage = (arquivo) =>
        arquivo.empresaNome || arquivo.colaboradorEmpresa || "Sem empresa vinculada";

    const obterColaboradorArquivoStorage = (arquivo) =>
        arquivo.colaboradorNome || "Sem colaborador vinculado";

    const obterTipoArquivoStorage = (arquivo) =>
        arquivo.tipoDocumentoEmpresa || arquivo.treinamentoNome || arquivo.origemTipo || arquivo.bucket || "Tipo não identificado";

    const obterDataArquivoStorage = (arquivo) => {
        if (!arquivo?.atualizadoEm) return "";

        const data = new Date(arquivo.atualizadoEm);
        return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
    };

    const tamanhoArquivoDentroDoFiltro = (arquivo) => {
        const tamanho = Number(arquivo.tamanho || 0);

        if (filtrosStorage.tamanho === "Todos") return true;
        if (filtrosStorage.tamanho === "ate-1mb") return tamanho <= 1024 ** 2;
        if (filtrosStorage.tamanho === "1mb-10mb") return tamanho > 1024 ** 2 && tamanho <= 10 * 1024 ** 2;
        if (filtrosStorage.tamanho === "10mb-50mb") return tamanho > 10 * 1024 ** 2 && tamanho <= 50 * 1024 ** 2;
        if (filtrosStorage.tamanho === "acima-50mb") return tamanho > 50 * 1024 ** 2;

        return true;
    };

    const arquivosStorageAuditoriaSemRegistro = arquivosStorageAuditoria.filter((arquivo) => !arquivo.emUso);
    const arquivosStorageAuditoriaEmUso = arquivosStorageAuditoria.filter((arquivo) => arquivo.emUso);
    const storageTotalBytes = arquivosStorageAuditoria.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageEmUsoBytes = arquivosStorageAuditoriaEmUso.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageSemRegistroBytes = arquivosStorageAuditoriaSemRegistro.reduce((total, arquivo) => total + Number(arquivo.tamanho || 0), 0);
    const storageLimiteBytes = Math.max(1, LIMITE_STORAGE_MB * 1024 * 1024);
    const storagePercentual = calcularPercentualUsoStorage(storageTotalBytes);
    const storageStatus =
        storagePercentual >= 90
            ? {
                texto: "Crítico",
                detalhe: "Acima de 90% do limite configurado. Avaliar limpeza de arquivos sem vínculo ou aumento de plano.",
                classe: "bg-red-50 text-red-700 ring-red-200",
                barra: "bg-red-500",
            }
            : storagePercentual >= 70
                ? {
                    texto: "Atenção",
                    detalhe: "Entre 70% e 89% do limite configurado. Acompanhar crescimento dos uploads.",
                    classe: "bg-orange-50 text-orange-700 ring-orange-200",
                    barra: "bg-orange-500",
                }
                : {
                    texto: "Normal",
                    detalhe: "Até 70% do limite configurado. Capacidade dentro do controle esperado.",
                    classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                    barra: "bg-emerald-500",
                };

    const arquivosStorageFiltrados = arquivosStorageAuditoria
        .filter((arquivo) => {
            const empresa = obterEmpresaArquivoStorage(arquivo);
            const colaborador = obterColaboradorArquivoStorage(arquivo);
            const tipo = obterTipoArquivoStorage(arquivo);
            const dataArquivo = obterDataArquivoStorage(arquivo);

            const bateEmpresa = filtrosStorage.empresa === "Todas" || empresa === filtrosStorage.empresa;
            const bateColaborador = filtrosStorage.colaborador === "Todos" || colaborador === filtrosStorage.colaborador;
            const bateTipo = filtrosStorage.tipo === "Todos" || tipo === filtrosStorage.tipo;
            const bateInicio = !filtrosStorage.dataInicio || (dataArquivo && dataArquivo >= filtrosStorage.dataInicio);
            const bateFim = !filtrosStorage.dataFim || (dataArquivo && dataArquivo <= filtrosStorage.dataFim);
            const bateTamanho = tamanhoArquivoDentroDoFiltro(arquivo);
            const bateVinculo =
                filtrosStorage.vinculo === "Todos" ||
                (filtrosStorage.vinculo === "Com vínculo" && arquivo.emUso) ||
                (filtrosStorage.vinculo === "Sem vínculo" && !arquivo.emUso);

            return bateEmpresa && bateColaborador && bateTipo && bateInicio && bateFim && bateTamanho && bateVinculo;
        })
        .sort((a, b) => {
            const dataA = a.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
            const dataB = b.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;

            return dataB - dataA || Number(b.tamanho || 0) - Number(a.tamanho || 0);
        });

    const opcoesEmpresasStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterEmpresaArquivoStorage))).sort();
    const opcoesColaboradoresStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterColaboradorArquivoStorage))).sort();
    const opcoesTiposStorage = Array.from(new Set(arquivosStorageAuditoria.map(obterTipoArquivoStorage))).sort();

    const agruparArquivosStorage = (lista, obterChave) =>
        Object.values(
            lista.reduce((acc, arquivo) => {
                const chave = obterChave(arquivo) || "Não informado";

                if (!acc[chave]) {
                    acc[chave] = {
                        nome: chave,
                        arquivos: 0,
                        bytes: 0,
                        emUso: 0,
                        semRegistro: 0,
                    };
                }

                acc[chave].arquivos += 1;
                acc[chave].bytes += Number(arquivo.tamanho || 0);

                if (arquivo.emUso) acc[chave].emUso += 1;
                else acc[chave].semRegistro += 1;

                return acc;
            }, {})
        ).sort((a, b) => b.arquivos - a.arquivos || b.bytes - a.bytes || a.nome.localeCompare(b.nome));

    const arquivosPorEmpresaStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterEmpresaArquivoStorage);
    const arquivosPorTipoStorage = agruparArquivosStorage(arquivosStorageAuditoria, obterTipoArquivoStorage);
    const storagePorBucket = agruparArquivosStorage(arquivosStorageAuditoria, (arquivo) => arquivo.bucket || "storage")
        .map((item) => ({ ...item, bucket: item.nome }))
        .sort((a, b) => b.bytes - a.bytes);
    const maioresArquivosStorage = [...arquivosStorageAuditoria]
        .sort((a, b) => Number(b.tamanho || 0) - Number(a.tamanho || 0))
        .slice(0, 6);
    const ultimoUploadStorage = [...arquivosStorageAuditoria]
        .filter((arquivo) => arquivo.atualizadoEm)
        .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())[0];

    const carregarStorageAuditoria = async () => {
        if (!onListarArquivosStorage) return;

        setCarregandoStorageAuditoria(true);

        const lista = await onListarArquivosStorage();

        setArquivosStorageAuditoria(lista || []);
        setCarregandoStorageAuditoria(false);
    };

    const excluirStorageAuditoria = async (arquivo) => {
        if (!onExcluirArquivoStorage) return;

        setExcluindoStorageAuditoria(arquivo.caminho);

        const ok = await onExcluirArquivoStorage(arquivo);

        setExcluindoStorageAuditoria("");

        if (ok) {
            const lista = await onListarArquivosStorage();
            setArquivosStorageAuditoria(lista || []);
            onAtualizar?.();
        }
    };

    const carregarUsuariosAuditoria = async () => {
        if (!onListarUsuariosAuditoria) return;

        setCarregandoUsuariosAuditoria(true);

        const lista = await onListarUsuariosAuditoria();

        setUsuariosAuditoria(lista || []);
        setCarregandoUsuariosAuditoria(false);
    };

    const salvarUsuarioAuditoriaTela = async (evento) => {
        evento.preventDefault();

        if (!novoUsuarioAuditoria.email.trim()) {
            alert("Informe o e-mail do usuário que terá acesso à Auditoria.");
            return;
        }

        setSalvandoUsuarioAuditoria(true);

        const ok = await onSalvarUsuarioAuditoria?.({
            ...novoUsuarioAuditoria,
            email: novoUsuarioAuditoria.email.trim().toLowerCase(),
            nome: novoUsuarioAuditoria.nome.trim(),
            funcao: novoUsuarioAuditoria.funcao.trim(),
        });

        setSalvandoUsuarioAuditoria(false);

        if (ok) {
            setNovoUsuarioAuditoria({ email: "", nome: "", funcao: "" });
            carregarUsuariosAuditoria();
        }
    };

    const alternarUsuarioAuditoriaTela = async (usuarioAutorizado) => {
        setAlterandoUsuarioAuditoria(usuarioAutorizado.id);

        const ok = await onAlternarUsuarioAuditoria?.(usuarioAutorizado);

        setAlterandoUsuarioAuditoria("");

        if (ok) {
            carregarUsuariosAuditoria();
        }
    };

    const baixarCsvAuditoria = () => {
        const cabecalho = ["Data/Hora", "Usuário", "Ação", "Tabela", "Registro", "Descrição", "Origem do acesso", "Página", "Navegador", "Plataforma"];
        const linhas = registrosFiltrados.map((item) => {
            const origemAcesso = item.dados?.origemAcesso || {};

            return [
                new Date(item.created_at).toLocaleString("pt-BR"),
                item.usuario_email || "-",
                item.acao || "-",
                item.tabela || "-",
                item.registro_id || "-",
                item.descricao || "-",
                origemAcesso.url || "-",
                origemAcesso.pagina || "-",
                origemAcesso.navegador || "-",
                origemAcesso.plataforma || "-",
            ];
        });

        const csv = [cabecalho, ...linhas]
            .map((linha) => linha.map((campo) => `"${String(campo).replace(/"/g, '""')}"`).join(";"))
            .join("\n");

        const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = `relatorio-auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();

        URL.revokeObjectURL(url);
    };

    return (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Header
                titulo="Auditoria do sistema"
                subtitulo="Relatório de acessos, consultas QR e alterações feitas no banco de dados."
                acao={
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={onAtualizar}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <RefreshCw className="h-4 w-4" />
                            Atualizar
                        </button>

                        <button
                            onClick={onBloquear}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                        >
                            <Lock className="h-4 w-4" />
                            Bloquear auditoria
                        </button>

                        <button
                            onClick={baixarCsvAuditoria}
                            className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
                        >
                            <Download className="h-4 w-4" />
                            Baixar CSV
                        </button>
                    </div>
                }
            />

            <div className="grid gap-3 md:grid-cols-4">
                <CardRecolhivel titulo="Total de eventos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-slate-950">{auditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Eventos filtrados" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{registrosFiltrados.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Acessos" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">
                        {auditoriaVerificada.filter((item) => String(item.acao || "").includes("ACESSO")).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="Alterações" defaultOpen compacto>
                    <p className="text-3xl font-bold text-orange-700">
                        {auditoriaVerificada.filter((item) => ["INSERT", "UPDATE", "DELETE"].includes(item.acao)).length}
                    </p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails no mês" defaultOpen compacto>
                    <p className="text-3xl font-bold text-blue-700">{emailsMesAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com sucesso" defaultOpen compacto>
                    <p className="text-3xl font-bold text-emerald-700">{emailsSucessoAuditoria.length}</p>
                </CardRecolhivel>

                <CardRecolhivel titulo="E-mails com erro" defaultOpen compacto>
                    <p className="text-3xl font-bold text-red-700">{emailsErroAuditoria.length}</p>
                </CardRecolhivel>
            </div>

            <AuditoriaAtividades
                ultimosAcessosAuditoria={ultimosAcessosAuditoria}
                ultimosEmailsAuditoria={ultimosEmailsAuditoria}
            />

            <CardRecolhivel
                className="mt-5"
                titulo="Eventos verificados pela Auditoria de sistema"
                subtitulo="Habilite ou desabilite quais tipos de evento devem ser registrados e exibidos no relatório. A configuração é salva localmente e sincronizada no Supabase quando a tabela estiver criada."
                contador={`${eventosHabilitadosAuditoria}/${eventosAuditoriaSistema.length}`}
                defaultOpen={false}
                acao={(
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => definirTodosEventosAuditoria(true)}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Habilitar todos
                        </button>
                        <button
                            type="button"
                            onClick={() => definirTodosEventosAuditoria(false)}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Desabilitar todos
                        </button>
                        <button
                            type="button"
                            onClick={restaurarPadraoEventosAuditoria}
                            disabled={salvandoConfigEventosAuditoria}
                            className="rounded-2xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            Restaurar padrão
                        </button>
                    </div>
                )}
            >
                <div className="mb-4 rounded-3xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-slate-200">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                            <p className="font-black text-slate-950">Status da configuração</p>
                            <p className="mt-1 text-xs leading-relaxed text-slate-500">
                                Origem atual: <strong>{origemConfigEventosAuditoria === "supabase" ? "Supabase" : "Local do navegador"}</strong>
                                {carregandoConfigEventosAuditoria ? " · carregando..." : ""}
                                {salvandoConfigEventosAuditoria ? " · salvando..." : ""}
                            </p>
                        </div>
                        <span className={classNames(
                            "w-fit rounded-full px-3 py-1 text-xs font-black uppercase ring-1",
                            origemConfigEventosAuditoria === "supabase"
                                ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                : "bg-orange-50 text-orange-700 ring-orange-200"
                        )}>
                            {origemConfigEventosAuditoria === "supabase" ? "Sincronizado" : "Local"}
                        </span>
                    </div>
                    {mensagemConfigEventosAuditoria && (
                        <p className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-500 ring-1 ring-slate-200">
                            {mensagemConfigEventosAuditoria}
                        </p>
                    )}
                </div>

                <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-black uppercase tracking-wide text-emerald-700">Habilitados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{eventosHabilitadosAuditoria}</p>
                    </div>
                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-black uppercase tracking-wide text-red-700">Desabilitados</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{eventosDesabilitadosAuditoria}</p>
                    </div>
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-black uppercase tracking-wide text-slate-500">Eventos carregados</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{auditoria.length}</p>
                    </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-2">
                    {eventosAuditoriaSistema.map((evento) => (
                        <div
                            key={evento.chave}
                            className={classNames(
                                "rounded-3xl border p-4 transition",
                                evento.habilitado
                                    ? "border-emerald-200 bg-emerald-50/70"
                                    : "border-red-200 bg-red-50/70"
                            )}
                        >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black uppercase text-slate-500 ring-1 ring-slate-200">
                                            {evento.categoria}
                                        </span>
                                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                                            {evento.total} registro(s)
                                        </span>
                                    </div>
                                    <p className="mt-2 break-words text-sm font-black text-slate-950">{evento.label}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-slate-500">{evento.descricao}</p>
                                    <p className="mt-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">Ação: {evento.chave}</p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarEventoAuditoria(evento.chave)}
                                    disabled={salvandoConfigEventosAuditoria}
                                    className={classNames(
                                        "shrink-0 rounded-2xl px-4 py-2 text-xs font-black uppercase ring-1 disabled:cursor-not-allowed disabled:opacity-60",
                                        evento.habilitado
                                            ? "bg-emerald-100 text-emerald-700 ring-emerald-200 hover:bg-emerald-200"
                                            : "bg-red-100 text-red-700 ring-red-200 hover:bg-red-200"
                                    )}
                                >
                                    {evento.habilitado ? "Habilitado" : "Desabilitado"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-4 rounded-2xl bg-blue-50 p-3 text-xs leading-relaxed text-blue-700 ring-1 ring-blue-100">
                    Eventos desabilitados deixam de aparecer nos filtros, cards e CSV da Auditoria de sistema. Novos eventos desabilitados também deixam de ser gravados neste navegador enquanto a configuração estiver salva.
                </p>
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Permissões da Auditoria de sistema"
                subtitulo="Libere ou bloqueie diretamente pelo sistema quem pode acessar somente a Auditoria de sistema. Dashboard Auditoria e Nova Auditoria continuam liberados para todos."
                contador={usuariosAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarUsuariosAuditoria}
                        disabled={carregandoUsuariosAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                    >
                        <RefreshCw className={classNames("h-4 w-4", carregandoUsuariosAuditoria ? "animate-spin" : "")} />
                        {carregandoUsuariosAuditoria ? "Carregando..." : "Carregar usuários"}
                    </button>
                )}
            >
                <form onSubmit={salvarUsuarioAuditoriaTela} className="grid gap-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
                    <input
                        type="email"
                        value={novoUsuarioAuditoria.email}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, email: e.target.value })}
                        placeholder="E-mail do usuário"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.nome}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, nome: e.target.value })}
                        placeholder="Nome"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <input
                        value={novoUsuarioAuditoria.funcao}
                        onChange={(e) => setNovoUsuarioAuditoria({ ...novoUsuarioAuditoria, funcao: e.target.value })}
                        placeholder="Função"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />

                    <button
                        type="submit"
                        disabled={salvandoUsuarioAuditoria}
                        className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        {salvandoUsuarioAuditoria ? "Salvando..." : "Liberar Auditoria de sistema"}
                    </button>
                </form>

                <div className="mt-4 space-y-2">
                    {usuariosAuditoria.length === 0 && !carregandoUsuariosAuditoria && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Clique em <strong>Carregar usuários</strong> para visualizar quem tem acesso à Auditoria de sistema.
                        </div>
                    )}

                    {usuariosAuditoria.map((usuarioAutorizado) => (
                        <div
                            key={usuarioAutorizado.id}
                            className={classNames(
                                "rounded-3xl border p-4",
                                usuarioAutorizado.pode_acessar_auditoria
                                    ? "border-emerald-200 bg-emerald-50"
                                    : "border-red-200 bg-red-50"
                            )}
                        >
                            <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="break-words font-bold text-slate-950">{usuarioAutorizado.email}</p>
                                        <span
                                            className={classNames(
                                                "rounded-full px-3 py-1 text-xs font-bold ring-1",
                                                usuarioAutorizado.pode_acessar_auditoria
                                                    ? "bg-emerald-100 text-emerald-700 ring-emerald-200"
                                                    : "bg-red-100 text-red-700 ring-red-200"
                                            )}
                                        >
                                            {usuarioAutorizado.pode_acessar_auditoria ? "Auditoria de sistema liberada" : "Auditoria de sistema bloqueada"}
                                        </span>
                                    </div>

                                    <p className="mt-1 text-sm text-slate-500">
                                        {usuarioAutorizado.nome || "Nome não informado"} · {usuarioAutorizado.funcao || "Função não informada"}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-500">
                                        Perfil: {usuarioAutorizado.perfil || "usuario"} · Usuário {usuarioAutorizado.ativo ? "ativo" : "inativo"}
                                        {usuarioAutorizado.acesso_global ? " · Administrador global" : ""}
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => alternarUsuarioAuditoriaTela(usuarioAutorizado)}
                                    disabled={alterandoUsuarioAuditoria === usuarioAutorizado.id}
                                    className={classNames(
                                        "whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold ring-1 disabled:opacity-60",
                                        usuarioAutorizado.pode_acessar_auditoria
                                            ? "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                            : "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                                    )}
                                >
                                    {alterandoUsuarioAuditoria === usuarioAutorizado.id
                                        ? "Atualizando..."
                                        : usuarioAutorizado.pode_acessar_auditoria
                                            ? "Bloquear Auditoria de sistema"
                                            : "Liberar Auditoria de sistema"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-3 rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500">
                    Use esta área para liberar ou bloquear somente a Auditoria de sistema sem editar SQL manualmente. O Dashboard Auditoria e a Nova Auditoria permanecem disponíveis para todos os usuários logados.
                </p>
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Arquivos salvos no Storage"
                subtitulo="Controle de capacidade, vínculos, tipos de documentos, maiores arquivos e uploads recentes."
                contador={arquivosStorageAuditoria.length}
                defaultOpen={false}
                acao={(
                    <button
                        type="button"
                        onClick={carregarStorageAuditoria}
                        disabled={carregandoStorageAuditoria}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                    >
                        <Database className="h-4 w-4" />
                        {carregandoStorageAuditoria ? "Carregando..." : "Carregar arquivos"}
                    </button>
                )}
            >
                <div className={classNames("mb-4 rounded-3xl p-4 ring-1", storageStatus.classe)}>
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                        <div>
                            <p className="text-sm font-bold">Alerta de armazenamento: {storageStatus.texto}</p>
                            <p className="mt-1 text-xs leading-relaxed">{storageStatus.detalhe}</p>
                        </div>
                        <div className="text-left lg:text-right">
                            <p className="text-3xl font-black">{storagePercentual}%</p>
                            <p className="text-xs font-semibold">{formatarBytes(storageTotalBytes)} de {formatarBytes(storageLimiteBytes)}</p>
                        </div>
                    </div>

                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/80 ring-1 ring-white/70">
                        <div
                            className={classNames("h-full rounded-full", storageStatus.barra)}
                            style={{ width: `${Math.max(2, storagePercentual)}%` }}
                        />
                    </div>

                    <p className="mt-2 text-[11px] leading-relaxed opacity-80">
                        Regra visual: até 70% normal; de 70% a 89% atenção; acima de 90% crítico.
                    </p>
                </div>

                <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total usado</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{formatarBytes(storageTotalBytes)}</p>
                        <p className="mt-1 text-xs text-slate-500">Limite: {formatarBytes(storageLimiteBytes)}</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Total de arquivos</p>
                        <p className="mt-2 text-2xl font-black text-slate-950">{arquivosStorageAuditoria.length}</p>
                        <p className="mt-1 text-xs text-slate-500">{arquivosStorageFiltrados.length} exibido(s) no filtro</p>
                    </div>

                    <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">Arquivos vinculados</p>
                        <p className="mt-2 text-2xl font-black text-emerald-800">{arquivosStorageAuditoriaEmUso.length}</p>
                        <p className="mt-1 text-xs text-emerald-700">{formatarBytes(storageEmUsoBytes)} em registros ativos</p>
                    </div>

                    <div className="rounded-3xl bg-red-50 p-4 ring-1 ring-red-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-700">Sem vínculo</p>
                        <p className="mt-2 text-2xl font-black text-red-800">{arquivosStorageAuditoriaSemRegistro.length}</p>
                        <p className="mt-1 text-xs text-red-700">{formatarBytes(storageSemRegistroBytes)} sem registro</p>
                    </div>

                    <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Último upload</p>
                        <p className="mt-2 break-words text-sm font-black text-slate-950">
                            {ultimoUploadStorage?.nome || "Nenhum arquivo carregado"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                            {ultimoUploadStorage?.atualizadoEm ? new Date(ultimoUploadStorage.atualizadoEm).toLocaleString("pt-BR") : "-"}
                        </p>
                    </div>
                </div>

                <div className="mb-5 grid gap-4 xl:grid-cols-3">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por empresa</h3>
                        <p className="mt-1 text-xs text-slate-500">Quantidade e tamanho por empresa vinculada ao arquivo.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorEmpresaStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorEmpresaStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.semRegistro} sem vínculo</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Arquivos por tipo</h3>
                        <p className="mt-1 text-xs text-slate-500">Certificados, documentos empresariais, contratos, logos e fotos.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosPorTipoStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {arquivosPorTipoStorage.slice(0, 10).map((item) => (
                                <div key={item.nome} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <div className="flex justify-between gap-3">
                                        <span className="break-words font-bold text-slate-700">{item.nome}</span>
                                        <span className="shrink-0 font-bold text-slate-950">{item.arquivos}</span>
                                    </div>
                                    <p className="mt-1 text-slate-500">{formatarBytes(item.bytes)} · {item.emUso} vinculados</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Maiores arquivos</h3>
                        <p className="mt-1 text-xs text-slate-500">Prioridade para limpeza ou compactação quando o uso crescer.</p>
                        <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {maioresArquivosStorage.length === 0 && (
                                <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Carregue os arquivos para visualizar.</p>
                            )}
                            {maioresArquivosStorage.map((arquivo) => (
                                <div key={`${arquivo.bucket}-${arquivo.caminho}`} className="rounded-2xl bg-slate-50 px-3 py-2 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{arquivo.nome}</p>
                                    <p className="mt-1 text-slate-500">
                                        {formatarBytes(arquivo.tamanho || 0)} · {obterEmpresaArquivoStorage(arquivo)} · {arquivo.emUso ? "vinculado" : "sem vínculo"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mb-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <div>
                            <h3 className="font-bold text-slate-950">Filtros dos arquivos salvos</h3>
                            <p className="mt-1 text-xs text-slate-500">Filtre por empresa, colaborador, tipo, data de envio, tamanho e vínculo.</p>
                        </div>

                        <button
                            type="button"
                            onClick={() => setFiltrosStorage({
                                empresa: "Todas",
                                colaborador: "Todos",
                                tipo: "Todos",
                                dataInicio: "",
                                dataFim: "",
                                tamanho: "Todos",
                                vinculo: "Todos",
                            })}
                            className="w-fit rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                            Limpar filtros
                        </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <select
                            value={filtrosStorage.empresa}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, empresa: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todas">Todas as empresas</option>
                            {opcoesEmpresasStorage.map((empresa) => (
                                <option key={empresa} value={empresa}>{empresa}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.colaborador}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, colaborador: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os colaboradores</option>
                            {opcoesColaboradoresStorage.map((colaborador) => (
                                <option key={colaborador} value={colaborador}>{colaborador}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tipo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tipo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tipos</option>
                            {opcoesTiposStorage.map((tipo) => (
                                <option key={tipo} value={tipo}>{tipo}</option>
                            ))}
                        </select>

                        <select
                            value={filtrosStorage.tamanho}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tamanho: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Todos os tamanhos</option>
                            <option value="ate-1mb">Até 1 MB</option>
                            <option value="1mb-10mb">1 MB a 10 MB</option>
                            <option value="10mb-50mb">10 MB a 50 MB</option>
                            <option value="acima-50mb">Acima de 50 MB</option>
                        </select>

                        <select
                            value={filtrosStorage.vinculo}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, vinculo: e.target.value }))}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        >
                            <option value="Todos">Com e sem vínculo</option>
                            <option value="Com vínculo">Somente vinculados</option>
                            <option value="Sem vínculo">Somente sem vínculo</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="date"
                                value={filtrosStorage.dataInicio}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataInicio: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data inicial de envio"
                            />
                            <input
                                type="date"
                                value={filtrosStorage.dataFim}
                                onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataFim: e.target.value }))}
                                className="min-w-0 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                                title="Data final de envio"
                            />
                        </div>
                    </div>
                </div>

                {storagePorBucket.length > 0 && (
                    <div className="mb-5 rounded-3xl border border-slate-200 bg-white p-4">
                        <h3 className="font-bold text-slate-950">Uso por bucket</h3>
                        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                            {storagePorBucket.map((bucketInfo) => (
                                <div key={bucketInfo.bucket} className="rounded-2xl bg-slate-50 p-3 text-xs ring-1 ring-slate-200">
                                    <p className="break-words font-bold text-slate-700">{bucketInfo.bucket}</p>
                                    <p className="mt-1 text-slate-500">
                                        {bucketInfo.arquivos} arquivo(s) · {formatarBytes(bucketInfo.bytes)}
                                    </p>
                                    <p className="mt-1 text-slate-400">
                                        {bucketInfo.emUso} em uso · {bucketInfo.semRegistro} sem vínculo
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {arquivosStorageAuditoria.length === 0 && !carregandoStorageAuditoria && (
                    <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                        Clique em <strong>Carregar arquivos</strong> para consultar o Storage.
                    </div>
                )}

                {arquivosStorageAuditoria.length > 0 && (
                    <div>
                        <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                            <p className="text-sm font-bold text-slate-950">
                                Arquivos encontrados: {arquivosStorageFiltrados.length} de {arquivosStorageAuditoria.length}
                            </p>
                            <p className="text-xs text-slate-500">
                                Exibindo primeiro os uploads mais recentes.
                            </p>
                        </div>

                        {arquivosStorageFiltrados.length === 0 && (
                            <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                Nenhum arquivo encontrado com os filtros selecionados.
                            </div>
                        )}

                        {arquivosStorageFiltrados.length > 0 && (
                            <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                {arquivosStorageFiltrados.map((arquivo) => (
                                    <div
                                        key={`${arquivo.bucket}-${arquivo.caminho}`}
                                        className={classNames(
                                            "rounded-2xl px-3 py-2 text-sm ring-1",
                                            arquivo.emUso
                                                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                                : "bg-red-50 text-red-900 ring-red-100"
                                        )}
                                    >
                                        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="break-words font-bold">{arquivo.nome}</p>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {arquivo.emUso ? "Em uso" : "Sem vínculo"}
                                                    </span>
                                                    <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                        {formatarBytes(arquivo.tamanho || 0)}
                                                    </span>
                                                </div>

                                                <p className="mt-1 break-words text-xs opacity-80">
                                                    <strong>Empresa:</strong> {obterEmpresaArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Colaborador:</strong> {obterColaboradorArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Tipo:</strong> {obterTipoArquivoStorage(arquivo)}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Bucket:</strong> {arquivo.bucket || "-"} · <strong>Pasta:</strong> {arquivo.pasta || "raiz"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Fonte do vínculo:</strong> {arquivo.tabelaOrigem || arquivo.origemRegistro || "Somente Storage"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Data de envio/atualização:</strong> {arquivo.atualizadoEm ? new Date(arquivo.atualizadoEm).toLocaleString("pt-BR") : "Não identificada"}
                                                </p>
                                                <p className="break-words text-xs opacity-80">
                                                    <strong>Caminho:</strong> {arquivo.caminho}
                                                </p>

                                                {!arquivo.emUso && (
                                                    <p className="mt-1 break-words text-xs font-semibold text-red-700">
                                                        Arquivo sem vínculo com registro atual do sistema.
                                                    </p>
                                                )}
                                            </div>

                                            <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                                                <button
                                                    type="button"
                                                    onClick={() => excluirStorageAuditoria(arquivo)}
                                                    disabled={arquivo.emUso || excluindoStorageAuditoria === arquivo.caminho}
                                                    title={arquivo.emUso ? "Arquivo em uso não pode ser excluído por aqui" : "Excluir arquivo sem vínculo do Storage"}
                                                    className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                                                >
                                                    {excluindoStorageAuditoria === arquivo.caminho ? "Excluindo..." : "Excluir"}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {arquivosStorageAuditoriaSemRegistro.length > 0 && (
                    <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700 ring-1 ring-red-100">
                        Use excluir apenas para arquivos sem vínculo. Arquivos em uso devem ser tratados pela base correta para manter o histórico do sistema.
                    </p>
                )}
            </CardRecolhivel>

            <CardRecolhivel
                className="mt-5"
                titulo="Registros detalhados da auditoria"
                subtitulo="Consulta completa com filtros, origem de acesso e dados extras de cada evento."
                contador={registrosFiltrados.length}
                defaultOpen={false}
            >
                <div className="grid gap-3 xl:grid-cols-[1fr_220px]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            value={busca}
                            onChange={(e) => setBusca(e.target.value)}
                            placeholder="Buscar por usuário, ação, tabela, registro ou descrição"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </div>

                    <select
                        value={filtroAcao}
                        onChange={(e) => setFiltroAcao(e.target.value)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    >
                        <option value="Todas">Todas as ações</option>
                        {acoes.map((acao) => (
                            <option key={acao} value={acao}>
                                {acao}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mt-5 space-y-3">
                    {carregando && (
                        <div className="rounded-3xl bg-slate-50 p-6 text-center text-sm text-slate-500">
                            Carregando auditoria...
                        </div>
                    )}

                    {!carregando && registrosFiltrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                            <Database className="mx-auto h-10 w-10 text-slate-300" />
                            <h3 className="mt-3 font-bold text-slate-900">Nenhum evento encontrado</h3>
                            <p className="mt-1 text-sm text-slate-500">
                                Quando houver acesso ou alteração no sistema, os eventos aparecerão aqui.
                            </p>
                        </div>
                    )}

                    {registrosFiltrados.map((item) => {
                        const origemAcesso = item.dados?.origemAcesso || {};
                        const temOrigemAcesso = Boolean(origemAcesso.url || origemAcesso.pagina || origemAcesso.navegador || origemAcesso.plataforma);
                        const dadosExtras = item.dados && typeof item.dados === "object"
                            ? Object.fromEntries(Object.entries(item.dados).filter(([chave]) => chave !== "origemAcesso"))
                            : {};
                        const temDadosExtras = Object.keys(dadosExtras).length > 0;
                        const detalhesAberto = Boolean(detalhesAuditoriaAbertos[item.id]);
                        const podeAbrirDetalhes = temOrigemAcesso || temDadosExtras || item.registro_id;

                        return (
                            <div key={item.id} className="rounded-3xl border border-slate-200 bg-white p-4">
                                <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
                                                {item.acao || "-"}
                                            </span>
                                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                                {item.tabela || "-"}
                                            </span>
                                        </div>

                                        <p className="mt-3 font-bold text-slate-950">{item.descricao || "Evento registrado"}</p>
                                        <p className="mt-1 text-sm text-slate-500">
                                            Usuário: <strong>{item.usuario_email || "Sistema / consulta pública"}</strong>
                                        </p>
                                    </div>

                                    <div className="flex shrink-0 flex-col gap-2 lg:items-end">
                                        <p className="text-sm font-semibold text-slate-500">
                                            {item.created_at ? new Date(item.created_at).toLocaleString("pt-BR") : "-"}
                                        </p>

                                        {podeAbrirDetalhes && (
                                            <button
                                                type="button"
                                                onClick={() => alternarDetalhesAuditoria(item.id)}
                                                className="inline-flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
                                            >
                                                {detalhesAberto ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                                {detalhesAberto ? "Fechar detalhes" : "Abrir detalhes"}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {detalhesAberto && (
                                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                                        <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                            <p className="font-bold text-slate-700">Informações do registro</p>
                                            <p className="mt-1 break-words">
                                                <strong>Registro:</strong> {item.registro_id || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Tabela:</strong> {item.tabela || "-"}
                                            </p>
                                            <p className="break-words">
                                                <strong>Ação:</strong> {item.acao || "-"}
                                            </p>
                                        </div>

                                        {temOrigemAcesso && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100">
                                                <p className="font-bold text-slate-700">Origem do acesso</p>
                                                <p className="mt-1 break-words">
                                                    <strong>URL:</strong> {origemAcesso.url || "-"}
                                                </p>
                                                <p className="break-words">
                                                    <strong>Página:</strong> {origemAcesso.pagina || "-"}
                                                </p>
                                                <p>
                                                    <strong>Navegador:</strong> {origemAcesso.navegador || "-"}
                                                    {origemAcesso.plataforma ? ` · Plataforma: ${origemAcesso.plataforma}` : ""}
                                                    {origemAcesso.idioma ? ` · Idioma: ${origemAcesso.idioma}` : ""}
                                                </p>
                                            </div>
                                        )}

                                        {temDadosExtras && (
                                            <div className="rounded-2xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-500 ring-1 ring-slate-100 lg:col-span-2">
                                                <p className="font-bold text-slate-700">Outras informações</p>
                                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-white p-3 text-[11px] text-slate-600 ring-1 ring-slate-100 scrollbar-discreta">
                                                    {JSON.stringify(dadosExtras, null, 2)}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {!carregando && auditoriaVerificada.length > 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <p className="text-sm font-bold text-slate-800">
                                        Registros carregados: {auditoriaVerificada.length}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {existeMaisAuditoria
                                            ? "Existem registros antigos disponíveis. Carregue mais somente quando precisar consultar histórico anterior."
                                            : "Todos os registros disponíveis para esta consulta já foram carregados."}
                                    </p>
                                </div>

                                {existeMaisAuditoria ? (
                                    <button
                                        type="button"
                                        onClick={onCarregarMaisAuditoria}
                                        disabled={carregandoMaisAuditoria || !onCarregarMaisAuditoria}
                                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                                    >
                                        <RefreshCw className={classNames("h-4 w-4", carregandoMaisAuditoria && "animate-spin")} />
                                        {carregandoMaisAuditoria ? "Carregando..." : "Carregar mais registros"}
                                    </button>
                                ) : (
                                    <span className="inline-flex items-center justify-center rounded-2xl bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                                        Histórico carregado
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardRecolhivel>
        </motion.div>
    );
}








