# Backlog de Melhorias Futuras — Controle SST QR



Versão base protegida: v1.0.0-homologacao

Branch de trabalho: melhoria-seguranca-auditoria

Status: ideias futuras, sem alteração na versão estável



## 1. Objetivo



Este documento reúne ideias de melhorias futuras para o sistema Controle SST QR.



Nenhuma melhoria listada aqui deve ser aplicada diretamente no sistema sem antes passar por diagnóstico, planejamento, microetapas, build, teste visual e aprovação.



## 2. Regra principal



A versão estável não deve ser alterada sem necessidade real.



Toda melhoria futura deve seguir este padrão:



1\. registrar a ideia no backlog;

2\. definir prioridade;

3\. separar em etapas pequenas;

4\. identificar arquivos afetados;

5\. aplicar uma alteração por vez;

6\. rodar build;

7\. testar visualmente;

8\. commitar somente após aprovação;

9\. conferir deploy na Vercel.



## 3. Prioridades



Usar a classificação abaixo:



\* Alta: melhoria importante para segurança, estabilidade ou uso diário.

\* Média: melhoria útil, mas que pode aguardar.

\* Baixa: melhoria visual, conforto ou ideia futura.



## 4. Melhorias futuras — Alta prioridade



### 4.1 Refinar Central de Ajuda / Manuais

Prioridade: Alta
Status: concluído no Roteiro 23

Melhorias aplicadas:

* botão para copiar passo a passo;
* melhoria na mensagem de busca sem resultado;
* botões de exemplo quando a busca não encontra item;
* correção de acentuação nos textos dos Manuais;
* botão para limpar busca;
* validação visual no desktop e mobile.

Commits relacionados:

* a12cd7f feat: adicionar copia de passo a passo nos manuais
* 24e8a7c feat: melhorar busca sem resultado nos manuais
* 72b59b7 fix: corrigir acentuacao nos manuais
* 228dcbf feat: adicionar limpar busca nos manuais

Observação: melhoria concluída sem alterar permissões internas, rotas, Supabase, banco ou App.jsx.

### 4.2 Revisão mensal de backup

Prioridade: Alta
Status: concluído no Roteiro 25

Melhoria aplicada:

* criado checklist mensal de backup e manutenção;
* checklist incluído no índice da documentação;
* rotina mensal documentada para Git, GitHub, Vercel, Supabase, Storage e variáveis;
* registro mensal de revisão incluído;
* regra para abertura de novo roteiro documentada.

Arquivos relacionados:

* docs/checklist-mensal-backup-manutencao.md
* docs/README.md

Commits relacionados:

* 0daa67e docs: adicionar checklist mensal de backup e manutencao
* b846a9f docs: adicionar checklist mensal ao indice

Observação: melhoria concluída apenas em documentação, sem alteração em código, Supabase, banco, permissões, rotas ou App.jsx.

### 4.3 Melhorar auditoria de permissões

Prioridade: Alta
Status: concluído no Roteiro 30B

Melhoria aplicada:

* diagnóstico dos arquivos de acessos, permissões, perfis e solicitações;
* identificação da tela principal `src/components/acessos/AcessosAppPage.jsx`;
* identificação do service principal `src/services/usuariosPermissoesSistemaService.js`;
* resposta administrativa passou a aparecer nos cards de solicitação de acesso;
* data de atualização da solicitação passou a aparecer no card;
* banco/RPC atualizado para registrar responsáveis por aprovação, recusa e conclusão;
* campos adicionados para e-mail, nome e data/hora de cada ação administrativa;
* front-end atualizado para exibir Histórico administrativo no card da solicitação;
* validação visual aprovada no desktop, mobile e sistema publicado;
* sem alteração em App.jsx ou rotas principais.

Commits relacionados:

* 18d6cbf feat: mostrar resposta administrativa em solicitacoes
* c5f378c docs: marcar validacao mobile da auditoria de permissoes
* e13cb66 sql: preparar auditoria de responsaveis por solicitacoes
* 162b66c feat: exibir responsaveis nas solicitacoes de acesso
* 4f9ded6 docs: concluir auditoria de permissoes no backlog

Observação: melhoria concluída. O sistema agora registra e exibe quem aprovou, recusou ou concluiu solicitações de acesso.

## 5. Melhorias futuras — Média prioridade



### 5.1 Melhorar relatórios com filtros salvos

