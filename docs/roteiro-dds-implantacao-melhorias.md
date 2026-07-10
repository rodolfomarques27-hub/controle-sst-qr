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

Funcionalidade MVP implantada no DDS para gerar/exportar controle mensal de mão de obra da implantação/obra.

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

Critério técnico do MVP:

- A geração usa a Conferência Assistida DDS.
- P contabiliza presença.
- X e ? não entram como presença.
- O arquivo é gerado em formato Excel compatível .xls via HTML, sem dependência nova.
- A versão futura pode consolidar múltiplos DDS do mês por obra/implantação.

## Ajuste do Pacote 02 — Layout e PDF

Melhorias adicionadas ao controle mensal de mão de obra:

- Exportação Excel compatível .xls com layout profissional.
- Consolidação por empresa e função.
- Preparado para DDS com várias empresas.
- Datas apresentadas em DD/MM/AAAA.
- Jornada padrão registrada:
  - Expediente normal: 07:00 às 17:00.
  - Almoço: 12:00 às 13:00.
  - DDS: 07:00 às 07:10.
- Impressão/PDF com hero padrão SafeScan Brasil.

## Ajuste visual do PDF de mão de obra

Refinamentos aplicados:

- Cards superiores do PDF compactados.
- Coluna Empresa / Contratada ampliada.
- Coluna Função separada visualmente da empresa.
- Excel com largura específica para Empresa e Função.
- Layout preparado para múltiplas empresas no mesmo DDS.

## Layout limpo de mão de obra

Refinamento aplicado:

- Empresa / Contratada passou a ser faixa de agrupamento.
- Tabela principal ficou focada em Função x dias do mês.
- Coluna Empresa deixou de repetir em todas as linhas.
- Cores fortes foram removidas.
- Dias passaram a usar fundo claro.
- Linha Total diário ficou compacta.
- PDF e Excel seguem o mesmo conceito visual.

## Refinamento visual final de mão de obra

Ajustes aplicados:

- Empresa aparece acima da tabela do grupo.
- Informação de total homem-dia foi removida da faixa da empresa.
- Função centralizada.
- Coluna Função reduzida.
- Cores profissionais com cabeçalho escuro e área da empresa em verde discreto.
- Excel e PDF foram alinhados no mesmo conceito visual.

## Ajuste final do visual de mão de obra

Refinamentos aplicados:

- "Homem-dia" renomeado na interface para "Total de presenças".
- "Média mês" renomeado para "Média diária".
- Excel ficou mais neutro, com menos cores.
- Título do Excel simplificado para "Controle mensal de mão de obra".
- Empresa mantida como faixa acima do grupo.
- Função centralizada e com largura menor.
- Dias reduzidos para informação numérica pequena.

## Unidades de mão de obra

Padronização aplicada:

- Pessoas-dia: soma das presenças no período. Exemplo: 10 pessoas presentes por 4 dias = 40 pessoas-dia.
- Efetivo médio: média de trabalhadores por dia lançado. Exemplo: 40 pessoas-dia / 4 dias = 10 pessoas/dia.
- Horas não são exibidas nesse card. Caso necessário, podem ser calculadas em indicador próprio de homem-hora.

## Nomenclatura definitiva do controle de mão de obra

Padronização aplicada:

- "Acumulado do período": soma dos lançamentos de presença nos dias apurados.
- "Efetivo médio": média de pessoas presentes por dia apurado.
- Exemplo: 10 pessoas presentes em 4 dias apurados = 40 presenças acumuladas no período.
- O termo "pessoas-dia" foi removido da interface por gerar confusão.

## Cores dos dias e resumo superior

Ajuste aplicado:

- Dias com presença recebem número verde.
- Domingo recebe número vermelho.
- Sábado recebe número amarelo.
- Feriado fica preparado para número azul quando houver calendário de feriados.
- Resumo de efetivo, acumulado, dias apurados e empresas foi movido para cima da tabela.
- Rodapé permanece apenas com fonte e observação.

## Legenda e feriados São José dos Campos

Ajustes aplicados:

- Valor positivo na grade recebe número verde.
- Domingo recebe número vermelho no cabeçalho.
- Sábado recebe número amarelo no cabeçalho.
- Feriado de São José dos Campos/SP recebe número azul no cabeçalho.
- Feriados considerados no MVP: nacionais fixos, 09/07 estadual SP, 19/03 São José, 27/07 aniversário de São José dos Campos, Sexta-feira Santa e Corpus Christi.
- Fonte e observação foram removidas do rodapé do Excel/PDF.
- Resumo do período foi colocado acima da tabela.

## Correção do Excel HTML sem div

Ajustes aplicados:

- Removido o uso de div como moldura no arquivo .xls via HTML.
- Excel passou a ser gerado com tabela pura, para evitar quebra de layout.
- Colunas A e B ficam como margem branca.
- Legenda ficou mais discreta.
- Fonte e observação foram removidas do rodapé.

