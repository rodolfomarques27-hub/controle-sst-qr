import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Database, HardDrive, RefreshCw, Search, Trash2 } from "lucide-react";
import { Card } from "../commonComponents";
import {
    ACOES_CRITICAS_PERMISSAO_SISTEMA,
    obterBloqueioVisualAcaoCriticaSistema,
} from "../../services/usuariosPermissoesSistemaService";
import { classNames, formatarBytes } from "../../utils/sstUtils";

const FILTROS_STORAGE_PADRAO = Object.freeze({
    busca: "",
    bucket: "Todos",
    empresa: "Todas",
    colaborador: "Todos",
    tipo: "Todos",
    dataInicio: "",
    dataFim: "",
    tamanho: "Todos",
    vinculo: "Todos",
});

const QUANTIDADE_INICIAL_ARQUIVOS_STORAGE = 40;
const QUANTIDADE_INCREMENTO_ARQUIVOS_STORAGE = 40;

const arquivoStorageTemDestinoValido = (arquivo) => Boolean(arquivo?.bucket && arquivo?.caminho);

const arquivoStoragePodeSerExcluido = (arquivo) =>
    !arquivo?.emUso &&
    !arquivo?.ativoSistema &&
    !arquivo?.protegidoSistema &&
    arquivoStorageTemDestinoValido(arquivo);

const arquivoStorageForaDePasta = (arquivo) => {
    const caminho = String(arquivo?.caminho || "")
        .trim()
        .replace(/^\/+|\/+$/g, "");

    if (!caminho) return false;

    const pasta = String(arquivo?.pasta || "")
        .trim()
        .toLowerCase();

    const pastaInformada =
        pasta &&
        pasta !== "raiz" &&
        pasta !== "root" &&
        pasta !== "/";

    if (pastaInformada) return false;

    return !caminho.includes("/");
};

const obterEmpresaArquivoStorage = (arquivo) =>
    arquivo?.empresaNome || arquivo?.colaboradorEmpresa || "Sem empresa vinculada";

const obterColaboradorArquivoStorage = (arquivo) =>
    arquivo?.colaboradorNome || "Sem colaborador vinculado";

const obterTipoArquivoStorage = (arquivo) =>
    arquivo?.tipoDocumentoEmpresa || arquivo?.treinamentoNome || arquivo?.origemTipo || arquivo?.bucket || "Tipo não identificado";