Prioridade: Média
Status: em andamento

Objetivo:

* permitir que relatórios importantes reutilizem filtros aplicados anteriormente;
* reduzir retrabalho ao gerar PDFs recorrentes;
* manter o padrão visual e funcional já aprovado no sistema;
* iniciar sempre por microetapas, um relatório por vez.

Melhorias aplicadas no Roteiro 32:

1. Aniversariantes:

* relatório de Aniversariantes recebeu filtros salvos;
* filtros salvos usando `localStorage`, sem alteração no banco;
* campos contemplados: mês, empresa, função, status e busca;
* adicionados botões: Salvar filtro, Aplicar filtro salvo e Limpar filtro salvo;
* PDF de aniversariantes mantido com a seção Filtros aplicados;
* build aprovado;
* validação visual aprovada na aba Aniversariantes;
* commit relacionado: f1ab6c5 feat: salvar filtros de aniversariantes.

2. Auditoria do Sistema:

* relatório da Auditoria do Sistema recebeu filtros salvos;
* filtros salvos usando `localStorage`, sem alteração no banco;
* campos contemplados: busca, ação, usuário, módulo, categoria, nível, período inicial e período final;
* adicionados botões: Salvar filtro, Aplicar filtro salvo e Limpar filtro salvo;
* PDF da Auditoria do Sistema mantido usando `baixarRelatorioAuditoriaSistemaPDF`; 
* `exportacaoService.js` não foi alterado;
* Supabase não foi alterado;
* build aprovado;
* validação visual aprovada na aba Auditoria do Sistema;
* commit relacionado: 9f46044 feat: salvar filtros da auditoria do sistema.

3. Auditoria de Campo:

* relatório do Histórico de Auditorias de Campo recebeu filtros salvos;
* filtros salvos usando `localStorage`, sem alteração no banco;
* campos contemplados: busca, período, tipo, empresa, auditor, status e risco;
* adicionados botões: Salvar filtro, Aplicar filtro salvo e Limpar filtro salvo;
* relatório de impressão do histórico mantido com a seção Filtros aplicados;
* `exportacaoService.js` não foi alterado;
* Supabase não foi alterado;
* build aprovado;
* validação visual aprovada no Dashboard Auditoria de Campo;
* commit relacionado: c882a6b feat: salvar filtros da auditoria de campo.

Relatórios pendentes para etapas futuras:

* relatório de Treinamentos;
* relatório de Pendências;
* relatório de Empresas e Documentos.

Regra para continuidade:

* aplicar filtros salvos em apenas um relatório por roteiro;
* evitar alterações em banco enquanto `localStorage` resolver;
* não alterar `exportacaoService.js` se o PDF já receber os filtros corretamente;
* manter build aprovado antes de commit.

### 5.2 Melhorar Dashboard SST



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* adicionar visão mensal;

\* adicionar cards de tendência;

\* melhorar leitura dos gráficos;

\* criar atalho direto para pendências críticas;

\* melhorar visual mobile.



### 5.3 Melhorar Dashboard Auditoria Campo



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* adicionar filtro por responsável;

\* adicionar visão por período;

\* destacar desvios críticos;

\* melhorar ranking por empresa;

\* melhorar ranking por área/local.



### 5.4 Melhorar Treinamentos



Prioridade: Média

Status: planejado



Melhorias possíveis:



\* melhorar leitura de certificados;

\* criar alertas por treinamento próximo do vencimento;

\* melhorar tela de documento sendo analisado;

\* separar documentos por tipo de NR;

\* melhorar conferência de colaborador errado.



4. Pendências de Treinamentos:
* relatório de Pendências de Treinamentos recebeu filtros salvos;
* filtros salvos usando `localStorage`, sem alteração no banco;
* campos contemplados: busca, empresa e classificação/status geral do colaborador;
* adicionados botões: Salvar filtro, Aplicar filtro salvo e Limpar filtro salvo;
* PDF de pendências passou a receber e exibir a seção Filtros aplicados;
* `ColaboradoresPage.jsx` atualizado;
* `exportacaoService.js` atualizado somente na função do relatório de pendências de treinamentos;
* Supabase não foi alterado;
* build aprovado;
* commit relacionado: 6631394 feat: salvar filtros de pendencias de treinamentos.

