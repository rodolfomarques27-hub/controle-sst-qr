import {
  createClient,
} from "https://esm.sh/@supabase/supabase-js@2.106.0";

import {
  ErroResolvedorEmail,
  resolverTransportadorEmailParaEnvio,
} from "../_shared/emailProvedorResolver.ts";

type Registro =
  Record<string, unknown>;

type ContatoComercial = {
  primeiroNome: string;
  sobrenome: string;
  whatsapp: string;
  empresa: string;
  cargo: string;
  email: string;
  solucao: string;
  origem: string;
};

const DESTINATARIO =
  "rodolfomarques27@gmail.com";

const ORIGENS_DEV =
  new Set([
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://localhost:5173",
    "http://localhost:5174",
  ]);

const SOLUCOES =
  new Map([
    [
      "gestao-sst",
      "Gestão de SST",
    ],
    [
      "gestao-documental",
      "Gestão documental",
    ],
    [
      "colaboradores-qr",
      "Colaboradores + QR",
    ],
    [
      "mapa-campo",
      "Mapa, riscos e campo",
    ],
    [
      "multiempresa",
      "Gestão multiempresa",
    ],
    [
      "implantacao-completa",
      "Implantação completa",
    ],
  ]);

const ORIGENS_CONTATO =
  new Map([
    [
      "google",
      "Google",
    ],
    [
      "indicacao",
      "Indicação",
    ],
    [
      "redes-sociais",
      "Redes sociais",
    ],
    [
      "evento",
      "Evento ou apresentação",
    ],
    [
      "cliente-parceiro",
      "Cliente ou parceiro",
    ],
    [
      "outro",
      "Outro",
    ],
  ]);

function objeto(
  valor: unknown,
): Registro {
  return (
    valor &&
    typeof valor ===
      "object" &&
    !Array.isArray(
      valor,
    )
  )
    ? valor as Registro
    : {};
}

function texto(
  valor: unknown,
  limite = 1000,
) {
  if (
    typeof valor !==
      "string" &&
    typeof valor !==
      "number"
  ) {
    return "";
  }

  return String(
    valor,
  )
    .replace(
      /\0/g,
      "",
    )
    .trim()
    .slice(
      0,
      limite,
    );
}

function email(
  valor: unknown,
) {
  return texto(
    valor,
    254,
  ).toLowerCase();
}

function emailValido(
  valor: string,
) {
  return (
    valor.length >= 3 &&
    valor.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(
      valor,
    )
  );
}

function whatsappValido(
  valor: string,
) {
  return (
    valor.length >= 6 &&
    valor.length <= 30 &&
    /^[0-9+().\-\s]+$/.test(
      valor,
    )
  );
}

function origemPermitida(
  origin: string,
) {
  if (
    ORIGENS_DEV.has(
      origin,
    )
  ) {
    return true;
  }

  try {
    const url =
      new URL(
        origin,
      );

    if (
      url.protocol !==
        "https:"
    ) {
      return false;
    }

    const hostname =
      url.hostname
        .toLowerCase();

    return (
      hostname ===
        "safescanbrasil.com.br" ||
      hostname.endsWith(
        ".safescanbrasil.com.br",
      )
    );
  } catch {
    return false;
  }
}

function cors(
  origin: string,
) {
  return {
    "Access-Control-Allow-Origin":
      origin,

    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",

    "Access-Control-Allow-Methods":
      "POST, OPTIONS",

    "Cache-Control":
      "no-store",

    "Vary":
      "Origin",
  };
}

