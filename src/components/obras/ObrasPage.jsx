import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import {
    Building2,
    Link2,
    MapPin,
    Pencil,
    Plus,
    RefreshCw,
    ShieldCheck,
    Trash2,
    Users,
} from "lucide-react";

import {
    supabase,
} from "../../lib/supabaseClient";

import dashboardHeroBackground from "../../assets/dashboard-hero-sst.webp";

import {
    TIPOS_VINCULO_EMPRESA_OBRA,
    adicionarObra,
    atualizarObra,
    atualizarVinculoEmpresaObra,
    excluirObra,
    excluirVinculoEmpresaObra,
    listarObras,
    listarVinculosEmpresasObras,
    vincularEmpresaObra,
} from "../../services/obrasService.js";


const FORM_INICIAL = {
    nome: "",
    numeroObra: "",
    identificacaoObra: "",
    status: "Ativa",
    contratanteEmpresaId: "",
    cep: "",
    cidade: "",
    uf: "",
    endereco: "",
    numeroEndereco: "",
    fiscalContratante: "",
    tecnicoSegurancaContratante: "",
    liderEncarregado: "",
    observacoes: "",
};


function texto(valor = "") {
    return String(valor ?? "").trim();
}


function normalizarCepObra(valor = "") {
    return String(valor ?? "")
        .replace(/\D/g, "")
        .slice(0, 8);
}


function empresaId(empresa = {}) {
    return texto(
        empresa.id ||
        empresa.empresa_id ||
        empresa.empresaId
    );
}


function empresaNome(empresa = {}) {
    return (
        texto(
            empresa.nome ||
            empresa.nome_fantasia ||
            empresa.razao_social ||
            empresa.empresa
        ) ||
        "Empresa sem nome"
    );
}


function empresaContratante(empresa = {}) {
    const tipo =
        texto(
            empresa.tipo_empresa ||
            empresa.tipoEmpresa
        )
            .toLocaleLowerCase("pt-BR");

    return (
        tipo === "contratante" ||
        tipo.startsWith("contratante -")
    );
}


function vinculoTipo(vinculo = {}) {
    return texto(
        vinculo.tipoVinculo ||
        vinculo.tipo_vinculo
    );
}


function formularioObra(obra = {}) {
    return {
        nome: obra.nome || "",
        numeroObra:
            obra.numeroObra ||
            obra.numero_obra ||
            "",
        identificacaoObra:
            obra.identificacaoObra ||
            obra.identificacao_obra ||
            "",
        status:
            obra.status === "Inativa"
                ? "Inativa"
                : "Ativa",
        contratanteEmpresaId: "",
        cep: obra.cep || "",
        cidade: obra.cidade || "",
        uf: obra.uf || "",
        endereco: obra.endereco || "",
        numeroEndereco:
            obra.numeroEndereco ||
            obra.numero_endereco ||
            "",
        fiscalContratante:
            obra.fiscalContratante ||
            obra.fiscal_contratante ||
            obra.fiscalIdealiza ||
            obra.fiscal_idealiza ||
            "",
        tecnicoSegurancaContratante:
            obra.tecnicoSegurancaContratante ||
            obra.tecnico_seguranca_contratante ||
            obra.tecnicoSegurancaIdealiza ||
            obra.tecnico_seguranca_idealiza ||
            "",
        liderEncarregado:
            obra.liderEncarregado ||
            obra.lider_encarregado ||
            "",
        observacoes:
            obra.observacoes ||
            "",
    };
}


function contratanteDaObra(
    vinculos = [],
    obraId = ""
) {
    const id =
        texto(obraId);

    const candidatos =
        vinculos.filter(
            (vinculo) =>
                texto(
                    vinculo.obraId ||
                    vinculo.obra_id ||
                    vinculo.obra?.id
                ) === id &&
                vinculoTipo(vinculo) ===
                    TIPOS_VINCULO_EMPRESA_OBRA.CONTRATANTE
        );

    return (
        candidatos.find(
            (item) =>
                item.status !== "Inativa"
        ) ||
        candidatos[0] ||
        null
    );
}


function Indicador({
    titulo,
    valor,
    detalhe,
    Icone,
}) {
    return (
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.08em] text-slate-500">
                        {titulo}
                    </p>

                    <p className="mt-2 text-3xl font-black text-slate-950">
                        {valor}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                        {detalhe}
                    </p>
                </div>

                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icone className="h-5 w-5" />
                </span>
            </div>
        </article>
    );
}


