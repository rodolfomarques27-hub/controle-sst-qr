import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  MapPin as MapPinned,
  ShieldCheck,
  X,
} from "lucide-react";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import { lerMapaObraLocal } from "../../services/mapaObraLocalService";
import {
  supabase,
  SUPABASE_CONFIGURADO,
} from "../../lib/supabaseClient";
import {
  listarMapasObraService,
} from "../../services/mapaObraService";
import {
  obterUrlAssinadaPlantaMapa,
} from "../../services/mapaObraStorageService";
import { listarExtintoresVistoria } from "../../services/extintoresVistoriaService";
import { PlantaInterativa } from "./PlantaInterativa";
import { GoogleMapaSatelite } from "./GoogleMapaSatelite";
import plantaInterativaMock from "./plantaInterativaMock.json";

const DESLOCAMENTOS_FILHOS = [
  { x: -3.4, y: 3.6 },
  { x: 3.2, y: 4.2 },
  { x: -4.1, y: -3.2 },
  { x: 4.2, y: -2.6 },
];

function limitarPercentual(valor) {
  return Math.max(3, Math.min(97, Number(valor) || 0));
}

function prepararPontosInterativos(pontos = [], usarDemonstracao = false) {
  return pontos.map((ponto, indice) => {
    const coordenadas = ponto.coordenadas || { x: ponto.x, y: ponto.y };
    const filhosExistentes = Array.isArray(ponto.pontosFilhos)
      ? ponto.pontosFilhos
      : [];
    const filhosDemonstrativos =
      usarDemonstracao && indice === 0 && !filhosExistentes.length
        ? plantaInterativaMock.pontosFilhos.map((filho, filhoIndice) => ({
            ...filho,
            id: `teste-${ponto.id}-${filho.id}`,
            coordenadas: {
              x: limitarPercentual(
                coordenadas.x + DESLOCAMENTOS_FILHOS[filhoIndice].x,
              ),
              y: limitarPercentual(
                coordenadas.y + DESLOCAMENTOS_FILHOS[filhoIndice].y,
              ),
            },
          }))
        : filhosExistentes;
    return {
      ...ponto,
      coordenadas,
      zoomMinimoFilhos: Number(ponto.zoomMinimoFilhos ?? 2),
      pontosFilhos: filhosDemonstrativos,
      status: ponto.status || "Ativo",
      ultimaInspecao: ponto.ultimaInspecao || "10/06/2026",
    };
  });
}

function formatarCodigoExtintor(codigo) {
  const numero = String(codigo || "").replace(/^E-?/i, "");
  return /^\d+$/.test(numero)
    ? String(Number(numero)).padStart(2, "0")
    : numero;
}

function normalizarTexto(valor) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function obterExtintoresDoPonto(ponto, extintores) {
  return (ponto?.extintores || [])
    .map((id) => extintores.find((item) => String(item.id) === String(id)))
    .filter(Boolean);
}

function obterAuditoriasDoPonto(ponto, auditorias = []) {
  const pontoId = String(ponto?.id || "");
  const nome = normalizarTexto(ponto?.nome);
  const local = normalizarTexto(ponto?.local || ponto?.descricao);
  const empresa = normalizarTexto(ponto?.empresaNome);
  return auditorias.filter((auditoria) => {
    const idVinculado =
      auditoria.pontoMapaId ||
      auditoria.ponto_mapa_id ||
      auditoria.mapaPontoId ||
      auditoria.mapa_ponto_id ||
      auditoria.notificacao?.pontoMapa?.id ||
      auditoria.notificacao?.pontoMapaId;
    if (idVinculado) return String(idVinculado) === pontoId;
    const texto = normalizarTexto(
      [
        auditoria.area,
        auditoria.subarea,
        auditoria.local,
        auditoria.maquinaEquipamento,
        auditoria.maquina_equipamento,
        auditoria.titulo,
        auditoria.assunto,
      ]
        .filter(Boolean)
        .join(" "),
    );
    const empresaAuditoria = normalizarTexto(
      auditoria.empresaNome ||
        auditoria.empresa_nome ||
        auditoria.empresaResponsavel ||
        auditoria.empresa_responsavel,
    );
    const empresaCompativel =
      !empresa ||
      empresa === "ponto compartilhado" ||
      !empresaAuditoria ||
      empresaAuditoria.includes(empresa) ||
      empresa.includes(empresaAuditoria);
    return (
      empresaCompativel &&
      ((nome.length >= 3 && texto.includes(nome)) ||
        (local.length >= 3 && texto.includes(local)))
    );
  });
}

