// supabase/functions/rapid-api/index.ts
// Função usada pelo App para envio automático de alertas SST por Gmail.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Buffer } from "node:buffer";
import nodemailer from "npm:nodemailer";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VARIAVEIS_MODELO_EMAIL = new Set([
  "saudacao",
  "tst_responsavel",
  "empresa_nome",
  "total_vencidos",
  "total_a_vencer",
  "quantidade_itens",
  "resumo",
  "itens",
  "sistema_nome",
  "url_sistema",
  "data_envio",
]);

const TIPOS_MODELO_EMAIL_SST = new Set([
  "alerta_documento_colaborador",
  "alerta_documento_empresa",
  "alerta_documentos_lote",
  "alerta_treinamentos",
  "alerta_auditoria",
]);

type TipoMimeAssinaturaEmailSst =
  | "image/png"
  | "image/jpeg";

type AssinaturaEmailSst = {
  filename: string;
  content: Buffer;
  contentType: TipoMimeAssinaturaEmailSst;
  contentDisposition: "inline";
  cid: string;
};

const BUCKET_ASSINATURAS_EMAIL_SST =
  "assinaturas-email-sst";

const TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST =
  2 * 1024 * 1024;

const TIPOS_MIME_ASSINATURA_EMAIL_SST =
  new Set<TipoMimeAssinaturaEmailSst>([
    "image/png",
    "image/jpeg",
  ]);

const CAMINHOS_ASSINATURA_EMAIL_SST:
  Readonly<Record<string, string>> =
    Object.freeze({
      alerta_documento_colaborador:
        "modelos/alerta_documento_colaborador/assinatura",

      alerta_documento_empresa:
        "modelos/alerta_documento_empresa/assinatura",

      alerta_documentos_lote:
        "modelos/alerta_documentos_lote/assinatura",

      alerta_treinamentos:
        "modelos/alerta_treinamentos/assinatura",

      alerta_auditoria:
        "modelos/alerta_auditoria/assinatura",
    });

class ErroHttp extends Error {
  status: number;
  publico: boolean;

  constructor(
    status: number,
    mensagem: string,
    publico = status < 500,
  ) {
    super(mensagem);

    this.name = "ErroHttp";
    this.status = status;
    this.publico = publico;
  }
}

function textoSeguro(valor: unknown, limite = 1000) {
  if (
    typeof valor !== "string" &&
    typeof valor !== "number"
  ) {
    return "";
  }

  return String(valor)
    .replace(/\0/g, "")
    .trim()
    .slice(0, limite);
}

