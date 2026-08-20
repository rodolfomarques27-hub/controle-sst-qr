/* eslint-disable no-unused-vars */
import React from "react";
import {
    ChevronDown,
    ChevronUp,
    FileText,
    Filter,
    History,
    Upload,
} from "lucide-react";
import { Card, StatusPill } from "../commonComponents";
import {
    obterSituacaoHistoricaTreinamentosColaborador,
    statusDocumento,
    treinamentoSemValidade,
} from "../../services/colaboradorDocumentosService";
import { formatDate, classNames } from "../../utils/sstUtils";
import { VerificacaoCertificadoTreinamento } from "./VerificacaoCertificadoTreinamento";
import { criarUrlAssinadaStorage } from "../../services/supabaseServices";

function obterFotoColaboradorBase(colaborador = {}) {
    return String(
        colaborador?.fotoUrl ||
        colaborador?.foto_url ||
        colaborador?.fotoPerfilUrl ||
        colaborador?.foto_perfil_url ||
        colaborador?.avatarUrl ||
        colaborador?.avatar_url ||
        colaborador?.fotoPublicaUrl ||
        colaborador?.foto_publica_url ||
        colaborador?.fotoAssinadaUrl ||
        colaborador?.foto_assinada_url ||
        colaborador?.fotoPath ||
        colaborador?.foto_path ||
        colaborador?.fotoCaminho ||
        colaborador?.foto_caminho ||
        colaborador?.fotoNome ||
        colaborador?.foto_nome ||
        colaborador?.foto ||
        ""
    ).trim();
}

function fotoColaboradorEhUrlDireta(valor = "") {
    return /^(https?:|data:|blob:)/i.test(String(valor || "").trim());
}

function normalizarCaminhoFotoColaboradorBase(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto || fotoColaboradorEhUrlDireta(texto)) return "";

    try {
        const semQuery = texto.split("?")[0];
        const partesBucket = [
            "/storage/v1/object/public/fotos-colaboradores/",
            "/storage/v1/object/sign/fotos-colaboradores/",
            "fotos-colaboradores/",
        ];

        const encontrado = partesBucket.find((parte) => semQuery.includes(parte));
        const caminho = encontrado ? semQuery.slice(semQuery.indexOf(encontrado) + encontrado.length) : semQuery;

        return decodeURIComponent(caminho).replace(/^\/+/, "");
    } catch {
        return texto.replace(/^\/+/, "");
    }
}

async function gerarUrlFotoColaboradorBase(valor = "") {
    const foto = String(valor || "").trim();

    if (!foto) return "";
    if (fotoColaboradorEhUrlDireta(foto)) return foto;

    const caminhoStorage = normalizarCaminhoFotoColaboradorBase(foto);

    if (!caminhoStorage) return "";

    try {
        return await criarUrlAssinadaStorage(
            "fotos-colaboradores",
            caminhoStorage,
            60 * 60,
        );
    } catch {
        return "";
    }
}

function obterIniciaisColaboradorBase(nome = "") {
    const partes = String(nome || "")
        .trim()
        .split(/\s+/)
        .filter((parte) => parte.length > 0);

    if (!partes.length) return "ST";

    const primeira = partes[0]?.[0] || "";
    const ultima = partes.length > 1 ? partes[partes.length - 1]?.[0] || "" : "";

    return `${primeira}${ultima || ""}`.toUpperCase() || "ST";
}

