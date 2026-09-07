import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Buffer } from "node:buffer";

type Registro = Record<string, unknown>;
type AcoesModulo = Record<string, boolean>;

type SnapshotPermissoes = {
  versao: 1;
  perfil: string;
  ativo: boolean;
  bloqueado: boolean;
  acesso_global: boolean;
  origem_perfil: "perfil_editavel" | "catalogo_estatico";
  origem_permissoes: "usuario_salvo" | "perfil_editavel" | "fallback_estatico";
  modulos: Record<string, AcoesModulo>;
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TIPO_MODELO = "acesso_usuario_criado";
const TIPO_COMUNICACAO = "ACESSO_CRIADO";
const HISTORICO = "acesso_usuario_email_envios";
const SISTEMA_NOME = "SafeScan Brasil";
const URL_SISTEMA = "https://www.safescanbrasil.com.br";

const BUCKET_ASSINATURAS = "assinaturas-email-sst";
const CAMINHO_ASSINATURA = "modelos/acesso_usuario_criado/assinatura";
const LIMITE_ASSINATURA = 2 * 1024 * 1024;

const PERFIS = new Set([
  "administrador",
  "tecnico_sst",
  "auditor",
  "gestor",
  "consulta",
  "bloqueado",
]);

const PERFIS_ROTULOS: Record<string, string> = {
  administrador: "Administrador",
  tecnico_sst: "Técnico SST",
  auditor: "Auditor",
  gestor: "Gestor",
  consulta: "Consulta",
  bloqueado: "Bloqueado",
};

const MODULOS: Record<string, string> = {
  dashboard_sst: "Dashboard SST",
  empresas: "Empresas",
  colaboradores: "Colaboradores",
  treinamentos: "Treinamentos",
  qr_code: "QR Code",
  dashboard_auditoria: "Dashboard Auditoria",
  nova_auditoria: "Nova Auditoria",
  auditoria_sistema: "Auditoria do Sistema",
  acessos_app: "Acessos do App",
  configuracoes: "Configurações",
  storage: "Storage",
  relatorios: "Relatórios",
  vistoria_visualizar: "Vistoria - Visualizar",
  vistoria_editar: "Vistoria - Editar",
};

const ACOES: Record<string, string> = {
  visualizar: "Visualizar",
  cadastrar: "Cadastrar",
  editar: "Editar",
  excluir: "Excluir",
  upload: "Upload",
  exportar: "Exportar",
  limpar_arquivos: "Limpar arquivos",
  gerenciar_permissoes: "Gerenciar permissões",
};

const LEGADOS: Record<string, string[]> = {
  vistoria_visualizar: [
    "mapa_obra_visualizacao",
  ],
  vistoria_editar: [
    "mapa_obra_administracao",
  ],
};

const PADRAO_PERFIL: Record<
  string,
  {
    todos?: boolean;
    modulos?: Record<string, string[]>;
  }
> = {
  administrador: {
    todos: true,
  },

  tecnico_sst: {
    modulos: {
      dashboard_sst: ["visualizar", "exportar"],
      empresas: ["visualizar", "cadastrar", "editar", "upload", "exportar"],
      colaboradores: ["visualizar", "cadastrar", "editar", "upload", "exportar"],
      treinamentos: ["visualizar", "cadastrar", "editar", "upload", "exportar"],
      qr_code: ["visualizar", "exportar"],
      dashboard_auditoria: ["visualizar", "exportar"],
      nova_auditoria: ["visualizar", "cadastrar", "editar", "upload", "exportar"],
      relatorios: ["visualizar", "exportar"],
      vistoria_visualizar: ["visualizar"],
      vistoria_editar: ["visualizar", "cadastrar", "editar", "upload", "exportar"],
    },
  },

  auditor: {
    modulos: {
      dashboard_auditoria: ["visualizar", "exportar"],
      nova_auditoria: ["visualizar", "cadastrar", "upload", "exportar"],
      qr_code: ["visualizar", "exportar"],
      relatorios: ["visualizar", "exportar"],
      vistoria_visualizar: ["visualizar"],
    },
  },

  gestor: {
    modulos: {
      dashboard_sst: ["visualizar", "exportar"],
      dashboard_auditoria: ["visualizar", "exportar"],
      empresas: ["visualizar", "exportar"],
      colaboradores: ["visualizar", "exportar"],
      treinamentos: ["visualizar", "exportar"],
      qr_code: ["visualizar"],
      relatorios: ["visualizar", "exportar"],
      vistoria_visualizar: ["visualizar"],
    },
  },

  consulta: {
    modulos: {
      dashboard_sst: ["visualizar"],
      empresas: ["visualizar"],
      colaboradores: ["visualizar"],
      treinamentos: ["visualizar"],
      qr_code: ["visualizar"],
      relatorios: ["visualizar"],
      vistoria_visualizar: ["visualizar"],
    },
  },

  bloqueado: {
    modulos: {},
  },
};

const VARIAVEIS_MODELO = new Set([
  "usuario_nome",
  "usuario_email",
  "perfil_nome",
  "empresa_nome",
  "modulos_liberados",
  "acoes_liberadas",
  "restricoes",
  "senha_temporaria",
  "sistema_nome",
  "url_sistema",
  "data_envio",
]);

const VARIAVEIS_OBRIGATORIAS = new Set([
  "usuario_nome",
  "usuario_email",
  "perfil_nome",
  "empresa_nome",
  "modulos_liberados",
  "acoes_liberadas",
  "senha_temporaria",
  "url_sistema",
]);

const ORIGENS_PERFIL = new Set([
  "perfil_editavel",
  "catalogo_estatico",
]);

const ORIGENS_PERMISSAO = new Set([
  "usuario_salvo",
  "perfil_editavel",
  "fallback_estatico",
]);

const ERROS_HISTORICO = new Set([
  "PERMISSAO_NEGADA",
  "CONFIGURACAO_INVALIDA",
  "MODELO_NAO_ENCONTRADO",
  "MODELO_INATIVO",
  "DESTINATARIO_INVALIDO",
  "SMTP_NAO_CONFIGURADO",
  "ENVIO_RECUSADO",
  "ENVIO_TIMEOUT",
  "PROVEDOR_INDISPONIVEL",
  "ERRO_INTERNO",
]);

class ErroHttp extends Error {
  status: number;
  codigo: string;
  publico: boolean;

  constructor(
    status: number,
    codigo: string,
    mensagem: string,
    publico = status < 500,
  ) {
    super(mensagem);
    this.name = "ErroHttp";
    this.status = status;
    this.codigo = codigo;
    this.publico = publico;
  }
}

function resposta(
  status: number,
  dados: Registro,
) {
  return new Response(
    JSON.stringify(dados),
    {
      status,
      headers: {
        ...CORS,
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
}

function objeto(
  valor: unknown,
): Registro {
  return (
    valor &&
    typeof valor === "object" &&
    !Array.isArray(valor)
  )
    ? valor as Registro
    : {};
}

function booleano(
  valor: unknown,
) {
  return valor === true || valor === "true";
}

function texto(
  valor: unknown,
  limite = 1000,
) {
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

function cabecalho(
  valor: unknown,
  limite = 220,
) {
  return texto(valor, limite)
    .replace(/[\r\n]+/g, " ")
    .trim();
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
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/i
      .test(valor)
  );
}

function uuidValido(
  valor: string,
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(valor);
}

function perfil(
  valor: unknown,
) {
  const chave =
    texto(valor, 60)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "_");

  if (chave === "admin") {
    return "administrador";
  }

  if (
    chave === "tecnico_sst" ||
    chave === "tecnico_seguranca" ||
    chave === "tecnico_de_seguranca"
  ) {
    return "tecnico_sst";
  }

  return PERFIS.has(chave)
    ? chave
    : "";
}

function operacional(
  permissao: Registro,
) {
  return (
    booleano(permissao.ativo) &&
    !booleano(permissao.bloqueado)
  );
}

function podeGerenciarAcessos(
  permissao: unknown,
) {
  const atual =
    objeto(permissao);

  if (!operacional(atual)) {
    return false;
  }

  if (
    booleano(
      atual.acesso_global,
    ) ||
    perfil(atual.perfil) ===
      "administrador"
  ) {
    return true;
  }

  const permissoes =
    objeto(
      atual.permissoes,
    );

  const criticas =
    objeto(
      permissoes.acoesCriticas,
    );

  const modulos =
    objeto(
      permissoes.modulos,
    );

  const acessosApp =
    objeto(
      modulos.acessos_app,
    );

  const configuracoes =
    objeto(
      modulos.configuracoes,
    );

  return (
    booleano(
      criticas
        .gerenciar_permissoes,
    ) ||
    booleano(
      acessosApp
        .gerenciar_permissoes,
    ) ||
    booleano(
      configuracoes
        .gerenciar_permissoes,
    )
  );
}

function permissaoPadrao(
  chavePerfil: string,
  modulo: string,
  acao: string,
) {
  const regra =
    PADRAO_PERFIL[
      chavePerfil
    ];

  if (!regra) {
    return false;
  }

  if (regra.todos) {
    return true;
  }

  return Boolean(
    regra.modulos?.[modulo]
      ?.includes(acao)
  );
}

function podeExecutarAcao(
  permissao: Registro,
  modulo: string,
  acao: string,
) {
  if (
    !operacional(permissao) ||
    !MODULOS[modulo] ||
    !ACOES[acao]
  ) {
    return false;
  }

  const chavePerfil =
    perfil(permissao.perfil);

  if (
    booleano(
      permissao.acesso_global,
    ) ||
    chavePerfil === "administrador"
  ) {
    return true;
  }

  const permissoes =
    objeto(
      permissao.permissoes,
    );

  if (
    booleano(
      permissoes.acessoTotal,
    )
  ) {
    return true;
  }

  const modulos =
    objeto(
      permissoes.modulos,
    );

  const permissaoModulo =
    objeto(
      modulos[modulo],
    );

  if (
    booleano(
      permissaoModulo[acao],
    )
  ) {
    return true;
  }

  const legados =
    LEGADOS[modulo] || [];

  const legadoLiberado =
    legados.some(
      (moduloLegado) => {
        const permissaoLegada =
          objeto(
            modulos[
              moduloLegado
            ],
          );

        return booleano(
          permissaoLegada[
            acao
          ],
        );
      },
    );

  if (legadoLiberado) {
    return true;
  }

  return permissaoPadrao(
    chavePerfil,
    modulo,
    acao,
  );
}

function possuiObjetoComDados(
  valor: unknown,
) {
  return Object.keys(
    objeto(valor),
  ).length > 0;
}

function montarSnapshotAutoritativo(
  usuario: Registro,
  perfilConfigurado: Registro | null,
): SnapshotPermissoes {
  const chavePerfil =
    perfil(
      usuario.perfil,
    );

  if (!chavePerfil) {
    throw new ErroHttp(
      409,
      "CONFIGURACAO_INVALIDA",
      "Perfil atual do usuário inválido.",
    );
  }

  const perfilEditavelAtivo =
    Boolean(
      perfilConfigurado &&
      perfil(
        perfilConfigurado.chave,
      ) === chavePerfil &&
      perfilConfigurado.ativo !== false
    );

  const permissoesUsuario =
    objeto(
      usuario.permissoes,
    );

  const permissoesPerfil =
    perfilEditavelAtivo
      ? objeto(
          perfilConfigurado
            ?.permissoes_json,
        )
      : {};

  let origemPermissoes:
    SnapshotPermissoes[
      "origem_permissoes"
    ];

  let permissoesEfetivas:
    Registro;

  if (
    possuiObjetoComDados(
      permissoesUsuario,
    )
  ) {
    origemPermissoes =
      "usuario_salvo";

    permissoesEfetivas =
      permissoesUsuario;
  } else if (
    possuiObjetoComDados(
      permissoesPerfil,
    )
  ) {
    origemPermissoes =
      "perfil_editavel";

    permissoesEfetivas =
      permissoesPerfil;
  } else {
    origemPermissoes =
      "fallback_estatico";

    permissoesEfetivas =
      {};
  }

  const permissaoEfetiva:
    Registro = {
      ...usuario,
      perfil:
        chavePerfil,
      permissoes:
        permissoesEfetivas,
  };

  const matriz:
    Record<string, AcoesModulo> =
      {};

  for (
    const chaveModulo of
    Object.keys(MODULOS)
  ) {
    const acoes:
      AcoesModulo = {};

    for (
      const chaveAcao of
      Object.keys(ACOES)
    ) {
      if (
        podeExecutarAcao(
          permissaoEfetiva,
          chaveModulo,
          chaveAcao,
        )
      ) {
        acoes[chaveAcao] =
          true;
      }
    }

    matriz[chaveModulo] =
      acoes;
  }

  return {
    versao: 1,
    perfil:
      chavePerfil,
    ativo:
      booleano(
        usuario.ativo,
      ),
    bloqueado:
      booleano(
        usuario.bloqueado,
      ),
    acesso_global:
      booleano(
        usuario.acesso_global,
      ),
    origem_perfil:
      perfilEditavelAtivo
        ? "perfil_editavel"
        : "catalogo_estatico",
    origem_permissoes:
      origemPermissoes,
    modulos:
      matriz,
  };
}

function normalizarSnapshotRecebido(
  valor: unknown,
): SnapshotPermissoes {
  const recebido =
    objeto(valor);

  if (
    Number(
      recebido.versao,
    ) !== 1
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Versão do snapshot de permissões inválida.",
    );
  }

  for (
    const campo of
    [
      "ativo",
      "bloqueado",
      "acesso_global",
    ]
  ) {
    if (
      !Object.prototype
        .hasOwnProperty.call(
          recebido,
          campo,
        )
    ) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Snapshot de permissões incompleto.",
      );
    }
  }

  const chavePerfil =
    perfil(
      recebido.perfil,
    );

  if (!chavePerfil) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Perfil do snapshot inválido.",
    );
  }

  const origemPerfil =
    texto(
      recebido.origem_perfil,
      50,
    );

  const origemPermissoes =
    texto(
      recebido.origem_permissoes,
      50,
    );

  if (
    !ORIGENS_PERFIL.has(
      origemPerfil,
    ) ||
    !ORIGENS_PERMISSAO.has(
      origemPermissoes,
    )
  ) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Origem do snapshot inválida.",
    );
  }

  const modulosRecebidos =
    objeto(
      recebido.modulos,
    );

  const chavesEsperadas =
    Object.keys(MODULOS);

  const desconhecido =
    Object.keys(
      modulosRecebidos,
    )
      .find(
        (chave) =>
          !MODULOS[chave],
      );

  if (desconhecido) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Snapshot contém módulo desconhecido.",
    );
  }

  const ausente =
    chavesEsperadas
      .find(
        (chave) =>
          !Object.prototype
            .hasOwnProperty.call(
              modulosRecebidos,
              chave,
            ),
      );

  if (ausente) {
    throw new ErroHttp(
      400,
      "CONFIGURACAO_INVALIDA",
      "Snapshot está incompleto para os módulos atuais.",
    );
  }

  const matriz:
    Record<string, AcoesModulo> =
      {};

  for (
    const chaveModulo of
    chavesEsperadas
  ) {
    const acoesRecebidas =
      objeto(
        modulosRecebidos[
          chaveModulo
        ],
      );

    const acaoDesconhecida =
      Object.keys(
        acoesRecebidas,
      )
        .find(
          (chave) =>
            !ACOES[chave],
        );

    if (acaoDesconhecida) {
      throw new ErroHttp(
        400,
        "CONFIGURACAO_INVALIDA",
        "Snapshot contém ação desconhecida.",
      );
    }

    const acoes:
      AcoesModulo = {};

    for (
      const chaveAcao of
      Object.keys(ACOES)
    ) {
      if (
        acoesRecebidas[
          chaveAcao
        ] === true
      ) {
        acoes[
          chaveAcao
        ] = true;
      }
    }

    matriz[chaveModulo] =
      acoes;
  }

  return {
    versao: 1,
    perfil:
      chavePerfil,
    ativo:
      booleano(
        recebido.ativo,
      ),
    bloqueado:
      booleano(
        recebido.bloqueado,
      ),
    acesso_global:
      booleano(
        recebido.acesso_global,
      ),
    origem_perfil:
      origemPerfil as
        SnapshotPermissoes[
          "origem_perfil"
        ],
    origem_permissoes:
      origemPermissoes as
        SnapshotPermissoes[
          "origem_permissoes"
        ],
    modulos:
      matriz,
  };
}

