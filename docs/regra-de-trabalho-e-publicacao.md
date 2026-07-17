# Regra de trabalho e publicação

Esta regra é obrigatória para qualquer manutenção do SafeScan Brasil.

## PROTECAO PERMANENTE: TELA DE CARREGAMENTO

- A tela de carregamento deve aparecer em toda troca de aba interna, no primeiro acesso e no F5.
- Esta transicao evita tela branca durante a preparacao da nova area.
- Nao remover, desativar, limitar apenas ao F5 ou substituir por um espaco em branco.
- Qualquer mudanca nessa regra exige autorizacao explicita do responsavel pelo sistema.
- O teste automatico deve falhar se a protecao de navegacao for removida.

## Fluxo obrigatório

1. Implementar as alterações somente no projeto local.
2. Executar `npm run verify` e corrigir qualquer falha.
3. Iniciar o site local, normalmente em `http://127.0.0.1:5176/`.
4. Conferir visualmente as áreas alteradas em computador e celular.
5. Validar que não houve quebra, sobreposição, perda de dados ou alteração em áreas não solicitadas.
6. Apresentar o resultado local ao responsável pelo sistema.
7. Aguardar autorização explícita para publicar.
8. Publicar somente depois da autorização.
9. Conferir novamente o domínio de produção após a publicação.

## Regra de autorização

- Mensagens como "seguir", "continuar" ou "aplicar" autorizam o trabalho local, mas não autorizam publicação.
- A publicação exige uma confirmação clara, como "pode publicar" ou "pode subir para produção".
- Se a validação local ainda não foi concluída, a publicação permanece bloqueada.
- Nenhuma alteração deve ser testada primeiro no site principal.

## Validação mínima local

- Verificação automática aprovada com `npm run verify`.
- Tela de carregamento e login conferidas.
- Área modificada testada no fluxo completo.
- Desktop e celular conferidos quando a mudança afetar interface.
- Console sem novos erros.
- Salvamento e atualização da página testados quando houver alteração de dados.
- Nenhum arquivo ou regra fora do escopo deve ser alterado.

## Produção

Depois da autorização, registrar qual versão foi publicada e confirmar:

- domínio correto;
- implantação concluída;
- versão publicada correspondente à versão aprovada localmente;
- carregamento, login e fluxo alterado funcionando;
- ausência de regressões visuais e erros novos.