function FotoColaboradorBase({ colaborador = {} }) {
    const [fotoComErro, setFotoComErro] = React.useState(false);
    const [fotoUrlResolvida, setFotoUrlResolvida] = React.useState("");
    const fotoOrigem = obterFotoColaboradorBase(colaborador);
    const nome = colaborador?.nome || "Colaborador";
    const iniciais = obterIniciaisColaboradorBase(nome);

    React.useEffect(() => {
        let ativo = true;

        setFotoComErro(false);
        setFotoUrlResolvida("");

        gerarUrlFotoColaboradorBase(fotoOrigem).then((url) => {
            if (ativo) setFotoUrlResolvida(url || "");
        });

        return () => {
            ativo = false;
        };
    }, [fotoOrigem]);

    /*
    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    const salvarDatasCertificadoFormulario = (documento, itemKey, valoresAtuais = {}) => {
        const chaveRealizado = `${itemKey}:realizado`;
        const chaveVencimento = `${itemKey}:vencimento`;

        const realizadoDigitado = datasDigitadasRevisao[chaveRealizado] || "";
        const vencimentoDigitado = datasDigitadasRevisao[chaveVencimento] || "";

        const realizadoIso = realizadoDigitado
            ? converterDataBrFormularioCertificadoParaIso(realizadoDigitado)
            : valoresAtuais.realizado || "";

        const vencimentoIso = vencimentoDigitado
            ? converterDataBrFormularioCertificadoParaIso(vencimentoDigitado)
            : valoresAtuais.vencimento || "";

        if (realizadoDigitado && !realizadoIso) {
            alert("Data de admissão/registro inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        if (vencimentoDigitado && !vencimentoIso) {
            alert("Data de vencimento inválida. Use o formato dd/mm/aaaa.");
            return;
        }

        const documentoAtualizado = {
            ...documento,
            realizado: realizadoIso,
            dataRealizacao: realizadoIso,
            data_realizacao: realizadoIso,
            vencimento: vencimentoIso || "",
            dataVencimento: vencimentoIso || "",
            data_vencimento: vencimentoIso || "",
        };

        alterarDataRevisao(documento, "realizado", realizadoIso);
        alterarDataRevisao(documento, "vencimento", vencimentoIso || "");

        setDatasCertificadosAtualizadas((atual) => ({
            ...atual,
            [String(documento.id || "")]: {
                realizado: realizadoIso,
                vencimento: vencimentoIso || "",
            },
        }));

        setTimeout(() => {
            salvarDatasCertificado(documentoAtualizado);
        }, 0);
    };

    */
    return (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-sm font-black uppercase text-slate-500 ring-1 ring-slate-200 sm:h-16 sm:w-16">
            {fotoUrlResolvida && !fotoComErro ? (
                <img
                    src={fotoUrlResolvida}
                    alt={`Foto de ${nome}`}
                    className="h-full w-full rounded-full object-cover"
                    loading="lazy"
                    onError={() => setFotoComErro(true)}
                />
            ) : (
                <span>{iniciais}</span>
            )}
        </div>
    );
}

function normalizarDataIsoFormularioCertificado(valor = "") {
    const texto = String(valor || "").trim();

    if (!texto) return "";

    const iso = texto.match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/);
    if (iso) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    const br = texto.match(/^([0-3]?\d)\/([01]?\d)\/((?:19|20)\d{2})$/);
    if (!br) return "";

    const dia = br[1].padStart(2, "0");
    const mes = br[2].padStart(2, "0");
    const ano = br[3];

    const data = new Date(`${ano}-${mes}-${dia}T12:00:00`);

    if (
        Number.isNaN(data.getTime()) ||
        data.getFullYear() !== Number(ano) ||
        data.getMonth() + 1 !== Number(mes) ||
        data.getDate() !== Number(dia)
    ) {
        return "";
    }

    return `${ano}-${mes}-${dia}`;
}

function formatarDataBrFormularioCertificado(valor = "") {
    const iso = normalizarDataIsoFormularioCertificado(valor);

    if (!iso) return "";

    const [ano, mes, dia] = iso.split("-");

    return `${dia}/${mes}/${ano}`;
}

function aplicarMascaraDataBrFormularioCertificado(valor = "") {
    const digitos = String(valor || "").replace(/\D/g, "").slice(0, 8);

    if (digitos.length <= 2) return digitos;
    if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;

    return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}

