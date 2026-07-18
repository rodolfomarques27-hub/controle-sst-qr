import React from "react";
import { gerarCodigoFuncionario } from "../../services/colaboradorDocumentosService";

const textoSeguro = (valor = "") => String(valor ?? "").trim();

const DIAS_SEMANA_DDS_PUBLICO = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado",
];


function normalizarArray(valor) {
    if (Array.isArray(valor)) return valor;

    if (typeof valor === "string") {
        try {
            const convertido = JSON.parse(valor);
            return Array.isArray(convertido) ? convertido : [];
        } catch {
            return [];
        }
    }

    return [];
}

function pegarPrimeiro(...valores) {
    return valores.find((valor) => textoSeguro(valor)) ?? "";
}
function normalizarTextoBuscaDdsPublico(valor = "") {
    return textoSeguro(valor)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function ehDiaSemAtividadeDdsPublico(dia = {}, tema = "") {
    const textoTema = normalizarTextoBuscaDdsPublico(tema || dia?.tema || dia?.assunto);
    const textoStatus = normalizarTextoBuscaDdsPublico(dia?.status || dia?.situacao || "");

    return Boolean(dia?.semAtividade) ||
        textoTema.includes("NAO HOUVE ATIVIDADE") ||
        textoTema.includes("NAO HOUVE ATIVIDADES") ||
        textoStatus.includes("NAO HOUVE ATIVIDADE") ||
        textoStatus.includes("SEM ATIVIDADE");
}

function formatarDataPublica(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) return "-";

    const partesIso = texto.slice(0, 10).split("-");

    if (partesIso.length === 3 && partesIso[0].length === 4) {
        return `${partesIso[2]}/${partesIso[1]}/${partesIso[0]}`;
    }

    return texto;
}

function formatarDataHoraPublica(valor = "") {
    const texto = textoSeguro(valor);

    if (!texto) return "-";

    const data = new Date(texto);

    if (Number.isNaN(data.getTime())) return texto;

    return new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
    }).format(data);
}

function textoDaOrientacao(item) {
    if (typeof item === "string") return textoSeguro(item);

    return textoSeguro(item?.texto || item?.descricao || item?.orientacao || item?.titulo);
}

function textoDoAniversariante(item) {
    if (typeof item === "string") return textoSeguro(item);

    const nome = textoSeguro(item?.nome || item?.colaborador || item?.nomeColaborador);
    const data = formatarDataPublica(item?.data || item?.nascimento || item?.dataNascimento || "");

    if (nome && data !== "-") return `${nome} — ${data}`;
    return nome || data;
}

function nomeParticipante(item) {
    if (typeof item === "string") return textoSeguro(item);

    return textoSeguro(item?.nome || item?.colaborador || item?.nomeColaborador || item?.nome_completo);
}

function funcaoParticipante(item) {
    if (!item || typeof item === "string") return "";

    return textoSeguro(item?.funcao || item?.cargo || item?.atividade);
}
function empresaParticipante(item) {
    if (!item || typeof item === "string") return "";

    return textoSeguro(
        item?.empresa ||
        item?.empresaNome ||
        item?.nomeEmpresa ||
        item?.razaoSocialEmpresa ||
        item?.empresa_nome
    );
}

function codigoSafescanParticipante(item) {
    if (!item || typeof item === "string") return "";

    const codigoExistente = textoSeguro(
        item?.codigoFuncionario ||
        item?.codigo_funcionario ||
        item?.codigoSafescan ||
        item?.codigoSafeScan ||
        item?.codigo_safescan ||
        item?.codigo ||
        item?.matricula_esocial ||
        item?.matriculaEsocial ||
        item?.matricula ||
        item?.id
    );

    if (codigoExistente) return codigoExistente;

    const nome = nomeParticipante(item);
    return nome ? gerarCodigoFuncionario(nome) : "";
}