function obterAuditoriaDoAlerta(alerta, auditorias = []) {
  const auditoriaId = String(alerta?.auditoriaId || "");
  if (!auditoriaId) return null;
  return (
    auditorias.find(
      (item) =>
        String(
          item.id ||
            item.uuid ||
            item.codigo ||
            item.numeroAuditoria ||
            item.numero_auditoria ||
            "",
        ) === auditoriaId,
    ) || null
  );
}

function obterResumoAuditoria(auditoria = {}) {
  return {
    numero:
      auditoria.numeroAuditoria || auditoria.numero_auditoria || "Sem número",
    tipo:
      auditoria.tipoAuditoria ||
      auditoria.tipo_auditoria ||
      "Auditoria de campo",
    titulo: auditoria.titulo || auditoria.assunto || "Auditoria sem título",
    area: auditoria.area || "Não informada",
    local: auditoria.local || "Não informado",
    risco:
      auditoria.grauRisco ||
      auditoria.grau_risco ||
      auditoria.classificacao ||
      "Não informado",
    status:
      auditoria.statusAuditoria ||
      auditoria.status_auditoria ||
      auditoria.statusDesvio ||
      auditoria.status_desvio ||
      "Aberta",
    situacao:
      auditoria.situacaoEncontrada ||
      auditoria.situacao_encontrada ||
      "Não informada",
    acao:
      auditoria.acaoRecomendada ||
      auditoria.acao_recomendada ||
      "Não informada",
    responsavel:
      auditoria.responsavelTratativa ||
      auditoria.responsavel_tratativa ||
      "Não informado",
    data: auditoria.createdAt || auditoria.created_at || "",
  };
}

function formatarData(valor) {
  if (!valor) return "Sem data";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? "Sem data"
    : data.toLocaleDateString("pt-BR");
}

function obterApresentacaoStatusAlerta(valor) {
  const status = normalizarTexto(valor);
  if (
    status.includes("resolvido") ||
    status.includes("fechado") ||
    status.includes("encerrado")
  ) {
    return { rotulo: "Fechado", classe: "text-red-600" };
  }
  if (
    status.includes("tratamento") ||
    status.includes("andamento")
  ) {
    return {
      rotulo: "Em andamento",
      classe: "text-amber-600",
    };
  }
  return { rotulo: "Aberto", classe: "text-emerald-600" };
}

