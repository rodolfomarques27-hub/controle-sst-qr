// Infraestrutura compartilhada para geração e download de relatórios.
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export function escaparCSV(valor) {
    const texto = String(valor ?? "").replace(/"/g, '""');
    return `"${texto}"`;
}


export function baixarCSV(nomeArquivo, linhas) {
    const csv = linhas.map((linha) => linha.map(escaparCSV).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}


export function limparTextoPDF(valor) {
    return String(valor ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\x20-\x7E]/g, " ")
        .replace(/[\\()]/g, "\\$&")
        .trim();
}


export function quebrarTextoPDF(valor, limite = 88) {
    const texto = limparTextoPDF(valor);

    if (!texto) return ["-"];

    const palavras = texto.split(/\s+/);
    const linhas = [];
    let atual = "";

    palavras.forEach((palavra) => {
        if ((atual + " " + palavra).trim().length > limite) {
            if (atual) linhas.push(atual);
            atual = palavra;
        } else {
            atual = `${atual} ${palavra}`.trim();
        }
    });

    if (atual) linhas.push(atual);

    return linhas.length ? linhas : ["-"];
}


export function baixarPDF(nomeArquivo, titulo, linhas) {
    const larguraPagina = 595;
    const alturaPagina = 842;
    const margem = 40;
    const limiteInferior = 45;
    const dataAtual = new Date().toLocaleDateString("pt-BR");

    const paginas = [];
    let comandos = [];
    let y = 800;

    const adicionarTexto = (texto, tamanho = 9, fonte = "F1", recuo = 0) => {
        const linhasQuebradas = quebrarTextoPDF(texto, recuo ? 78 : 95);

        linhasQuebradas.forEach((linha) => {
            if (y < limiteInferior) {
                paginas.push(comandos.join("\n"));
                comandos = [];
                y = 800;
                comandos.push(`BT /F2 13 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
                y -= 18;
                comandos.push(`BT /F1 8 Tf ${margem} ${y} Td (Continuacao) Tj ET`);
                y -= 22;
            }

            comandos.push(`BT /${fonte} ${tamanho} Tf ${margem + recuo} ${y} Td (${limparTextoPDF(linha)}) Tj ET`);
            y -= tamanho + 4;
        });
    };

    comandos.push(`BT /F2 16 Tf ${margem} ${y} Td (${limparTextoPDF(titulo)}) Tj ET`);
    y -= 20;
    comandos.push(`BT /F1 9 Tf ${margem} ${y} Td (Gerado em ${limparTextoPDF(dataAtual)} pelo SafeScan Brasil) Tj ET`);
    y -= 26;

    const cabecalho = linhas[0] || [];
    const registros = linhas.slice(1);

    if (registros.length === 0) {
        adicionarTexto("Nenhum registro encontrado para os filtros selecionados.", 10, "F1");
    }

    registros.forEach((registro, indice) => {
        if (indice > 0) {
            adicionarTexto("------------------------------------------------------------", 8, "F1");
        }

        adicionarTexto(`Registro ${indice + 1}`, 11, "F2");

        cabecalho.forEach((campo, campoIndice) => {
            adicionarTexto(`${campo}: ${registro[campoIndice] ?? ""}`, 9, "F1", 10);
        });

        y -= 4;
    });

    paginas.push(comandos.join("\n"));

    const objetos = [];
    const adicionarObjeto = (conteudo) => {
        objetos.push(conteudo);
        return objetos.length;
    };

    adicionarObjeto("<< /Type /Catalog /Pages 2 0 R >>");

    const kids = paginas.map((_, i) => `${3 + i * 2} 0 R`).join(" ");
    adicionarObjeto(`<< /Type /Pages /Kids [${kids}] /Count ${paginas.length} >>`);

    paginas.forEach((conteudo, i) => {
        const paginaObj = 3 + i * 2;
        const conteudoObj = 4 + i * 2;

        objetos[paginaObj - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${larguraPagina} ${alturaPagina}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${conteudoObj} 0 R >>`;
        objetos[conteudoObj - 1] = `<< /Length ${conteudo.length} >>\nstream\n${conteudo}\nendstream`;
    });

    let pdf = "%PDF-1.4\n";
    const offsets = [0];

    objetos.forEach((objeto, indice) => {
        offsets.push(pdf.length);
        pdf += `${indice + 1} 0 obj\n${objeto}\nendobj\n`;
    });

    const inicioXref = pdf.length;
    pdf += `xref\n0 ${objetos.length + 1}\n`;
    pdf += "0000000000 65535 f \n";

    offsets.slice(1).forEach((offset) => {
        pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });

    pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${inicioXref}\n%%EOF`;

    const blob = new Blob([pdf], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();

    window.setTimeout(() => {
        link.remove();
        URL.revokeObjectURL(url);
    }, 1000);
}

async function aguardarImagesRelatorio(documento, tempoMaximo = 6000) {
    const imagens = Array.from(documento?.images || []);

    if (!imagens.length) return;

    const carregamentos = imagens.map((imagem) => {
        if (imagem.complete && imagem.naturalWidth > 0) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            const finalizar = () => resolve();
            imagem.addEventListener("load", finalizar, { once: true });
            imagem.addEventListener("error", finalizar, { once: true });
        });
    });

    await Promise.race([
        Promise.all(carregamentos),
        new Promise((resolve) => setTimeout(resolve, tempoMaximo)),
    ]);
}

async function aguardarImagensRelatorio(documento, tempoMaximo = 6000) {
    return aguardarImagesRelatorio(documento, tempoMaximo);
}


export async function baixarRelatorioHtmlComoPdf({ html, nomeArquivo }) {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.left = "-10000px";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1400px";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.opacity = "1";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    try {
        const documento = iframe.contentWindow?.document;
        if (!documento) {
            throw new Error("Documento temporário do relatório indisponível.");
        }

        documento.open();
        documento.write(html);
        documento.close();

        await new Promise((resolve) => setTimeout(resolve, 450));

        try {
            await documento.fonts?.ready;
        } catch {
            // segue normalmente se o navegador não expuser document.fonts
        }

        await aguardarImagensRelatorio(documento, 6000);

        const paginasHtml = Array.from(documento.querySelectorAll(".pagina-relatorio"));
        if (!paginasHtml.length) {
            throw new Error("Conteúdo do relatório não encontrado.");
        }

        const pdf = new jsPDF("p", "mm", "a4");
        let paginasGeradas = 0;
        const tamanhoLote = 6;
        const escalaRenderizacao = 1.5;

        for (let indiceLote = 0; indiceLote < paginasHtml.length; indiceLote += tamanhoLote) {
            const paginasLote = paginasHtml.slice(indiceLote, indiceLote + tamanhoLote);
            const contenedorLote = documento.createElement("div");

            contenedorLote.style.width = "900px";
            contenedorLote.style.margin = "0";
            contenedorLote.style.padding = "0";
            contenedorLote.style.background = "#ffffff";

            const copiasPaginas = paginasLote.map((paginaHtml) => {
                const copia = paginaHtml.cloneNode(true);
                copia.style.margin = "0 auto";
                copia.style.boxShadow = "none";
                contenedorLote.appendChild(copia);
                return copia;
            });

            documento.body.appendChild(contenedorLote);

            try {
                const retanguloLote = contenedorLote.getBoundingClientRect();
                const medidasPaginas = copiasPaginas.map((pagina) => {
                    const retanguloPagina = pagina.getBoundingClientRect();

                    return {
                        x: Math.max(0, retanguloPagina.left - retanguloLote.left),
                        y: Math.max(0, retanguloPagina.top - retanguloLote.top),
                        largura: Math.ceil(pagina.scrollWidth || retanguloPagina.width || 794),
                        altura: Math.ceil(pagina.scrollHeight || retanguloPagina.height || 1123),
                    };
                });
                const larguraLotePx = Math.ceil(contenedorLote.scrollWidth || 900);
                const alturaLotePx = Math.ceil(contenedorLote.scrollHeight || 1400);
                const canvasLote = await html2canvas(contenedorLote, {
                    scale: escalaRenderizacao,
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: "#ffffff",
                    logging: false,
                    width: larguraLotePx,
                    height: alturaLotePx,
                    windowWidth: Math.max(larguraLotePx, 900),
                    windowHeight: Math.max(alturaLotePx, 1400),
                    scrollX: 0,
                    scrollY: 0,
                });

                for (const medida of medidasPaginas) {
                    const canvasPagina = document.createElement("canvas");
                    canvasPagina.width = Math.round(medida.largura * escalaRenderizacao);
                    canvasPagina.height = Math.round(medida.altura * escalaRenderizacao);

                    const contextoPagina = canvasPagina.getContext("2d");
                    if (!contextoPagina) {
                        throw new Error("Navegador sem suporte para separar as páginas do relatório.");
                    }

                    contextoPagina.fillStyle = "#ffffff";
                    contextoPagina.fillRect(0, 0, canvasPagina.width, canvasPagina.height);
                    contextoPagina.drawImage(
                        canvasLote,
                        Math.round(medida.x * escalaRenderizacao),
                        Math.round(medida.y * escalaRenderizacao),
                        canvasPagina.width,
                        canvasPagina.height,
                        0,
                        0,
                        canvasPagina.width,
                        canvasPagina.height
                    );

                    const larguraPdfMm = 210;
                    const alturaPaginaPdfMm = 297;
                    const alturaFatiaPx = Math.floor((canvasPagina.width * alturaPaginaPdfMm) / larguraPdfMm);
                    let origemYPx = 0;

                    while (origemYPx < canvasPagina.height) {
                        const alturaAtualPx = Math.min(alturaFatiaPx, canvasPagina.height - origemYPx);
                        const canvasFatia = document.createElement("canvas");
                        canvasFatia.width = canvasPagina.width;
                        canvasFatia.height = alturaAtualPx;

                        const contextoFatia = canvasFatia.getContext("2d");
                        if (!contextoFatia) {
                            throw new Error("Navegador sem suporte para montar as páginas do PDF.");
                        }

                        contextoFatia.fillStyle = "#ffffff";
                        contextoFatia.fillRect(0, 0, canvasFatia.width, canvasFatia.height);
                        contextoFatia.drawImage(
                            canvasPagina,
                            0,
                            origemYPx,
                            canvasPagina.width,
                            alturaAtualPx,
                            0,
                            0,
                            canvasPagina.width,
                            alturaAtualPx
                        );

                        const imagem = canvasFatia.toDataURL("image/jpeg", 0.9);
                        const alturaImagemMm = (alturaAtualPx * larguraPdfMm) / canvasPagina.width;

                        if (paginasGeradas > 0) pdf.addPage();
                        pdf.addImage(imagem, "JPEG", 0, 0, larguraPdfMm, alturaImagemMm, undefined, "FAST");
                        paginasGeradas += 1;
                        origemYPx += alturaAtualPx;
                    }
                }
            } finally {
                contenedorLote.remove();
            }
        }

        if (!paginasGeradas) {
            throw new Error("As páginas do relatório foram renderizadas sem conteúdo.");
        }

        pdf.save(nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`);
    } catch (error) {
        console.error("Erro ao gerar relatório em PDF:", error);
        alert("Não foi possível gerar o PDF. Recarregue a página e tente novamente.");
        return false;
    } finally {
        iframe.remove();
    }

    return true;
}