## Cores inline nos dias do Excel

Ajuste aplicado:

- A cor dos dias no cabeçalho do Excel passou a ser aplicada inline no próprio TH.
- Domingo: vermelho.
- Sábado: amarelo.
- Feriado São José dos Campos/SP: azul.
- Dia normal: branco.
- Presença registrada permanece verde somente nos valores da grade.

## Configuração de cidade/UF para calendário

Regra aplicada:

- O controle mensal de mão de obra passou a ter calendário configurável.
- Padrão inicial: São José dos Campos / SP.
- Presets iniciais:
  - São José dos Campos / SP.
  - São Paulo / SP.
  - Outro município / sem feriado municipal.
- O Excel/PDF usa a configuração selecionada para pintar sábados, domingos e feriados.
- Dias inexistentes do mês não devem ser gerados.
- Próxima evolução recomendada: salvar cidade/UF diretamente no cadastro da obra e herdar automaticamente no DDS.

## Calendário herdado da obra

Ajuste aplicado:

- A seleção manual de calendário dentro do DDS foi substituída por calendário herdado da obra.
- A fonte oficial para cidade/UF passa a ser o cadastro de Obras.
- O DDS mostra apenas o calendário aplicado e a origem.
- Se a obra tiver cidade/UF cadastrada, o controle de mão de obra usa esses dados.
- Se a obra não tiver cidade/UF, o sistema usa São José dos Campos / SP como fallback temporário.
- Próxima evolução recomendada: ampliar a tabela de feriados por UF/município e, futuramente, usar código IBGE.

## CEP e municípios no cadastro de obras

Ajustes aplicados:

- Cadastro de Obras recebeu campo CEP.
- CEP consulta ViaCEP para preencher UF, cidade e endereço.
- UF virou seleção padronizada.
- Cidade passou a usar lista/autocomplete carregada pela API de Localidades do IBGE conforme UF.
- Digitação manual permanece disponível se a API estiver indisponível.
- CEP deve ser salvo na coluna public.obras.cep após execução do SQL docs/sql/2026-07-obras-cep.sql.
- DDS continua herdando cidade/UF da obra para aplicar calendário e feriados no controle de mão de obra.

## Número da obra e técnico de segurança

Ajustes aplicados:

- Cadastro de Obras recebeu campo "Nº da obra".
- Cadastro de Obras recebeu campo "Técnico de Segurança do Trabalho Idealiza".
- Service de Obras passou a salvar/carregar numero_obra e tecnico_seguranca_idealiza.
- Criado SQL docs/sql/2026-07-obras-campos-complementares.sql.
- Fluxo de salvar obra foi ajustado para retornar ao card Obras após salvar.

## Número do endereço da obra

Ajustes aplicados:

- Cadastro de Obras recebeu campo "Nº endereço".
- O formulário de Obras bloqueia propagação de clique/mousedown para não recolher o card ao clicar em campos internos.
- Layout do formulário foi reorganizado em 12 colunas para reduzir espaços em branco.
- Service de Obras passou a salvar/carregar numero_endereco.
- SQL complementar atualizado em docs/sql/2026-07-obras-campos-complementares.sql.

## Disposição final segura do formulário de obras

Ajuste aplicado:

- A disposição visual do formulário de Obras foi ajustada usando os campos do formulário como referência, não o texto dos rótulos.
- Linha 1: Nome da obra, Nº da obra, Status e CEP.
- Linha 2: UF, Cidade, Endereço e Nº endereço.
- Linha 3: Fiscal Idealiza, Técnico de Segurança do Trabalho Idealiza e Líder/Encarregado.
- Linha 4: Observações em largura total.
- Botão Buscar do CEP recebeu largura mínima.
- O formulário preserva o bloqueio de propagação de clique/mousedown para não recolher o card.

## Ordem final dos responsáveis da obra

Ajuste aplicado:

- A linha de responsáveis do cadastro de Obras ficou na ordem:
  - Fiscal Idealiza.
  - Líder / Encarregado.
  - Técnico de Segurança do Trabalho Idealiza.

## Listagem mensal de registros DDS

Microetapa 3A aplicada:

- Criada função listarRegistrosDds em src/services/ddsRegistrosService.js.
- A listagem permite filtrar por empresa, obra, período e status.
- O filtro de período usa sobreposição mensal:
  - periodo_fim >= início do mês.
  - periodo_inicio <= fim do mês.
- Esta base será usada na próxima microetapa para montar a tela de histórico mensal de mão de obra por obra.

## Bloco visual do histórico mensal de mão de obra

Microetapa 3B aplicada:

