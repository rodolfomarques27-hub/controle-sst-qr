/*
 * SAFE_SCAN_STORAGE_RESUMO_NOVOS_BUCKETS_V11
 */
export const BUCKETS_STORAGE_SST = [
    {
        chave: "certificados-treinamentos",
        label: "Certificados e documentos de colaboradores",
        tipo: "Privado",
        criticidade: "Alta",
        recomendacao: "Manter bucket privado e abrir arquivos somente por URL assinada temporária.",
    },
    {
        chave: "documentos-empresas",
        label: "Documentos das empresas",
        tipo: "Privado",
        criticidade: "Alta",
        recomendacao: "Manter documentos empresariais em bucket privado, com acesso controlado pelo sistema.",
    },
    {
        chave: "contratos-empresas",
        label: "Contratos das empresas",
        tipo: "Privado",
        criticidade: "Alta",
        recomendacao: "Evitar links públicos permanentes para contratos e documentos contratuais.",
    },
    {
        chave: "fotos-colaboradores",
        label: "Fotos dos colaboradores",
        tipo: "Privado",
        criticidade: "Média",
        recomendacao: "Tratar imagens de colaboradores como dados pessoais e evitar exposição pública.",
    },
    {
        chave: "auditorias-campo",
        label: "Fotos de auditorias de campo",
        tipo: "Privado",
        criticidade: "Média",
        recomendacao: "Manter fotos de desvios e evidências acessíveis somente para usuários autorizados.",
    },
    {
        chave: "logos-empresas",
        label: "Logos das empresas",
        tipo: "Controlado",
        criticidade: "Baixa",
        recomendacao: "Pode ter menor criticidade, mas deve manter padrão de caminho e origem confiável.",
    },
    {
        chave: "certidao-mensal-documentos",
        label: "Documentos da Certidão Mensal",
        tipo: "Privado",
        criticidade: "Alta",
        recomendacao: "Preservar todas as versões e evidências vinculadas ao fechamento documental mensal.",
    },
    {
        chave: "dds-assinados",
        label: "Documentos assinados de DDS",
        tipo: "Privado",
        criticidade: "Alta",
        recomendacao: "Preservar documentos assinados e respectivas evidências de frequência.",
    },
    {
        chave: "mapas-obras",
        label: "Plantas e mapas das obras",
        tipo: "Privado",
        criticidade: "Média",
        recomendacao: "Manter plantas vinculadas à obra e aos pontos cadastrados.",
    },
    {
        chave: "assinaturas-email-sst",
        label: "Assinaturas dos modelos de e-mail SST",
        tipo: "Privado",
        criticidade: "Média",
        recomendacao: "Tratar as assinaturas como ativos internos controlados do sistema.",
    },
];

export function avaliarSegurancaStorageSistema() {
    const avaliacoesBuckets = BUCKETS_STORAGE_SST.map((bucket) => ({
        chave: `bucket-${bucket.chave}`,
        grupo: "Bucket",
        label: bucket.label,
        descricao: `${bucket.chave} · criticidade ${bucket.criticidade} · tratamento ${bucket.tipo}.`,
        recomendacao: bucket.recomendacao,
        nivel: bucket.tipo === "Privado" ? "ok" : "info",
    }));

    return [
        {
            chave: "nao-usar-getpublicurl-privado",
            grupo: "Acesso",
            label: "Não usar getPublicUrl em arquivos privados",
            descricao: "Certificados, documentos, contratos e fotos não devem ser abertos por link público permanente.",
            recomendacao: "Continuar usando URL assinada temporária para visualizar arquivos privados.",
            nivel: "ok",
        },
        {
            chave: "urls-assinadas-temporarias",
            grupo: "Acesso",
            label: "URLs assinadas temporárias",
            descricao: "O acesso a arquivos privados deve expirar automaticamente após curto período.",
            recomendacao: "Manter createSignedUrl nos fluxos de abertura de certificados e documentos privados.",
            nivel: "ok",
        },
        {
            chave: "remocao-arquivo-antigo",
            grupo: "Manutenção",
            label: "Remover arquivo antigo ao substituir certificado",
            descricao: "Quando um certificado é substituído, o arquivo anterior não deve ficar órfão no Storage.",
            recomendacao: "Manter rotina de remoção do arquivo anterior antes/depois da atualização do registro.",
            nivel: "ok",
        },
        {
            chave: "politicas-rls-storage",
            grupo: "Supabase",
            label: "Conferir policies do Storage no Supabase",
            descricao: "A tela faz checklist operacional, mas as policies reais precisam ser conferidas no painel do Supabase.",
            recomendacao: "Validar buckets, policies e permissões diretamente no Supabase antes de comercializar o sistema.",
            nivel: "alerta",
        },
        ...avaliacoesBuckets,
    ];
}