const normalizarBuscaStorage = (valor) =>
    String(valor || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

const obterTextoBuscaArquivoStorage = (arquivo) => normalizarBuscaStorage([
    arquivo?.nome,
    arquivo?.bucket,
    arquivo?.caminho,
    arquivo?.origemTipo,
    arquivo?.tabelaOrigem,
    arquivo?.origemRegistro,
    arquivo?.ativoSistema ? "ativo do sistema protegido" : "",
    arquivo?.registroId,
    obterEmpresaArquivoStorage(arquivo),
    obterColaboradorArquivoStorage(arquivo),
    obterTipoArquivoStorage(arquivo),
].filter(Boolean).join(" "));

const obterDataArquivoStorage = (arquivo) => {
    if (!arquivo?.atualizadoEm) return "";

    const data = new Date(arquivo.atualizadoEm);
    return Number.isNaN(data.getTime()) ? "" : data.toISOString().slice(0, 10);
};

function tamanhoArquivoDentroDoFiltro(arquivo, filtroTamanho) {
    const tamanho = Number(arquivo?.tamanho || 0);

    if (filtroTamanho === "Todos") return true;
    if (filtroTamanho === "ate-1mb") return tamanho <= 1024 ** 2;
    if (filtroTamanho === "1mb-10mb") return tamanho > 1024 ** 2 && tamanho <= 10 * 1024 ** 2;
    if (filtroTamanho === "10mb-50mb") return tamanho > 10 * 1024 ** 2 && tamanho <= 50 * 1024 ** 2;
    if (filtroTamanho === "acima-50mb") return tamanho > 50 * 1024 ** 2;

    return true;
}

function agruparArquivosStorage(lista, obterChave) {
    return Object.values(
        lista.reduce((acc, arquivo) => {
            const chave = obterChave(arquivo) || "Não informado";

            if (!acc[chave]) {
                acc[chave] = {
                    nome: chave,
                    arquivos: 0,
                    bytes: 0,
                    ativosSistema: 0,
                    emUso: 0,
                    semRegistro: 0,
                };
            }

            acc[chave].arquivos += 1;
            acc[chave].bytes += Number(arquivo?.tamanho || 0);

            if (arquivo?.ativoSistema) acc[chave].ativosSistema += 1;
            else if (arquivo?.emUso) acc[chave].emUso += 1;
            else acc[chave].semRegistro += 1;

            return acc;
        }, {})
    ).sort((a, b) => b.arquivos - a.arquivos || b.bytes - a.bytes || a.nome.localeCompare(b.nome));
}

export function ArquivosStorageConfiguracoes({
    limiteStorageMb = 1024,
    permissaoSistemaUsuario = null,
    onListarArquivosStorage,
    onExcluirArquivoStorage,
    onAtualizarAuditoria,
    controleCard = null,
}) {
    const [filtrosStorage, setFiltrosStorage] = useState(FILTROS_STORAGE_PADRAO);
    const [storageRecolhido, setStorageRecolhido] = useState(false);
    const [arquivosStorage, setArquivosStorage] = useState([]);
    const [analiseStorageExecutada, setAnaliseStorageExecutada] = useState(false);
    const [carregandoStorage, setCarregandoStorage] = useState(false);
    const [progressoCarregamentoStorage, setProgressoCarregamentoStorage] = useState({ etapa: "", atual: 0, total: 1, mensagem: "" });
    const [excluindoStorage, setExcluindoStorage] = useState("");
    const [limpandoStorage, setLimpandoStorage] = useState(false);
    const [progressoLimpezaStorage, setProgressoLimpezaStorage] = useState({ atual: 0, total: 0 });
    const [confirmacaoLimpezaStorage, setConfirmacaoLimpezaStorage] = useState("");
    const [mostrarPainelLimpezaStorage, setMostrarPainelLimpezaStorage] = useState(false);
    const [mostrarPainelLimpezaForaPastas, setMostrarPainelLimpezaForaPastas] = useState(false);
    const [confirmacaoLimpezaForaPastas, setConfirmacaoLimpezaForaPastas] = useState("");
    const [limpandoForaPastas, setLimpandoForaPastas] = useState(false);
    const [progressoLimpezaForaPastas, setProgressoLimpezaForaPastas] = useState({ atual: 0, total: 0 });
    const [quantidadeArquivosVisiveis, setQuantidadeArquivosVisiveis] = useState(QUANTIDADE_INICIAL_ARQUIVOS_STORAGE);
    const permissaoSistemaAtual = permissaoSistemaUsuario;
    const mensagemPermissao = permissaoSistemaAtual
        ? "Permissão central carregada. A limpeza só fica disponível para perfil autorizado."
        : "Nenhuma permissão central disponível para o usuário autenticado.";
    const storageMontadoRef = useRef(false);

    useEffect(() => {
        storageMontadoRef.current = true;

        return () => {
            storageMontadoRef.current = false;
        };
    }, []);

    useEffect(() => {
        setQuantidadeArquivosVisiveis(QUANTIDADE_INICIAL_ARQUIVOS_STORAGE);
    }, [
        arquivosStorage.length,
        filtrosStorage.busca,
        filtrosStorage.bucket,
        filtrosStorage.empresa,
        filtrosStorage.colaborador,
        filtrosStorage.tipo,
        filtrosStorage.dataInicio,
        filtrosStorage.dataFim,
        filtrosStorage.tamanho,
        filtrosStorage.vinculo,
    ]);

    useEffect(() => {
        setConfirmacaoLimpezaStorage("");
    }, [
        arquivosStorage.length,
        filtrosStorage.busca,
        filtrosStorage.bucket,
        filtrosStorage.empresa,
        filtrosStorage.colaborador,
        filtrosStorage.tipo,
        filtrosStorage.dataInicio,
        filtrosStorage.dataFim,
        filtrosStorage.tamanho,
        filtrosStorage.vinculo,
    ]);

    useEffect(() => {
        setConfirmacaoLimpezaForaPastas("");
    }, [arquivosStorage.length]);


    const bloqueioLimparArquivosStorageSistema = useMemo(
        () => obterBloqueioVisualAcaoCriticaSistema(
            permissaoSistemaAtual,
            ACOES_CRITICAS_PERMISSAO_SISTEMA.LIMPAR_ARQUIVOS
        ),
        [permissaoSistemaAtual]
    );

    const arquivosAtivosSistema = arquivosStorage.filter((arquivo) => arquivo.ativoSistema);
    const arquivosSemRegistro = arquivosStorage.filter((arquivo) => !arquivo.emUso && !arquivo.ativoSistema);
    const arquivosSemRegistroExcluiveis = arquivosStorage.filter(arquivoStoragePodeSerExcluido);
    const arquivosEmUso = arquivosStorage.filter((arquivo) => arquivo.emUso && !arquivo.ativoSistema);
    const storageTotalBytes = arquivosStorage.reduce((total, arquivo) => total + Number(arquivo?.tamanho || 0), 0);
    const storageAtivosSistemaBytes = arquivosAtivosSistema.reduce((total, arquivo) => total + Number(arquivo?.tamanho || 0), 0);
    const storageEmUsoBytes = arquivosEmUso.reduce((total, arquivo) => total + Number(arquivo?.tamanho || 0), 0);
    const storageSemRegistroBytes = arquivosSemRegistro.reduce((total, arquivo) => total + Number(arquivo?.tamanho || 0), 0);
    const storageLimiteBytes = Math.max(1, Number(limiteStorageMb || 1024) * 1024 * 1024);
    const storagePercentual = Math.round((storageTotalBytes / storageLimiteBytes) * 100);
    const storageLivreBytes = Math.max(0, storageLimiteBytes - storageTotalBytes);

    const storageStatus = storagePercentual >= 90
        ? {
            texto: "Crítico",
            detalhe: "Acima de 90% do limite administrativo configurado. Avalie limpar arquivos sem vínculo ou revisar o plano do Supabase.",
            classe: "bg-red-50 text-red-700 ring-red-200",
            barra: "bg-red-500",
        }
        : storagePercentual >= 70
            ? {
                texto: "Atenção",
                detalhe: "Entre 70% e 89% do limite administrativo configurado. Acompanhe o crescimento dos uploads.",
                classe: "bg-orange-50 text-orange-700 ring-orange-200",
                barra: "bg-orange-500",
            }
            : {
                texto: "Normal",
                detalhe: "Até 70% do limite administrativo configurado. Capacidade dentro do controle esperado.",
                classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
                barra: "bg-emerald-500",
            };

    const arquivosFiltrados = arquivosStorage
        .filter((arquivo) => {
            const empresa = obterEmpresaArquivoStorage(arquivo);
            const colaborador = obterColaboradorArquivoStorage(arquivo);
            const tipo = obterTipoArquivoStorage(arquivo);
            const dataArquivo = obterDataArquivoStorage(arquivo);
            const buscaTratada = normalizarBuscaStorage(filtrosStorage.busca);
            const textoBuscaArquivo = obterTextoBuscaArquivoStorage(arquivo);

            const bateBusca = !buscaTratada || textoBuscaArquivo.includes(buscaTratada);
            const bateBucket = filtrosStorage.bucket === "Todos" || arquivo?.bucket === filtrosStorage.bucket;
            const bateEmpresa = filtrosStorage.empresa === "Todas" || empresa === filtrosStorage.empresa;
            const bateColaborador = filtrosStorage.colaborador === "Todos" || colaborador === filtrosStorage.colaborador;
            const bateTipo = filtrosStorage.tipo === "Todos" || tipo === filtrosStorage.tipo;
            const bateInicio = !filtrosStorage.dataInicio || (dataArquivo && dataArquivo >= filtrosStorage.dataInicio);
            const bateFim = !filtrosStorage.dataFim || (dataArquivo && dataArquivo <= filtrosStorage.dataFim);
            const bateTamanho = tamanhoArquivoDentroDoFiltro(arquivo, filtrosStorage.tamanho);
            const bateVinculo = filtrosStorage.vinculo === "Todos"
                || (filtrosStorage.vinculo === "Ativos do sistema" && arquivo.ativoSistema)
                || (filtrosStorage.vinculo === "Com vínculo" && arquivo.emUso && !arquivo.ativoSistema)
                || (filtrosStorage.vinculo === "Sem vínculo" && !arquivo.emUso && !arquivo.ativoSistema);

            return bateBusca && bateBucket && bateEmpresa && bateColaborador && bateTipo && bateInicio && bateFim && bateTamanho && bateVinculo;
        })
        .sort((a, b) => {
            const dataA = a?.atualizadoEm ? new Date(a.atualizadoEm).getTime() : 0;
            const dataB = b?.atualizadoEm ? new Date(b.atualizadoEm).getTime() : 0;

            return dataB - dataA || Number(b?.tamanho || 0) - Number(a?.tamanho || 0);
        });

    const arquivosFiltradosVisiveis = arquivosFiltrados.slice(0, quantidadeArquivosVisiveis);
    const existemMaisArquivosFiltrados = arquivosFiltradosVisiveis.length < arquivosFiltrados.length;
    const arquivosFiltradosSemVinculo = arquivosFiltrados.filter(arquivoStoragePodeSerExcluido);
    const storageFiltradoSemVinculoBytes = arquivosFiltradosSemVinculo.reduce(
        (total, arquivo) => total + Number(arquivo?.tamanho || 0),
        0
    );

    const filtroLimpezaSemVinculoAtivo = filtrosStorage.vinculo === "Sem vínculo";
    const confirmacaoLimpezaValida = confirmacaoLimpezaStorage.trim().toUpperCase() === "LIMPAR";

    const arquivosForaPastas =
        arquivosStorage.filter(arquivoStorageForaDePasta);

    const arquivosForaPastasAptos =
        arquivosForaPastas.filter(arquivoStoragePodeSerExcluido);

    const arquivosForaPastasProtegidos =
        arquivosForaPastas.filter(
            (arquivo) => !arquivoStoragePodeSerExcluido(arquivo)
        );

    const storageForaPastasBytes =
        arquivosForaPastas.reduce(
            (total, arquivo) =>
                total + Number(arquivo?.tamanho || 0),
            0
        );

    const storageForaPastasAptosBytes =
        arquivosForaPastasAptos.reduce(
            (total, arquivo) =>
                total + Number(arquivo?.tamanho || 0),
            0
        );

    const confirmacaoLimpezaForaPastasValida =
        confirmacaoLimpezaForaPastas.trim().toUpperCase() === "LIMPAR";

    const mensagemBloqueioLimpezaForaPastas =
        bloqueioLimparArquivosStorageSistema.bloqueado
            ? bloqueioLimparArquivosStorageSistema.mensagem
            : arquivosForaPastasAptos.length === 0
                ? "Nenhum arquivo fora de pasta está apto à limpeza."
                : !confirmacaoLimpezaForaPastasValida
                    ? "Digite LIMPAR para liberar a limpeza dos arquivos fora de pastas."
                    : `${arquivosForaPastasAptos.length} arquivo(s) apto(s) · ${formatarBytes(storageForaPastasAptosBytes)} poderão ser removidos.`;

    const mensagemBloqueioLimpezaStorage = bloqueioLimparArquivosStorageSistema.bloqueado
        ? bloqueioLimparArquivosStorageSistema.mensagem
        : !filtroLimpezaSemVinculoAtivo
            ? "Antes selecione o filtro Somente sem vínculo."
            : !confirmacaoLimpezaValida
                ? "Digite LIMPAR para liberar a limpeza em lote."
                : "Limpar arquivos sem vínculo e com caminho válido do filtro atual.";
    const opcoesBucketsStorage = Array.from(new Set(arquivosStorage.map((arquivo) => arquivo?.bucket || "storage"))).sort();
    const opcoesEmpresasStorage = Array.from(new Set(arquivosStorage.map(obterEmpresaArquivoStorage))).sort();
    const opcoesColaboradoresStorage = Array.from(new Set(arquivosStorage.map(obterColaboradorArquivoStorage))).sort();
    const opcoesTiposStorage = Array.from(new Set(arquivosStorage.map(obterTipoArquivoStorage))).sort();

    const storagePorTipo = agruparArquivosStorage(
        arquivosStorage,
        obterTipoArquivoStorage
    )
        .map((item) => ({
            ...item,
            percentual:
                storageTotalBytes > 0
                    ? Math.round((item.bytes / storageTotalBytes) * 100)
                    : 0,
        }))
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 10);

    const storagePorBucket = agruparArquivosStorage(
        arquivosStorage,
        (arquivo) => arquivo?.bucket || "storage"
    )
        .map((item) => ({
            ...item,
            bucket: item.nome,
            percentual:
                storageTotalBytes > 0
                    ? Math.round((item.bytes / storageTotalBytes) * 100)
                    : 0,
        }))
        .sort((a, b) => b.bytes - a.bytes);

    const maioresArquivosStorage = [...arquivosStorage]
        .sort((a, b) => Number(b?.tamanho || 0) - Number(a?.tamanho || 0))
        .slice(0, 10);
    const ultimoUploadStorage = [...arquivosStorage]
        .filter((arquivo) => arquivo?.atualizadoEm)
        .sort((a, b) => new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime())[0];

    const carregarStorage = async () => {
        if (!onListarArquivosStorage) return;

        setCarregandoStorage(true);
        setProgressoCarregamentoStorage({ etapa: "iniciando", atual: 0, total: 1, mensagem: "Preparando a verificação do Storage..." });

        try {
            const lista = await onListarArquivosStorage((progresso) => {
                if (storageMontadoRef.current) setProgressoCarregamentoStorage(progresso);
            });

            if (storageMontadoRef.current) {
                setArquivosStorage(lista || []);
                setAnaliseStorageExecutada(true);
                setProgressoCarregamentoStorage({ etapa: "concluido", atual: 1, total: 1, mensagem: `${(lista || []).length} arquivo(s) analisado(s).` });
            }
        } finally {
            if (storageMontadoRef.current) {
                setCarregandoStorage(false);
            }
        }
    };

    const excluirArquivoStorage = async (arquivo) => {
        if (!onExcluirArquivoStorage) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(bloqueioLimparArquivosStorageSistema.mensagem);
            }
            return;
        }

        if (arquivo?.emUso) {
            if (typeof window !== "undefined") {
                window.alert("Este arquivo ainda possui vínculo com registros do sistema e não pode ser excluído por esta tela.");
            }
            return;
        }

        if (!arquivoStorageTemDestinoValido(arquivo)) {
            if (typeof window !== "undefined") {
                window.alert("Exclusão bloqueada: o arquivo não possui bucket e caminho válidos para remoção segura.");
            }
            return;
        }

        const mensagemConfirmacao = `Confirma excluir este arquivo sem vínculo do Storage?

Bucket: ${arquivo.bucket}
Arquivo: ${arquivo.caminho}

Essa ação remove apenas o arquivo físico sem vínculo no banco e não pode ser desfeita.`;

        if (typeof window !== "undefined" && !window.confirm(mensagemConfirmacao)) return;

        setExcluindoStorage(arquivo.caminho || arquivo.nome || "__arquivo_storage__");

        try {
            const ok = await onExcluirArquivoStorage(arquivo);

            if (ok) {
                await carregarStorage();
                onAtualizarAuditoria?.();
            }
        } catch (erro) {
            console.warn("Erro ao excluir arquivo do Storage:", erro);
            if (typeof window !== "undefined") {
                window.alert(erro?.message || "Não foi possível excluir o arquivo do Storage.");
            }
        } finally {
            if (storageMontadoRef.current) {
                setExcluindoStorage("");
            }
        }
    };

    const limparArquivosStorageSemVinculoFiltrados = async () => {
        if (!onExcluirArquivoStorage || arquivosFiltradosSemVinculo.length === 0) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(bloqueioLimparArquivosStorageSistema.mensagem);
            }
            return;
        }

        if (!filtroLimpezaSemVinculoAtivo) {
            if (typeof window !== "undefined") {
                window.alert("Antes de executar limpeza em lote, selecione o filtro Somente sem vínculo.");
            }
            return;
        }

        if (!confirmacaoLimpezaValida) {
            if (typeof window !== "undefined") {
                window.alert("Digite LIMPAR no campo de confirmação para liberar a limpeza em lote.");
            }
            return;
        }

        const totalArquivos = arquivosFiltradosSemVinculo.length;
        const mensagemConfirmacao = `Confirma excluir ${totalArquivos} arquivo(s) sem vínculo e com caminho válido no filtro atual?\n\nTamanho total: ${formatarBytes(storageFiltradoSemVinculoBytes)}.\nBucket: ${filtrosStorage.bucket}.\nBusca: ${filtrosStorage.busca || "sem busca"}.\n\nEssa ação remove apenas arquivos físicos sem vínculo e não altera registros do banco.`;

        if (typeof window !== "undefined" && !window.confirm(mensagemConfirmacao)) return;

        setLimpandoStorage(true);
        setExcluindoStorage("__limpeza_em_lote__");
        setProgressoLimpezaStorage({ atual: 0, total: totalArquivos });

        let excluidos = 0;
        let falhas = 0;

        try {
            for (const [indice, arquivo] of arquivosFiltradosSemVinculo.entries()) {
                if (!storageMontadoRef.current) break;

                try {
                    const ok = await onExcluirArquivoStorage({
                        ...arquivo,
                        ignorarConfirmacaoIndividual: true,
                        ignorarConfirmacao: true,
                        limpezaEmLote: true,
                    });

                    if (ok) excluidos += 1;
                    else falhas += 1;
                } catch (erro) {
                    falhas += 1;
                    console.warn("Erro ao excluir arquivo sem vínculo:", erro);
                } finally {
                    if (storageMontadoRef.current) {
                        setProgressoLimpezaStorage({ atual: indice + 1, total: totalArquivos });
                    }
                }
            }
        } finally {
            if (storageMontadoRef.current) {
                await carregarStorage();
                onAtualizarAuditoria?.();
                setLimpandoStorage(false);
                setExcluindoStorage("");
                setConfirmacaoLimpezaStorage("");
                setProgressoLimpezaStorage({ atual: 0, total: 0 });

                if (typeof window !== "undefined") {
                    window.alert(`Limpeza concluída. Excluído(s): ${excluidos}. Falha(s): ${falhas}.`);
                }
            }
        }
    };

    const limparArquivosStorageForaPastas = async () => {
        if (
            !onExcluirArquivoStorage ||
            arquivosForaPastasAptos.length === 0
        ) {
            return;
        }

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(
                    bloqueioLimparArquivosStorageSistema.mensagem
                );
            }
            return;
        }

        if (!confirmacaoLimpezaForaPastasValida) {
            if (typeof window !== "undefined") {
                window.alert(
                    "Digite LIMPAR para liberar a limpeza dos arquivos fora de pastas."
                );
            }
            return;
        }

        const totalArquivos =
            arquivosForaPastasAptos.length;

        const mensagemConfirmacao =
            `Confirma excluir ${totalArquivos} arquivo(s) fora de pastas e sem vínculo?` +
            `\n\nEspaço estimado a liberar: ${formatarBytes(storageForaPastasAptosBytes)}.` +
            `\n\nArquivos em uso, ativos ou protegidos pelo sistema NÃO serão removidos.` +
            `\n\nEssa ação remove somente arquivos físicos seguros e não altera registros vinculados do banco.`;

        if (
            typeof window !== "undefined" &&
            !window.confirm(mensagemConfirmacao)
        ) {
            return;
        }

        setLimpandoForaPastas(true);
        setExcluindoStorage("__limpeza_fora_pastas__");
        setProgressoLimpezaForaPastas({
            atual: 0,
            total: totalArquivos,
        });

        let excluidos = 0;
        let falhas = 0;

        try {
            for (
                const [indice, arquivo]
                of arquivosForaPastasAptos.entries()
            ) {
                if (!storageMontadoRef.current) break;

                try {
                    const ok =
                        await onExcluirArquivoStorage({
                            ...arquivo,
                            ignorarConfirmacaoIndividual: true,
                            ignorarConfirmacao: true,
                            limpezaEmLote: true,
                            origemLimpeza: "fora_de_pastas",
                        });

                    if (ok) {
                        excluidos += 1;
                    }
                    else {
                        falhas += 1;
                    }
                }
                catch (erro) {
                    falhas += 1;

                    console.warn(
                        "Erro ao excluir arquivo fora de pasta:",
                        erro
                    );
                }
                finally {
                    if (storageMontadoRef.current) {
                        setProgressoLimpezaForaPastas({
                            atual: indice + 1,
                            total: totalArquivos,
                        });
                    }
                }
            }
        }
        finally {
            if (storageMontadoRef.current) {
                await carregarStorage();

                onAtualizarAuditoria?.();

                setLimpandoForaPastas(false);
                setExcluindoStorage("");
                setConfirmacaoLimpezaForaPastas("");
                setMostrarPainelLimpezaForaPastas(false);

                setProgressoLimpezaForaPastas({
                    atual: 0,
                    total: 0,
                });

                if (typeof window !== "undefined") {
                    window.alert(
                        `Limpeza de arquivos fora de pastas concluída. Excluído(s): ${excluidos}. Falha(s): ${falhas}.`
                    );
                }
            }
        }
    };


    const acionarBotaoLimpezaStorage = () => {
        if (!onExcluirArquivoStorage) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(bloqueioLimparArquivosStorageSistema.mensagem);
            }
            return;
        }

        if (!mostrarPainelLimpezaStorage) {
            setMostrarPainelLimpezaForaPastas(false);
            setConfirmacaoLimpezaForaPastas("");
            setMostrarPainelLimpezaStorage(true);
            setConfirmacaoLimpezaStorage("");
            setFiltrosStorage((atual) => ({ ...atual, vinculo: "Sem vínculo" }));
            return;
        }

        limparArquivosStorageSemVinculoFiltrados();
    };

    const cancelarPainelLimpezaStorage = () => {
        setMostrarPainelLimpezaStorage(false);
        setConfirmacaoLimpezaStorage("");
    };

    const acionarBotaoLimpezaForaPastas = () => {
        if (!onExcluirArquivoStorage) return;

        if (bloqueioLimparArquivosStorageSistema.bloqueado) {
            if (typeof window !== "undefined") {
                window.alert(
                    bloqueioLimparArquivosStorageSistema.mensagem
                );
            }
            return;
        }

        if (!mostrarPainelLimpezaForaPastas) {
            setMostrarPainelLimpezaStorage(false);
            setConfirmacaoLimpezaStorage("");
            setMostrarPainelLimpezaForaPastas(true);
            setConfirmacaoLimpezaForaPastas("");
            return;
        }

        limparArquivosStorageForaPastas();
    };

    const cancelarPainelLimpezaForaPastas = () => {
        setMostrarPainelLimpezaForaPastas(false);
        setConfirmacaoLimpezaForaPastas("");
    };

    const botaoLimpezaStorageBloqueado = carregandoStorage
        || limpandoStorage
        || limpandoForaPastas
        || arquivosSemRegistroExcluiveis.length === 0
        || !onExcluirArquivoStorage
        || bloqueioLimparArquivosStorageSistema.bloqueado;

    const botaoLimpezaForaPastasBloqueado = carregandoStorage
        || limpandoStorage
        || limpandoForaPastas
        || arquivosForaPastasAptos.length === 0
        || !onExcluirArquivoStorage
        || bloqueioLimparArquivosStorageSistema.bloqueado;

    const textoBotaoLimpezaStorage = limpandoStorage
        ? `Limpando ${progressoLimpezaStorage.atual}/${progressoLimpezaStorage.total}`
        : !mostrarPainelLimpezaStorage
            ? "Excluir sem vínculo"
            : confirmacaoLimpezaValida
                ? `Confirmar limpeza (${arquivosFiltradosSemVinculo.length})`
                : "Digite LIMPAR";

    const textoBotaoLimpezaForaPastas = limpandoForaPastas
        ? `Limpando ${progressoLimpezaForaPastas.atual}/${progressoLimpezaForaPastas.total}`
        : !mostrarPainelLimpezaForaPastas
            ? "Limpar fora de pastas"
            : confirmacaoLimpezaForaPastasValida
                ? `Confirmar (${arquivosForaPastasAptos.length})`
                : "Digite LIMPAR";
    return (
        <Card>
            {controleCard ? (
<div
                className={classNames(
                    "flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between",
                    !controleCard && "cursor-pointer select-none"
                )}
                onClick={(evento) => {
                    if (controleCard) return;

                    const alvo =
                        evento.target;

                    if (
                        alvo?.closest?.(
                            "button, input, select, textarea, a, summary, [role='button']"
                        )
                    ) {
                        return;
                    }

                    setStorageRecolhido(
                        (atual) =>
                            !atual
                    );
                }}
            >
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <HardDrive className="h-5 w-5 text-slate-500" />
                        <h2 id="config-arquivos-storage" className="scroll-mt-24 text-lg font-black text-slate-950">Arquivos salvos no Storage</h2>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                        Consulte capacidade, vínculos, tipos de documentos, maiores arquivos, uploads recentes e arquivos sem vínculo. O uso é calculado somente após carregar os arquivos.
                    </p>
                    <p className="mt-2 text-xs font-bold text-slate-400">{mensagemPermissao}</p>
                </div>

                <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={carregarStorage}
                        disabled={carregandoStorage || limpandoStorage || limpandoForaPastas || !onListarArquivosStorage}
                        className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:opacity-60"
                    >
                        {analiseStorageExecutada ? <RefreshCw className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                        {carregandoStorage ? "Carregando..." : analiseStorageExecutada ? "Atualizar arquivos" : "Carregar arquivos"}
                    </button>

                    {analiseStorageExecutada && arquivosSemRegistroExcluiveis.length > 0 && (
                        <span data-r10c-action="sem-vinculo" className="contents">
                            <button
                        type="button"
                        onClick={acionarBotaoLimpezaStorage}
                        disabled={botaoLimpezaStorageBloqueado}
                        className={classNames(
                            "inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition disabled:opacity-50",
                            mostrarPainelLimpezaStorage
                                ? "bg-red-600 text-white ring-red-600 hover:bg-red-700"
                                : "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                        )}
                        title={botaoLimpezaStorageBloqueado ? mensagemBloqueioLimpezaStorage : "Abrir proteção de limpeza em lote"}
                    >
                        <Trash2 className="h-4 w-4" />
                        {textoBotaoLimpezaStorage}
                    </button>
                        </span>
                    )}

                    {analiseStorageExecutada && arquivosForaPastasAptos.length > 0 && (
                        <span data-r10c-action="fora-pastas" className="contents">
                            <button
                        type="button"
                        onClick={acionarBotaoLimpezaForaPastas}
                        disabled={botaoLimpezaForaPastasBloqueado}
                        className={classNames(
                            "inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition disabled:opacity-50",
                            mostrarPainelLimpezaForaPastas
                                ? "bg-orange-600 text-white ring-orange-600 hover:bg-orange-700"
                                : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100"
                        )}
                        title={
                            botaoLimpezaForaPastasBloqueado
                                ? mensagemBloqueioLimpezaForaPastas
                                : "Revisar e limpar arquivos encontrados fora de pastas"
                        }
                    >
                        <AlertTriangle className="h-4 w-4" />
                        {textoBotaoLimpezaForaPastas}
                    </button>
                        </span>
                    )}

                    {controleCard}

                    {!controleCard && (
                        <button
                            type="button"
                            onClick={(evento) => {
                                evento.stopPropagation();

                                setStorageRecolhido(
                                    (atual) =>
                                        !atual
                                );
                            }}
                            aria-expanded={!storageRecolhido}
                            className="inline-flex min-h-[46px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-white px-3 py-3 text-xs font-black text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50"
                        >
                            <span
                                aria-hidden="true"
                                className={classNames(
                                    "text-base transition-transform duration-200",
                                    !storageRecolhido &&
                                        "rotate-180"
                                )}
                            >
                                ⌄
                            </span>

                            {storageRecolhido
                                ? "Abrir"
                                : "Recolher"}
                        </button>
                    )}
                </div>
            </div>
            ) : (
<div
                data-r10d-storage-header="tenant"
                className="-m-5 flex h-14 cursor-pointer select-none items-center justify-between gap-4 px-5"
                role="button"
                tabIndex={0}
                aria-expanded={!storageRecolhido}
                onClick={() => {
                    setStorageRecolhido(
                        (atual) =>
                            !atual
                    );
                }}
                onKeyDown={(evento) => {
                    if (
                        evento.key !== "Enter" &&
                        evento.key !== " "
                    ) {
                        return;
                    }

                    evento.preventDefault();

                    setStorageRecolhido(
                        (atual) =>
                            !atual
                    );
                }}
            >
                <h2
                    id="config-arquivos-storage"
                    className="scroll-mt-24 text-sm font-black text-slate-950 sm:text-base"
                >
                    Arquivos salvos no Storage
                </h2>

                <span
                    aria-hidden="true"
                    className={classNames(
                        "shrink-0 text-lg font-black text-slate-400 transition-transform duration-200",
                        !storageRecolhido &&
                            "rotate-180"
                    )}
                >
                    ⌄
                </span>
            </div>
            )}
            {!storageRecolhido && (
                <>

                    {!controleCard && (
                        <div
                            data-r10d-storage-actions="tenant"
                            className="pt-5 lg:flex lg:items-start lg:justify-between lg:gap-6"
                        >
                            <div className="min-w-0 lg:flex-1">
                                <p className="text-sm leading-6 text-slate-500">
                                    Consulte capacidade, vínculos, tipos de documentos, maiores arquivos, uploads recentes e arquivos sem vínculo.
                                </p>

                                <p className="mt-1 text-xs font-bold text-slate-400">
                                    {mensagemPermissao}
                                </p>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2 lg:mt-0 lg:shrink-0 lg:justify-end">
                                <button
                                    type="button"
                                    onClick={carregarStorage}
                                    disabled={
                                        carregandoStorage ||
                                        limpandoStorage ||
                                        limpandoForaPastas ||
                                        !onListarArquivosStorage
                                    }
                                    className="inline-flex min-h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-100 disabled:opacity-60"
                                >
                                    {analiseStorageExecutada ? (
                                        <RefreshCw className="h-4 w-4" />
                                    ) : (
                                        <Database className="h-4 w-4" />
                                    )}

                                    {carregandoStorage
                                        ? "Carregando..."
                                        : analiseStorageExecutada
                                            ? "Atualizar arquivos"
                                            : "Carregar arquivos"}
                                </button>

                                {analiseStorageExecutada &&
                                    arquivosSemRegistroExcluiveis.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={acionarBotaoLimpezaStorage}
                                            disabled={botaoLimpezaStorageBloqueado}
                                            className={classNames(
                                                "inline-flex min-h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition disabled:opacity-50",
                                                mostrarPainelLimpezaStorage
                                                    ? "bg-red-600 text-white ring-red-600 hover:bg-red-700"
                                                    : "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100"
                                            )}
                                            title={
                                                botaoLimpezaStorageBloqueado
                                                    ? mensagemBloqueioLimpezaStorage
                                                    : "Excluir somente arquivos sem vínculo"
                                            }
                                        >
                                            <Trash2 className="h-4 w-4" />
                                            {textoBotaoLimpezaStorage}
                                        </button>
                                    )}

                                {analiseStorageExecutada &&
                                    arquivosForaPastasAptos.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={acionarBotaoLimpezaForaPastas}
                                            disabled={botaoLimpezaForaPastasBloqueado}
                                            className={classNames(
                                                "inline-flex min-h-[46px] items-center justify-center gap-2 whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-semibold ring-1 transition disabled:opacity-50",
                                                mostrarPainelLimpezaForaPastas
                                                    ? "bg-orange-600 text-white ring-orange-600 hover:bg-orange-700"
                                                    : "bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100"
                                            )}
                                            title={
                                                botaoLimpezaForaPastasBloqueado
                                                    ? mensagemBloqueioLimpezaForaPastas
                                                    : "Revisar e limpar arquivos encontrados fora de pastas"
                                            }
                                        >
                                            <AlertTriangle className="h-4 w-4" />
                                            {textoBotaoLimpezaForaPastas}
                                        </button>
                                    )}
                            </div>
                        </div>
                    )}



            {!onListarArquivosStorage && (
                <div className="mt-4 rounded-2xl bg-orange-50 px-4 py-3 text-xs font-bold text-orange-700 ring-1 ring-orange-200">
                    A rotina de listagem do Storage não foi conectada a esta tela.
                </div>
            )}

            {carregandoStorage && (
                <div className="mt-4 rounded-2xl bg-blue-50 p-4 ring-1 ring-blue-200" role="status" aria-live="polite">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wide text-blue-700">Status da verificação</p>
                            <p className="mt-1 text-sm font-bold text-slate-900">{progressoCarregamentoStorage.mensagem}</p>
                        </div>
                        <span className="shrink-0 text-sm font-black text-blue-700">
                            {Math.round((progressoCarregamentoStorage.atual / Math.max(1, progressoCarregamentoStorage.total)) * 100)}%
                        </span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-blue-100">
                        <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${Math.max(4, Math.round((progressoCarregamentoStorage.atual / Math.max(1, progressoCarregamentoStorage.total)) * 100))}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-blue-700">Etapa: {progressoCarregamentoStorage.etapa || "iniciando"}</p>
                </div>
            )}

            {mostrarPainelLimpezaStorage && arquivosStorage.length > 0 && (
                <div className="mt-4 rounded-3xl border border-red-100 bg-red-50/70 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <p className="text-sm font-black text-red-900">Proteção para limpeza em lote</p>
                            <p className="mt-1 text-xs leading-relaxed text-red-700">
                                Esta confirmação aparece somente após selecionar o botão de exclusão. O sistema muda para <strong>Somente sem vínculo</strong> e só executa a limpeza de arquivos sem vínculo e com caminho válido depois de digitar LIMPAR e confirmar novamente.
                            </p>
                        </div>
                        <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[260px]">
                            <input
                                type="text"
                                value={confirmacaoLimpezaStorage}
                                onChange={(e) => setConfirmacaoLimpezaStorage(e.target.value)}
                                placeholder="Digite LIMPAR"
                                disabled={!filtroLimpezaSemVinculoAtivo || limpandoStorage || bloqueioLimparArquivosStorageSistema.bloqueado}
                                className="w-full rounded-2xl border border-red-200 bg-white px-4 py-3 text-sm font-black uppercase tracking-wide text-red-900 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100 disabled:opacity-60"
                            />
                            <button
                                type="button"
                                onClick={cancelarPainelLimpezaStorage}
                                disabled={limpandoStorage}
                                className="rounded-2xl bg-white px-4 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancelar limpeza
                            </button>
                        </div>
                    </div>
                    <p className="mt-2 text-xs font-bold text-red-700">{mensagemBloqueioLimpezaStorage}</p>
                </div>
            )}

            {mostrarPainelLimpezaForaPastas && arquivosStorage.length > 0 && (
                <div className="mt-4 rounded-3xl border border-orange-200 bg-orange-50/60 p-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-black text-orange-950">
                                Arquivos fora de pastas
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-orange-800">
                                São arquivos encontrados na raiz do bucket ou sem pasta identificada. Arquivos em uso, ativos ou protegidos permanecem visíveis e nunca entram na limpeza.
                            </p>

                            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="rounded-2xl bg-white p-3 ring-1 ring-orange-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Encontrados
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-950">
                                        {arquivosForaPastas.length}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white p-3 ring-1 ring-orange-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                                        Espaço ocupado
                                    </p>
                                    <p className="mt-1 text-xl font-black text-slate-950">
                                        {formatarBytes(storageForaPastasBytes)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white p-3 ring-1 ring-emerald-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700">
                                        Aptos a limpar
                                    </p>
                                    <p className="mt-1 text-xl font-black text-emerald-900">
                                        {arquivosForaPastasAptos.length}
                                    </p>
                                    <p className="mt-1 text-xs text-emerald-700">
                                        {formatarBytes(storageForaPastasAptosBytes)}
                                    </p>
                                </div>

                                <div className="rounded-2xl bg-white p-3 ring-1 ring-blue-100">
                                    <p className="text-[10px] font-black uppercase tracking-wide text-blue-700">
                                        Protegidos
                                    </p>
                                    <p className="mt-1 text-xl font-black text-blue-900">
                                        {arquivosForaPastasProtegidos.length}
                                    </p>
                                </div>
                            </div>

                            {arquivosForaPastas.length > 0 && (
                                <div className="mt-3 max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                                    {arquivosForaPastas.slice(0, 20).map((arquivo) => {
                                        const apto =
                                            arquivoStoragePodeSerExcluido(arquivo);

                                        return (
                                            <div
                                                key={`${arquivo.bucket}-${arquivo.caminho}-fora-pasta`}
                                                className="flex flex-col gap-2 rounded-2xl bg-white p-3 ring-1 ring-orange-100 sm:flex-row sm:items-center sm:justify-between"
                                            >
                                                <div className="min-w-0">
                                                    <p className="break-words text-xs font-black text-slate-900">
                                                        {arquivo.nome}
                                                    </p>
                                                    <p className="mt-1 break-words text-[11px] text-slate-500">
                                                        {arquivo.bucket || "storage"} · raiz · {formatarBytes(arquivo.tamanho || 0)}
                                                    </p>
                                                </div>

                                                <span
                                                    className={classNames(
                                                        "w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wide ring-1",
                                                        apto
                                                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                                            : "bg-blue-50 text-blue-700 ring-blue-200"
                                                    )}
                                                >
                                                    {apto
                                                        ? "Apto à limpeza"
                                                        : "Protegido"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="w-full rounded-2xl bg-white p-3 ring-1 ring-orange-200 xl:w-[280px]">
                            <p className="text-xs font-black text-slate-900">
                                Confirmação de limpeza
                            </p>
                            <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                Somente arquivos fora de pasta, sem vínculo, não protegidos e com destino válido serão removidos.
                            </p>

                            <input
                                type="text"
                                value={confirmacaoLimpezaForaPastas}
                                onChange={(e) =>
                                    setConfirmacaoLimpezaForaPastas(
                                        e.target.value
                                    )
                                }
                                placeholder="Digite LIMPAR"
                                disabled={
                                    limpandoForaPastas ||
                                    bloqueioLimparArquivosStorageSistema.bloqueado
                                }
                                className="mt-3 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm font-black uppercase tracking-wide text-orange-900 outline-none focus:border-orange-400 focus:ring-4 focus:ring-orange-100 disabled:opacity-60"
                            />

                            <button
                                type="button"
                                onClick={cancelarPainelLimpezaForaPastas}
                                disabled={limpandoForaPastas}
                                className="mt-2 w-full rounded-xl bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100 disabled:opacity-60"
                            >
                                Cancelar
                            </button>

                            <p className="mt-2 text-[11px] font-bold leading-5 text-orange-800">
                                {mensagemBloqueioLimpezaForaPastas}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <details open data-r10-collapse="storage-status" className={classNames("mt-4 rounded-3xl p-4 ring-1", storageStatus.classe)}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Status de armazenamento
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5" />
                        <div>
                            <p className="text-sm font-black">
                                Status de armazenamento: {storageStatus.texto}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed">
                                {storageStatus.detalhe}
                            </p>
                        </div>
                    </div>

                    <div className="text-left sm:text-right">
                        <p className="text-3xl font-black">
                            {storagePercentual}%
                        </p>
                        <p className="text-xs font-semibold">
                            {formatarBytes(storageTotalBytes)} de {formatarBytes(storageLimiteBytes)}
                        </p>
                    </div>
                </div>

                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/70">
                    <div
                        className={classNames(
                            "h-full rounded-full",
                            storageStatus.barra
                        )}
                        style={{
                            width: `${Math.max(
                                2,
                                Math.min(100, storagePercentual)
                            )}%`,
                        }}
                    />
                </div>
            </details>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <div className="rounded-3xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Usado
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                        {formatarBytes(storageTotalBytes)}
                    </p>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Capacidade
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                        {formatarBytes(storageLimiteBytes)}
                    </p>
                </div>

                <div className="rounded-3xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        Livre
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-900">
                        {formatarBytes(storageLivreBytes)}
                    </p>
                </div>

                <div className="rounded-3xl bg-blue-50 p-4 text-center ring-1 ring-blue-100">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        Utilização
                    </p>
                    <p className="mt-2 text-2xl font-black text-blue-900">
                        {storagePercentual}%
                    </p>
                </div>

                <div className="rounded-3xl bg-blue-50 p-4 text-center ring-1 ring-blue-100">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        Total de arquivos
                    </p>
                    <p className="mt-2 text-2xl font-black text-blue-900">
                        {arquivosStorage.length}
                    </p>
                </div>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-blue-50 p-4 text-center ring-1 ring-blue-100">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                        Ativos do sistema
                    </p>
                    <p className="mt-2 text-2xl font-black text-blue-900">
                        {arquivosAtivosSistema.length}
                    </p>
                    <p className="mt-1 text-xs text-blue-700">
                        {formatarBytes(storageAtivosSistemaBytes)} protegidos
                    </p>
                </div>

                <div className="rounded-3xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
                    <p className="text-xs font-black uppercase tracking-wide text-emerald-700">
                        Com vínculo
                    </p>
                    <p className="mt-2 text-2xl font-black text-emerald-900">
                        {arquivosEmUso.length}
                    </p>
                    <p className="mt-1 text-xs text-emerald-700">
                        {formatarBytes(storageEmUsoBytes)} em registros ativos
                    </p>
                </div>

                <div className="rounded-3xl bg-red-50 p-4 text-center ring-1 ring-red-100">
                    <p className="text-xs font-black uppercase tracking-wide text-red-700">
                        Sem vínculo
                    </p>
                    <p className="mt-2 text-2xl font-black text-red-900">
                        {arquivosSemRegistro.length}
                    </p>
                    <p className="mt-1 text-xs text-red-700">
                        {formatarBytes(storageSemRegistroBytes)} sem registro
                    </p>
                </div>

                <div className="rounded-3xl bg-slate-50 p-4 text-center ring-1 ring-slate-200">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        Último upload
                    </p>
                    <p className="mt-2 break-words text-sm font-black text-slate-900">
                        {ultimoUploadStorage?.nome || "Não carregado"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        {ultimoUploadStorage?.atualizadoEm
                            ? new Date(
                                ultimoUploadStorage.atualizadoEm
                            ).toLocaleString("pt-BR")
                            : "Clique em carregar arquivos"}
                    </p>
                </div>
            </div>

            {storagePorTipo.length > 0 && (
                <details open data-r10-collapse="storage-uso" className="group mt-4 rounded-3xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Onde o Storage está sendo utilizado
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                        <div>

                            <p className="mt-1 text-xs text-slate-500">
                                Ranking por tipo/origem, do maior consumo para o menor.
                            </p>
                        </div>

                        <p className="text-xs font-bold text-slate-500">
                            Clique em um item para filtrar a lista.
                        </p>
                    </div>

                    <div className="mt-3 space-y-2">
                        {storagePorTipo.map((item) => (
                            <button
                                key={item.nome}
                                type="button"
                                onClick={() =>
                                    setFiltrosStorage((atual) => ({
                                        ...atual,
                                        tipo: item.nome,
                                    }))
                                }
                                className="w-full rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="break-words text-sm font-black text-slate-900">
                                            {item.nome}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {item.arquivos} arquivo(s) · {formatarBytes(item.bytes)}
                                        </p>
                                    </div>

                                    <p className="shrink-0 text-lg font-black text-slate-900">
                                        {item.percentual}%
                                    </p>
                                </div>

                                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                                    <div
                                        className="h-full rounded-full bg-emerald-500"
                                        style={{
                                            width: `${Math.max(
                                                2,
                                                Math.min(
                                                    100,
                                                    item.percentual
                                                )
                                            )}%`,
                                        }}
                                    />
                                </div>
                            </button>
                        ))}
                    </div>
                </details>
            )}

            <details open data-r10-collapse="storage-filtros" className="group mt-4 rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Filtros do Storage
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>
                <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>

                        <p className="mt-1 text-xs text-slate-500">Filtre antes de executar limpeza para evitar exclusões indevidas.</p>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFiltrosStorage(FILTROS_STORAGE_PADRAO)}
                        className="w-fit rounded-2xl bg-white px-4 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                        Limpar filtros
                    </button>
                </div>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <label className="relative md:col-span-2 xl:col-span-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="search"
                            value={filtrosStorage.busca}
                            onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, busca: e.target.value }))}
                            placeholder="Buscar por arquivo, bucket, caminho, empresa, colaborador ou tipo"
                            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                        />
                    </label>

                    <select value={filtrosStorage.bucket} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, bucket: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os buckets</option>
                        {opcoesBucketsStorage.map((bucket) => <option key={bucket} value={bucket}>{bucket}</option>)}
                    </select>

                    <select value={filtrosStorage.empresa} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, empresa: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todas">Todas as empresas</option>
                        {opcoesEmpresasStorage.map((empresa) => <option key={empresa} value={empresa}>{empresa}</option>)}
                    </select>

                    <select value={filtrosStorage.colaborador} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, colaborador: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os colaboradores</option>
                        {opcoesColaboradoresStorage.map((colaborador) => <option key={colaborador} value={colaborador}>{colaborador}</option>)}
                    </select>

                    <select value={filtrosStorage.tipo} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tipo: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os tipos</option>
                        {opcoesTiposStorage.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                    </select>

                    <select value={filtrosStorage.tamanho} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, tamanho: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os tamanhos</option>
                        <option value="ate-1mb">Até 1 MB</option>
                        <option value="1mb-10mb">1 MB a 10 MB</option>
                        <option value="10mb-50mb">10 MB a 50 MB</option>
                        <option value="acima-50mb">Acima de 50 MB</option>
                    </select>

                    <select value={filtrosStorage.vinculo} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, vinculo: e.target.value }))} className="rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100">
                        <option value="Todos">Todos os vínculos</option>
                        <option value="Ativos do sistema">Ativos do sistema</option>
                        <option value="Com vínculo">Somente vinculados</option>
                        <option value="Sem vínculo">Somente sem vínculo</option>
                    </select>

                    <div className="grid min-w-[300px] grid-cols-2 gap-2" data-storage-date-range="SAFE_SCAN_STORAGE_DATAS_V23" data-storage-date-center="SAFE_SCAN_STORAGE_DATAS_CENTER_V24">
                        <input type="date" value={filtrosStorage.dataInicio} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataInicio: e.target.value }))} className="min-w-[142px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-sm tabular-nums outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 [&::-webkit-datetime-edit]:flex-1 [&::-webkit-datetime-edit]:text-center [&::-webkit-datetime-edit-fields-wrapper]:w-full [&::-webkit-datetime-edit-fields-wrapper]:justify-center" title="Data inicial de envio" />
                        <input type="date" value={filtrosStorage.dataFim} onChange={(e) => setFiltrosStorage((atual) => ({ ...atual, dataFim: e.target.value }))} className="min-w-[142px] rounded-2xl border border-slate-200 bg-white px-3 py-3 text-center text-sm tabular-nums outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-100 [&::-webkit-datetime-edit]:flex-1 [&::-webkit-datetime-edit]:text-center [&::-webkit-datetime-edit-fields-wrapper]:w-full [&::-webkit-datetime-edit-fields-wrapper]:justify-center" title="Data final de envio" />
                    </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setFiltrosStorage((atual) => ({ ...atual, vinculo: "Ativos do sistema" }))} className={classNames("rounded-full px-3 py-2 text-xs font-black ring-1", filtrosStorage.vinculo === "Ativos do sistema" ? "bg-blue-100 text-blue-700 ring-blue-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100")}>
                        Ver ativos do sistema
                    </button>
                    <button type="button" onClick={() => setFiltrosStorage((atual) => ({ ...atual, vinculo: "Sem vínculo" }))} className={classNames("rounded-full px-3 py-2 text-xs font-black ring-1", filtroLimpezaSemVinculoAtivo ? "bg-red-100 text-red-700 ring-red-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100")}>
                        Ver somente sem vínculo
                    </button>
                    <button type="button" onClick={() => setFiltrosStorage((atual) => ({ ...atual, vinculo: "Com vínculo" }))} className={classNames("rounded-full px-3 py-2 text-xs font-black ring-1", filtrosStorage.vinculo === "Com vínculo" ? "bg-emerald-100 text-emerald-700 ring-emerald-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100")}>
                        Ver somente vinculados
                    </button>
                    <button type="button" onClick={() => setFiltrosStorage((atual) => ({ ...atual, tamanho: "acima-50mb" }))} className={classNames("rounded-full px-3 py-2 text-xs font-black ring-1", filtrosStorage.tamanho === "acima-50mb" ? "bg-orange-100 text-orange-700 ring-orange-200" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-100")}>
                        Arquivos acima de 50 MB
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setFiltrosStorage((atual) => ({
                                ...atual,
                                busca: "treinamento",
                                tipo: "Todos",
                            }))
                        }
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                        Treinamentos
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setFiltrosStorage((atual) => ({
                                ...atual,
                                busca: "document",
                                tipo: "Todos",
                            }))
                        }
                        className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                    >
                        Documentos
                    </button>
                </div>
            </details>

            {storagePorBucket.length > 0 && (
                <details open data-r10-collapse="storage-buckets" className="group mt-4 rounded-3xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Uso por bucket
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>

                    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                        {storagePorBucket.map((bucketInfo) => (
                            <button
                                type="button"
                                key={bucketInfo.bucket}
                                onClick={() =>
                                    setFiltrosStorage((atual) => ({
                                        ...atual,
                                        bucket: bucketInfo.bucket,
                                    }))
                                }
                                className="rounded-2xl bg-slate-50 p-3 text-left text-xs ring-1 ring-slate-200 transition hover:bg-slate-100"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <p className="break-words font-black text-slate-700">
                                        {bucketInfo.bucket}
                                    </p>
                                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-slate-600 ring-1 ring-slate-200">
                                        {bucketInfo.percentual}%
                                    </span>
                                </div>

                                <p className="mt-1 text-slate-500">
                                    {bucketInfo.arquivos} arquivo(s) · {formatarBytes(bucketInfo.bytes)}
                                </p>

                                <p className="mt-1 text-slate-400">
                                    {bucketInfo.ativosSistema} ativo(s) · {bucketInfo.emUso} em uso · {bucketInfo.semRegistro} sem vínculo
                                </p>
                            </button>
                        ))}
                    </div>
                </details>
            )}

            {maioresArquivosStorage.length > 0 && (
                <details open data-r10-collapse="storage-maiores" className="group mt-4 rounded-3xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Maiores arquivos
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>

                    <div className="mt-3 grid gap-3 xl:grid-cols-2">
                        {maioresArquivosStorage.map((arquivo, indice) => {
                            const arquivoExcluivel =
                                arquivoStoragePodeSerExcluido(arquivo);

                            const situacao =
                                arquivo.ativoSistema
                                    ? "Ativo do sistema"
                                    : arquivo.emUso
                                        ? "Com vínculo"
                                        : arquivoExcluivel
                                            ? "Sem vínculo / apto"
                                            : "Protegido";

                            return (
                                <div
                                    key={`${arquivo.bucket}-${arquivo.caminho}-maior`}
                                    className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                                                #{indice + 1}
                                            </p>
                                            <p className="mt-1 break-words text-sm font-black text-slate-900">
                                                {arquivo.nome}
                                            </p>
                                        </div>

                                        <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-black text-slate-900 ring-1 ring-slate-200">
                                            {formatarBytes(arquivo.tamanho || 0)}
                                        </span>
                                    </div>

                                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                                        <div>
                                            <span className="font-black text-slate-500">
                                                Tipo:
                                            </span>{" "}
                                            {obterTipoArquivoStorage(arquivo)}
                                        </div>

                                        <div>
                                            <span className="font-black text-slate-500">
                                                Situação:
                                            </span>{" "}
                                            {situacao}
                                        </div>

                                        <div>
                                            <span className="font-black text-slate-500">
                                                Empresa:
                                            </span>{" "}
                                            {obterEmpresaArquivoStorage(arquivo)}
                                        </div>

                                        <div>
                                            <span className="font-black text-slate-500">
                                                Colaborador:
                                            </span>{" "}
                                            {obterColaboradorArquivoStorage(arquivo)}
                                        </div>
                                    </div>

                                    <p className="mt-2 break-words text-[11px] text-slate-400">
                                        {arquivo.bucket || "storage"}/{arquivo.caminho || arquivo.nome}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </details>
            )}

            {arquivosStorage.length === 0 && !carregandoStorage && (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                    Clique em <strong>Carregar arquivos</strong> para consultar o Storage. A consulta não carrega automaticamente para manter a tela leve.
                </div>
            )}

            {arquivosStorage.length > 0 && (
                <details open data-r10-collapse="storage-arquivos" className="group mt-4 rounded-3xl border border-slate-200 bg-white p-4">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl py-2 text-left transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="text-sm font-black text-slate-950 sm:text-base">
                Arquivos encontrados
            </span>

            <span
                aria-hidden="true"
                className="shrink-0 text-lg font-black text-slate-400 transition-transform duration-200 group-open:rotate-180"
            >
                ⌄
            </span>
        </summary>
                    <div className="mb-3 flex flex-col justify-between gap-2 md:flex-row md:items-center">
                        <p className="text-sm font-bold text-slate-950">Arquivos encontrados: {arquivosFiltrados.length} de {arquivosStorage.length}</p>
                        <p className="text-xs text-slate-500">Exibindo {arquivosFiltradosVisiveis.length} por vez · Aptos à limpeza no filtro: {arquivosFiltradosSemVinculo.length} arquivo(s) · {formatarBytes(storageFiltradoSemVinculoBytes)}.</p>
                    </div>

                    {arquivosFiltrados.length === 0 && (
                        <div className="rounded-3xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                            Nenhum arquivo encontrado com os filtros selecionados.
                        </div>
                    )}

                    {arquivosFiltrados.length > 0 && (
                        <div className="max-h-[32rem] space-y-2 overflow-y-auto pr-1 scrollbar-discreta">
                            {arquivosFiltradosVisiveis.map((arquivo) => (
                                <div key={`${arquivo.bucket}-${arquivo.caminho}`} className={classNames(
                                    "rounded-2xl px-3 py-2 text-sm ring-1",
                                    arquivo.ativoSistema
                                        ? "bg-blue-50 text-blue-900 ring-blue-100"
                                        : arquivo.emUso
                                            ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                                            : "bg-red-50 text-red-900 ring-red-100"
                                )}>
                                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <p className="break-words font-bold">{arquivo.nome}</p>
                                                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">
                                                    {arquivo.ativoSistema ? "Ativo do sistema" : arquivo.emUso ? "Em uso" : "Sem vínculo"}
                                                </span>
                                                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold">{formatarBytes(arquivo.tamanho || 0)}</span>
                                            </div>
                                            <p className="mt-1 break-words text-xs opacity-80">{arquivo.bucket}/{arquivo.caminho}</p>
                                            <p className="mt-1 text-xs opacity-70">
                                                {arquivo.ativoSistema
                                                    ? `${arquivo.origemRegistro || "Configuração global do sistema"} · ${obterTipoArquivoStorage(arquivo)}`
                                                    : `${obterEmpresaArquivoStorage(arquivo)} · ${obterColaboradorArquivoStorage(arquivo)} · ${obterTipoArquivoStorage(arquivo)}`}
                                            </p>
                                            {arquivo.atualizadoEm && (
                                                <p className="mt-1 text-xs opacity-70">Atualizado em {new Date(arquivo.atualizadoEm).toLocaleString("pt-BR")}</p>
                                            )}
                                        </div>

                                        {!arquivo.emUso && (
                                            arquivoStoragePodeSerExcluido(arquivo) ? (
                                                <button
                                                    type="button"
                                                    onClick={() => excluirArquivoStorage(arquivo)}
                                                    disabled={excluindoStorage === arquivo.caminho || limpandoStorage || bloqueioLimparArquivosStorageSistema.bloqueado}
                                                    className="shrink-0 rounded-2xl bg-white/80 px-4 py-2 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-white disabled:opacity-50"
                                                    title={bloqueioLimparArquivosStorageSistema.bloqueado ? bloqueioLimparArquivosStorageSistema.mensagem : "Excluir arquivo sem vínculo"}
                                                >
                                                    {excluindoStorage === arquivo.caminho ? "Excluindo..." : "Excluir arquivo"}
                                                </button>
                                            ) : (
                                                <span className="shrink-0 rounded-2xl bg-white/70 px-4 py-2 text-xs font-bold text-slate-500 ring-1 ring-slate-200">
                                                    Exclusão bloqueada: sem caminho
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {arquivosFiltrados.length > QUANTIDADE_INICIAL_ARQUIVOS_STORAGE && (
                        <div className="mt-3 flex flex-col gap-2 rounded-3xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-xs font-semibold text-slate-500">
                                Renderização limitada para manter a aba Configurações leve. Use os filtros para localizar arquivos específicos.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {existemMaisArquivosFiltrados && (
                                    <button
                                        type="button"
                                        onClick={() => setQuantidadeArquivosVisiveis((atual) => atual + QUANTIDADE_INCREMENTO_ARQUIVOS_STORAGE)}
                                        className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        Mostrar mais {Math.min(QUANTIDADE_INCREMENTO_ARQUIVOS_STORAGE, arquivosFiltrados.length - arquivosFiltradosVisiveis.length)}
                                    </button>
                                )}
                                {existemMaisArquivosFiltrados && (
                                    <button
                                        type="button"
                                        onClick={() => setQuantidadeArquivosVisiveis(arquivosFiltrados.length)}
                                        className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
                                    >
                                        Mostrar todos
                                    </button>
                                )}
                                {!existemMaisArquivosFiltrados && arquivosFiltrados.length > QUANTIDADE_INICIAL_ARQUIVOS_STORAGE && (
                                    <button
                                        type="button"
                                        onClick={() => setQuantidadeArquivosVisiveis(QUANTIDADE_INICIAL_ARQUIVOS_STORAGE)}
                                        className="rounded-2xl bg-white px-3 py-2 text-xs font-black text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100"
                                    >
                                        Reduzir lista
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </details>
            )}
                        </>
            )}
        </Card>
    );
}
