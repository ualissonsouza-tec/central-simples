# Plano de migracao para PostgreSQL

Este documento deixa a Central Simples preparada para trocar o SQLite por PostgreSQL quando o sistema sair do ambiente local e entrar em producao.

## Decisao atual

- Ambiente local/testes: manter SQLite.
- Servidor oficial com clientes reais: migrar para PostgreSQL antes de crescer a base.
- Motivo: o PostgreSQL lida melhor com muitos usuarios simultaneos, automacoes em fila, auditoria de pagamentos e relatorios maiores.

## Preparacao ja aplicada

- Indices criados para consultas frequentes de usuarios, clientes, orcamentos, itens, notificacoes e cobrancas programadas.
- Estrutura `material_rules` existe no SQLite, mas a funcao de materiais esta pausada na interface e no servidor.
- Banco atual usa `foreign_keys`, `busy_timeout`, WAL e `PRAGMA optimize`.
- Cadastro bloqueia documento repetido com indice unico parcial.
- As tabelas principais ja usam `user_id`, o que facilita isolamento de dados por conta.

## Pontos que precisam virar migracoes versionadas

- Criacao inicial das tabelas.
- `ALTER TABLE` que hoje roda durante a inicializacao.
- Criacao de indices.
- Migracao da tabela `material_rules`, mantendo `workdays_json` e `materials_json` como `JSONB` no PostgreSQL.
- Preservar `last_alerted_at` e `last_request_sent_at` para controlar alertas e pedidos sem duplicidade.
- Seeds ou dados iniciais, se houver.
- Mudancas futuras de planos, pagamentos e notificacoes.

## Diferencas tecnicas para ajustar

- `INTEGER PRIMARY KEY AUTOINCREMENT` vira `BIGSERIAL PRIMARY KEY` ou `GENERATED ALWAYS AS IDENTITY`.
- `TEXT` continua `TEXT`, mas datas devem virar `TIMESTAMPTZ` quando tiverem hora.
- Campos `workdays_json`, `materials_json`, `payer_json` e `gateway_payload` devem virar `JSONB`.
- Valores em dinheiro devem virar `NUMERIC(12,2)`.
- `PRAGMA` nao existe no PostgreSQL.
- Indices parciais continuam existindo, mas a sintaxe precisa ser revisada.
- `datetime('now')` deve virar `NOW()`.
- Placeholders `?` do SQLite viram `$1`, `$2`, `$3` no driver PostgreSQL.
- Transacoes devem usar `BEGIN`, `COMMIT` e `ROLLBACK` no cliente do PostgreSQL.

## Estrutura recomendada para a migracao

1. Criar uma camada unica de acesso ao banco, por exemplo `db/index.js`.
2. Mover consultas repetidas para repositorios por area: usuarios, clientes, orcamentos, pagamentos e notificacoes.
3. Adicionar migracoes versionadas em `db/migrations`.
4. Criar script `npm run migrate`.
5. Rodar exportacao do SQLite para arquivos temporarios.
6. Importar os dados no PostgreSQL em ambiente de teste.
7. Validar login, planos, orcamentos, automacoes, cobrancas e recuperacao de senha.
8. Ativar PostgreSQL no servidor oficial usando variavel `DATABASE_URL`.
9. Manter backup automatico diario e teste de restauracao.

## Ordem sugerida quando formos hospedar

1. Subir servidor de homologacao com PostgreSQL vazio.
2. Rodar migracoes.
3. Migrar uma copia do banco local.
4. Testar todos os fluxos principais.
5. Configurar backup.
6. Apontar dominio e HTTPS.
7. Ativar integracoes reais de e-mail, WhatsApp, Pix/cartao e push.

## Lembretes importantes

- Nao usar banco em pasta sincronizada como OneDrive em producao.
- Guardar `DATABASE_URL`, `JWT_SECRET`, `MASTER_PASSWORD` e chaves de API somente em variaveis de ambiente.
- Criar logs persistentes para automacoes, pagamentos, e-mail e WhatsApp.
- Usar transacoes no fluxo de salvar orcamento antes da migracao definitiva.
