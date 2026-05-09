# Checklist de seguranca para subir a Central Simples

Use este arquivo antes de hospedar a aplicacao no servidor oficial.

## Obrigatorio antes de producao

- Definir `NODE_ENV=production`.
- Definir `APP_BASE_URL` com a URL oficial em HTTPS, por exemplo `https://centralsimples.com.br`.
- Trocar `JWT_SECRET` por uma chave aleatoria forte, com pelo menos 32 caracteres.
- Trocar `MASTER_PASSWORD` por uma senha forte, com pelo menos 12 caracteres.
- Configurar `SMTP_*` somente no servidor oficial para recuperacao real de senha.
- Configurar credenciais do WhatsApp somente no servidor oficial.
- Configurar templates/parametros do WhatsApp para follow-up e cobrancas.
- Configurar notificacoes push reais somente com HTTPS ativo e dominio oficial.
- Gerar e guardar chaves VAPID para push quando o app for publicado/hospedado.
- Usar HTTPS obrigatorio no dominio e no proxy reverso.
- Fazer `npm audit --omit=dev` e atualizar dependencias vulneraveis com teste completo.
- Confirmar que telas internas (`dashboard.html`, `orcamentos.html`, `configuracoes.html`, `planos.html` e `pagamento.html`) passam por autenticacao antes de arquivos estaticos.

## LGPD e privacidade

- Revisar a pagina `/privacidade.html` com os dados oficiais do controlador, canal de contato, encarregado/DPO quando aplicavel e fornecedores reais.
- Definir `PRIVACY_VERSION` no servidor sempre que a politica de privacidade mudar.
- Manter o aceite de privacidade no cadastro com data e versao gravadas no banco.
- Publicar termos de uso, politica de privacidade, politica de reembolso e regras de cobranca recorrente antes de vender planos.
- Criar processo para atender direitos dos titulares: acesso, correcao, exclusao/anonimizacao, portabilidade e informacao de compartilhamento.
- Definir prazo de retencao de clientes, orcamentos, pagamentos, logs, tokens expirados e backups.
- Documentar operadores/suboperadores: hospedagem, banco, e-mail, WhatsApp/API de mensagens, gateway de pagamento e suporte.
- Preparar procedimento de incidente de seguranca, incluindo deteccao, registro, contencao e avaliacao de comunicacao a titulares/ANPD.
- Evitar coletar dados excessivos: CPF, endereco e observacoes devem ser usados somente quando houver finalidade clara.

## App instalado no celular

- Validar a instalacao PWA no Android pelo Chrome e no iPhone pelo Safari apos publicar em HTTPS.
- Testar notificacoes push em celular real depois que o dominio oficial estiver ativo.
- Avaliar transformar a PWA em app hibrido com Capacitor para gerar APK/AAB Android.
- Se a estrategia for loja oficial, preparar conta Google Play, icones, splash screen, politica de privacidade e termos de uso.

## Monetizacao e pagamentos

- Escolher o gateway bancario oficial para Pix, boleto e cartao antes de vender em producao.
- Integrar webhooks de pagamento para ativar, renovar, atrasar ou cancelar planos automaticamente.
- Nunca armazenar numero completo de cartao, CVV ou dados sensiveis de pagamento no banco local.
- Definir regras de inadimplencia: dias de tolerancia, avisos por e-mail/WhatsApp e bloqueio automatico.
- Criar tela administrativa para acompanhar assinaturas, pagamentos pendentes e cancelamentos.
- Revisar termos de uso, politica de privacidade, reembolso e autorizacao de cobranca recorrente.

## Banco de dados

- Nao usar banco dentro de OneDrive, Dropbox ou pasta sincronizada em producao.
- Definir `DB_PATH` apontando para um disco persistente e privado do servidor se continuar com SQLite.
- Criar rotina automatica de backup e testar restauracao.
- Verificar permissao do arquivo do banco para que apenas o usuario do servidor consiga ler e escrever.
- Planejar migracao para PostgreSQL quando houver muitos usuarios, muitos orcamentos simultaneos ou automacoes rodando em paralelo.
- Fazer checkpoint/backup considerando arquivos SQLite `*.db`, `*.db-wal` e `*.db-shm`.

## Automacoes de materiais da obra

- Status atual: funcao pausada na interface e no motor automatico ate redesenharmos um fluxo mais simples.
- Validar a tabela `material_rules` no banco oficial antes de liberar para clientes.
- Testar o calculo de dias produtivos com cenarios de segunda a sexta, sabado incluso e obra parada no domingo.
- Confirmar que o motor de automacoes esta rodando em apenas um processo principal para evitar alerta duplicado.
- Configurar logs de `last_error` e monitoramento para falhas no alerta de novo pedido de material.
- Testar envio manual/assistido via WhatsApp oficial com uma obra simulada antes de liberar para usuarios.
- Validar que `materials_json` guarda total, quantidade ja pedida e saldo sem permitir pedido acima do restante.
- Confirmar que a mensagem de pedido de material usa apenas dados do cliente/obra vinculados ao usuario logado.
- Revisar LGPD e termos de uso informando que o usuario pode enviar mensagens operacionais ao dono da obra pelo sistema.

## Escala e protecoes externas

- Colocar rate limit tambem no proxy ou em Redis se rodar mais de um processo Node.
- Monitorar logs de login, recuperacao de senha, envios automaticos e erros de banco.
- Separar arquivos enviados (`uploads`) em armazenamento privado ou bucket com regra de acesso.
- Revisar politica de privacidade, LGPD e tempo de retencao de dados de clientes.
- Rodar testes de fluxo completo: cadastro, login, reset de senha, criar orcamento, PDF, link publico e cobranca automatica.
