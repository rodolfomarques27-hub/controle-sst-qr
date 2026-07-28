function dataIsoHoje() {
    const hoje = new Date();
    return [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
    ].join("-");
}

function dataIsoMesesAtras(quantidadeMeses = 6) {
    const data = new Date();
    data.setMonth(data.getMonth() - quantidadeMeses);
    return [
        data.getFullYear(),
        String(data.getMonth() + 1).padStart(2, "0"),
        String(data.getDate()).padStart(2, "0"),
    ].join("-");
}

export async function carregarHistoricoStorageDashboard({
    supabase,
    resumoStorage = {},
} = {}) {
    if (!supabase) return [];

    const snapshot = {
        data: dataIsoHoje(),
        total_bytes: Math.max(0, Math.round(Number(resumoStorage.totalBytes || 0))),
        arquivos: Math.max(0, Math.round(Number(resumoStorage.arquivos || 0))),
        buckets: Array.isArray(resumoStorage.buckets) ? resumoStorage.buckets.length : 0,
        updated_at: new Date().toISOString(),
    };

    if (snapshot.total_bytes > 0) {
        const { error: erroSnapshot } = await supabase
            .from("storage_uso_historico")
            .upsert(snapshot, { onConflict: "data" });

        if (erroSnapshot && !["42501", "PGRST301"].includes(String(erroSnapshot.code || ""))) {
            console.warn("Não foi possível registrar o histórico diário do Storage:", erroSnapshot.message);
        }
    }

    const { data, error } = await supabase
        .from("storage_uso_historico")
        .select("data,total_bytes,arquivos,buckets")
        .gte("data", dataIsoMesesAtras(6))
        .order("data", { ascending: true })
        .limit(190);

    if (error) {
        console.warn("Não foi possível consultar o histórico do Storage:", error.message);
        return snapshot.total_bytes > 0 ? [snapshot] : [];
    }

    return (Array.isArray(data) ? data : []).map((item) => ({
        data: item.data,
        totalBytes: Number(item.total_bytes || 0),
        arquivos: Number(item.arquivos || 0),
        buckets: Number(item.buckets || 0),
    }));
}
