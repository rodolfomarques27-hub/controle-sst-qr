type RegistroPublico =
  Record<string, unknown>;

export function criarPublicEndpointHttp(
  origensDev: ReadonlySet<string>,
) {
  function origemPermitida(
    origin: string,
  ) {
    if (
      origensDev.has(
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
    dados: RegistroPublico,
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

  return {
    origemPermitida,
    cors,
    resposta,
  };
}