- DdsPage passou a importar listarRegistrosDds.
- Criados estados para mês base, carregamento, erro, consulta e registros retornados.
- Criada busca mensal por empresa, obra e período.
- Criado resumo do histórico mensal com DDS encontrados, concluídos, dias apurados, acumulado do período, efetivo médio e funções.
- Inserido bloco visual "Histórico mensal de mão de obra" antes do resumo do registro DDS carregado.
- Nesta microetapa ainda não há exportação mensal consolidada; isso ficará para a etapa seguinte.

## Exportação mensal consolidada de mão de obra

Microetapa 3C aplicada:

- Criada função montarDadosHistoricoMensalMaoDeObraDds.
- O histórico mensal passa a consolidar os DDS encontrados por obra/mês.
- A consolidação percorre dados.conferenciaAssistida.frequencia, participantes e diasAtivos.
- Criada exportação Excel mensal consolidada.
- Criada impressão/PDF mensal consolidada.
- Inseridos botões no card "Histórico mensal de mão de obra":
  - Imprimir PDF mensal.
  - Exportar Excel mensal.
- A exportação individual por DDS foi preservada.

## Ajuste visual do card de histórico mensal

Ajuste complementar da Microetapa 3C:

- Card do histórico mensal ficou com largura total e bordas ligeiramente menores.
- Área de mês/ano e busca foi compactada.
- Botão Buscar DDS do mês não fica mais bloqueado por ausência de obraSelecionadaIdDds; a função passa a exibir a mensagem de validação.
- Botões Imprimir PDF mensal e Exportar Excel mensal não ficam mais bloqueados visualmente; caso não exista histórico com presenças, a própria função exibe alerta.
- Botões receberam largura mínima para melhorar alinhamento visual.

## Correção de layout e busca por obra no histórico mensal

Ajuste complementar da Microetapa 3C:

- Card do histórico mensal passou a ocupar a largura total do grid.
- Topo do card foi reorganizado em duas colunas no desktop.
- Botões mensais foram alinhados em bloco compacto.
- Busca mensal agora aceita obra por ID ou por nome da obra base.
- Quando não há obraSelecionadaIdDds, a busca usa empresa/período e filtra os DDS pelo nome da obra.
- Mensagem de validação deixou de exigir apenas obra cadastrada/selecionada e passou a aceitar obra carregada no DDS.

## Ajuste final do card de histórico mensal DDS

Ajuste complementar da Microetapa 3C:

- Campo Mês/Ano reduzido.
- Título e descrição do card mantidos em uma linha no desktop.
- Botões Buscar DDS do mês, Imprimir PDF mensal e Exportar Excel mensal ficaram na mesma linha.
- Busca mensal passou a aceitar obra por ID ou por nome da obra base.
- Obra base textual, como "teste", pode ser usada para filtrar os DDS do mês quando não houver obraSelecionadaIdDds.
- Botões PDF/Excel continuam clicáveis; se não houver histórico oficial, a função exibe alerta.

## Harmonia visual do card de histórico mensal

Ajuste complementar da Microetapa 3C:

- Reduzido o título do card de histórico mensal.
- Descrição mantida em uma linha com largura controlada.
- Campo Mês/Ano ficou menor.
- Botões Buscar, Imprimir PDF mensal e Exportar Excel mensal ficaram alinhados na mesma faixa.
- Cards de indicadores ficaram menores, com padding reduzido.
- Tabela de DDS localizada ficou mais compacta.

## Ajuste de mês e pílula da obra no histórico mensal

Ajuste complementar da Microetapa 3C:

- Campo Mês/Ano reduzido.
- Mês/Ano, Buscar DDS do mês, Imprimir PDF mensal e Exportar Excel mensal alinhados na mesma faixa.
- Botões reduzidos para harmonizar com o campo de mês.
- A obra base deixou de ocupar uma faixa larga e passou a ser exibida como pílula compacta.

## Botões em linha e indicadores centralizados no histórico mensal

Ajuste complementar da Microetapa 3C:

- Mês/Ano, Buscar DDS do mês, Imprimir PDF mensal e Exportar Excel mensal ficam em uma única linha no desktop.
- Botões receberam largura mínima e whitespace-nowrap para evitar quebra de texto.
- Cards de indicadores do histórico mensal foram centralizados vertical e horizontalmente.

## Fechamento mensal oficial DDS

Microetapa 3D aplicada:

- Criado helper registroHistoricoMensalConcluidoDds.
- O histórico mensal continua exibindo todos os DDS encontrados.
- DDS em aberto aparecem na lista e no contador "Em aberto".
- Os indicadores de dias, acumulado, efetivo médio e funções usam somente DDS concluídos.
- PDF/Excel mensal consolidado passam a considerar somente DDS concluídos.
- Quando houver DDS em aberto, o card mostra aviso discreto informando que eles ficam fora da consolidação oficial.
