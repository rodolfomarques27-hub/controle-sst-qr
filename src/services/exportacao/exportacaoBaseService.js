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
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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


function canvasTemConteudoVisivelRelatorio(canvas, origemYPx, alturaPx) {
    const largura = canvas.width;
    const altura = Math.max(1, Math.min(alturaPx, canvas.height - origemYPx));
    const contexto = canvas.getContext("2d", { willReadFrequently: true });

    if (!contexto || altura <= 0) return false;

    const passoX = Math.max(8, Math.floor(largura / 70));
    const passoY = Math.max(8, Math.floor(altura / 80));
    let pixelsComConteudo = 0;

    for (let y = 0; y < altura; y += passoY) {
        const linhaY = Math.min(canvas.height - 1, origemYPx + y);
        const dados = contexto.getImageData(0, linhaY, largura, 1).data;

        for (let x = 0; x < largura; x += passoX) {
            const indice = x * 4;
            const r = dados[indice];
            const g = dados[indice + 1];
            const b = dados[indice + 2];
            const a = dados[indice + 3];

            if (a > 0 && (r < 245 || g < 245 || b < 245)) {
                pixelsComConteudo += 1;

                if (pixelsComConteudo >= 12) {
                    return true;
                }
            }
        }
    }

    return false;
}

export async function baixarRelatorioHtmlComoPdf({ html, nomeArquivo }) {
    const iframe = document.createElement("iframe");

    iframe.style.position = "fixed";
    iframe.style.left = "0";
    iframe.style.top = "0";
    iframe.style.width = "900px";
    iframe.style.height = "1400px";
    iframe.style.border = "0";
    iframe.style.background = "#ffffff";
    iframe.style.opacity = "0";
    iframe.style.pointerEvents = "none";
    iframe.style.zIndex = "-1";
    iframe.setAttribute("aria-hidden", "true");

    document.body.appendChild(iframe);

    const documento = iframe.contentWindow?.document;
    if (!documento) {
        document.body.removeChild(iframe);
        alert("Não foi possível preparar o relatório para download em PDF.");
        return;
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
        document.body.removeChild(iframe);
        alert("Não foi possível encontrar o conteúdo do relatório para gerar o PDF.");
        return;
    }

    const pdf = new jsPDF("p", "mm", "a4");
    let primeiraPagina = true;

    for (const paginaHtml of paginasHtml) {
        const larguraCapturaPx = Math.ceil(paginaHtml.scrollWidth || paginaHtml.getBoundingClientRect().width || 794);
        const alturaCapturaPx = Math.ceil(paginaHtml.scrollHeight || paginaHtml.getBoundingClientRect().height || 1123);

        const canvas = await html2canvas(paginaHtml, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
            width: larguraCapturaPx,
            height: alturaCapturaPx,
            windowWidth: Math.max(larguraCapturaPx, 900),
            windowHeight: Math.max(alturaCapturaPx, 1400),
            scrollX: 0,
            scrollY: 0,
            x: 0,
            y: 0,
        });

        const larguraPdfMm = 210;
        const alturaPaginaPdfMm = 297;
        const alturaFatiaPx = Math.floor((canvas.width * alturaPaginaPdfMm) / larguraPdfMm);

        let origemYPx = 0;

        while (origemYPx < canvas.height) {
            const alturaAtualPx = Math.min(alturaFatiaPx, canvas.height - origemYPx);

            if (!canvasTemConteudoVisivelRelatorio(canvas, origemYPx, alturaAtualPx)) {
                break;
            }

            const canvasFatia = document.createElement("canvas");

            canvasFatia.width = canvas.width;
            canvasFatia.height = alturaAtualPx;

            const contexto = canvasFatia.getContext("2d");
            contexto.fillStyle = "#ffffff";
            contexto.fillRect(0, 0, canvasFatia.width, canvasFatia.height);
            contexto.drawImage(
                canvas,
                0,
                origemYPx,
                canvas.width,
                alturaAtualPx,
                0,
                0,
                canvas.width,
                alturaAtualPx
            );

            const imagem = canvasFatia.toDataURL("image/jpeg", 0.96);
            const alturaImagemMm = (alturaAtualPx * larguraPdfMm) / canvas.width;

            if (!primeiraPagina) {
                pdf.addPage();
            }

            pdf.addImage(imagem, "JPEG", 0, 0, larguraPdfMm, alturaImagemMm, undefined, "FAST");

            primeiraPagina = false;
            origemYPx += alturaAtualPx;
        }
    }

    document.body.removeChild(iframe);
    pdf.save(nomeArquivo.endsWith(".pdf") ? nomeArquivo : `${nomeArquivo}.pdf`);
}
