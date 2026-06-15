\# Manual Operacional das Abas — Controle SST QR



Versão: v1.0.0-homologacao

Projeto: controle-sst-qr

Status: versão homologada e testada em produção



\## 1. Objetivo



Este manual orienta o uso operacional das principais abas do sistema Controle SST QR.



Deve ser utilizado por administradores, técnicos SST, gestores, auditores e usuários autorizados, conforme o perfil de acesso definido no sistema.



\## 2. Dashboard SST



A aba Dashboard SST apresenta a visão geral dos indicadores do sistema.



Principais informações exibidas:



\* empresas cadastradas;

\* colaboradores cadastrados;

\* documentos enviados;

\* pendências documentais;

\* treinamentos;

\* vencimentos;

\* auditorias;

\* alertas e indicadores críticos.



Rotina recomendada:



1\. abrir o Dashboard SST no início da rotina;

2\. verificar cards principais;

3\. conferir pendências críticas;

4\. analisar últimos documentos enviados;

5\. gerar relatório PDF quando necessário;

6\. registrar tratativas fora do sistema, quando aplicável.



O relatório PDF do Dashboard SST deve ser usado como evidência de acompanhamento periódico.



\## 3. Empresas e Documentos



A aba Empresas e Documentos deve ser usada para controlar empresas contratadas, documentos legais e vencimentos.



Documentos principais:



\* PGR;

\* PCMSO;

\* LTCAT;

\* contratos;

\* demais documentos aplicáveis.



Rotina recomendada:



1\. cadastrar empresa;

2\. revisar CNPJ, responsável e dados principais;

3\. anexar documentos obrigatórios;

4\. conferir validade e status;

5\. atualizar documentos vencidos;

6\. gerar PDF geral ou PDF de pendências;

7\. verificar documentos por empresa quando necessário.



Atenção: não excluir ou substituir documentos sem confirmar se existe backup ou versão anterior salva.



\## 4. Colaboradores



A aba Colaboradores deve ser usada para cadastrar e controlar trabalhadores vinculados às empresas.



Informações principais:



\* nome;

\* CPF;

\* função;

\* matrícula;

\* empresa;

\* foto;

\* status de mobilização;

\* documentos vinculados.



Rotina recomendada:



1\. cadastrar colaborador;

2\. vincular à empresa correta;

3\. inserir função e CPF corretamente;

4\. anexar foto quando disponível;

5\. conferir se o card ficou no padrão aprovado;

6\. revisar documentos e treinamentos associados;

7\. atualizar dados quando houver mudança de função ou empresa.



A foto do colaborador deve permanecer visível e circular no card/base, conforme padrão aprovado.



\## 5. Treinamentos



A aba Treinamentos controla certificados, vencimentos, análise de documentos e pendências.



Principais funções:



\* upload de certificado;

\* análise/OCR do documento;

\* identificação automática de NR/tipo;

\* verificação de colaborador;

\* verificação de empresa;

\* verificação de assinatura;

\* verificação de data e vencimento;

\* base de certificados;

\* relatórios de treinamentos.



Rotina recomendada:



1\. enviar certificado;

2\. aguardar status de análise;

3\. revisar se colaborador e empresa foram identificados corretamente;

4\. conferir data e validade;

5\. validar se a assinatura foi identificada;

6\. corrigir manualmente apenas quando necessário;

7\. gerar relatório de colaboradores e treinamentos;

8\. gerar relatório de pendências de treinamentos.



Atenção: documentos de colaborador errado não devem ser aprovados.



\## 6. QR Público



O QR Público permite consulta externa sem login, conforme regras de segurança definidas no sistema.



Tipos principais:



\* QR de colaborador;

\* QR de máquina/equipamento;

\* QR público de auditoria de campo.



Rotina recomendada:



1\. gerar QR no sistema;

2\. testar o QR em aba anônima;

3\. confirmar se abre sem login;

4\. conferir se mostra somente as informações permitidas;

5\. imprimir ou disponibilizar o QR no local correto;

6\. revisar periodicamente se o token continua válido.



Não divulgar links administrativos como QR público.



\## 7. Auditoria de Campo



A Auditoria de Campo permite registrar inspeções, desvios, riscos e evidências.



Principais funções:



\* auditoria por área;

\* auditoria por máquina/equipamento;

\* auditoria pública por QR;

\* registro de desvios;

\* registro de risco;

\* fotos/evidências;

\* histórico de auditorias.



Rotina recomendada:



1\. abrir Nova Auditoria de Campo;

2\. selecionar área, empresa ou equipamento;

3\. preencher checklist;

4\. registrar desvios;

5\. anexar evidências;

6\. salvar uma única vez;

7\. conferir se a auditoria apareceu no histórico;

8\. verificar reflexo no Dashboard Auditoria Campo.



Atenção: após salvar, não tentar salvar a mesma auditoria novamente.



\## 8. Dashboard Auditoria Campo



O Dashboard Auditoria Campo apresenta os indicadores das auditorias realizadas.



Principais informações:



\* total de auditorias;

\* auditorias do mês;

\* auditorias abertas;

\* auditorias vencidas;

\* desvios críticos;

\* desvios abertos;

\* média de conformidade;

\* ranking por empresa;

\* ranking por área/local;

\* histórico recente.



Rotina recomendada:



1\. abrir o dashboard após auditorias;

2\. verificar cards principais;

3\. analisar ranking por empresa;

4\. analisar ranking por área;

5\. conferir histórico recente;

6\. aplicar filtros quando necessário;

7\. gerar PDF para reunião ou evidência.



\## 9. Auditoria do Sistema



A Auditoria do Sistema registra ações relevantes realizadas no sistema.



Eventos importantes:



\* alteração em Configurações;

\* criação e edição de usuários;

\* bloqueio e desbloqueio de acesso;

\* solicitações de acesso;

\* alterações de permissões;

\* eventos críticos do sistema.



Rotina recomendada:



1\. verificar logs periodicamente;

2\. filtrar por usuário, período ou tipo de evento;

3\. revisar eventos críticos;

4\. gerar relatório PDF quando necessário;

5\. manter histórico para rastreabilidade.



\## 10. Configurações



A aba Configurações concentra ajustes sensíveis do sistema.



Rotina recomendada:



1\. abrir Configurações;

2\. desbloquear somente quando necessário;

3\. aplicar alterações com cautela;

4\. conferir se cards mantiveram o padrão;

5\. atualizar a página para validar persistência;

6\. conferir log na Auditoria do Sistema.



Não alterar Configurações sem necessidade real.



\## 11. Relatórios PDF



Os relatórios em PDF devem ser usados como evidência operacional.



Relatórios principais:



\* Dashboard SST;

\* Empresas e Documentos;

\* Pendências Documentais;

\* Documentos por Empresa;

\* Colaboradores e Treinamentos;

\* Pendências de Treinamentos;

\* QR Codes de Campo;

\* Dashboard Auditoria Campo;

\* Auditoria do Sistema;

\* Aniversariantes.



Antes de enviar um relatório, conferir:



\* cabeçalho;

\* título;

\* paginação;

\* rodapé;

\* tabelas;

\* ausência de cortes;

\* ausência de informações do navegador, como about:blank.



\## 12. Regra operacional



Sempre que uma aba apresentar erro:



1\. não alterar código imediatamente;

2\. registrar tela, perfil usado e ação executada;

3\. tirar print;

4\. verificar se o erro acontece novamente;

5\. testar em aba anônima quando aplicável;

6\. só abrir correção após diagnóstico.



