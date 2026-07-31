export default function criarControladorMaoDeObraDds({
    calendarioMaoDeObraSelecionadoDds,
    carregandoHistoricoMensalMaoDeObraDds,
    carregandoScannerDds,
    carregarRegistroDdsPorCodigo,
    dadosDds,
    dashboardHeroSstDds,
    diasAtivosConferenciaAssistidaDds,
    empresaSelecionadaDds,
    escaparHtmlControleMaoDeObraDds,
    formatarDataControleMaoDeObraDds,
    formatarNumeroMaoDeObraDds,
    historicoMensalMaoDeObraDds,
    listarRegistrosDds,
    mesHistoricoMaoDeObraDds,
    normalizarFuncaoMaoDeObraDds,
    normalizarNomeEmpresaMaoDeObraDds,
    obraSelecionadaIdDds,
    obraSelecionadaNomeDds,
    obterChaveFrequenciaAssistidaDds,
    obterIdEmpresaObjetoDds,
    obterStatusFrequenciaAssistidaDds,
    obterUuidSeguroDds,
    parseDataControleMaoDeObraDds,
    participantesConferenciaAssistidaDds,
    reciboConferenciaFinalDds,
    registroHistoricoMensalConcluidoDds,
    registroScannerDds,
    setCarregandoHistoricoMensalMaoDeObraDds,
    setCarregandoScannerDds,
    setCodigoConferenciaDds,
    setErroHistoricoMensalMaoDeObraDds,
    setErroScannerDds,
    setHistoricoMensalConsultadoEmDds,
    setHistoricoMensalMaoDeObraDds,
    setRegistroScannerDds,
    supabase,
}) {
    function baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html) {
        const blob = new Blob(["\ufeff" + html], {
            type: "application/vnd.ms-excel;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = nomeArquivo;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function montarDadosControleMaoDeObraDds() {
        if (!participantesConferenciaAssistidaDds.length || !diasAtivosConferenciaAssistidaDds.length) {
            return null;
        }

        const empresaPrincipal = reciboConferenciaFinalDds?.empresa || registroScannerDds?.empresaNome || dadosDds.empresaNome || "";
        const obra = reciboConferenciaFinalDds?.obra || registroScannerDds?.obraNome || dadosDds.obraNome || "";
        const periodoInicio = reciboConferenciaFinalDds?.periodoInicio || registroScannerDds?.periodoInicio || dadosDds.periodoInicio || "";
        const periodoFim = reciboConferenciaFinalDds?.periodoFim || registroScannerDds?.periodoFim || dadosDds.periodoFim || "";
        const dataBase = parseDataControleMaoDeObraDds(periodoInicio) || parseDataControleMaoDeObraDds(diasAtivosConferenciaAssistidaDds[0]?.data) || new Date();
        const mesBase = dataBase.getMonth();
        const anoBase = dataBase.getFullYear();
        const totalDiasMes = new Date(anoBase, mesBase + 1, 0).getDate();
        const diasMes = Array.from({ length: totalDiasMes }, (_, indice) => indice + 1);
        const diasComLancamento = new Set();

        const porEmpresaFuncao = new Map();
        const totaisDia = Object.fromEntries(diasMes.map((dia) => [dia, 0]));
        const totaisPorEmpresa = new Map();

        const obterLinha = (empresa, funcao) => {
            const empresaNome = normalizarNomeEmpresaMaoDeObraDds(empresa || empresaPrincipal);
            const funcaoNome = normalizarFuncaoMaoDeObraDds(funcao);
            const chave = `${empresaNome}||${funcaoNome}`;

            if (!porEmpresaFuncao.has(chave)) {
                porEmpresaFuncao.set(chave, {
                    empresa: empresaNome,
                    funcao: funcaoNome,
                    dias: Object.fromEntries(diasMes.map((dia) => [dia, 0])),
                    total: 0,
                });
            }

            return porEmpresaFuncao.get(chave);
        };

        participantesConferenciaAssistidaDds.forEach((participante) => {
            const numero = participante?.numero || participante?.ordem || participante?.indice || "";
            const empresaParticipante = participante?.empresa || participante?.empresaNome || empresaPrincipal || "Empresa não informada";
            const funcao = participante?.funcao || "Sem função";
            const linha = obterLinha(empresaParticipante, funcao);

            diasAtivosConferenciaAssistidaDds.forEach((dia) => {
                const data = parseDataControleMaoDeObraDds(dia?.data || dia?.dataDds || dia?.dia || "");

                if (!data || data.getMonth() !== mesBase || data.getFullYear() !== anoBase) return;

                const diaMes = data.getDate();
                const status = obterStatusFrequenciaAssistidaDds(numero, dia);

                if (status === "presente") {
                    linha.dias[diaMes] += 1;
                    linha.total += 1;
                    totaisDia[diaMes] += 1;
                    diasComLancamento.add(diaMes);

                    const totalEmpresaAtual = totaisPorEmpresa.get(linha.empresa) || 0;
                    totaisPorEmpresa.set(linha.empresa, totalEmpresaAtual + 1);
                }
            });
        });

        const linhas = Array.from(porEmpresaFuncao.values()).sort((a, b) => {
            const empresaComparacao = a.empresa.localeCompare(b.empresa, "pt-BR");
            if (empresaComparacao !== 0) return empresaComparacao;
            return a.funcao.localeCompare(b.funcao, "pt-BR");
        });

        const totalHomemDia = linhas.reduce((total, linha) => total + linha.total, 0);
        const quantidadeDiasLancados = Math.max(diasComLancamento.size, 1);
        const mediaMes = totalHomemDia / quantidadeDiasLancados;
        const empresas = Array.from(totaisPorEmpresa.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

        return {
            empresaPrincipal,
            obra,
            periodoInicio,
            periodoFim,
            periodoInicioFormatado: formatarDataControleMaoDeObraDds(periodoInicio),
            periodoFimFormatado: formatarDataControleMaoDeObraDds(periodoFim),
            dataBase,
            calendarioMaoDeObra: calendarioMaoDeObraSelecionadoDds,
            calendarioRotulo: calendarioMaoDeObraSelecionadoDds.rotulo,
            calendarioOrigem: calendarioMaoDeObraSelecionadoDds.origem,
            mesBase: dataBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            empresas,
            totaisPorEmpresa,
            expediente: {
                jornada: "07:00 às 17:00",
                almoco: "12:00 às 13:00",
                dds: "07:00 às 07:10",
            },
        };
    }

    function somarDiasMaoDeObraDds(data, dias) {
        const novaData = new Date(data);
        novaData.setDate(novaData.getDate() + dias);
        return novaData;
    }

    function chaveDataMaoDeObraDds(data) {
        const ano = data.getFullYear();
        const mes = String(data.getMonth() + 1).padStart(2, "0");
        const dia = String(data.getDate()).padStart(2, "0");
        return ano + "-" + mes + "-" + dia;
    }

    function calcularPascoaMaoDeObraDds(ano) {
        const a = ano % 19;
        const b = Math.floor(ano / 100);
        const c = ano % 100;
        const d = Math.floor(b / 4);
        const e = b % 4;
        const f = Math.floor((b + 8) / 25);
        const g = Math.floor((b - f + 1) / 3);
        const h = (19 * a + b - d - g + 15) % 30;
        const i = Math.floor(c / 4);
        const k = c % 4;
        const l = (32 + 2 * e + 2 * i - h - k) % 7;
        const m = Math.floor((a + 11 * h + 22 * l) / 451);
        const mes = Math.floor((h + l - 7 * m + 114) / 31);
        const dia = ((h + l - 7 * m + 114) % 31) + 1;

        return new Date(ano, mes - 1, dia);
    }

    function obterFeriadosCalendarioMaoDeObraDds(ano, calendario = calendarioMaoDeObraSelecionadoDds) {
        const pascoa = calcularPascoaMaoDeObraDds(ano);
        const sextaSanta = somarDiasMaoDeObraDds(pascoa, -2);
        const corpusChristi = somarDiasMaoDeObraDds(pascoa, 60);

        const feriados = new Set([
            ano + "-01-01",
            chaveDataMaoDeObraDds(sextaSanta),
            ano + "-04-21",
            ano + "-05-01",
            chaveDataMaoDeObraDds(corpusChristi),
            ano + "-09-07",
            ano + "-10-12",
            ano + "-11-02",
            ano + "-11-15",
            ano + "-11-20",
            ano + "-12-25",
        ]);

        [...(calendario?.feriadosEstaduaisFixos || []), ...(calendario?.feriadosMunicipaisFixos || [])].forEach((feriado) => {
            const mes = String(feriado.mes).padStart(2, "0");
            const dia = String(feriado.dia).padStart(2, "0");

            feriados.add(ano + "-" + mes + "-" + dia);
        });

        return feriados;
    }

    function obterClasseCalendarioMaoDeObraDds(data, calendario = calendarioMaoDeObraSelecionadoDds) {
        const feriados = obterFeriadosCalendarioMaoDeObraDds(data.getFullYear(), calendario);
        const chave = chaveDataMaoDeObraDds(data);

        if (feriados.has(chave)) return " dia-feriado";
        if (data.getDay() === 0) return " dia-domingo";
        if (data.getDay() === 6) return " dia-sabado";

        return "";
    }

    function agruparLinhasControleMaoDeObraDds(linhas = []) {
        const mapa = new Map();

        linhas.forEach((linha) => {
            const empresa = normalizarNomeEmpresaMaoDeObraDds(linha?.empresa || "Empresa não informada");

            if (!mapa.has(empresa)) {
                mapa.set(empresa, {
                    empresa,
                    total: 0,
                    linhas: [],
                });
            }

            const grupo = mapa.get(empresa);
            grupo.total += Number(linha?.total || 0);
            grupo.linhas.push(linha);
        });

        return Array.from(mapa.values()).sort((a, b) => a.empresa.localeCompare(b.empresa, "pt-BR"));
    }

    function obterNomeObraValidoMaoDeObraDds(...valores) {
        const valoresIgnorados = new Set([
            "",
            "-",
            "nao informado",
            "obra nao informada",
            "obra / setor nao definido",
        ]);

        return valores
            .map((valor) => String(valor || "").replace(/\s+/g, " ").trim())
            .find((valor) => {
                const chave = valor
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .toLowerCase();

                return !valoresIgnorados.has(chave);
            }) || "";
    }

    function montarDadosHistoricoMensalMaoDeObraDds() {
        const registrosEncontrados = Array.isArray(historicoMensalMaoDeObraDds) ? historicoMensalMaoDeObraDds : [];
        const registros = registrosEncontrados.filter((registro) => registroHistoricoMensalConcluidoDds(registro));
        const periodo = obterPeriodoHistoricoMensalMaoDeObraDds();

        if (!registros.length || !periodo) {
            return null;
        }

        const dataBase = parseDataControleMaoDeObraDds(periodo.inicio) || new Date();
        const mesBaseNumero = dataBase.getMonth();
        const anoBase = dataBase.getFullYear();
        const totalDiasMes = new Date(anoBase, mesBaseNumero + 1, 0).getDate();
        const diasMes = Array.from({ length: totalDiasMes }, (_, indice) => indice + 1);
        const diasComLancamento = new Set();
        const porEmpresaFuncao = new Map();
        const totaisDia = Object.fromEntries(diasMes.map((dia) => [dia, 0]));
        const totaisPorEmpresa = new Map();

        const empresaPrincipal =
            registros[0]?.empresaNome ||
            registros[0]?.dados?.empresaNome ||
            dadosDds.empresaNome ||
            dadosDds.empresa ||
            "";

        const obra = obterNomeObraValidoMaoDeObraDds(
            registros[0]?.obraNome,
            registros[0]?.dados?.obraNome,
            registros[0]?.dados?.obraSetor,
            registros[0]?.dados?.obra,
            dadosDds.obraSetor,
            dadosDds.obraNome,
            dadosDds.obra
        );

        const obterLinha = (empresa, funcao) => {
            const empresaNome = normalizarNomeEmpresaMaoDeObraDds(empresa || empresaPrincipal || "Empresa não informada");
            const funcaoNome = normalizarFuncaoMaoDeObraDds(funcao || "Sem função");
            const chave = empresaNome + "||" + funcaoNome;

            if (!porEmpresaFuncao.has(chave)) {
                porEmpresaFuncao.set(chave, {
                    empresa: empresaNome,
                    funcao: funcaoNome,
                    dias: Object.fromEntries(diasMes.map((dia) => [dia, 0])),
                    total: 0,
                });
            }

            return porEmpresaFuncao.get(chave);
        };

        registros.forEach((registro) => {
            const dadosRegistro = registro?.dados || {};
            const conferencia = dadosRegistro?.conferenciaAssistida || {};
            const frequencia = conferencia?.frequencia || {};
            const participantes = Array.isArray(conferencia?.participantes) ? conferencia.participantes : [];
            const diasAtivos = Array.isArray(conferencia?.diasAtivos) ? conferencia.diasAtivos : [];
            const empresaRegistro =
                registro?.empresaNome ||
                dadosRegistro?.empresaNome ||
                dadosRegistro?.empresa ||
                empresaPrincipal ||
                "Empresa não informada";

            participantes.forEach((participante) => {
                const numero = participante?.numero || participante?.ordem || participante?.indice || "";
                const empresaParticipante = participante?.empresa || participante?.empresaNome || empresaRegistro;
                const funcao = participante?.funcao || participante?.cargo || "Sem função";
                const linha = obterLinha(empresaParticipante, funcao);

                diasAtivos.forEach((dia) => {
                    const data = parseDataControleMaoDeObraDds(dia?.data || dia?.dataDds || dia?.dia || "");

                    if (!data || data.getMonth() !== mesBaseNumero || data.getFullYear() !== anoBase) return;

                    const chave = obterChaveFrequenciaAssistidaDds(numero, dia);
                    const status = String(frequencia?.[chave] || "").trim().toLowerCase();

                    if (status === "presente" || status === "p") {
                        const diaMes = data.getDate();

                        linha.dias[diaMes] += 1;
                        linha.total += 1;
                        totaisDia[diaMes] += 1;
                        diasComLancamento.add(diaMes);

                        const totalEmpresaAtual = totaisPorEmpresa.get(linha.empresa) || 0;
                        totaisPorEmpresa.set(linha.empresa, totalEmpresaAtual + 1);
                    }
                });
            });
        });

        const linhas = Array.from(porEmpresaFuncao.values())
            .filter((linha) => Number(linha.total || 0) > 0)
            .sort((a, b) => {
                const empresaComparacao = a.empresa.localeCompare(b.empresa, "pt-BR");
                if (empresaComparacao !== 0) return empresaComparacao;
                return a.funcao.localeCompare(b.funcao, "pt-BR");
            });

        if (!linhas.length) {
            return null;
        }

        const totalHomemDia = linhas.reduce((total, linha) => total + Number(linha.total || 0), 0);
        const quantidadeDiasLancados = Math.max(diasComLancamento.size, 1);
        const mediaMes = totalHomemDia / quantidadeDiasLancados;
        const empresas = Array.from(totaisPorEmpresa.keys()).sort((a, b) => a.localeCompare(b, "pt-BR"));

        return {
            codigo: "HISTORICO-" + mesHistoricoMaoDeObraDds,
            empresaPrincipal,
            obra,
            periodoInicio: periodo.inicio,
            periodoFim: periodo.fim,
            periodoInicioFormatado: formatarDataControleMaoDeObraDds(periodo.inicio),
            periodoFimFormatado: formatarDataControleMaoDeObraDds(periodo.fim),
            dataBase,
            calendarioMaoDeObra: calendarioMaoDeObraSelecionadoDds,
            calendarioRotulo: calendarioMaoDeObraSelecionadoDds.rotulo,
            calendarioOrigem: calendarioMaoDeObraSelecionadoDds.origem,
            mesBase: dataBase.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            empresas,
            totaisPorEmpresa,
            registrosOrigem: registrosEncontrados.length,
            registrosConcluidos: registros.length,
            registrosPendentes: Math.max(registrosEncontrados.length - registros.length, 0),
            expediente: {
                jornada: "07:00 às 17:00",
                almoco: "12:00 às 13:00",
                dds: "07:00 às 07:10",
            },
        };
    }

    function exportarHistoricoMensalMaoDeObraDds() {
        const dadosControle = montarDadosHistoricoMensalMaoDeObraDds();

        if (!dadosControle) {
            alert("Busque um histórico mensal com DDS concluídos e presenças oficiais antes de exportar. DDS em aberto não entram na consolidação oficial.");
            return;
        }

        const {
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
            registrosOrigem,
            registrosConcluidos,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const margem = '<td class="margem"></td><td class="margem"></td>';
        const colspanConteudoExcel = diasMes.length + 3;
        const colspanTotalExcel = diasMes.length + 5;
        const colunasDiasExcel = diasMes.map(() => '<col style="width:22px" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "valor" : "zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = linha.total / quantidadeDiasLancados;

                return [
                    '<tr>',
                    margem,
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<tr class="grupo-empresa">',
                margem,
                '<td colspan="' + colspanConteudoExcel + '">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</td>',
                '</tr>',
                '<tr class="cabecalho">',
                margem,
                '<th>Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                linhasGrupo,
            ].join("");
        }).join("");

        const linhaTotalDia = diasMes.map((dia) => '<td class="total-dia">' + (totaisDia[dia] || 0) + '</td>').join("");
        const nomeArquivo = "mao-de-obra-mensal-" + String(obraTitulo + "-" + mesHistoricoMaoDeObraDds).replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() + ".xls";

        const html = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<style>',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #0f172a; }',
            'table { border-collapse: collapse; width: auto; table-layout: fixed; }',
            'th, td { border: 1px solid #b7c7d8; padding: 3px 4px; text-align: center; font-size: 10px; }',
            '.margem { width: 18px; min-width: 18px; background: #ffffff; border: 0 !important; }',
            '.linha-vazia td { height: 10px; border: 0 !important; background: #ffffff; }',
            '.titulo { background: #ffffff; color: #111827; font-size: 15px; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #94a3b8; }',
            '.subtitulo { background: #ffffff; color: #111827; font-weight: 800; text-align: center; vertical-align: middle; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; }',
            '.jornada { background: #f8fafc; color: #334155; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; }',
            '.resumo-linha { background: #f8fafc; color: #0f172a; font-weight: 900; text-align: center; vertical-align: middle; border: 1px solid #cbd5e1; }',
            '.legenda { background: #ffffff; color: #334155; font-weight: 700; text-align: center; vertical-align: middle; border: 1px solid #e5e7eb; font-size: 9px; height: 22px; }',
            '.grupo-empresa td:not(.margem) { background: #f1f5f9; color: #0f172a; font-weight: 900; text-align: center; border-top: 2px solid #94a3b8; border-bottom: 1px solid #cbd5e1; letter-spacing: .02em; }',
            '.cabecalho th { background: #334155; color: #ffffff; font-weight: 900; text-transform: uppercase; }',
            '.dia { background: #334155; color: #ffffff; width: 22px; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao { background: #ffffff; color: #0f172a; font-weight: 900; text-align: center; width: 120px; }',
            '.valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.zero { background: #ffffff; color: #94a3b8; }',
            '.linha-total td:not(.margem) { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '.total, .total-dia { background: #ffffff; color: #047857; font-weight: 900; }',
            '.media { background: #ffffff; color: #0f172a; font-weight: 900; }',
            '</style>',
            '</head>',
            '<body>',
            '<table>',
            '<colgroup>',
            '<col style="width:18px" />',
            '<col style="width:18px" />',
            '<col style="width:120px" />',
            colunasDiasExcel,
            '<col style="width:64px" />',
            '<col style="width:64px" />',
            '</colgroup>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            '<tr>',
            margem,
            '<td class="titulo" colspan="' + colspanConteudoExcel + '">CONTROLE MENSAL DE MÃO DE OBRA CONSOLIDADO (SAFESCAN BRASIL) - OBRA / SETOR: ', escaparHtmlControleMaoDeObraDds(obraTitulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Empresa principal: ', escaparHtmlControleMaoDeObraDds(empresaPrincipal), ' | Obra/Setor: ', escaparHtmlControleMaoDeObraDds(obra), ' | DDS encontrados: ', registrosOrigem, ' | Concluídos: ', registrosConcluidos, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Período consolidado: ', periodoInicioFormatado, ' a ', periodoFimFormatado, ' | Mês base: ', escaparHtmlControleMaoDeObraDds(mesBase), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="jornada" colspan="' + colspanConteudoExcel + '">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="resumo-linha" colspan="' + colspanConteudoExcel + '">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="legenda" colspan="' + colspanConteudoExcel + '"><strong>Legenda:</strong> <span style="color:#16a34a;font-size:13px;font-weight:900;">&#9632;</span> Presença registrada &nbsp; <span style="color:#facc15;font-size:13px;font-weight:900;">&#9632;</span> Sábado &nbsp; <span style="color:#ef4444;font-size:13px;font-weight:900;">&#9632;</span> Domingo &nbsp; <span style="color:#60a5fa;font-size:13px;font-weight:900;">&#9632;</span> Feriado</td>',
            '</tr>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            linhasTabela,
            '<tr class="linha-total">',
            margem,
            '<td>Total diário</td>',
            linhaTotalDia,
            '<td>', totalHomemDia, '</td>',
            '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
            '</tr>',
            '</table>',
            '</body>',
            '</html>',
        ].join("");

        baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html);
    }

    function imprimirHistoricoMensalMaoDeObraDds() {
        const dadosControle = montarDadosHistoricoMensalMaoDeObraDds();

        if (!dadosControle) {
            alert("Busque um histórico mensal com DDS concluídos e presenças oficiais antes de imprimir. DDS em aberto não entram na consolidação oficial.");
            return;
        }

        const {
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
            registrosOrigem,
            registrosConcluidos,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtmlControleMaoDeObraDds(heroUrl) + '" alt="" />' : "";
        const colunasDiasPdf = diasMes.map(() => '<col class="dia-col" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "dia-valor" : "dia-zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = quantidadeDiasLancados > 0
                    ? linha.total / quantidadeDiasLancados
                    : 0;

                return [
                    '<tr>',
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<section class="empresa-bloco">',
                '<div class="empresa-faixa">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</div>',
                '<table>',
                '<colgroup>',
                '<col class="funcao-col" />',
                colunasDiasPdf,
                '<col class="total-col" />',
                '<col class="media-col" />',
                '</colgroup>',
                '<thead>',
                '<tr>',
                '<th class="funcao">Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                '</thead>',
                '<tbody>',
                linhasGrupo,
                '<tr class="linha-total">',
                '<td>Total diário</td>',
                diasMes.map((dia) => '<td>' + (totaisDia[dia] || 0) + '</td>').join(""),
                '<td>', totalHomemDia, '</td>',
                '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
                '</tr>',
                '</tbody>',
                '</table>',
                '</section>',
            ].join("");
        }).join("");

        const janela = window.open("", "_blank", "width=1280,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            '<!doctype html>',
            '<html lang="pt-BR">',
            '<head>',
            '<meta charset="utf-8" />',
            '<title>Controle mensal consolidado de mão de obra</title>',
            '<style>',
            '@page { size: A4 landscape; margin: 8mm; }',
            '* { box-sizing: border-box; }',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
            '.page { min-height: 190mm; border: 1px solid #dbe3ef; overflow: hidden; }',
            '.hero { position: relative; overflow: hidden; min-height: 62px; padding: 11px 15px; color: #fff; background: #0f172a; }',
            '.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .36; }',
            '.hero:after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,.97), rgba(15,23,42,.84), rgba(15,23,42,.52)); }',
            '.hero-content { position: relative; z-index: 1; }',
            '.brand { margin: 0 0 3px; font-size: 9px; font-weight: 900; letter-spacing: .18em; text-transform: uppercase; color: #bbf7d0; }',
            'h1 { margin: 0; font-size: 18px; line-height: 1.1; }',
            '.subtitle { margin: 4px 0 0; font-size: 10px; font-weight: 700; color: #e2e8f0; }',
            '.cards { display: grid; grid-template-columns: repeat(6, 1fr); gap: 5px; padding: 7px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }',
            '.card { border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; padding: 5px 7px; min-height: 38px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }',
            '.card span { display: block; width: 100%; font-size: 7px; line-height: 1.15; text-align: center; text-transform: uppercase; font-weight: 900; color: #64748b; letter-spacing: .08em; }',
            '.card strong { display: block; width: 100%; margin-top: 2px; font-size: 10px; line-height: 1.15; font-weight: 900; text-align: center; color: #0f172a; overflow-wrap: anywhere; }',
            '.jornada, .resumo-pdf { margin: 6px 7px 0; border: 1px solid #dbe3ef; border-radius: 8px; background: #f8fafc; padding: 5px 8px; font-size: 9px; font-weight: 900; text-align: center; }',
            '.legenda-pdf { margin: 6px 7px 0; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; border: 1px solid #dbe3ef; border-radius: 8px; background: #fff; padding: 5px 8px; font-size: 8px; font-weight: 800; color: #334155; text-align: center; }',
            '.legenda-item { display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }',
            '.cor-legenda { display: inline-block; width: 9px; height: 9px; border-radius: 2px; border: 1px solid rgba(15,23,42,.25); }',
            '.cor-presenca { background: #16a34a; }',
            '.cor-sabado { background: #facc15; }',
            '.cor-domingo { background: #ef4444; }',
            '.cor-feriado { background: #60a5fa; }',
            '.empresa-bloco { margin: 7px; page-break-inside: avoid; }',
            '.empresa-faixa { background: #e2e8f0; color: #0f172a; border: 1px solid #cbd5e1; border-bottom: 0; border-radius: 8px 8px 0 0; padding: 5px 8px; text-align: center; font-size: 10px; font-weight: 900; }',
            'table { width: 100%; border-collapse: collapse; table-layout: fixed; }',
            'th, td { border: 1px solid #cbd5e1; padding: 2px 3px; text-align: center; font-size: 7px; line-height: 1.15; }',
            'th { background: #334155; color: #fff; font-weight: 900; text-transform: uppercase; }',
            '.funcao-col { width: 90px; }',
            '.dia-col { width: 19px; }',
            '.total-col { width: 38px; }',
            '.media-col { width: 38px; }',
            '.funcao { text-align: center; font-weight: 900; color: #0f172a; background: #fff; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.dia-valor { color: #047857; font-weight: 900; background: #fff; }',
            '.dia-zero { color: #94a3b8; background: #fff; }',
            '.total { color: #047857; font-weight: 900; background: #fff; }',
            '.media { color: #0f172a; font-weight: 900; background: #fff; }',
            '.linha-total td { background: #f1f5f9; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '</style>',
            '</head>',
            '<body>',
            '<main class="page">',
            '<section class="hero">',
            heroImgHtml,
            '<div class="hero-content">',
            '<p class="brand">SafeScan Brasil | DDS</p>',
            '<h1>Controle mensal consolidado de mão de obra</h1>',
            '<p class="subtitle">Obra / setor: ', escaparHtmlControleMaoDeObraDds(obraTitulo), ' — consolidado por empresa/contratada e função a partir do histórico mensal DDS.</p>',
            '</div>',
            '</section>',
            '<section class="cards">',
            '<div class="card"><span>Empresa principal</span><strong>', escaparHtmlControleMaoDeObraDds(empresaPrincipal || "-"), '</strong></div>',
            '<div class="card"><span>Obra / setor</span><strong>', escaparHtmlControleMaoDeObraDds(obra || "-"), '</strong></div>',
            '<div class="card"><span>Período</span><strong>', periodoInicioFormatado, ' a ', periodoFimFormatado, '</strong></div>',
            '<div class="card"><span>Mês base</span><strong>', escaparHtmlControleMaoDeObraDds(mesBase), '</strong></div>',
            '<div class="card"><span>DDS</span><strong>', registrosConcluidos, '/', registrosOrigem, '</strong></div>',
            '<div class="card"><span>Efetivo médio</span><strong>', formatarNumeroMaoDeObraDds(mediaMes), '</strong></div>',
            '</section>',
            '<section class="jornada">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</section>',
            '<section class="resumo-pdf">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</section>',
            '<section class="legenda-pdf">',
            '<strong>Legenda:</strong>',
            '<span class="legenda-item"><i class="cor-legenda cor-presenca"></i>Presença registrada</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-sabado"></i>Sábado</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-domingo"></i>Domingo</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-feriado"></i>Feriado</span>',
            '</section>',
            linhasTabela,
            '</main>',
            '<script>window.onload = function(){ window.focus(); window.print(); };</script>',
            '</body>',
            '</html>',
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    function exportarControleMaoDeObraDds() {
        const dadosControle = montarDadosControleMaoDeObraDds();

        if (!dadosControle) {
            alert("Não há participantes/dias suficientes para gerar o controle de mão de obra.");
            return;
        }

        const {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const margem = '<td class="margem"></td><td class="margem"></td>';
        const colspanConteudoExcel = diasMes.length + 3;
        const colspanTotalExcel = diasMes.length + 5;
        const colunasDiasExcel = diasMes.map(() => '<col style="width:22px" />').join("");

        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "valor" : "zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = linha.total / quantidadeDiasLancados;

                return [
                    '<tr>',
                    margem,
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<tr class="grupo-empresa">',
                margem,
                '<td colspan="' + colspanConteudoExcel + '">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</td>',
                '</tr>',
                '<tr class="cabecalho">',
                '<td class="margem"></td><td class="margem"></td>',
                '<th>Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                linhasGrupo,
            ].join("");
        }).join("");

        const linhaTotalDia = diasMes.map((dia) => '<td class="total-dia">' + (totaisDia[dia] || 0) + '</td>').join("");
        const nomeArquivo = "mao-de-obra-" + String(codigo).replace(/[^a-z0-9_-]+/gi, "-") + ".xls";

        const html = [
            '<!doctype html>',
            '<html>',
            '<head>',
            '<meta charset="utf-8" />',
            '<style>',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #0f172a; }',
            'table { border-collapse: collapse; width: auto; table-layout: fixed; }',
            'th, td { border: 1px solid #b7c7d8; padding: 3px 4px; text-align: center; font-size: 10px; }',
            '.margem { width: 18px; min-width: 18px; background: #ffffff; border: 0 !important; }',
            '.linha-vazia td { height: 10px; border: 0 !important; background: #ffffff; }',
            '.titulo { background: #ffffff; color: #111827; font-size: 15px; font-weight: 900; text-align: center; border: 1px solid #94a3b8; }',
            '.subtitulo { background: #ffffff; color: #111827; font-weight: 800; text-align: center; border-left: 1px solid #cbd5e1; border-right: 1px solid #cbd5e1; }',
            '.jornada { background: #f8fafc; color: #334155; font-weight: 900; text-align: center; border: 1px solid #cbd5e1; }',
            '.resumo-linha { background: #f8fafc; color: #0f172a; font-weight: 900; text-align: center; border: 1px solid #cbd5e1; }',
            '.legenda { background: #ffffff; color: #64748b; font-weight: 700; text-align: center; border: 1px solid #e5e7eb; font-size: 9px; }',
            '.legenda strong { color: #334155; font-weight: 900; }',
            '.legenda-verde { color: #047857; font-weight: 800; }',
            '.legenda-domingo { color: #dc2626; font-weight: 800; }',
            '.legenda-sabado { color: #b7791f; font-weight: 800; }',
            '.legenda-feriado { color: #2563eb; font-weight: 800; }',
            '.grupo-empresa td:not(.margem) { background: #f1f5f9; color: #0f172a; font-weight: 900; text-align: center; border-top: 2px solid #94a3b8; border-bottom: 1px solid #cbd5e1; letter-spacing: .02em; }',
            '.cabecalho th { background: #334155; color: #ffffff; font-weight: 900; text-transform: uppercase; }',
            '.dia { background: #334155; color: #ffffff; width: 22px; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao { background: #ffffff; color: #0f172a; font-weight: 900; text-align: center; width: 120px; }',
            '.valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.zero { background: #ffffff; color: #94a3b8; }',
            '.linha-total td:not(.margem) { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 2px solid #94a3b8; }',
            '.total { background: #ffffff; color: #047857; font-weight: 900; }',
            '.media { background: #ffffff; color: #0f172a; font-weight: 900; }',
            '</style>',
            '</head>',
            '<body>',
            '<table>',
            '<colgroup>',
            '<col style="width:18px" />',
            '<col style="width:18px" />',
            '<col style="width:120px" />',
            colunasDiasExcel,
            '<col style="width:64px" />',
            '<col style="width:64px" />',
            '</colgroup>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            '<tr>',
            margem,
            '<td class="titulo" colspan="' + colspanConteudoExcel + '">CONTROLE MENSAL DE MÃO DE OBRA (SAFESCAN BRASIL) - OBRA / SETOR: ', escaparHtmlControleMaoDeObraDds(obraTitulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Código DDS: ', escaparHtmlControleMaoDeObraDds(codigo), ' | Empresa principal: ', escaparHtmlControleMaoDeObraDds(empresaPrincipal), ' | Obra/Setor: ', escaparHtmlControleMaoDeObraDds(obra), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="subtitulo" colspan="' + colspanConteudoExcel + '">Período DDS: ', periodoInicioFormatado, ' a ', periodoFimFormatado, ' | Mês base: ', escaparHtmlControleMaoDeObraDds(mesBase), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="jornada" colspan="' + colspanConteudoExcel + '">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="resumo-linha" colspan="' + colspanConteudoExcel + '">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</td>',
            '</tr>',
            '<tr>',
            margem,
            '<td class="legenda" colspan="' + colspanConteudoExcel + '"><strong>Legenda:</strong> <span style="color:#16a34a;font-size:13px;font-weight:900;">&#9632;</span> Presença registrada &nbsp; <span style="color:#facc15;font-size:13px;font-weight:900;">&#9632;</span> Sábado &nbsp; <span style="color:#ef4444;font-size:13px;font-weight:900;">&#9632;</span> Domingo &nbsp; <span style="color:#60a5fa;font-size:13px;font-weight:900;">&#9632;</span> Feriado</td>',
            '</tr>',
            '<tr class="linha-vazia"><td colspan="' + colspanTotalExcel + '"></td></tr>',
            linhasTabela || '<tr><td colspan="' + colspanTotalExcel + '">Sem dados de mão de obra para exportar.</td></tr>',
            '<tr class="linha-total">',
            margem,
            '<td>Total diário</td>',
            linhaTotalDia,
            '<td>', totalHomemDia, '</td>',
            '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
            '</tr>',
            '</table>',
            '</body>',
            '</html>',
        ].join("");

        baixarHtmlExcelControleMaoDeObraDds(nomeArquivo, html);
    }

    function imprimirControleMaoDeObraDds() {
        const dadosControle = montarDadosControleMaoDeObraDds();

        if (!dadosControle) {
            alert("Não há participantes/dias suficientes para imprimir o controle de mão de obra.");
            return;
        }

        const {
            codigo,
            empresaPrincipal,
            obra,
            periodoInicioFormatado,
            periodoFimFormatado,
            mesBase,
            diasMes,
            linhas,
            totaisDia,
            totalHomemDia,
            quantidadeDiasLancados,
            mediaMes,
            expediente,
            empresas,
            dataBase,
            calendarioRotulo,
        } = dadosControle;

        const grupos = agruparLinhasControleMaoDeObraDds(linhas);
        const obraTitulo = String(obra || "NÃO INFORMADO").trim().toUpperCase() || "NÃO INFORMADO";
        const heroUrl = String(dashboardHeroSstDds || "");
        const heroImgHtml = heroUrl ? '<img class="hero-img" src="' + escaparHtmlControleMaoDeObraDds(heroUrl) + '" alt="" />' : "";
        const colunasDiasPdf = diasMes.map(() => '<col class="dia-col" />').join("");
        const thDias = diasMes.map((dia) => {
            const dataDia = new Date(dataBase.getFullYear(), dataBase.getMonth(), dia);
            const classeDia = obterClasseCalendarioMaoDeObraDds(dataDia);
            const corDia =
                classeDia.includes("dia-feriado")
                    ? "#60a5fa"
                    : classeDia.includes("dia-domingo")
                        ? "#ef4444"
                        : classeDia.includes("dia-sabado")
                            ? "#facc15"
                            : "#ffffff";

            return '<th class="dia' + classeDia + '" style="color:' + corDia + ';">' + String(dia).padStart(2, "0") + '</th>';
        }).join("");

        const linhasTabela = grupos.map((grupo) => {
            const linhasGrupo = grupo.linhas.map((linha) => {
                const tdsDias = diasMes.map((dia) => {
                    const valor = linha.dias[dia] || 0;
                    return '<td class="' + (valor > 0 ? "dia-valor" : "dia-zero") + '">' + valor + '</td>';
                }).join("");

                const mediaItem = quantidadeDiasLancados > 0
                    ? linha.total / quantidadeDiasLancados
                    : 0;

                return [
                    '<tr>',
                    '<td class="funcao">', escaparHtmlControleMaoDeObraDds(linha.funcao), '</td>',
                    tdsDias,
                    '<td class="total">', linha.total, '</td>',
                    '<td class="media">', formatarNumeroMaoDeObraDds(mediaItem), '</td>',
                    '</tr>',
                ].join("");
            }).join("");

            return [
                '<section class="empresa-bloco">',
                '<div class="empresa-faixa">Empresa / Contratada: ', escaparHtmlControleMaoDeObraDds(grupo.empresa), '</div>',
                '<table>',
                '<colgroup>',
                '<col class="funcao-col" />',
                colunasDiasPdf,
                '<col class="total-col" />',
                '<col class="media-col" />',
                '</colgroup>',
                '<thead>',
                '<tr>',
                '<th class="funcao">Função</th>',
                thDias,
                '<th>Total</th>',
                '<th>Média</th>',
                '</tr>',
                '</thead>',
                '<tbody>',
                linhasGrupo,
                '<tr class="linha-total">',
                '<td>Total diário</td>',
                diasMes.map((dia) => '<td>' + (totaisDia[dia] || 0) + '</td>').join(""),
                '<td>', totalHomemDia, '</td>',
                '<td>', formatarNumeroMaoDeObraDds(mediaMes), '</td>',
                '</tr>',
                '</tbody>',
                '</table>',
                '</section>',
            ].join("");
        }).join("");

        const janela = window.open("", "_blank", "width=1280,height=760");

        if (!janela) {
            alert("Não foi possível abrir a janela de impressão. Verifique o bloqueador de pop-up do navegador.");
            return;
        }

        const html = [
            '<!doctype html>',
            '<html lang="pt-BR">',
            '<head>',
            '<meta charset="utf-8" />',
            '<title>Controle de mão de obra - ', escaparHtmlControleMaoDeObraDds(codigo), '</title>',
            '<style>',
            '@page { size: A4 landscape; margin: 8mm; }',
            '* { box-sizing: border-box; }',
            'body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #0f172a; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
            '.page { min-height: 190mm; border: 1px solid #dbe3ef; overflow: hidden; }',
            '.hero { position: relative; overflow: hidden; min-height: 62px; padding: 11px 15px; color: #fff; background: #0f172a; }',
            '.hero-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .36; }',
            '.hero:after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(15,23,42,.97), rgba(15,23,42,.84), rgba(15,23,42,.52)); }',
            '.hero-content { position: relative; z-index: 1; }',
            '.brand { margin: 0 0 3px; font-size: 8px; font-weight: 900; letter-spacing: .16em; text-transform: uppercase; color: #86efac; }',
            'h1 { margin: 0; font-size: 19px; line-height: 1.05; }',
            '.subtitle { margin: 3px 0 0; font-size: 9.5px; font-weight: 700; color: #e2e8f0; }',
            '.content { padding: 9px 11px; }',
            '.identity-cards { display: grid; grid-template-columns: 1.05fr 1.2fr 1fr 1.2fr 1fr; gap: 4px; margin-bottom: 4px; }',
            '.metric-cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; margin-bottom: 6px; }',
            '.card { min-height: 34px; border: 1px solid #dbe3ef; border-radius: 7px; padding: 4px 5px; background: #f8fafc; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }',
            '.card span { display: block; font-size: 6.9px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; color: #64748b; }',
            '.card strong { display: block; margin-top: 1px; font-size: 10.2px; line-height: 1.1; font-weight: 900; max-width: 100%; overflow-wrap: anywhere; }',
            '.jornada { margin-bottom: 4px; border: 1px solid #fed7aa; border-left: 4px solid #f97316; border-radius: 7px; padding: 5px 7px; background: #fff7ed; color: #7c2d12; font-size: 9px; font-weight: 900; text-align: center; }',
            '.resumo-pdf { margin-bottom: 4px; border: 1px solid #cbd5e1; border-radius: 7px; padding: 5px 7px; background: #f8fafc; color: #0f172a; font-size: 8.8px; font-weight: 900; text-align: center; }',
            '.legenda-pdf { margin-bottom: 5px; display: flex; align-items: center; justify-content: center; gap: 12px; flex-wrap: wrap; border: 1px solid #e5e7eb; border-radius: 7px; padding: 4px 6px; background: #ffffff; color: #334155; font-size: 8px; font-weight: 800; text-align: center; }',
            '.legenda-item { display: inline-flex; align-items: center; justify-content: center; gap: 4px; white-space: nowrap; }',
            '.cor-legenda { display: inline-block; width: 9px; height: 9px; border-radius: 2px; border: 1px solid rgba(15,23,42,.25); }',
            '.cor-presenca { background: #16a34a; }',
            '.cor-sabado { background: #facc15; }',
            '.cor-domingo { background: #ef4444; }',
            '.cor-feriado { background: #60a5fa; }',
            '.empresa-bloco { margin-top: 6px; }',
            '.empresa-faixa { background: #f1f5f9; border: 1px solid #cbd5e1; color: #0f172a; font-size: 8.1px; font-weight: 900; text-align: center; padding: 4px 6px; text-transform: uppercase; letter-spacing: .03em; }',
            'table { width: 100%; border-collapse: collapse; table-layout: fixed; }',
            'th, td { border: 1px solid #cbd5e1; padding: 2px 2px; text-align: center; font-size: 6.4px; line-height: 1.05; }',
            'th { background: #334155; color: #ffffff; font-weight: 900; }',
            '.dia-domingo { color: #ef4444 !important; }',
            '.dia-sabado { color: #facc15 !important; }',
            '.dia-feriado { color: #60a5fa !important; }',
            '.funcao-col { width: 74px; }',
            '.dia-col { width: 15.5px; }',
            '.total-col { width: 28px; }',
            '.media-col { width: 28px; }',
            '.funcao { text-align: center; font-weight: 900; background: #ffffff; color: #0f172a; overflow-wrap: anywhere; }',
            '.dia-valor { background: #ffffff; color: #047857; font-weight: 900; }',
            '.dia-zero { background: #ffffff; color: #94a3b8; }',
            '.total { font-weight: 900; background: #ffffff; color: #047857; }',
            '.media { font-weight: 900; background: #ffffff; color: #0f172a; }',
            '.linha-total td { background: #f8fafc; color: #0f172a; font-weight: 900; border-top: 1.5px solid #94a3b8; }',
            '@media print { .page { border: 0; } .hero { background: #0f172a !important; } .hero-img { display: block !important; } }',
            '</style>',
            '</head>',
            '<body>',
            '<article class="page">',
            '<header class="hero">',
            heroImgHtml,
            '<div class="hero-content">',
            '<p class="brand">SafeScan Brasil | Implantação / Obra</p>',
            '<h1>Controle mensal de mão de obra</h1>',
            '<p class="subtitle">Obra / setor: ', escaparHtmlControleMaoDeObraDds(obraTitulo), ' — consolidado por empresa/contratada e função.</p>',
            '</div>',
            '</header>',
            '<main class="content">',
            '<section class="identity-cards">',
            '<div class="card"><span>Código DDS</span><strong>', escaparHtmlControleMaoDeObraDds(codigo), '</strong></div>',
            '<div class="card"><span>Empresa principal</span><strong>', escaparHtmlControleMaoDeObraDds(empresaPrincipal || "-"), '</strong></div>',
            '<div class="card"><span>Obra / setor</span><strong>', escaparHtmlControleMaoDeObraDds(obra || "-"), '</strong></div>',
            '<div class="card"><span>Período</span><strong>', periodoInicioFormatado, ' a ', periodoFimFormatado, '</strong></div>',
            '<div class="card"><span>Mês base</span><strong>', escaparHtmlControleMaoDeObraDds(mesBase), '</strong></div>',
            '</section>',
            '<section class="metric-cards">',
            '<div class="card"><span>Empresas</span><strong>', empresas.length, '</strong></div>',
            '<div class="card"><span>Funções</span><strong>', linhas.length, '</strong></div>',
            '<div class="card"><span>Dias apurados</span><strong>', quantidadeDiasLancados, '</strong></div>',
            '<div class="card"><span>Acumulado do período</span><strong>', totalHomemDia, '</strong></div>',
            '<div class="card"><span>Efetivo médio</span><strong>', formatarNumeroMaoDeObraDds(mediaMes), '</strong></div>',
            '</section>',
            '<section class="jornada">Expediente normal: ', expediente.jornada, ' | Almoço: ', expediente.almoco, ' | DDS: ', expediente.dds, '</section>',
            '<section class="resumo-pdf">Resumo do período: Efetivo médio ', formatarNumeroMaoDeObraDds(mediaMes), ' | Acumulado do período ', totalHomemDia, ' | Dias apurados ', quantidadeDiasLancados, ' | Empresas ', empresas.length, ' | Calendário aplicado: ', escaparHtmlControleMaoDeObraDds(calendarioRotulo), '</section>',
            '<section class="legenda-pdf">',
            '<strong>Legenda:</strong>',
            '<span class="legenda-item"><i class="cor-legenda cor-presenca"></i>Presença registrada</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-sabado"></i>Sábado</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-domingo"></i>Domingo</span>',
            '<span class="legenda-item"><i class="cor-legenda cor-feriado"></i>Feriado</span>',
            '</section>',
            linhasTabela,
            '</main>',
            '</article>',
            '<script>window.onload=function(){setTimeout(function(){window.focus();window.print();},700);};</script>',
            '</body>',
            '</html>',
        ].join("");

        janela.document.open();
        janela.document.write(html);
        janela.document.close();
    }

    function obterPeriodoHistoricoMensalMaoDeObraDds() {
        const mesBase = String(mesHistoricoMaoDeObraDds || "").trim();
        const partes = mesBase.split("-");

        if (partes.length !== 2) {
            return null;
        }

        const ano = Number(partes[0]);
        const mes = Number(partes[1]);

        if (!ano || !mes || mes < 1 || mes > 12) {
            return null;
        }

        const ultimoDia = new Date(ano, mes, 0).getDate();

        return {
            inicio: String(ano).padStart(4, "0") + "-" + String(mes).padStart(2, "0") + "-01",
            fim: String(ano).padStart(4, "0") + "-" + String(mes).padStart(2, "0") + "-" + String(ultimoDia).padStart(2, "0"),
        };
    }

    function normalizarBuscaObraHistoricoMensalDds(valor = "") {
        const textoNormalizado = String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        const placeholdersInvalidos = new Set([
            "obra setor nao definido",
            "obra nao informada",
            "setor nao definido",
            "selecione uma obra cadastrada no dds",
            "nao informado",
            "nao informada",
            "nao definido",
            "nao definida"
        ]);

        return placeholdersInvalidos.has(textoNormalizado) ? "" : textoNormalizado;
    }

    async function buscarHistoricoMensalMaoDeObraDds() {
        if (carregandoHistoricoMensalMaoDeObraDds) return;

        if (!supabase) {
            setErroHistoricoMensalMaoDeObraDds("Supabase não disponível para buscar o histórico mensal DDS.");
            return;
        }

        const empresaId = obterUuidSeguroDds(
            obterIdEmpresaObjetoDds(empresaSelecionadaDds) ||
            registroScannerDds?.empresaId ||
            registroScannerDds?.empresa_id ||
            registroScannerDds?.dados?.empresaId ||
            registroScannerDds?.dados?.empresa_id ||
            dadosDds.empresaId ||
            dadosDds.empresa_id ||
            ""
        );

        const obraId = obterUuidSeguroDds(
            obraSelecionadaIdDds ||
            registroScannerDds?.obraId ||
            registroScannerDds?.obra_id ||
            registroScannerDds?.dados?.obraId ||
            registroScannerDds?.dados?.obra_id ||
            dadosDds.obraId ||
            dadosDds.obra_id ||
            ""
        );

        const obraNomeBase = obterNomeObraValidoMaoDeObraDds(obraSelecionadaNomeDds);

        const obraNomeComparacao = normalizarBuscaObraHistoricoMensalDds(obraNomeBase);
        const periodo = obterPeriodoHistoricoMensalMaoDeObraDds();

        if (!periodo) {
            setErroHistoricoMensalMaoDeObraDds("Informe um mês/ano válido para buscar o histórico mensal.");
            return;
        }

        // Obra indefinida não bloqueia o histórico mensal; nesse caso a busca usa empresa/período.

        setCarregandoHistoricoMensalMaoDeObraDds(true);
        setErroHistoricoMensalMaoDeObraDds("");

        try {
            const registrosBase = await listarRegistrosDds({
                supabase,
                empresaId,
                obraId: "",
                periodoInicio: periodo.inicio,
                periodoFim: periodo.fim,
                limite: 300,
            });

            let registros = !obraId
                ? registrosBase
                : registrosBase.filter((registro) => {
                    const idRegistro = obterUuidSeguroDds(
                        registro?.obraId || registro?.obra_id || registro?.dados?.obraId || registro?.dados?.obra_id || ""
                    );

                    if (idRegistro && idRegistro === obraId) return true;

                    const nomeRegistro = normalizarBuscaObraHistoricoMensalDds(
                        obterNomeObraValidoMaoDeObraDds(
                            registro?.obraNome,
                            registro?.dados?.obraNome,
                            registro?.dados?.obraSetor,
                            registro?.dados?.obra,
                            registro?.obra
                        )
                    );

                    if (!nomeRegistro || !obraNomeComparacao) return false;

                    return (
                        nomeRegistro === obraNomeComparacao ||
                        nomeRegistro.includes(obraNomeComparacao) ||
                        obraNomeComparacao.includes(nomeRegistro)
                    );
                });

            setHistoricoMensalMaoDeObraDds(registros);
            setHistoricoMensalConsultadoEmDds(new Date().toISOString());

            if (!registros.length) {
                setErroHistoricoMensalMaoDeObraDds("Nenhum DDS localizado para o mês selecionado. Confirme se o DDS foi salvo/concluído nesse mês ou se a obra está vinculada corretamente.");
            }
        } catch (error) {
            setHistoricoMensalMaoDeObraDds([]);
            setErroHistoricoMensalMaoDeObraDds(error?.message || "Não foi possível buscar o histórico mensal DDS.");
        } finally {
            setCarregandoHistoricoMensalMaoDeObraDds(false);
        }
    }

    async function carregarRegistroHistoricoMensalDds(registroHistorico) {
        if (carregandoScannerDds) return;

        const codigo = String(registroHistorico?.codigo || "").trim();

        if (!codigo) {
            setErroScannerDds("DDS do histórico mensal sem código para carregar.");
            return;
        }

        if (!supabase) {
            setErroScannerDds("Supabase não disponível para carregar o DDS do histórico mensal.");
            return;
        }

        setCarregandoScannerDds(true);
        setErroScannerDds("");

        try {
            const registro = await carregarRegistroDdsPorCodigo({
                supabase,
                codigo,
            });

            if (!registro) {
                setRegistroScannerDds(null);
                setErroScannerDds("Nenhum registro de DDS foi localizado para este código.");
                return;
            }

            setRegistroScannerDds(registro);
            setCodigoConferenciaDds(registro.codigo || codigo);

            window.setTimeout(() => {
                document
                    .querySelector("[data-dds-registro-localizado]")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 120);
        } catch (error) {
            setRegistroScannerDds(null);
            setErroScannerDds(error?.message || "Não foi possível carregar o DDS do histórico mensal.");
        } finally {
            setCarregandoScannerDds(false);
        }
    }

    return {
        exportarHistoricoMensalMaoDeObraDds,
        imprimirHistoricoMensalMaoDeObraDds,
        exportarControleMaoDeObraDds,
        imprimirControleMaoDeObraDds,
        buscarHistoricoMensalMaoDeObraDds,
        carregarRegistroHistoricoMensalDds,
    };
}
