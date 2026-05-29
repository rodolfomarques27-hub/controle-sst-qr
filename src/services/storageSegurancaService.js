export const BUCKETS_STORAGE_SST = [
    {
        chave: "certificados-treinamentos",
        label: "Certificados de treinamentos",
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
