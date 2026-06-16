\# Backlog priorizado — Pós v1.0.2



\## Base homologada



Tag segura: `v1.0.2-revisao-final`



A versão `v1.0.2-revisao-final` fica congelada como ponto seguro de retorno. Todas as melhorias futuras devem ser feitas em branch separada, sem alterar diretamente a versão homologada.



Branch de trabalho recomendada:



```text

melhorias-pos-v1.0.2

```



\## Regra principal



Toda melhoria deve seguir o padrão:



```text

Diagnóstico → alteração pequena → build → validação visual → commit → push

```



Não misturar layout, regra de negócio, banco, PDF, OCR e segurança na mesma etapa.



\---



\# Prioridade 1 — Melhorias leves de layout geral



\## Objetivo



Ajustar pequenos desalinhamentos visuais sem mudar regra de negócio.



\## Itens



1\. Revisar espaçamentos dos cards principais em telas grandes.

2\. Padronizar altura de botões em todas as abas.

3\. Padronizar títulos, subtítulos e textos auxiliares.

4\. Revisar botões de ação secundária para evitar excesso visual.

5\. Conferir tabelas e cards em modo desktop.

6\. Garantir que filtros, cards e relatórios mantenham o mesmo padrão visual.



\## Risco



Baixo, desde que feito por aba e com build após cada alteração.



\## Roteiro sugerido



```text

Roteiro 42 — Melhorias leves de layout geral

```



\---



\# Prioridade 2 — Melhorias mobile



\## Objetivo



Melhorar a experiência no celular sem quebrar o layout desktop.



\## Itens



1\. Revisar Dashboard SST no mobile.

2\. Revisar Empresas e Documentos no mobile.

3\. Revisar Colaboradores no mobile.

4\. Revisar Treinamentos no mobile.

5\. Revisar QR Code no mobile.

6\. Revisar Auditoria de Campo no mobile.

7\. Revisar Auditoria do Sistema no mobile.

8\. Revisar Acessos do App no mobile.

9\. Revisar Configurações no mobile.

10\. Ajustar botões que ficam muito próximos.

11\. Evitar tabelas estourando a largura.

12\. Priorizar cards empilhados em telas menores.



\## Risco



Médio, porque CSS global pode afetar várias abas.



\## Roteiro sugerido



```text

Roteiro 43 — Revisão e ajustes mobile

```



\---



\# Prioridade 3 — Performance e carregamento



\## Objetivo



Reduzir peso inicial e melhorar sensação de velocidade sem mudar funcionalidades.



\## Itens



1\. Mapear chunks grandes do build.

2\. Avaliar carregamento lazy/dinâmico de telas pesadas.

3\. Avaliar separação de PDFs/exportação em carregamento sob demanda.

4\. Revisar chamadas duplicadas ao Supabase.

5\. Revisar telas com carregamento duplo/triplo.

6\. Revisar componentes pesados:



&#x20;  \* Configurações

&#x20;  \* Dashboard Auditoria de Campo

&#x20;  \* Exportação/PDF

&#x20;  \* Acessos do App

7\. Manter fallback visual de carregamento.



\## Risco



Médio/alto, porque pode afetar roteamento e carregamento de telas.



\## Roteiro sugerido



```text

Roteiro 44 — Diagnóstico de performance e carregamento

```



\---



\# Prioridade 4 — PDFs e relatórios



\## Objetivo



Evoluir relatórios sem alterar os PDFs já homologados.



\## Itens



1\. Criar checklist padrão para todos os PDFs.

2\. Revisar cabeçalho, rodapé e paginação.

3\. Conferir “Filtros aplicados” em todos os relatórios.

4\. Padronizar largura de tabelas.

5\. Melhorar quebra de páginas.

6\. Avaliar campo de assinatura/responsável nos relatórios.

7\. Avaliar capa simples para relatórios principais.

8\. Criar melhoria futura para exportação consolidada.



\## Risco



Médio, porque PDF é sensível a layout e paginação.



\## Roteiro sugerido



```text

Roteiro 45 — Melhorias controladas nos PDFs

```



\---



