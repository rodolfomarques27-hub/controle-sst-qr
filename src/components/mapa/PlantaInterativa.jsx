import React, { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { ImageOverlay, MapContainer, Marker, useMap, useMapEvents } from "react-leaflet";
import { Box, CalendarDays, Eye, Focus, MapPin, RotateCcw, ShieldCheck, TriangleAlert, X, ZoomIn } from "lucide-react";
import "leaflet/dist/leaflet.css";
import "../../styles/planta-interativa.css";

const ALTURA_MAPA = 1000;
const PROPORCAO_PADRAO = 1;
const ZOOM_INICIAL_ADICIONAL = 0;

function criarGeometriaImagem(proporcao = PROPORCAO_PADRAO) {
  const proporcaoSegura =
    Number.isFinite(proporcao) && proporcao > 0
      ? Math.max(0.5, Math.min(3, proporcao))
      : PROPORCAO_PADRAO;
  const largura = ALTURA_MAPA * proporcaoSegura;
  return {
    altura: ALTURA_MAPA,
    largura,
    limites: [[0, 0], [ALTURA_MAPA, largura]],
    centro: [ALTURA_MAPA / 2, largura / 2],
  };
}

function percentualParaMapa(coordenadas = {}, geometria) {
  const x = Math.max(0, Math.min(100, Number(coordenadas.x) || 0));
  const y = Math.max(0, Math.min(100, Number(coordenadas.y) || 0));
  return [
    geometria.altura - (y / 100) * geometria.altura,
    (x / 100) * geometria.largura,
  ];
}

function rotuloTipo(tipo, pai = false) {
  if (String(tipo || "").toLowerCase().includes("alerta")) return "!";
  if (pai) return "A";
  const normalizado = String(tipo || "").toLowerCase();
  if (normalizado.includes("seguranca") || normalizado.includes("extintor")) return "EX";
  if (normalizado.includes("risco")) return "RI";
  if (normalizado.includes("container")) return "CT";
  return "EQ";
}

function criarIcone({ tipo, pai = false, selecionado = false, variante = "" }) {
  const classeTipo = String(tipo || "").toLowerCase().includes("risco") ? " planta-interativa__icone--risco" : "";
  const classeAlerta = variante === "alerta" ? " planta-interativa__icone--alerta" : "";
  const classeSelecionado = selecionado ? " planta-interativa__icone--selecionado" : "";
  const classeNivel = pai ? "planta-interativa__icone--pai" : "planta-interativa__icone--filho";
  const tamanho = pai ? 23 : 19;
  return L.divIcon({
    className: "",
    html: `<span class="planta-interativa__icone ${classeNivel}${classeTipo}${classeAlerta}${classeSelecionado}">${rotuloTipo(variante === "alerta" ? "alerta" : tipo, pai)}</span>`,
    iconSize: [tamanho, tamanho],
    iconAnchor: [tamanho / 2, tamanho / 2],
  });
}

function distanciaAoCentro(coordenadas, centro, geometria) {
  const [y, x] = percentualParaMapa(coordenadas, geometria);
  return Math.hypot(y - centro.lat, x - centro.lng);
}

function ControleDoMapa({
  pontos,
  focoId,
  nivelZoomFoco,
  onFoco,
  onZoom,
  resetToken,
  geometria,
}) {
  const mapa = useMap();

  useEffect(() => {
    const atualizar = window.setTimeout(() => {
      mapa.invalidateSize({ pan: false });
      const zoomBase = mapa.getBoundsZoom(
        geometria.limites,
        false,
        [0, 0],
      );
      const zoomInicial = Math.min(
        mapa.getMaxZoom(),
        zoomBase + ZOOM_INICIAL_ADICIONAL,
      );
      mapa.setView(geometria.centro, zoomInicial, {
        animate: false,
      });
      onZoom(zoomInicial);
    }, 80);
    return () => window.clearTimeout(atualizar);
  }, [geometria, mapa, onZoom]);

  useEffect(() => {
    if (!resetToken) return;
    mapa.invalidateSize({ pan: false });
    const zoomBase = mapa.getBoundsZoom(
      geometria.limites,
      false,
      [0, 0],
    );
    const zoomInicial = Math.min(
      mapa.getMaxZoom(),
      zoomBase + ZOOM_INICIAL_ADICIONAL,
    );
    mapa.setView(geometria.centro, zoomInicial, { animate: true });
    onFoco(null);
    onZoom(zoomInicial);
  }, [geometria, mapa, onFoco, onZoom, resetToken]);

  useEffect(() => {
    if (!focoId) return;

    const ponto = pontos.find(
      (item) => String(item.id) === String(focoId),
    );

    if (!ponto) return;

    if (Number(nivelZoomFoco) <= 0) {
      return;
    }

    const zoomMaximo = mapa.getMaxZoom();
    const zoomBase = mapa.getBoundsZoom(
      geometria.limites,
      false,
      [0, 0],
    );

    const niveisFoco = [
      Math.min(zoomMaximo, zoomBase + 1),
      Math.min(zoomMaximo, zoomBase + 2.25),
      zoomMaximo,
    ];

    const indiceNivel = Math.min(
      2,
      Math.max(
        0,
        Math.trunc(Number(nivelZoomFoco)) - 1,
      ),
    );

    const zoomDestino = niveisFoco[indiceNivel];

    mapa.flyTo(
      percentualParaMapa(ponto.coordenadas, geometria),
      zoomDestino,
      { duration: 0.7 },
    );
  }, [
    focoId,
    geometria,
    mapa,
    nivelZoomFoco,
    pontos,
  ]);

  useMapEvents({
    zoomend() {
      const zoom = mapa.getZoom();
      onZoom(zoom);
      if (!focoId && zoom >= 1 && pontos.length) {
        const centro = mapa.getCenter();
        const maisProximo = pontos.reduce((melhor, ponto) => (
          !melhor ||
          distanciaAoCentro(ponto.coordenadas, centro, geometria) <
            distanciaAoCentro(
              melhor.coordenadas,
              centro,
              geometria,
            )
            ? ponto
            : melhor
        ), null);
        if (maisProximo) onFoco(maisProximo.id);
      }
    },
  });

  return null;
}

function IconeDoTipo({ tipo }) {
  if (String(tipo || "").toLowerCase().includes("risco")) return <TriangleAlert size={15} />;
  if (String(tipo || "").toLowerCase().includes("seguranca")) return <ShieldCheck size={15} />;
  return <Box size={15} />;
}

function MarcadorPai({ ponto, selecionado, onFocar, geometria }) {
  return (
    <Marker
      position={percentualParaMapa(ponto.coordenadas, geometria)}
      icon={criarIcone({ tipo: ponto.tipo, pai: true, selecionado, variante: ponto.variante })}
      alt={`Abrir área ${ponto.nome}`}
      eventHandlers={{ click: () => onFocar(ponto) }}
    />
  );
}

export function PlantaInterativa({
  imagemUrl,
  pontos = [],
  pontoSelecionado,
  nivelZoomFoco = 0,
  resetExternoToken = 0,
  onSelecionarPonto,
  onAbrirPlantaDetalhada,
  onAbrirResumoAuditoria,
  className = "",
}) {
  const [zoom, setZoom] = useState(-1);
  const [focoId, setFocoId] = useState(pontoSelecionado || null);
  const [detalhe, setDetalhe] = useState(null);
  const [resetToken, setResetToken] = useState(0);
  const [proporcaoImagem, setProporcaoImagem] = useState(null);
  const geometriaImagem = useMemo(
    () => criarGeometriaImagem(proporcaoImagem || PROPORCAO_PADRAO),
    [proporcaoImagem],
  );
  const detalhePossuiAuditorias =
    Number(detalhe?.auditoriasCount || 0) > 0;
  const detalhePossuiPlanta = Boolean(detalhe?.plantaDetalhada?.url);
  const detalhePossuiDuasAcoes =
    detalhePossuiAuditorias && detalhePossuiPlanta;

  const pontosValidos = useMemo(() => pontos.filter((ponto) => ponto?.coordenadas && ponto?.id), [pontos]);
  const pontoFocado = pontosValidos.find((ponto) => String(ponto.id) === String(focoId)) || null;
  const zoomMinimo = Number(pontoFocado?.zoomMinimoFilhos ?? 2);
  const mostrarFilhos = Boolean(pontoFocado && zoom >= zoomMinimo);

  useEffect(() => {
    let ativo = true;
    setProporcaoImagem(null);
    const imagem = new Image();
    imagem.onload = () => {
      if (!ativo) return;
      const largura = Number(imagem.naturalWidth);
      const altura = Number(imagem.naturalHeight);
      setProporcaoImagem(
        largura > 0 && altura > 0
          ? largura / altura
          : PROPORCAO_PADRAO,
      );
    };
    imagem.onerror = () => {
      if (ativo) setProporcaoImagem(PROPORCAO_PADRAO);
    };
    imagem.src = imagemUrl;
    return () => {
      ativo = false;
    };
  }, [imagemUrl]);

  useEffect(() => {
    const ponto = pontosValidos.find(
      (item) => String(item.id) === String(pontoSelecionado),
    );
    setFocoId(pontoSelecionado || null);
    if (!pontoSelecionado) {
      setDetalhe(null);
      return;
    }
    if (ponto) setDetalhe({ ...ponto, nivel: "area" });
  }, [pontoSelecionado, pontosValidos]);

  function focarPonto(ponto) {
    setFocoId(ponto.id);
    setDetalhe({ ...ponto, nivel: "area" });
    onSelecionarPonto?.(ponto.id);
  }

  function fecharDetalhe() {
    setFocoId(null);
    setDetalhe(null);
    onSelecionarPonto?.(null);
  }

  function voltarVisaoGeral() {
    fecharDetalhe();
    setResetToken((atual) => atual + 1);
  }

  if (!imagemUrl) return null;

  if (!proporcaoImagem) {
    return (
      <div
        className={`grid h-[clamp(420px,60vw,680px)] w-full place-items-center rounded-lg border border-slate-200 bg-slate-50 text-xs font-bold text-slate-500 ${className}`}
      >
        Preparando planta da obra...
      </div>
    );
  }

  return (
    <div className={`planta-interativa relative h-[clamp(420px,60vw,680px)] w-full overflow-hidden rounded-lg border border-slate-200 bg-white ${className}`}>
      <MapContainer
        key={`${imagemUrl}-${geometriaImagem.largura.toFixed(2)}`}
        crs={L.CRS.Simple}
        bounds={geometriaImagem.limites}
        minZoom={-2}
        maxZoom={4}
        zoomSnap={0.25}
        zoomDelta={0.5}
        wheelPxPerZoomLevel={80}
        scrollWheelZoom
        touchZoom
        doubleClickZoom
        maxBounds={[
          [-80, -(geometriaImagem.largura * 0.08)],
          [
            geometriaImagem.altura + 80,
            geometriaImagem.largura * 1.08,
          ],
        ]}
        maxBoundsViscosity={0.85}
        className="h-full w-full"
      >
        <ImageOverlay
          url={imagemUrl}
          bounds={geometriaImagem.limites}
        />
        <ControleDoMapa
          pontos={pontosValidos}
          focoId={focoId}
          nivelZoomFoco={nivelZoomFoco}
          onFoco={setFocoId}
          onZoom={setZoom}
          resetToken={resetToken + Number(resetExternoToken || 0)}
          geometria={geometriaImagem}
        />

        {pontosValidos.map((ponto) => (
          <MarcadorPai
            key={ponto.id}
            ponto={ponto}
            selecionado={String(ponto.id) === String(focoId)}
            onFocar={focarPonto}
            geometria={geometriaImagem}
          />
        ))}

        {mostrarFilhos && (pontoFocado.pontosFilhos || []).map((filho) => (
          <Marker
            key={filho.id}
            position={percentualParaMapa(filho.coordenadas, geometriaImagem)}
            icon={criarIcone({ tipo: filho.tipo, selecionado: detalhe?.id === filho.id })}
            alt={`Abrir item ${filho.nome}`}
            eventHandlers={{ click: () => setDetalhe({ ...filho, nivel: "item", areaNome: pontoFocado.nome }) }}
          />
        ))}
      </MapContainer>

      {(focoId || zoom > -1) && (
        <button
          type="button"
          onClick={voltarVisaoGeral}
          className="absolute right-3 top-3 z-[850] inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-black text-slate-700 shadow-lg transition hover:bg-slate-50"
        >
          <RotateCcw size={14} /> Visão geral
        </button>
      )}

      <div className="pointer-events-none absolute bottom-2.5 left-1/2 z-[800] -translate-x-1/2 rounded-lg bg-slate-950/90 px-2.5 py-1.5 text-center text-[10px] font-bold text-white shadow-lg backdrop-blur">
        {mostrarFilhos ? "Itens da área liberados" : <span className="inline-flex items-center gap-2"><ZoomIn size={13} /> Aproxime ou clique em uma área</span>}
      </div>


      {detalhe && (
        <aside className="absolute bottom-3 right-3 z-[900] max-h-[calc(100%-64px)] w-[min(270px,calc(100%-24px))] overflow-y-auto rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-sky-700"><IconeDoTipo tipo={detalhe.tipo} /></span>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.16em] text-sky-700">{detalhe.variante === "alerta" ? "Alerta da obra" : detalhe.nivel === "area" ? "Área da obra" : detalhe.areaNome}</p>
                <h3 className="mt-1 text-sm font-black text-slate-950">{detalhe.nome}</h3>
              </div>
            </div>
            <button type="button" onClick={fecharDetalhe} className="rounded-md p-1 text-slate-400 hover:bg-slate-100" aria-label="Fechar detalhes"><X size={14} /></button>
          </div>
          {detalhe.variante === "alerta" ? (
            <div className="mt-2 space-y-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 px-2.5 py-2"><span className="block text-[9px] font-bold uppercase text-slate-400">Tipo</span><b className="mt-1 block text-slate-700">{detalhe.tipo || "Não informado"}</b></div>
              <div className="rounded-lg bg-slate-50 px-2.5 py-2"><span className="block text-[9px] font-bold uppercase text-slate-400">Status</span><b className="mt-1 block text-emerald-700">{detalhe.status || "Aberto"}</b></div>
            </div>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-slate-50 p-2"><span className="block text-[9px] font-bold uppercase text-slate-400">Tipo</span><b className="mt-1 block text-slate-700">{detalhe.tipo || "Não informado"}</b></div>
              <div className="rounded-lg bg-slate-50 p-2"><span className="block text-[9px] font-bold uppercase text-slate-400">Status</span><b className="mt-1 block text-emerald-700">{detalhe.status || "Ativo"}</b></div>
            </div>
          )}
          {detalhe.ultimaInspecao && <p className="mt-3 flex items-center gap-2 text-xs text-slate-500"><CalendarDays size={14} /> Última inspeção: <b className="text-slate-700">{detalhe.ultimaInspecao}</b></p>}
          {detalhe.nivel === "area" && detalhe.variante !== "alerta" && (
            <>
              <p className="mt-3 flex items-center gap-2 rounded-lg bg-sky-50 p-2 text-[11px] font-semibold text-sky-800">
                <Focus size={14} />
                {mostrarFilhos ? "Itens desta área estão visíveis." : "Aproxime mais para revelar os itens desta área."}
              </p>
              {(detalhePossuiAuditorias || detalhePossuiPlanta) && (
                <div
                  className={`mt-2 grid gap-2 ${
                    detalhePossuiDuasAcoes
                      ? "grid-cols-2"
                      : "grid-cols-1"
                  }`}
                >
                  {detalhePossuiAuditorias &&
                    onAbrirResumoAuditoria && (
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirResumoAuditoria(detalhe)
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-emerald-700"
                      >
                        <Eye size={13} />
                        {detalhe.auditoriasCount === 1
                          ? "Ver auditoria"
                          : `Ver auditorias (${detalhe.auditoriasCount})`}
                      </button>
                    )}
                  {detalhePossuiPlanta &&
                    onAbrirPlantaDetalhada && (
                      <button
                        type="button"
                        onClick={() =>
                          onAbrirPlantaDetalhada(detalhe)
                        }
                        className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-slate-950 px-2 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-slate-800"
                      >
                        <MapPin size={13} /> Abrir planta
                      </button>
                    )}
                </div>
              )}
            </>
          )}
          {detalhe.variante === "alerta" &&
            detalhe.auditoriaDisponivel &&
            onAbrirResumoAuditoria && (
              <button
                type="button"
                onClick={() => onAbrirResumoAuditoria(detalhe)}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-[10px] font-bold text-white shadow-sm hover:bg-slate-800"
              >
                <Eye size={13} /> Abrir resumo da auditoria
              </button>
            )}
        </aside>
      )}
    </div>
  );
}
