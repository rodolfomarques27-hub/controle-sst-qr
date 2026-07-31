# Avaliação mensal dos DDS — contrato técnico

## Diagnóstico

Os registros são listados por `listarRegistrosDds`, com filtro por empresa, obra e sobreposição entre `periodo_inicio`/`periodo_fim`. A fonte consolidável é `dados.conferenciaAssistida`, que contém `participantes`, `diasAtivos`, `frequencia`, `temasDias` e `fechamento`. O histórico mensal existente de mão de obra contabiliza presenças, mas não valida elegibilidade, duplicidade ou fechamento N×D; por isso não é a fonte oficial deste relatório.

## Entrada e saída

O motor recebe uma lista de registros DDS normalizados e os filtros `{ empresaId, obraId, ano, mes }`. Ele não acessa banco, navegador ou interface. A saída contém resumo, integridade, participante-dia, participantes únicos, comparação cronológica, temas, responsáveis e rastreabilidade.

## Regras vinculantes

- Somente conferências concluídas, com participantes e ao menos um dia ativo dentro do mês, integram os indicadores.
- Registros cancelados, excluídos, duplicados ou incompletos permanecem visíveis em `integridade.excluidos` com motivo.
- DDS entre dois meses é recortado pelas datas de `diasAtivos`.
- Identidade: ID interno, CPF, matrícula eSocial, identificador estruturado e, por último, nome normalizado.
- Cada participante aplicável em cada dia ativo gera exatamente uma possibilidade participante-dia.
- Presença, ausência e pendência são somadas diretamente; percentuais semanais nunca são promediados.
- Os percentuais dependentes somente são emitidos se presença + ausência + pendência = possibilidades.
- Temas preservam data, DDS, responsável, procedência e aviso documental.
- Todo participante-dia preserva DDS, data, identidade, status e chave da frequência.

## Critérios de aceite do motor

Os testes controlados devem cobrir DDS único, múltiplos DDS, recorte entre meses, deduplicação de colaborador, participante complementar, pendência, conferência incompleta, duplicidade e procedências PDF/manual. Interface e exportações só podem consumir o motor após esses testes passarem.