function snapshotsIguais(
  recebido: SnapshotPermissoes,
  autoritativo: SnapshotPermissoes,
) {
  return (
    JSON.stringify(recebido) ===
    JSON.stringify(autoritativo)
  );
}

function derivarListas(
  snapshot: SnapshotPermissoes,
) {
  if (
    !snapshot.ativo ||
    snapshot.bloqueado ||
    snapshot.perfil ===
      "bloqueado"
  ) {
    return {
      modulosLiberados:
        [] as string[],
      acoesLiberadas:
        [] as string[],
      restricoes: [
        "Acesso operacional bloqueado",
      ],
    };
  }

  const modulosLiberados:
    string[] = [];

  const acoesUsadas =
    new Set<string>();

  for (
    const [
      chaveModulo,
      rotulo,
    ] of
    Object.entries(MODULOS)
  ) {
    const acoes =
      snapshot.modulos[
        chaveModulo
      ];

    if (
      Object.keys(acoes)
        .length > 0
    ) {
      modulosLiberados
        .push(rotulo);
    }

    for (
      const chaveAcao of
      Object.keys(acoes)
    ) {
      if (
        acoes[chaveAcao] === true
      ) {
        acoesUsadas.add(
          chaveAcao,
        );
      }
    }
  }

  const acoesLiberadas =
    Object.entries(ACOES)
      .filter(
        ([chave]) =>
          acoesUsadas.has(chave),
      )
      .map(
        ([, rotulo]) =>
          rotulo,
      );

  const restricoesModulo =
    Object.entries(MODULOS)
      .filter(
        ([chave]) =>
          Object.keys(
            snapshot.modulos[
              chave
            ],
          ).length === 0,
      )
      .map(
        ([, rotulo]) =>
          `Módulo não liberado: ${rotulo}`,
      );

  const restricoesAcao =
    Object.entries(ACOES)
      .filter(
        ([chave]) =>
          !acoesUsadas.has(chave),
      )
      .map(
        ([, rotulo]) =>
          `Ação não liberada: ${rotulo}`,
      );

  return {
    modulosLiberados,
    acoesLiberadas,
    restricoes: [
      ...restricoesModulo,
      ...restricoesAcao,
    ],
  };
}

