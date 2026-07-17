import React, { useMemo, useRef, useState } from "react";
import {
  Edit3,
  ImagePlus,
  MapPin as MapPinned,
  Move,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  criarTokenMapaLocal,
  lerMapaObraLocal,
  salvarMapaObraLocal,
} from "../../services/mapaObraLocalService";
import { listarExtintoresVistoria } from "../../services/extintoresVistoriaService";
import { AmbientesControleTabela } from "./AmbientesControleTabela";
import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";
import mapaAlertaHero from "../../assets/mapa-alerta-hero.webp";

const TIPOS_PONTO = [
  "Escritório",
  "Canteiro",
  "Almoxarifado",
  "Vestiário",
  "Área de refeição",
  "Central de vendas",
  "Placa de sinalização",
  "Outro ponto",
];

const TIPOS_ALERTA = [
  "Buraco ou escavação",
  "Área sem isolamento",
  "Risco de queda",
  "Risco elétrico",
  "Circulação de máquinas",
  "Acesso obstruído",
  "Vazamento",
  "Sinalização inadequada",
  "Falta de EPI",
  "Trabalho em altura",
  "Outro alerta",
];

function compactarImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = reject;
    leitor.onload = () => {
      const imagem = new Image();
      imagem.onerror = reject;
      imagem.onload = () => {
        const escala = Math.min(
          1,
          1800 / Math.max(imagem.naturalWidth, imagem.naturalHeight),
        );
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
        canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
        canvas
          .getContext("2d")
          .drawImage(imagem, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      imagem.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

function ResumoMapaCard({ label, value, detail, tone = "sky" }) {
  const tones = {
    sky: "border-sky-100 bg-sky-50/70 text-sky-700",
    amber: "border-amber-100 bg-amber-50/70 text-amber-700",
    emerald: "border-emerald-100 bg-emerald-50/70 text-emerald-700",
    violet: "border-violet-100 bg-violet-50/70 text-violet-700",
  };
  return (
    <div className={`flex min-h-[92px] flex-col items-center justify-center rounded-lg border px-3 py-3 text-center ${tones[tone] || tones.sky}`}>
      <p className="truncate text-[9px] font-black uppercase tracking-[0.12em]">{label}</p>
      <strong className="mt-1 text-2xl font-black leading-none text-slate-950">{value}</strong>
      <span className="mt-1 truncate text-[10px] font-semibold text-slate-500">{detail}</span>
    </div>
  );
}

export function MapaObraPage({ empresasBanco = [], obrasEmpresasBanco = [], auditoriasCampo = [] }) {
  const [mapa, setMapa] = useState(() => lerMapaObraLocal());
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [modoAdicionarAlerta, setModoAdicionarAlerta] = useState(false);
  const [modoMover, setModoMover] = useState(false);
  const [pontoSelecionado, setPontoSelecionado] = useState(null);
  const [pontoEditando, setPontoEditando] = useState(null);
  const [alertaEditando, setAlertaEditando] = useState(null);
  const [arrastando, setArrastando] = useState(null);
  const plantaRef = useRef(null);
  const [mensagem, setMensagem] = useState("");
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(false);
  const [obraId, setObraId] = useState(() => lerMapaObraLocal().obraId || "");
  const extintores = useMemo(() => listarExtintoresVistoria(), []);
  const pontos = mapa.pontos || [];
  const alertas = mapa.alertas || [];


  const tiposAlertaPersonalizados = useMemo(
    () =>
      Array.from(
        new Set(
          (mapa.tiposAlertaPersonalizados || [])
            .map((tipo) => String(tipo || "").trim())
            .filter(Boolean),
        ),
      ),
    [mapa.tiposAlertaPersonalizados],
  );
  const tiposAlertaDisponiveis = useMemo(
    () => [
      ...TIPOS_ALERTA.slice(0, -1),
      ...tiposAlertaPersonalizados,
      "Outro alerta",
    ],
    [tiposAlertaPersonalizados],
  );
  const tiposAlertaEditando = Array.from(
    new Set(
      (
        Array.isArray(alertaEditando?.tiposSelecionados)
          ? alertaEditando.tiposSelecionados
          : Array.isArray(alertaEditando?.tipos)
            ? alertaEditando.tipos
            : [alertaEditando?.tipo]
      )
        .map((valor) => String(valor || "").trim())
        .filter(Boolean),
    ),
  );
  const tiposAlertaFormulario = Array.from(
    new Set([
      ...tiposAlertaDisponiveis.slice(0, -1),
      ...tiposAlertaEditando,
      "Outro alerta",
    ]),
  );
  const auditoriaIdsAlertaEditando = Array.from(
    new Set(
      (
        Array.isArray(alertaEditando?.auditoriaIdsSelecionados)
          ? alertaEditando.auditoriaIdsSelecionados
          : Array.isArray(alertaEditando?.auditoriaIds)
            ? alertaEditando.auditoriaIds
            : [alertaEditando?.auditoriaId]
      )
        .map((valor) => String(valor || ""))
        .filter(Boolean),
    ),
  );
  const pontoAtual = useMemo(
    () => pontos.find((item) => item.id === pontoSelecionado),
    [pontos, pontoSelecionado],
  );
  const obrasDisponiveis = useMemo(
    () =>
      Array.from(
        new Map(
          obrasEmpresasBanco
            .map((vinculo) => vinculo.obra)
            .filter(Boolean)
            .map((obra) => [String(obra.id), obra]),
        ).values(),
      ),
    [obrasEmpresasBanco],
  );
  const empresasDaObra = useMemo(() => {
    const ids = new Set(
      obrasEmpresasBanco
        .filter(
          (vinculo) =>
            String(vinculo.obra?.id || vinculo.obraId || vinculo.obra_id) ===
            String(obraId),
        )
        .map((vinculo) => String(vinculo.empresaId || vinculo.empresa_id))
        .filter(Boolean),
    );
    return empresasBanco.filter((empresa) => ids.has(String(empresa.id)));
  }, [empresasBanco, obrasEmpresasBanco, obraId]);
  const podeAdicionarPonto = Boolean(mapa.planta && obraId);
  const resumoLocal = useMemo(() => {
    const extintoresPosicionados = Array.from(
      new Set(pontos.flatMap((ponto) => ponto.extintores || []).map(String)),
    );
    const ambientes = pontos.reduce(
      (total, ponto) => total + (Array.isArray(ponto.pontosInternosPlanta) ? ponto.pontosInternosPlanta.length : 0),
      0,
    );
    const auditoriasAbertas = (Array.isArray(auditoriasCampo) ? auditoriasCampo : []).filter((auditoria) => {
      const status = String(auditoria.statusAuditoria || auditoria.status_auditoria || auditoria.status || "aberta").toLowerCase();
      return !["concluída", "concluida", "encerrada", "fechada", "resolvida"].includes(status);
    });
    const auditoriasCriticas = auditoriasAbertas.filter((auditoria) =>
      /crit|alto|grave/i.test(String(auditoria.grauRisco || auditoria.grau_risco || auditoria.classificacao || "")),
    );
    const extintoresAtivos = extintores.filter((extintor) =>
      String(extintor.status || "Ativo").toLowerCase() === "ativo",
    ).length;
    const alertaExtintor = extintores.find((extintor) =>
      String(extintor.status || "Ativo").toLowerCase() !== "ativo",
    );
    return {
      pontos: pontos.length,
      auditoriasAbertas: auditoriasAbertas.length,
      auditoriasCriticas: auditoriasCriticas.length,
      extintoresPosicionados: extintoresPosicionados.length,
      extintoresAtivos,
      ambientes,
      alertaExtintor,
    };
  }, [auditoriasCampo, extintores, pontos]);

  function atualizarMapa(proximo) {
    if (
      proximo?.obraId &&
      String(proximo.obraId) !== String(mapa.obraId || "")
    ) {
      const mapaDaObra = lerMapaObraLocal(proximo.obraId);
      const selecionado = {
        ...mapaDaObra,
        obraId: proximo.obraId,
        obraNome: proximo.obraNome || mapaDaObra.obraNome,
      };
      setMapa(selecionado);
      setAlteracoesPendentes(false);
      return;
    }
    setMapa(proximo);
    setAlteracoesPendentes(true);
    // Persiste cada operação para evitar perda após recarregar a página.
    salvarMapaObraLocal(proximo);
  }

  function salvarAlteracoes() {
    if (!mapa.obraId) {
      setMensagem("Selecione uma obra antes de salvar.");
      return;
    }
    salvarMapaObraLocal(mapa);
    setAlteracoesPendentes(false);
    setMensagem("Alterações salvas com sucesso.");
  }

  function carregarPlanta(evento) {
    const arquivo = evento.target.files?.[0];
    if (
      !arquivo ||
      !["image/png", "image/jpeg", "image/jpg"].includes(arquivo.type)
    ) {
      setMensagem("Envie a planta em PNG, JPG ou JPEG.");
      return;
    }
    if (arquivo.size > 0) {
      compactarImagem(arquivo)
        .then((url) => {
          atualizarMapa({ ...mapa, planta: { nome: arquivo.name, url } });
          setMensagem("Planta compactada e salva localmente para validação.");
        })
        .catch(() =>
          setMensagem("Não foi possível preparar a planta para armazenamento."),
        );
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      atualizarMapa({
        ...mapa,
        planta: { nome: arquivo.name, url: leitor.result },
      });
      setMensagem("Planta salva localmente para validação.");
    };
    leitor.readAsDataURL(arquivo);
  }

  function criarPonto(evento) {
    if ((!modoAdicionar && !modoAdicionarAlerta) || !mapa.planta) return;
    if (!obraId) {
      setMensagem("Selecione a obra antes de cadastrar um ponto.");
      setModoAdicionar(false);
      setModoAdicionarAlerta(false);
      return;
    }
    const caixa = evento.currentTarget.getBoundingClientRect();
    const x = Number(
      (((evento.clientX - caixa.left) / caixa.width) * 100).toFixed(2),
    );
    const y = Number(
      (((evento.clientY - caixa.top) / caixa.height) * 100).toFixed(2),
    );
    if (modoAdicionarAlerta) {
      setAlertaEditando({
        id: `alerta-${Date.now()}`,
        nome: "Novo alerta",
        tipo: TIPOS_ALERTA[0],
        tipos: [TIPOS_ALERTA[0]],
        tiposSelecionados: [TIPOS_ALERTA[0]],
        tipoPersonalizadoAtivo: false,
        tipoPersonalizado: "",
        auditoriaId: "",
        auditoriaIds: [],
        auditoriaIdsSelecionados: [],
        prioridade: "Alta",
        status: "Aberto",
        descricao: "",
        x,
        y,
        criadoEm: new Date().toISOString(),
      });
      setModoAdicionarAlerta(false);
      return;
    }
    const ponto = {
      id: `ponto-${Date.now()}`,
      token: criarTokenMapaLocal(),
      nome: "Novo ponto",
      tipo: "Outro ponto",
      descricao: "",
      x,
      y,
      cor: "#2563eb",
      status: "Ativo",
      empresaId: "",
      empresaNome: "",
      criadoEm: new Date().toISOString(),
    };
    atualizarMapa({ ...mapa, pontos: [...pontos, ponto] });
    setPontoEditando(ponto);
    setPontoSelecionado(ponto.id);
    setModoAdicionar(false);
  }

  function salvarAlerta(evento) {
    evento.preventDefault();

    const dados = new FormData(evento.currentTarget);
    const pontoId = String(dados.get("pontoId") || "");

    const tiposSelecionados = Array.from(
      new Set(
        (
          Array.isArray(alertaEditando?.tiposSelecionados)
            ? alertaEditando.tiposSelecionados
            : []
        )
          .map((valor) => String(valor || "").trim())
          .filter(Boolean),
      ),
    );

    const tipoPersonalizado = String(
      alertaEditando?.tipoPersonalizado || "",
    ).trim();

    if (
      alertaEditando?.tipoPersonalizadoAtivo &&
      !tipoPersonalizado
    ) {
      setMensagem("Informe o novo tipo de alerta.");
      return;
    }

    const tipos = Array.from(
      new Set([
        ...tiposSelecionados,
        ...(alertaEditando?.tipoPersonalizadoAtivo
          ? [tipoPersonalizado]
          : []),
      ]),
    ).filter((tipo) => tipo && tipo !== "Outro alerta");

    if (tipos.length === 0) {
      setMensagem("Selecione pelo menos um tipo de alerta.");
      return;
    }

    const auditoriaIds = Array.from(
      new Set(
        (
          Array.isArray(alertaEditando?.auditoriaIdsSelecionados)
            ? alertaEditando.auditoriaIdsSelecionados
            : []
        )
          .map((valor) => String(valor || ""))
          .filter(Boolean),
      ),
    );

    const auditoriasVinculadas = auditoriaIds
      .map((auditoriaId) =>
        auditoriasCampo.find((item, indice) => {
          const id = String(
            item.id ||
              item.uuid ||
              item.codigo ||
              item.numeroAuditoria ||
              indice,
          );

          return id === auditoriaId;
        }),
      )
      .filter(Boolean);

    const auditoriaTitulos = auditoriasVinculadas.map(
      (item, indice) =>
        String(
          item.numeroAuditoria ||
            item.codigo ||
            item.titulo ||
            item.nome ||
            `Auditoria ${indice + 1}`,
        ),
    );

    const pontoVinculado = pontos.find(
      (item) => String(item.id) === pontoId,
    );

    const proximo = {
      ...alertaEditando,
      nome:
        String(dados.get("nome") || "").trim() ||
        "Alerta da obra",
      tipos,
      tipo: tipos[0],
      prioridade: String(
        dados.get("prioridade") || "Alta",
      ),
      status: String(dados.get("status") || "Aberto"),
      descricao: String(
        dados.get("descricao") || "",
      ).trim(),
      pontoId,
      pontoNome: pontoVinculado?.nome || "",
      auditoriaIds,
      auditoriaTitulos,
      auditoriaId: auditoriaIds[0] || "",
      auditoriaTitulo: auditoriaTitulos[0] || "",
      atualizadoEm: new Date().toISOString(),
    };

    delete proximo.tiposSelecionados;
    delete proximo.tipoOpcao;
    delete proximo.tipoPersonalizadoAtivo;
    delete proximo.tipoPersonalizado;
    delete proximo.auditoriaIdsSelecionados;

    const existe = alertas.some(
      (item) => item.id === proximo.id,
    );

    const tiposPersonalizadosEmUso = tipos.filter(
      (tipo) => !TIPOS_ALERTA.includes(tipo),
    );

    const catalogoAtualizado = Array.from(
      new Set([
        ...tiposAlertaPersonalizados,
        ...tiposPersonalizadosEmUso,
      ]),
    );

    atualizarMapa({
      ...mapa,
      tiposAlertaPersonalizados: catalogoAtualizado,
      alertas: existe
        ? alertas.map((item) =>
            item.id === proximo.id ? proximo : item,
          )
        : [...alertas, proximo],
    });

    setAlertaEditando(null);
    setMensagem("Alerta salvo no mapa da obra.");
  }

  function excluirAlerta() {
    if (!alertaEditando) return;
    atualizarMapa({
      ...mapa,
      alertas: alertas.filter((item) => item.id !== alertaEditando.id),
    });
    setAlertaEditando(null);
    setMensagem("Alerta removido do mapa.");
  }

  function abrirAlertaParaEdicao(alerta) {
    const tipos = Array.from(
      new Set(
        (
          Array.isArray(alerta?.tipos)
            ? alerta.tipos
            : [alerta?.tipo || TIPOS_ALERTA[0]]
        )
          .map((valor) => String(valor || "").trim())
          .filter(Boolean),
      ),
    );

    const auditoriaIds = Array.from(
      new Set(
        (
          Array.isArray(alerta?.auditoriaIds)
            ? alerta.auditoriaIds
            : [alerta?.auditoriaId]
        )
          .map((valor) => String(valor || ""))
          .filter(Boolean),
      ),
    );

    setAlertaEditando({
      ...alerta,
      tiposSelecionados:
        tipos.length > 0 ? tipos : [TIPOS_ALERTA[0]],
      tipoPersonalizadoAtivo: false,
      tipoPersonalizado: "",
      auditoriaIdsSelecionados: auditoriaIds,
    });
  }

  function alternarTipoAlerta(tipo) {
    const valor = String(tipo || "").trim();
    if (!valor) return;

    setAlertaEditando((atual) => {
      if (!atual) return atual;

      if (valor === "Outro alerta") {
        const ativo = !Boolean(atual.tipoPersonalizadoAtivo);

        return {
          ...atual,
          tipoPersonalizadoAtivo: ativo,
          tipoPersonalizado: ativo
            ? atual.tipoPersonalizado || ""
            : "",
        };
      }

      const selecionados = Array.from(
        new Set(
          (
            Array.isArray(atual.tiposSelecionados)
              ? atual.tiposSelecionados
              : []
          )
            .map((item) => String(item || "").trim())
            .filter(Boolean),
        ),
      );

      return {
        ...atual,
        tiposSelecionados: selecionados.includes(valor)
          ? selecionados.filter((item) => item !== valor)
          : [...selecionados, valor],
      };
    });
  }

  function alternarAuditoriaAlerta(auditoriaId) {
    const valor = String(auditoriaId || "");
    if (!valor) return;

    setAlertaEditando((atual) => {
      if (!atual) return atual;

      const selecionados = Array.from(
        new Set(
          (
            Array.isArray(atual.auditoriaIdsSelecionados)
              ? atual.auditoriaIdsSelecionados
              : []
          )
            .map((item) => String(item || ""))
            .filter(Boolean),
        ),
      );

      return {
        ...atual,
        auditoriaIdsSelecionados: selecionados.includes(valor)
          ? selecionados.filter((item) => item !== valor)
          : [...selecionados, valor],
      };
    });
  }

  function excluirTipoAlertaPersonalizado(tipo) {
    const nome = String(tipo || "").trim();
    if (!nome || !tiposAlertaPersonalizados.includes(nome)) return;

    const totalEmUso = alertas.filter((item) => {
      const tiposDoAlerta = Array.isArray(item.tipos)
        ? item.tipos
        : [item.tipo];

      return tiposDoAlerta.some(
        (tipoAlerta) =>
          String(tipoAlerta || "").trim() === nome,
      );
    }).length;

    const complemento = totalEmUso
      ? ` ${totalEmUso} alerta(s) existente(s) manterão este tipo.`
      : "";

    if (
      !window.confirm(
        `Remover "${nome}" da lista de tipos personalizados?${complemento}`,
      )
    )
      return;

    atualizarMapa({
      ...mapa,
      tiposAlertaPersonalizados:
        tiposAlertaPersonalizados.filter(
          (item) => item !== nome,
        ),
    });

    setMensagem(
      totalEmUso
        ? "Tipo removido da lista. Os alertas existentes foram preservados."
        : "Tipo personalizado removido da lista.",
    );
  }

  function arrastarPonto(evento) {
    if (!arrastando) return;
    const caixa = plantaRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const x = Math.max(
      0,
      Math.min(
        100,
        Number(
          (((evento.clientX - caixa.left) / caixa.width) * 100).toFixed(2),
        ),
      ),
    );
    const y = Math.max(
      0,
      Math.min(
        100,
        Number(
          (((evento.clientY - caixa.top) / caixa.height) * 100).toFixed(2),
        ),
      ),
    );
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) =>
        item.id === arrastando
          ? { ...item, x, y, atualizadoEm: new Date().toISOString() }
          : item,
      ),
    });
  }

  function salvarPonto(evento) {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const empresaId = String(
      dados.get("empresaId") || pontoEditando.empresaId || "",
    );
    const empresaSelecionada = empresasDaObra.find(
      (empresa) => String(empresa.id) === empresaId,
    );
    const proximo = {
      ...pontoEditando,
      nome: String(dados.get("nome") || "").trim() || "Ponto sem nome",
      tipo: String(dados.get("tipo") || "Outro ponto"),
      descricao: String(dados.get("descricao") || "").trim(),
      status: String(dados.get("status") || "Ativo"),
      empresaId,
      empresaNome: empresaSelecionada?.nome || "Ponto compartilhado",
      atualizadoEm: new Date().toISOString(),
    };
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) => (item.id === proximo.id ? proximo : item)),
    });
    setPontoEditando(null);
    setMensagem("Ponto salvo localmente.");
  }

  function excluirPonto() {
    if (!pontoAtual || !window.confirm(`Excluir ${pontoAtual.nome}?`)) return;
    atualizarMapa({
      ...mapa,
      pontos: pontos.filter((item) => item.id !== pontoAtual.id),
    });
    setPontoSelecionado(null);
  }

  function carregarPlantaDetalhada(evento) {
    if (!pontoAtual) return;
    const arquivo = evento.target.files?.[0];
    if (!arquivo || !arquivo.type.startsWith("image/")) {
      setMensagem("Envie a planta detalhada como imagem.");
      return;
    }
    compactarImagem(arquivo)
      .then((url) => {
        atualizarMapa({
          ...mapa,
          pontos: pontos.map((item) =>
            item.id === pontoAtual.id
              ? { ...item, plantaDetalhada: { nome: arquivo.name, url } }
              : item,
          ),
        });
        setMensagem("Planta detalhada compactada e vinculada localmente.");
      })
      .catch(() =>
        setMensagem(
          "Não foi possível preparar a planta detalhada para armazenamento.",
        ),
      );
  }

  function alternarExtintor(extintorId) {
    if (!pontoAtual) return;
    const vinculados = Array.isArray(pontoAtual.extintores)
      ? pontoAtual.extintores
      : [];
    const alocadoEmOutroPonto = pontos.some(
      (item) =>
        item.id !== pontoAtual.id &&
        (item.extintores || []).some((id) => String(id) === String(extintorId)),
    );
    if (
      alocadoEmOutroPonto &&
      !vinculados.some((id) => String(id) === String(extintorId))
    ) {
      setMensagem("Este extintor já está alocado em outro ponto da obra.");
      return;
    }
    const proximo = vinculados.includes(extintorId)
      ? vinculados.filter((id) => id !== extintorId)
      : [...vinculados, extintorId];
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) =>
        item.id === pontoAtual.id ? { ...item, extintores: proximo } : item,
      ),
    });
  }

  function estaAlocadoEmOutroPonto(extintorId) {
    if (!pontoAtual) return false;
    return pontos.some(
      (item) =>
        item.id !== pontoAtual.id &&
        (item.extintores || []).some((id) => String(id) === String(extintorId)),
    );
  }

  function salvarPosicaoExtintor(extintorId, x, y) {
    if (!pontoAtual) return;
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) =>
        item.id === pontoAtual.id
          ? {
              ...item,
              extintorPosicoes: {
                ...(item.extintorPosicoes || {}),
                [extintorId]: { x, y },
              },
            }
          : item,
      ),
    });
  }

  function removerPosicaoExtintor(extintorId) {
    if (!pontoAtual) return;
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) => {
        if (item.id !== pontoAtual.id) return item;
        const proximasPosicoes = { ...(item.extintorPosicoes || {}) };
        delete proximasPosicoes[extintorId];
        return { ...item, extintorPosicoes: proximasPosicoes };
      }),
    });
  }

  function salvarPontosInternos(pontosInternos) {
    if (!pontoAtual) return;
    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) =>
        item.id === pontoAtual.id
          ? {
              ...item,
              pontosInternosPlanta: pontosInternos,
              atualizadoEm: new Date().toISOString(),
            }
          : item,
      ),
    });
  }

  return (
    <section className="mapa-obra-shell -mt-3 min-h-full bg-slate-50/70 px-4 pb-6 pt-0 md:-mt-4 md:px-7 md:pb-8 md:pt-0">
      <div className="mx-auto max-w-[1480px] space-y-5">
        <style>{`.mapa-obra-shell > div > header, .mapa-obra-shell > div > .flex.justify-end { display: none; } .mapa-obra-shell button.absolute { width: 24px !important; height: 24px !important; border-width: 2px !important; } .mapa-obra-shell button.absolute svg { width: 12px !important; height: 12px !important; stroke-width: 2.4 !important; display: block; margin: auto; } .mapa-obra-shell .bg-red-600 { width: 24px !important; height: 24px !important; font-size: 8px !important; }`}</style>
        <section className="relative min-h-[112px] overflow-hidden rounded-[22px] border border-slate-700 bg-slate-900 shadow-[0_10px_28px_rgba(26,35,50,0.12)]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${dashboardHeroBackground})` }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.78)_0%,rgba(15,23,42,0.52)_45%,rgba(15,23,42,0.18)_100%)]" />
          <div className="relative flex min-h-[112px] flex-col justify-between gap-3 px-5 py-3 text-white lg:flex-row lg:items-center">
            <div style={{ textShadow: "0 2px 10px rgba(0,0,0,0.65)" }}>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">
                <MapPinned size={15} /> Mapa da obra
              </p>
              <h1 className="mt-1 text-xl font-black leading-tight md:text-2xl">
                Mapa Interativo da Obra
              </h1>
              <p className="mt-1 text-xs font-semibold text-slate-200">
                Cadastre a planta geral e crie pontos de referência para
                orientar a equipe.
              </p>
              <div className="mt-2 h-0.5 w-12 rounded-full bg-emerald-400" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950/90 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800">
                <ImagePlus size={17} /> Enviar planta
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  className="sr-only"
                  onChange={carregarPlanta}
                />
              </label>
              <button
                type="button"
                onClick={salvarAlteracoes}
                disabled={!alteracoesPendentes}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
              >
                <Save size={16} />{" "}
                {alteracoesPendentes ? "Salvar alterações" : "Tudo salvo"}
              </button>
            </div>
          </div>
        </section>
        <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-sky-700">
              <MapPinned size={15} /> Mapa da obra
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950">
              Mapa Interativo da Obra
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Cadastre a planta geral e crie pontos de referência para orientar
              a equipe.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-slate-800">
            <ImagePlus size={17} /> Enviar planta
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="sr-only"
              onChange={carregarPlanta}
            />
          </label>
        </header>
        {mensagem && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800">
            {mensagem}
          </div>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={salvarAlteracoes}
            disabled={!alteracoesPendentes}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Save size={16} />{" "}
            {alteracoesPendentes ? "Salvar alterações" : "Tudo salvo"}
          </button>
        </div>

        <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
          <div className="relative h-full scroll-mt-3 self-stretch rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-slate-950">
                  Planta geral da obra
                </h2>

              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto">
                <label className="flex h-8 w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-[10px] font-bold text-slate-500 sm:w-[350px]">
                  <span className="shrink-0">Obra</span>
                  <select
                    value={obraId}
                    onChange={(evento) => {
                      const valor = evento.target.value;
                      const obra = obrasDisponiveis.find(
                        (item) => String(item.id) === String(valor),
                      );
                      setObraId(valor);
                      atualizarMapa({
                        ...mapa,
                        obraId: valor,
                        obraNome: obra?.nome || "",
                      });
                    }}
                    className="h-7 min-w-0 flex-1 border-0 bg-transparent pl-1 pr-6 text-[11px] font-semibold text-slate-700 outline-none focus:ring-0"
                  >
                    <option value="">Selecione a obra</option>
                    {obrasDisponiveis.map((obra) => (
                      <option key={obra.id} value={obra.id}>
                        {obra.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                type="button"
                onClick={() => {
                  setModoMover((atual) => !atual);
                  setModoAdicionar(false);
                  setModoAdicionarAlerta(false);
                  setArrastando(null);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${modoMover ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}
              >
                <Move size={14} /> {modoMover ? "Concluir posições" : "Editar posições"}
              </button>
              <button
                type="button"
                disabled={!podeAdicionarPonto}
                onClick={() => {
                  setModoAdicionarAlerta((atual) => !atual);
                  setModoAdicionar(false);
                  setModoMover(false);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${modoAdicionarAlerta ? "bg-amber-100 text-amber-900" : "bg-amber-500 text-slate-950"} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400`}
              >
                <TriangleAlert size={15} /> {modoAdicionarAlerta ? "Marque na planta" : "Criar alerta"}
              </button>
              <button
                type="button"
                disabled={!podeAdicionarPonto}
                onClick={() => {
                  if (!obraId) {
                    setMensagem("Selecione a obra antes de adicionar pontos.");
                    return;
                  }
                  setModoAdicionar((atual) => !atual);
                  setModoAdicionarAlerta(false);
                  setModoMover(false);
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${modoAdicionar ? "bg-sky-100 text-sky-800" : "bg-slate-950 text-white"} disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400`}
              >
                <Plus size={15} />{" "}
                {modoAdicionar ? "Clique na planta" : "Adicionar ponto"}
              </button>
              </div>
            </div>
            <div
              ref={plantaRef}
              onClick={criarPonto}
              onPointerMove={arrastarPonto}
              onPointerUp={(evento) => {
                if (arrastando) {
                  plantaRef.current?.releasePointerCapture?.(evento.pointerId);
                  setMensagem("Ponto fixado na nova posição.");
                  setModoMover(false);
                }
                setArrastando(null);
              }}
              onPointerCancel={() => {
                setArrastando(null);
                setModoMover(false);
              }}
              onPointerLeave={(evento) => {
                if (!plantaRef.current?.hasPointerCapture?.(evento.pointerId))
                  setArrastando(null);
              }}
              className={`relative h-fit min-h-0 touch-none overflow-hidden rounded-lg border border-dashed border-slate-300 bg-slate-100 ${!mapa.planta?.url ? "min-h-[320px]" : ""} ${modoAdicionar || modoAdicionarAlerta ? "cursor-crosshair" : modoMover ? "cursor-move" : ""}`}
            >
              {mapa.planta?.url ? (
                <img
                  src={mapa.planta.url}
                  alt="Planta geral da obra"
                  className="relative z-0 block h-auto max-h-[680px] w-full object-contain"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400">
                  <ImagePlus size={38} />
                  <p className="mt-3 text-sm font-bold">
                    Envie uma planta para começar
                  </p>
                  <p className="mt-1 text-xs">
                    PNG ou JPG · os pontos serão posicionados em porcentagem
                  </p>
                </div>
              )}
              {pontos.map((ponto) => (
                <button
                  key={ponto.id}
                  type="button"
                  title={
                    modoMover
                      ? `${ponto.nome} · arraste para reposicionar`
                      : `${ponto.nome} · posição fixa`
                  }
                  onPointerDown={(evento) => {
                    if (!modoMover) return;
                    evento.preventDefault();
                    evento.stopPropagation();
                    setArrastando(ponto.id);
                    plantaRef.current?.setPointerCapture?.(evento.pointerId);
                  }}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    setPontoSelecionado(ponto.id);
                  }}
                  style={{
                    left: `${ponto.x}%`,
                    top: `${ponto.y}%`,
                    backgroundColor: ponto.cor,
                  }}
                  className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition ${modoMover ? "cursor-move hover:scale-110" : "cursor-pointer"} ${pontoSelecionado === ponto.id ? "ring-4 ring-sky-200" : ""}`}
                >
                  <MapPinned size={15} />
                </button>
              ))}
              {alertas.map((alerta) => (
                <button
                  key={alerta.id}
                  type="button"
                  title={`${alerta.tipo} · ${alerta.status}`}
                  onClick={(evento) => {
                    evento.stopPropagation();
                    abrirAlertaParaEdicao(alerta);
                  }}
                  style={{ left: `${alerta.x}%`, top: `${alerta.y}%` }}
                  className={`absolute z-10 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white shadow-lg transition hover:scale-110 ${alerta.status === "Resolvido" ? "bg-slate-500" : alerta.prioridade === "Crítica" ? "bg-red-700" : "bg-amber-500"}`}
                >
                  <TriangleAlert size={14} />
                </button>
              ))}
            </div>
            <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-3 flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2">
                  <MapPinned size={15} className="shrink-0 text-sky-600" />
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                    Visão geral da obra
                  </p>
                </div>
                <div className="flex min-w-0 flex-col items-center gap-0.5">
                  <p className="text-[10px] text-slate-500">
                    Indicadores da planta e dos controles vinculados à obra.
                  </p>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <ResumoMapaCard label="Pontos cadastrados" value={resumoLocal.pontos} detail={resumoLocal.pontos ? "100% mapeados" : "Nenhum ponto"} tone="sky" />
                <ResumoMapaCard label="Auditorias abertas" value={resumoLocal.auditoriasAbertas} detail={`${resumoLocal.auditoriasCriticas} crítica(s)`} tone="amber" />
                <ResumoMapaCard label="Extintores posicionados" value={resumoLocal.extintoresPosicionados} detail={`${extintores.length} cadastrados`} tone="emerald" />
                <ResumoMapaCard label="Ambientes com QR" value={resumoLocal.ambientes} detail={resumoLocal.ambientes ? "Cadastrados na planta" : "Nenhum ambiente"} tone="violet" />
              </div>
              {resumoLocal.alertaExtintor && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs">
                  <div className="flex min-w-0 items-center gap-2 text-red-800">
                    <span className="font-black uppercase tracking-wide">Alerta recente</span>
                    <span className="truncate font-semibold">{resumoLocal.alertaExtintor.codigo} · {resumoLocal.alertaExtintor.localizacao || "Local não informado"}</span>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-1 font-black text-red-700">{resumoLocal.alertaExtintor.status}</span>
                </div>
              )}
            </section>
          </div>
          <aside className="flex h-full min-h-0 flex-col gap-2 xl:self-stretch xl:sticky xl:top-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-sky-700">
                    Pontos cadastrados
                  </p>
                </div>
                <Move size={19} className="text-slate-400" />
              </div>
              <div className={`mt-3 space-y-2 ${pontos.length > 6 ? "max-h-[336px] overflow-y-auto pr-1" : ""}`}>
                {pontos.map((ponto) => (
                  <button
                    key={ponto.id}
                    type="button"
                    onClick={() => setPontoSelecionado(ponto.id)}
                    className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left transition ${pontoSelecionado === ponto.id ? "border-sky-300 bg-sky-50" : "border-slate-100 hover:border-slate-200 hover:bg-slate-50"}`}
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block break-words text-xs font-black leading-4 text-slate-800">
                        {ponto.nome}
                      </b>
                      <small className="sr-only">
                        {ponto.tipo} · {ponto.x}% / {ponto.y}%
                      </small>
                      <small className="mt-0.5 block truncate text-[10px] text-slate-500">
                        {ponto.tipo}
                      </small>
                    </span>
                    <Edit3 size={15} className="shrink-0 text-slate-400" />
                  </button>
                ))}
                {!pontos.length && (
                  <p className="text-sm text-slate-500">
                    Adicione o primeiro ponto clicando na planta.
                  </p>
                )}
              </div>
            </div>
            {pontoAtual && (
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm xl:mt-auto">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
                      Detalhes do ponto
                    </p>
                    <h2 className="mt-1 truncate text-lg font-black text-slate-950">
                      {pontoAtual.nome}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPontoSelecionado(null)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={17} />
                  </button>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Info titulo="Tipo" valor={pontoAtual.tipo} />
                  <Info titulo="Status" valor={pontoAtual.status} />
                  <Info
                    titulo="Descrição"
                    valor={pontoAtual.descricao || "Sem descrição"}
                    stacked
                  />
                </dl>
                <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-2 py-2 text-center text-[11px] font-bold text-slate-600 hover:bg-sky-50">
                    <ImagePlus size={16} className="shrink-0" />
                    <span className="truncate">{pontoAtual.plantaDetalhada ? "Trocar planta" : "Adicionar planta"}</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="sr-only"
                    onChange={carregarPlantaDetalhada}
                  />
                  </label>
                  {pontoAtual.plantaDetalhada?.url && <img src={pontoAtual.plantaDetalhada.url} alt={`Planta detalhada de ${pontoAtual.nome}`} className="h-12 w-20 shrink-0 rounded-md border border-slate-200 bg-white object-contain" />}
                </div>
                <div className="mt-4">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Extintores vinculados
                  </p>
                  <div className="mt-2 max-h-[160px] space-y-1 overflow-auto pr-1">
                    {extintores
                      .filter(
                        (extintor) =>
                          !estaAlocadoEmOutroPonto(extintor.id),
                      )
                      .map((extintor) => (
                        <label
                          key={extintor.id}
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={(pontoAtual.extintores || []).some(
                              (id) => String(id) === String(extintor.id),
                            )}
                            onChange={() => alternarExtintor(extintor.id)}
                          />
                          {extintor.codigo} · {extintor.localizacao}
                        </label>
                      ))}
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPontoEditando(pontoAtual)}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-bold text-white"
                  >
                    <Edit3 size={14} /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={excluirPonto}
                    className="rounded-lg bg-red-50 px-3 py-2 text-red-700"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
        {pontoAtual && (
          <div className="scroll-mt-3">
            <AmbientesControleTabela
              ponto={pontoAtual}
              extintores={extintores}
              onPositionChange={salvarPosicaoExtintor}
              onPositionRemove={removerPosicaoExtintor}
              onPontosInternosChange={salvarPontosInternos}
            />
          </div>
        )}
        {pontoEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <form
              onSubmit={salvarPonto}
              className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black text-slate-950">
                  Dados do ponto
                </h2>
                <button
                  type="button"
                  onClick={() => setPontoEditando(null)}
                  className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X size={18} />
                </button>
              </div>
              <label className="mt-4 block text-xs font-bold text-slate-600">
                Nome
                <input
                  name="nome"
                  defaultValue={pontoEditando.nome}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="mt-3 block text-xs font-bold text-slate-600">
                Tipo
                <select
                  name="tipo"
                  defaultValue={pontoEditando.tipo}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  {TIPOS_PONTO.map((tipo) => (
                    <option key={tipo}>{tipo}</option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-bold text-slate-600">
                Empresa responsável
                <select
                  name="empresaId"
                  defaultValue={pontoEditando.empresaId || ""}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="">Ponto compartilhado</option>
                  {empresasDaObra.map((empresa) => (
                    <option key={empresa.id} value={empresa.id}>
                      {empresa.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs font-bold text-slate-600">
                Descrição
                <textarea
                  name="descricao"
                  defaultValue={pontoEditando.descricao}
                  rows={3}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="mt-3 block text-xs font-bold text-slate-600">
                Status
                <select
                  name="status"
                  defaultValue={pontoEditando.status}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option>Ativo</option>
                  <option>Inativo</option>
                </select>
              </label>
              <button
                type="submit"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white"
              >
                <Save size={16} /> Salvar ponto
              </button>
            </form>
          </div>
        )}
        {alertaEditando && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/55 p-4">
            <form onSubmit={salvarAlerta} className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
              <div className="relative flex min-h-[132px] items-center justify-between overflow-hidden px-6 py-5 text-white">
                <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${mapaAlertaHero})` }} />
                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/20" />
                <div className="relative flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-400 text-slate-950"><TriangleAlert size={20} /></span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Alerta da obra</p>
                    <h2 className="text-lg font-black">Registrar ponto de atenção</h2>
                  </div>
                </div>
                <button type="button" onClick={() => setAlertaEditando(null)} className="relative rounded-md p-2 text-white hover:bg-white/10"><X size={18} /></button>
              </div>
              <div className="grid gap-3 p-5 sm:grid-cols-2">
                <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Título
                  <input name="nome" defaultValue={alertaEditando.nome} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-bold text-slate-600">
                    Tipos de alerta
                  </legend>
                  <p className="mt-1 text-[11px] font-normal text-slate-500">
                    Selecione um ou mais tipos para o mesmo alerta.
                  </p>
                  <div className="mt-1.5 max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                    {tiposAlertaFormulario.map((tipo) => {
                      const personalizado =
                        tiposAlertaPersonalizados.includes(tipo);
                      const marcado =
                        tipo === "Outro alerta"
                          ? Boolean(
                              alertaEditando.tipoPersonalizadoAtivo,
                            )
                          : tiposAlertaEditando.includes(tipo);

                      return (
                        <div
                          key={tipo}
                          className={`flex items-center rounded-md ${
                            marcado
                              ? "bg-amber-50"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() =>
                                alternarTipoAlerta(tipo)
                              }
                              className="h-4 w-4 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                            />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                              {tipo}
                            </span>
                          </label>
                          {personalizado && (
                            <button
                              type="button"
                              onClick={() =>
                                excluirTipoAlertaPersonalizado(tipo)
                              }
                              className="mr-1 grid h-8 w-8 shrink-0 place-items-center rounded-md text-red-500 hover:bg-red-50 hover:text-red-700"
                              title={`Excluir o tipo ${tipo}`}
                              aria-label={`Excluir o tipo ${tipo}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </fieldset>
                {alertaEditando.tipoPersonalizadoAtivo && (
                  <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
                    Novo tipo de alerta
                    <input
                      value={alertaEditando.tipoPersonalizado || ""}
                      onChange={(evento) =>
                        setAlertaEditando((atual) =>
                          atual
                            ? {
                                ...atual,
                                tipoPersonalizado:
                                  evento.target.value,
                              }
                            : atual,
                        )
                      }
                      required
                      maxLength={80}
                      placeholder="Digite o novo tipo de alerta"
                      className="mt-1.5 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    />
                  </label>
                )}
                <label className="block text-xs font-bold text-slate-600">Prioridade
                  <select name="prioridade" defaultValue={alertaEditando.prioridade || "Alta"} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                    <option>Baixa</option><option>Média</option><option>Alta</option><option>Crítica</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-600">Status
                  <select name="status" defaultValue={alertaEditando.status || "Aberto"} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                    <option value="Aberto">Aberto</option><option value="Em tratamento">Em andamento</option><option value="Resolvido">Fechado</option>
                  </select>
                </label>
                <label className="block text-xs font-bold text-slate-600">Ponto de referência
                  <select name="pontoId" defaultValue={alertaEditando.pontoId || ""} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm">
                    <option value="">Sem ponto vinculado</option>
                    {pontos.map((ponto) => <option key={ponto.id} value={ponto.id}>{ponto.nome}</option>)}
                  </select>
                </label>
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-bold text-slate-600">
                    Auditorias relacionadas
                  </legend>
                  <p className="mt-1 text-[11px] font-normal text-slate-500">
                    Selecione zero, uma ou várias auditorias.
                  </p>
                  <div className="mt-1.5 max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                    {auditoriasCampo.map((auditoria, indice) => {
                      const id = String(
                        auditoria.id ||
                          auditoria.uuid ||
                          auditoria.codigo ||
                          auditoria.numeroAuditoria ||
                          indice,
                      );
                      const rotulo =
                        auditoria.numeroAuditoria ||
                        auditoria.codigo ||
                        auditoria.titulo ||
                        auditoria.nome ||
                        `Auditoria ${indice + 1}`;

                      return (
                        <label
                          key={id}
                          className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <input
                            type="checkbox"
                            checked={auditoriaIdsAlertaEditando.includes(
                              id,
                            )}
                            onChange={() =>
                              alternarAuditoriaAlerta(id)
                            }
                            className="h-4 w-4 shrink-0 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {rotulo}
                          </span>
                        </label>
                      );
                    })}
                    {auditoriasCampo.length === 0 && (
                      <p className="px-2 py-3 text-center text-xs text-slate-400">
                        Nenhuma auditoria disponível para vincular.
                      </p>
                    )}
                  </div>
                </fieldset>
                <label className="block text-xs font-bold text-slate-600 sm:col-span-2">Descrição
                  <textarea name="descricao" defaultValue={alertaEditando.descricao} rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm" />
                </label>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4">
                {alertas.some((item) => item.id === alertaEditando.id) ? (
                  <button type="button" onClick={excluirAlerta} className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700"><Trash2 size={15} /> Excluir</button>
                ) : <span />}
                <button type="submit" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-black text-slate-950"><Save size={16} /> Salvar alerta</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}

function Info({ titulo, valor, className = "", wrapperClassName = "", stacked = false }) {
  const valorExibido = stacked
    ? String(valor).replace(/\s+DOS\s+SUB\b/i, " DOS\nSUB")
    : valor;
  return (
    <div className={`${stacked ? "flex items-baseline gap-1.5" : "flex items-center gap-1.5"} min-w-0 border-b border-slate-100 pb-2 ${wrapperClassName}`}>
      <dt className={`${stacked ? "text-[11px] leading-4" : ""} shrink-0 text-slate-500`}>{titulo}:</dt>
      <dd className={`${stacked ? "min-w-0 flex-1 text-left text-[11px] uppercase leading-4" : "min-w-0"} font-semibold text-slate-800 ${className}`}>
        {stacked ? valorExibido.split("\n").map((linha, indice) => <React.Fragment key={`${linha}-${indice}`}>{indice > 0 && <br />}{linha}</React.Fragment>) : valorExibido}
      </dd>
    </div>
  );
}
