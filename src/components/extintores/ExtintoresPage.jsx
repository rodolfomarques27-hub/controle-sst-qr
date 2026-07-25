import React, { useEffect, useMemo, useState } from "react";
import { Activity, Building2, CalendarClock, Edit3, FileDown, MapPin, Plus, QrCode, RotateCcw, Search, ShieldCheck, Trash2, Wrench } from "lucide-react";
import {
    concluirManutencaoExtintor,
    gerarUrlQrExtintor,
    identificadorEhUuidExtintor,
    listarManutencoesExtintores,
    obterManutencaoAbertaExtintor,
    proximoCodigoExtintor,
    registrarEnvioManutencaoExtintor,
    TIPOS_SERVICO_EXTINTOR,
    TIPOS_EXTINTORES_BRASIL,
} from "../../services/extintoresVistoriaService";
import {
    carregarExtintoresCadastro,
    carregarMapasCadastroExtintores,
    excluirExtintorCadastro,
    migrarExtintoresLocaisCadastro,
    salvarExtintorCadastro,
    selecionarMapaCadastroExtintores,
} from "../../services/extintoresCadastroSyncService";
import { supabase } from "../../lib/supabaseClient";
import { gerarRelatorioExtintoresPDF } from "../../services/relatorioExtintoresService";
import { QrCodeComLogo } from "../qr/QrCodeComLogo";
import { listarMapasObraLocal, salvarMapaObraLocal } from "../../services/mapaObraLocalService";
import extintoresHeroBackground from "../../assets/extintores-hero.webp";

const VAZIO = { id: "", pontoId: "", ponto: "", localizacao: "", tipo: "PQS ABC", capacidade: "6 kg", status: "Ativo", situacaoOperacional: "Em operação", dataAquisicao: "" };
const MANUTENCAO_VAZIA = { tipoServico: "Manutenção de 2º nível / recarga", motivo: "Programada", empresaNome: "", empresaCnpj: "", registroInmetro: "", ordemServico: "", dataSaida: new Date().toISOString().slice(0, 10), previsaoRetorno: "", observacoes: "" };
const RETORNO_VAZIO = { dataRetorno: new Date().toISOString().slice(0, 10), seloConformidade: "", proximaManutencao: "", proximoEnsaioHidrostatico: "", observacoesRetorno: "" };

function capacidadesPorTipo(tipo) {
    if (tipo === "CO2") return ["2 kg", "4 kg", "6 kg"];
    const indiceTipo = TIPOS_EXTINTORES_BRASIL.findIndex((item) => item.valor === tipo);
    if (indiceTipo === 3 || indiceTipo === 4) return ["10 L"];
    return ["1 kg", "2 kg", "4 kg", "6 kg", "10 kg"];
}

