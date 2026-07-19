export default function criarControladorReciboDds({
    codigoConferenciaDds,
    dadosDds,
    dashboardHeroSstDds,
    reciboConferenciaFinalDds,
    reciboConferenciaFinalRef,
    registroScannerDds,
    salvarRegistroDds,
    setCodigoReciboCopiadoDds,
    setErroReciboFinalDds,
    setReciboFinalEmitidoEmDds,
    setRegistroScannerDds,
    setSalvandoReciboFinalDds,
    supabase,
}) {
    async function registrarEmissaoReciboFinalDds() {
        const recibo = reciboConferenciaFinalDds;

        if (!recibo) return "";

        const emitidoEm = new Date().toISOString();
        const codigo = registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || recibo.codigo || "";

        const reciboFinal = {
            versao: 1,
            origem: "recibo_final_dds",
            emitidoEm,
            codigo,
            status: recibo.status || "Conferência concluída oficialmente",
            concluidoEm: recibo.concluidoEm || "",
            periodoInicio: recibo.periodoInicio || "",
            periodoFim: recibo.periodoFim || "",
            resumo: {
                participantes: Number(recibo.participantes || 0),
                participantesCadastrados: Number(recibo.participantesCadastrados || 0),
                participantesAdicionais: Number(recibo.participantesAdicionais || 0),
                presencas: Number(recibo.presencas || 0),
                presencasCadastrados: Number(recibo.presencasCadastrados || 0),
                presencasAdicionais: Number(recibo.presencasAdicionais || 0),
                ausencias: Number(recibo.ausencias || 0),
                ausenciasCadastrados: Number(recibo.ausenciasCadastrados || 0),
                ausenciasAdicionais: Number(recibo.ausenciasAdicionais || 0),
                manuais: Number(recibo.manuais || 0),
                manuaisCadastrados: Number(recibo.manuaisCadastrados || 0),
                manuaisAdicionais: Number(recibo.manuaisAdicionais || 0),
                homemDia: Number(recibo.homemDia || 0),
                homemDiaCadastrados: Number(recibo.homemDiaCadastrados || 0),
                homemDiaAdicionais: Number(recibo.homemDiaAdicionais || 0),
                diasAtivos: Number(recibo.diasAtivos || 0),
                funcionariosSemanaCompleta: Number(recibo.funcionariosSemanaCompleta || 0),
                semanaCompletaCadastrados: Number(recibo.semanaCompletaCadastrados || 0),
                semanaCompletaAdicionais: Number(recibo.semanaCompletaAdicionais || 0),
            },
        };

        setReciboFinalEmitidoEmDds(emitidoEm);
        setErroReciboFinalDds("");

        if (!supabase || !registroScannerDds || !codigo) {
            return emitidoEm;
        }

        setSalvandoReciboFinalDds(true);

        try {
            const dadosAtuais = registroScannerDds?.dados || {};
            const conferenciaAtual = dadosAtuais.conferenciaAssistida || {};

            const registroAtualizado = await salvarRegistroDds({
                supabase,
                registro: {
                    ...registroScannerDds,
                    codigo,
                    empresaId: registroScannerDds?.empresaId || registroScannerDds?.empresa_id || dadosAtuais.empresaId || dadosAtuais.empresa_id || "",
                    obraId: registroScannerDds?.obraId || registroScannerDds?.obra_id || dadosAtuais.obraId || dadosAtuais.obra_id || "",
                    empresaNome: registroScannerDds?.empresaNome || dadosAtuais.empresaNome || dadosAtuais.empresa || "",
                    obraNome: registroScannerDds?.obraNome || dadosAtuais.obraNome || dadosAtuais.obra || "",
                    periodoInicio: registroScannerDds?.periodoInicio || dadosAtuais.periodoInicio || "",
                    periodoFim: registroScannerDds?.periodoFim || dadosAtuais.periodoFim || "",
                    dados: {
                        ...dadosAtuais,
                        conferenciaAssistida: {
                            ...conferenciaAtual,
                            reciboFinal,
                        },
                    },
                },
            });

            setRegistroScannerDds(registroAtualizado);
            setReciboFinalEmitidoEmDds(registroAtualizado?.dados?.conferenciaAssistida?.reciboFinal?.emitidoEm || emitidoEm);

            return emitidoEm;
        } catch (error) {
            setErroReciboFinalDds(error?.message || "Não foi possível registrar a emissão do recibo. A impressão foi liberada mesmo assim.");
            return emitidoEm;
        } finally {
            setSalvandoReciboFinalDds(false);
        }
    }

    function abrirConsultaPublicaReciboDds() {
        const url = reciboConferenciaFinalDds?.urlConferencia || registroScannerDds?.urlConferencia || "";

        if (!url) return;

        window.open(url, "_blank", "noopener,noreferrer");
    }

    async function copiarCodigoReciboDds() {
        const codigo = reciboConferenciaFinalDds?.codigo || registroScannerDds?.codigo || codigoConferenciaDds || dadosDds.codigo || "";

        if (!codigo) return;

        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(codigo);
            } else {
                const area = document.createElement("textarea");
                area.value = codigo;
                area.setAttribute("readonly", "readonly");
                area.style.position = "fixed";
                area.style.opacity = "0";
                document.body.appendChild(area);
                area.select();
                document.execCommand("copy");
                document.body.removeChild(area);
            }

            setCodigoReciboCopiadoDds(true);
            window.setTimeout(() => setCodigoReciboCopiadoDds(false), 1800);
        } catch (error) {
            setErroReciboFinalDds(error?.message || "Não foi possível copiar o código DDS.");
        }
    }

    async function imprimirReciboConferenciaDds() {
        if (!reciboConferenciaFinalDds || !reciboConferenciaFinalRef.current) return;

        await registrarEmissaoReciboFinalDds();

        const escaparHtml = (valor = "") => String(valor ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");

        const formatarData = (valor = "") => {
            if (!valor) return "-";
            const data = new Date(valor);
            if (Number.isNaN(data.getTime())) return escaparHtml(valor);
            return data.toLocaleString("pt-BR");
        };

        const recibo = reciboConferenciaFinalDds;
        const codigo = escaparHtml(recibo.codigo || "-");
        const empresa = escaparHtml(recibo.empresa || "-");
        const obra = escaparHtml(recibo.obra || "-");
        const periodo = escaparHtml(recibo.periodoInicio || "-") + " a " + escaparHtml(recibo.periodoFim || "-");
        const concluidoEm = formatarData(recibo.concluidoEm);
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtml(heroUrl) + '" alt="" />' : "";

        const qrElemento = reciboConferenciaFinalRef.current.querySelector("svg, canvas, img");
        let qrHtml = "";

        if (qrElemento?.tagName?.toLowerCase() === "canvas") {
            try {
                qrHtml = '<img src="' + qrElemento.toDataURL("image/png") + '" alt="QR Code de conferência" />';
            } catch {
                qrHtml = "";
            }
        } else if (qrElemento) {
            qrHtml = qrElemento.outerHTML;
        }

        const cardInfo = (rotulo, valor) =>
            '<div class="info-card">' +
                '<span class="label">' + escaparHtml(rotulo) + '</span>' +
                '<strong>' + valor + '</strong>' +
            '</div>';

        const cardMetrica = (rotulo, valor, tom) =>
            '<div class="metric metric-' + tom + '">' +
                '<span>' + escaparHtml(rotulo) + '</span>' +
                '<strong>' + escaparHtml(valor) + '</strong>' +
            '</div>';

        const cardsMetricas = [
            cardMetrica("Participantes", recibo.participantes, "green"),
            cardMetrica("Presenças", recibo.presencas, "green"),
            cardMetrica("Ausências", recibo.ausencias, "red"),
            cardMetrica("Acumulado do período", recibo.homemDia, "orange"),
            cardMetrica("Dias ativos", recibo.diasAtivos, "slate"),
            cardMetrica("Semana completa", recibo.funcionariosSemanaCompleta, "slate"),
            cardMetrica("Manual/vazio", recibo.manuais, "slate"),
            cardMetrica("Status oficial", "OK", "blue"),
        ].join("");

        const cardCategoriaRecibo = (
            rotulo,
            participantes,
            presencas,
            ausencias,
            homemDia,
            tom
        ) =>
            '<div class="category-card category-' + tom + '">' +
                '<div class="category-head">' +
                    '<span>' + escaparHtml(rotulo) + '</span>' +
                    '<strong>' + escaparHtml(participantes) + '</strong>' +
                '</div>' +
                '<div class="category-metrics">' +
                    '<div><span>Presenças</span><strong>' + escaparHtml(presencas) + '</strong></div>' +
                    '<div><span>Ausências</span><strong>' + escaparHtml(ausencias) + '</strong></div>' +
                    '<div><span>Homem-dia</span><strong>' + escaparHtml(homemDia) + '</strong></div>' +
                '</div>' +
            '</div>';

        const cardsCategoriasRecibo = [
            cardCategoriaRecibo(
                "Colaboradores cadastrados",
                recibo.participantesCadastrados,
                recibo.presencasCadastrados,
                recibo.ausenciasCadastrados,
                recibo.homemDiaCadastrados,
                "slate"
            ),
            cardCategoriaRecibo(
                "Adicionais / visitantes",
                recibo.participantesAdicionais,
                recibo.presencasAdicionais,
                recibo.ausenciasAdicionais,
                recibo.homemDiaAdicionais,
                "cyan"
            ),
        ].join("");

        const janela = window.open("", "_blank", "width=1100,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            "<!doctype html>",
            "<html lang=\"pt-BR\">",
            "<head>",
            "<meta charset=\"utf-8\">",
            "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
            "<title>Recibo DDS - ", codigo, "</title>",
            "<style>",
            "@page{size:A4 portrait;margin:10mm;}",
            "*{box-sizing:border-box;}",
            "html,body{margin:0;background:#fff;color:#0f172a;font-family:Arial,Helvetica,sans-serif;}",
            "body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}",
            ".page{min-height:277mm;border:1px solid #dbe3ef;background:#fff;display:flex;flex-direction:column;overflow:hidden;}",
            ".header{position:relative;overflow:hidden;padding:14px 22px 15px;color:#fff;background:#0f172a;}",
            ".hero-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.42;}",
            ".header:after{content:\"\";position:absolute;inset:0;background:linear-gradient(90deg,rgba(15,23,42,.96),rgba(15,23,42,.84),rgba(15,23,42,.46));}",
            ".header-content{position:relative;z-index:1;}",
            ".header-top{display:block;}",
            ".brand{margin:0 0 6px;font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.18em;color:#86efac;}",
            "h1{margin:0;font-size:24px;line-height:1.04;font-weight:900;letter-spacing:-.035em;}",
            ".subtitle{margin:6px 0 0;max-width:none;font-size:10.5px;line-height:1.25;color:#e2e8f0;font-weight:700;white-space:nowrap;}",
            ".status-strip{margin:0 0 14px;border:1px solid #dbe3ef;border-left:5px solid #10b981;background:#f8fafc;border-radius:13px;padding:10px 12px;color:#0f172a;}",
            ".status-title{display:block;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.12em;color:#047857;margin-bottom:3px;}",
            ".status-text{margin:0;font-size:11px;font-weight:700;line-height:1.35;color:#475569;}",
            ".content{flex:1;display:flex;flex-direction:column;padding:20px 24px 18px;}",
            ".section-title{margin:0 0 10px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.14em;color:#475569;}",
            ".info-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-bottom:16px;}",
            ".info-card{border:1px solid #e2e8f0;border-radius:13px;padding:11px 12px;background:#f8fafc;min-height:58px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}",
            ".label{display:block;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.11em;color:#64748b;margin-bottom:5px;}",
            ".info-card strong{font-size:14px;font-weight:900;color:#0f172a;line-height:1.2;}",
            ".main-grid{display:grid;grid-template-columns:1fr 148px;gap:12px;align-items:stretch;}",
            ".metrics{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;}",
            ".metric{border:1px solid #e2e8f0;border-radius:13px;padding:10px 10px;background:#fff;min-height:61px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;}",
            ".metric span{font-size:8.3px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin-bottom:5px;}",
            ".metric strong{font-size:22px;line-height:1;font-weight:900;color:#0f172a;}",
            ".metric-green{border-color:#bbf7d0;background:#f0fdf4;}",
            ".metric-green span,.metric-green strong{color:#047857;}",
            ".metric-red{border-color:#fecaca;background:#fef2f2;}",
            ".metric-red span,.metric-red strong{color:#b91c1c;}",
            ".metric-orange{border-color:#fed7aa;background:#fff7ed;}",
            ".metric-orange span,.metric-orange strong{color:#c2410c;}",
            ".metric-blue{border-color:#bae6fd;background:#f0f9ff;}",
            ".metric-blue span,.metric-blue strong{color:#0369a1;}",
            ".category-section{margin-top:12px;}",
            ".category-title{margin:0 0 7px;text-align:center;font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.13em;color:#64748b;}",
            ".category-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}",
            ".category-card{border:1px solid #e2e8f0;border-radius:13px;padding:8px;background:#f8fafc;break-inside:avoid;page-break-inside:avoid;}",
            ".category-card.category-cyan{border-color:#a5f3fc;background:#ecfeff;}",
            ".category-head{text-align:center;}",
            ".category-head span{display:block;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569;}",
            ".category-head strong{display:block;margin-top:2px;font-size:18px;line-height:1;font-weight:900;color:#0f172a;}",
            ".category-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-top:7px;}",
            ".category-metrics div{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:5px 4px;text-align:center;}",
            ".category-metrics span{display:block;font-size:6.8px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;color:#64748b;}",
            ".category-metrics strong{display:block;margin-top:2px;font-size:12px;line-height:1;font-weight:900;color:#0f172a;}",
            ".qr-panel{border:1px solid #dbe3ef;border-radius:15px;background:#f8fafc;padding:12px 10px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;}",
            ".qr-box{width:110px;height:110px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;padding:7px;margin:0 auto 9px;}",
            ".qr-box svg,.qr-box img,.qr-box canvas{width:94px!important;height:94px!important;display:block;}",
            ".qr-title{font-size:8.5px;font-weight:900;text-transform:uppercase;letter-spacing:.1em;color:#64748b;margin:0 0 4px;}",
            ".qr-date{font-size:10.5px;font-weight:900;line-height:1.25;color:#0f172a;margin:0;}",
            ".auth{margin-top:16px;display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
            ".auth-card{border:1px solid #bfdbfe;border-left:5px solid #0284c7;border-radius:13px;background:#f8fafc;padding:13px 14px;}",
            ".auth-card p{margin:0;font-size:11.5px;font-weight:700;line-height:1.65;color:#334155;}",
            ".auth-card strong{color:#0f172a;}",
            ".signatures{margin-top:auto;padding-top:34px;display:grid;grid-template-columns:1fr 1fr;gap:22px;}",
            ".signature{border-top:1px solid #94a3b8;padding-top:8px;text-align:center;font-size:9.5px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#475569;}",
            ".footer{margin-top:18px;padding-top:10px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;gap:12px;font-size:9.5px;font-weight:700;color:#64748b;}",
            "@media print{body{background:#fff!important;}.page{border:0;min-height:277mm;}.header{color:#fff!important;background:#0f172a!important;}.hero-img{display:block!important;}.status-strip{background:#f8fafc!important;color:#0f172a!important;}.info-card,.metric,.qr-panel,.auth-card{break-inside:avoid;page-break-inside:avoid;}}",
            "</style>",
            "</head>",
            "<body>",
            "<article class=\"page\">",
            "<header class=\"header\">",
            heroImgHtml,
            "<div class=\"header-content\">",
            "<div class=\"header-top\">",
            "<p class=\"brand\">SafeScan Brasil | DDS</p>",
            "<h1>Recibo da Conferência DDS</h1>",
            "<p class=\"subtitle\">Comprovante técnico da apuração oficial da Conferência Assistida do Diálogo Diário de Segurança.</p>",
            "</div>",

            "</div>",
            "</header>",
            "<main class=\"content\">",
            "<section class=\"status-strip\">",
            "<span class=\"status-title\">Registro final do DDS</span>",
            "<p class=\"status-text\">Apuração salva no sistema e vinculada ao QR/código do documento.</p>",
            "</section>",
            "<p class=\"section-title\">Dados do registro</p>",
            "<section class=\"info-grid\">",
            cardInfo("Código DDS", codigo),
            cardInfo("Empresa", empresa),
            cardInfo("Obra / setor", obra),
            cardInfo("Período", periodo),
            "</section>",
            "<p class=\"section-title\">Resumo oficial da apuração</p>",
            "<section class=\"main-grid\">",
            "<div class=\"metrics\">", cardsMetricas, "</div>",
            "<aside class=\"qr-panel\">",
            "<div class=\"qr-box\">", (qrHtml || "<span class=\"label\">Sem QR</span>"), "</div>",
            "<p class=\"qr-title\">Conclusão oficial</p>",
            "<p class=\"qr-date\">", concluidoEm, "</p>",
            "</aside>",
            "</section>",
            "<section class=\"category-section\">",
            "<p class=\"category-title\">Composição dos participantes</p>",
            "<div class=\"category-grid\">",
            cardsCategoriasRecibo,
            "</div>",
            "</section>",
            "<section class=\"auth\">",
            "<div class=\"auth-card\"><p><strong>Autenticidade:</strong> o QR/código vincula este comprovante ao registro digital do DDS para conferência e auditoria.</p></div>",
            "<div class=\"auth-card\"><p><strong>Critério:</strong> a estatística oficial foi calculada pela Conferência Assistida confirmada e concluída no sistema.</p></div>",
            "</section>",
            "<section class=\"signatures\">",
            "<div class=\"signature\">Responsável pela conferência</div>",
            "<div class=\"signature\">Representante da obra / empresa</div>",
            "</section>",
            "<footer class=\"footer\">",
            "<span>Gerado pelo SafeScan Brasil</span>",
            "<span>Código: ", codigo, "</span>",
            "</footer>",
            "</main>",
            "</article>",
            "<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},700);};<" + "/script>",
            "</body>",
            "</html>"
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    return {
        abrirConsultaPublicaReciboDds,
        copiarCodigoReciboDds,
        imprimirReciboConferenciaDds,
    };
}
