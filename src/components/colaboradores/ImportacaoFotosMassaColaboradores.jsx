import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, ImagePlus, Loader2, Trash2, Upload, XCircle } from "lucide-react";
import { Card } from "../commonComponents";
import { classNames } from "../../utils/sstUtils";

const EXTENSOES_IMAGEM_PERMITIDAS = ["jpg", "jpeg", "png", "webp"];

function removerExtensao(nomeArquivo = "") {
    return String(nomeArquivo || "").replace(/\.[^.]+$/, "");
}

function obterExtensao(nomeArquivo = "") {
    return String(nomeArquivo || "").split(".").pop()?.toLowerCase() || "";
}

function apenasDigitos(valor = "") {
    return String(valor || "").replace(/\D/g, "");
}

function normalizarChaveTexto(valor = "") {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ")
        .toUpperCase();
}

function normalizarChaveCompacta(valor = "") {
    return normalizarChaveTexto(valor).replace(/\s+/g, "");
}

function criarAssinaturaColaborador(colaborador = {}) {
    const cpf = apenasDigitos(colaborador.cpf || colaborador.cpfFormatado || "");
    const matricula = normalizarChaveTexto(colaborador.matriculaEsocial || colaborador.matricula || "");
    const codigo = normalizarChaveTexto(colaborador.codigoFuncionario || colaborador.codigo_funcionario || "");
    const nome = normalizarChaveTexto(colaborador.nome || "");

    return {
        cpf,
        matricula,
        matriculaCompacta: normalizarChaveCompacta(colaborador.matriculaEsocial || colaborador.matricula || ""),
        codigo,
        codigoCompacto: normalizarChaveCompacta(colaborador.codigoFuncionario || colaborador.codigo_funcionario || ""),
        nome,
        nomeCompacto: normalizarChaveCompacta(colaborador.nome || ""),
    };
}

function criarMapaColaboradores(colaboradores = []) {
    return (colaboradores || []).map((colaborador) => ({
        colaborador,
        assinatura: criarAssinaturaColaborador(colaborador),
    }));
}

function localizarColaboradorPorArquivo(arquivo, mapaColaboradores = []) {
    const nomeBase = removerExtensao(arquivo?.name || "");
    const nomeTexto = normalizarChaveTexto(nomeBase);
    const nomeCompacto = normalizarChaveCompacta(nomeBase);
    const digitosArquivo = apenasDigitos(nomeBase);

    const tentar = (criterio, prioridade) => {
        const encontrados = mapaColaboradores
            .filter(({ assinatura }) => criterio(assinatura))
            .map(({ colaborador }) => colaborador);

        if (encontrados.length === 1) {
            return {
                status: "valido",
                colaborador: encontrados[0],
                criterio: prioridade,
                mensagem: "Foto pronta para envio.",
            };
        }

        if (encontrados.length > 1) {
            return {
                status: "erro",
                colaborador: null,
                criterio: prioridade,
                mensagem: `Mais de um colaborador encontrado por ${prioridade}. Renomeie a foto com CPF, matrícula ou código.`,
            };
        }

        return null;
    };

    if (digitosArquivo.length >= 11) {
        const porCpf = tentar((assinatura) => assinatura.cpf && digitosArquivo.includes(assinatura.cpf), "CPF");
        if (porCpf) return porCpf;
    }

    const porMatricula = tentar(
        (assinatura) => assinatura.matricula && (assinatura.matricula === nomeTexto || assinatura.matriculaCompacta === nomeCompacto),
        "matrícula eSocial"
    );
    if (porMatricula) return porMatricula;

    const porCodigo = tentar(
        (assinatura) => assinatura.codigo && (assinatura.codigo === nomeTexto || assinatura.codigoCompacto === nomeCompacto),
        "código do sistema"
    );
    if (porCodigo) return porCodigo;

    const porNome = tentar(
        (assinatura) => assinatura.nome && (assinatura.nome === nomeTexto || assinatura.nomeCompacto === nomeCompacto),
        "nome"
    );
    if (porNome) return porNome;

    return {
        status: "erro",
        colaborador: null,
        criterio: "sem correspondência",
        mensagem: "Nenhum colaborador encontrado para o nome deste arquivo.",
    };
}