function resposta(
  origin: string,
  status: number,
  dados: Registro,
) {
  return new Response(
    JSON.stringify(
      dados,
    ),
    {
      status,
      headers: {
        ...cors(
          origin,
        ),

        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function respostaSemCors(
  status: number,
  dados: Registro,
) {
  return new Response(
    JSON.stringify(
      dados,
    ),
    {
      status,
      headers: {
        "Content-Type":
          "application/json; charset=utf-8",

        "Cache-Control":
          "no-store",
      },
    },
  );
}

function escaparHtml(
  valor: string,
) {
  return valor
    .replace(
      /&/g,
      "&amp;",
    )
    .replace(
      /</g,
      "&lt;",
    )
    .replace(
      />/g,
      "&gt;",
    )
    .replace(
      /"/g,
      "&quot;",
    )
    .replace(
      /'/g,
      "&#039;",
    );
}

function escaparNomeRemetente(
  valor: string,
) {
  return valor.replace(
    /(["\\])/g,
    "\\$1",
  );
}

function normalizarContato(
  valor: unknown,
): ContatoComercial {
  const recebido =
    objeto(
      valor,
    );

  return {
    primeiroNome:
      texto(
        recebido.primeiroNome,
        80,
      ),

    sobrenome:
      texto(
        recebido.sobrenome,
        80,
      ),

    whatsapp:
      texto(
        recebido.whatsapp,
        30,
      ),

    empresa:
      texto(
        recebido.empresa,
        120,
      ),

    cargo:
      texto(
        recebido.cargo,
        120,
      ),

    email:
      email(
        recebido.email,
      ),

    solucao:
      texto(
        recebido.solucao,
        80,
      ),

    origem:
      texto(
        recebido.origem,
        80,
      ),
  };
}

function validarContato(
  contato: ContatoComercial,
) {
  if (
    !contato.primeiroNome ||
    !contato.sobrenome ||
    !contato.whatsapp ||
    !contato.empresa ||
    !contato.cargo ||
    !contato.email ||
    !contato.solucao ||
    !contato.origem
  ) {
    throw new Error(
      "CAMPOS_OBRIGATORIOS",
    );
  }

  if (
    !emailValido(
      contato.email,
    )
  ) {
    throw new Error(
      "EMAIL_INVALIDO",
    );
  }

  if (
    !whatsappValido(
      contato.whatsapp,
    )
  ) {
    throw new Error(
      "WHATSAPP_INVALIDO",
    );
  }

  if (
    !SOLUCOES.has(
      contato.solucao,
    )
  ) {
    throw new Error(
      "SOLUCAO_INVALIDA",
    );
  }

  if (
    !ORIGENS_CONTATO.has(
      contato.origem,
    )
  ) {
    throw new Error(
      "ORIGEM_INVALIDA",
    );
  }
}

function mensagemValidacao(
  codigo: string,
) {
  if (
    codigo ===
      "EMAIL_INVALIDO"
  ) {
    return "Informe um e-mail corporativo válido.";
  }

  if (
    codigo ===
      "WHATSAPP_INVALIDO"
  ) {
    return "Informe um WhatsApp válido.";
  }

  if (
    codigo ===
      "SOLUCAO_INVALIDA" ||
    codigo ===
      "ORIGEM_INVALIDA"
  ) {
    return "Revise as opções selecionadas no formulário.";
  }

  return "Preencha todos os campos obrigatórios antes de enviar.";
}

Deno.serve(
  async (
    req,
  ) => {
    const origin =
      req.headers.get(
        "Origin",
      ) || "";

    if (
      !origemPermitida(
        origin,
      )
    ) {
      return respostaSemCors(
        403,
        {
          ok:
            false,

          codigo:
            "ORIGEM_NAO_PERMITIDA",

          mensagem:
            "Origem não autorizada.",
        },
      );
    }

    if (
      req.method ===
        "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            cors(
              origin,
            ),
        },
      );
    }

    if (
      req.method !==
        "POST"
    ) {
      return resposta(
        origin,
        405,
        {
          ok:
            false,

          codigo:
            "METODO_NAO_PERMITIDO",

          mensagem:
            "Método não permitido.",
        },
      );
    }

    let contato:
      ContatoComercial;

    try {
      contato =
        normalizarContato(
          await req.json(),
        );

      validarContato(
        contato,
      );
    } catch (
      error
    ) {
      const codigo =
        (
          error instanceof Error
            ? error.message
            : ""
        ) ||
        "CAMPOS_OBRIGATORIOS";

      return resposta(
        origin,
        400,
        {
          ok:
            false,

          codigo,

          mensagem:
            mensagemValidacao(
              codigo,
            ),
        },
      );
    }

    const supabaseUrl =
      Deno.env.get(
        "SUPABASE_URL",
      ) || "";

    const serviceRole =
      Deno.env.get(
        "SUPABASE_SERVICE_ROLE_KEY",
      ) || "";

    if (
      !supabaseUrl ||
      !serviceRole
    ) {
      return resposta(
        origin,
        500,
        {
          ok:
            false,

          codigo:
            "CONFIGURACAO_INTERNA",

          mensagem:
            "O canal comercial está temporariamente indisponível.",
        },
      );
    }

    const adminClient =
      createClient(
        supabaseUrl,
        serviceRole,
        {
          auth: {
            persistSession:
              false,

            autoRefreshToken:
              false,
          },
        },
      );

    let provedor;

    try {
      provedor =
        await resolverTransportadorEmailParaEnvio(
          adminClient,
          {
            canal:
              "PLATAFORMA",

            nomeRemetenteFallback:
              "SafeScan Brasil",
          },
        );
    } catch (
      error
    ) {
      const codigo =
        error instanceof
          ErroResolvedorEmail
          ? error.codigo
          : "PROVEDOR_INDISPONIVEL";

      console.error(
        "contato_comercial_provedor_indisponivel",
        {
          codigo,
        },
      );

      return resposta(
        origin,
        503,
        {
          ok:
            false,

          codigo:
            "CANAL_EMAIL_INDISPONIVEL",

          mensagem:
            "O canal comercial está temporariamente indisponível. Tente novamente em alguns instantes.",
        },
      );
    }

    const nomeCompleto =
      `${contato.primeiroNome} ${contato.sobrenome}`
        .trim();

    const solucaoRotulo =
      SOLUCOES.get(
        contato.solucao,
      ) ||
      contato.solucao;

    const origemRotulo =
      ORIGENS_CONTATO.get(
        contato.origem,
      ) ||
      contato.origem;

    const recebidoEm =
      new Intl.DateTimeFormat(
        "pt-BR",
        {
          dateStyle:
            "short",

          timeStyle:
            "medium",

          timeZone:
            "America/Sao_Paulo",
        },
      ).format(
        new Date(),
      );

    const assunto =
      `Novo contato comercial SafeScan — ${contato.empresa}`;

    const textoEmail =
      [
        "Nova solicitação comercial recebida pelo site SafeScan Brasil.",
        "",
        `Nome: ${nomeCompleto}`,
        `WhatsApp: ${contato.whatsapp}`,
        `Empresa: ${contato.empresa}`,
        `Cargo: ${contato.cargo}`,
        `E-mail: ${contato.email}`,
        `Solução de interesse: ${solucaoRotulo}`,
        `Como conheceu a SafeScan: ${origemRotulo}`,
        `Recebido em: ${recebidoEm}`,
      ].join(
        "\n",
      );

    const htmlEmail =
      `
        <div style="font-family:Arial,sans-serif;color:#17352b;line-height:1.6">
          <h2 style="margin:0 0 18px">Novo contato comercial SafeScan</h2>
          <p>Uma nova solicitação de demonstração foi recebida pelo site.</p>
          <table cellpadding="7" cellspacing="0" style="border-collapse:collapse">
            <tr><td><strong>Nome</strong></td><td>${escaparHtml(nomeCompleto)}</td></tr>
            <tr><td><strong>WhatsApp</strong></td><td>${escaparHtml(contato.whatsapp)}</td></tr>
            <tr><td><strong>Empresa</strong></td><td>${escaparHtml(contato.empresa)}</td></tr>
            <tr><td><strong>Cargo</strong></td><td>${escaparHtml(contato.cargo)}</td></tr>
            <tr><td><strong>E-mail</strong></td><td>${escaparHtml(contato.email)}</td></tr>
            <tr><td><strong>Solução</strong></td><td>${escaparHtml(solucaoRotulo)}</td></tr>
            <tr><td><strong>Origem</strong></td><td>${escaparHtml(origemRotulo)}</td></tr>
            <tr><td><strong>Recebido em</strong></td><td>${escaparHtml(recebidoEm)}</td></tr>
          </table>
          <p style="margin-top:20px">
            Responda este e-mail para falar diretamente com ${escaparHtml(nomeCompleto)}.
          </p>
        </div>
      `.trim();

    try {
      await provedor
        .transportador
        .sendMail({
          from:
            `"${escaparNomeRemetente("SafeScan Brasil")}" <${provedor.remetenteEmail}>`,

          to:
            DESTINATARIO,

          replyTo:
            contato.email,

          subject:
            assunto,

          text:
            textoEmail,

          html:
            htmlEmail,
        });
    } catch {
      return resposta(
        origin,
        502,
        {
          ok:
            false,

          codigo:
            "ENVIO_RECUSADO",

          mensagem:
            "Não foi possível enviar sua solicitação agora. Tente novamente em alguns instantes.",
        },
      );
    } finally {
      try {
        provedor
          .transportador
          ?.close?.();
      } catch {
        // Fechamento best-effort sem expor detalhes do provedor.
      }
    }

    return resposta(
      origin,
      200,
      {
        ok:
          true,

        mensagem:
          "Solicitação comercial enviada com sucesso.",
      },
    );
  },
);
