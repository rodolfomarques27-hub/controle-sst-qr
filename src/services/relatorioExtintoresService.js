import jsPDF from "jspdf";

function texto(valor, fallback = "Não informado") {
    const normalizado = String(valor || "").trim();
    return normalizado || fallback;
}

function dataBr(valor) {
    if (!valor) return "Não informada";
    const [ano, mes, dia] = String(valor).slice(0, 10).split("-");
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : texto(valor);
}

function linhaTabela(pdf, colunas, larguras, y, opcoes = {}) {
    const altura = opcoes.altura || 7;
    const inicioX = 12;
    let x = inicioX;
    if (opcoes.fundo) {
        pdf.setFillColor(...opcoes.fundo);
        pdf.rect(inicioX, y, larguras.reduce((total, largura) => total + largura, 0), altura, "F");
    }
    pdf.setFont("helvetica", opcoes.negrito ? "bold" : "normal");
    pdf.setFontSize(opcoes.tamanho || 7.5);
    pdf.setTextColor(...(opcoes.cor || [30, 41, 59]));
    colunas.forEach((valor, indice) => {
        const largura = larguras[indice];
        const linhas = pdf.splitTextToSize(texto(valor, "-"), largura - 3).slice(0, 2);
        pdf.text(linhas, x + 1.5, y + 4.6);
        x += largura;
    });
    pdf.setDrawColor(226, 232, 240);
    pdf.line(inicioX, y + altura, inicioX + larguras.reduce((total, largura) => total + largura, 0), y + altura);
    return y + altura;
}

function novaPaginaSeNecessario(pdf, y, altura = 12) {
    if (y + altura <= 282) return y;
    pdf.addPage();
    return 16;
}

export function gerarRelatorioExtintoresPDF({ extintores = [], manutencoes = [] }) {
    const pdf = new jsPDF("p", "mm", "a4");
    const hoje = new Date();
    const emOperacao = extintores.filter((item) => (item.situacaoOperacional || "Em operação") === "Em operação").length;
    const indisponiveis = extintores.length - emOperacao;
    const abertos = manutencoes.filter((item) => item.status === "Em andamento");

    pdf.setFillColor(15, 23, 42);
    pdf.rect(0, 0, 210, 34, "F");
    pdf.setTextColor(52, 211, 153);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("SAFESCAN BRASIL", 12, 11);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(18);
    pdf.text("Relatório de controle de extintores", 12, 21);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.text(`Emitido em ${hoje.toLocaleDateString("pt-BR")} às ${hoje.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`, 12, 28);

    let y = 42;
    const indicadores = [
        ["Total cadastrado", extintores.length],
        ["Em operação", emOperacao],
        ["Indisponíveis", indisponiveis],
        ["Serviços em aberto", abertos.length],
    ];
    indicadores.forEach(([rotulo, valor], indice) => {
        const x = 12 + indice * 47;
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(x, y, 43, 19, 2, 2, "F");
        pdf.setTextColor(100, 116, 139);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.text(String(rotulo).toUpperCase(), x + 3, y + 6);
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(15);
        pdf.text(String(valor), x + 3, y + 15);
    });

    y += 28;
    pdf.setTextColor(15, 23, 42);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.text("Inventário", 12, y);
    y += 4;
    const largurasInventario = [18, 31, 42, 27, 25, 47];
    y = linhaTabela(pdf, ["Código", "Tipo", "Localização", "Situação", "Aquisição", "Último serviço / próxima manutenção"], largurasInventario, y, { fundo: [241, 245, 249], negrito: true, tamanho: 6.8, altura: 8 });
    extintores.forEach((item) => {
        y = novaPaginaSeNecessario(pdf, y, 10);
        const historico = manutencoes.find((registro) => String(registro.extintorId) === String(item.id) && registro.status === "Concluído");
        y = linhaTabela(pdf, [
            item.codigo,
            `${item.tipo} ${item.capacidade}`,
            item.localizacao,
            item.situacaoOperacional || "Em operação",
            dataBr(item.dataAquisicao),
            historico ? `${historico.tipoServico} em ${dataBr(historico.dataRetorno)} / ${dataBr(historico.proximaManutencao)}` : "Sem serviço registrado",
        ], largurasInventario, y, { altura: 9 });
    });

    y = novaPaginaSeNecessario(pdf, y + 10, 20);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text("Manutenções e recargas", 12, y);
    y += 4;
    const largurasHistorico = [18, 48, 37, 35, 25, 27];
    y = linhaTabela(pdf, ["Extintor", "Serviço", "Empresa", "Registro Inmetro / OS", "Saída", "Situação"], largurasHistorico, y, { fundo: [241, 245, 249], negrito: true, tamanho: 6.8, altura: 8 });
    if (!manutencoes.length) {
        y = linhaTabela(pdf, ["Nenhum serviço registrado", "", "", "", "", ""], largurasHistorico, y, { altura: 9 });
    } else {
        manutencoes.forEach((registro) => {
            y = novaPaginaSeNecessario(pdf, y, 10);
            const extintor = extintores.find((item) => String(item.id) === String(registro.extintorId));
            y = linhaTabela(pdf, [
                extintor?.codigo || "-",
                registro.tipoServico,
                registro.empresaNome,
                `${texto(registro.registroInmetro, "Sem registro")} / ${texto(registro.ordemServico, "Sem OS")}`,
                dataBr(registro.dataSaida),
                registro.status,
            ], largurasHistorico, y, { altura: 9 });
        });
    }

    y = novaPaginaSeNecessario(pdf, y + 10, 28);
    pdf.setFillColor(239, 246, 255);
    pdf.roundedRect(12, y, 186, 23, 2, 2, "F");
    pdf.setTextColor(30, 64, 175);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.text("BASE DO CONTROLE", 16, y + 7);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(51, 65, 85);
    pdf.text(pdf.splitTextToSize("Controle estruturado conforme a classificação de inspeção técnica e manutenção de 1º, 2º e 3º níveis do Inmetro. O relatório apoia a gestão e não substitui a avaliação da empresa registrada ou as exigências do Corpo de Bombeiros local.", 176), 16, y + 13);

    const nome = `relatorio-extintores-${hoje.toISOString().slice(0, 10)}.pdf`;
    pdf.save(nome);
}