function normalizarLogoDdsPublico(item) {
    if (!item) return null;

    if (typeof item === "string") {
        const logoUrl = textoSeguro(item);
        return logoUrl ? { logoUrl, nome: "Logo da empresa" } : null;
    }

    const logoUrl = textoSeguro(
        item.logoUrl ||
        item.logo_url ||
        item.empresaLogoUrl ||
        item.contratanteLogoUrl ||
        item.url ||
        item.src ||
        ""
    );

    if (!logoUrl) return null;

    return {
        logoUrl,
        nome: textoSeguro(item.nome || item.empresa || item.razaoSocial || item.label || "Logo da empresa"),
    };
}

function obterLogosCabecalhoDdsPublico(dados = {}, dadosRegistro = {}) {
    const logos = [];

    const adicionarLogo = (item) => {
        const logo = normalizarLogoDdsPublico(item);
        if (!logo) return;

        const jaExiste = logos.some(
            (existente) => existente.logoUrl === logo.logoUrl
        );

        if (!jaExiste) {
            logos.push(logo);
        }
    };

    [
        {
            logoUrl:
                dados.contratanteLogoUrl ||
                dadosRegistro.contratanteLogoUrl,
            nome:
                dados.contratanteLogoNome ||
                dadosRegistro.contratanteLogoNome ||
                "Idealiza",
        },
        {
            logoUrl:
                dados.empresaLogoUrl ||
                dadosRegistro.empresaLogoUrl,
            nome:
                dados.empresaLogoNome ||
                dadosRegistro.empresaLogoNome ||
                dados.empresa ||
                dadosRegistro.empresa ||
                "Empresa vinculada",
        },
    ].forEach(adicionarLogo);

    const listas = [
        dados.logosEmpresasCabecalho,
        dadosRegistro.logosEmpresasCabecalho,
        dados.logosCabecalho,
        dadosRegistro.logosCabecalho,
        dados.logos,
        dadosRegistro.logos,
    ];

    listas.forEach((lista) => {
        if (logos.length >= 2) return;

        normalizarArray(lista).forEach((item) => {
            if (logos.length >= 2) return;
            adicionarLogo(item);
        });
    });

    return logos.slice(0, 2);
}

