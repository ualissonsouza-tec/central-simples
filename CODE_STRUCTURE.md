# Estrutura do codigo - Central Simples

Este arquivo serve como mapa rapido de manutencao. Os arquivos principais agora tambem possuem titulos internos por bloco.

## Backend

- `server.js`: servidor Express, middlewares globais, paginas HTML, APIs e inicializacao.
- `db/database.js`: conexao SQLite, schema, migracoes leves, indices e preparacao para PostgreSQL.
- `routes/auth.js`: login, cadastro, recuperacao de senha e logout.
- `routes/company.js`: configuracoes da empresa, logo, Pix e status do WhatsApp.
- `routes/orcamentos.js`: CRUD de orcamentos, PDF, modelos, links publicos, recorrencia e automacoes.
- `routes/clients.js`: lista de clientes e historico individual.
- `routes/scheduledCharges.js`: cobrancas programadas por cliente.
- `routes/materialRequests.js`: base pausada de materiais; nao esta montada no servidor enquanto redesenhamos a experiencia.
- `routes/notifications.js`: notificacoes internas e push.
- `routes/billing.js`: planos, status de assinatura e checkout.
- `routes/publicOrcamentos.js`: aprovacao publica de orcamento por link.

## Regras compartilhadas

- `lib/billing.js`: planos, trial, recursos liberados e pagamentos.
- `lib/security.js`: senha, rate limit, origem segura e erros publicos.
- `lib/automationEngine.js`: follow-up, cobranca automatica e cobranca recorrente.
- `lib/materialPlanning.js`: base pausada de calculo de materiais, preservada para futura reimplementacao.
- `lib/emailService.js`: envio SMTP de recuperacao de senha.
- `lib/whatsappService.js`: envio pela API do WhatsApp.
- `lib/orcamentoPdf.js`: geracao de PDF.
- `lib/pushNotifications.js`: avisos push do PWA.
- `lib/documentValidator.js`: validacao de CPF/CNPJ.

## Frontend

- `public/login.html`: login, cadastro e recuperacao de senha.
- `public/dashboard.html`: painel, notificacoes, onboarding, agenda do dinheiro e acoes rapidas.
- `public/orcamentos.html`: orcamentos, calculadora, modelos, automacoes, cobrancas, historico e pipeline.
- `public/configuracoes.html`: perfil da empresa, logo e Pix.
- `public/planos.html`: planos e bloqueio apos trial.
- `public/pagamento.html`: checkout e dados do pagador.
- `public/aprovacao.html`: tela publica para o cliente aprovar ou recusar.
- `public/reset-password.html`: troca de senha por token.
- `public/cs-shared.css`: design system compartilhado.
- `public/cs-pwa.js`: instalacao PWA, mascaras, push e modal de confirmacao.
- `public/cs-billing.js`: guarda visual de assinatura no frontend.
- `public/sw.js`: service worker e cache do PWA.

## Cuidados de manutencao

- Evite misturar regra de negocio dentro do HTML quando puder mover para `routes` ou `lib`.
- Ao criar uma funcionalidade nova, adicione um titulo de bloco antes da nova secao.
- Ao mexer em banco, registre tambem no plano de migracao PostgreSQL em `db/POSTGRESQL_MIGRATION_PLAN.md`.
- Antes de subir para producao, validar `server.js`, rotas, scripts do frontend e service worker.