5. Relatório de Colaboradores e Treinamentos:
* relatório de colaboradores e treinamentos recebeu filtros salvos;
* filtros salvos usando `localStorage`, sem alteração no banco;
* campos contemplados: busca, empresa e classificação/status geral do colaborador;
* filtros salvos separados dos filtros do relatório de pendências de treinamentos;
* adicionados botões: Salvar filtro, Aplicar filtro salvo e Limpar filtro salvo;
* PDF passou a receber e exibir a seção Filtros aplicados;
* `ColaboradoresPage.jsx` atualizado;
* `exportacaoService.js` atualizado somente nas funções do relatório de colaboradores e treinamentos;
* Supabase não foi alterado;
* build aprovado;
* commit relacionado: 9700ee4 feat: salvar filtros do relatorio de colaboradores e treinamentos.

## 6. Melhorias futuras — Baixa prioridade



### 6.1 Melhorias visuais gerais



Prioridade: Baixa

Status: planejado



Melhorias possíveis:



\* revisar espaçamentos;

\* padronizar alguns textos;

\* melhorar ícones;

\* melhorar animações suaves;

\* refinar cards em telas secundárias.



### 6.2 Melhorar experiência mobile



Prioridade: Baixa

Status: planejado



Melhorias possíveis:



\* revisar cards no celular;

\* melhorar botões em telas menores;

\* melhorar tabelas em mobile;

\* reduzir excesso de rolagem;

\* testar telas principais no celular.



### 6.3 Criar tutoriais com imagens



Prioridade: Baixa

Status: ideia futura



Melhorias possíveis:



\* criar imagens explicativas para Manuais;

\* adicionar prints das telas;

\* criar tutorial por aba;

\* criar versão PDF do manual simples para usuários.



## 7. Ideias que devem aguardar



As ideias abaixo não devem ser aplicadas agora:



\* troca grande de layout;

\* alteração de banco;

\* mudança de permissões;

\* mudança de rota interna;

\* troca de estrutura de login;

\* automação complexa sem planejamento;

\* alteração em Supabase sem backup atualizado.



## 8. Próximo roteiro sugerido



Próximo roteiro após este backlog:



Roteiro 25 — Criar checklist mensal de backup e manutenção



A melhoria só deve sair do backlog depois de escolhida, planejada e aprovada.

<!-- ROTEIRO-32-FILTROS-SALVOS-INICIO -->

## Roteiro 32 ? Filtros salvos e filtros aplicados nos PDFs

### Status geral

Concluído. O ciclo de filtros salvos e identificação dos filtros aplicados nos relatórios foi finalizado nas principais telas de relatório do sistema.

### Relatórios concluídos

| Relatório | Filtro salvo na tela | Filtros aplicados no PDF | Commit principal |
|---|---:|---:|---|
| Aniversariantes | Sim | Sim | `f1ab6c5` |
| Auditoria do Sistema | Sim | Sim | `9f46044` |
| Auditoria de Campo | Sim | Sim | `c882a6b` |
| Pendências de Treinamentos | Sim | Sim | `6631394` / hotfix `756fe35` |
| Colaboradores e Treinamentos | Sim | Sim | `9700ee4` |
| Empresas e Documentos | Sim | Sim | `5071716` / `d7c526b` |
| Pendências Documentais | Usa filtros atuais da tela | Sim | `20642a0` |

### Padronização aplicada

- Filtros salvos com `localStorage`, mantendo o comportamento por tela/relatório.
- Botões padronizados para salvar, aplicar e limpar filtros onde havia fluxo visual de filtros salvos.
- PDFs passaram a exibir uma seção de `Filtros aplicados`, permitindo rastrear busca, tipo, status, empresas filtradas, documentos filtrados, pendências filtradas ou equivalentes de cada relatório.
- As alterações foram feitas em microetapas, com validação, build e commit separados.

### Commits recentes do fechamento

- `5071716` ? `feat: salvar filtros de empresas e documentos`
- `d7c526b` ? `feat: exibir filtros no pdf de empresas e documentos`
- `20642a0` ? `feat: exibir filtros no pdf de pendencias documentais`

### Observações

- O relatório de Pendências Documentais reaproveita os filtros atuais da aba Empresas e Documentos: busca, tipo e status.
- O relatório de Empresas e Documentos possui filtros salvos próprios na tela e exibe os filtros aplicados no PDF geral.
- Nenhuma alteração de Supabase foi necessária neste ciclo.

<!-- ROTEIRO-32-FILTROS-SALVOS-FIM -->