function LogosCabecalhoDdsPublico({ logos = [], empresa = "" }) {
    const logosValidos = normalizarArray(logos)
        .map(normalizarLogoDdsPublico)
        .filter(Boolean);

    if (logosValidos.length === 0) {
        return (
            <div className="flex h-full min-h-[64px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">
                        Empresas vinculadas
                    </p>
                    <p className="mt-1 text-[13px] font-black uppercase leading-tight text-slate-900">
                        {empresa || "Logo não disponível no QR"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-[64px] items-center justify-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-2">
            {logosValidos.map((logo, indice) => (
                <img
                    key={`${logo.logoUrl}-${indice}`}
                    src={logo.logoUrl}
                    alt={logo.nome || "Logo da empresa"}
                    className="max-h-12 max-w-[82px] object-contain"
                    loading="lazy"
                />
            ))}
        </div>
    );
}
function StatusDocumento({ ok, status }) {
    const statusSeguro = textoSeguro(status) || (ok ? "Ativo" : "Inválido");

    return (
        <div className={`rounded-full px-3 py-1.5 text-center text-[10px] font-black uppercase tracking-[0.18em] shadow-sm ring-1 ${
            ok
                ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
                : "bg-red-50 text-red-800 ring-red-200"
        }`}>
            {statusSeguro}
        </div>
    );
}

function CelulaInfo({ rotulo, valor, className = "" }) {
    return (
        <div className={`border border-slate-200 bg-white px-3 py-2 ${className}`}>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500/90">
                {rotulo}
            </p>
            <p className="mt-1 min-h-[16px] text-[12px] font-black leading-snug text-slate-900">
                {valor || "-"}
            </p>
        </div>
    );
}

function BlocoInferior({ titulo, children }) {
    return (
        <section className="flex min-h-[150px] flex-col rounded-xl border border-slate-300 bg-white p-3 shadow-sm shadow-slate-200/70">
            <h3 className="border-b border-slate-200 pb-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-800">
                {titulo}
            </h3>
            <div
                className="mt-2 flex-1 px-1 text-[11px] font-semibold leading-[24px] text-slate-700"
                style={{
                    backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 23px, rgba(148, 163, 184, 0.45) 24px)",
                    backgroundSize: "100% 24px",
                    backgroundRepeat: "repeat",
                }}
            >
                {children}
            </div>
        </section>
    );
}

export function ConsultaDdsPublica({ dados = {} }) {
    const dadosRegistro = dados?.dados && typeof dados.dados === "object" ? dados.dados : {};
    const autenticidade = dados.autenticidade || {};
    const ok = dados.ok !== false;

    const codigo = pegarPrimeiro(dados.codigo, dadosRegistro.codigo);
    const empresa = pegarPrimeiro(dados.empresa, dados.empresaNome, dadosRegistro.empresa, dadosRegistro.empresaNome);
    const obra = pegarPrimeiro(dados.obra, dados.obraNome, dadosRegistro.obra, dadosRegistro.obraNome);
    const responsavel = pegarPrimeiro(dados.responsavel, dados.responsavelNome, dadosRegistro.responsavel, dadosRegistro.responsavelNome);
    const fiscalIdealiza = pegarPrimeiro(dados.fiscalIdealiza, dados.fiscal_idealiza, dadosRegistro.fiscalIdealiza);
    const liderEncarregado = pegarPrimeiro(dados.liderEncarregado, dados.lider_encarregado, dadosRegistro.liderEncarregado);
    const tipo = pegarPrimeiro(dados.tipo, dadosRegistro.tipo, "DDS");
    const turno = pegarPrimeiro(dados.turno, dadosRegistro.turno);
    const status = pegarPrimeiro(dados.status, ok ? "Ativo" : "Inválido");

    const periodoInicio = pegarPrimeiro(dados.periodoInicio, dados.periodo_inicio, dadosRegistro.periodoInicio);
    const periodoFim = pegarPrimeiro(dados.periodoFim, dados.periodo_fim, dadosRegistro.periodoFim);
    const periodoTexto = pegarPrimeiro(
        dados.periodo,
        dadosRegistro.periodo,
        periodoInicio || periodoFim ? `${formatarDataPublica(periodoInicio)} a ${formatarDataPublica(periodoFim)}` : ""
    );

    const diasSemana = normalizarArray(dados.diasSemana ?? dadosRegistro.diasSemana).slice(0, 7);
    const orientacoesImportantes = normalizarArray(dados.orientacoesImportantes ?? dadosRegistro.orientacoesImportantes)
        .map(textoDaOrientacao)
        .filter(Boolean);
    const aniversariantesSemana = normalizarArray(dados.aniversariantesSemana ?? dadosRegistro.aniversariantesSemana)
        .map(textoDoAniversariante)
        .filter(Boolean);
    const participantes = normalizarArray(dados.participantes ?? dadosRegistro.participantes)
        .map((participante, indice) => ({
            id: participante?.id || participante?.codigo || `participante-${indice}`,
            nome: nomeParticipante(participante),
            funcao: funcaoParticipante(participante),
            empresa: empresaParticipante(participante),
            numero: Number(participante?.numero || participante?.ordem || indice + 1),
            codigoSafescan: codigoSafescanParticipante(participante),
        }))
        .filter((participante) => participante.nome);

    const recadosSemana = textoSeguro(dados.recadosSemana ?? dadosRegistro.recadosSemana ?? dadosRegistro.recados);
    const totalParticipantes = Number(dados.totalParticipantes ?? dadosRegistro.totalParticipantes ?? participantes.length) || participantes.length;
    const totalFolhas = Number(dados.totalFolhas ?? dadosRegistro.totalFolhas ?? 1) || 1;
    const conferenciaAssistidaPublica = dadosRegistro.conferenciaAssistida || dados.conferenciaAssistida || {};
    const fechamentoPublico = conferenciaAssistidaPublica.fechamento || {};
    const reciboFinalPublico = conferenciaAssistidaPublica.reciboFinal || {};
    const resumoOficialPublico = fechamentoPublico.resumo || reciboFinalPublico.resumo || conferenciaAssistidaPublica.estatisticas || {};
    const conferenciaConcluidaPublica = fechamentoPublico.status === "concluida" || Boolean(fechamentoPublico.concluidoEm);
    const conclusaoOficialEmPublico = fechamentoPublico.concluidoEm || reciboFinalPublico.concluidoEm || "";
    const reciboEmitidoEmPublico = reciboFinalPublico.emitidoEm || "";
    const participantesOficiaisPublico = Number(resumoOficialPublico.participantes ?? resumoOficialPublico.participantesTotal ?? totalParticipantes ?? 0) || 0;
    const presencasOficiaisPublico = Number(resumoOficialPublico.presencas ?? 0) || 0;
    const ausenciasOficiaisPublico = Number(resumoOficialPublico.ausencias ?? 0) || 0;
    const homemDiaOficialPublico = Number(resumoOficialPublico.homemDia ?? 0) || 0;

    const statusAutenticidade = textoSeguro(autenticidade.status || (ok ? "Documento localizado" : "Documento não localizado"));
    const mensagemAutenticidade = textoSeguro(autenticidade.mensagem || "DDS conferido pelo QR Code e pelo registro digital.");
    const logosCabecalho = obterLogosCabecalhoDdsPublico(dados, dadosRegistro);

    const diasRender = Array.from({ length: 7 }, (_, indice) => diasSemana[indice] || {});

    return (
        <main className="min-h-screen bg-[#eef3f8] px-4 py-5 print:bg-white print:p-0">
            <div className="mx-auto max-w-[1240px] overflow-x-auto">
                <article className="mx-auto w-[1200px] overflow-hidden rounded-[22px] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.16)] ring-1 ring-slate-300 print:w-full print:rounded-none print:shadow-none print:ring-0">
                    <header className="grid grid-cols-[260px_minmax(0,1fr)_220px] gap-4 border-b border-slate-300 bg-gradient-to-r from-white via-slate-50 to-white px-5 pb-4 pt-4">
                        <LogosCabecalhoDdsPublico
                            logos={logosCabecalho}
                            empresa={empresa}
                        />

                        <div className="text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.34em] text-slate-500">
                                Consulta pública por QR Code
                            </p>
                            <h1 className="mt-1 text-[29px] font-black uppercase tracking-tight text-slate-950">
                                DDS semanal
                            </h1>
                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                                Documento registrado digitalmente e vinculado ao QR de conferência
                            </p>
                        </div>

                        <div className="space-y-2">
                            <StatusDocumento ok={ok} status={status} />
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-center shadow-sm">
                                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-500/90">
                                    Autenticidade
                                </p>
                                <p className="mt-1 text-[12px] font-black text-slate-950">
                                    {statusAutenticidade}
                                </p>
                            </div>
                        </div>
                    </header>

                    <section className="mx-5 mt-4 grid grid-cols-4 overflow-hidden rounded-xl border border-slate-300 shadow-sm">
                        <CelulaInfo rotulo="Código do DDS" valor={codigo} />
                        <CelulaInfo rotulo="Período" valor={periodoTexto} />
                        <CelulaInfo rotulo="Empresa" valor={empresa} />
                        <CelulaInfo rotulo="Obra / Setor" valor={obra || "Não definido"} />

                        <CelulaInfo rotulo="Responsável pelo DDS" valor={responsavel || "Não definido"} />
                        <CelulaInfo rotulo="Fiscal Idealiza" valor={fiscalIdealiza || "Não definido"} />
                        <CelulaInfo rotulo="Líder / Encarregado" valor={liderEncarregado || "Não definido"} />
                        <CelulaInfo rotulo="Turno / Tipo" valor={`${turno || "-"} / ${tipo || "DDS"}`} />

                        <CelulaInfo rotulo="Gerado em" valor={formatarDataHoraPublica(dados.geradoEm || dados.created_at)} />
                        <CelulaInfo rotulo="Atualizado em" valor={formatarDataHoraPublica(dados.atualizadoEm || dados.updated_at)} />
                        <CelulaInfo rotulo="Total de participantes" valor={String(totalParticipantes)} />
                        <CelulaInfo rotulo="Total de folhas" valor={String(totalFolhas)} />
                    </section>

                    {conferenciaConcluidaPublica && (
                        <section className="mx-5 mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.26em] text-emerald-800">
                                        Status oficial da conferência
                                    </p>
                                    <h2 className="mt-1 text-[20px] font-black text-emerald-950">
                                        DDS conferido oficialmente
                                    </h2>
                                    <p className="mt-1 text-[12px] font-bold leading-5 text-emerald-900">
                                        A apuração oficial foi registrada pela Conferência Assistida. As assinaturas permanecem no documento físico arquivado.
                                    </p>
                                </div>

                                <div className="grid min-w-[360px] gap-2 text-center sm:grid-cols-2">
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Concluído em</p>
                                        <p className="mt-1 text-[11px] font-black text-slate-950">{formatarDataHoraPublica(conclusaoOficialEmPublico)}</p>
                                    </div>
                                    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-emerald-100">
                                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Recibo emitido em</p>
                                        <p className="mt-1 text-[11px] font-black text-slate-950">{reciboEmitidoEmPublico ? formatarDataHoraPublica(reciboEmitidoEmPublico) : "Ainda não emitido"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2">
                                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-emerald-100">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-slate-400">Participantes</p>
                                    <p className="mt-1 text-[18px] font-black text-slate-950">{participantesOficiaisPublico}</p>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-emerald-100">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-emerald-700">Presenças</p>
                                    <p className="mt-1 text-[18px] font-black text-emerald-900">{presencasOficiaisPublico}</p>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-emerald-100">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-red-700">Ausências</p>
                                    <p className="mt-1 text-[18px] font-black text-red-900">{ausenciasOficiaisPublico}</p>
                                </div>
                                <div className="rounded-xl bg-white px-3 py-2 text-center ring-1 ring-emerald-100">
                                    <p className="text-[9px] font-black uppercase tracking-wide text-orange-700">Homem-dia</p>
                                    <p className="mt-1 text-[18px] font-black text-orange-900">{homemDiaOficialPublico}</p>
                                </div>
                            </div>
                        </section>
                    )}

                    <section className="mx-5 mt-3 rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 px-4 py-2.5 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-emerald-800">
                                    Snapshot público do DDS
                                </p>
                                <p className="mt-1 text-[12px] font-bold text-emerald-950">
                                    {mensagemAutenticidade}
                                </p>
                            </div>
                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-800">
                                Conferido por QR
                            </p>
                        </div>
                    </section>

                    <section className="mx-5 mt-3">
                        <h2 className="mb-2 border-l-[5px] border-emerald-600 pl-2 text-[12px] font-black uppercase tracking-[0.24em] text-slate-800">
                            Programação semanal de temas
                        </h2>

                        <div className="grid grid-cols-7 overflow-hidden rounded-xl border border-slate-300 shadow-md shadow-slate-200/70">
                            {diasRender.map((dia, indice) => {
                                const data = dia?.data || dia?.dataDds || dia?.dia || "";
                                const tema = textoSeguro(dia?.tema || dia?.assunto);
                                const diaSemAtividade = ehDiaSemAtividadeDdsPublico(dia, tema);
                                const responsavelDia = textoSeguro(dia?.responsavel || dia?.responsavelNome || responsavel);

                                return (
                                    <div key={`${data}-${indice}`} className="min-h-[154px] border-r border-slate-200 bg-white last:border-r-0">
                                        <div className="border-b border-slate-300 bg-[#17233a] text-center text-white">
                                            <p className="px-2 py-1.5 text-[10px] font-black uppercase tracking-[0.16em]">
                                                {DIAS_SEMANA_DDS_PUBLICO[indice] || `Dia ${indice + 1}`}
                                            </p>
                                            <div className="border-t border-white/25" />
                                            <p className="px-2 py-1.5 text-[11px] font-black text-emerald-100">
                                                {formatarDataPublica(data)}
                                            </p>
                                        </div>

                                        <div className="pb-2.5">
                                            <p className="flex h-6 items-center justify-center border-b border-slate-200 bg-slate-50 text-center text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">
                                                Tema
                                            </p>
                                            <p className="mx-2.5 mt-1.5 flex min-h-[34px] items-center justify-center text-center text-[11px] font-black leading-[1.3] text-slate-900">
                                                {diaSemAtividade ? "NÃO HOUVE ATIVIDADES" : (tema || "-")}
                                            </p>

                                            {diaSemAtividade ? null : (
                                                <p className="mx-2.5 mt-2 flex items-center justify-center gap-1 border-t border-slate-200 pt-1 text-center text-[10px] font-bold leading-4 text-slate-700">
                                                    <span className="text-[9px] font-black uppercase tracking-[0.12em] text-slate-400">
                                                        Resp.
                                                    </span>
                                                    {responsavelDia || "-"}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="mx-5 mt-3 grid grid-cols-3 gap-3">
                        <BlocoInferior titulo="Aniversariantes da semana">
                            {aniversariantesSemana.length > 0 ? (
                                <ul className="space-y-0">
                                    {aniversariantesSemana.map((aniversariante, indice) => (
                                        <li key={`${aniversariante}-${indice}`}>• {aniversariante}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-slate-500">Nenhum aniversariante registrado neste QR.</p>
                            )}
                        </BlocoInferior>

                        <BlocoInferior titulo="Recados">
                            {recadosSemana ? (
                                <p className="whitespace-pre-line">{recadosSemana}</p>
                            ) : (
                                <p className="text-slate-500">Nenhum recado registrado neste QR.</p>
                            )}
                        </BlocoInferior>

                        <BlocoInferior titulo="Orientações importantes">
                            {orientacoesImportantes.length > 0 ? (
                                <ol className="space-y-0">
                                    {orientacoesImportantes.slice(0, 6).map((orientacao, indice) => (
                                        <li key={`${orientacao}-${indice}`}>
                                            {indice + 1}. {orientacao}
                                        </li>
                                    ))}
                                </ol>
                            ) : (
                                <p className="text-slate-500">Nenhuma orientação registrada neste QR.</p>
                            )}
                        </BlocoInferior>
                    </section>

                    <section className="mx-5 mt-3">
                        <h2 className="mb-2 border-l-[5px] border-emerald-600 pl-2 text-[12px] font-black uppercase tracking-[0.24em] text-slate-800">
                            Participantes registrados
                        </h2>

                        <div className="overflow-hidden rounded-xl border border-slate-300 shadow-sm shadow-slate-200/70">
                            {participantes.length > 0 ? (
                                <table className="w-full border-collapse text-left text-[12px]">
                                    <thead className="bg-slate-900 text-[10px] font-black uppercase tracking-[0.16em] text-white">
                                        <tr>
                                            <th className="w-14 px-3 py-2">Nº</th>
                                            <th className="px-3 py-2">Nome</th>
                                            <th className="w-52 px-3 py-2">Função</th>
                                            <th className="w-52 px-3 py-2">Empresa</th>
                                            <th className="w-56 px-3 py-2">Código no SafeScan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 bg-white">
                                        {participantes.map((participante, indice) => (
                                            <tr key={participante.id}>
                                                <td className="px-3 py-2 font-bold text-slate-500">{String(participante.numero || indice + 1).padStart(2, "0")}</td>
                                                <td className="px-3 py-2 font-black text-slate-900">{participante.nome}</td>
                                                <td className="px-3 py-2 font-semibold text-slate-700">{participante.funcao || "-"}</td>
                                                <td className="px-3 py-2 font-semibold text-slate-700">{participante.empresa || "-"}</td>
                                                <td className="px-3 py-2 font-bold text-slate-600">{participante.codigoSafescan || "-"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="bg-slate-50 px-4 py-2.5 text-[11px] font-semibold text-slate-500">
                                    Participantes não disponíveis neste QR. Gere um novo DDS para gravar o snapshot completo dos participantes.
                                </div>
                            )}
                        </div>
                    </section>

                    <footer className="mx-5 mb-4 mt-3 border-t border-slate-200 pt-2 text-center text-[9px] font-black uppercase tracking-[0.26em] text-slate-500">
                        Documento conferido por QR Code público. Assinaturas permanecem no documento físico arquivado.
                    </footer>
                </article>
            </div>
        </main>
    );
}

export default ConsultaDdsPublica;