export function ExtintoresPage() {
    const [itens, setItens] = useState([]);
    const [form, setForm] = useState(VAZIO);
    const [busca, setBusca] = useState("");
    const [filtro, setFiltro] = useState("Todos");
    const [qr, setQr] = useState(null);
    const [mensagem, setMensagem] = useState("");
    const [mapasObra, setMapasObra] = useState(() => listarMapasObraLocal());
    const [obraSelecionadaId, setObraSelecionadaId] = useState(
        () => listarMapasObraLocal()[0]?.obraId || "",
    );
    const [carregandoDados, setCarregandoDados] = useState(true);
    const [salvandoDados, setSalvandoDados] = useState(false);
    const [origemDados, setOrigemDados] = useState("inicial");
    const [erroDados, setErroDados] = useState("");
    const [locaisPendentes, setLocaisPendentes] = useState(0);
    const [recarregarVersao, setRecarregarVersao] = useState(0);
    const [manutencoes, setManutencoes] = useState(() => listarManutencoesExtintores());
    const [manutencaoAlvo, setManutencaoAlvo] = useState(null);
    const [formManutencao, setFormManutencao] = useState(MANUTENCAO_VAZIA);
    const [formRetorno, setFormRetorno] = useState(RETORNO_VAZIO);
    const dataHero = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const diaHero = new Date().toLocaleDateString("pt-BR", { weekday: "long" });
    const horaHero = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const capacidades = capacidadesPorTipo(form.tipo);

    const mapasObraDisponiveis = useMemo(() => {
        const unicos = new Map();

        mapasObra.forEach((mapa) => {
            const obraId = String(
                mapa?.obraId ||
                mapa?.obra_id ||
                "",
            );

            if (obraId && !unicos.has(obraId)) {
                unicos.set(obraId, mapa);
            }
        });

        return Array.from(unicos.values());
    }, [mapasObra]);

    const mapaSelecionado = useMemo(
        () => selecionarMapaCadastroExtintores({
            mapas: mapasObraDisponiveis,
            obraIdPreferida: obraSelecionadaId,
        }),
        [mapasObraDisponiveis, obraSelecionadaId],
    );

    const pontosDisponiveis = useMemo(
        () => (
            Array.isArray(mapaSelecionado?.pontos)
                ? mapaSelecionado.pontos
                : []
        ).map((ponto) => ({
            ...ponto,
            obraId: mapaSelecionado?.obraId || "",
            empresaId: mapaSelecionado?.empresaId || "",
        })),
        [mapaSelecionado],
    );

    // extintores_ponto_persistido_prioritario_v1:
    // O ponto persistido no cadastro é a fonte principal.
    // O snapshot do mapa é usado apenas quando o registro ainda não possui pontoId.
    const extintoresPorPonto = useMemo(() => {
        const idAtualPorReferencia = new Map();
        const pontoPersistidoPorExtintor = new Map();

        itens.forEach((item) => {
            const idAtual = String(item?.id || "");
            const pontoPersistidoId = String(
                item?.pontoId ||
                item?.ponto_id ||
                "",
            );

            if (idAtual && pontoPersistidoId) {
                pontoPersistidoPorExtintor.set(
                    idAtual,
                    pontoPersistidoId,
                );
            }

            [
                item?.id,
                item?.referenciaLocal,
                item?.referencia_local,
            ]
                .map((referencia) =>
                    String(referencia || ""),
                )
                .filter(Boolean)
                .forEach((referencia) => {
                    idAtualPorReferencia.set(
                        referencia,
                        idAtual,
                    );
                });
        });

        return new Map(
            pontosDisponiveis.map((ponto) => {
                const pontoId =
                    String(ponto?.id || "");

                const referenciasMapa = [
                    ...(Array.isArray(ponto.extintores)
                        ? ponto.extintores
                        : []),
                    ...(Array.isArray(ponto.itens)
                        ? ponto.itens.map(
                            (item) =>
                                item?.extintorId ||
                                item?.extintor_id ||
                                "",
                        )
                        : []),
                ];

                const ids = new Set(
                    referenciasMapa
                        .map((referencia) =>
                            idAtualPorReferencia.get(
                                String(referencia || ""),
                            ),
                        )
                        .filter((idAtual) => {
                            if (!idAtual) {
                                return false;
                            }

                            const pontoPersistidoId =
                                pontoPersistidoPorExtintor.get(
                                    idAtual,
                                );

                            return (
                                !pontoPersistidoId ||
                                pontoPersistidoId === pontoId
                            );
                        }),
                );

                itens
                    .filter(
                        (item) =>
                            String(
                                item?.pontoId ||
                                item?.ponto_id ||
                                "",
                            ) === pontoId,
                    )
                    .forEach((item) => {
                        if (item?.id) {
                            ids.add(String(item.id));
                        }
                    });

                return [
                    pontoId,
                    ids,
                ];
            }),
        );
    }, [itens, pontosDisponiveis]);

    const pontosComEquipamentos = useMemo(
        () => pontosDisponiveis.filter(
            (ponto) =>
                (
                    extintoresPorPonto.get(
                        String(ponto.id),
                    )?.size || 0
                ) > 0,
        ),
        [extintoresPorPonto, pontosDisponiveis],
    );

    const pontoNomePorId = useMemo(() => new Map(
        pontosDisponiveis.map(
            (ponto) => [
                String(ponto.id),
                ponto.nome || "Ponto sem nome",
            ],
        ),
    ), [pontosDisponiveis]);

    const idsExtintoresVinculados = useMemo(() => new Set(
        Array.from(
            extintoresPorPonto.values(),
        ).flatMap((ids) => Array.from(ids)),
    ), [extintoresPorPonto]);

    const pontoAtualPorExtintor = useMemo(() => {
        const nomes = new Map();

        pontosComEquipamentos.forEach((ponto) => {
            const ids = extintoresPorPonto.get(
                String(ponto.id),
            ) || new Set();

            ids.forEach((extintorId) => {
                nomes.set(
                    String(extintorId),
                    ponto.nome || "Ponto sem nome",
                );
            });
        });

        return nomes;
    }, [extintoresPorPonto, pontosComEquipamentos]);

    const origemDadosTexto = {
        remoto: "Supabase",
        cache: "cache do dispositivo",
        local: "dados locais",
        vazio: "sem registros",
        erro: "indisponível",
        inicial: "inicializando",
    }[origemDados] || origemDados;

    useEffect(() => {
        let ativo = true;

        const atualizarMapas = async () => {
            const resultado =
                await carregarMapasCadastroExtintores({
                    supabase,
                    mapasLocais: listarMapasObraLocal(),
                });

            if (!ativo) {
                return;
            }

            setMapasObra(resultado.mapas);
            setErroDados(resultado.erro || "");
            setObraSelecionadaId((atual) =>
                selecionarMapaCadastroExtintores({
                    mapas: resultado.mapas,
                    obraIdPreferida: atual,
                })?.obraId || "",
            );
        };

        const solicitarAtualizacao = () => {
            void atualizarMapas();
        };

        void atualizarMapas();

        window.addEventListener(
            "safescan-mapa-atualizado",
            solicitarAtualizacao,
        );

        window.addEventListener(
            "storage",
            solicitarAtualizacao,
        );

        return () => {
            ativo = false;

            window.removeEventListener(
                "safescan-mapa-atualizado",
                solicitarAtualizacao,
            );

            window.removeEventListener(
                "storage",
                solicitarAtualizacao,
            );
        };
    }, []);

    useEffect(() => {
        let ativo = true;

        const carregar = async () => {
            if (!mapaSelecionado) {
                setItens([]);
                setLocaisPendentes(0);
                setOrigemDados("vazio");
                setCarregandoDados(false);
                return;
            }

            setCarregandoDados(true);
            setErroDados("");

            const empresaId =
                identificadorEhUuidExtintor(
                    mapaSelecionado.empresaId,
                )
                    ? mapaSelecionado.empresaId
                    : "";

            const resultado =
                await carregarExtintoresCadastro({
                    obraId: mapaSelecionado.obraId,
                    empresaId,
                    mapa: mapaSelecionado,
                });

            if (!ativo) {
                return;
            }

            setItens(resultado.itens);
            setOrigemDados(resultado.origem);
            setErroDados(resultado.erro || "");
            setLocaisPendentes(
                resultado.locaisPendentes || 0,
            );
            setCarregandoDados(false);
        };

        void carregar();

        return () => {
            ativo = false;
        };
    }, [mapaSelecionado, recarregarVersao]);

    useEffect(() => {
        if (!filtro.startsWith("ponto:")) return;

        const pontoId =
            filtro.slice(6);

        const pontoAindaDisponivel =
            pontosComEquipamentos.some(
                (ponto) =>
                    String(ponto?.id || "") ===
                    pontoId,
            );

        if (!pontoAindaDisponivel) {
            setFiltro("Todos");
        }
    }, [filtro, pontosComEquipamentos]);

    const filtradosTotais = useMemo(() => itens.filter((item) => {
        const correspondeBusca = `${item.codigo} ${item.localizacao} ${item.tipo}`.toLowerCase().includes(busca.toLowerCase());
        const correspondeFiltro = filtro === "Todos"
            || (filtro === "Ativos" && item.status === "Ativo")
            || (filtro.startsWith("ponto:") && extintoresPorPonto.get(filtro.slice(6))?.has(String(item.id)));
        return correspondeBusca && correspondeFiltro;
    }), [itens, busca, filtro, extintoresPorPonto]);
    const filtrados = filtradosTotais;

    const alterar = (campo, valor) => setForm((atual) => {
        if (campo === "tipo") {
            const novasCapacidades = capacidadesPorTipo(valor);
            return { ...atual, tipo: valor, capacidade: novasCapacidades.includes(atual.capacidade) ? atual.capacidade : novasCapacidades[0] };
        }
        return { ...atual, [campo]: valor };
    });

    const novo = () => {
        setForm(VAZIO);
        setMensagem("");
    };

    const editar = (item) => {
        const opcoes = capacidadesPorTipo(item.tipo);

        const pontoPersistidoId =
            String(
                item?.pontoId ||
                item?.ponto_id ||
                "",
            );

        const pontoVinculado =
            pontosDisponiveis.find(
                (ponto) =>
                    String(ponto.id) ===
                    pontoPersistidoId,
            ) ||
            pontosDisponiveis.find(
                (ponto) =>
                    extintoresPorPonto.get(
                        String(ponto.id),
                    )?.has(String(item.id)),
            );

        setForm({
            ...VAZIO,
            ...item,
            pontoId: pontoVinculado?.id || "",
            ponto: pontoVinculado?.nome || "",
            capacidade:
                opcoes.includes(item.capacidade)
                    ? item.capacidade
                    : opcoes[0],
        });
    };

    function sincronizarPontoDoExtintor(
        extintorId,
        pontoId = "",
        extintorIdAnterior = "",
    ) {
        const idsParaRemover = new Set(
            [
                extintorId,
                extintorIdAnterior,
            ]
                .map(String)
                .filter(Boolean),
        );

        mapasObra.forEach((mapa) => {
            let alterado = false;

            const pontosAtualizados =
                (mapa.pontos || []).map((ponto) => {
                    const idsAtuais =
                        (ponto.extintores || []).map(String);

                    const deveVincular =
                        String(ponto.id) ===
                        String(pontoId);

                    const semExtintor =
                        idsAtuais.filter(
                            (id) =>
                                !idsParaRemover.has(id),
                        );

                    const proximosIds = deveVincular
                        ? [
                            ...semExtintor,
                            String(extintorId),
                        ]
                        : semExtintor;

                    if (
                        proximosIds.length ===
                            idsAtuais.length &&
                        proximosIds.every(
                            (id, indice) =>
                                id === idsAtuais[indice],
                        )
                    ) {
                        return ponto;
                    }

                    alterado = true;

                    const proximasPosicoes = {
                        ...(ponto.extintorPosicoes || {}),
                    };

                    const posicaoAnterior =
                        proximasPosicoes[
                            extintorIdAnterior
                        ] ||
                        proximasPosicoes[extintorId];

                    idsParaRemover.forEach((id) => {
                        delete proximasPosicoes[id];
                    });

                    if (
                        deveVincular &&
                        posicaoAnterior
                    ) {
                        proximasPosicoes[extintorId] =
                            posicaoAnterior;
                    }

                    return {
                        ...ponto,
                        extintores: proximosIds,
                        extintorPosicoes:
                            proximasPosicoes,
                    };
                });

            if (alterado) {
                salvarMapaObraLocal({
                    ...mapa,
                    pontos: pontosAtualizados,
                });
            }
        });
    }

    async function salvar(evento) {
        evento.preventDefault();

        if (salvandoDados) {
            return;
        }

        if (!mapaSelecionado) {
            setMensagem(
                "Selecione uma obra com mapa cadastrado.",
            );
            return;
        }

        if (!form.localizacao.trim()) {
            setMensagem(
                "Informe a localização do extintor.",
            );
            return;
        }

        if (!form.pontoId) {
            setMensagem(
                "Selecione um ponto cadastrado no Mapa da Obra.",
            );
            return;
        }

        const pontoSelecionado =
            pontosDisponiveis.find(
                (ponto) =>
                    String(ponto.id) ===
                    String(form.pontoId),
            );

        if (!pontoSelecionado) {
            setMensagem(
                "O ponto selecionado não está mais disponível.",
            );
            return;
        }

        const idAnterior = form.id;

        const itemNovo = {
            ...form,
            id: `extintor-${Date.now()}`,
            codigo: proximoCodigoExtintor(itens),
            tokenQr:
                `ext-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
            criadoEm: new Date().toISOString(),
            posicao: {
                top: 50,
                left: 50,
            },
        };

        const registro = form.id
            ? {
                ...form,
                ponto: pontoSelecionado.nome,
            }
            : {
                ...itemNovo,
                ponto: pontoSelecionado.nome,
            };

        const empresaId =
            identificadorEhUuidExtintor(
                mapaSelecionado.empresaId,
            )
                ? mapaSelecionado.empresaId
                : "";

        setSalvandoDados(true);
        setMensagem("");
        setErroDados("");

        try {
            const resultado =
                await salvarExtintorCadastro({
                    extintor: registro,
                    obraId: mapaSelecionado.obraId,
                    empresaId,
                    pontoId: pontoSelecionado.id,
                });

            setItens(resultado.itens);

            sincronizarPontoDoExtintor(
                resultado.registro.id,
                pontoSelecionado.id,
                idAnterior,
            );

            if (
                idAnterior &&
                !identificadorEhUuidExtintor(
                    idAnterior,
                )
            ) {
                setLocaisPendentes((atual) =>
                    Math.max(0, atual - 1),
                );
            }

            setOrigemDados("remoto");
            setForm(VAZIO);
            setMensagem(
                "Cadastro salvo no Supabase e vinculado ao ponto selecionado.",
            );
        }
        catch (erro) {
            setMensagem(
                erro?.message ||
                "Não foi possível salvar o extintor.",
            );
        }
        finally {
            setSalvandoDados(false);
        }
    }

    async function excluir(item) {
        if (salvandoDados) {
            return;
        }

        if (
            !window.confirm(
                `Excluir ${item.codigo}?`,
            )
        ) {
            return;
        }

        if (!mapaSelecionado) {
            setMensagem(
                "A obra do extintor não está disponível.",
            );
            return;
        }

        setSalvandoDados(true);
        setMensagem("");

        try {
            const resultado =
                await excluirExtintorCadastro({
                    extintor: item,
                    obraId: mapaSelecionado.obraId,
                });

            setItens(resultado.itens);

            sincronizarPontoDoExtintor(
                item.id,
                "",
            );

            if (
                !identificadorEhUuidExtintor(
                    item.id,
                )
            ) {
                setLocaisPendentes((atual) =>
                    Math.max(0, atual - 1),
                );
            }

            setMensagem(
                `${item.codigo} excluído com sucesso.`,
            );
        }
        catch (erro) {
            setMensagem(
                erro?.message ||
                "Não foi possível excluir o extintor.",
            );
        }
        finally {
            setSalvandoDados(false);
        }
    }

    async function migrarRegistrosLocais() {
        if (
            salvandoDados ||
            !mapaSelecionado ||
            locaisPendentes <= 0
        ) {
            return;
        }

        if (
            !window.confirm(
                `Migrar ${locaisPendentes} registro(s) local(is) desta obra para o Supabase?`,
            )
        ) {
            return;
        }

        const empresaId =
            identificadorEhUuidExtintor(
                mapaSelecionado.empresaId,
            )
                ? mapaSelecionado.empresaId
                : "";

        setSalvandoDados(true);
        setMensagem("");

        try {
            const resultado =
                await migrarExtintoresLocaisCadastro({
                    obraId: mapaSelecionado.obraId,
                    empresaId,
                    mapa: mapaSelecionado,
                });

            setItens(resultado.itens);

            resultado.itens.forEach((item) => {
                if (
                    item.referenciaLocal &&
                    item.referenciaLocal !== item.id
                ) {
                    sincronizarPontoDoExtintor(
                        item.id,
                        item.pontoId,
                        item.referenciaLocal,
                    );
                }
            });

            setLocaisPendentes(0);
            setOrigemDados("remoto");
            setMensagem(
                `${resultado.migrados} registro(s) local(is) migrado(s) para o Supabase.`,
            );
        }
        catch (erro) {
            setMensagem(
                erro?.message ||
                "Não foi possível migrar os registros locais.",
            );
        }
        finally {
            setSalvandoDados(false);
        }
    }

    function abrirManutencao(item) {
        setManutencaoAlvo(item);
        setFormManutencao({ ...MANUTENCAO_VAZIA, dataSaida: new Date().toISOString().slice(0, 10) });
        setFormRetorno({ ...RETORNO_VAZIO, dataRetorno: new Date().toISOString().slice(0, 10) });
    }

    async function atualizarExtintor(
        id,
        alteracoes,
    ) {
        const atual = itens.find(
            (item) => item.id === id,
        );

        if (!atual || !mapaSelecionado) {
            throw new Error(
                "Extintor ou obra não disponível para atualização.",
            );
        }

        const pontoVinculado =
            pontosDisponiveis.find(
                (ponto) =>
                    extintoresPorPonto.get(
                        String(ponto.id),
                    )?.has(String(atual.id)),
            );

        const pontoId =
            atual.pontoId ||
            pontoVinculado?.id ||
            "";

        const empresaId =
            identificadorEhUuidExtintor(
                mapaSelecionado.empresaId,
            )
                ? mapaSelecionado.empresaId
                : "";

        const resultado =
            await salvarExtintorCadastro({
                extintor: {
                    ...atual,
                    ...alteracoes,
                },
                obraId: mapaSelecionado.obraId,
                empresaId,
                pontoId,
            });

        setItens(resultado.itens);

        return resultado.registro;
    }

    async function enviarParaManutencao(evento) {
        evento.preventDefault();

        if (salvandoDados) {
            return;
        }

        if (!formManutencao.empresaNome.trim()) {
            setMensagem(
                "Informe a empresa responsável pelo serviço.",
            );
            return;
        }

        if (!formManutencao.registroInmetro.trim()) {
            setMensagem(
                "Informe o número de registro da empresa no Inmetro.",
            );
            return;
        }

        const tipo = TIPOS_SERVICO_EXTINTOR.find(
            (item) =>
                item.valor ===
                formManutencao.tipoServico,
        );

        setSalvandoDados(true);
        setMensagem("");

        try {
            await atualizarExtintor(
                manutencaoAlvo.id,
                {
                    status: "Inativo",
                    situacaoOperacional:
                        tipo?.situacao ||
                        "Em manutenção",
                },
            );

            registrarEnvioManutencaoExtintor({
                ...formManutencao,
                extintorId: manutencaoAlvo.id,
            });

            setManutencoes(
                listarManutencoesExtintores(),
            );

            setManutencaoAlvo(null);

            setMensagem(
                `${manutencaoAlvo.codigo} enviado para ${formManutencao.tipoServico.toLowerCase()}.`,
            );
        }
        catch (erro) {
            setMensagem(
                erro?.message ||
                "Não foi possível registrar a manutenção.",
            );
        }
        finally {
            setSalvandoDados(false);
        }
    }

    async function registrarRetorno(evento) {
        evento.preventDefault();

        if (salvandoDados) {
            return;
        }

        const aberta =
            obterManutencaoAbertaExtintor(
                manutencaoAlvo.id,
            );

        if (!aberta) {
            return;
        }

        setSalvandoDados(true);
        setMensagem("");

        try {
            await atualizarExtintor(
                manutencaoAlvo.id,
                {
                    status: "Ativo",
                    situacaoOperacional:
                        "Em operação",
                    ultimaManutencao:
                        formRetorno.dataRetorno,
                    proximaManutencao:
                        formRetorno.proximaManutencao,
                    proximoEnsaioHidrostatico:
                        formRetorno.proximoEnsaioHidrostatico,
                },
            );

            concluirManutencaoExtintor(
                aberta.id,
                formRetorno,
            );

            setManutencoes(
                listarManutencoesExtintores(),
            );

            setManutencaoAlvo(null);

            setMensagem(
                `${manutencaoAlvo.codigo} retornou ao serviço e está em operação.`,
            );
        }
        catch (erro) {
            setMensagem(
                erro?.message ||
                "Não foi possível registrar o retorno.",
            );
        }
        finally {
            setSalvandoDados(false);
        }
    }

    function imprimir(item) {
        setQr(item);
        setTimeout(() => {
            const area = document.getElementById(`qr-extintor-${item.id}`);
            const janela = window.open("", "_blank", "width=460,height=620");
            if (!area || !janela) return;
            janela.document.write(`<html><head><title>${item.codigo}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm}body{font:14px Arial;text-align:center;color:#0f172a;display:flex;align-items:flex-start;justify-content:center;padding-top:18mm}.etiqueta{border:1px solid #dbe4ee;padding:5mm 6mm 5.5mm;border-radius:5px;width:72mm;box-sizing:border-box}h1{font-size:14px;line-height:1.1;margin:0 0 1.5mm;font-weight:700;white-space:nowrap}.qr-print>span{position:relative;display:inline-flex;align-items:center;justify-content:center;width:58mm!important;height:58mm!important;overflow:hidden}.qr-print>span>svg{display:block;width:58mm;height:58mm}.qr-print>span>span{position:absolute;left:50%;top:50%;z-index:2;display:flex;width:13mm!important;height:13mm!important;align-items:center;justify-content:center;transform:translate(-50%,-50%);border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(15,23,42,.18)}.qr-print>span>span img{display:block;width:10.5mm!important;height:10.5mm!important;object-fit:contain;border-radius:7px}</style></head><body>${area.innerHTML}</body></html>`);
            janela.document.close(); janela.focus(); janela.print();
        }, 100);
    }

    return (
        <section className="min-h-full bg-slate-50/70 px-4 py-6 md:px-7 md:py-8">
            <div className="mx-auto max-w-[1480px] space-y-6">
                <header className="hidden">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700"><ShieldCheck size={15} /> Vistoria de equipamentos</div>
                        <h1 className="text-3xl font-black tracking-tight text-slate-950">Extintores</h1>
                        <p className="mt-1 text-sm text-slate-500">Controle de localização, capacidade e identificação dos equipamentos.</p>
                    </div>
                    <button type="button" onClick={novo} className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"><Plus size={17} /> Novo extintor</button>
                </header>

                <section className="relative overflow-hidden rounded-[22px] border border-[#E5E9EF] bg-[#111827] shadow-[0_10px_28px_rgba(26,35,50,0.12)]">
                    <div className="absolute inset-0 bg-no-repeat" style={{ backgroundImage: `url(${extintoresHeroBackground})`, backgroundPosition: "140% 32%", backgroundSize: "130% auto" }} />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.34)_0%,rgba(2,6,23,0.14)_52%,rgba(2,6,23,0.04)_100%)]" />
                    <div className="relative flex min-h-[145px] flex-col justify-between gap-5 px-6 py-6 text-white lg:flex-row lg:items-center" style={{ textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-300">SafeScan Brasil</p>
                            <h2 className="mt-2 text-xl font-black leading-tight md:text-2xl">Vistoria de extintores</h2>
                            <p className="mt-2 text-base font-bold text-slate-200">Controle e rastreabilidade dos equipamentos.</p>
                            <div className="mt-5 h-1 w-14 rounded-full bg-[#1E7C3A]" />
                        </div>
                        <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur">
                            <div className="flex flex-wrap items-center gap-2"><CalendarClock className="h-4 w-4 text-emerald-300" /><span>{dataHero}</span><span className="text-emerald-300">•</span><span className="capitalize">{diaHero}</span><span className="text-emerald-300">•</span><span>{horaHero}</span></div>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                <button type="button" onClick={novo} className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-black text-slate-950 shadow-sm transition hover:bg-slate-100"><Plus size={15} /> Novo</button>
                                <button type="button" onClick={() => gerarRelatorioExtintoresPDF({ extintores: itens, manutencoes })} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 bg-black/25 px-3 py-2 text-xs font-black text-white transition hover:bg-black/40"><FileDown size={15} /> Relatório</button>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                        <div className="min-w-0 flex-1">
                            <label className="mb-1.5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-slate-500">
                                <Building2 size={14} />
                                Obra ativa
                            </label>
                            <select
                                value={mapaSelecionado?.obraId || ""}
                                onChange={(evento) => {
                                    setObraSelecionadaId(evento.target.value);
                                    setForm(VAZIO);
                                    setFiltro("Todos");
                                    setMensagem("");
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            >
                                {!mapasObraDisponiveis.length && (
                                    <option value="">
                                        Nenhuma obra com mapa disponível
                                    </option>
                                )}
                                {mapasObraDisponiveis.map((mapa) => (
                                    <option
                                        key={mapa.id || mapa.mapaId || mapa.obraId}
                                        value={mapa.obraId}
                                    >
                                        {mapa.obraNome || mapa.nome || "Obra sem nome"}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                                Fonte: {origemDadosTexto}
                            </span>

                            <button
                                type="button"
                                onClick={() => setRecarregarVersao((atual) => atual + 1)}
                                disabled={carregandoDados || salvandoDados}
                                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <RotateCcw
                                    size={15}
                                    className={carregandoDados ? "animate-spin" : ""}
                                />
                                Atualizar
                            </button>

                            {locaisPendentes > 0 && (
                                <button
                                    type="button"
                                    onClick={migrarRegistrosLocais}
                                    disabled={salvandoDados}
                                    className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-black text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    Migrar {locaisPendentes} registro(s) local(is)
                                </button>
                            )}
                        </div>
                    </div>

                    {erroDados && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                            {erroDados} A tela está utilizando a melhor fonte disponível.
                        </p>
                    )}
                </section>

                {mensagem && <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">{mensagem}</div>}

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <Resumo titulo="Total cadastrado" subtitulo="Equipamentos registrados" valor={itens.length} icone={ShieldCheck} cor="sky" />
                    <Resumo titulo="Pontos da obra" subtitulo="Com equipamentos vinculados" valor={pontosComEquipamentos.length} icone={MapPin} cor="emerald" />
                    <Resumo titulo="Vinculados ao mapa" subtitulo="Equipamentos com ponto definido" valor={idsExtintoresVinculados.size} icone={MapPin} cor="amber" />
                    <Resumo titulo="Em operação" subtitulo="Disponíveis para uso" valor={itens.filter((item) => (item.situacaoOperacional || "Em operação") === "Em operação").length} icone={Activity} cor="indigo" />
                </div>

                <div className="grid items-start gap-5 xl:grid-cols-[330px_minmax(0,1fr)]">
                    <form onSubmit={salvar} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:sticky xl:top-5 xl:h-[590px] [&_input]:py-2 [&_select]:py-2">
                        <div className="mb-3 flex items-start justify-between gap-3">
                            <div><p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">Cadastro</p><h2 className="mt-1 text-lg font-black text-slate-950">{form.id ? "Editar equipamento" : "Novo equipamento"}</h2></div>
                            {form.id && <button type="button" onClick={novo} className="text-xs font-bold text-slate-500 hover:text-slate-900">Cancelar</button>}
                        </div>
                        <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"><div><p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Código automático</p><p className="mt-0.5 text-xl font-black text-slate-950">{form.id ? form.codigo : proximoCodigoExtintor(itens)}</p></div><ShieldCheck size={20} className="text-sky-600" /></div>
                        <div className="space-y-2.5">
                            <Campo label="Localização" value={form.localizacao} onChange={(valor) => alterar("localizacao", valor)} placeholder="Ex.: corredor do escritório" />
                            <SelectCampo
                                label="Ponto da obra"
                                value={form.pontoId}
                                onChange={(valor) => {
                                    const ponto = pontosDisponiveis.find((item) => String(item.id) === String(valor));
                                    setForm((atual) => ({ ...atual, pontoId: valor, ponto: ponto?.nome || "" }));
                                }}
                                opcoes={pontosDisponiveis.map((ponto) => ({ valor: ponto.id, label: ponto.nome || "Ponto sem nome" }))}
                                placeholder={pontosDisponiveis.length ? "Selecione um ponto" : "Cadastre um ponto no Mapa da Obra"}
                            />
                            <SelectCampo label="Tipo de extintor" value={form.tipo} onChange={(valor) => alterar("tipo", valor)} opcoes={TIPOS_EXTINTORES_BRASIL.map((item) => item.valor)} />
                            <SelectCampo label="Capacidade nominal" value={form.capacidade} onChange={(valor) => alterar("capacidade", valor)} opcoes={capacidades} />
                            <Campo label="Data da aquisição" value={form.dataAquisicao} onChange={(valor) => alterar("dataAquisicao", valor)} tipo="date" />
                            <button
                                type="submit"
                                disabled={
                                    carregandoDados ||
                                    salvandoDados ||
                                    !mapaSelecionado
                                }
                                className="mb-2 mt-2 w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                                {salvandoDados
                                    ? "Salvando..."
                                    : "Salvar equipamento"}
                            </button>
                        </div>
                    </form>

                    <div className="flex h-[590px] min-w-0 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-slate-950">Equipamentos cadastrados</h2><p className="mt-0.5 text-xs text-slate-500">{filtrados.length} equipamento(s) exibido(s)</p></div><div className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:max-w-[310px]"><Search size={16} className="shrink-0 text-slate-400" /><input value={busca} onChange={(evento) => setBusca(evento.target.value)} placeholder="Buscar código, local ou tipo" className="w-full bg-transparent text-sm outline-none" /></div></div>
                        <div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
                            <FiltroBotao ativo={filtro === "Todos"} onClick={() => setFiltro("Todos")}>Todos</FiltroBotao>
                            {pontosComEquipamentos.map((ponto) => {
                                const valorFiltro = `ponto:${ponto.id}`;
                                return <FiltroBotao key={ponto.id} ativo={filtro === valorFiltro} onClick={() => setFiltro(valorFiltro)}>{ponto.nome || "Ponto sem nome"}</FiltroBotao>;
                            })}
                            <FiltroBotao ativo={filtro === "Ativos"} onClick={() => setFiltro("Ativos")}>Ativos</FiltroBotao>
                        </div>
                        <div className="min-h-0 flex-1 overflow-y-scroll overflow-x-auto" style={{ scrollbarGutter: "stable" }}>
                            <div className="min-w-[680px]">
                                <div className="sticky top-0 z-10 grid grid-cols-[64px_repeat(5,minmax(0,1fr))] border-b border-slate-200 bg-slate-50 px-2 py-2.5 text-[9px] font-black uppercase tracking-[0.06em] text-slate-500">
                                    <span className="flex items-center justify-center whitespace-nowrap">Código</span><span className="flex items-center justify-center whitespace-nowrap border-l border-slate-200 px-2 text-center">Localização</span><span className="flex items-center justify-center whitespace-nowrap border-l border-slate-200 px-2 text-center">Ponto</span><span className="flex items-center justify-center whitespace-nowrap border-l border-slate-200 px-2 text-center">Tipo e capacidade</span><span className="flex items-center justify-center whitespace-nowrap border-l border-slate-200 px-2 text-center">Situação</span><span className="flex items-center justify-center whitespace-nowrap border-l border-slate-200 px-2 text-center">Ações</span>
                                </div>
                                {carregandoDados && (
                                    <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                        Carregando extintores da obra...
                                    </div>
                                )}
                                {!carregandoDados && !filtrados.length && (
                                    <div className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                                        Nenhum extintor cadastrado para esta obra.
                                    </div>
                                )}
                                {!carregandoDados && filtrados.map((item) => <div key={item.id} className="grid min-h-[50px] grid-cols-[64px_repeat(5,minmax(0,1fr))] items-stretch border-t border-slate-100 px-2 text-sm transition hover:bg-slate-50/70">
                                    <div className="flex items-center justify-center font-black text-slate-950">{item.codigo}</div>
                                    <span className="flex min-w-0 items-center truncate border-l border-slate-100 px-3 text-slate-700">{item.localizacao}</span>
                                    <span className="flex min-w-0 items-center justify-center truncate border-l border-slate-100 px-3 text-xs font-semibold text-slate-500">{pontoAtualPorExtintor.get(String(item.id)) || pontoNomePorId.get(String(item.pontoId || "")) || "Não vinculado"}</span>
                                    <span className="flex min-w-0 items-center justify-center truncate border-l border-slate-100 px-3 text-center text-slate-600">{item.tipo} <b className="ml-1 font-bold text-slate-900">· {item.capacidade}</b></span>
                                    <div className="flex items-center justify-center border-l border-slate-100 px-2"><SituacaoBadge situacao={item.situacaoOperacional || "Em operação"} /></div>
                                    <div className="flex items-center justify-center gap-0.5 border-l border-slate-100 px-1"><button type="button" title="Manutenção e recarga" onClick={() => abrirManutencao(item)} className="rounded-md p-1.5 text-amber-700 hover:bg-amber-50"><Wrench size={16} /></button><button type="button" title="Gerar QR Code" onClick={() => imprimir(item)} className="rounded-md p-1.5 text-sky-700 hover:bg-sky-50"><QrCode size={16} /></button><button type="button" title="Editar" onClick={() => editar(item)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"><Edit3 size={16} /></button><button type="button" title="Excluir" onClick={() => excluir(item)} className="rounded-md p-1.5 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>
                                </div>)}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center border-t border-slate-100 px-4 py-2.5"><p className="text-xs text-slate-500">Exibindo {filtrados.length} de {itens.length}</p></div>
                    </div>
                </div>
            </div>
            {qr && <div id={`qr-extintor-${qr.id}`} className="sr-only"><div className="etiqueta"><h1>{qr.codigo} - {qr.tipo} {String(qr.capacidade).toUpperCase()}</h1><div className="qr-print"><QrCodeComLogo value={gerarUrlQrExtintor(qr)} size={230} level="H" includeMargin bgColor="#ffffff" fgColor="#0f172a" logoRatio={0.22} /></div></div></div>}
            {manutencaoAlvo && <ModalManutencao item={manutencaoAlvo} aberta={obterManutencaoAbertaExtintor(manutencaoAlvo.id)} form={formManutencao} setForm={setFormManutencao} retorno={formRetorno} setRetorno={setFormRetorno} onEnviar={enviarParaManutencao} onRetornar={registrarRetorno} onClose={() => setManutencaoAlvo(null)} />}
        </section>
    );
}

function SituacaoBadge({ situacao }) {
    const estilos = {
        "Em operação": "border-emerald-200 bg-emerald-50 text-emerald-700",
        "Em inspeção": "border-sky-200 bg-sky-50 text-sky-700",
        "Em manutenção": "border-amber-200 bg-amber-50 text-amber-800",
        "Em recarga": "border-orange-200 bg-orange-50 text-orange-800",
        "Aguardando retorno": "border-violet-200 bg-violet-50 text-violet-700",
        Baixado: "border-slate-200 bg-slate-100 text-slate-600",
    };
    return <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${estilos[situacao] || estilos.Baixado}`}>{situacao}</span>;
}

function ModalManutencao({ item, aberta, form, setForm, retorno, setRetorno, onEnviar, onRetornar, onClose }) {
    const alterar = (setter, campo, valor) => setter((atual) => ({ ...atual, [campo]: valor }));
    return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`Manutenção do ${item.codigo}`}>
        <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl">
            <header className="relative flex min-h-[118px] items-center justify-between gap-4 overflow-hidden border-b border-slate-200 bg-slate-950 px-6 py-5 text-white">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${extintoresHeroBackground})` }} />
                <div className="absolute inset-0 bg-slate-950/55" />
                <div className="relative flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-400 text-slate-950"><Wrench size={21} /></span>
                    <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Controle técnico</p><h2 className="mt-1 text-xl font-black">{item.codigo} · {item.tipo} {item.capacidade}</h2><p className="mt-1 text-sm text-slate-300">{aberta ? "Registrar retorno do equipamento" : "Enviar para inspeção, manutenção ou recarga"}</p></div>
                </div>
                <button type="button" onClick={onClose} title="Fechar" className="relative rounded-md p-2 text-slate-200 hover:bg-white/10 hover:text-white">×</button>
            </header>

            {aberta ? <form onSubmit={onRetornar} className="space-y-5 p-6">
                <div className="grid gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:grid-cols-2">
                    <InfoModal label="Serviço" valor={aberta.tipoServico} />
                    <InfoModal label="Empresa" valor={aberta.empresaNome} />
                    <InfoModal label="Registro Inmetro" valor={aberta.registroInmetro} />
                    <InfoModal label="Saída / previsão" valor={`${formatarData(aberta.dataSaida)} / ${formatarData(aberta.previsaoRetorno)}`} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Campo label="Data de retorno" tipo="date" value={retorno.dataRetorno} onChange={(valor) => alterar(setRetorno, "dataRetorno", valor)} />
                    <Campo label="Selo de conformidade" value={retorno.seloConformidade} onChange={(valor) => alterar(setRetorno, "seloConformidade", valor)} placeholder="Número ou identificação do selo" />
                    <Campo label="Próxima manutenção" tipo="date" value={retorno.proximaManutencao} onChange={(valor) => alterar(setRetorno, "proximaManutencao", valor)} />
                    <Campo label="Próximo ensaio hidrostático" tipo="date" value={retorno.proximoEnsaioHidrostatico} onChange={(valor) => alterar(setRetorno, "proximoEnsaioHidrostatico", valor)} />
                </div>
                <AreaCampo label="Observações do retorno" value={retorno.observacoesRetorno} onChange={(valor) => alterar(setRetorno, "observacoesRetorno", valor)} />
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-black text-white transition hover:bg-emerald-700"><RotateCcw size={17} /> Registrar retorno e liberar equipamento</button>
            </form> : <form onSubmit={onEnviar} className="space-y-5 p-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2"><SelectCampo label="Tipo de serviço" value={form.tipoServico} onChange={(valor) => alterar(setForm, "tipoServico", valor)} opcoes={TIPOS_SERVICO_EXTINTOR.map((tipo) => tipo.valor)} /></div>
                    <SelectCampo label="Motivo" value={form.motivo} onChange={(valor) => alterar(setForm, "motivo", valor)} opcoes={["Programada", "Após uso", "Perda de pressão ou carga", "Avaria identificada", "Corrosão ou dano", "Outro"]} />
                    <Campo label="Data de saída" tipo="date" value={form.dataSaida} onChange={(valor) => alterar(setForm, "dataSaida", valor)} />
                    <Campo label="Empresa responsável" value={form.empresaNome} onChange={(valor) => alterar(setForm, "empresaNome", valor)} placeholder="Razão social" />
                    <Campo label="CNPJ da empresa" value={form.empresaCnpj} onChange={(valor) => alterar(setForm, "empresaCnpj", valor)} placeholder="00.000.000/0000-00" />
                    <Campo label="Registro da empresa no Inmetro" value={form.registroInmetro} onChange={(valor) => alterar(setForm, "registroInmetro", valor)} placeholder="Número do registro" />
                    <Campo label="Ordem de serviço" value={form.ordemServico} onChange={(valor) => alterar(setForm, "ordemServico", valor)} placeholder="OS ou protocolo" />
                    <Campo label="Previsão de retorno" tipo="date" value={form.previsaoRetorno} onChange={(valor) => alterar(setForm, "previsaoRetorno", valor)} />
                </div>
                <AreaCampo label="Observações" value={form.observacoes} onChange={(valor) => alterar(setForm, "observacoes", valor)} />
                <div className="flex gap-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-xs leading-5 text-sky-900"><Building2 className="mt-0.5 shrink-0" size={17} /><p>O serviço deve ser executado por empresa registrada no Inmetro. Recarga após uso ou perda de carga é controlada como intervenção de 2º nível.</p></div>
                <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"><Wrench size={17} /> Registrar saída do equipamento</button>
            </form>}
        </div>
    </div>;
}

function InfoModal({ label, valor }) { return <div><p className="text-[10px] font-black uppercase tracking-wide text-amber-700">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{valor || "Não informado"}</p></div>; }
function formatarData(valor) { return valor ? new Date(`${valor}T12:00:00`).toLocaleDateString("pt-BR") : "Não informada"; }

function Resumo({ titulo, subtitulo, valor, icone: Icone, cor }) {
    const cores = { sky: "text-sky-600 bg-sky-50 border-sky-400", amber: "text-amber-600 bg-amber-50 border-amber-400", emerald: "text-emerald-600 bg-emerald-50 border-emerald-400", indigo: "text-indigo-600 bg-indigo-50 border-indigo-400", red: "text-red-600 bg-red-50 border-red-400" };
    return <div className={`flex min-h-[82px] items-center gap-3 rounded-xl border border-slate-200 border-t-[3px] bg-white px-3 py-2.5 shadow-sm ${cores[cor]}`}><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cores[cor]}`}><Icone size={18} /></span><div className="min-w-0 flex-1 text-center"><p className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-500">{titulo}</p><p className="mt-0.5 text-2xl font-black leading-none text-slate-950">{valor}</p><p className="mt-1 truncate text-[9px] font-medium text-slate-500">{subtitulo}</p></div></div>;
}

function Campo({ label, value, onChange, placeholder, tipo = "text" }) { return <label className="block text-xs font-bold text-slate-600">{label}<input type={tipo} value={value || ""} onChange={(evento) => onChange(evento.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>; }
function AreaCampo({ label, value, onChange }) { return <label className="block text-xs font-bold text-slate-600">{label}<textarea rows={3} value={value || ""} onChange={(evento) => onChange(evento.target.value)} className="mt-1.5 w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100" /></label>; }
function SelectCampo({ label, value, onChange, opcoes, placeholder = "" }) { return <label className="block text-xs font-bold text-slate-600">{label}<select value={value} onChange={(evento) => onChange(evento.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100">{placeholder && <option value="" disabled>{placeholder}</option>}{opcoes.map((opcao) => { const objeto = typeof opcao === "object"; const valor = objeto ? opcao.valor : opcao; return <option key={valor} value={valor}>{objeto ? opcao.label : opcao}</option>; })}</select></label>; }
function FiltroBotao({ ativo, onClick, children }) { return <button type="button" onClick={onClick} className={`rounded-md px-3 py-1.5 text-xs font-bold transition ${ativo ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{children}</button>; }
