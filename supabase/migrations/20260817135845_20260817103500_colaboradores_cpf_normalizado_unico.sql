-- SafeScan Brasil
-- Integridade global de CPF de colaboradores.
--
-- Impede dois registros de colaborador com o mesmo CPF,
-- independentemente de máscara, empresa, tela ou computador.
--
-- CPFs nulos ou vazios continuam permitidos.
--
-- A migration aborta se encontrar duplicidade já existente.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM public.colaboradores
        WHERE NULLIF(
            regexp_replace(cpf, '[^0-9]', '', 'g'),
            ''
        ) IS NOT NULL
        GROUP BY NULLIF(
            regexp_replace(cpf, '[^0-9]', '', 'g'),
            ''
        )
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION
            'Existem CPFs normalizados duplicados em public.colaboradores. Saneie os dados antes de criar a trava UNIQUE.';
    END IF;
END
$$;

CREATE UNIQUE INDEX colaboradores_cpf_normalizado_uidx
ON public.colaboradores (
    (
        NULLIF(
            regexp_replace(cpf, '[^0-9]', '', 'g'),
            ''
        )
    )
)
WHERE NULLIF(
    regexp_replace(cpf, '[^0-9]', '', 'g'),
    ''
) IS NOT NULL;

COMMENT ON INDEX public.colaboradores_cpf_normalizado_uidx IS
'Impede múltiplos colaboradores com o mesmo CPF após remover máscara e caracteres não numéricos.';
