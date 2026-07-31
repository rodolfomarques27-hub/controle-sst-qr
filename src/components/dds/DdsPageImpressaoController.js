export default function criarControladorImpressaoDds({
    aniversariantesSemanaDds,
    carregarRegistroDdsPorCodigo,
    dadosDds,
    dadosDdsComRegistro,
    diasSemanaComTemasDds,
    empresaSelecionadaDds,
    fimSemanaDds,
    folhasContinuacaoDds,
    inicioSemanaDds,
    obraSelecionadaIdDds,
    obterIdEmpresaObjetoDds,
    obterUuidSeguroDds,
    orientacoesDdsEditaveis,
    participantesSistemaDds,
    recadosDdsEditaveis,
    salvandoRegistroDds,
    salvarRegistroDds,
    setErroRegistroDds,
    setRegistroDdsConferencia,
    setRegistroScannerDds,
    setSalvandoRegistroDds,
    supabase,
}) {
    async function salvarDdsNoSistema({ imprimir = false, silencioso = false } = {}) {
        if (salvandoRegistroDds) return;

        setErroRegistroDds("");

        if (!supabase) {
            if (imprimir) window.print();
            return;
        }

        setSalvandoRegistroDds(true);
        setErroRegistroDds("");

        try {
            const registroExistente = await carregarRegistroDdsPorCodigo({
                supabase,
                codigo: dadosDds.codigo,
            });
            const dadosExistentes = registroExistente?.dados || {};
            const participantesExistentes = Array.isArray(dadosExistentes.participantes)
                ? dadosExistentes.participantes
                : [];
            const conferenciaConcluida =
                dadosExistentes?.conferenciaAssistida?.fechamento?.status === "concluida";
            const participantesSnapshot = conferenciaConcluida && participantesExistentes.length > 0
                ? participantesExistentes
                : participantesSistemaDds.map((participante, indice) => ({
                    numero: participante.numero || indice + 1,
                    codigoSafescan:
                        participante.codigoFuncionario ||
                        participante.codigo_funcionario ||
                        participante.codigoSafescan ||
                        participante.codigoSafeScan ||
                        participante.codigo_safescan ||
                        participante.codigo ||
                        participante.codigo_colaborador ||
                        participante.codigoColaborador ||
                        participante.codigo_qr ||
                        participante.qr_codigo ||
                        participante.codigoQr ||
                        participante.matricula_esocial ||
                        participante.matriculaEsocial ||
                        participante.matricula ||
                        "",
                    nome: participante.nome,
                    funcao: participante.funcao,
                    empresa: participante.empresa,
                }));
            const registro = await salvarRegistroDds({
                supabase,
                registro: {
                    codigo: dadosDds.codigo,
                    empresaId: obterUuidSeguroDds(obterIdEmpresaObjetoDds(empresaSelecionadaDds)),
                    obraId: obterUuidSeguroDds(obraSelecionadaIdDds),
                    empresaNome: dadosDds.empresa,
                    obraNome: dadosDds.obraSetor,
                    periodoInicio: inicioSemanaDds,
                    periodoFim: fimSemanaDds,
                    responsavelNome: dadosDds.responsavel,
                    fiscalIdealiza: dadosDds.fiscalIdealiza,
                    liderEncarregado: dadosDds.encarregado,
                    dados: {
                        ...dadosExistentes,
                        periodo: dadosDds.periodo,
                        resumoSemana: dadosDds.resumoSemana,
                        turno: dadosDds.turno,
                        funcaoResponsavel: dadosDds.funcaoResponsavel,
                        totalParticipantes: participantesSnapshot.length,
                        totalFolhas: folhasContinuacaoDds.length + 1,
                        recadosSemana: recadosDdsEditaveis,
                        orientacoesImportantes: orientacoesDdsEditaveis,
                        aniversariantesSemana: aniversariantesSemanaDds,
                        logosEmpresasCabecalho: dadosDdsComRegistro.logosEmpresasCabecalho || [],
                        empresaLogoUrl: dadosDdsComRegistro.empresaLogoUrl || "" ,
                        empresaLogoNome: dadosDdsComRegistro.empresaLogoNome || "" ,
                        contratanteLogoUrl: dadosDdsComRegistro.contratanteLogoUrl || "" ,
                        contratanteLogoNome: dadosDdsComRegistro.contratanteLogoNome || "" ,
                        participantes: participantesSnapshot,
                        diasSemana: diasSemanaComTemasDds.map((dia) => ({
                            dia: dia.dia,
                            data: dia.data,
                            tema: dia.tema,
                            responsavel: dia.responsavel,
                            semAtividade: Boolean(dia.semAtividade),
                        })),
                    },
                    status: "Ativo",
                },
            });

            setRegistroDdsConferencia(registro);
            setRegistroScannerDds(registro);
            if (imprimir) window.setTimeout(() => window.print(), 150);
            return registro;
        } catch (error) {
            const mensagem = error?.message || "Não foi possível gerar o QR de conferência do DDS.";
            setErroRegistroDds(mensagem);
            if (!silencioso) window.alert(mensagem);
            return null;
        } finally {
            setSalvandoRegistroDds(false);
        }
    }

    async function imprimirDdsComQrConferencia() {
        return salvarDdsNoSistema({ imprimir: true });
    }

    return {
        imprimirDdsComQrConferencia,
        salvarDdsNoSistema,
    };
}
