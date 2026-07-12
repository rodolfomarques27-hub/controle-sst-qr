# Checklist de Release

Use este checklist antes de apresentar uma nova versao, publicar no dominio ou entregar o sistema para um comprador.

## Verificacao automatica

- Executar `npm run check:release`.
- Confirmar que integridade, lint, auditoria de dependencias e build terminaram sem falhas.
- Conferir o resumo final do build e os chunks principais.

## Supabase

- Confirmar que RLS esta ativo nas tabelas de negocio.
- Confirmar que usuarios operacionais ativos possuem `empresa_id`.
- Confirmar que a regra `usuarios_operacionais_ativos_exigem_empresa` esta validada.
- Revisar periodicamente os RPCs `SECURITY DEFINER` e manter apenas os grants necessarios.
- Ativar a protecao contra senhas vazadas em:
  `https://supabase.com/dashboard/project/koukyzczwttemgmloagt/auth/protection`
- Registrar toda alteracao estrutural como migration reproduzivel.

## Publicacao

- Validar a URL oficial e o certificado HTTPS.
- Confirmar que `www.safescanbrasil.com.br` esta associado ao projeto `controle-sst-qr`; no ultimo deploy ele estava associado a outro projeto Vercel.
- Conferir cabeçalhos de seguranca no dominio publicado.
- Testar login, logout, troca de senha, QR publico, DDS, auditoria e exportacao PDF.
- Testar as rotas principais em desktop e celular.
- Conferir a tela de carregamento e os estados de erro em cada aba.

## Backup e entrega

- Gerar backup do banco antes de uma mudanca estrutural.
- Testar a restauracao em ambiente separado.
- Confirmar que nenhum `.env`, chave privada ou backup local entra no pacote de entrega.
- Registrar a versao publicada, data, responsavel e observacoes da release.