function ResumoAuditoriasModal({ ponto, auditorias, auditoriasDiretas = null, onClose }) {
  const registros = (
    Array.isArray(auditoriasDiretas)
      ? auditoriasDiretas
      : obterAuditoriasDoPonto(ponto, auditorias)
  ).map(obterResumoAuditoria);
  useEffect(() => {
    const seletor = "[data-auditorias-modal] article";
    const cartoes = Array.from(document.querySelectorAll(seletor));
    cartoes.forEach((cartao, indice) => {
      cartao.dataset.resumoAberto = indice === 0 ? "true" : "false";
      const alternar = () => {
        cartao.dataset.resumoAberto =
          cartao.dataset.resumoAberto === "true" ? "false" : "true";
      };
      cartao.addEventListener("click", alternar);
      cartao
        .querySelectorAll("button, a")
        .forEach((controle) =>
          controle.addEventListener("click", (evento) =>
            evento.stopPropagation(),
          ),
        );
      cartao._alternarResumo = alternar;
    });
    return () =>
      cartoes.forEach((cartao) => {
        cartao.removeEventListener("click", cartao._alternarResumo);
        cartao
          .querySelectorAll("button, a")
          .forEach((controle) =>
            controle.replaceWith(controle.cloneNode(true)),
          );
      });
  }, [registros.length]);
  return (
    <div
      data-auditorias-modal
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 p-4"
    >
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-5 text-white md:px-7">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
              <CheckCircle2 size={14} /> Resumo das auditorias
            </p>
            <h2 className="mt-2 text-xl font-black md:text-2xl">
              {ponto.nome}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Histórico das auditorias vinculadas a este ponto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Fechar resumo das auditorias"
          >
            <X size={20} />
          </button>
        </header>
        <div className="space-y-4 p-5 md:p-7">
          {registros.map((auditoria) => (
            <article
              key={`${auditoria.numero}-${auditoria.data}`}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                    {auditoria.numero}
                  </p>
                  <h3 className="mt-1 font-black text-slate-950">
                    {auditoria.titulo}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {auditoria.tipo} · {formatarData(auditoria.data)}
                  </p>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-800">
                  {auditoria.status}
                </span>
              </div>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">Área / local</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {auditoria.area} · {auditoria.local}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Grau de risco</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {auditoria.risco}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    Situação encontrada
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {auditoria.situacao}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Ação recomendada</dt>
                  <dd className="mt-1 font-semibold text-slate-800">
                    {auditoria.acao}
                  </dd>
                </div>
              </dl>
              <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
                Responsável pela tratativa:{" "}
                <strong className="text-slate-700">
                  {auditoria.responsavel}
                </strong>
              </p>
            </article>
          ))}
          {!registros.length && (
            <div className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-500">
              Nenhuma auditoria vinculada a este ponto.
            </div>
          )}
        </div>
        <footer className="border-t border-slate-200 px-5 py-3 text-center text-[11px] font-semibold text-slate-400">
          Consulta somente leitura.
        </footer>
      </div>
    </div>
  );
}

function MarcadoresPlanta({ ponto, extintores }) {
  return obterExtintoresDoPonto(ponto, extintores).map((item) => {
    const posicao = ponto.extintorPosicoes?.[item.id];
    return posicao ? (
      <span
        key={item.id}
        title={`Extintor ${formatarCodigoExtintor(item.codigo)}`}
        style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
        className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[8px] font-black text-white shadow-lg"
      >
        {formatarCodigoExtintor(item.codigo)}
      </span>
    ) : null;
  });
}

