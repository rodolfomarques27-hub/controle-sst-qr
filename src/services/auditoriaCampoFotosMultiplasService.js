export const LIMITE_FOTOS_POR_FASE = 8;

const TIPOS = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const FASES = new Set(["antes", "depois"]);

export function adicionarFotosAuditoria(existentes, arquivos, limite = LIMITE_FOTOS_POR_FASE) {
  const atuais = Array.isArray(existentes) ? [...existentes] : [];
  const novos = Array.from(arquivos || []);

  if (atuais.length + novos.length > limite) {
    throw new Error(`Limite de ${limite} fotos por fase excedido.`);
  }

  for (const arquivo of novos) {
    if (!TIPOS.has(String(arquivo?.type || "").toLowerCase())) {
      throw new Error("Formato de imagem nao permitido.");
    }

    if (!Number.isFinite(arquivo.size) || arquivo.size <= 0 || arquivo.size > 20 * 1024 * 1024) {
      throw new Error("Arquivo vazio ou maior que 20 MB.");
    }
  }

  return [...atuais, ...novos];
}

export function removerFotoAuditoria(fotos, indice) {
  if (!Array.isArray(fotos)) return [];
  return fotos.filter((_, atual) => atual !== indice);
}

export function montarRegistrosFotosAuditoria({
  auditoriaId,
  empresaId,
  fotos = [],
}) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!uuid.test(String(auditoriaId)) || !uuid.test(String(empresaId))) {
    throw new Error("Vinculo da auditoria invalido.");
  }

  const contadores = { antes: 0, depois: 0 };
  const caminhos = new Set();

  return fotos.map((foto) => {
    const fase = String(foto.fase || "").toLowerCase();
    const caminho = String(foto.caminho || "").trim();
    const mime = String(foto.mimeType || "").toLowerCase();

    if (!FASES.has(fase)) {
      throw new Error("Fase da foto invalida.");
    }

    contadores[fase] += 1;

    if (contadores[fase] > LIMITE_FOTOS_POR_FASE) {
      throw new Error("Limite de fotos por fase excedido.");
    }

    if (
      !caminho ||
      caminho.startsWith("/") ||
      caminho.includes("..") ||
      caminhos.has(caminho)
    ) {
      throw new Error("Caminho da foto invalido ou duplicado.");
    }

    if (!TIPOS.has(mime)) {
      throw new Error("Tipo de imagem invalido.");
    }

    caminhos.add(caminho);

    return {
      auditoria_id: auditoriaId,
      empresa_id: empresaId,
      fase,
      ordem: contadores[fase],
      bucket_id: "auditorias-campo",
      caminho_storage: caminho,
      nome_original: String(foto.nome || "").slice(0, 255),
      mime_type: mime,
    };
  });
}
