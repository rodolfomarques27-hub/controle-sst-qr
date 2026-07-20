import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { supabase } from "../../lib/supabaseClient";
import {
  listarMapasObraService,
  salvarMapaObraService,
} from "../../services/mapaObraService";
import {
  enviarPlantaMapaStorage,
  obterUrlAssinadaPlantaMapa,
  removerPlantaMapaStorage,
  validarArquivoPlantaMapa,
} from "../../services/mapaObraStorageService";
import {
  carregarExtintoresCadastro,
  salvarExtintorCadastro,
} from "../../services/extintoresCadastroSyncService";
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

function normalizarChaveTipoPonto(valor) {
  return String(valor || "")
    .trim()
    .toLocaleLowerCase("pt-BR");
}

function catalogoTiposPontoUnicos(valores = []) {
  const catalogo = new Map();

  valores.forEach((valor) => {
    const nome = String(valor || "").trim();
    const chave = normalizarChaveTipoPonto(nome);

    if (nome && chave && !catalogo.has(chave)) {
      catalogo.set(chave, nome);
    }
  });

  return Array.from(catalogo.values());
}

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

function valorEhDataUrl(valor) {
  return (
    typeof valor === "string" &&
    /^data:/i.test(valor.trim())
  );
}

function converterDataUrlEmArquivo(dataUrl, nomeOriginal = "planta") {
  const valor = String(dataUrl || "");
  const separador = valor.indexOf(",");

  if (separador < 0) {
    throw new Error("A imagem local possui formato inválido.");
  }

  const cabecalho = valor.slice(0, separador);
  const conteudo = valor.slice(separador + 1);

  const correspondencia =
    /^data:([^;,]+)(;base64)?$/i.exec(cabecalho);

  if (!correspondencia) {
    throw new Error("Não foi possível identificar o tipo da imagem local.");
  }

  const mime = String(
    correspondencia[1] || "image/jpeg",
  ).toLowerCase();

  const binario = correspondencia[2]
    ? globalThis.atob(conteudo)
    : decodeURIComponent(conteudo);

  const bytes = correspondencia[2]
    ? Uint8Array.from(
        binario,
        (caractere) => caractere.charCodeAt(0),
      )
    : new TextEncoder().encode(binario);

  const extensao =
    mime === "image/png"
      ? "png"
      : "jpg";

  const nomeInformado =
    String(nomeOriginal || "planta")
      .trim()
      .replace(/\.[^.]+$/, "");

  const nome =
    `${nomeInformado || "planta"}.${extensao}`;

  return new File(
    [bytes],
    nome,
    {
      type: mime,
      lastModified: Date.now(),
    },
  );
}

async function hidratarReferenciaImagemMapa(
  clienteSupabase,
  referencia,
  obraId,
) {
  if (!referencia || typeof referencia !== "object") {
    return null;
  }

  if (!referencia.path) {
    return referencia;
  }

  const url = await obterUrlAssinadaPlantaMapa({
    supabase: clienteSupabase,
    caminho: referencia.path,
    obraId,
  });

  return {
    ...referencia,
    url,
  };
}