function textoCabecalho(valor: unknown, limite = 220) {
  return textoSeguro(valor, limite)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function obterObjetoSeguro(valor: unknown): Record<string, unknown> {
  if (
    !valor ||
    typeof valor !== "object" ||
    Array.isArray(valor)
  ) {
    return {};
  }

  return valor as Record<string, unknown>;
}

function obterMensagemErroStorage(error: unknown) {
  const registro =
    obterObjetoSeguro(error);

  return textoSeguro(
    registro.message ??
      registro.error,
    500,
  ) || "erro não identificado";
}

function erroStorageIndicaArquivoAusente(
  error: unknown,
) {
  const registro =
    obterObjetoSeguro(error);

  const status =
    Number(
      registro.statusCode ??
        registro.status ??
        0,
    );

  const codigo =
    textoSeguro(
      registro.code,
      100,
    ).toLowerCase();

  const mensagem =
    obterMensagemErroStorage(
      error,
    ).toLowerCase();

  return (
    status === 404 ||
    codigo === "404" ||
    codigo === "not_found" ||
    codigo === "object_not_found" ||
    mensagem.includes("not found") ||
    mensagem.includes("object not found")
  );
}

function detectarTipoMimeAssinaturaEmailSst(
  bytes: Uint8Array,
): TipoMimeAssinaturaEmailSst | "" {
  const assinaturaPng =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (assinaturaPng) {
    return "image/png";
  }

  const assinaturaJpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  if (assinaturaJpeg) {
    return "image/jpeg";
  }

  return "";
}

type ClienteStorageAssinaturaEmailSst = {
  storage: {
    from(bucket: string): {
      download(path: string): Promise<{
        data: Blob | null;
        error: unknown;
      }>;
    };
  };
};

async function carregarAssinaturaEmailSst(
  supabaseAdmin: ClienteStorageAssinaturaEmailSst,
  tipoModelo: string,
): Promise<AssinaturaEmailSst | null> {
  const caminho =
    CAMINHOS_ASSINATURA_EMAIL_SST[
      tipoModelo
    ];

  if (!caminho) {
    return null;
  }

  try {
    const {
      data,
      error,
    } =
      await supabaseAdmin.storage
        .from(
          BUCKET_ASSINATURAS_EMAIL_SST,
        )
        .download(caminho);

    if (error) {
      if (
        !erroStorageIndicaArquivoAusente(
          error,
        )
      ) {
        console.warn(
          "Assinatura privada não aplicada ao e-mail SST:",
          {
            tipoModelo,
            motivo:
              obterMensagemErroStorage(
                error,
              ),
          },
        );
      }

      return null;
    }

    if (!data) {
      return null;
    }

    const tipoMimeDeclarado =
      textoSeguro(
        data.type,
        100,
      ).toLowerCase();

    const tamanhoBytes =
      Number(data.size);

    if (
      !TIPOS_MIME_ASSINATURA_EMAIL_SST.has(
        tipoMimeDeclarado as
          TipoMimeAssinaturaEmailSst,
      )
    ) {
      console.warn(
        "Assinatura privada ignorada por MIME inválido:",
        {
          tipoModelo,
          tipoMime:
            tipoMimeDeclarado ||
            "não informado",
        },
      );

      return null;
    }

    if (
      !Number.isFinite(tamanhoBytes) ||
      tamanhoBytes < 1 ||
      tamanhoBytes >
        TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST
    ) {
      console.warn(
        "Assinatura privada ignorada por tamanho inválido:",
        {
          tipoModelo,
          tamanhoBytes,
        },
      );

      return null;
    }

    const bytes =
      new Uint8Array(
        await data.arrayBuffer(),
      );

    if (
      bytes.byteLength !== tamanhoBytes ||
      bytes.byteLength >
        TAMANHO_MAXIMO_ASSINATURA_EMAIL_SST
    ) {
      console.warn(
        "Assinatura privada ignorada por divergência de tamanho:",
        {
          tipoModelo,
          tamanhoBlob:
            tamanhoBytes,
          tamanhoLido:
            bytes.byteLength,
        },
      );

      return null;
    }

    const tipoMimeDetectado =
      detectarTipoMimeAssinaturaEmailSst(
        bytes,
      );

    if (
      !tipoMimeDetectado ||
      tipoMimeDetectado !==
        tipoMimeDeclarado
    ) {
      console.warn(
        "Assinatura privada ignorada por conteúdo incompatível com o MIME:",
        {
          tipoModelo,
          tipoMimeDeclarado,
          tipoMimeDetectado:
            tipoMimeDetectado ||
            "desconhecido",
        },
      );

      return null;
    }

    return {
      filename:
        tipoMimeDetectado ===
          "image/png"
          ? "assinatura.png"
          : "assinatura.jpg",

      content:
        Buffer.from(bytes),

      contentType:
        tipoMimeDetectado,

      contentDisposition:
        "inline",

      cid:
        `assinatura-${tipoModelo}@safescanbrasil`,
    };
  } catch (error) {
    console.warn(
      "Assinatura privada não aplicada ao e-mail SST:",
      {
        tipoModelo,
        motivo:
          obterMensagemErroStorage(
            error,
          ),
      },
    );

    return null;
  }
}

function normalizarDias(valor: unknown) {
  const numero = Number(valor);

  return Number.isFinite(numero)
    ? Math.trunc(numero)
    : 0;
}

function obterVariaveisDesconhecidas(conteudo: string) {
  const desconhecidas = new Set<string>();
  const expressao = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

  for (const correspondencia of conteudo.matchAll(expressao)) {
    const chave = String(correspondencia[1] || "")
      .trim()
      .toLowerCase();

    if (
      chave &&
      !VARIAVEIS_MODELO_EMAIL.has(chave)
    ) {
      desconhecidas.add(chave);
    }
  }

  return [...desconhecidas];
}

function validarVariaveisModelo(
  conteudo: string,
  campo: string,
  status: number,
) {
  const desconhecidas =
    obterVariaveisDesconhecidas(conteudo);

  if (desconhecidas.length > 0) {
    throw new ErroHttp(
      status,
      `O campo ${campo} contém variáveis não permitidas: ${desconhecidas
        .map((item) => `{{${item}}}`)
        .join(", ")}.`,
    );
  }
}

function substituirVariaveisModelo(
  conteudo: string,
  valores: Record<string, string>,
) {
  return conteudo.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
    (trechoCompleto, chaveOriginal) => {
      const chave = String(chaveOriginal || "")
        .trim()
        .toLowerCase();

      return Object.prototype.hasOwnProperty.call(
        valores,
        chave,
      )
        ? valores[chave]
        : trechoCompleto;
    },
  );
}

