import React, { useRef, useState } from "react";
import {
  Copy,
  Edit3,
  ExternalLink,
  Map,
  MapPin as MapPinned,
  MapPinOff,
  Plus,
  Printer,
  QrCode,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { criarTokenMapaLocal } from "../../services/mapaObraLocalService";
import { QrCodeComLogo } from "../qr/QrCodeComLogo";
import { montarUrlPublicaSistema } from "../../utils/urlPublicaUtils.js";

const TIPOS = [
  "Container de materiais",
  "Almoxarifado",
  "Administração e segurança",
  "Refeitório",
  "Vestiário",
  "Banheiro",
  "Outro ambiente",
];

function formatarCodigo(codigo) {
  const numero = String(codigo || "").replace(/^E-?/i, "");
  return /^\d+$/.test(numero)
    ? String(Number(numero)).padStart(2, "0")
    : numero;
}

export function AmbientesControleTabela({
  ponto,
  extintores,
  onPositionChange,
  onPositionRemove,
  onPontosInternosChange,
}) {
  const areaRef = useRef(null);
  const qrPontoRef = useRef(null);
  const [extintorSelecionado, setExtintorSelecionado] = useState("");
  const [ambientePendente, setAmbientePendente] = useState(null);
  const [ambienteEditando, setAmbienteEditando] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const [temporaria, setTemporaria] = useState(null);
  const [tipoPersonalizado, setTipoPersonalizado] = useState("");
  const [tipoPersonalizadoAtivo, setTipoPersonalizadoAtivo] = useState(false);
  if (!ponto?.plantaDetalhada?.url) return null;
  const vinculados = (ponto.extintores || [])
    .map((id) => extintores.find((item) => String(item.id) === String(id)))
    .filter(Boolean)
    .map((item) => ({ ...item, codigo: formatarCodigo(item.codigo) }));
  const posicoes = ponto.extintorPosicoes || {};
  const ambientes = Array.isArray(ponto.pontosInternosPlanta)
    ? ponto.pontosInternosPlanta
    : [];
  const categoriasPersonalizadas = Array.from(
    new Set(
      ambientes
        .map((item) => item.tipo)
        .filter((tipo) => tipo && !TIPOS.includes(tipo)),
    ),
  );
  function coordenadas(evento) {
    const caixa = areaRef.current?.getBoundingClientRect();
    if (!caixa) return null;
    return {
      x: Math.max(
        0,
        Math.min(
          100,
          Number(
            (((evento.clientX - caixa.left) / caixa.width) * 100).toFixed(2),
          ),
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          100,
          Number(
            (((evento.clientY - caixa.top) / caixa.height) * 100).toFixed(2),
          ),
        ),
      ),
    };
  }
  function clicarPlanta(evento) {
    if (arrastando) return;
    const posicao = coordenadas(evento);
    if (!posicao) return;
    if (!extintorSelecionado) return;
    onPositionChange(extintorSelecionado, posicao.x, posicao.y);
    setExtintorSelecionado("");
  }
  function mover(evento) {
    if (!arrastando) return;
    const posicao = coordenadas(evento);
    if (posicao) setTemporaria(posicao);
  }
  function soltar(evento) {
    if (!arrastando) return;
    const posicao = temporaria || coordenadas(evento);
    if (posicao && arrastando.tipo === "extintor")
      onPositionChange(arrastando.id, posicao.x, posicao.y);
    if (posicao && arrastando.tipo === "ambiente")
      onPontosInternosChange(
        ambientes.map((item) =>
          item.id === arrastando.id
            ? { ...item, x: posicao.x, y: posicao.y }
            : item,
        ),
      );
    areaRef.current?.releasePointerCapture?.(evento.pointerId);
    setArrastando(null);
    setTemporaria(null);
  }
  function urlQr(ambiente) {
    const caminho = `/consulta-ponto/${encodeURIComponent(ponto.token)}?ambiente=${encodeURIComponent(ambiente.token)}`;
    return montarUrlPublicaSistema(caminho);
  }
  const urlPonto = montarUrlPublicaSistema(`/consulta-ponto/${encodeURIComponent(ponto.token)}`);
  async function copiarUrlPonto() {
    try {
      await navigator.clipboard.writeText(urlPonto);
    } catch {
      // A consulta continua disponível quando o navegador bloquear a cópia.
    }
  }
  function imprimirQrPonto() {
    const qr = qrPontoRef.current;
    const janela = window.open("", "_blank", "width=460,height=620");
    if (!qr || !janela) return;
    janela.document.write(
      `<html><head><title>${ponto.nome}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;width:210mm;height:297mm}body{display:flex;justify-content:center;align-items:flex-start;padding-top:18mm;font:14px Arial;color:#0f172a}.etiqueta{display:flex;width:72mm;flex-direction:column;align-items:center;padding:5mm 6mm 5.5mm;border:1px solid #dbe4ee;border-radius:5px;text-align:center}.etiqueta h1{display:-webkit-box;width:58mm;max-height:10mm;margin:0 0 2mm;overflow:hidden;font-size:14px;font-weight:700;line-height:5mm;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}.qr>span{position:relative;display:inline-flex!important;width:58mm!important;height:58mm!important;align-items:center;justify-content:center;overflow:hidden}.qr>span>svg{display:block;width:58mm!important;height:58mm!important}.qr>span>span{position:absolute!important;left:50%!important;top:50%!important;display:flex!important;width:13mm!important;height:13mm!important;align-items:center;justify-content:center;transform:translate(-50%,-50%)!important;border-radius:8px;background:#fff}.qr>span>span img{display:block;width:10.5mm!important;height:10.5mm!important;object-fit:contain}</style></head><body><div class="etiqueta"><h1>${ponto.nome}</h1><div class="qr">${qr.innerHTML}</div></div></body></html>`,
    );
    janela.document.close();
    janela.focus();
    janela.print();
  }
  function imprimir(ambiente, codigo) {
    const qr = document.getElementById(`qr-controle-${ambiente.id}`);
    const janela = window.open("", "_blank", "width=460,height=620");
    if (!qr || !janela) return;
    janela.document.write(
      `<html><head><title>${codigo} - ${ambiente.nome}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;width:210mm;height:297mm;display:flex;justify-content:center;align-items:flex-start;padding-top:18mm;font:14px Arial;color:#0f172a}.etiqueta{width:78mm;padding:6mm;border:1px solid #dbe4ee;border-radius:5px;text-align:center}.etiqueta h1{font-size:15px;margin:0 0 3mm}.qr span{display:inline-flex!important;position:relative}.qr span>span{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;background:#fff;border-radius:8px}</style></head><body><div class="etiqueta"><h1>${codigo} - ${ambiente.nome}</h1><div class="qr">${qr.innerHTML}</div></div></body></html>`,
    );
    janela.document.close();
    janela.focus();
    janela.print();
  }
  function salvarAmbiente(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const tipo = String(dados.get("tipo") || TIPOS[0]);
    const ambiente = {
      ...ambientePendente,
      id: ambienteEditando?.id || `ambiente-${Date.now()}`,
      token: ambienteEditando?.token || criarTokenMapaLocal(),
      nome: String(dados.get("nome") || "Novo ambiente").trim(),
      tipo:
        tipo === "Tipo personalizado"
          ? tipoPersonalizado.trim() || "Outro ambiente"
          : tipo,
      descricao: String(dados.get("descricao") || "").trim(),
      criadoEm: new Date().toISOString(),
      ativo: true,
    };
    onPontosInternosChange(
      ambienteEditando
        ? ambientes.map((item) => (item.id === ambiente.id ? ambiente : item))
        : [...ambientes, ambiente],
    );
    setAmbientePendente(null);
    setAmbienteEditando(null);
    setTipoPersonalizado("");
    setTipoPersonalizadoAtivo(false);
  }
  function editarAmbiente(ambiente) {
    setAmbienteEditando(ambiente);
    setTipoPersonalizadoAtivo(!TIPOS.includes(ambiente.tipo));
    setTipoPersonalizado(TIPOS.includes(ambiente.tipo) ? "" : ambiente.tipo);
    setAmbientePendente(ambiente);
  }
  function excluirAmbiente(ambiente) {
    if (!window.confirm(`Excluir ${ambiente.nome}?`)) return;
    onPontosInternosChange(ambientes.filter((item) => item.id !== ambiente.id));
  }
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col items-stretch gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-start">
        <div className="relative flex min-w-0 items-center gap-3 md:w-[min(42vw,560px)] md:after:absolute md:after:right-0 md:after:top-1/2 md:after:h-14 md:after:-translate-y-1/2 md:after:border-r md:after:border-slate-200">
          <div className="hidden h-12 w-1 shrink-0 rounded-full bg-sky-600 sm:block" />
          <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 sm:flex">
            <Map size={20} />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
              Planta detalhada
            </p>
            <h2 className="mt-1 text-lg font-black text-slate-950">
              Localização dos extintores e ambientes
            </h2>
            <p className="mt-1 truncate text-xs text-slate-500">
              Arraste os marcadores para ajustar ou adicione um novo ambiente na
              planta.
            </p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3 bg-transparent p-0 md:ml-[clamp(5rem,12vw,12rem)]">
          <div
            ref={qrPontoRef}
            className="shrink-0 rounded-md border border-slate-200 bg-white p-1.5"
          >
            <QrCodeComLogo
              value={urlPonto}
              size={104}
              level="H"
              includeMargin
              bgColor="#ffffff"
              fgColor="#0f172a"
              logoRatio={0.2}
            />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.15em] text-sky-700">
              Ponto via QR Code
            </p>
            <p className="max-w-[190px] break-words text-sm font-black leading-tight text-slate-950">
              {ponto.nome}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() =>
                  window.open(urlPonto, "_blank", "noopener,noreferrer")
                }
                className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white"
              >
                <ExternalLink size={12} /> Abrir
              </button>
              <button
                type="button"
                onClick={copiarUrlPonto}
                title="Copiar endereço da consulta"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
              >
                <Copy size={12} /> Copiar
              </button>
              <button
                type="button"
                onClick={imprimirQrPonto}
                title="Imprimir QR Code do ponto"
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-slate-600 ring-1 ring-slate-200"
              >
                <Printer size={12} /> Imprimir
              </button>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => (
            setAmbienteEditando(null),
            setAmbientePendente({
              x: 50,
              y: 50,
              nome: "Novo ambiente",
              tipo: TIPOS[0],
              descricao: "",
            })
          )}
          className="relative inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white md:ml-auto md:pl-4 md:before:absolute md:before:left-0 md:before:top-1/2 md:before:h-12 md:before:-translate-y-1/2 md:before:border-l md:before:border-slate-200 md:before:-translate-x-4"
        >
          <Plus size={14} /> Adicionar ambiente
        </button>
      </div>
      <div
        ref={areaRef}
        onClick={clicarPlanta}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={() => {
          setArrastando(null);
          setTemporaria(null);
        }}
        className="relative mt-4 aspect-[4/3] h-auto min-h-0 self-start touch-none overflow-hidden"
      >
        <img
          src={ponto.plantaDetalhada.url}
          alt={`Planta detalhada de ${ponto.nome}`}
          className="absolute inset-0 z-0 h-full w-full object-contain"
        />
        {vinculados.map((item) => {
          const base = posicoes[item.id];
          const posicao =
            arrastando?.tipo === "extintor" &&
            arrastando.id === String(item.id) &&
            temporaria
              ? temporaria
              : base;
          return posicao ? (
            <button
              key={item.id}
              type="button"
              onPointerDown={(evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                setArrastando({ tipo: "extintor", id: String(item.id) });
                areaRef.current?.setPointerCapture?.(evento.pointerId);
              }}
              onClick={(evento) => evento.stopPropagation()}
              style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[8px] font-black text-white shadow-md"
            >
              {item.codigo}
            </button>
          ) : null;
        })}
        {ambientes.map((item, indice) => {
          const posicao =
            arrastando?.tipo === "ambiente" &&
            arrastando.id === item.id &&
            temporaria
              ? temporaria
              : item;
          return (
            <button
              key={item.id}
              type="button"
              onPointerDown={(evento) => {
                evento.preventDefault();
                evento.stopPropagation();
                setArrastando({ tipo: "ambiente", id: item.id });
                areaRef.current?.setPointerCapture?.(evento.pointerId);
              }}
              onClick={(evento) => evento.stopPropagation()}
              style={{ left: `${posicao.x}%`, top: `${posicao.y}%` }}
              className="absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-move items-center justify-center rounded-full border-2 border-white bg-sky-600 text-[9px] font-black text-white shadow-md ring-2 ring-sky-200"
            >
              {String(indice + 1).padStart(2, "0")}
            </button>
          );
        })}
      </div>
      <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.16em] text-emerald-700">
            Extintores vinculados
          </p>
          <div className="space-y-2">
            {vinculados.map((item) => {
              const posicionado = Boolean(posicoes[item.id]);
              return (
                <div
                  key={item.id}
                  className={`flex w-full items-center rounded-lg border text-xs ${extintorSelecionado === String(item.id) && !posicionado ? "border-sky-300 bg-sky-50 text-sky-800 ring-2 ring-sky-100" : posicionado ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700"}`}
                >
                  <button
                    type="button"
                    onClick={() => !posicionado && setExtintorSelecionado(String(item.id))}
                    className="flex min-w-0 flex-1 items-center justify-between px-3 py-2 text-left"
                  >
                    <span>
                      <b className="block">{item.codigo}</b>
                      <small>
                        {posicionado
                          ? "POSICIONADO NA PLANTA"
                          : extintorSelecionado === String(item.id)
                            ? "SELECIONADO - POSICIONE NA PLANTA"
                            : "SELECIONAR PARA POSICIONAR"}
                      </small>
                    </span>
                    {!posicionado && <MapPinned size={15} />}
                  </button>
                  {posicionado && (
                    <button
                      type="button"
                      title="Retirar posição e reorganizar"
                      aria-label={`Retirar ${item.codigo} da planta`}
                      onClick={() => {
                        setExtintorSelecionado("");
                        onPositionRemove?.(item.id);
                      }}
                      className="mr-1.5 rounded-md p-2 text-emerald-700 transition hover:bg-red-100 hover:text-red-700"
                    >
                      <MapPinOff size={15} />
                    </button>
                  )}
                </div>
              );
            })}
            {!vinculados.length && (
              <p className="text-xs text-slate-500">
                Nenhum extintor vinculado.
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-center text-xs font-black uppercase tracking-[0.16em] text-sky-700">
            Ambientes com QR
          </p>
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[70px_minmax(0,1fr)_minmax(0,1fr)_210px] items-center bg-slate-50 px-3 py-2 text-center text-[10px] font-black uppercase tracking-wide text-slate-500">
              <span>Código</span>
              <span>Localização</span>
              <span>Nome do ponto</span>
              <span>Ações</span>
            </div>
            {ambientes.map((item, indice) => {
              const codigo = String(indice + 1).padStart(2, "0");
              return (
                <div
                  key={item.id}
                  className="grid grid-cols-[70px_minmax(0,1fr)_minmax(0,1fr)_210px] items-center border-t border-slate-100 px-3 py-3 text-center text-xs"
                >
                  <span>
                    <b>{codigo}</b>
                    <div id={`qr-controle-${item.id}`} className="sr-only">
                      <QrCodeComLogo
                        value={urlQr(item)}
                        size={180}
                        level="H"
                        includeMargin
                        bgColor="#ffffff"
                        fgColor="#0f172a"
                        logoRatio={0.2}
                      />
                    </div>
                  </span>
                  <span className="truncate text-slate-600">
                    {ponto.nome || "Local não informado"}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-slate-900">{item.nome}</b>
                    <small className="text-slate-500">{item.tipo}</small>
                  </span>
                  <span className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => imprimir(item, codigo)}
                      title="Imprimir QR Code do ambiente"
                      aria-label="Imprimir QR Code do ambiente"
                      className="rounded-md p-1.5 text-sky-600 hover:bg-sky-50"
                    >
                      <Printer size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        window.open(
                          urlQr(item),
                          "_blank",
                          "noopener,noreferrer",
                        )
                      }
                      title="Abrir QR Code do ambiente"
                      aria-label="Abrir QR Code do ambiente"
                      className="rounded-md p-1.5 text-sky-600 hover:bg-sky-50"
                    >
                      <QrCode size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => editarAmbiente(item)}
                      title="Editar ambiente"
                      aria-label="Editar ambiente"
                      className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => excluirAmbiente(item)}
                      title="Excluir ambiente"
                      aria-label="Excluir ambiente"
                      className="rounded-md p-1.5 text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </span>
                </div>
              );
            })}
            {!ambientes.length && (
              <p className="p-4 text-xs text-slate-500">
                Nenhum ambiente cadastrado.
              </p>
            )}
          </div>
        </div>
      </div>
      {ambientePendente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={salvarAmbiente}
            className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                  Novo QR de controle
                </p>
                <h3 className="mt-1 text-lg font-black text-slate-950">
                  Identificar ambiente
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAmbientePendente(null);
                  setAmbienteEditando(null);
                  setTipoPersonalizado("");
                  setTipoPersonalizadoAtivo(false);
                }}
                className="rounded-md p-2 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <label className="mt-4 block text-xs font-bold text-slate-600">
              Nome do ambiente
              <input
                name="nome"
                defaultValue={ambientePendente.nome}
                autoFocus
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Categoria do ambiente
              <select
                name="tipo"
                defaultValue={
                  ambienteEditando && !TIPOS.includes(ambienteEditando.tipo)
                    ? "Tipo personalizado"
                    : ambientePendente.tipo
                }
                onChange={(evento) =>
                  setTipoPersonalizadoAtivo(
                    evento.target.value === "Tipo personalizado",
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              >
                {TIPOS.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
                {categoriasPersonalizadas.map((tipo) => (
                  <option key={tipo}>{tipo}</option>
                ))}
                <option>Tipo personalizado</option>
              </select>
            </label>
            {tipoPersonalizadoAtivo && (
              <input
                value={tipoPersonalizado}
                onChange={(evento) => setTipoPersonalizado(evento.target.value)}
                placeholder="Nome da categoria"
                className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            )}
            <label className="mt-3 block text-xs font-bold text-slate-600">
              Descrição
              <textarea
                name="descricao"
                defaultValue={ambientePendente.descricao}
                rows={2}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
              />
            </label>
            <button
              type="submit"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white"
            >
              <Save size={16} /> Salvar ambiente e gerar QR
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