function analisarFotosSelecionadas(arquivos = [], colaboradores = []) {
    const mapaColaboradores = criarMapaColaboradores(colaboradores);
    const resultadosBase = Array.from(arquivos || []).map((arquivo, indice) => {
        const extensao = obterExtensao(arquivo.name);
        const ehImagem = EXTENSOES_IMAGEM_PERMITIDAS.includes(extensao) && String(arquivo.type || "image/").toLowerCase().startsWith("image/");

        if (!ehImagem) {
            return {
                id: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${indice}`,
                arquivo,
                previewUrl: URL.createObjectURL(arquivo),
                status: "erro",
                colaborador: null,
                criterio: "formato",
                mensagem: "Formato inválido. Use JPG, JPEG, PNG ou WEBP.",
            };
        }

        const resultado = localizarColaboradorPorArquivo(arquivo, mapaColaboradores);

        return {
            id: `${arquivo.name}-${arquivo.size}-${arquivo.lastModified}-${indice}`,
            arquivo,
            previewUrl: URL.createObjectURL(arquivo),
            ...resultado,
        };
    });

    const porColaborador = resultadosBase.reduce((acc, item) => {
        if (item.status === "valido" && item.colaborador?.id) {
            const chave = String(item.colaborador.id);
            if (!acc[chave]) acc[chave] = [];
            acc[chave].push(item);
        }
        return acc;
    }, {});

    return resultadosBase.map((item) => {
        if (item.status === "valido" && item.colaborador?.id && porColaborador[String(item.colaborador.id)]?.length > 1) {
            return {
                ...item,
                status: "erro",
                mensagem: "Mais de uma foto foi selecionada para este colaborador. Deixe apenas uma imagem.",
            };
        }

        return item;
    });
}

export function ImportacaoFotosMassaColaboradores({
    colaboradores = [],
    podeEnviar = true,
    mensagemBloqueio = "Sem permissão para enviar fotos de colaboradores.",
    onEnviarFotos,
    enviando = false,
}) {
    const inputRef = useRef(null);
    const [resultados, setResultados] = useState([]);
    const [resultadoEnvio, setResultadoEnvio] = useState(null);

    useEffect(() => {
        return () => {
            resultados.forEach((item) => {
                if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
            });
        };
    }, [resultados]);

    const resumo = useMemo(() => {
        const total = resultados.length;
        const validos = resultados.filter((item) => item.status === "valido").length;
        const erros = resultados.filter((item) => item.status !== "valido").length;
        const comFotoAtual = resultados.filter((item) => item.status === "valido" && (item.colaborador?.fotoUrl || item.colaborador?.foto_url)).length;

        return { total, validos, erros, comFotoAtual };
    }, [resultados]);

    const limparSelecao = () => {
        resultados.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        setResultados([]);
        setResultadoEnvio(null);
        if (inputRef.current) inputRef.current.value = "";
    };

    const selecionarFotos = (evento) => {
        const arquivos = Array.from(evento.target.files || []);
        resultados.forEach((item) => {
            if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        setResultadoEnvio(null);
        setResultados(analisarFotosSelecionadas(arquivos, colaboradores));
    };

    const enviarValidas = async () => {
        if (!podeEnviar) {
            if (typeof window !== "undefined") window.alert(mensagemBloqueio);
            return;
        }

        const validas = resultados.filter((item) => item.status === "valido");

        if (validas.length === 0) {
            if (typeof window !== "undefined") window.alert("Nenhuma foto válida para enviar.");
            return;
        }

        const confirmado = typeof window === "undefined" || window.confirm(
            `Enviar ${validas.length} foto(s) e atualizar os colaboradores correspondentes?\n\nFotos atuais serão substituídas quando já existir imagem cadastrada.`
        );

        if (!confirmado) return;

        const retorno = await onEnviarFotos?.(validas.map((item) => ({
            colaborador: item.colaborador,
            arquivo: item.arquivo,
            criterio: item.criterio,
        })));

        setResultadoEnvio(retorno || null);
    };

    return (
        <Card className="border-sky-100 bg-sky-50/40">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                    <div className="flex items-start gap-3">
                        <div className="rounded-2xl bg-slate-950 p-3 text-white shadow-sm">
                            <Camera className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs font-black uppercase tracking-wide text-sky-700">Fotos em massa</p>
                            <h2 className="mt-1 text-xl font-black text-slate-950">Enviar fotos dos colaboradores</h2>
                            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-600">
                                Importe várias imagens nomeadas por CPF, matrícula eSocial, código ou nome completo.
                            </p>
                        </div>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500">
                        Ex.: <span className="font-black text-slate-900">40269348883.jpg</span>, <span className="font-black text-slate-900">TESTE001.png</span> ou <span className="font-black text-slate-900">RODOLFO HENRIQUE.jpg</span>.
                    </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0">
                    <input
                        ref={inputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        multiple
                        className="hidden"
                        onChange={selecionarFotos}
                    />
                    <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        disabled={!podeEnviar || enviando}
                        title={podeEnviar ? "Selecionar fotos" : mensagemBloqueio}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-black uppercase tracking-wide text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                    >
                        <ImagePlus className="h-4 w-4" />
                        Selecionar fotos
                    </button>

                    {resultados.length > 0 && (
                        <button
                            type="button"
                            onClick={limparSelecao}
                            disabled={enviando}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <Trash2 className="h-4 w-4" />
                            Limpar
                        </button>
                    )}
                </div>
            </div>

            {resultados.length > 0 && (
                <div className="mt-5 space-y-4">
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="rounded-2xl bg-white p-3 text-center ring-1 ring-slate-200">
                            <p className="text-xs font-bold text-slate-500">Fotos lidas</p>
                            <p className="text-2xl font-black text-slate-950">{resumo.total}</p>
                        </div>
                        <div className="rounded-2xl bg-emerald-50 p-3 text-center ring-1 ring-emerald-100">
                            <p className="text-xs font-bold text-emerald-700">Válidas</p>
                            <p className="text-2xl font-black text-emerald-700">{resumo.validos}</p>
                        </div>
                        <div className="rounded-2xl bg-red-50 p-3 text-center ring-1 ring-red-100">
                            <p className="text-xs font-bold text-red-700">Com erro</p>
                            <p className="text-2xl font-black text-red-700">{resumo.erros}</p>
                        </div>
                        <div className="rounded-2xl bg-amber-50 p-3 text-center ring-1 ring-amber-100">
                            <p className="text-xs font-bold text-amber-700">Substituições</p>
                            <p className="text-2xl font-black text-amber-700">{resumo.comFotoAtual}</p>
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="max-h-[420px] overflow-auto">
                            <table className="min-w-full divide-y divide-slate-100 text-sm">
                                <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                    <tr>
                                        <th className="px-3 py-3 text-left">Foto</th>
                                        <th className="px-3 py-3 text-left">Arquivo</th>
                                        <th className="px-3 py-3 text-left">Colaborador</th>
                                        <th className="px-3 py-3 text-left">Critério</th>
                                        <th className="px-3 py-3 text-left">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {resultados.map((item) => (
                                        <tr key={item.id} className="align-top">
                                            <td className="px-3 py-3">
                                                <img
                                                    src={item.previewUrl}
                                                    alt="Prévia"
                                                    className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-200"
                                                />
                                            </td>
                                            <td className="max-w-[220px] px-3 py-3">
                                                <p className="break-words font-black text-slate-900">{item.arquivo.name}</p>
                                                <p className="mt-1 text-xs font-semibold text-slate-400">{Math.max(1, Math.round(item.arquivo.size / 1024))} KB</p>
                                            </td>
                                            <td className="px-3 py-3">
                                                {item.colaborador ? (
                                                    <div>
                                                        <p className="font-black text-slate-950">{item.colaborador.nome}</p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500">{item.colaborador.empresaExibicao || item.colaborador.empresa || "Empresa não informada"}</p>
                                                        {(item.colaborador.fotoUrl || item.colaborador.foto_url) && (
                                                            <p className="mt-1 text-xs font-black text-amber-700">Já possui foto cadastrada</p>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-slate-400">Não encontrado</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-xs font-black uppercase tracking-wide text-slate-500">{item.criterio}</td>
                                            <td className="px-3 py-3">
                                                <div
                                                    className={classNames(
                                                        "inline-flex items-start gap-2 rounded-2xl px-3 py-2 text-xs font-black",
                                                        item.status === "valido"
                                                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100"
                                                            : "bg-red-50 text-red-700 ring-1 ring-red-100"
                                                    )}
                                                >
                                                    {item.status === "valido" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                                    <span>{item.mensagem}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {resumo.erros > 0 && (
                        <div className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-100">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            Corrija os arquivos com erro antes de enviar. Somente fotos válidas serão processadas.
                        </div>
                    )}

                    {resultadoEnvio && (
                        <div className="rounded-2xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                            Envio concluído: <strong>{resultadoEnvio.sucesso || 0}</strong> foto(s) enviada(s)
                            {resultadoEnvio.erros?.length ? `, ${resultadoEnvio.erros.length} erro(s).` : "."}
                        </div>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={enviarValidas}
                            disabled={!podeEnviar || enviando || resumo.validos === 0}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-700 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
                        >
                            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                            {enviando ? "Enviando fotos..." : `Enviar ${resumo.validos} foto(s) válida(s)`}
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}