function escaparHtml(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function montarHtmlEmail(texto: string) {
  return escaparHtml(texto)
    .replace(/\n/g, "<br>")
    .replace(
      /VENCIDO HÁ/g,
      "<strong style='color:#b91c1c'>VENCIDO HÁ</strong>",
    )
    .replace(
      /A VENCER EM/g,
      "<strong style='color:#c2410c'>A VENCER EM</strong>",
    );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    let dadosRecebidos: Record<string, unknown>;

    try {
      dadosRecebidos =
        obterObjetoSeguro(await req.json());
    } catch {
      throw new ErroHttp(
        400,
        "Corpo JSON inválido.",
      );
    }

    const para =
      dadosRecebidos.para;

    const assunto =
      dadosRecebidos.assunto;

    const empresa =
      dadosRecebidos.empresa;

    const tstResponsavel =
      dadosRecebidos.tstResponsavel;

    const itens =
      dadosRecebidos.itens;

    if (
      Object.prototype.hasOwnProperty.call(
        dadosRecebidos,
        "modelo",
      )
    ) {
      throw new ErroHttp(400,
        "O campo modelo não é aceito. Informe apenas tipoModelo.",
      );
    }

    const tipoModelo =
      dadosRecebidos.tipoModelo;

    const sistema =
      dadosRecebidos.sistema;

    const urlSistema =
      dadosRecebidos.urlSistema;

    const destinatario =
      textoSeguro(para, 1000)
        .split(/[;,]/)
        .map((email) => email.trim())
        .filter(Boolean)
        .join(",");

    if (!destinatario) {
      throw new ErroHttp(400,
        "E-mail do destinatário/TST não informado.",
      );
    }

    if (
      !Array.isArray(itens) ||
      itens.length === 0
    ) {
      throw new ErroHttp(400,
        "Nenhum documento/treinamento foi informado para o alerta.",
      );
    }

    const gmailUser =
      Deno.env.get("GMAIL_USER");

    const gmailAppPassword =
      Deno.env.get("GMAIL_APP_PASSWORD");

    const supabaseUrl =
      Deno.env.get("SUPABASE_URL");

    const supabaseServiceRoleKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (
      !gmailUser ||
      !gmailAppPassword
    ) {
      throw new ErroHttp(500,
        "Credenciais GMAIL_USER e GMAIL_APP_PASSWORD não configuradas no Supabase.",
      );
    }

    if (
      !supabaseUrl ||
      !supabaseServiceRoleKey
    ) {
      throw new ErroHttp(500,
        "Credenciais SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não configuradas.",
      );
    }

    const supabaseAdmin =
      createClient(
        supabaseUrl,
        supabaseServiceRoleKey,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        },
      );

    const transporter =
      nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      });

    const itensNormalizados =
      itens.map((item) => {
        const registro =
          obterObjetoSeguro(item);

        return {
          colaborador:
            textoSeguro(registro.colaborador, 300) ||
            "-",

          codigo:
            textoSeguro(registro.codigo, 100) ||
            "-",

          funcao:
            textoSeguro(registro.funcao, 300) ||
            "-",

          situacaoObra:
            textoSeguro(registro.situacaoObra, 300) ||
            "-",

          treinamento:
            textoSeguro(registro.treinamento, 500) ||
            "-",

          realizacao:
            textoSeguro(registro.realizacao, 100) ||
            "Não informada",

          vencimento:
            textoSeguro(registro.vencimento, 100) ||
            "Não informada",

          dias:
            normalizarDias(registro.dias),

          arquivo:
            textoSeguro(registro.arquivo, 500) ||
            "Não informado",
        };
      });

    const totalVencidos =
      itensNormalizados.filter(
        (item) => item.dias < 0,
      ).length;

    const totalAVencer =
      itensNormalizados.filter(
        (item) => item.dias >= 0,
      ).length;

    const linhas =
      itensNormalizados
        .map((item, index) => {
          const situacao =
            item.dias < 0
              ? `VENCIDO HÁ ${Math.abs(item.dias)} DIA(S)`
              : `A VENCER EM ${item.dias} DIA(S)`;

          return [
            `${index + 1}. COLABORADOR: ${item.colaborador}`,
            `Código: ${item.codigo}`,
            `Função: ${item.funcao}`,
            `Situação na obra: ${item.situacaoObra}`,
            `Documento/Treinamento: ${item.treinamento}`,
            `Data de elaboração/realização: ${item.realizacao}`,
            `Data de vencimento: ${item.vencimento}`,
            `Status: ${situacao}`,
            `Arquivo: ${item.arquivo}`,
          ].join("\n");
        })
        .join("\n\n");

    const empresaTratada =
      textoSeguro(empresa, 300) ||
      "Empresa não informada";

    const tstResponsavelTratado =
      textoSeguro(tstResponsavel, 300);

    const sistemaTratado =
      textoSeguro(sistema, 150) ||
      "SafeScan Brasil";

    const urlSistemaTratada =
      textoSeguro(urlSistema, 500) ||
      "https://www.safescanbrasil.com.br";

    const tipoModeloTratado =
      textoSeguro(tipoModelo, 100)
        .toLowerCase();

    if (
      !TIPOS_MODELO_EMAIL_SST.has(
        tipoModeloTratado,
      )
    ) {
      throw new ErroHttp(400,
        "tipoModelo ausente ou inválido para o envio SST.",
      );
    }

    const {
      data: modeloPersistido,
      error: erroModeloPersistido,
    } =
      await supabaseAdmin.rpc(
        "obter_modelo_email_sst_para_envio",
        {
          p_tipo: tipoModeloTratado,
        },
      );

    if (erroModeloPersistido) {
      console.error(
        "Falha ao consultar modelo privado de e-mail SST:",
        erroModeloPersistido,
      );

      throw new ErroHttp(500,
        "Não foi possível carregar o modelo privado de e-mail SST.",
      );
    }

    const modeloAtivo =
      modeloPersistido !== null &&
      modeloPersistido !== undefined;

    const modeloPersistidoSeguro =
      obterObjetoSeguro(
        modeloPersistido,
      );

    const saudacao =
      `Olá${tstResponsavelTratado
        ? `, ${tstResponsavelTratado}`
        : ""}.`;

    const resumo =
      `${totalVencidos} vencido(s) e ${totalAVencer} a vencer.`;

    const dataEnvio =
      new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(new Date());

    const corpoPadrao = [
      saudacao,
      "",
      "Segue aviso automático de documentos/treinamentos SST vencidos ou com vencimento previsto para os próximos 30 dias.",
      "",
      `Empresa: ${empresaTratada}`,
      `Resumo: ${resumo}`,
      "",
      linhas,
      "",
      "Solicitamos regularizar os documentos vencidos e programar a renovação dos próximos vencimentos para evitar bloqueio de atividade.",
      "",
      "Atenciosamente,",
      "Sistema de Controle SST QR",
    ].join("\n");

    const tipoModeloPersistido =
      textoSeguro(
        modeloPersistidoSeguro.tipo,
        100,
      ).toLowerCase();

    const assuntoModelo =
      textoCabecalho(
        modeloPersistidoSeguro.assunto,
        220,
      );

    const corpoModelo =
      textoSeguro(
        modeloPersistidoSeguro.corpo,
        12000,
      );

    const remetenteModelo =
      textoCabecalho(
        modeloPersistidoSeguro.remetenteNome,
        120,
      );

    const versaoModelo =
      Number(
        modeloPersistidoSeguro.versao,
      );

    if (
      modeloAtivo &&
      tipoModeloPersistido !== tipoModeloTratado
    ) {
      throw new ErroHttp(500,
        "A RPC retornou um modelo com tipo incompatível.",
      );
    }

    if (
      modeloAtivo &&
      (
        !assuntoModelo ||
        !corpoModelo
      )
    ) {
      throw new ErroHttp(500,
        "O modelo ativo possui assunto ou corpo inválido.",
      );
    }

    if (
      modeloAtivo &&
      (
        !Number.isInteger(versaoModelo) ||
        versaoModelo < 1
      )
    ) {
      throw new ErroHttp(500,
        "O modelo ativo possui versão inválida.",
      );
    }

    if (
      modeloAtivo &&
      !/\{\{\s*itens\s*\}\}/i.test(corpoModelo)
    ) {
      throw new ErroHttp(500,
        "O modelo ativo deve conter a variável {{itens}}.",
      );
    }

    const valoresModelo: Record<string, string> = {
      saudacao,
      tst_responsavel: tstResponsavelTratado,
      empresa_nome: empresaTratada,
      total_vencidos: String(totalVencidos),
      total_a_vencer: String(totalAVencer),
      quantidade_itens: String(itensNormalizados.length),
      resumo,
      itens: linhas,
      sistema_nome: sistemaTratado,
      url_sistema: urlSistemaTratada,
      data_envio: dataEnvio,
    };

    const assuntoBase =
      assuntoModelo ||
      textoCabecalho(assunto, 220) ||
      `Aviso SST - ${empresaTratada || "documentos vencidos/a vencer"}`;

    const corpoBase =
      corpoModelo ||
      corpoPadrao;

    validarVariaveisModelo(
      assuntoBase,
      "assunto",
      modeloAtivo
        ? 500
        : 400,
    );

    validarVariaveisModelo(
      corpoBase,
      "corpo",
      500,
    );

    const assuntoFinal =
      textoCabecalho(
        substituirVariaveisModelo(
          assuntoBase,
          valoresModelo,
        ),
        220,
      );

    const texto =
      substituirVariaveisModelo(
        corpoBase,
        valoresModelo,
      ).trim();

    if (!assuntoFinal) {
      throw new ErroHttp(500,
        "O assunto final do e-mail ficou vazio.",
      );
    }

    if (!texto) {
      throw new ErroHttp(500,
        "O corpo final do e-mail ficou vazio.",
      );
    }

    const nomeRemetente =
      (
        remetenteModelo ||
        "Sistema Controle SST QR"
      ).replace(/"/g, "'");

    const assinaturaEmail =
      await carregarAssinaturaEmailSst(
        supabaseAdmin,
        tipoModeloTratado,
      );

    const htmlBase =
      montarHtmlEmail(texto);

    const html =
      assinaturaEmail
        ? [
            htmlBase,
            "<br><br>",
            `<img src="cid:${assinaturaEmail.cid}" alt="Assinatura" style="display:block;max-width:100%;height:auto;border:0;">`,
          ].join("")
        : htmlBase;

    await transporter.sendMail({
      from: `"${nomeRemetente}" <${gmailUser}>`,
      to: destinatario,
      subject: assuntoFinal,
      text: texto,
      html,

      ...(assinaturaEmail
        ? {
            attachments: [
              assinaturaEmail,
            ],
          }
        : {}),
    });

    return new Response(
      JSON.stringify({
        ok: true,
        mensagem: "E-mail enviado com sucesso.",
        tipoModelo: tipoModeloTratado,
        modeloPersonalizado: modeloAtivo,
        versaoModelo:
          modeloAtivo
            ? versaoModelo
            : null,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    const erroHttp =
      error instanceof ErroHttp
        ? error
        : new ErroHttp(
          500,
          "Falha interna ao enviar o e-mail SST.",
        );

    if (erroHttp.status >= 500) {
      console.error(
        "Falha interna no envio de e-mail SST:",
        error,
      );
    }

    return new Response(
      JSON.stringify({
        ok: false,
        erro:
          erroHttp.publico
            ? erroHttp.message
            : "Não foi possível concluir o envio do e-mail SST.",
      }),
      {
        status: erroHttp.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});