const BYTES_MB = 1024 * 1024;
const STORAGE_BUCKETS_RESUMO_REAL = BUCKETS_STORAGE_SST.map((bucket) => bucket.chave);

function normalizarTamanhoArquivoStorage(item = {}) {
    return Number(
        item?.metadata?.size ??
        item?.metadata?.Size ??
        item?.size ??
        0
    ) || 0;
}

function normalizarMimeStorage(item = {}) {
    return String(
        item?.metadata?.mimetype ??
        item?.metadata?.mimeType ??
        item?.metadata?.contentType ??
        item?.mimetype ??
        ""
    ).trim();
}

function montarResumoVazioStorageReal() {
    return {
        totalBytes: 0,
        totalMb: 0,
        arquivos: 0,
        buckets: [],
        atualizadoEm: new Date().toISOString(),
        origem: "vazio",
    };
}

function finalizarResumoStorageReal(registros = [], origem = "storage.objects") {
    const mapaBuckets = new Map();

    (Array.isArray(registros) ? registros : []).forEach((item) => {
        const bucket = String(item?.bucket_id || item?.bucket || "").trim();
        if (!bucket || !STORAGE_BUCKETS_RESUMO_REAL.includes(bucket)) return;

        const bytes = normalizarTamanhoArquivoStorage(item);
        const mimetype = normalizarMimeStorage(item);
        const atual = mapaBuckets.get(bucket) || {
            bucket,
            bytes: 0,
            arquivos: 0,
            mimeTypes: new Set(),
        };

        atual.bytes += bytes;
        atual.arquivos += 1;
        if (mimetype) atual.mimeTypes.add(mimetype);
        mapaBuckets.set(bucket, atual);
    });

    const buckets = Array.from(mapaBuckets.values())
        .map((bucket) => ({
            bucket: bucket.bucket,
            bytes: bucket.bytes,
            mb: Math.round((bucket.bytes / BYTES_MB) * 100) / 100,
            arquivos: bucket.arquivos,
            mimeTypes: Array.from(bucket.mimeTypes).sort(),
        }))
        .sort((a, b) => b.bytes - a.bytes);

    const totalBytes = buckets.reduce((total, bucket) => total + bucket.bytes, 0);
    const arquivos = buckets.reduce((total, bucket) => total + bucket.arquivos, 0);

    return {
        totalBytes,
        totalMb: Math.round((totalBytes / BYTES_MB) * 100) / 100,
        arquivos,
        buckets,
        atualizadoEm: new Date().toISOString(),
        origem,
    };
}

async function listarObjetosStoragePorApi({ supabase, bucket, prefixo = "" }) {
    const todos = [];
    const limite = 1000;
    let offset = 0;

    while (true) {
        const { data, error } = await supabase.storage.from(bucket).list(prefixo, {
            limit: limite,
            offset,
            sortBy: { column: "name", order: "asc" },
        });

        if (error) throw error;

        const lote = Array.isArray(data) ? data : [];
        todos.push(...lote);

        if (lote.length < limite) break;
        offset += limite;
    }

    return todos;
}

async function carregarObjetosStoragePorApi({ supabase, bucket, prefixo = "" }) {
    const itens = await listarObjetosStoragePorApi({ supabase, bucket, prefixo });
    const arquivos = [];

    for (const item of itens) {
        const nome = String(item?.name || "").trim();
        if (!nome) continue;

        const caminho = prefixo ? `${prefixo}/${nome}` : nome;
        const bytes = normalizarTamanhoArquivoStorage(item);
        const ehArquivo = Boolean(item?.id || item?.created_at || item?.updated_at || bytes > 0 || normalizarMimeStorage(item));

        if (ehArquivo) {
            arquivos.push({
                bucket_id: bucket,
                name: caminho,
                metadata: item.metadata || { size: bytes, mimetype: normalizarMimeStorage(item) },
            });
            continue;
        }

        const arquivosFilhos = await carregarObjetosStoragePorApi({ supabase, bucket, prefixo: caminho });
        arquivos.push(...arquivosFilhos);
    }

    return arquivos;
}

async function carregarResumoStoragePorApi({ supabase }) {
    const registros = [];

    for (const bucket of STORAGE_BUCKETS_RESUMO_REAL) {
        try {
            const arquivos = await carregarObjetosStoragePorApi({ supabase, bucket });
            registros.push(...arquivos);
        } catch (error) {
            console.warn(`Não foi possível calcular o Storage pelo bucket ${bucket}:`, error?.message || error);
        }
    }

    return finalizarResumoStorageReal(registros, "storage-api");
}