function PlantaDetalhadaModal({ ponto, extintores, auditorias, onClose }) {
  const vinculados = obterExtintoresDoPonto(ponto, extintores);
  const registros = obterAuditoriasDoPonto(ponto, auditorias);
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/75 p-4">
      <div className="relative max-h-[94vh] w-full max-w-6xl overflow-auto rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 md:px-7">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
              <Eye size={14} /> Consulta do ponto
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-950 md:text-2xl">
              {ponto.nome}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Planta detalhada e equipamentos vinculados
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Fechar planta detalhada"
          >
            <X size={20} />
          </button>
        </header>
        <div className="grid gap-5 p-5 md:p-7 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="relative mx-auto aspect-square max-h-[68vh] w-full max-w-[760px] overflow-hidden rounded-lg border border-slate-200 bg-white">
                <img
                  src={ponto.plantaDetalhada.url}
                  alt={`Planta detalhada de ${ponto.nome}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <MarcadoresPlanta ponto={ponto} extintores={extintores} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-xl bg-slate-950 px-4 py-3 text-xs text-slate-300">
              <span className="font-bold text-white">Legenda</span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />{" "}
                Extintor posicionado na planta
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-300" /> Modo
                somente visualização
              </span>
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                <Info size={14} /> Resumo do local
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Tipo</dt>
                  <dd className="text-right font-bold text-slate-800">
                    {ponto.tipo}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="text-slate-500">Auditorias</dt>
                  <dd className="font-bold text-sky-700">{registros.length}</dd>
                </div>
              </dl>
              {registros.length > 0 && (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <CheckCircle2 size={14} /> Voltar e ver resumo
                </button>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                Equipamentos
              </p>
              <div className="mt-3 max-h-64 space-y-2 overflow-auto">
                {vinculados.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50/70 px-3 py-2"
                  >
                    <b className="text-sm text-slate-900">
                      {formatarCodigoExtintor(item.codigo)}
                    </b>
                    <span className="text-[10px] font-black uppercase text-emerald-700">
                      Na planta
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

async function hidratarReferenciaImagemVisualizacao(
  referencia,
  obraId,
) {
  if (
    !referencia ||
    typeof referencia !== "object"
  ) {
    return null;
  }

  if (!referencia.path) {
    return referencia;
  }

  const url =
    await obterUrlAssinadaPlantaMapa({
      supabase,
      caminho: referencia.path,
      obraId,
    });

  return {
    ...referencia,
    url,
  };
}

async function hidratarMapaVisualizacao(
  mapa,
) {
  const obraId = String(
    mapa?.obraId ||
      mapa?.obra_id ||
      "",
  );

  const planta =
    await hidratarReferenciaImagemVisualizacao(
      mapa?.planta,
      obraId,
    );

  const pontos = await Promise.all(
    (
      Array.isArray(mapa?.pontos)
        ? mapa.pontos
        : []
    ).map(async (ponto) => ({
      ...ponto,
      plantaDetalhada:
        await hidratarReferenciaImagemVisualizacao(
          ponto?.plantaDetalhada,
          obraId,
        ),
    })),
  );

  return {
    ...mapa,
    planta,
    pontos,
  };
}
export function MapaObraVisualizacaoPage({ auditoriasCampo = [] }) {
  const googleMapsConfig = useMemo(() => ({
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    latitude: Number(import.meta.env.VITE_OBRA_LATITUDE),
    longitude: Number(import.meta.env.VITE_OBRA_LONGITUDE),
  }), []);
  const googleMapsDisponivel = Boolean(googleMapsConfig.apiKey && Number.isFinite(googleMapsConfig.latitude) && Number.isFinite(googleMapsConfig.longitude));
  const [fonteMapa, setFonteMapa] = useState("planta");
  const mapaLocalInicial = useMemo(
    () => lerMapaObraLocal(),
    [],
  );

  const [mapa, setMapa] = useState(
    mapaLocalInicial,
  );

  useEffect(() => {
    if (!SUPABASE_CONFIGURADO) {
      return undefined;
    }

    let ativo = true;

    async function carregarMapaRemoto() {
      try {
        const obraPreferida = String(
          mapaLocalInicial?.obraId ||
            "",
        );

        let mapas =
          await listarMapasObraService({
            supabase,
            obraId: obraPreferida,
          });

        if (
          (!Array.isArray(mapas) ||
            mapas.length === 0) &&
          obraPreferida
        ) {
          mapas =
            await listarMapasObraService({
              supabase,
            });
        }

        const mapaRemoto =
          Array.isArray(mapas)
            ? mapas[0]
            : null;

        if (!ativo || !mapaRemoto) {
          return;
        }

        const mapaHidratado =
          await hidratarMapaVisualizacao(
            mapaRemoto,
          );

        if (ativo) {
          setMapa(mapaHidratado);
        }
      } catch (error) {
        console.warn(
          "Visualização remota do mapa indisponível; usando recuperação local.",
          error?.message || error,
        );
      }
    }

    carregarMapaRemoto();

    return () => {
      ativo = false;
    };
  }, [mapaLocalInicial?.obraId]);
  const extintores = useMemo(() => listarExtintoresVistoria(), []);
  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [nivelZoomPonto, setNivelZoomPonto] = useState(0);
  const [resetZoomPontoToken, setResetZoomPontoToken] = useState(0);
  const [alertaSelecionado, setAlertaSelecionado] = useState(null);
  const [nivelZoomAlerta, setNivelZoomAlerta] = useState(0);
  const [resetZoomAlertaToken, setResetZoomAlertaToken] = useState(0);
  const [plantaDetalhadaAberta, setPlantaDetalhadaAberta] = useState(false);
  const [resumoAuditoriaAberto, setResumoAuditoriaAberto] = useState(false);
  const pontoAtual =
    mapa.pontos?.find((item) => item.id === pontoSelecionado) || null;
  const alertaAtual =
    mapa.alertas?.find((item) => item.id === alertaSelecionado) || null;
  const auditoriaDoAlertaAtual = useMemo(
    () => obterAuditoriaDoAlerta(alertaAtual, auditoriasCampo),
    [alertaAtual, auditoriasCampo],
  );

  const resumos = useMemo(
    () =>
      new Map(
        (mapa.pontos || []).map((ponto) => [
          ponto.id,
          obterAuditoriasDoPonto(ponto, auditoriasCampo),
        ]),
      ),
    [mapa.pontos, auditoriasCampo],
  );
  const pontosInterativos = useMemo(
    () =>
      prepararPontosInterativos(
        mapa.pontos || [],
        Boolean(mapa.demonstracao),
      ).map((ponto) => ({
        ...ponto,
        auditoriasCount: (resumos.get(ponto.id) || []).length,
      })),
    [mapa.pontos, mapa.demonstracao, resumos],
  );
  const itensInterativos = useMemo(
    () => [
      ...pontosInterativos,
      ...(mapa.alertas || []).map((alerta) => ({
        ...alerta,
        id: `alerta:${alerta.id}`,
        nome: alerta.nome || alerta.tipo || "Alerta da obra",
        tipo: alerta.tipo || "Alerta",
        variante: "alerta",
        coordenadas: { x: alerta.x, y: alerta.y },
        auditoriaDisponivel: Boolean(
          obterAuditoriaDoAlerta(alerta, auditoriasCampo),
        ),
        pontosFilhos: [],
      })),
    ],
    [pontosInterativos, mapa.alertas, auditoriasCampo],
  );

  function focarAlertaNoMapa(alertaId) {
    const valor = String(alertaId || "");
    const mesmoAlerta =
      String(alertaSelecionado || "") === valor;
    const deveVoltarVisaoGeral =
      mesmoAlerta && nivelZoomAlerta >= 3;

    setFonteMapa("planta");
    setNivelZoomPonto(0);

    if (deveVoltarVisaoGeral) {
      setNivelZoomAlerta(0);
      setAlertaSelecionado(null);
      setPontoSelecionado(null);
      setResetZoomAlertaToken((atual) => atual + 1);
      setPlantaDetalhadaAberta(false);
      setResumoAuditoriaAberto(false);
      return;
    }

    setNivelZoomAlerta(
      mesmoAlerta
        ? Math.min(
            3,
            Math.max(1, nivelZoomAlerta) + 1,
          )
        : 1,
    );
    setAlertaSelecionado(valor);
    setPontoSelecionado(null);
    setPlantaDetalhadaAberta(false);
    setResumoAuditoriaAberto(false);
  }

  function selecionarPonto(id) {
    const valor = String(id || "");

    if (!valor) {
      setPontoSelecionado(null);
      setNivelZoomPonto(0);
      setAlertaSelecionado(null);
      setNivelZoomAlerta(0);
      setPlantaDetalhadaAberta(false);
      setResumoAuditoriaAberto(false);
      return;
    }

    if (valor.startsWith("alerta:")) {
      const alertaId = valor.replace("alerta:", "");
      const mesmoAlerta =
        String(alertaSelecionado || "") === alertaId;
      const deveVoltarVisaoGeral =
        mesmoAlerta && nivelZoomAlerta >= 3;

      setNivelZoomPonto(0);

      if (deveVoltarVisaoGeral) {
        setNivelZoomAlerta(0);
        setAlertaSelecionado(null);
        setPontoSelecionado(null);
        setResetZoomAlertaToken((atual) => atual + 1);
        setPlantaDetalhadaAberta(false);
        setResumoAuditoriaAberto(false);
        return;
      }

      setNivelZoomAlerta(
        mesmoAlerta
          ? Math.min(
              3,
              Math.max(1, nivelZoomAlerta) + 1,
            )
          : 1,
      );
      setAlertaSelecionado(alertaId);
      setPontoSelecionado(null);
      setPlantaDetalhadaAberta(false);
      setResumoAuditoriaAberto(false);
      return;
    }

    const mesmoPonto =
      String(pontoSelecionado || "") === valor;
    const deveVoltarVisaoGeral =
      mesmoPonto && nivelZoomPonto >= 3;

    setNivelZoomAlerta(0);
    setAlertaSelecionado(null);

    if (deveVoltarVisaoGeral) {
      setNivelZoomPonto(0);
      setPontoSelecionado(null);
      setResetZoomPontoToken((atual) => atual + 1);
      setPlantaDetalhadaAberta(false);
      setResumoAuditoriaAberto(false);
      return;
    }

    setNivelZoomPonto(
      mesmoPonto
        ? Math.min(
            3,
            Math.max(1, nivelZoomPonto) + 1,
          )
        : 1,
    );
    setPontoSelecionado(id);
    setPlantaDetalhadaAberta(false);
    setResumoAuditoriaAberto(false);
  }

  if (!mapa.planta?.url)
    return (
      <section className="min-h-full bg-slate-50 px-4 py-8">
        <div className="mx-auto max-w-5xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <MapPinned className="mx-auto text-sky-600" size={34} />
          <h1 className="mt-4 text-xl font-black text-slate-950">
            Mapa da obra
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            O mapa ainda não foi disponibilizado para visualização.
          </p>
        </div>
      </section>
    );

  return (
    <section className="min-h-full bg-slate-50/70 px-4 pb-6 pt-0 md:px-7 md:pb-8 md:pt-0 xl:h-full xl:min-h-0 xl:overflow-hidden xl:pb-0">
      <div className="mx-auto max-w-[1480px] space-y-3 xl:flex xl:h-full xl:min-h-0 xl:flex-col xl:gap-3 xl:space-y-0">
        <section className="relative min-h-[128px] overflow-hidden rounded-[22px] border border-slate-700 bg-slate-900 shadow-[0_10px_28px_rgba(26,35,50,0.12)] xl:shrink-0">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${dashboardHeroBackground})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.82)_0%,rgba(15,23,42,0.54)_45%,rgba(15,23,42,0.2)_100%)]" />
          <div className="relative flex min-h-[128px] items-center justify-between gap-5 px-6 py-3 text-white">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-emerald-300">
                <MapPinned size={15} /> Mapa da obra
              </p>
              <h1 className="mt-2 text-2xl font-black leading-tight md:text-3xl">
                Visualização do mapa
              </h1>
              <p className="mt-2 text-sm font-semibold text-slate-200">
                Consulte os pontos da obra sem alterar os dados.
              </p>
            </div>
            <span className="hidden items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-bold text-white md:inline-flex">
              <ShieldCheck size={15} /> Somente visualização
            </span>
          </div>
        </section>
        <div className="grid gap-5 xl:min-h-0 xl:flex-1 xl:grid-cols-[minmax(0,1fr)_330px]">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:flex xl:min-h-0 xl:flex-col xl:overflow-hidden">
            <div className="mb-3 flex items-center justify-between gap-3 xl:shrink-0">
              <div>
                <h2 className="font-black text-slate-950">
                  Planta geral da obra
                </h2>
                <p className="text-xs text-slate-500">
                  {mapa.obraNome || "Obra"} · clique em um ponto para consultar
                </p>
              </div>
              <div className="flex items-center gap-2">
                {googleMapsDisponivel && (
                  <div className="flex rounded-lg bg-slate-100 p-1 text-xs font-bold">
                    <button type="button" onClick={() => setFonteMapa("planta")} className={`rounded-md px-3 py-1.5 ${fonteMapa === "planta" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Planta</button>
                    <button type="button" onClick={() => setFonteMapa("satelite")} className={`rounded-md px-3 py-1.5 ${fonteMapa === "satelite" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>Satélite</button>
                  </div>
                )}
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                  {mapa.pontos?.length || 0} ponto(s) · {mapa.alertas?.length || 0} alerta(s)
                </span>
              </div>
            </div>
            {fonteMapa === "satelite" && googleMapsDisponivel ? (
              <GoogleMapaSatelite {...googleMapsConfig} />
            ) : (
              <PlantaInterativa
                imagemUrl={mapa.planta.url}
                pontos={itensInterativos}
                pontoSelecionado={alertaSelecionado ? `alerta:${alertaSelecionado}` : pontoSelecionado}
                nivelZoomFoco={
                  alertaSelecionado
                    ? nivelZoomAlerta
                    : pontoSelecionado
                      ? nivelZoomPonto
                      : 0
                }
                resetExternoToken={
                  resetZoomAlertaToken + resetZoomPontoToken
                }
                onSelecionarPonto={selecionarPonto}
                onAbrirPlantaDetalhada={(ponto) => {
                  setPontoSelecionado(ponto.id);
                  setAlertaSelecionado(null);
                  setResumoAuditoriaAberto(false);
                  setPlantaDetalhadaAberta(true);
                }}
                onAbrirResumoAuditoria={(item) => {
                  if (item.variante === "alerta") {
                    setAlertaSelecionado(
                      String(item.id || "").replace(/^alerta:/, ""),
                    );
                    setPontoSelecionado(null);
                  } else {
                    setPontoSelecionado(item.id);
                    setAlertaSelecionado(null);
                  }
                  setPlantaDetalhadaAberta(false);
                  setResumoAuditoriaAberto(true);
                }}
                testeLocal={Boolean(mapa.demonstracao)}
                className="xl:!h-auto xl:!min-h-0 xl:flex-1"
              />
            )}
          </section>
          <aside className="space-y-5 xl:min-h-0 xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                  Pontos da obra
                </p>
                <span className="text-xs font-bold text-slate-500">
                  {auditoriasCampo.length} auditoria(s)
                </span>
              </div>
              <div className="mt-4 space-y-2">
                {(mapa.pontos || []).map((ponto) => {
                  const total = (resumos.get(ponto.id) || []).length;
                  return (
                    <button
                      key={ponto.id}
                      type="button"
                      onClick={() => selecionarPonto(ponto.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left ${pontoSelecionado === ponto.id ? "border-sky-300 bg-sky-50" : "border-slate-100 hover:bg-slate-50"}`}
                    >
                      <span>
                        <b className="block text-sm text-slate-800">
                          {ponto.nome}
                        </b>
                        <small className="text-xs text-slate-500">
                          {ponto.tipo}
                        </small>
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2 py-1 text-[10px] font-black ${total ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}
                        >
                          {total} auditoria(s)
                        </span>
                        <MapPinned size={15} className="text-sky-600" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {(mapa.alertas || []).length > 0 && (
              <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-amber-700">
                    <AlertTriangle size={12} /> Alertas da obra
                  </p>
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-black text-amber-800">
                    {mapa.alertas.length}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1">
                  {mapa.alertas.map((alerta) => {
                    const status =
                      obterApresentacaoStatusAlerta(alerta.status);
                    const titulo = alerta.nome || alerta.tipo;
                    return (
                      <button
                        key={alerta.id}
                        type="button"
                        onClick={() => focarAlertaNoMapa(alerta.id)}
                        className={`flex min-h-8 w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left transition ${
                          alertaSelecionado === alerta.id
                            ? "border-amber-400 bg-amber-50"
                            : "border-slate-100 bg-white hover:border-amber-200 hover:bg-amber-50/40"
                        }`}
                        title={`${titulo} - ${alerta.tipo} - ${status.rotulo}`}
                        aria-label={`Ver ${titulo} no mapa`}
                      >
                        <span className="min-w-0 flex-1 truncate text-[10px] leading-4 text-slate-500">
                          <b className="font-black text-slate-800">
                            {titulo}
                          </b>
                          <span> — {alerta.tipo}</span>
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-black ${status.classe}`}
                        >
                          {status.rotulo}
                        </span>
                        <MapPinned
                          size={12}
                          className="shrink-0 text-amber-700"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          </aside>
        </div>
        {plantaDetalhadaAberta && pontoAtual?.plantaDetalhada?.url && (
          <PlantaDetalhadaModal
            ponto={pontoAtual}
            extintores={extintores}
            auditorias={auditoriasCampo}
            onClose={() => setPlantaDetalhadaAberta(false)}
          />
        )}
        {resumoAuditoriaAberto &&
          (pontoAtual || (alertaAtual && auditoriaDoAlertaAtual)) && (
            <ResumoAuditoriasModal
              ponto={
                pontoAtual || {
                  nome:
                    alertaAtual?.pontoNome ||
                    alertaAtual?.nome ||
                    "Alerta da obra",
                }
              }
              auditorias={auditoriasCampo}
              auditoriasDiretas={
                pontoAtual ? null : [auditoriaDoAlertaAtual]
              }
              onClose={() => setResumoAuditoriaAberto(false)}
            />
          )}
      </div>
    </section>
  );
}