export function ObrasPage({
    empresasBanco = [],
    tenantAdminAutorizado = false,
}) {
    const [
        obras,
        setObras,
    ] = useState([]);

    const [
        vinculos,
        setVinculos,
    ] = useState([]);

    const [
        carregando,
        setCarregando,
    ] = useState(false);

    const [
        mensagem,
        setMensagem,
    ] = useState(
        "Carregando cadastro de obras..."
    );

    const [
        formularioAberto,
        setFormularioAberto,
    ] = useState(false);

    const [
        editandoId,
        setEditandoId,
    ] = useState("");

    const [
        form,
        setForm,
    ] = useState({
        ...FORM_INICIAL,
    });

    const [
        cepConsulta,
        setCepConsulta,
    ] = useState({
        estado: "idle",
        mensagem: "",
    });

    const cepConsultaSequenciaRef =
        useRef(0);

    const [
        salvando,
        setSalvando,
    ] = useState(false);

    const [
        excluindoId,
        setExcluindoId,
    ] = useState("");

    const [
        obraVinculoId,
        setObraVinculoId,
    ] = useState("");

    const [
        empresaVinculoId,
        setEmpresaVinculoId,
    ] = useState("");

    const [
        statusVinculo,
        setStatusVinculo,
    ] = useState("Ativa");

    const [
        salvandoVinculo,
        setSalvandoVinculo,
    ] = useState(false);


    const empresas =
        useMemo(
            () =>
                [...(empresasBanco || [])]
                    .filter(
                        (empresa) =>
                            Boolean(
                                empresaId(empresa)
                            )
                    )
                    .sort(
                        (a, b) =>
                            empresaNome(a)
                                .localeCompare(
                                    empresaNome(b),
                                    "pt-BR"
                                )
                    ),
            [
                empresasBanco,
            ]
        );


    const contratantes =
        useMemo(
            () =>
                empresas.filter(
                    empresaContratante
                ),
            [
                empresas,
            ]
        );


    const executoras =
        useMemo(
            () =>
                empresas.filter(
                    (empresa) =>
                        !empresaContratante(
                            empresa
                        )
                ),
            [
                empresas,
            ]
        );


    const obrasAtivas =
        useMemo(
            () =>
                obras.filter(
                    (obra) =>
                        obra.status !==
                        "Inativa"
                ),
            [
                obras,
            ]
        );


    const resumoVinculosAtivos =
        useMemo(
            () => {
                const ativos =
                    vinculos.filter(
                        (item) =>
                            item.status !==
                            "Inativa"
                    );

                return {
                    total:
                        ativos.length,
                    contratantes:
                        ativos.filter(
                            (item) =>
                                vinculoTipo(
                                    item
                                ) ===
                                TIPOS_VINCULO_EMPRESA_OBRA
                                    .CONTRATANTE
                        ).length,
                    executoras:
                        ativos.filter(
                            (item) =>
                                vinculoTipo(
                                    item
                                ) ===
                                TIPOS_VINCULO_EMPRESA_OBRA
                                    .EXECUTORA
                        ).length,
                };
            },
            [
                vinculos,
            ]
        );


    const detalheVinculosAtivos =
        `${resumoVinculosAtivos.contratantes} ${
            resumoVinculosAtivos.contratantes === 1
                ? "contratante"
                : "contratantes"
        } • ${resumoVinculosAtivos.executoras} ${
            resumoVinculosAtivos.executoras === 1
                ? "executora"
                : "executoras"
        }`;


    const carregar =
        useCallback(
            async () => {
                if (
                    !tenantAdminAutorizado
                ) {
                    return;
                }

                setCarregando(true);
                setMensagem(
                    "Carregando obras e vínculos..."
                );

                try {
                    const [
                        obrasBanco,
                        vinculosBanco,
                    ] =
                        await Promise.all([
                            listarObras(),
                            listarVinculosEmpresasObras(),
                        ]);

                    setObras(
                        obrasBanco
                    );

                    setVinculos(
                        vinculosBanco
                    );

                    setMensagem(
                        `${obrasBanco.length} obra(s) e ${vinculosBanco.length} vínculo(s) carregado(s).`
                    );
                }
                catch (erro) {
                    console.error(
                        "Erro ao carregar obras:",
                        erro
                    );

                    setMensagem(
                        "Não foi possível carregar as obras. "
                        + (
                            erro?.message ||
                            "Erro não identificado."
                        )
                    );
                }
                finally {
                    setCarregando(false);
                }
            },
            [
                tenantAdminAutorizado,
            ]
        );


    useEffect(
        () => {
            void carregar();
        },
        [
            carregar,
        ]
    );


    const alterarCampo =
        (
            campo,
            valor
        ) => {
            setForm(
                (atual) => ({
                    ...atual,
                    [campo]:
                        valor,
                })
            );
        };


    const consultarCepObra =
        async (
            cep
        ) => {
            cepConsultaSequenciaRef.current += 1;

            const sequenciaConsulta =
                cepConsultaSequenciaRef.current;

            setCepConsulta({
                estado:
                    "loading",
                mensagem:
                    "Consultando CEP...",
            });

            try {
                const resposta =
                    await fetch(
                        `https://viacep.com.br/ws/${encodeURIComponent(cep)}/json/`,
                        {
                            method:
                                "GET",
                            headers: {
                                Accept:
                                    "application/json",
                            },
                        }
                    );

                if (
                    !resposta.ok
                ) {
                    throw new Error(
                        `Consulta de CEP retornou HTTP ${resposta.status}.`
                    );
                }

                const dados =
                    await resposta.json();

                if (
                    sequenciaConsulta !==
                    cepConsultaSequenciaRef.current
                ) {
                    return;
                }

                if (
                    dados?.erro === true
                ) {
                    setCepConsulta({
                        estado:
                            "error",
                        mensagem:
                            "CEP não encontrado. Confira o número ou preencha o endereço manualmente.",
                    });

                    return;
                }

                setForm(
                    (atual) => {
                        if (
                            normalizarCepObra(
                                atual.cep
                            ) !== cep
                        ) {
                            return atual;
                        }

                        return {
                            ...atual,
                            endereco:
                                texto(
                                    dados?.logradouro
                                ) ||
                                atual.endereco,
                            cidade:
                                texto(
                                    dados?.localidade
                                ) ||
                                atual.cidade,
                            uf:
                                texto(
                                    dados?.uf
                                )
                                    .toUpperCase() ||
                                atual.uf,
                        };
                    }
                );

                setCepConsulta({
                    estado:
                        "success",
                    mensagem:
                        "Endereço localizado. Confira os dados antes de salvar.",
                });
            }
            catch (erro) {
                if (
                    sequenciaConsulta !==
                    cepConsultaSequenciaRef.current
                ) {
                    return;
                }

                console.error(
                    "Erro ao consultar CEP:",
                    erro
                );

                setCepConsulta({
                    estado:
                        "error",
                    mensagem:
                        "Não foi possível consultar o CEP. Preencha o endereço manualmente.",
                });
            }
        };


    const alterarCep =
        (
            valor
        ) => {
            const cep =
                normalizarCepObra(
                    valor
                );

            cepConsultaSequenciaRef.current += 1;

            setForm(
                (atual) => ({
                    ...atual,
                    cep,
                })
            );

            if (
                cep.length < 8
            ) {
                setCepConsulta({
                    estado:
                        "idle",
                    mensagem:
                        "",
                });

                return;
            }

            void consultarCepObra(
                cep
            );
        };


    const validarCepAoSair =
        () => {
            const cep =
                normalizarCepObra(
                    form.cep
                );

            if (
                cep.length > 0 &&
                cep.length < 8
            ) {
                setCepConsulta({
                    estado:
                        "error",
                    mensagem:
                        "Informe um CEP com 8 dígitos.",
                });
            }
        };


    const novaObra =
        () => {
            cepConsultaSequenciaRef.current += 1;

            setCepConsulta({
                estado: "idle",
                mensagem: "",
            });

            const unicaContratante =
                contratantes.length === 1
                    ? empresaId(
                        contratantes[0]
                    )
                    : "";

            setEditandoId("");

            setForm({
                ...FORM_INICIAL,
                contratanteEmpresaId:
                    unicaContratante,
            });

            setFormularioAberto(true);

            setMensagem(
                "Preencha os dados da nova obra."
            );
        };


    const editarObra =
        (
            obra
        ) => {
            cepConsultaSequenciaRef.current += 1;

            setCepConsulta({
                estado: "idle",
                mensagem: "",
            });

            const contratante =
                contratanteDaObra(
                    vinculos,
                    obra.id
                );

            setEditandoId(
                obra.id
            );

            setForm({
                ...formularioObra(
                    obra
                ),
                contratanteEmpresaId:
                    contratante?.empresaId ||
                    contratante?.empresa_id ||
                    "",
            });

            setFormularioAberto(true);

            setMensagem(
                `Editando obra: ${obra.nome || "sem nome"}.`
            );
        };


    const cancelar =
        () => {
            cepConsultaSequenciaRef.current += 1;

            setCepConsulta({
                estado: "idle",
                mensagem: "",
            });

            setEditandoId("");
            setFormularioAberto(false);
            setForm({
                ...FORM_INICIAL,
            });
            setMensagem(
                "Edição cancelada."
            );
        };


    const salvar =
        async (
            evento
        ) => {
            evento.preventDefault();

            const contratanteEmpresaId =
                texto(
                    form.contratanteEmpresaId
                );

            if (
                !texto(form.nome)
            ) {
                setMensagem(
                    "Informe o nome da obra."
                );

                return;
            }

            if (
                !contratanteEmpresaId
            ) {
                setMensagem(
                    "Selecione a empresa contratante."
                );

                return;
            }

            const payload = {
                ...form,
                nome:
                    texto(form.nome),
                numeroObra:
                    texto(
                        form.numeroObra
                    ),
                identificacaoObra:
                    texto(
                        form.identificacaoObra
                    ),
                status:
                    form.status === "Inativa"
                        ? "Inativa"
                        : "Ativa",
                cep:
                    texto(form.cep),
                cidade:
                    texto(form.cidade),
                uf:
                    texto(form.uf)
                        .toUpperCase(),
                endereco:
                    texto(
                        form.endereco
                    ),
                numeroEndereco:
                    texto(
                        form.numeroEndereco
                    ),
                fiscalContratante:
                    texto(
                        form.fiscalContratante
                    ),
                tecnicoSegurancaContratante:
                    texto(
                        form.tecnicoSegurancaContratante
                    ),
                liderEncarregado:
                    texto(
                        form.liderEncarregado
                    ),
                observacoes:
                    texto(
                        form.observacoes
                    ),
            };

            setSalvando(true);

            let obraNovaId =
                "";

            let contratanteAnterior =
                null;

            try {
                const obraSalva =
                    editandoId
                        ? await atualizarObra({
                            ...payload,
                            id:
                                editandoId,
                        })
                        : await adicionarObra(
                            payload
                        );

                if (
                    !editandoId
                ) {
                    obraNovaId =
                        texto(
                            obraSalva?.id
                        );
                }

                const obraId =
                    texto(
                        obraSalva?.id ||
                        editandoId
                    );

                if (!obraId) {
                    throw new Error(
                        "A obra foi salva sem ID."
                    );
                }

                const vinculosObra =
                    vinculos.filter(
                        (vinculo) =>
                            texto(
                                vinculo.obraId ||
                                vinculo.obra_id ||
                                vinculo.obra?.id
                            ) === obraId
                    );

                const contratanteAtual =
                    contratanteDaObra(
                        vinculosObra,
                        obraId
                    );

                const atualEmpresaId =
                    texto(
                        contratanteAtual?.empresaId ||
                        contratanteAtual?.empresa_id
                    );

                const vinculoSelecionado =
                    vinculosObra.find(
                        (vinculo) =>
                            texto(
                                vinculo.empresaId ||
                                vinculo.empresa_id
                            ) ===
                            contratanteEmpresaId
                    );

                if (
                    contratanteAtual?.id &&
                    atualEmpresaId &&
                    atualEmpresaId !==
                        contratanteEmpresaId &&
                    contratanteAtual.status !==
                        "Inativa"
                ) {
                    await atualizarVinculoEmpresaObra({
                        id:
                            contratanteAtual.id,
                        status:
                            "Inativa",
                        tipoVinculo:
                            TIPOS_VINCULO_EMPRESA_OBRA
                                .CONTRATANTE,
                    });

                    contratanteAnterior =
                        contratanteAtual;
                }

                try {
                    if (
                        vinculoSelecionado?.id
                    ) {
                        await atualizarVinculoEmpresaObra({
                            id:
                                vinculoSelecionado.id,
                            status:
                                "Ativa",
                            tipoVinculo:
                                TIPOS_VINCULO_EMPRESA_OBRA
                                    .CONTRATANTE,
                        });
                    }
                    else {
                        await vincularEmpresaObra(
                            contratanteEmpresaId,
                            obraId,
                            {
                                status:
                                    "Ativa",
                                tipoVinculo:
                                    TIPOS_VINCULO_EMPRESA_OBRA
                                        .CONTRATANTE,
                            }
                        );
                    }
                }
                catch (erroVinculo) {
                    if (
                        contratanteAnterior?.id
                    ) {
                        try {
                            await atualizarVinculoEmpresaObra({
                                id:
                                    contratanteAnterior.id,
                                status:
                                    "Ativa",
                                tipoVinculo:
                                    TIPOS_VINCULO_EMPRESA_OBRA
                                        .CONTRATANTE,
                            });
                        }
                        catch (erroRollback) {
                            console.error(
                                "Falha no rollback da contratante:",
                                erroRollback
                            );
                        }
                    }

                    if (
                        obraNovaId
                    ) {
                        try {
                            await excluirObra(
                                obraNovaId
                            );
                        }
                        catch (erroRollback) {
                            console.error(
                                "Falha no rollback da obra:",
                                erroRollback
                            );
                        }
                    }

                    throw erroVinculo;
                }

                setEditandoId("");
                setFormularioAberto(false);
                setForm({
                    ...FORM_INICIAL,
                });

                await carregar();

                setMensagem(
                    editandoId
                        ? "Obra atualizada com sucesso."
                        : "Obra cadastrada com sucesso."
                );
            }
            catch (erro) {
                console.error(
                    "Erro ao salvar obra:",
                    erro
                );

                setMensagem(
                    "Não foi possível salvar a obra. "
                    + (
                        erro?.message ||
                        "Erro não identificado."
                    )
                );
            }
            finally {
                setSalvando(false);
            }
        };


    const excluir =
        async (
            obra
        ) => {
            const obraId =
                texto(
                    obra?.id
                );

            if (!obraId) {
                return;
            }

            const vinculosObra =
                vinculos.filter(
                    (vinculo) =>
                        texto(
                            vinculo.obraId ||
                            vinculo.obra_id ||
                            vinculo.obra?.id
                        ) ===
                        obraId
                );

            if (
                vinculosObra.length > 0
            ) {
                setMensagem(
                    "Exclusão bloqueada: remova primeiro os vínculos empresa/obra."
                );

                return;
            }

            setExcluindoId(
                obraId
            );

            try {
                const {
                    count,
                    error,
                } =
                    await supabase
                        .from(
                            "dds_registros"
                        )
                        .select(
                            "id",
                            {
                                count:
                                    "exact",
                                head:
                                    true,
                            }
                        )
                        .eq(
                            "obra_id",
                            obraId
                        );

                if (error) {
                    throw error;
                }

                if (
                    Number(count || 0) > 0
                ) {
                    setMensagem(
                        "Exclusão bloqueada: esta obra possui DDS histórico. Altere o status para Inativa."
                    );

                    return;
                }

                const confirmou =
                    window.confirm(
                        `Excluir definitivamente a obra "${obra.nome}"?`
                    );

                if (!confirmou) {
                    return;
                }

                await excluirObra(
                    obraId
                );

                await carregar();

                setMensagem(
                    "Obra excluída com sucesso."
                );
            }
            catch (erro) {
                console.error(
                    "Erro ao excluir obra:",
                    erro
                );

                setMensagem(
                    "Não foi possível excluir a obra. "
                    + (
                        erro?.message ||
                        "Erro não identificado."
                    )
                );
            }
            finally {
                setExcluindoId("");
            }
        };


    const obraSelecionadaId =
        obraVinculoId ||
        obrasAtivas[0]?.id ||
        obras[0]?.id ||
        "";


    const obraSelecionada =
        obras.find(
            (obra) =>
                texto(obra.id) ===
                texto(
                    obraSelecionadaId
                )
        ) ||
        null;


    const empresaSelecionadaId =
        empresaVinculoId ||
        empresaId(
            executoras[0] ||
            {}
        );


    const executorasVinculadas =
        obraSelecionada
            ? vinculos.filter(
                (vinculo) =>
                    texto(
                        vinculo.obraId ||
                        vinculo.obra_id ||
                        vinculo.obra?.id
                    ) ===
                        texto(
                            obraSelecionada.id
                        ) &&
                    vinculoTipo(
                        vinculo
                    ) !==
                        TIPOS_VINCULO_EMPRESA_OBRA
                            .CONTRATANTE
            )
            : [];


    const salvarVinculo =
        async (
            evento
        ) => {
            evento.preventDefault();

            if (
                !obraSelecionadaId ||
                !empresaSelecionadaId
            ) {
                setMensagem(
                    "Selecione obra e empresa executora."
                );

                return;
            }

            const existente =
                vinculos.find(
                    (vinculo) =>
                        texto(
                            vinculo.obraId ||
                            vinculo.obra_id
                        ) ===
                            texto(
                                obraSelecionadaId
                            ) &&
                        texto(
                            vinculo.empresaId ||
                            vinculo.empresa_id
                        ) ===
                            texto(
                                empresaSelecionadaId
                            )
                );

            setSalvandoVinculo(true);

            try {
                if (
                    existente?.id
                ) {
                    await atualizarVinculoEmpresaObra({
                        id:
                            existente.id,
                        status:
                            statusVinculo,
                        tipoVinculo:
                            TIPOS_VINCULO_EMPRESA_OBRA
                                .EXECUTORA,
                    });
                }
                else {
                    await vincularEmpresaObra(
                        empresaSelecionadaId,
                        obraSelecionadaId,
                        {
                            status:
                                statusVinculo,
                            tipoVinculo:
                                TIPOS_VINCULO_EMPRESA_OBRA
                                    .EXECUTORA,
                        }
                    );
                }

                await carregar();

                setMensagem(
                    "Vínculo empresa/obra salvo com sucesso."
                );
            }
            catch (erro) {
                setMensagem(
                    "Não foi possível salvar o vínculo. "
                    + (
                        erro?.message ||
                        "Erro não identificado."
                    )
                );
            }
            finally {
                setSalvandoVinculo(false);
            }
        };


    const alternarVinculo =
        async (
            vinculo
        ) => {
            const proximo =
                vinculo.status === "Inativa"
                    ? "Ativa"
                    : "Inativa";

            setSalvandoVinculo(true);

            try {
                await atualizarVinculoEmpresaObra({
                    id:
                        vinculo.id,
                    status:
                        proximo,
                    tipoVinculo:
                        TIPOS_VINCULO_EMPRESA_OBRA
                            .EXECUTORA,
                });

                await carregar();

                setMensagem(
                    `Vínculo marcado como ${proximo}.`
                );
            }
            catch (erro) {
                setMensagem(
                    "Não foi possível alterar o vínculo. "
                    + (
                        erro?.message ||
                        "Erro não identificado."
                    )
                );
            }
            finally {
                setSalvandoVinculo(false);
            }
        };


    const removerVinculo =
        async (
            vinculo
        ) => {
            const confirmou =
                window.confirm(
                    "Remover este vínculo empresa/obra?"
                );

            if (!confirmou) {
                return;
            }

            setSalvandoVinculo(true);

            try {
                await excluirVinculoEmpresaObra(
                    vinculo.id
                );

                await carregar();

                setMensagem(
                    "Vínculo removido."
                );
            }
            catch (erro) {
                setMensagem(
                    "Não foi possível remover o vínculo. "
                    + (
                        erro?.message ||
                        "Erro não identificado."
                    )
                );
            }
            finally {
                setSalvandoVinculo(false);
            }
        };


    if (
        !tenantAdminAutorizado
    ) {
        return (
            <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex gap-3">
                    <ShieldCheck className="h-6 w-6 text-amber-700" />

                    <div>
                        <h1 className="text-xl font-black text-slate-950">
                            Cadastro de Obras
                        </h1>

                        <p className="mt-2 text-sm text-slate-600">
                            Disponível somente para o administrador do tenant.
                        </p>
                    </div>
                </div>
            </section>
        );
    }


    return (
        <div className="space-y-5 pb-8">
            <section
                className="
                    relative
                    isolate
                    mb-5
                    min-h-[230px]
                    overflow-hidden
                    rounded-[22px]
                    border
                    border-slate-300/25
                    bg-slate-950
                    shadow-[0_18px_38px_rgba(15,23,42,0.12)]
                    lg:h-[clamp(154px,9.8vw,178px)]
                    lg:min-h-[clamp(154px,9.8vw,178px)]
                    lg:max-h-[clamp(154px,9.8vw,178px)]
                    lg:rounded-[clamp(20px,1.5vw,25px)]
                "
            >
                <div
                    className="
                        absolute
                        inset-0
                        -z-20
                        bg-cover
                        bg-center
                        bg-no-repeat
                        opacity-90
                    "
                    style={{
                        backgroundImage:
                            `url(${dashboardHeroBackground})`,
                        backgroundPosition:
                            "center 50%",
                    }}
                />

                <div
                    className="
                        absolute
                        inset-0
                        -z-10
                        bg-[linear-gradient(90deg,rgba(2,6,23,0.88)_0%,rgba(15,23,42,0.67)_43%,rgba(15,23,42,0.22)_100%)]
                    "
                />

                <div
                    className="
                        relative
                        z-10
                        h-full
                        px-6
                        pt-5
                        pb-[92px]
                        text-white
                        lg:px-[clamp(22px,1.55vw,32px)]
                        lg:pt-[clamp(15px,1vw,22px)]
                        lg:pb-[clamp(52px,3.8vw,66px)]
                    "
                >
                    <div
                        className="
                            min-w-0
                            max-w-[52rem]
                            [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]
                        "
                    >
                        <p
                            className="
                                m-0
                                text-[0.68rem]
                                font-black
                                uppercase
                                leading-none
                                tracking-[0.22em]
                                text-emerald-300
                                lg:text-[clamp(0.68rem,0.70vw,0.84rem)]
                            "
                        >
                            SAFESCAN BRASIL
                        </p>

                        <h1
                            className="
                                mt-2
                                text-[1.5rem]
                                font-black
                                leading-[1.05]
                                tracking-[-0.035em]
                                text-white
                                lg:text-[clamp(1.24rem,1.35vw,1.72rem)]
                            "
                        >
                            Cadastro de Obras
                        </h1>

                        <p
                            className="
                                mt-2
                                max-w-[48rem]
                                text-sm
                                font-bold
                                leading-[1.3]
                                text-slate-100
                                lg:text-[clamp(0.86rem,0.9vw,1.06rem)]
                                lg:leading-[1.14]
                            "
                        >
                            Cadastro operacional das obras do tenant e gestão dos vínculos com empresas.
                        </p>

                        <div
                            className="
                                mt-[clamp(8px,0.55vw,11px)]
                                h-[clamp(3px,0.2vw,4px)]
                                w-[clamp(46px,3vw,64px)]
                                rounded-full
                                bg-[#1e7c3a]
                                shadow-[0_0_12px_rgba(16,185,129,0.32),0_0_24px_rgba(16,185,129,0.14)]
                            "
                        />
                    </div>
                </div>

                <div
                    className="
                        absolute
                        right-0
                        bottom-0
                        left-0
                        z-20
                        flex
                        min-h-[76px]
                        flex-col
                        justify-center
                        gap-2
                        border-t
                        border-white/20
                        bg-[linear-gradient(90deg,rgba(8,13,24,0.92)_0%,rgba(17,24,39,0.84)_52%,rgba(56,34,18,0.82)_100%)]
                        px-4
                        py-2
                        shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_-8px_20px_rgba(0,0,0,0.08)]
                        backdrop-blur-xl
                        sm:flex-row
                        sm:items-center
                        sm:justify-between
                        lg:h-[clamp(42px,3vw,52px)]
                        lg:min-h-[clamp(42px,3vw,52px)]
                        lg:flex-row
                        lg:px-[clamp(12px,0.9vw,18px)]
                        lg:py-0
                    "
                >
                    <div
                        className="
                            flex
                            min-w-0
                            flex-wrap
                            items-center
                            gap-[clamp(6px,0.42vw,9px)]
                        "
                    >
                        <span
                            className="
                                inline-flex
                                h-[clamp(31px,2vw,36px)]
                                items-center
                                gap-2
                                rounded-full
                                border
                                border-emerald-300/40
                                bg-[linear-gradient(135deg,rgba(17,66,40,0.94)_0%,rgba(26,111,61,0.74)_100%)]
                                px-[clamp(12px,0.9vw,16px)]
                                text-[clamp(0.66rem,0.62vw,0.78rem)]
                                font-black
                                whitespace-nowrap
                                text-white
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_14px_rgba(0,0,0,0.18)]
                            "
                        >
                            <Building2 className="h-4 w-4 text-emerald-300" />
                            Plano Base SafeScan
                        </span>

                        <span
                            className="
                                inline-flex
                                h-[clamp(31px,2vw,36px)]
                                items-center
                                gap-2
                                rounded-full
                                border
                                border-cyan-300/40
                                bg-[linear-gradient(135deg,rgba(10,37,64,0.94)_0%,rgba(8,80,120,0.74)_100%)]
                                px-[clamp(12px,0.9vw,16px)]
                                text-[clamp(0.66rem,0.62vw,0.78rem)]
                                font-black
                                whitespace-nowrap
                                text-white
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_14px_rgba(0,0,0,0.18)]
                            "
                        >
                            <Link2 className="h-4 w-4 text-cyan-300" />
                            Gestão de vínculos
                        </span>
                    </div>

                    <div
                        className="
                            flex
                            shrink-0
                            items-center
                            justify-end
                            gap-[clamp(6px,0.42vw,9px)]
                        "
                    >
                        <button
                            type="button"
                            onClick={
                                carregar
                            }
                            disabled={
                                carregando
                            }
                            className="
                                inline-flex
                                h-[clamp(31px,2vw,36px)]
                                items-center
                                justify-center
                                gap-2
                                rounded-full
                                border
                                border-white/30
                                bg-white/10
                                px-[clamp(12px,0.9vw,16px)]
                                text-[clamp(0.66rem,0.62vw,0.78rem)]
                                font-black
                                whitespace-nowrap
                                text-white
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_6px_14px_rgba(0,0,0,0.18)]
                                backdrop-blur-md
                                transition
                                hover:bg-white/20
                                disabled:cursor-not-allowed
                                disabled:opacity-60
                            "
                        >
                            <RefreshCw
                                className={
                                    carregando
                                        ? "h-4 w-4 animate-spin"
                                        : "h-4 w-4"
                                }
                            />

                            Atualizar
                        </button>

                        <button
                            type="button"
                            onClick={
                                novaObra
                            }
                            className="
                                inline-flex
                                h-[clamp(31px,2vw,36px)]
                                items-center
                                justify-center
                                gap-2
                                rounded-full
                                border
                                border-emerald-300/45
                                bg-[linear-gradient(135deg,rgba(17,66,40,0.96)_0%,rgba(22,163,74,0.80)_100%)]
                                px-[clamp(12px,0.9vw,16px)]
                                text-[clamp(0.66rem,0.62vw,0.78rem)]
                                font-black
                                whitespace-nowrap
                                text-white
                                shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_6px_14px_rgba(0,0,0,0.18)]
                                transition
                                hover:border-emerald-200/60
                                hover:brightness-110
                            "
                        >
                            <Plus className="h-4 w-4" />
                            Nova obra
                        </button>
                    </div>
                </div>
            </section>

            <div className="grid gap-4 md:grid-cols-3">
                <Indicador
                    titulo="Obras cadastradas"
                    valor={
                        obras.length
                    }
                    detalhe="Registros do tenant"
                    Icone={Building2}
                />

                <Indicador
                    titulo="Obras ativas"
                    valor={
                        obrasAtivas.length
                    }
                    detalhe="Disponíveis para operação"
                    Icone={MapPin}
                />

                <Indicador
                    titulo="Vínculos ativos"
                    valor={
                        resumoVinculosAtivos.total
                    }
                    detalhe={
                        detalheVinculosAtivos
                    }
                    Icone={Users}
                />
            </div>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-lg font-black text-slate-950">
                            Gestão das obras
                        </h2>

                        <p className="mt-1 text-xs text-slate-500">
                            {mensagem}
                        </p>
                    </div>


                </div>

                {formularioAberto ? (
                    <form
                        onSubmit={
                            salvar
                        }
                        className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                            <label className="xl:col-span-2">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Nome da obra
                                </span>

                                <input
                                    value={
                                        form.nome
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "nome",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Nº da obra
                                </span>

                                <input
                                    value={
                                        form.numeroObra
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "numeroObra",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Status
                                </span>

                                <select
                                    value={
                                        form.status
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "status",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                >
                                    <option value="Ativa">
                                        Ativa
                                    </option>

                                    <option value="Inativa">
                                        Inativa
                                    </option>
                                </select>
                            </label>

                            <label className="xl:col-span-2">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Identificação da obra
                                </span>

                                <input
                                    value={
                                        form.identificacaoObra
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "identificacaoObra",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label className="xl:col-span-2">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Empresa contratante
                                </span>

                                <select
                                    value={
                                        form.contratanteEmpresaId
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "contratanteEmpresaId",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                >
                                    <option value="">
                                        Selecione
                                    </option>

                                    {contratantes.map(
                                        (empresa) => (
                                            <option
                                                key={
                                                    empresaId(
                                                        empresa
                                                    )
                                                }
                                                value={
                                                    empresaId(
                                                        empresa
                                                    )
                                                }
                                            >
                                                {
                                                    empresaNome(
                                                        empresa
                                                    )
                                                }
                                            </option>
                                        )
                                    )}
                                </select>
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    CEP
                                </span>

                                <input
                                    inputMode="numeric"
                                    autoComplete="postal-code"
                                    maxLength={8}
                                    value={
                                        form.cep
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCep(
                                                e.target.value
                                            )
                                    }
                                    onBlur={
                                        validarCepAoSair
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />

                                {(
                                    cepConsulta.estado === "loading" ||
                                    cepConsulta.mensagem
                                ) ? (
                                    <p
                                        aria-live="polite"
                                        className={
                                            `mt-1.5 text-[11px] font-semibold ${
                                                cepConsulta.estado === "error"
                                                    ? "text-red-600"
                                                    : cepConsulta.estado === "success"
                                                        ? "text-emerald-700"
                                                        : "text-slate-500"
                                            }`
                                        }
                                    >
                                        {
                                            cepConsulta.mensagem
                                        }
                                    </p>
                                ) : null}
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    UF
                                </span>

                                <input
                                    maxLength={2}
                                    value={
                                        form.uf
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "uf",
                                                e.target.value
                                                    .toUpperCase()
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Cidade
                                </span>

                                <input
                                    value={
                                        form.cidade
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "cidade",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Nº endereço
                                </span>

                                <input
                                    value={
                                        form.numeroEndereco
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "numeroEndereco",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label className="md:col-span-2 xl:col-span-4">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Endereço
                                </span>

                                <input
                                    value={
                                        form.endereco
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "endereco",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Fiscal da contratante
                                </span>

                                <input
                                    value={
                                        form.fiscalContratante
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "fiscalContratante",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label>
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Técnico de Segurança
                                </span>

                                <input
                                    value={
                                        form.tecnicoSegurancaContratante
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "tecnicoSegurancaContratante",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label className="md:col-span-2">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Líder / Encarregado
                                </span>

                                <input
                                    value={
                                        form.liderEncarregado
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "liderEncarregado",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>

                            <label className="md:col-span-2 xl:col-span-4">
                                <span className="mb-1 block text-[10px] font-black uppercase text-slate-500">
                                    Observações
                                </span>

                                <textarea
                                    rows={3}
                                    value={
                                        form.observacoes
                                    }
                                    onChange={
                                        (e) =>
                                            alterarCampo(
                                                "observacoes",
                                                e.target.value
                                            )
                                    }
                                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                                />
                            </label>
                        </div>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={
                                    cancelar
                                }
                                disabled={
                                    salvando
                                }
                                className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
                            >
                                Cancelar
                            </button>

                            <button
                                type="submit"
                                disabled={
                                    salvando
                                }
                                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60"
                            >
                                {
                                    salvando
                                        ? "Salvando..."
                                        : editandoId
                                            ? "Salvar alterações"
                                            : "Cadastrar obra"
                                }
                            </button>
                        </div>
                    </form>
                ) : null}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-black text-slate-950">
                    Obras cadastradas
                </h2>

                <div className="mt-4 space-y-3">
                    {obras.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                            Nenhuma obra cadastrada.
                        </div>
                    ) : obras.map(
                        (obra) => {
                            const contratante =
                                contratanteDaObra(
                                    vinculos,
                                    obra.id
                                );

                            return (
                                <article
                                    key={
                                        obra.id
                                    }
                                    className="rounded-2xl border border-slate-200 p-4"
                                >
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="font-black text-slate-950">
                                                    {obra.nome}
                                                </h3>

                                                <span className={
                                                    obra.status === "Inativa"
                                                        ? "rounded-full bg-slate-100 px-2 py-1 text-[9px] font-black uppercase text-slate-600"
                                                        : "rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-black uppercase text-emerald-700"
                                                }>
                                                    {obra.status}
                                                </span>
                                            </div>

                                            <p className="mt-2 text-xs text-slate-500">
                                                Contratante: {
                                                    contratante
                                                        ? empresaNome(
                                                            contratante.empresa ||
                                                            {}
                                                        )
                                                        : "não informada"
                                                }
                                            </p>

                                            <p className="mt-1 text-xs text-slate-500">
                                                {
                                                    [
                                                        obra.cidade,
                                                        obra.uf,
                                                        obra.endereco,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" • ")
                                                    || "Local não informado"
                                                }
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={
                                                    () =>
                                                        setObraVinculoId(
                                                            obra.id
                                                        )
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                                            >
                                                <Link2 className="h-4 w-4" />
                                                Empresas
                                            </button>

                                            <button
                                                type="button"
                                                onClick={
                                                    () =>
                                                        editarObra(
                                                            obra
                                                        )
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                                            >
                                                <Pencil className="h-4 w-4" />
                                                Editar
                                            </button>

                                            <button
                                                type="button"
                                                onClick={
                                                    () =>
                                                        excluir(
                                                            obra
                                                        )
                                                }
                                                disabled={
                                                    excluindoId ===
                                                    obra.id
                                                }
                                                className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700 disabled:opacity-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        }
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div>
                    <h2 className="text-lg font-black text-slate-950">
                        Empresas da obra
                    </h2>

                    <p className="mt-1 text-xs text-slate-500">
                        Gerencie as empresas executoras vinculadas à obra.
                    </p>
                </div>

                <form
                    onSubmit={
                        salvarVinculo
                    }
                    className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 md:grid-cols-4"
                >
                    <select
                        value={
                            obraSelecionadaId
                        }
                        onChange={
                            (e) =>
                                setObraVinculoId(
                                    e.target.value
                                )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                        {obras.map(
                            (obra) => (
                                <option
                                    key={
                                        obra.id
                                    }
                                    value={
                                        obra.id
                                    }
                                >
                                    {obra.nome}
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            empresaSelecionadaId
                        }
                        onChange={
                            (e) =>
                                setEmpresaVinculoId(
                                    e.target.value
                                )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                        {executoras.length === 0 ? (
                            <option value="">
                                Nenhuma executora
                            </option>
                        ) : executoras.map(
                            (empresa) => (
                                <option
                                    key={
                                        empresaId(
                                            empresa
                                        )
                                    }
                                    value={
                                        empresaId(
                                            empresa
                                        )
                                    }
                                >
                                    {
                                        empresaNome(
                                            empresa
                                        )
                                    }
                                </option>
                            )
                        )}
                    </select>

                    <select
                        value={
                            statusVinculo
                        }
                        onChange={
                            (e) =>
                                setStatusVinculo(
                                    e.target.value
                                )
                        }
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                        <option value="Ativa">
                            Ativa
                        </option>

                        <option value="Inativa">
                            Inativa
                        </option>
                    </select>

                    <button
                        type="submit"
                        disabled={
                            salvandoVinculo ||
                            !obraSelecionadaId ||
                            !empresaSelecionadaId
                        }
                        className="rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-black text-white disabled:opacity-50"
                    >
                        Salvar vínculo
                    </button>
                </form>

                <div className="mt-4 space-y-2">
                    {obraSelecionada ? (
                        executorasVinculadas.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                                Nenhuma executora vinculada.
                            </div>
                        ) : executorasVinculadas.map(
                            (vinculo) => (
                                <div
                                    key={
                                        vinculo.id
                                    }
                                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div>
                                        <p className="text-sm font-black text-slate-900">
                                            {
                                                empresaNome(
                                                    vinculo.empresa ||
                                                    {}
                                                )
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            Status: {vinculo.status}
                                        </p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    alternarVinculo(
                                                        vinculo
                                                    )
                                            }
                                            disabled={
                                                salvandoVinculo
                                            }
                                            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                                        >
                                            {
                                                vinculo.status === "Inativa"
                                                    ? "Ativar"
                                                    : "Inativar"
                                            }
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                () =>
                                                    removerVinculo(
                                                        vinculo
                                                    )
                                            }
                                            disabled={
                                                salvandoVinculo
                                            }
                                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700"
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            )
                        )
                    ) : (
                        <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                            Nenhuma obra selecionada.
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}