-- ============================================================
-- SAFESCAN BRASIL
-- MODELOS DE E-MAIL — ACESSOS E USUÁRIOS
--
-- NOVO TIPO:
--
--   acesso_usuario_criado
--
-- OBJETIVO:
--
-- - preservar os cinco modelos SST existentes;
-- - adicionar modelo "Acesso criado";
-- - manter {{itens}} obrigatória somente nos alertas SST;
-- - validar variáveis conforme o tipo do modelo;
-- - permitir edição/restauração pela estrutura administrativa
--   já existente;
-- - não criar histórico nesta migration;
-- - não enviar e-mail;
-- - não persistir senha temporária.
--
-- IMPORTANTE:
--
-- Esta migration apenas prepara o domínio e a persistência
-- do modelo.
--
-- O fluxo real de envio será implementado posteriormente.
-- ============================================================

begin;

-- ============================================================
-- 1. AMPLIAR TIPOS PERMITIDOS
-- ============================================================

alter table public.modelos_email_sst
drop constraint if exists
    modelos_email_sst_tipo_check;

alter table public.modelos_email_sst
add constraint modelos_email_sst_tipo_check
check (
    tipo in (
        'alerta_documento_colaborador',
        'alerta_documento_empresa',
        'alerta_documentos_lote',
        'alerta_treinamentos',
        'alerta_auditoria',
        'acesso_usuario_criado'
    )
);

-- ============================================================
-- 2. CORPO PADRÃO
--
-- {{itens}} continua obrigatória para os cinco modelos
-- históricos de alerta.
--
-- O modelo acesso_usuario_criado possui contrato próprio.
-- ============================================================

alter table public.modelos_email_sst
drop constraint if exists
    modelos_email_sst_corpo_padrao_check;

alter table public.modelos_email_sst
add constraint modelos_email_sst_corpo_padrao_check
check (
    char_length(
        btrim(corpo_padrao)
    )
    between 1 and 12000

    and (
        tipo = 'acesso_usuario_criado'
        or corpo_padrao ~*
            '\{\{\s*itens\s*\}\}'
    )
);

-- ============================================================
-- 3. CORPO EDITÁVEL
-- ============================================================

alter table public.modelos_email_sst
drop constraint if exists
    modelos_email_sst_corpo_check;

alter table public.modelos_email_sst
add constraint modelos_email_sst_corpo_check
check (
    char_length(
        btrim(corpo)
    )
    between 1 and 12000

    and (
        tipo = 'acesso_usuario_criado'
        or corpo ~*
            '\{\{\s*itens\s*\}\}'
    )
);

-- ============================================================
-- 4. SEED DO MODELO "ACESSO CRIADO"
-- ============================================================

