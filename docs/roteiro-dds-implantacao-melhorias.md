# Roteiro DDS / Implantação — Próximas melhorias

## Status atual seguro

- Conferência Assistida DDS salva/restaurada.
- Resultado Final usa Conferência Assistida como base oficial.
- Fechamento oficial salvo, travado e reabrível.
- Recibo Final DDS criado.
- Recibo Final pode ser impresso em PDF isolado.
- Emissão do recibo registrada no JSON do DDS.
- Loader visual de análise do documento aplicado.
- Build, GitHub e Vercel alinhados no último fechamento.

## Pacote 01 — Consulta pública + ações + histórico

### 1. Consulta Pública DDS

Melhorar a tela pública aberta pelo QR de conferência para exibir:

- Status oficial da conferência.
- Código DDS.
- Empresa.
- Obra / setor.
- Período.
- Participantes.
- Presenças.
- Ausências.
- Homem-dia.
- Data/hora da conclusão oficial.
- Data/hora da emissão do recibo, quando existir.
- Aviso de que a assinatura manual permanece no documento físico arquivado.

### 2. Bloco Recibo da Conferência DDS

Adicionar ações rápidas:

- Imprimir recibo.
- Abrir consulta pública.
- Copiar código DDS.
- Exibir emissão do recibo de forma discreta e organizada.

### 3. Histórico do DDS

Criar bloco interno com linha do tempo:

- DDS gerado.
- Arquivo anexado/analisado.
- Conferência Assistida salva.
- Conferência concluída oficialmente.
- Recibo emitido.

## Pacote 02 — Controle mensal de mão de obra

Criar funcionalidade futura para gerar/exportar controle mensal de mão de obra da implantação/obra.

Modelo base:

- Funções nas linhas.
- Dias 01 a 31 nas colunas.
- Quantitativo diário por função.
- Total diário.
- Total por função.
- Média por função.
- Média mensal.
- Total homem-dia.
- Dias com lançamento.

Arquivo modelo usado como referência:

- modelo_mao_de_obra_mensal.xlsx

Observação:

Essa frente deve ser implantada depois do Pacote 01, porque envolve regra de geração/exportação de planilha e possível vínculo com obra/implantação.