function converterDataBrFormularioCertificadoParaIso(valor = "") {
    const mascarada = aplicarMascaraDataBrFormularioCertificado(valor);

    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(mascarada)) {
        return "";
    }

    return normalizarDataIsoFormularioCertificado(mascarada);
}
// empresa_card_compacta_v1:
// Exibe primeiro a empresa direta e preserva o vínculo completo no title.
function obterRotuloEmpresaCompactoBaseCertificados(
    colaborador = {}
) {
    const empresaCompleta =
        String(
            colaborador?.empresaExibicao ||
            colaborador?.empresa_exibicao ||
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            "Empresa não informada"
        )
            .replace(/\s+/g, " ")
            .trim() ||
        "Empresa não informada";

    const partes =
        empresaCompleta.split(
            /\bsubcontratada\s*:/i
        );

    const nomeExtraido =
        String(
            partes.length > 1
                ? partes[partes.length - 1]
                : ""
        )
            .replace(/\s+/g, " ")
            .trim();

    const nomeDireto =
        String(
            colaborador?.empresaNome ||
            colaborador?.empresa_nome ||
            colaborador?.empresa ||
            nomeExtraido ||
            empresaCompleta
        )
            .replace(/\s+/g, " ")
            .trim();

    const ehSubcontratada =
        Boolean(
            colaborador?.empresaPaiId ||
            colaborador?.empresa_pai_id ||
            colaborador?.empresaPaiNome ||
            colaborador?.empresa_pai_nome ||
            partes.length > 1
        );

    return ehSubcontratada
        ? `Sub... · ${nomeDireto}`
        : empresaCompleta;
}
export function BaseCertificadosTreinamentos({
    documentos = [],
    documentosFiltrados = [],
    documentosPorColaborador = [],
    totalPorStatusCertificados = { pendentes: 0 },
    gruposCertificadosAbertos = {},
    setGruposCertificadosAbertos,
    certificadosAbertos = {},
    setCertificadosAbertos,
    valoresRevisao,
    alterarDataRevisao,
    salvarDatasCertificado,
    salvandoDatasId = "",
    enviarDocumentoPendente,
    enviarDocumentosPendentesEmLote,
    onVisualizarCertificado,
    onAbrirHistoricoCertificado,
    onExcluirCertificado,
    recolhido = false,
    onAlternarRecolhido,
}) {
    const [datasCertificadosAtualizadas, setDatasCertificadosAtualizadas] = React.useState({});
    const [datasDigitadasRevisao, setDatasDigitadasRevisao] = React.useState({});
    const [ordemColaboradoresBase, setOrdemColaboradoresBase] = React.useState("atual");

    const documentosPorColaboradorOrdenados = React.useMemo(() => {
        if (ordemColaboradoresBase === "atual") {
            return documentosPorColaborador;
        }

        const gruposOrdenados = [...documentosPorColaborador].sort(
            (grupoA, grupoB) =>
                String(grupoA?.colaborador?.nome || "").localeCompare(
                    String(grupoB?.colaborador?.nome || ""),
                    "pt-BR",
                    { sensitivity: "base" }
                )
        );

        return ordemColaboradoresBase === "za"
            ? gruposOrdenados.reverse()
            : gruposOrdenados;
    }, [documentosPorColaborador, ordemColaboradoresBase]);

    const totalPendentesFiltradosBase = React.useMemo(
        () =>
            documentosPorColaboradorOrdenados.reduce(
                (total, grupo) =>
                    total +
                    Number(grupo?.pendentes?.length || 0),
                0
            ),
        [documentosPorColaboradorOrdenados]
    );

    React.useEffect(() => {
        if (typeof window === "undefined") return undefined;

        const aoAtualizarDataCertificado = (event) => {
            const detalhe = event?.detail || {};
            const id = detalhe.id || detalhe.certificadoId || detalhe.certificado_id;

            if (!id) return;

            setDatasCertificadosAtualizadas((atual) => ({
                ...atual,
                [String(id)]: {
                    realizado: detalhe.dataRealizacao || detalhe.data_realizacao || "",
                    vencimento: detalhe.dataVencimento ?? detalhe.data_vencimento ?? "",
                },
            }));
        };

        window.addEventListener("certificado-data-atualizada", aoAtualizarDataCertificado);

        return () => {
            window.removeEventListener("certificado-data-atualizada", aoAtualizarDataCertificado);
        };
    }, []);
    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
        <Card className={classNames("self-start treinamentos-base-certificados-card", recolhido && "treinamentos-base-certificados-card--recolhido")}>
            <div
                className={classNames(
                    "treinamentos-base-certificados-card__cabecalho flex flex-col justify-between gap-3 md:flex-row md:items-start",
                    !recolhido && "mb-4"
                )}
            >
                <div>
                    <h2 className="text-lg font-bold text-slate-950">Base de certificados</h2>
                    <p className="mt-1 text-sm text-slate-500">Consulta, revisão de datas e abertura dos certificados enviados.</p>
                </div>

                <div className="flex flex-wrap gap-2 md:justify-end">
                    {!recolhido && (
                        <label
                            className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200"
                            data-base-certificados-acao
                        >
                            <span>Ordenar</span>
                            <select
                                value={ordemColaboradoresBase}
                                onChange={(evento) => setOrdemColaboradoresBase(evento.target.value)}
                                className="bg-transparent font-bold text-slate-700 outline-none"
                                aria-label="Ordenar colaboradores da base de certificados"
                            >
                                <option value="atual">Ordem atual</option>
                                <option value="az">A–Z</option>
                                <option value="za">Z–A</option>
                            </select>
                        </label>
                    )}

                    {!recolhido && (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                            {documentosFiltrados.length} certificado(s) · {totalPendentesFiltradosBase} pendente(s)
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={onAlternarRecolhido}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                        {recolhido ? (
                            <>
                                <ChevronDown className="h-3.5 w-3.5" />
                                Abrir
                            </>
                        ) : (
                            <>
                                <ChevronUp className="h-3.5 w-3.5" />
                                Recolher
                            </>
                        )}
                    </button>
                </div>
            </div>

            {recolhido ? null : (
            <div className="treinamentos-base-certificados-card__lista space-y-3">
                {documentos.length === 0 && totalPorStatusCertificados.pendentes === 0 && (
                    <div className="treinamentos-base-certificados-card__vazio rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <FileText className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado lançado ainda</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Os certificados enviados aparecerão nesta base para revisão de validade e consulta.
                        </p>
                    </div>
                )}

                {documentos.length > 0 && documentosPorColaboradorOrdenados.length === 0 && (
                    <div className="treinamentos-base-certificados-card__vazio rounded-3xl border border-dashed border-slate-300 p-8 text-center">
                        <Filter className="mx-auto h-10 w-10 text-slate-300" />
                        <h3 className="mt-3 font-bold text-slate-900">Nenhum certificado encontrado</h3>
                        <p className="mt-1 text-sm text-slate-500">
                            Ajuste a busca, a empresa ou o filtro de status para localizar os certificados.
                        </p>
                    </div>
                )}

                {documentosPorColaboradorOrdenados.map((grupo, indiceGrupo) => {
                    const colaborador = grupo.colaborador;
                    const certificados = grupo.certificados || [];
                    const pendentes = grupo.pendentes || [];
                    const situacaoHistorica =
                        grupo.avaliacao?.situacaoHistorica ||
                        obterSituacaoHistoricaTreinamentosColaborador(colaborador);
                    const foraControleOperacional = Boolean(situacaoHistorica);
                    const grupoKey = String(colaborador?.id || colaborador?.codigoFuncionario || "sem-colaborador");
                    const grupoAberto = Boolean(gruposCertificadosAbertos[grupoKey]);
                    const indiceParGrupo = indiceGrupo % 2 === 0 ? indiceGrupo + 1 : indiceGrupo - 1;
                    const grupoPar = documentosPorColaboradorOrdenados[indiceParGrupo];
                    const colaboradorPar = grupoPar?.colaborador || {};
                    const grupoParKey = grupoPar
                        ? String(colaboradorPar?.id || colaboradorPar?.codigoFuncionario || "sem-colaborador")
                        : "";

                    const alternarGrupoTreinamentosComPar = () => {
                        setGruposCertificadosAbertos((atual) => {
                            const proximoAberto = !atual[grupoKey];

                            return {
                                ...atual,
                                [grupoKey]: proximoAberto,
                                ...(grupoParKey ? { [grupoParKey]: proximoAberto } : {}),
                            };
                        });
                    };

                    const resumoStatus = foraControleOperacional
                        ? { emDia: 0, aVencer: 0, vencidos: 0 }
                        : certificados.reduce(
                            (acc, certificado) => {
                                const valores = valoresRevisao(certificado);
                                const status = statusDocumento(
                                    valores.vencimento || certificado.vencimento,
                                    treinamentoSemValidade(certificado.treinamentoId)
                                );

                                if (status.chave === "vencido") acc.vencidos += 1;
                                else if (status.chave === "vencendo") acc.aVencer += 1;
                                else acc.emDia += 1;

                                return acc;
                            },
                            { emDia: 0, aVencer: 0, vencidos: 0 }
                        );

                    const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
                        <div
                            key={grupoKey}
                            className="treinamentos-base-certificados-card__colaborador rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        >
                                                        <div
                                role={!grupoAberto ? "button" : undefined}
                                tabIndex={!grupoAberto ? 0 : undefined}
                                onClick={(evento) => {

                                    const alvoInterativo = evento.target.closest?.(
                                        "button, a, input, select, textarea, label, [data-base-certificados-acao]"
                                    );

                                    if (alvoInterativo) return;

                                    alternarGrupoTreinamentosComPar();
                                }}
                                onKeyDown={(evento) => {
                                        if (evento.key !== "Enter" && evento.key !== " ") return;

                                    evento.preventDefault();
                                    alternarGrupoTreinamentosComPar();
                                }}
                                className={classNames(
                                    "treinamentos-base-certificados-card__cabecalho-colaborador flex flex-col justify-between gap-4 lg:flex-row lg:items-start",
                                    !grupoAberto && "treinamentos-base-certificados-card__cabecalho-colaborador--clicavel"
                                )}
                            >
                                <div className="flex min-w-0 items-start gap-3">
                                    <FotoColaboradorBase colaborador={colaborador} />

                                    <div className="min-w-0">
                                        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Colaborador</p>
                                        <p className="mt-1 break-words text-lg font-bold leading-snug text-slate-950">
                                            {colaborador.nome}
                                        </p>
                                        <p
                                            className="mt-1 max-w-full truncate text-sm text-slate-500"
                                            title={
                                                String(
                                                    colaborador.empresaExibicao ||
                                                    colaborador.empresa_exibicao ||
                                                    colaborador.empresaNome ||
                                                    colaborador.empresa_nome ||
                                                    colaborador.empresa ||
                                                    "Empresa não informada"
                                                )
                                            }
                                        >
                                            {obterRotuloEmpresaCompactoBaseCertificados(
                                                colaborador
                                            )}
                                        </p>
                                        <p className="mt-1 break-words text-xs font-semibold text-slate-600">
                                            Função: {colaborador.funcao || colaborador.cargo || "Não informada"}
                                        </p>
                                        <p className="mt-1 text-xs font-semibold text-slate-500">
                                            Código: {colaborador.codigoFuncionario}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-2 lg:min-w-[360px] lg:items-end">
                                    <div className="flex flex-wrap gap-2 lg:flex-nowrap lg:justify-end">
                                        <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                            {certificados.length} certificado(s)
                                        </span>

                                        {foraControleOperacional && (
                                            <span
                                                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-300"
                                                title="Certificados mantidos para consulta histórica, fora de pendências, vencimentos e alertas operacionais."
                                            >
                                                Histórico · {situacaoHistorica}
                                            </span>
                                        )}

                                        {pendentes.length > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                                                {pendentes.length} faltando
                                            </span>
                                        )}

                                        {resumoStatus.emDia > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                                {resumoStatus.emDia} em dia
                                            </span>
                                        )}

                                        {resumoStatus.aVencer > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">
                                                {resumoStatus.aVencer} a vencer
                                            </span>
                                        )}

                                        {resumoStatus.vencidos > 0 && (
                                            <span className="whitespace-nowrap rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                                {resumoStatus.vencidos} vencido(s)
                                            </span>
                                        )}
                                    </div>
                                    <div className="treinamentos-base-certificados-card__acoes-colaborador flex flex-wrap justify-end gap-2">
                                        {grupoAberto && pendentes.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => enviarDocumentosPendentesEmLote?.(colaborador)}
                                                className="treinamentos-base-certificados-card__acao-lote inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                            >
                                                <Upload className="h-4 w-4" />
                                                Enviar documentos em massa
                                            </button>
                                        )}

                                        <button
                                            type="button"
                                            onClick={alternarGrupoTreinamentosComPar}
                                            className="treinamentos-base-certificados-card__acao-treinamentos inline-flex min-w-[220px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 py-2.5 text-xs font-semibold text-white hover:bg-slate-800"
                                        >
                                            {grupoAberto ? (
                                                <>
                                                    <ChevronUp className="h-4 w-4" />
                                                    Recolher treinamentos
                                                </>
                                            ) : (
                                                <>
                                                    <ChevronDown className="h-4 w-4" />
                                                    Ver treinamentos
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {grupoAberto && (
                                <div className="treinamentos-base-certificados-card__detalhes mt-4 space-y-3 border-t border-slate-100 pt-4">
                                    {pendentes.length > 0 && (
                                        <div className="treinamentos-base-certificados-card__pendentes rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-3">
                                            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                                <div>
                                                    <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                                                        Documentos faltantes para envio
                                                    </p>
                                                    <p className="mt-1 text-[11px] text-blue-700">
                                                        Clique em enviar para preencher automaticamente o colaborador e o treinamento no lançamento.
                                                    </p>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
<span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-200">


                                                        {pendentes.length} pendente(s)


                                                    </span>


                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                {pendentes.map((item) => (
                                                    <div
                                                        key={`pendente-${grupoKey}-${item.treinamento.id}`}
                                                        className="treinamentos-base-certificados-card__pendente-item flex flex-col justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-blue-100 lg:flex-row lg:items-center"
                                                    >
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 ring-1 ring-blue-200">
                                                                    Pendente
                                                                </span>
                                                                <p className="break-words text-sm font-semibold text-slate-800">
                                                                    {item.treinamento.nome}
                                                                </p>
                                                            </div>
                                                            <p className="mt-1 text-[11px] text-slate-500">
                                                                Documento ainda não enviado para este colaborador.
                                                            </p>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={() => enviarDocumentoPendente(colaborador, item.treinamento)}
                                                            className="treinamentos-base-certificados-card__acao-documento inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
                                                        >
                                                            <Upload className="h-4 w-4" />
                                                            Enviar documento
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {certificados.length === 0 && pendentes.length === 0 && (
                                        <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
                                            Nenhum item encontrado para este colaborador com o filtro atual.
                                        </div>
                                    )}

                                    {certificados.map((d, idx) => {
                                        const valoresBase = valoresRevisao(d);

                                        const datasAtualizadas = datasCertificadosAtualizadas[String(d.id || "")] || {};

                                        const valores = {

                                            ...valoresBase,

                                            realizado: Object.prototype.hasOwnProperty.call(datasAtualizadas, "realizado") ? datasAtualizadas.realizado : valoresBase.realizado,

                                            vencimento: Object.prototype.hasOwnProperty.call(datasAtualizadas, "vencimento") ? datasAtualizadas.vencimento : valoresBase.vencimento,

                                        };
                                        const semValidade = treinamentoSemValidade(d.treinamentoId);
                                        const nomeTreinamentoAtual = String(d?.treinamento?.nome || "");
                                        const ehFichaRegistro = /ficha\s+(de\s+)?registro|registro\s+clt|\bclt\b|e\s*social|\besocial\b/i.test(nomeTreinamentoAtual);
                                        const ehFichaEpi = /nr\s*-?\s*0?6|ficha\s+(de\s+)?epi|epis\s+atualizada|controle\s+de\s+entrega\s+de\s+epi|entrega\s+de\s+epi|equipamento\s+de\s+prote[cç][aã]o\s+individual/i.test(nomeTreinamentoAtual);
                                        const rotuloDataPrincipal = ehFichaRegistro
                                            ? "Admiss\u00e3o / Registro"
                                            : ehFichaEpi
                                                ? "Entrega / Atualiza\u00e7\u00e3o"
                                                : "Realiza\u00e7\u00e3o";
                                        const statusAtual = statusDocumento(valores.vencimento || d.vencimento, semValidade);
                                        const itemKey = String(d.id || `${d.colaborador.id}-${d.treinamentoId}-${idx}`);
                                        const aberto = Boolean(certificadosAbertos[itemKey]);

                                        const obterValorDataRevisaoFormulario = (itemKey, campo, valorIso) => {
        const chave = `${itemKey}:${campo}`;

        if (Object.prototype.hasOwnProperty.call(datasDigitadasRevisao, chave)) {
            return datasDigitadasRevisao[chave];
        }

        return formatarDataBrFormularioCertificado(valorIso);
    };

    const alterarDataRevisaoFormulario = (documento, itemKey, campo, valorDigitado) => {
        const chave = `${itemKey}:${campo}`;
        const valorMascarado = aplicarMascaraDataBrFormularioCertificado(valorDigitado);

        setDatasDigitadasRevisao((atual) => ({
            ...atual,
            [chave]: valorMascarado,
        }));

        if (!valorMascarado) {
            alterarDataRevisao(documento, campo, "");
            return;
        }

        const valorIso = converterDataBrFormularioCertificadoParaIso(valorMascarado);

        if (valorIso) {
            alterarDataRevisao(documento, campo, valorIso);
        }
    };

    return (
                                            <div
                                                key={itemKey}
                                                className="treinamentos-base-certificados-card__certificado rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100"
                                            >
                                                <div className="grid gap-3 lg:grid-cols-[1fr_240px] lg:items-start">
                                                    <div className="min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <StatusPill status={statusAtual} small />
                                                            <h3 className="break-words text-base font-bold leading-snug text-slate-900">
                                                                {d.treinamento.nome}
                                                            </h3>
                                                        </div>

                                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                                                            <FileText className="h-4 w-4 text-slate-400" />
                                                            <span className="break-words">{d.arquivo || "Arquivo não informado"}</span>
                                                        </div>

                                                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotuloDataPrincipal}</p>
                                                                <p className="text-xs font-semibold text-slate-700">{formatDate(valores.realizado)}</p>
                                                            </div>

                                                            <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-100">
                                                                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                <p className="text-xs font-semibold text-slate-700">
                                                                    {semValidade ? "Sem validade" : formatDate(valores.vencimento)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="treinamentos-certificados-acoes-documento">
                                                    <div className="treinamentos-certificados-acoes-documento__linha-superior">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setCertificadosAbertos((atual) => ({
                                                                    ...atual,
                                                                    [itemKey]: !atual[itemKey],
                                                                }))
                                                            }
                                                            className="treinamentos-certificados-acao treinamentos-certificados-acao--rever bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                        >
                                                            {aberto ? (
                                                                <>
                                                                    <ChevronUp className="h-4 w-4" />
                                                                    Ocultar data
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <ChevronDown className="h-4 w-4" />
                                                                    Alterar data
                                                                </>
                                                            )}
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={(evento) => {
                                                                evento.stopPropagation();
                                                                onAbrirHistoricoCertificado?.(d);
                                                            }}
                                                            className="treinamentos-certificados-acao treinamentos-certificados-acao--historico bg-white text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                                                            aria-label={`Histórico de versões de ${d?.treinamento?.nome || "documento"}`}
                                                            title="Histórico de versões"
                                                        >
                                                            <History className="h-4 w-4" />
                                                            <span>Histórico</span>
                                                        </button>
                                                    </div>

                                                    <button
                                                        onClick={() => onVisualizarCertificado(d)}
                                                        className="treinamentos-certificados-acao treinamentos-certificados-acao--abrir bg-slate-950 text-white hover:bg-slate-800"
                                                    >
                                                        Abrir documento
                                                    </button>

                                                    <button
                                                        onClick={() => onExcluirCertificado(d)}
                                                        className="treinamentos-certificados-acao treinamentos-certificados-acao--excluir bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100"
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                                </div>

                                                <div className="mt-3">
                                                    <VerificacaoCertificadoTreinamento certificado={d} />
                                                </div>

                                                {aberto && (
                                                    <div className="treinamentos-base-certificados-card__revisao mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
                                                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_auto] xl:items-end">
                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{rotuloDataPrincipal}</p>
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    maxLength={10}
                                                                    placeholder="dd/mm/aaaa"
                                                                    value={obterValorDataRevisaoFormulario(itemKey, "realizado", valores.realizado)}
                                                                    onChange={(e) => alterarDataRevisaoFormulario(d, itemKey, "realizado", e.target.value)}
                                                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                />
                                                            </div>

                                                            <div>
                                                                <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Vencimento</p>
                                                                {semValidade ? (
                                                                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">
                                                                        Sem validade
                                                                    </div>
                                                                ) : (
                                                                    <input
                                                                        type="text"
                                                                        inputMode="numeric"
                                                                        maxLength={10}
                                                                        placeholder="dd/mm/aaaa"
                                                                        value={obterValorDataRevisaoFormulario(itemKey, "vencimento", valores.vencimento)}
                                                                        onChange={(e) => alterarDataRevisaoFormulario(d, itemKey, "vencimento", e.target.value)}
                                                                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-200"
                                                                    />
                                                                )}
                                                            </div>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const chaveRealizado = `${itemKey}:realizado`;
                                                                    const chaveVencimento = `${itemKey}:vencimento`;
                                                                    const realizadoDigitado = datasDigitadasRevisao[chaveRealizado] || "";
                                                                    const vencimentoDigitado = datasDigitadasRevisao[chaveVencimento] || "";

                                                                    const realizadoIso = realizadoDigitado
                                                                        ? converterDataBrFormularioCertificadoParaIso(realizadoDigitado)
                                                                        : valores.realizado || "";

                                                                    const vencimentoIso = semValidade
                                                                        ? ""
                                                                        : (vencimentoDigitado
                                                                            ? converterDataBrFormularioCertificadoParaIso(vencimentoDigitado)
                                                                            : valores.vencimento || "");

                                                                    if (realizadoDigitado && !realizadoIso) {
                                                                        alert("Data de admissão/registro inválida. Use o formato dd/mm/aaaa.");
                                                                        return;
                                                                    }

                                                                    if (!semValidade && vencimentoDigitado && !vencimentoIso) {
                                                                        alert("Data de vencimento inválida. Use o formato dd/mm/aaaa.");
                                                                        return;
                                                                    }

                                                                    const documentoAtualizado = {
                                                                        ...d,
                                                                        realizado: realizadoIso,
                                                                        dataRealizacao: realizadoIso,
                                                                        data_realizacao: realizadoIso,
                                                                        vencimento: vencimentoIso || "",
                                                                        dataVencimento: vencimentoIso || "",
                                                                        data_vencimento: vencimentoIso || "",
                                                                    };

                                                                    alterarDataRevisao(d, "realizado", realizadoIso);
                                                                    alterarDataRevisao(d, "vencimento", vencimentoIso || "");

                                                                    setDatasCertificadosAtualizadas((atual) => ({
                                                                        ...atual,
                                                                        [String(d.id || "")]: {
                                                                            realizado: realizadoIso,
                                                                            vencimento: vencimentoIso || "",
                                                                        },
                                                                    }));

                                                                    setTimeout(() => {
                                                                        salvarDatasCertificado(documentoAtualizado);
                                                                    }, 0);
                                                                }}
                                                                disabled={salvandoDatasId === d.id}
                                                                className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 ring-1 ring-blue-200 hover:bg-blue-100 disabled:opacity-60"
                                                            >
                                                                {salvandoDatasId === d.id ? "Salvando..." : "Salvar datas"}
                                                            </button>
                                                        </div>

                                                        <p className="mt-3 text-xs leading-relaxed text-slate-400">
                                                            {semValidade
                                                                ? "Este documento não possui validade. Ao revisar, somente a data de realização/emissão será atualizada."
                                                                : "Ao alterar a realização, o vencimento é recalculado automaticamente pela validade do treinamento."}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            )}
        </Card>
    );
}