insert into public.modelos_email_sst (
    tipo,
    nome,
    descricao,
    assunto_padrao,
    corpo_padrao,
    remetente_nome_padrao,
    assunto,
    corpo,
    remetente_nome,
    ativo,
    versao,
    criado_por,
    atualizado_por
)
values (
    'acesso_usuario_criado',

    'Acesso criado',

    'Comunicação inicial com login, perfil, permissões e orientação de primeiro acesso.',

    'Seu acesso ao SafeScan Brasil - {{perfil_nome}}',

    $corpo_padrao$
Olá, {{usuario_nome}}.

Seu acesso ao {{sistema_nome}} foi criado.

DADOS DE ACESSO

Login:
{{usuario_email}}

Senha temporária:
{{senha_temporaria}}

Perfil:
{{perfil_nome}}

Empresa / escopo:
{{empresa_nome}}

O QUE ESTÁ LIBERADO

Módulos:
{{modulos_liberados}}

Ações permitidas:
{{acoes_liberadas}}

RESTRIÇÕES

{{restricoes}}

PRIMEIRO ACESSO

A senha informada neste e-mail é temporária.

Ao acessar o SafeScan pela primeira vez, você deverá cadastrar uma nova senha pessoal.

Por segurança:

- não compartilhe sua senha;
- não encaminhe este e-mail para terceiros;
- utilize somente o endereço oficial do SafeScan Brasil.

Acesse o sistema:

{{url_sistema}}

Data do envio:
{{data_envio}}

Atenciosamente,

{{sistema_nome}}
$corpo_padrao$,

    'SafeScan Brasil - Controle de SST',

    'Seu acesso ao SafeScan Brasil - {{perfil_nome}}',

    $corpo_atual$
Olá, {{usuario_nome}}.

Seu acesso ao {{sistema_nome}} foi criado.

DADOS DE ACESSO

Login:
{{usuario_email}}

Senha temporária:
{{senha_temporaria}}

Perfil:
{{perfil_nome}}

Empresa / escopo:
{{empresa_nome}}

O QUE ESTÁ LIBERADO

Módulos:
{{modulos_liberados}}

Ações permitidas:
{{acoes_liberadas}}

RESTRIÇÕES

{{restricoes}}

PRIMEIRO ACESSO

A senha informada neste e-mail é temporária.

Ao acessar o SafeScan pela primeira vez, você deverá cadastrar uma nova senha pessoal.

Por segurança:

- não compartilhe sua senha;
- não encaminhe este e-mail para terceiros;
- utilize somente o endereço oficial do SafeScan Brasil.

Acesse o sistema:

{{url_sistema}}

Data do envio:
{{data_envio}}

Atenciosamente,

{{sistema_nome}}
$corpo_atual$,

    'SafeScan Brasil - Controle de SST',

    true,

    1,

    null,

    null
)
on conflict (tipo)
do nothing;

-- ============================================================
-- 5. NOVO VALIDADOR CONTEXTUAL
--
-- A função antiga de 3 parâmetros permanece temporariamente
-- disponível para compatibilidade.
--
-- A nova função recebe também o tipo.
-- ============================================================