function lista(
  valores: string[],
  vazio: string,
) {
  return valores.length
    ? valores.join(", ")
    : vazio;
}

function variaveis(
  conteudo: string,
) {
  const resultado =
    new Set<string>();

  const regex =
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

  for (
    const item of
    conteudo.matchAll(regex)
  ) {
    resultado.add(
      String(
        item[1] || "",
      )
        .trim()
        .toLowerCase(),
    );
  }

  return resultado;
}

function validarModelo(
  assunto: string,
  corpo: string,
) {
  const variaveisAssunto =
    variaveis(assunto);

  if (
    variaveisAssunto.has(
      "senha_temporaria",
    )
  ) {
    throw new ErroHttp(
      500,
      "CONFIGURACAO_INVALIDA",
      "A credencial inicial não pode ser utilizada no assunto da comunicação.",
      false,
    );
  }

  const todas =
    variaveis(
      `${assunto}\n${corpo}`,
    );

  const desconhecidas =
    [...todas]
      .filter(
        (chave) =>
          !VARIAVEIS_MODELO
            .has(chave),
      );

  if (
    desconhecidas.length
  ) {
    throw new ErroHttp(
      500,
      "CONFIGURACAO_INVALIDA",
      "Modelo de acesso contém variável não suportada.",
      false,
    );
  }

  const faltantes =
    [...VARIAVEIS_OBRIGATORIAS]
      .filter(
        (chave) =>
          !todas.has(chave),
      );

  if (faltantes.length) {
    throw new ErroHttp(
      500,
      "CONFIGURACAO_INVALIDA",
      "Modelo de acesso está incompleto.",
      false,
    );
  }
}

