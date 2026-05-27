// Serviços de exportação CSV/PDF do sistema SST.
// Funções puras de geração/download local no navegador.

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
    comandos.push(`BT /F1 9 Tf ${margem} ${y} Td (Gerado em ${limparTextoPDF(dataAtual)} pelo Controle SST QR) Tj ET`);
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
