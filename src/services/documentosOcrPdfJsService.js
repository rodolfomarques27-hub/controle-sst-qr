// Carregamento compartilhado do PDF.js para os fluxos documentais e DDS.

export async function carregarPdfJsDocumental() {
    const pdfjsLib = await import("pdfjs-dist");

    try {
        if (pdfjsLib?.GlobalWorkerOptions && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                "pdfjs-dist/build/pdf.worker.mjs",
                import.meta.url
            ).toString();
        }
    } catch {
        // Se o worker não puder ser configurado, o PDF.js ainda pode tentar usar fallback.
    }

    return pdfjsLib;
}