function substituir(
  conteudo: string,
  valores: Record<string, string>,
) {
  return conteudo.replace(
    /\{\{\s*([a-z0-9_]+)\s*\}\}/gi,
    (
      original,
      chaveOriginal,
    ) => {
      const chave =
        String(
          chaveOriginal || "",
        )
          .trim()
          .toLowerCase();

      return Object.prototype
        .hasOwnProperty.call(
          valores,
          chave,
        )
        ? valores[chave]
        : original;
    },
  );
}

function escaparHtml(
  valor: string,
) {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlEmail(
  corpo: string,
) {
  return escaparHtml(corpo)
    .replace(/\n/g, "<br>");
}

function escaparNomeRemetente(
  valor: string,
) {
  return valor.replace(
    /(["\\])/g,
    "\\$1",
  );
}

function mimeAssinatura(
  bytes: Uint8Array,
) {
  const png =
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;

  if (png) {
    return "image/png";
  }

  const jpeg =
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;

  return jpeg
    ? "image/jpeg"
    : "";
}

async function carregarAssinatura(
  adminClient: any,
) {
  try {
    const {
      data,
      error,
    } =
      await adminClient
        .storage
        .from(
          BUCKET_ASSINATURAS,
        )
        .download(
          CAMINHO_ASSINATURA,
        );

    if (
      error ||
      !data ||
      data.size < 1 ||
      data.size >
        LIMITE_ASSINATURA
    ) {
      return null;
    }

    const bytes =
      new Uint8Array(
        await data.arrayBuffer(),
      );

    const mime =
      mimeAssinatura(bytes);

    if (!mime) {
      return null;
    }

    return {
      filename:
        mime === "image/png"
          ? "assinatura.png"
          : "assinatura.jpg",

      content:
        Buffer.from(bytes),

      contentType:
        mime,

      contentDisposition:
        "inline",

      cid:
        "assinatura-acesso-usuario@safescanbrasil",
    };
  } catch {
    return null;
  }
}

async function criarTransportador(
  gmailUser: string,
  gmailAppPassword: string,
) {
  const moduloNodemailer =
    await import(
      "npm:nodemailer@6.9.16"
    );

  const nodemailer =
    moduloNodemailer.default;

  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user:
        gmailUser,
      pass:
        gmailAppPassword,
    },
  });
}