\# Prioridade 5 — OCR e leitura de documentos



\## Objetivo



Melhorar a identificação automática de documentos mantendo as regras já aprovadas.



\## Itens



1\. Revisar reconhecimento de tipo documental.

2\. Melhorar leitura de ASO.

3\. Melhorar leitura de certificados NR.

4\. Melhorar validação de nome do colaborador.

5\. Melhorar validação de CPF quando existir.

6\. Manter bloqueio de datas antigas suspeitas.

7\. Manter regra de OS e ficha de registro sem validade.

8\. Melhorar mensagem “Documento sendo analisado”.

9\. Criar modo de diagnóstico do OCR por documento.

10\. Evitar aprovar automaticamente documento ambíguo.



\## Risco



Alto, porque OCR afeta regra de negócio e aprovação documental.



\## Roteiro sugerido



```text

Roteiro 46 — Melhorias no OCR e análise de documentos

```



\---



\# Prioridade 6 — Segurança, permissões e logs



\## Objetivo



Aumentar rastreabilidade sem mexer na estrutura já homologada sem diagnóstico.



\## Itens



1\. Revisar logs críticos de Configurações.

2\. Revisar logs de Acessos do App.

3\. Revisar logs de login e permissões.

4\. Revisar eventos de bloqueio/desbloqueio.

5\. Revisar solicitações de acesso.

6\. Avaliar alerta para ações críticas.

7\. Avaliar histórico de alterações por usuário.

8\. Conferir se perfis mantêm comportamento esperado:



&#x20;  \* Administrador

&#x20;  \* Técnico SST

&#x20;  \* Consulta

&#x20;  \* Bloqueado

&#x20;  \* Auditor

&#x20;  \* Gestor



\## Risco



Médio/alto, porque envolve permissões e segurança.



\## Roteiro sugerido



```text

Roteiro 47 — Revisão de segurança, permissões e logs

```



\---



\# Prioridade 7 — QR Code e uso em campo



\## Objetivo



Manter o QR do funcionário permanente e melhorar a experiência de uso em campo.



\## Itens



1\. Manter QR do funcionário fixo por token/cadastro.

2\. Garantir que alteração de treinamento não mude o QR.

3\. Revisar tela pública do colaborador.

4\. Revisar visual do QR no celular.

5\. Revisar impressão do QR para capacete.

6\. Avaliar modelo de etiqueta simples.

7\. Avaliar QR de máquina/equipamento.

8\. Avaliar QR de auditoria de campo.

9\. Manter dados sensíveis ocultos na consulta pública.



\## Risco



Médio, porque QR público envolve token e segurança.



\## Roteiro sugerido



```text

Roteiro 48 — Melhorias controladas do QR Code em campo

```



\---



\# Prioridade 8 — Backlog futuro sem aplicação imediata



\## Objetivo



Guardar ideias que não devem entrar agora para evitar quebrar a versão estável.



\## Itens



1\. Painel executivo consolidado.

2\. Exportação geral por empresa.

3\. Relatório mensal automático.

4\. Alertas por e-mail.

5\. Notificações programadas.

6\. Histórico completo por colaborador.

7\. Histórico completo por empresa.

8\. Dashboard de vencimentos por criticidade.

9\. Módulo de indicadores avançados.

10\. Integrações futuras.



\## Risco



Variável. Não aplicar sem roteiro próprio.



\---



\# Ordem recomendada



```text

Roteiro 42 — Melhorias leves de layout geral

Roteiro 43 — Revisão e ajustes mobile

Roteiro 44 — Diagnóstico de performance e carregamento

Roteiro 45 — Melhorias controladas nos PDFs

Roteiro 46 — Melhorias no OCR e análise de documentos

Roteiro 47 — Revisão de segurança, permissões e logs

Roteiro 48 — Melhorias controladas do QR Code em campo

Roteiro 49 — Nova tag de checkpoint pós melhorias

```



\## Observação final



Nenhum item deste backlog deve ser aplicado direto sem diagnóstico prévio.



A versão `v1.0.2-revisao-final` permanece como versão segura de retorno.