create or replace function public.validar_modelo_email_sst(
    p_tipo text,
    p_assunto text,
    p_corpo text,
    p_remetente_nome text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_tipo text :=
        lower(
            btrim(
                coalesce(
                    p_tipo,
                    ''
                )
            )
        );

    v_variavel text;
    v_obrigatoria text;

    v_variaveis_alerta constant text[] :=
        array[
            'saudacao',
            'tst_responsavel',
            'empresa_nome',
            'total_vencidos',
            'total_a_vencer',
            'quantidade_itens',
            'resumo',
            'itens',
            'sistema_nome',
            'url_sistema',
            'data_envio'
        ];

    v_variaveis_acesso constant text[] :=
        array[
            'usuario_nome',
            'usuario_email',
            'perfil_nome',
            'empresa_nome',
            'modulos_liberados',
            'acoes_liberadas',
            'restricoes',
            'senha_temporaria',
            'sistema_nome',
            'url_sistema',
            'data_envio'
        ];

    v_obrigatorias_acesso constant text[] :=
        array[
            'usuario_nome',
            'usuario_email',
            'perfil_nome',
            'empresa_nome',
            'modulos_liberados',
            'acoes_liberadas',
            'senha_temporaria',
            'url_sistema'
        ];

begin

    -- ========================================================
    -- TIPO
    -- ========================================================

    if v_tipo not in (
        'alerta_documento_colaborador',
        'alerta_documento_empresa',
        'alerta_documentos_lote',
        'alerta_treinamentos',
        'alerta_auditoria',
        'acesso_usuario_criado'
    ) then

        raise exception
            'Tipo de modelo de e-mail inválido: %.',
            v_tipo
            using errcode = '22023';

    end if;

    -- ========================================================
    -- ASSUNTO
    -- ========================================================

    if p_assunto is null
       or char_length(
            btrim(
                p_assunto
            )
       ) = 0
       or char_length(
            btrim(
                p_assunto
            )
       ) > 220 then

        raise exception
            'O assunto deve possuir entre 1 e 220 caracteres.'
            using errcode = '22023';

    end if;

    if position(
        E'\n'
        in p_assunto
    ) > 0
       or position(
            E'\r'
            in p_assunto
       ) > 0 then

        raise exception
            'O assunto não pode conter quebra de linha.'
            using errcode = '22023';

    end if;

    -- ========================================================
    -- CORPO
    -- ========================================================

    if p_corpo is null
       or char_length(
            btrim(
                p_corpo
            )
       ) = 0
       or char_length(
            btrim(
                p_corpo
            )
       ) > 12000 then

        raise exception
            'O corpo deve possuir entre 1 e 12.000 caracteres.'
            using errcode = '22023';

    end if;

    if (
        v_tipo <>
        'acesso_usuario_criado'
    )
    and (
        p_corpo !~*
        '\{\{\s*itens\s*\}\}'
    ) then

        raise exception
            'O corpo do modelo deve conter a variável {{itens}}.'
            using errcode = '22023';

    end if;

    -- ========================================================
    -- REMETENTE
    -- ========================================================

    if p_remetente_nome is null
       or char_length(
            btrim(
                p_remetente_nome
            )
       ) = 0
       or char_length(
            btrim(
                p_remetente_nome
            )
       ) > 120 then

        raise exception
            'O nome do remetente deve possuir entre 1 e 120 caracteres.'
            using errcode = '22023';

    end if;

    if position(
        E'\n'
        in p_remetente_nome
    ) > 0
       or position(
            E'\r'
            in p_remetente_nome
       ) > 0 then

        raise exception
            'O nome do remetente não pode conter quebra de linha.'
            using errcode = '22023';

    end if;

    -- ========================================================
    -- VARIÁVEIS PERMITIDAS
    -- ========================================================

    for v_variavel in

        select
            lower(
                correspondencia[1]
            )

        from regexp_matches(
            coalesce(
                p_assunto,
                ''
            )
                || E'\n'
                || coalesce(
                    p_corpo,
                    ''
                ),

            '\{\{\s*([a-z0-9_]+)\s*\}\}',

            'gi'
        ) as resultado(
            correspondencia
        )

    loop

        if (
            v_tipo =
            'acesso_usuario_criado'
        ) then

            if not (
                v_variavel =
                any(
                    v_variaveis_acesso
                )
            ) then

                raise exception
                    'Variável não permitida no modelo de acesso: {{%}}.',
                    v_variavel
                    using errcode = '22023';

            end if;

        else

            if not (
                v_variavel =
                any(
                    v_variaveis_alerta
                )
            ) then

                raise exception
                    'Variável não permitida no modelo SST: {{%}}.',
                    v_variavel
                    using errcode = '22023';

            end if;

        end if;

    end loop;

    -- ========================================================
    -- VARIÁVEIS OBRIGATÓRIAS DO ACESSO
    -- ========================================================

    if (
        v_tipo =
        'acesso_usuario_criado'
    ) then

        foreach v_obrigatoria
        in array
            v_obrigatorias_acesso

        loop

            if (
                coalesce(
                    p_assunto,
                    ''
                )
                    || E'\n'
                    || coalesce(
                        p_corpo,
                        ''
                    )
            ) !~* (
                '\{\{\s*'
                || v_obrigatoria
                || '\s*\}\}'
            ) then

                raise exception
                    'Variável obrigatória ausente no modelo: {{%}}.',
                    v_obrigatoria
                    using errcode = '22023';

            end if;

        end loop;

    end if;

end;
$function$;

revoke all
on function public.validar_modelo_email_sst(
    text,
    text,
    text,
    text
)
from public, anon, authenticated;

comment on function public.validar_modelo_email_sst(
    text,
    text,
    text,
    text
)
is
'Valida modelos de e-mail de forma contextual por tipo, incluindo comunicação de acesso de usuários.';

-- ============================================================
-- 6. LISTAGEM ADMINISTRATIVA
-- ============================================================

create or replace function public.admin_listar_modelos_email_sst()
returns table (
    tipo text,
    nome text,
    descricao text,
    assunto text,
    corpo text,
    remetente_nome text,
    ativo boolean,
    versao integer,
    atualizado_em timestamptz,
    atualizado_por uuid,
    assunto_padrao text,
    corpo_padrao text,
    remetente_nome_padrao text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
begin

    if not public.usuario_pode_gerenciar_modelos_email_sst() then

        raise exception
            'Sem permissão para administrar modelos de e-mail SST.'
            using errcode = '42501';

    end if;

    return query

    select
        modelo.tipo,
        modelo.nome,
        modelo.descricao,
        modelo.assunto,
        modelo.corpo,
        modelo.remetente_nome,
        modelo.ativo,
        modelo.versao,
        modelo.atualizado_em,
        modelo.atualizado_por,
        modelo.assunto_padrao,
        modelo.corpo_padrao,
        modelo.remetente_nome_padrao

    from public.modelos_email_sst modelo

    order by
        case modelo.tipo
            when 'alerta_documento_colaborador'
                then 1

            when 'alerta_documento_empresa'
                then 2

            when 'alerta_documentos_lote'
                then 3

            when 'alerta_treinamentos'
                then 4

            when 'alerta_auditoria'
                then 5

            when 'acesso_usuario_criado'
                then 6

            else 99
        end,

        modelo.tipo;

end;
$function$;

revoke all
on function public.admin_listar_modelos_email_sst()
from public, anon, authenticated;

grant execute
on function public.admin_listar_modelos_email_sst()
to authenticated, service_role;

comment on function public.admin_listar_modelos_email_sst()
is
'Lista modelos privados de comunicação disponíveis para administração no SafeScan.';

-- ============================================================
-- 7. SALVAMENTO ADMINISTRATIVO
--
-- Passa a utilizar o novo validador contextual.
-- ============================================================

create or replace function public.admin_salvar_modelo_email_sst(
    p_tipo text,
    p_assunto text,
    p_corpo text,
    p_remetente_nome text,
    p_ativo boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
    v_tipo text :=
        lower(
            btrim(
                coalesce(
                    p_tipo,
                    ''
                )
            )
        );

    v_modelo
        public.modelos_email_sst%rowtype;

begin

    if not public.usuario_pode_gerenciar_modelos_email_sst() then

        raise exception
            'Sem permissão para alterar modelos de e-mail SST.'
            using errcode = '42501';

    end if;

    perform public.validar_modelo_email_sst(
        v_tipo,
        p_assunto,
        p_corpo,
        p_remetente_nome
    );

    update public.modelos_email_sst

    set
        assunto =
            btrim(
                p_assunto
            ),

        corpo =
            btrim(
                p_corpo
            ),

        remetente_nome =
            btrim(
                p_remetente_nome
            ),

        ativo =
            coalesce(
                p_ativo,
                true
            ),

        versao =
            versao + 1,

        atualizado_por =
            auth.uid()

    where tipo =
        v_tipo

    returning *
    into v_modelo;

    if not found then

        raise exception
            'Tipo de modelo de e-mail inválido: %.',
            v_tipo
            using errcode = '22023';

    end if;

    return jsonb_build_object(
        'tipo',
        v_modelo.tipo,

        'nome',
        v_modelo.nome,

        'assunto',
        v_modelo.assunto,

        'corpo',
        v_modelo.corpo,

        'remetenteNome',
        v_modelo.remetente_nome,

        'ativo',
        v_modelo.ativo,

        'versao',
        v_modelo.versao,

        'atualizadoEm',
        v_modelo.atualizado_em,

        'atualizadoPor',
        v_modelo.atualizado_por
    );

end;
$function$;

revoke all
on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
from public, anon, authenticated;

grant execute
on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
to authenticated, service_role;

comment on function public.admin_salvar_modelo_email_sst(
    text,
    text,
    text,
    text,
    boolean
)
is
'Salva modelos privados de comunicação após validar tipo, variáveis e permissão administrativa.';

-- ============================================================
-- 8. COMENTÁRIO DA TABELA
-- ============================================================

comment on table public.modelos_email_sst
is
'Modelos privados de comunicação do SafeScan, incluindo alertas SST e comunicações de acesso de usuários.';

commit;