function classificarErroEnvio(
  erro: unknown,
) {
  const registro =
    objeto(erro);

  const descricao =
    [
      texto(
        registro.code,
        100,
      ),
      texto(
        registro.message,
        500,
      ),
      texto(
        registro.responseCode,
        100,
      ),
    ]
      .join(" ")
      .toLowerCase();

  if (
    descricao.includes("timeout") ||
    descricao.includes("etimedout")
  ) {
    return "ENVIO_TIMEOUT";
  }

  if (
    descricao.includes("535") ||
    descricao.includes("auth") ||
    descricao.includes("credential")
  ) {
    return "SMTP_NAO_CONFIGURADO";
  }

  if (
    descricao.includes("550") ||
    descricao.includes("553") ||
    descricao.includes("rejected") ||
    descricao.includes("refused")
  ) {
    return "ENVIO_RECUSADO";
  }

  if (
    descricao.includes("econn") ||
    descricao.includes("network") ||
    descricao.includes("connect")
  ) {
    return "PROVEDOR_INDISPONIVEL";
  }

  return "ERRO_INTERNO";
}

function criarPayloadHistoricoSeguro({
  usuario,
  snapshot,
  modulosLiberados,
  acoesLiberadas,
  restricoes,
  modeloVersao,
  remetenteNome,
  chaveIdempotencia,
  tentativaNumero,
  reenvioDeId,
  executorId,
  executorEmail,
}: {
  usuario: Registro;
  snapshot: SnapshotPermissoes;
  modulosLiberados: string[];
  acoesLiberadas: string[];
  restricoes: string[];
  modeloVersao: number;
  remetenteNome: string;
  chaveIdempotencia: string;
  tentativaNumero: number;
  reenvioDeId: string | null;
  executorId: string;
  executorEmail: string | null;
}) {
  return {
    usuario_permissao_id:
      usuario.id || null,

    usuario_id:
      usuario.user_id || null,

    usuario_email:
      email(
        usuario.email,
      ),

    usuario_nome:
      texto(
        usuario.nome,
        300,
      ) || null,

    empresa_id:
      usuario.empresa_id ||
      null,

    empresa_nome:
      texto(
        usuario.empresa,
        300,
      ) || null,

    tipo_comunicacao:
      TIPO_COMUNICACAO,

    perfil_snapshot:
      snapshot.perfil,

    permissoes_snapshot:
      snapshot,

    modulos_liberados:
      modulosLiberados,

    acoes_liberadas:
      acoesLiberadas,

    restricoes:
      restricoes,

    modelo_tipo:
      TIPO_MODELO,

    modelo_versao:
      modeloVersao,

    destinatario_email:
      email(
        usuario.email,
      ),

    remetente_nome:
      remetenteNome,

    status:
      "PREPARANDO",

    chave_idempotencia:
      chaveIdempotencia,

    tentativa_numero:
      tentativaNumero,

    reenvio_de_id:
      reenvioDeId,

    solicitado_por:
      executorId,

    solicitado_por_email:
      executorEmail,
  };
}

async function marcarErro(
  adminClient: any,
  envioId: string,
  codigo: string,
) {
  const seguro =
    ERROS_HISTORICO.has(
      codigo,
    )
      ? codigo
      : "ERRO_INTERNO";

  await adminClient
    .from(
      HISTORICO,
    )
    .update({
      status:
        "ERRO",

      erro_codigo:
        seguro,

      enviado_em:
        null,
    })
    .eq(
      "id",
      envioId,
    );
}