async function hidratarMapaObraComUrls(
  clienteSupabase,
  mapa,
) {
  const obraId = String(mapa?.obraId || "");

  const planta =
    await hidratarReferenciaImagemMapa(
      clienteSupabase,
      mapa?.planta,
      obraId,
    );

  const pontos = await Promise.all(
    (Array.isArray(mapa?.pontos)
      ? mapa.pontos
      : []
    ).map(async (ponto) => ({
      ...ponto,
      plantaDetalhada:
        await hidratarReferenciaImagemMapa(
          clienteSupabase,
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
  const [carregandoMapaRemoto, setCarregandoMapaRemoto] = useState(false);
  const [salvandoMapaRemoto, setSalvandoMapaRemoto] = useState(false);
  const [salvandoPonto, setSalvandoPonto] = useState(false);
  const [enviandoPlanta, setEnviandoPlanta] = useState(false);
  const [obraId, setObraId] = useState(() => lerMapaObraLocal().obraId || "");
  const sequenciaCarregamentoRef = useRef(0);
  const sequenciaExtintoresRef = useRef(0);
  const [extintores, setExtintores] = useState([]);
  const [carregandoExtintores, setCarregandoExtintores] = useState(false);
  const [salvandoVinculoExtintor, setSalvandoVinculoExtintor] = useState(false);
  const [origemExtintores, setOrigemExtintores] = useState("inicial");
  const [erroExtintores, setErroExtintores] = useState("");
  const pontos = mapa.pontos || [];
  const alertas = mapa.alertas || [];

  const tiposPontoPersonalizados = useMemo(() => {
    const tiposPadrao = new Set(
      TIPOS_PONTO.map(normalizarChaveTipoPonto),
    );

    const informados = Array.isArray(
      mapa.tiposPontoPersonalizados,
    )
      ? mapa.tiposPontoPersonalizados
      : pontos.map((ponto) => ponto?.tipo);

    return catalogoTiposPontoUnicos(
      informados,
    ).filter(
      (tipo) =>
        !tiposPadrao.has(
          normalizarChaveTipoPonto(tipo),
        ),
    );
  }, [
    mapa.tiposPontoPersonalizados,
    pontos,
  ]);

  const tiposPontoDisponiveis = useMemo(
    () =>
      catalogoTiposPontoUnicos([
        ...TIPOS_PONTO.slice(0, -1),
        ...tiposPontoPersonalizados,
        "Outro ponto",
      ]),
    [tiposPontoPersonalizados],
  );

  const tiposPontoFormulario = useMemo(
    () =>
      catalogoTiposPontoUnicos([
        ...tiposPontoDisponiveis.slice(0, -1),
        pontoEditando?.tipo &&
        pontoEditando.tipo !== "Outro ponto"
          ? pontoEditando.tipo
          : "",
        "Outro ponto",
      ]),
    [
      tiposPontoDisponiveis,
      pontoEditando?.tipo,
    ],
  );

  const operacaoMapaEmAndamento =
    carregandoMapaRemoto ||
    salvandoMapaRemoto ||
    salvandoPonto ||
    enviandoPlanta ||
    salvandoVinculoExtintor;


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

  const extintoresPorReferencia = useMemo(() => {
    const indice = new Map();

    extintores.forEach((extintor) => {
      [
        extintor?.id,
        extintor?.referenciaLocal,
        extintor?.referencia_local,
      ]
        .map((referencia) =>
          String(referencia || ""),
        )
        .filter(Boolean)
        .forEach((referencia) => {
          indice.set(referencia, extintor);
        });
    });

    return indice;
  }, [extintores]);

  const vinculosExtintoresPorPonto = useMemo(() => {
    const idsPorPonto = new Map();
    const posicoesPorPonto = new Map();

    pontos.forEach((ponto) => {
      const chavePonto = String(ponto?.id || "");
      const ids = new Set();
      const posicoes = {
        ...(ponto?.extintorPosicoes || {}),
      };

      const referenciasMapa =
        Array.isArray(ponto?.extintores)
          ? ponto.extintores
          : [];

      referenciasMapa.forEach((referencia) => {
        const chaveReferencia =
          String(referencia || "");

        const extintor =
          extintoresPorReferencia.get(
            chaveReferencia,
          );

        if (!extintor?.id) {
          return;
        }

        const idAtual = String(extintor.id);

        ids.add(idAtual);

        if (
          !posicoes[idAtual] &&
          posicoes[chaveReferencia]
        ) {
          posicoes[idAtual] =
            posicoes[chaveReferencia];
        }
      });

      extintores.forEach((extintor) => {
        if (
          String(extintor?.pontoId || "") !==
          chavePonto
        ) {
          return;
        }

        const idAtual =
          String(extintor?.id || "");

        if (!idAtual) {
          return;
        }

        ids.add(idAtual);

        if (!posicoes[idAtual]) {
          const referenciaComPosicao = [
            extintor?.referenciaLocal,
            extintor?.referencia_local,
          ]
            .map((referencia) =>
              String(referencia || ""),
            )
            .find(
              (referencia) =>
                referencia &&
                posicoes[referencia],
            );

          if (referenciaComPosicao) {
            posicoes[idAtual] =
              posicoes[referenciaComPosicao];
          }
        }
      });

      idsPorPonto.set(chavePonto, ids);
      posicoesPorPonto.set(
        chavePonto,
        posicoes,
      );
    });

    return {
      idsPorPonto,
      posicoesPorPonto,
    };
  }, [
    extintores,
    extintoresPorReferencia,
    pontos,
  ]);

  const pontoAtualApresentacao = useMemo(() => {
    if (!pontoAtual) {
      return null;
    }

    const chavePonto =
      String(pontoAtual.id || "");

    return {
      ...pontoAtual,
      extintores: Array.from(
        vinculosExtintoresPorPonto
          .idsPorPonto
          .get(chavePonto) ||
        [],
      ),
      extintorPosicoes: {
        ...(
          vinculosExtintoresPorPonto
            .posicoesPorPonto
            .get(chavePonto) ||
          {}
        ),
      },
    };
  }, [
    pontoAtual,
    vinculosExtintoresPorPonto,
  ]);

  const origemExtintoresTexto = {
    remoto: "Supabase",
    cache: "cache",
    local: "dados locais",
    vazio: "sem registros",
    erro: "indisponível",
    inicial: "inicializando",
  }[origemExtintores] || origemExtintores;

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
    const extintoresPosicionados = new Set(
      Array.from(
        vinculosExtintoresPorPonto
          .idsPorPonto
          .values(),
      ).flatMap((ids) =>
        Array.from(ids),
      ),
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
      extintoresPosicionados: extintoresPosicionados.size,
      extintoresAtivos,
      ambientes,
      alertaExtintor,
    };
  }, [
    auditoriasCampo,
    extintores,
    pontos,
    vinculosExtintoresPorPonto,
  ]);

  useEffect(() => {
    const obraSelecionadaId =
      String(obraId || "").trim();

    const sequencia =
      ++sequenciaCarregamentoRef.current;

    if (!obraSelecionadaId) {
      setCarregandoMapaRemoto(false);
      return undefined;
    }

    let ativo = true;

    async function carregarMapaSelecionado() {
      setCarregandoMapaRemoto(true);
      setMensagem("Carregando o mapa da obra...");

      const obraSelecionada =
        obrasDisponiveis.find(
          (obra) =>
            String(obra.id) ===
            obraSelecionadaId,
        );

      try {
        const mapasRemotos =
          await listarMapasObraService({
            supabase,
            obraId: obraSelecionadaId,
          });

        if (
          !ativo ||
          sequencia !==
            sequenciaCarregamentoRef.current
        ) {
          return;
        }

        const mapaRemoto =
          Array.isArray(mapasRemotos)
            ? mapasRemotos[0]
            : null;

        if (mapaRemoto) {
          const hidratado =
            await hidratarMapaObraComUrls(
              supabase,
              {
                ...mapaRemoto,
                obraId: obraSelecionadaId,
                obraNome:
                  mapaRemoto.obraNome ||
                  obraSelecionada?.nome ||
                  "",
              },
            );

          if (
            !ativo ||
            sequencia !==
              sequenciaCarregamentoRef.current
          ) {
            return;
          }

          setMapa(hidratado);
          salvarMapaObraLocal(hidratado);
          setAlteracoesPendentes(false);
          setMensagem(
            "Mapa carregado do banco de dados.",
          );

          return;
        }

        const mapaLocal =
          lerMapaObraLocal(
            obraSelecionadaId,
          );

        const proximoMapa = {
          ...mapaLocal,
          obraId: obraSelecionadaId,
          obraNome:
            mapaLocal.obraNome ||
            obraSelecionada?.nome ||
            "",
        };

        const possuiDadosLocais = Boolean(
          proximoMapa.planta ||
          proximoMapa.pontos?.length ||
          proximoMapa.alertas?.length,
        );

        setMapa(proximoMapa);
        salvarMapaObraLocal(proximoMapa);
        setAlteracoesPendentes(
          possuiDadosLocais,
        );

        setMensagem(
          possuiDadosLocais
            ? "Mapa local recuperado. Salve para enviá-lo ao banco de dados."
            : "Nenhum mapa cadastrado para esta obra.",
        );
      } catch (error) {
        if (
          !ativo ||
          sequencia !==
            sequenciaCarregamentoRef.current
        ) {
          return;
        }

        const mapaLocal =
          lerMapaObraLocal(
            obraSelecionadaId,
          );

        const proximoMapa = {
          ...mapaLocal,
          obraId: obraSelecionadaId,
          obraNome:
            mapaLocal.obraNome ||
            obraSelecionada?.nome ||
            "",
        };

        const possuiDadosLocais = Boolean(
          proximoMapa.planta ||
          proximoMapa.pontos?.length ||
          proximoMapa.alertas?.length,
        );

        setMapa(proximoMapa);
        setAlteracoesPendentes(
          possuiDadosLocais,
        );

        setMensagem(
          `Não foi possível carregar o mapa remoto. Recuperação local utilizada: ${
            error?.message ||
            "erro não identificado"
          }`,
        );
      } finally {
        if (
          ativo &&
          sequencia ===
            sequenciaCarregamentoRef.current
        ) {
          setCarregandoMapaRemoto(false);
        }
      }
    }

    carregarMapaSelecionado();

    return () => {
      ativo = false;
    };
  }, [obraId, obrasDisponiveis]);

  useEffect(() => {
    const obraSelecionadaId =
      String(
        obraId ||
        mapa?.obraId ||
        "",
      ).trim();

    const sequencia =
      ++sequenciaExtintoresRef.current;

    if (!obraSelecionadaId) {
      setExtintores([]);
      setOrigemExtintores("vazio");
      setErroExtintores("");
      setCarregandoExtintores(false);

      return undefined;
    }

    let ativo = true;

    async function carregarExtintoresDaObra() {
      setCarregandoExtintores(true);
      setErroExtintores("");

      try {
        const resultado =
          await carregarExtintoresCadastro({
            obraId: obraSelecionadaId,
            mapa,
          });

        if (
          !ativo ||
          sequencia !==
            sequenciaExtintoresRef.current
        ) {
          return;
        }

        setExtintores(
          Array.isArray(resultado.itens)
            ? resultado.itens
            : [],
        );

        setOrigemExtintores(
          resultado.origem || "vazio",
        );

        setErroExtintores(
          resultado.erro || "",
        );
      } catch (error) {
        if (
          !ativo ||
          sequencia !==
            sequenciaExtintoresRef.current
        ) {
          return;
        }

        setExtintores([]);
        setOrigemExtintores("erro");
        setErroExtintores(
          error?.message ||
          "Não foi possível carregar os extintores da obra.",
        );
      } finally {
        if (
          ativo &&
          sequencia ===
            sequenciaExtintoresRef.current
        ) {
          setCarregandoExtintores(false);
        }
      }
    }

    void carregarExtintoresDaObra();

    return () => {
      ativo = false;
    };
  }, [
    obraId,
    mapa.id,
    mapa.mapaId,
  ]);

  function atualizarMapa(proximo) {
    if (
      proximo?.obraId &&
      String(proximo.obraId) !==
        String(mapa.obraId || "")
    ) {
      const mapaDaObra =
        lerMapaObraLocal(
          proximo.obraId,
        );

      const selecionado = {
        ...mapaDaObra,
        obraId: proximo.obraId,
        obraNome:
          proximo.obraNome ||
          mapaDaObra.obraNome,
      };

      setMapa(selecionado);
      setAlteracoesPendentes(false);

      return;
    }

    setMapa(proximo);
    setAlteracoesPendentes(true);

    // Cópia de recuperação local até a confirmação no Supabase.
    salvarMapaObraLocal(proximo);
  }

  async function removerUploadsNovos(
    caminhos,
    obraDoMapa,
  ) {
    await Promise.allSettled(
      Array.from(new Set(caminhos))
        .filter(Boolean)
        .map((caminho) =>
          removerPlantaMapaStorage({
            supabase,
            caminho,
            obraId: obraDoMapa,
          }),
        ),
    );
  }

  async function materializarImagensLocais(
    mapaBase,
    caminhosNovosIniciais = [],
  ) {
    const caminhosNovos = [
      ...caminhosNovosIniciais,
    ];

    const proximoMapa = {
      ...mapaBase,
      pontos: Array.isArray(mapaBase.pontos)
        ? mapaBase.pontos.map((ponto) => ({
            ...ponto,
          }))
        : [],
    };

    try {
      if (
        valorEhDataUrl(
          proximoMapa.planta?.url,
        )
      ) {
        const arquivo =
          converterDataUrlEmArquivo(
            proximoMapa.planta.url,
            proximoMapa.planta.nome ||
              "planta-geral",
          );

        const referencia =
          await enviarPlantaMapaStorage({
            supabase,
            arquivo,
            obraId: proximoMapa.obraId,
            tipo: "geral",
          });

        caminhosNovos.push(
          referencia.path,
        );

        proximoMapa.planta =
          referencia;
      }

      const pontosConvertidos = [];

      for (
        const ponto of proximoMapa.pontos
      ) {
        if (
          valorEhDataUrl(
            ponto.plantaDetalhada?.url,
          )
        ) {
          const arquivo =
            converterDataUrlEmArquivo(
              ponto.plantaDetalhada.url,
              ponto.plantaDetalhada.nome ||
                `planta-${ponto.id}`,
            );

          const referencia =
            await enviarPlantaMapaStorage({
              supabase,
              arquivo,
              obraId: proximoMapa.obraId,
              tipo: "detalhada",
              pontoId: ponto.id,
            });

          caminhosNovos.push(
            referencia.path,
          );

          pontosConvertidos.push({
            ...ponto,
            plantaDetalhada:
              referencia,
          });
        } else {
          pontosConvertidos.push(
            ponto,
          );
        }
      }

      proximoMapa.pontos =
        pontosConvertidos;

      return {
        mapa: proximoMapa,
        caminhosNovos,
      };
    } catch (error) {
      await removerUploadsNovos(
        caminhosNovos,
        proximoMapa.obraId,
      );

      throw error;
    }
  }

  async function salvarMapaCompleto(
    mapaBase,
    {
      caminhosNovosIniciais = [],
      caminhosAntigos = [],
    } = {},
  ) {
    const preparado =
      await materializarImagensLocais(
        mapaBase,
        caminhosNovosIniciais,
      );

    let mapaBanco;

    try {
      mapaBanco =
        await salvarMapaObraService({
          supabase,
          mapa: preparado.mapa,
        });
    } catch (error) {
      await removerUploadsNovos(
        preparado.caminhosNovos,
        preparado.mapa.obraId,
      );

      throw error;
    }

    let mapaHidratado;
    let avisoUrl = "";

    try {
      mapaHidratado =
        await hidratarMapaObraComUrls(
          supabase,
          mapaBanco,
        );
    } catch (error) {
      mapaHidratado = {
        ...preparado.mapa,
        id: mapaBanco.id,
        mapaId: mapaBanco.mapaId,
        snapshotVersao:
          mapaBanco.snapshotVersao,
      };

      avisoUrl =
        " O mapa foi salvo, mas algumas URLs temporárias não puderam ser renovadas.";
    }

    setMapa(mapaHidratado);
    salvarMapaObraLocal(
      mapaHidratado,
    );
    setAlteracoesPendentes(false);

    const caminhosParaRemover =
      Array.from(
        new Set(caminhosAntigos),
      ).filter(
        (caminho) =>
          caminho &&
          !preparado.caminhosNovos.includes(
            caminho,
          ),
      );

    const resultadosRemocao =
      await Promise.allSettled(
        caminhosParaRemover.map(
          (caminho) =>
            removerPlantaMapaStorage({
              supabase,
              caminho,
              obraId:
                preparado.mapa.obraId,
            }),
        ),
      );

    const limpezaPendente =
      resultadosRemocao.some(
        (resultado) =>
          resultado.status ===
          "rejected",
      );

    return {
      mapa: mapaHidratado,
      avisoUrl,
      limpezaPendente,
    };
  }

  async function salvarAlteracoes() {
    if (!mapa.obraId) {
      setMensagem(
        "Selecione uma obra antes de salvar.",
      );

      return;
    }

    setSalvandoMapaRemoto(true);
    setMensagem(
      "Salvando o mapa no banco de dados...",
    );

    try {
      const resultado =
        await salvarMapaCompleto(mapa);

      setMensagem(
        `Alterações salvas no banco de dados.${resultado.avisoUrl}`,
      );
    } catch (error) {
      salvarMapaObraLocal(mapa);
      setAlteracoesPendentes(true);

      setMensagem(
        `Não foi possível salvar o mapa: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setSalvandoMapaRemoto(false);
    }
  }

  async function carregarPlanta(evento) {
    const input = evento.currentTarget;
    const arquivo = input.files?.[0];

    if (!arquivo) {
      return;
    }

    if (!obraId) {
      setMensagem(
        "Selecione a obra antes de enviar a planta.",
      );

      input.value = "";

      return;
    }

    setEnviandoPlanta(true);
    setMensagem(
      "Enviando e salvando a planta geral...",
    );

    try {
      validarArquivoPlantaMapa(
        arquivo,
      );

      const referencia =
        await enviarPlantaMapaStorage({
          supabase,
          arquivo,
          obraId,
          tipo: "geral",
        });

      const caminhoAnterior =
        mapa.planta?.path || "";

      const proximoMapa = {
        ...mapa,
        obraId,
        planta: referencia,
        atualizadoEm:
          new Date().toISOString(),
      };

      const resultado =
        await salvarMapaCompleto(
          proximoMapa,
          {
            caminhosNovosIniciais: [
              referencia.path,
            ],
            caminhosAntigos:
              caminhoAnterior &&
              caminhoAnterior !==
                referencia.path
                ? [caminhoAnterior]
                : [],
          },
        );

      setMensagem(
        resultado.limpezaPendente
          ? "Planta geral salva. A limpeza do arquivo anterior ficou pendente."
          : `Planta geral enviada e salva no banco de dados.${resultado.avisoUrl}`,
      );
    } catch (error) {
      setMensagem(
        `Não foi possível enviar a planta geral: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setEnviandoPlanta(false);
      input.value = "";
    }
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

  async function salvarPonto(evento) {
    evento.preventDefault();

    if (!pontoEditando || salvandoPonto) {
      return;
    }

    const dados = new FormData(
      evento.currentTarget,
    );

    const empresaId = String(
      dados.get("empresaId") ||
        pontoEditando.empresaId ||
        "",
    );

    const empresaSelecionada =
      empresasDaObra.find(
        (empresa) =>
          String(empresa.id) ===
          empresaId,
      );

    const tipoOpcao = String(
      dados.get("tipo") ||
        pontoEditando.tipoOpcao ||
        pontoEditando.tipo ||
        "Outro ponto",
    ).trim();

    const tipoPersonalizadoDigitado =
      String(
        dados.get("tipoPersonalizado") ||
          pontoEditando.tipoPersonalizado ||
          "",
      ).trim();

    let tipoFinal = tipoOpcao;
    let tipoPersonalizadoNovo = false;

    if (tipoOpcao === "Outro ponto") {
      if (!tipoPersonalizadoDigitado) {
        setMensagem(
          "Informe o novo tipo de ponto antes de salvar.",
        );

        return;
      }

      const tipoJaExistente =
        tiposPontoDisponiveis.find(
          (tipo) =>
            tipo !== "Outro ponto" &&
            normalizarChaveTipoPonto(tipo) ===
              normalizarChaveTipoPonto(
                tipoPersonalizadoDigitado,
              ),
        );

      tipoFinal =
        tipoJaExistente ||
        tipoPersonalizadoDigitado;

      const tipoPadrao = TIPOS_PONTO.some(
        (tipo) =>
          normalizarChaveTipoPonto(tipo) ===
          normalizarChaveTipoPonto(
            tipoFinal,
          ),
      );

      const tipoJaCatalogado =
        tiposPontoPersonalizados.some(
          (tipo) =>
            normalizarChaveTipoPonto(tipo) ===
            normalizarChaveTipoPonto(
              tipoFinal,
            ),
        );

      tipoPersonalizadoNovo =
        !tipoPadrao &&
        !tipoJaCatalogado;
    }

    const proximo = {
      ...pontoEditando,
      nome:
        String(
          dados.get("nome") || "",
        ).trim() ||
        "Ponto sem nome",
      tipo: tipoFinal,
      descricao: String(
        dados.get("descricao") || "",
      ).trim(),
      status: String(
        dados.get("status") ||
          "Ativo",
      ),
      empresaId,
      empresaNome:
        empresaSelecionada?.nome ||
        "Ponto compartilhado",
      atualizadoEm:
        new Date().toISOString(),
    };

    delete proximo.tipoOpcao;
    delete proximo.tipoPersonalizado;

    const existe = pontos.some(
      (item) =>
        item.id === proximo.id,
    );

    const catalogoAtualizado =
      tipoPersonalizadoNovo
        ? catalogoTiposPontoUnicos([
            ...tiposPontoPersonalizados,
            tipoFinal,
          ])
        : tiposPontoPersonalizados;

    const proximoMapa = {
      ...mapa,
      tiposPontoPersonalizados:
        catalogoAtualizado,
      pontos: existe
        ? pontos.map((item) =>
            item.id === proximo.id
              ? proximo
              : item,
          )
        : [...pontos, proximo],
    };

    setSalvandoPonto(true);
    setMensagem(
      "Salvando ponto no banco de dados...",
    );

    try {
      const resultado =
        await salvarMapaCompleto(
          proximoMapa,
        );

      setPontoSelecionado(
        proximo.id,
      );

      setPontoEditando(null);

      setMensagem(
        tipoPersonalizadoNovo
          ? `Novo tipo "${tipoFinal}" criado e ponto salvo no banco de dados.${resultado.avisoUrl}`
          : `Ponto salvo no banco de dados.${resultado.avisoUrl}`,
      );
    } catch (error) {
      setMensagem(
        `Não foi possível salvar o ponto: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setSalvandoPonto(false);
    }
  }

  async function removerTipoPontoPersonalizado(
    tipo,
  ) {
    const nome = String(tipo || "").trim();

    const tipoExistente =
      tiposPontoPersonalizados.find(
        (item) =>
          normalizarChaveTipoPonto(item) ===
          normalizarChaveTipoPonto(nome),
      );

    if (!tipoExistente || salvandoPonto) {
      return;
    }

    const totalEmUso = pontos.filter(
      (ponto) =>
        normalizarChaveTipoPonto(
          ponto?.tipo,
        ) ===
        normalizarChaveTipoPonto(
          tipoExistente,
        ),
    ).length;

    const textoEmUso =
      totalEmUso > 0
        ? ` ${totalEmUso} ponto(s) existente(s) continuarão com esse tipo.`
        : "";

    const confirmado = window.confirm(
      `Excluir o tipo personalizado "${tipoExistente}" da lista?${textoEmUso}`,
    );

    if (!confirmado) {
      return;
    }

    const proximoMapa = {
      ...mapa,
      tiposPontoPersonalizados:
        tiposPontoPersonalizados.filter(
          (item) =>
            normalizarChaveTipoPonto(item) !==
            normalizarChaveTipoPonto(
              tipoExistente,
            ),
        ),
    };

    setSalvandoPonto(true);
    setMensagem(
      "Excluindo tipo personalizado...",
    );

    try {
      const resultado =
        await salvarMapaCompleto(
          proximoMapa,
        );

      setPontoEditando((atual) => {
        if (!atual) {
          return atual;
        }

        const tipoAtual =
          atual.tipoOpcao ||
          atual.tipo ||
          "";

        if (
          normalizarChaveTipoPonto(
            tipoAtual,
          ) !==
          normalizarChaveTipoPonto(
            tipoExistente,
          )
        ) {
          return atual;
        }

        return {
          ...atual,
          tipo: "Outro ponto",
          tipoOpcao: "Outro ponto",
          tipoPersonalizado: "",
        };
      });

      setMensagem(
        totalEmUso > 0
          ? `Tipo removido da lista. Os ${totalEmUso} ponto(s) existentes foram preservados.${resultado.avisoUrl}`
          : `Tipo personalizado removido da lista.${resultado.avisoUrl}`,
      );
    } catch (error) {
      setMensagem(
        `Não foi possível excluir o tipo personalizado: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setSalvandoPonto(false);
    }
  }
  async function excluirPonto() {
    const ponto =
      pontoEditando &&
      pontos.some(
        (item) =>
          item.id ===
          pontoEditando.id,
      )
        ? pontoEditando
        : pontoAtual;

    if (!ponto || salvandoPonto) {
      return;
    }

    const confirmado =
      window.confirm(
        `Excluir ${ponto.nome}?`,
      );

    if (!confirmado) {
      return;
    }

    const caminhoPlanta =
      ponto.plantaDetalhada?.path ||
      "";

    const proximoMapa = {
      ...mapa,
      pontos: pontos.filter(
        (item) =>
          item.id !== ponto.id,
      ),
    };

    setSalvandoPonto(true);
    setMensagem(
      "Excluindo ponto do banco de dados...",
    );

    try {
      const resultado =
        await salvarMapaCompleto(
          proximoMapa,
          {
            caminhosAntigos:
              caminhoPlanta
                ? [caminhoPlanta]
                : [],
          },
        );

      setPontoSelecionado(null);
      setPontoEditando(null);

      setMensagem(
        resultado.limpezaPendente
          ? "Ponto excluído do banco. A remoção da planta detalhada ficou pendente."
          : `Ponto excluído do banco de dados.${resultado.avisoUrl}`,
      );
    } catch (error) {
      setMensagem(
        `Não foi possível excluir o ponto: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setSalvandoPonto(false);
    }
  }
  async function carregarPlantaDetalhada(evento) {
    const input = evento.currentTarget;
    const arquivo = input.files?.[0];
    const ponto = pontoAtual;

    if (!ponto || !arquivo) {
      input.value = "";
      return;
    }

    if (!obraId) {
      setMensagem(
        "Selecione a obra antes de enviar a planta detalhada.",
      );

      input.value = "";

      return;
    }

    setEnviandoPlanta(true);
    setMensagem(
      "Enviando e salvando a planta detalhada...",
    );

    try {
      validarArquivoPlantaMapa(
        arquivo,
      );

      const referencia =
        await enviarPlantaMapaStorage({
          supabase,
          arquivo,
          obraId,
          tipo: "detalhada",
          pontoId: ponto.id,
        });

      const caminhoAnterior =
        ponto.plantaDetalhada?.path ||
        "";

      const proximoMapa = {
        ...mapa,
        pontos: pontos.map((item) =>
          item.id === ponto.id
            ? {
                ...item,
                plantaDetalhada:
                  referencia,
                atualizadoEm:
                  new Date().toISOString(),
              }
            : item,
        ),
      };

      const resultado =
        await salvarMapaCompleto(
          proximoMapa,
          {
            caminhosNovosIniciais: [
              referencia.path,
            ],
            caminhosAntigos:
              caminhoAnterior &&
              caminhoAnterior !==
                referencia.path
                ? [caminhoAnterior]
                : [],
          },
        );

      setMensagem(
        resultado.limpezaPendente
          ? "Planta detalhada salva. A limpeza do arquivo anterior ficou pendente."
          : `Planta detalhada enviada e salva no banco de dados.${resultado.avisoUrl}`,
      );
    } catch (error) {
      setMensagem(
        `Não foi possível enviar a planta detalhada: ${
          error?.message ||
          "erro não identificado"
        }`,
      );
    } finally {
      setEnviandoPlanta(false);
      input.value = "";
    }
  }
  function obterReferenciasExtintor(
    extintorId,
  ) {
    const extintor =
      extintoresPorReferencia.get(
        String(extintorId || ""),
      );

    return new Set(
      [
        extintorId,
        extintor?.id,
        extintor?.referenciaLocal,
        extintor?.referencia_local,
      ]
        .map((referencia) =>
          String(referencia || ""),
        )
        .filter(Boolean),
    );
  }

  async function alternarExtintor(extintorId) {
    if (
      !pontoAtual ||
      carregandoExtintores ||
      salvandoVinculoExtintor
    ) {
      return;
    }

    const chavePontoAtual =
      String(pontoAtual.id || "");

    const idsPontoAtual =
      vinculosExtintoresPorPonto
        .idsPorPonto
        .get(chavePontoAtual) ||
      new Set();

    const estaVinculado =
      idsPontoAtual.has(
        String(extintorId),
      );

    const alocadoEmOutroPonto =
      Array.from(
        vinculosExtintoresPorPonto
          .idsPorPonto
          .entries(),
      ).some(
        ([pontoId, ids]) =>
          pontoId !== chavePontoAtual &&
          ids.has(String(extintorId)),
      );

    if (
      alocadoEmOutroPonto &&
      !estaVinculado
    ) {
      setMensagem(
        "Este extintor já está alocado em outro ponto da obra.",
      );

      return;
    }

    const extintor =
      extintoresPorReferencia.get(
        String(extintorId),
      );

    if (!extintor) {
      setMensagem(
        "O extintor selecionado não está mais disponível.",
      );

      return;
    }

    const referencias =
      obterReferenciasExtintor(
        extintorId,
      );

    const vinculados =
      Array.isArray(pontoAtual.extintores)
        ? pontoAtual.extintores
        : [];

    setSalvandoVinculoExtintor(true);
    setErroExtintores("");

    try {
      const extintorParaSalvar =
        estaVinculado
          ? {
              ...extintor,
              pontoId: "",
              pontoIdRemoto: "",
              pontoReferenciaLocal: "",
              ponto_referencia_local: "",
              ponto: "",
            }
          : {
              ...extintor,
              pontoId: pontoAtual.id,
              ponto: pontoAtual.nome,
            };

      const resultado =
        await salvarExtintorCadastro({
          extintor: extintorParaSalvar,
          obraId,
          empresaId:
            extintor.empresaId || "",
          pontoId:
            estaVinculado
              ? ""
              : pontoAtual.id,
        });

      setExtintores(resultado.itens);
      setOrigemExtintores("remoto");

      const semReferenciasAntigas =
        vinculados.filter(
          (id) =>
            !referencias.has(
              String(id),
            ),
        );

      const proximosVinculos =
        estaVinculado
          ? semReferenciasAntigas
          : [
              ...semReferenciasAntigas,
              String(resultado.registro.id),
            ];

      atualizarMapa({
        ...mapa,
        pontos: pontos.map((item) =>
          item.id === pontoAtual.id
            ? {
                ...item,
                extintores:
                  proximosVinculos,
              }
            : item,
        ),
      });

      setMensagem(
        estaVinculado
          ? `${extintor.codigo} desvinculado do ponto. Salve o mapa para consolidar o snapshot.`
          : `${extintor.codigo} vinculado ao ponto. Salve o mapa para consolidar o snapshot.`,
      );
    } catch (error) {
      setMensagem(
        error?.message ||
        "Não foi possível atualizar o vínculo do extintor.",
      );
    } finally {
      setSalvandoVinculoExtintor(false);
    }
  }

  function estaAlocadoEmOutroPonto(
    extintorId,
  ) {
    if (!pontoAtual) {
      return false;
    }

    const chavePontoAtual =
      String(pontoAtual.id || "");

    return Array.from(
      vinculosExtintoresPorPonto
        .idsPorPonto
        .entries(),
    ).some(
      ([pontoId, ids]) =>
        pontoId !== chavePontoAtual &&
        ids.has(String(extintorId)),
    );
  }

  function salvarPosicaoExtintor(
    extintorId,
    x,
    y,
  ) {
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

  function removerPosicaoExtintor(
    extintorId,
  ) {
    if (!pontoAtual) return;

    const referencias =
      obterReferenciasExtintor(
        extintorId,
      );

    atualizarMapa({
      ...mapa,
      pontos: pontos.map((item) => {
        if (item.id !== pontoAtual.id) {
          return item;
        }

        const proximasPosicoes = {
          ...(item.extintorPosicoes || {}),
        };

        referencias.forEach((referencia) => {
          delete proximasPosicoes[
            referencia
          ];
        });

        return {
          ...item,
          extintorPosicoes:
            proximasPosicoes,
        };
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
                  disabled={operacaoMapaEmAndamento}
                  className="sr-only"
                  onChange={carregarPlanta}
                />
              </label>
              <button
                type="button"
                onClick={salvarAlteracoes}
                disabled={!alteracoesPendentes || operacaoMapaEmAndamento}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/60"
              >
                <Save size={16} />{" "}
                {salvandoMapaRemoto ? "Salvando..." : alteracoesPendentes ? "Salvar alterações" : "Tudo salvo"}
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
              disabled={operacaoMapaEmAndamento}
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
            disabled={!alteracoesPendentes || operacaoMapaEmAndamento}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Save size={16} />{" "}
            {salvandoMapaRemoto ? "Salvando..." : alteracoesPendentes ? "Salvar alterações" : "Tudo salvo"}
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
                <ResumoMapaCard
                  label="Extintores posicionados"
                  value={resumoLocal.extintoresPosicionados}
                  detail={
                    carregandoExtintores
                      ? "Carregando cadastros"
                      : `${extintores.length} cadastrados · ${origemExtintoresTexto}`
                  }
                  tone="emerald"
                />
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
                    disabled={operacaoMapaEmAndamento}
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
                    {carregandoExtintores && (
                      <p className="rounded-md bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-500">
                        Carregando extintores da obra...
                      </p>
                    )}

                    {!carregandoExtintores &&
                      !extintores.length && (
                        <p className="rounded-md bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-500">
                          Nenhum extintor cadastrado para esta obra.
                        </p>
                      )}

                    {!carregandoExtintores &&
                      extintores
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
                              disabled={
                                salvandoVinculoExtintor
                              }
                              checked={
                                vinculosExtintoresPorPonto
                                  .idsPorPonto
                                  .get(
                                    String(
                                      pontoAtual.id,
                                    ),
                                  )
                                  ?.has(
                                    String(
                                      extintor.id,
                                    ),
                                  ) ||
                                false
                              }
                              onChange={() =>
                                void alternarExtintor(
                                  extintor.id,
                                )
                              }
                            />
                            {extintor.codigo} · {extintor.localizacao}
                          </label>
                        ))}

                    {erroExtintores && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-[10px] font-semibold text-amber-800">
                        {erroExtintores}
                      </p>
                    )}
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
              ponto={pontoAtualApresentacao}
              extintores={extintores}
              onPositionChange={salvarPosicaoExtintor}
              onPositionRemove={removerPosicaoExtintor}
              onPontosInternosChange={salvarPontosInternos}
            />
          </div>
        )}
        {pontoEditando && (
          <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-slate-950/55 p-4">
            <form
              onSubmit={salvarPonto}
              className="flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
            >
              <div className="relative flex min-h-[104px] shrink-0 items-center justify-between overflow-hidden px-5 py-3 text-white">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage: `url(${dashboardHeroBackground})`,
                  }}
                />

                <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/72 to-slate-950/25" />

                <div className="relative flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500 text-white shadow-lg shadow-slate-950/20">
                    <MapPinned size={18} />
                  </span>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-200">
                      Mapa da obra
                    </p>

                    <h2 className="text-lg font-black">
                      Dados do ponto
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPontoEditando(null)}
                  aria-label="Fechar dados do ponto"
                  className="relative rounded-md p-2 text-white transition hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="overflow-y-auto p-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <label className="mt-4 block text-xs font-bold text-slate-600">
                Nome
                <input
                  name="nome"
                  defaultValue={pontoEditando.nome}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              <fieldset className="mt-3">
                <legend className="text-xs font-bold text-slate-600">
                  Tipo
                </legend>

                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Selecione um tipo para este ponto.
                </p>

                <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2">
                  {tiposPontoFormulario.map(
                    (tipo) => {
                      const tipoSelecionado =
                        (pontoEditando.tipoOpcao ||
                          pontoEditando.tipo ||
                          "Outro ponto") === tipo;

                      const tipoPersonalizado =
                        tiposPontoPersonalizados.some(
                          (item) =>
                            normalizarChaveTipoPonto(
                              item,
                            ) ===
                            normalizarChaveTipoPonto(
                              tipo,
                            ),
                        );

                      return (
                        <div
                          key={tipo}
                          className={`flex min-h-10 items-center justify-between gap-3 rounded-md px-2.5 py-1.5 transition ${
                            tipoSelecionado
                              ? "bg-sky-50"
                              : "bg-white hover:bg-slate-50"
                          }`}
                        >
                          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
                            <input
                              type="radio"
                              name="tipo"
                              value={tipo}
                              checked={tipoSelecionado}
                              onChange={() =>
                                setPontoEditando(
                                  (atual) => ({
                                    ...atual,
                                    tipo,
                                    tipoOpcao:
                                      tipo,
                                    tipoPersonalizado:
                                      tipo ===
                                      "Outro ponto"
                                        ? atual
                                            ?.tipoPersonalizado ||
                                          ""
                                        : "",
                                  }),
                                )
                              }
                              disabled={
                                operacaoMapaEmAndamento
                              }
                              className="h-4 w-4 shrink-0 border-slate-300 text-sky-600 focus:ring-sky-500"
                            />

                            <span className="min-w-0 truncate text-sm font-bold text-slate-700">
                              {tipo}
                            </span>
                          </label>

                          {tipoPersonalizado && (
                            <button
                              type="button"
                              onClick={(evento) => {
                                evento.stopPropagation();

                                removerTipoPontoPersonalizado(
                                  tipo,
                                );
                              }}
                              disabled={
                                operacaoMapaEmAndamento
                              }
                              title={`Excluir o tipo ${tipo}`}
                              aria-label={`Excluir o tipo personalizado ${tipo}`}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {(pontoEditando.tipoOpcao ||
                  pontoEditando.tipo) ===
                  "Outro ponto" && (
                  <label className="mt-3 block text-xs font-bold text-slate-600">
                    Novo tipo de ponto

                    <input
                      name="tipoPersonalizado"
                      value={
                        pontoEditando.tipoPersonalizado ||
                        ""
                      }
                      onChange={(evento) =>
                        setPontoEditando(
                          (atual) => ({
                            ...atual,
                            tipoPersonalizado:
                              evento.target.value,
                          }),
                        )
                      }
                      maxLength={60}
                      required
                      disabled={
                        operacaoMapaEmAndamento
                      }
                      placeholder="Ex.: Portaria"
                      className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:bg-slate-100"
                    />
                  </label>
                )}
              </fieldset>
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
              <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
                {pontos.some(
                  (item) =>
                    item.id ===
                    pontoEditando.id,
                ) ? (
                  <button
                    type="button"
                    onClick={excluirPonto}
                    disabled={operacaoMapaEmAndamento}
                    className="inline-flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                    Excluir
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="submit"
                  disabled={operacaoMapaEmAndamento}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Save size={16} />
                  {salvandoPonto
                    ? "Salvando..."
                    : "Salvar ponto"}
                </button>
              </div>
              </div>
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