async function carregarResumoStoragePorRpc({ supabase }) {
    const { data, error } = await supabase.rpc("resumo_storage_sst");

    if (error) throw error;

    const registros = Array.isArray(data) ? data : [];
    const buckets = registros
        .map((item) => {
            const bucket = String(item?.bucket_id || item?.bucket || "").trim();
            const bytes = Number(item?.tamanho_bytes ?? item?.bytes ?? 0) || 0;
            const arquivos = Number(item?.total_arquivos ?? item?.arquivos ?? 0) || 0;
            const mimeTypes = Array.isArray(item?.mime_types)
                ? item.mime_types.filter(Boolean).map((tipo) => String(tipo))
                : [];

            return {
                bucket,
                bytes,
                mb: Math.round((bytes / BYTES_MB) * 100) / 100,
                arquivos,
                mimeTypes: [...new Set(mimeTypes)].sort(),
            };
        })
        .filter((item) => item.bucket && STORAGE_BUCKETS_RESUMO_REAL.includes(item.bucket))
        .sort((a, b) => b.bytes - a.bytes);

    const totalBytes = buckets.reduce((total, bucket) => total + bucket.bytes, 0);
    const arquivos = buckets.reduce((total, bucket) => total + bucket.arquivos, 0);

    const bucketsRetornados =
        new Set(
            buckets.map(
                (item) =>
                    item.bucket
            )
        );

    const completo =
        STORAGE_BUCKETS_RESUMO_REAL
            .every(
                (bucket) =>
                    bucketsRetornados.has(
                        bucket
                    )
            );

    return {
        totalBytes,

        totalMb:
            Math.round(
                (
                    totalBytes /
                    BYTES_MB
                ) *
                100
            ) /
            100,

        arquivos,

        buckets,

        atualizadoEm:
            new Date().toISOString(),

        origem:
            "rpc-resumo_storage_sst",

        completo,
    };
}

export async function calcularUsoStorageRealSistema({ supabase } = {}) {
    if (!supabase) return montarResumoVazioStorageReal();

    try {
        const resumoRpc = await carregarResumoStoragePorRpc({ supabase });
        if (
            (
                resumoRpc.arquivos > 0 ||
                resumoRpc.totalBytes > 0
            ) &&
            resumoRpc.completo === true
        ) {
            return resumoRpc;
        }

        if (
            resumoRpc.arquivos > 0 ||
            resumoRpc.totalBytes > 0
        ) {
            console.warn(
                "A RPC resumo_storage_sst retornou catálogo parcial. Recalculando pelos buckets configurados."
            );
        }
    } catch (error) {
        console.warn("Não foi possível calcular o Storage pela RPC resumo_storage_sst. Tentando Storage API.", error?.message || error);
    }

    try {
        const resumoApi = await carregarResumoStoragePorApi({ supabase });
        if (resumoApi.arquivos > 0 || resumoApi.totalBytes > 0) {
            return resumoApi;
        }
    } catch (error) {
        console.warn("Não foi possível calcular o Storage pela Storage API.", error?.message || error);
    }

    return montarResumoVazioStorageReal();
}

export function calcularResumoSegurancaStorageSistema(avaliacoes = []) {
    const criticos = avaliacoes.filter((item) => item.nivel === "critico").length;
    const alertas = avaliacoes.filter((item) => item.nivel === "alerta").length;

    if (criticos > 0) {
        return {
            texto: "Crítico",
            detalhe: `${criticos} ponto(s) crítico(s)`,
            classe: "bg-red-50 text-red-700 ring-red-200",
        };
    }

    if (alertas > 0) {
        return {
            texto: "Atenção",
            detalhe: `${alertas} ponto(s) para conferir`,
            classe: "bg-orange-50 text-orange-700 ring-orange-200",
        };
    }

    return {
        texto: "Controlado",
        detalhe: "Checklist operacional sem bloqueio",
        classe: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
}

export function montarChecklistSegurancaStorageSistemaTexto(avaliacoes = avaliarSegurancaStorageSistema()) {
    return [
        "CHECKLIST - STORAGE E ARQUIVOS PRIVADOS",
        "",
        ...avaliacoes.map((item) => [
            `- [${String(item.nivel || "info").toUpperCase()}] ${item.label}`,
            `  Grupo: ${item.grupo}`,
            `  Descrição: ${item.descricao}`,
            `  Recomendação: ${item.recomendacao}`,
        ].join("\n")),
    ].join("\n");
}