Deno.serve(
  async (
    req,
  ) => {
    if (
      req.method === "OPTIONS"
    ) {
      return new Response(
        "ok",
        {
          headers:
            CORS,
        },
      );
    }

    if (
      req.method !== "POST"
    ) {
      return resposta(
        405,
        {
          ok: false,
          codigo:
            "CONFIGURACAO_INVALIDA",
          erro:
            "Método não permitido.",
        },
      );
    }

    try {
      const supabaseUrl =
        Deno.env.get(
          "SUPABASE_URL",
        ) || "";

      const anonKey =
        Deno.env.get(
          "SUPABASE_ANON_KEY",
        ) || "";

      const serviceRole =
        Deno.env.get(
          "SUPABASE_SERVICE_ROLE_KEY",
        ) || "";

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceRole
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Configuração interna indisponível.",
          false,
        );
      }

      const authorization =
        req.headers.get(
          "Authorization",
        ) || "";

      if (
        !authorization
          .toLowerCase()
          .startsWith(
            "bearer ",
          )
      ) {
        throw new ErroHttp(
          401,
          "PERMISSAO_NEGADA",
          "Usuário não autenticado.",
        );
      }

      const userClient =
        createClient(
          supabaseUrl,
          anonKey,
          {
            global: {
              headers: {
                Authorization:
                  authorization,
              },
            },
          },
        );

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

      const {
        data: authData,
        error: authError,
      } =
        await userClient
          .auth
          .getUser();

      if (
        authError ||
        !authData?.user
      ) {
        throw new ErroHttp(
          401,
          "PERMISSAO_NEGADA",
          "Usuário autenticado não identificado.",
        );
      }

      const {
        data:
          permissaoAtualData,
        error:
          permissaoAtualError,
      } =
        await userClient.rpc(
          "usuario_permissao_sistema_atual",
        );

      if (
        permissaoAtualError
      ) {
        throw new ErroHttp(
          403,
          "PERMISSAO_NEGADA",
          "Não foi possível validar a permissão atual.",
        );
      }

      const permissaoAtual =
        Array.isArray(
          permissaoAtualData,
        )
          ? permissaoAtualData[0]
          : permissaoAtualData;

      if (
        !podeGerenciarAcessos(
          permissaoAtual,
        )
      ) {
        throw new ErroHttp(
          403,
          "PERMISSAO_NEGADA",
          "Sem permissão para enviar comunicação de acesso.",
        );
      }

      let corpo:
        Registro;

      try {
        corpo =
          objeto(
            await req.json(),
          );
      } catch {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "JSON inválido.",
        );
      }

      const usuarioEmail =
        email(
          corpo.usuarioEmail ??
          corpo.usuario_email,
        );

      const chaveIdempotencia =
        texto(
          corpo.chaveIdempotencia ??
          corpo.chave_idempotencia,
          100,
        ).toLowerCase();

      const reenvioTexto =
        texto(
          corpo.reenvioDeId ??
          corpo.reenvio_de_id,
          100,
        ).toLowerCase();

      const reenvioDeId =
        reenvioTexto ||
        null;

      const senhaTemporaria =
        String(
          corpo.senhaTemporaria ??
          corpo.senha_temporaria ??
          "",
        );

      const snapshotRecebido =
        normalizarSnapshotRecebido(
          corpo.permissoesSnapshot ??
          corpo.permissoes_snapshot,
        );

      if (
        !emailValido(
          usuarioEmail,
        )
      ) {
        throw new ErroHttp(
          400,
          "DESTINATARIO_INVALIDO",
          "Destinatário inválido.",
        );
      }

      if (
        !uuidValido(
          chaveIdempotencia,
        )
      ) {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "Chave de idempotência inválida.",
        );
      }

      if (
        reenvioDeId &&
        !uuidValido(
          reenvioDeId,
        )
      ) {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "Referência de reenvio inválida.",
        );
      }

      if (
        senhaTemporaria.length < 6 ||
        senhaTemporaria.length > 200
      ) {
        throw new ErroHttp(
          400,
          "CONFIGURACAO_INVALIDA",
          "Credencial inicial inválida.",
        );
      }

      const {
        data:
          existente,
        error:
          existenteError,
      } =
        await adminClient
          .from(
            HISTORICO,
          )
          .select(
            "id,status,usuario_email",
          )
          .eq(
            "chave_idempotencia",
            chaveIdempotencia,
          )
          .maybeSingle();

      if (
        existenteError
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Falha ao validar idempotência.",
          false,
        );
      }

      if (existente) {
        if (
          email(
            existente.usuario_email,
          ) !== usuarioEmail
        ) {
          throw new ErroHttp(
            409,
            "CONFIGURACAO_INVALIDA",
            "Chave de idempotência já utilizada em outra comunicação.",
          );
        }

        if (
          existente.status ===
            "ENVIADO"
        ) {
          return resposta(
            200,
            {
              ok:
                true,

              idempotente:
                true,

              envioId:
                existente.id,

              status:
                "ENVIADO",
            },
          );
        }

        return resposta(
          409,
          {
            ok:
              false,

            codigo:
              "CONFIGURACAO_INVALIDA",

            erro:
              "Chave de idempotência já utilizada.",

            envioId:
              existente.id,

            status:
              existente.status,
          },
        );
      }

      const {
        data:
          usuario,
        error:
          usuarioError,
      } =
        await adminClient
          .from(
            "usuarios_permissoes_sistema",
          )
          .select(
            "id,user_id,email,nome,empresa,empresa_id,perfil,ativo,bloqueado,acesso_global,permissoes,excluido,precisa_trocar_senha",
          )
          .eq(
            "email",
            usuarioEmail,
          )
          .maybeSingle();

      if (
        usuarioError
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Falha ao consultar usuário.",
          false,
        );
      }

      if (
        !usuario ||
        booleano(
          usuario.excluido,
        )
      ) {
        throw new ErroHttp(
          404,
          "DESTINATARIO_INVALIDO",
          "Usuário de destino não encontrado.",
        );
      }

      if (
        !usuario.user_id
      ) {
        throw new ErroHttp(
          409,
          "CONFIGURACAO_INVALIDA",
          "Usuário ainda não possui login vinculado.",
        );
      }

      if (
        !booleano(
          usuario.precisa_trocar_senha,
        )
      ) {
        throw new ErroHttp(
          409,
          "CONFIGURACAO_INVALIDA",
          "A comunicação de acesso inicial não pode ser enviada porque o primeiro acesso já foi concluído ou a credencial temporária não está mais ativa.",
        );
      }

      const chavePerfil =
        perfil(
          usuario.perfil,
        );

      if (
        !chavePerfil
      ) {
        throw new ErroHttp(
          409,
          "CONFIGURACAO_INVALIDA",
          "Perfil atual do usuário inválido.",
        );
      }

      const {
        data:
          perfilConfigurado,
        error:
          perfilError,
      } =
        await adminClient
          .from(
            "perfis_permissoes_sistema",
          )
          .select(
            "chave,nome,ativo,permissoes_json",
          )
          .eq(
            "chave",
            chavePerfil,
          )
          .maybeSingle();

      if (
        perfilError
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Falha ao consultar perfil.",
          false,
        );
      }

      const snapshotAutoritativo =
        montarSnapshotAutoritativo(
          objeto(
            usuario,
          ),
          perfilConfigurado
            ? objeto(
                perfilConfigurado,
              )
            : null,
        );

      if (
        !snapshotsIguais(
          snapshotRecebido,
          snapshotAutoritativo,
        )
      ) {
        throw new ErroHttp(
          409,
          "CONFIGURACAO_INVALIDA",
          "As permissões foram alteradas ou o snapshot não corresponde ao estado atual. Atualize os dados antes de enviar.",
        );
      }

      const {
        modulosLiberados,
        acoesLiberadas,
        restricoes,
      } =
        derivarListas(
          snapshotAutoritativo,
        );

      const perfilNome =
        (
          perfilConfigurado &&
          perfilConfigurado.ativo !==
            false
        )
          ? texto(
              perfilConfigurado.nome,
              150,
            )
          : (
              PERFIS_ROTULOS[
                chavePerfil
              ] ||
              chavePerfil
            );

      const {
        data:
          modeloData,
        error:
          modeloError,
      } =
        await adminClient.rpc(
          "obter_modelo_email_sst_para_envio",
          {
            p_tipo:
              TIPO_MODELO,
          },
        );

      if (
        modeloError
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Falha ao carregar modelo de comunicação.",
          false,
        );
      }

      const modelo =
        objeto(
          modeloData,
        );

      if (
        !Object.keys(
          modelo,
        ).length
      ) {
        throw new ErroHttp(
          500,
          "MODELO_NAO_ENCONTRADO",
          "Modelo de acesso não encontrado.",
          false,
        );
      }

      const tipoModelo =
        texto(
          modelo.tipo,
          100,
        ).toLowerCase();

      const assuntoModelo =
        cabecalho(
          modelo.assunto,
          220,
        );

      const corpoModelo =
        texto(
          modelo.corpo,
          12000,
        );

      const remetenteNome =
        cabecalho(
          modelo.remetenteNome,
          120,
        ) ||
        "SafeScan Brasil";

      const modeloVersao =
        Number(
          modelo.versao,
        );

      if (
        tipoModelo !==
          TIPO_MODELO ||
        !assuntoModelo ||
        !corpoModelo ||
        !Number.isInteger(
          modeloVersao,
        ) ||
        modeloVersao < 1
      ) {
        throw new ErroHttp(
          500,
          "CONFIGURACAO_INVALIDA",
          "Modelo de acesso inválido.",
          false,
        );
      }

      validarModelo(
        assuntoModelo,
        corpoModelo,
      );

      const usuarioNome =
        texto(
          usuario.nome,
          300,
        ) ||
        usuarioEmail.split(
          "@",
        )[0];

      const empresaNome =
        texto(
          usuario.empresa,
          300,
        ) ||
        "Não informada";

      const dataEnvio =
        new Intl.DateTimeFormat(
          "pt-BR",
          {
            dateStyle:
              "short",
            timeStyle:
              "short",
            timeZone:
              "America/Sao_Paulo",
          },
        ).format(
          new Date(),
        );

      const valoresModelo:
        Record<string, string> = {
          usuario_nome:
            usuarioNome,

          usuario_email:
            usuarioEmail,

          perfil_nome:
            perfilNome,

          empresa_nome:
            empresaNome,

          modulos_liberados:
            lista(
              modulosLiberados,
              "Nenhum módulo liberado",
            ),

          acoes_liberadas:
            lista(
              acoesLiberadas,
              "Nenhuma ação liberada",
            ),

          restricoes:
            lista(
              restricoes,
              "Nenhuma restrição adicional",
            ),

          senha_temporaria:
            senhaTemporaria,

          sistema_nome:
            SISTEMA_NOME,

          url_sistema:
            URL_SISTEMA,

          data_envio:
            dataEnvio,
        };

      const assuntoFinal =
        cabecalho(
          substituir(
            assuntoModelo,
            valoresModelo,
          ),
          220,
        );

      const textoFinal =
        substituir(
          corpoModelo,
          valoresModelo,
        ).trim();

      if (
        !assuntoFinal ||
        !textoFinal
      ) {
        throw new ErroHttp(
          500,
          "CONFIGURACAO_INVALIDA",
          "Comunicação resultou em conteúdo vazio.",
          false,
        );
      }

      if (
        /\{\{\s*[a-z0-9_]+\s*\}\}/i
          .test(
            `${assuntoFinal}\n${textoFinal}`,
          )
      ) {
        throw new ErroHttp(
          500,
          "CONFIGURACAO_INVALIDA",
          "Comunicação contém variável não resolvida.",
          false,
        );
      }

      let tentativaNumero =
        1;

      if (
        reenvioDeId
      ) {
        const {
          data:
            anterior,
          error:
            anteriorError,
        } =
          await adminClient
            .from(
              HISTORICO,
            )
            .select(
              "id,usuario_email,tentativa_numero",
            )
            .eq(
              "id",
              reenvioDeId,
            )
            .maybeSingle();

        if (
          anteriorError
        ) {
          throw new ErroHttp(
            500,
            "ERRO_INTERNO",
            "Falha ao validar reenvio.",
            false,
          );
        }

        if (
          !anterior ||
          email(
            anterior.usuario_email,
          ) !== usuarioEmail
        ) {
          throw new ErroHttp(
            400,
            "CONFIGURACAO_INVALIDA",
            "Reenvio incompatível com o usuário.",
          );
        }

        tentativaNumero =
          Number(
            anterior
              .tentativa_numero,
          ) + 1;

        if (
          !Number.isInteger(
            tentativaNumero,
          ) ||
          tentativaNumero < 2 ||
          tentativaNumero > 100
        ) {
          throw new ErroHttp(
            409,
            "CONFIGURACAO_INVALIDA",
            "Limite de tentativas atingido.",
          );
        }
      }

      const executorEmail =
        email(
          authData.user.email,
        ) ||
        null;

      const payloadHistorico =
        criarPayloadHistoricoSeguro({
          usuario:
            objeto(
              usuario,
            ),

          snapshot:
            snapshotAutoritativo,

          modulosLiberados,
          acoesLiberadas,
          restricoes,
          modeloVersao,
          remetenteNome,
          chaveIdempotencia,
          tentativaNumero,
          reenvioDeId,

          executorId:
            authData.user.id,

          executorEmail,
        });

      const {
        data:
          historico,
        error:
          historicoError,
      } =
        await adminClient
          .from(
            HISTORICO,
          )
          .insert(
            payloadHistorico,
          )
          .select(
            "id,status",
          )
          .single();

      if (
        historicoError ||
        !historico?.id
      ) {
        throw new ErroHttp(
          500,
          "ERRO_INTERNO",
          "Falha ao iniciar histórico seguro.",
          false,
        );
      }

      const envioId =
        String(
          historico.id,
        );

      const gmailUser =
        email(
          Deno.env.get(
            "GMAIL_USER",
          ),
        );

      const gmailAppPassword =
        String(
          Deno.env.get(
            "GMAIL_APP_PASSWORD",
          ) || "",
        );

      if (
        !emailValido(
          gmailUser,
        ) ||
        !gmailAppPassword
      ) {
        await marcarErro(
          adminClient,
          envioId,
          "SMTP_NAO_CONFIGURADO",
        );

        return resposta(
          500,
          {
            ok:
              false,

            codigo:
              "SMTP_NAO_CONFIGURADO",

            erro:
              "Serviço de comunicação não configurado.",

            envioId,
          },
        );
      }

      const {
        error:
          enviandoError,
      } =
        await adminClient
          .from(
            HISTORICO,
          )
          .update({
            status:
              "ENVIANDO",
          })
          .eq(
            "id",
            envioId,
          );

      if (
        enviandoError
      ) {
        await marcarErro(
          adminClient,
          envioId,
          "ERRO_INTERNO",
        );

        return resposta(
          500,
          {
            ok:
              false,

            codigo:
              "ERRO_INTERNO",

            erro:
              "Falha ao iniciar envio rastreável.",

            envioId,
          },
        );
      }

      const assinatura =
        await carregarAssinatura(
          adminClient,
        );

      const htmlBase =
        htmlEmail(
          textoFinal,
        );

      const htmlFinal =
        assinatura
          ? (
              htmlBase +
              "<br><br>" +
              `<img src="cid:${assinatura.cid}" alt="Assinatura" style="display:block;max-width:100%;height:auto;border:0;">`
            )
          : htmlBase;

      let resultadoEnvio:
        {
          messageId?:
            unknown;
        };

      try {
        const transporter =
          await criarTransportador(
            gmailUser,
            gmailAppPassword,
          );

        resultadoEnvio =
          await transporter
            .sendMail({
              from:
                `"${escaparNomeRemetente(remetenteNome)}" <${gmailUser}>`,

              to:
                usuarioEmail,

              subject:
                assuntoFinal,

              text:
                textoFinal,

              html:
                htmlFinal,

              ...(assinatura
                ? {
                    attachments: [
                      assinatura,
                    ],
                  }
                : {}),
            });
      } catch (
        erro
      ) {
        const codigo =
          classificarErroEnvio(
            erro,
          );

        await marcarErro(
          adminClient,
          envioId,
          codigo,
        );

        return resposta(
          502,
          {
            ok:
              false,

            codigo,

            erro:
              "Não foi possível entregar a comunicação de acesso.",

            envioId,
          },
        );
      }

      const messageId =
        texto(
          resultadoEnvio
            ?.messageId,
          500,
        ) ||
        null;

      const {
        error:
          finalError,
      } =
        await adminClient
          .from(
            HISTORICO,
          )
          .update({
            status:
              "ENVIADO",

            provedor_mensagem_id:
              messageId,

            erro_codigo:
              null,

            enviado_em:
              new Date()
                .toISOString(),
          })
          .eq(
            "id",
            envioId,
          );

      if (
        finalError
      ) {
        return resposta(
          500,
          {
            ok:
              false,

            codigo:
              "ERRO_INTERNO",

            erro:
              "A comunicação foi aceita pelo provedor, mas o histórico não pôde ser concluído. Não reutilize a mesma chave de idempotência.",

            envioId,
          },
        );
      }

      return resposta(
        200,
        {
          ok:
            true,

          idempotente:
            false,

          envioId,

          status:
            "ENVIADO",

          tipoModelo:
            TIPO_MODELO,

          modeloVersao,
        },
      );
    } catch (
      erro
    ) {
      const tratado =
        erro instanceof ErroHttp
          ? erro
          : new ErroHttp(
              500,
              "ERRO_INTERNO",
              "Falha interna na comunicação.",
              false,
            );

      return resposta(
        tratado.status,
        {
          ok:
            false,

          codigo:
            tratado.codigo,

          erro:
            tratado.publico
              ? tratado.message
              : "Não foi possível concluir a comunicação de acesso.",
        },
      );
    }
  },
);
