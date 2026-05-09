# Central Simples - checklist para virar app Android

Este documento registra o estado atual do projeto e o caminho recomendado antes de empacotar o sistema como app Android.

## Diagnostico rapido

Status atual: pronto para continuar evoluindo como PWA e quase pronto para iniciar preparacao Android.

Recomendacao senior: nao publicar como app Android oficial antes de hospedar em servidor com dominio e HTTPS. O melhor caminho tecnico para este projeto e transformar o PWA em app Android via Trusted Web Activity depois que o backend estiver online.

## Antes de empacotar Android

- [ ] Hospedar o sistema em servidor oficial com HTTPS.
- [ ] Configurar `APP_BASE_URL` com o dominio final.
- [ ] Tirar o banco de dentro de pasta sincronizada como OneDrive em producao.
- [ ] Configurar envio real de e-mail para recuperacao de senha.
- [ ] Configurar credenciais reais da API do WhatsApp.
- [ ] Configurar VAPID/push notifications no servidor oficial.
- [ ] Integrar gateway de pagamento real para Pix/cartao/boleto.
- [ ] Reavaliar a funcao de materiais antes de ativar qualquer envio pelo WhatsApp oficial.
- [ ] Criar politica de privacidade e termos de uso.
- [ ] Preparar pagina de suporte e canal de contato.
- [ ] Validar instalacao PWA em Android com Chrome.
- [ ] Criar arquivo `assetlinks.json` para validar dominio e app Android.
- [ ] Gerar pacote Android com target SDK exigido pela Play Store.
- [ ] Testar primeiro por teste interno da Play Console.

## Banco de dados e estabilidade

Pontos positivos atuais:

- SQLite esta usando WAL, `busy_timeout` e `foreign_keys`.
- O sistema ja separa dados por `user_id` nas rotas principais.
- Existe protecao de trial/plano e senha master sem cobranca.
- Existem indices importantes para notificacoes, pagamentos, cobrancas programadas, tokens e orcamentos.
- O cadastro agora valida CPF/CNPJ e bloqueia documento repetido.

Melhorias ja aplicadas nesta revisao:

- [x] Indice para login por usuario em lowercase.
- [x] Indice para recuperacao/login por e-mail em lowercase.
- [x] Indice para cliente por WhatsApp.
- [x] Indice para notas/historico do cliente.
- [x] Indice para perfil da empresa por usuario.
- [x] Indice para itens por orcamento.
- [x] Indice para listagem de orcamentos por usuario e data.
- [x] Indices para filas de follow-up e cobranca automatica.
- [x] Indice para cobrancas programadas por usuario e proximo disparo.
- [x] Tabela e indices para planejamento de materiais da obra por cliente.
- [x] `PRAGMA optimize` apos criacao dos indices.
- [x] Plano tecnico criado em `db/POSTGRESQL_MIGRATION_PLAN.md` para orientar a migracao futura.

Melhorias recomendadas antes do servidor oficial:

- [ ] Configurar backup automatico diario do banco.
- [ ] Configurar rotina de restauracao de backup testada.
- [ ] Criar migracoes versionadas em vez de depender apenas de `ALTER TABLE` em inicializacao.
- [ ] Usar transacoes ao criar/editar orcamentos, porque hoje o fluxo grava cliente, orcamento, itens, checklist e notas em varias operacoes.
- [ ] Criar logs de erro persistentes para automacoes, e-mail, WhatsApp e pagamentos.
- [ ] Criar logs persistentes especificos para alertas e pedidos parciais de material da obra.
- [ ] Definir limite de retencao para notificacoes antigas.
- [ ] Definir limite de retencao para tokens de recuperacao usados/expirados.

Quando migrar de SQLite para PostgreSQL:

- [ ] Quando houver muitos usuarios simultaneos.
- [ ] Quando automacoes ficarem pesadas.
- [ ] Quando houver necessidade de relatorios grandes.
- [ ] Quando o SaaS comecar a receber pagamentos reais e precisar de trilha de auditoria forte.
- [ ] Quando o app Android estiver em producao com muitos acessos moveis ao mesmo tempo.

Documento de apoio: veja `db/POSTGRESQL_MIGRATION_PLAN.md` antes de trocar o banco em producao.

## Performance

Pontos bons:

- As telas principais ja usam CSS e JS sem framework pesado.
- O PWA tem `manifest.json`, service worker e cache basico.
- O backend tem limite de JSON e protecao contra origem indevida.
- O carregamento inicial esta simples e direto.

Melhorias recomendadas:

- [ ] Adicionar paginacao na lista de orcamentos quando passar de algumas centenas por usuario.
- [ ] Criar filtros server-side no pipeline no futuro.
- [ ] Evitar carregar todos os orcamentos no dashboard quando a base crescer.
- [ ] Compactar respostas HTTP no servidor oficial com proxy ou middleware.
- [ ] Definir cache forte para imagens, icones e CSS versionado.
- [ ] Criar telas de loading/skeleton no mobile para reduzir sensacao de travamento.

## Automacao de materiais da obra

Status atual:

- [x] Funcao retirada da tela de Orcamentos enquanto redesenhamos uma experiencia mais simples.
- [x] Alertas automaticos de materiais pausados para nao confundir o usuario.
- [ ] Redefinir a regra de negocio antes de liberar em producao.

Implementado localmente:

- [x] Criar planejamento de materiais por cliente/obra.
- [x] Considerar somente os dias produtivos escolhidos pelo usuario.
- [x] Calcular total estimado de materiais pela metragem total da obra.
- [x] Controlar quantidade ja pedida e saldo restante por material.
- [x] Gerar mensagem pronta para WhatsApp com pedido parcial e saldo restante.
- [x] Preparar motor automatico para avisar o pedreiro quando for hora de montar novo pedido.

Configurar no servidor oficial:

- [ ] Configurar `APP_BASE_URL` com HTTPS para links e mensagens corretas.
- [ ] Configurar `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_VERSION` e templates aprovados, se forem usados.
- [ ] Criar ou aprovar template do WhatsApp para pedido parcial de material, caso a conta use envio por template.
- [ ] Definir intervalo do motor de automacoes e monitorar se ele esta rodando 24h.
- [ ] Testar alerta automatico com obra real simulada: metragem, dias produtivos, prazo de entrega e saldo restante.
- [ ] Validar que o sistema nao cria alertas repetidos no mesmo dia para a mesma regra.
- [ ] Criar alerta/log quando faltar WhatsApp do dono da obra ou quando o envio manual/API falhar.
- [ ] Revisar textos da mensagem de pedido de material para evitar tom de cobranca indevida.

## UX e UI

Pontos bons:

- A identidade visual ja esta consistente.
- Mobile recebeu boa atencao em login, dashboard, orcamentos e configuracoes.
- A tela de orcamentos ficou mais organizada com pastas/janelas.
- Existem bons empty states em varias areas.
- O fluxo de trial, planos e bloqueio premium ja esta compreensivel.

Melhorias com maior impacto:

- [x] Criar onboarding inicial com 3 passos: configurar empresa, cadastrar primeiro cliente, criar primeiro orcamento.
- [x] Criar uma area "Hoje" mais objetiva no dashboard mobile, com apenas as acoes mais urgentes.
- [ ] Padronizar todos os textos com acentos e linguagem mais comercial.
- [ ] Trocar aos poucos `onclick` inline por eventos centralizados para facilitar manutencao.
- [ ] Melhorar acessibilidade dos modais com foco automatico e tecla Esc para fechar.
- [x] Criar mascara visual para telefone, CPF/CNPJ, CEP e cartao nos formularios principais.
- [x] Criar confirmacoes mais bonitas para exclusao, em vez de `confirm` nativo.
- [ ] Criar busca global simples por cliente/orcamento/cobranca.
- [ ] Criar estado offline mais claro no app instalado.
- [ ] Criar tela de suporte/ajuda com perguntas frequentes.

## Segurança para producao

- [ ] Configurar `NODE_ENV=production`.
- [ ] Usar `JWT_SECRET` forte e exclusivo.
- [ ] Usar `MASTER_PASSWORD` forte e exclusivo.
- [ ] Ativar HTTPS obrigatorio.
- [ ] Configurar cookies seguros em producao.
- [ ] Revisar politicas de privacidade para CPF/CNPJ.
- [ ] Criptografar ou proteger backups.
- [ ] Criar rotina para apagar conta/dados se o usuario solicitar.
- [ ] Adicionar auditoria para pagamentos e eventos importantes.
- [ ] Testar rate limits em login, cadastro e recuperacao de senha.

## Ordem recomendada

1. Estabilizar servidor oficial com HTTPS.
2. Configurar e-mail, WhatsApp, pagamentos e push reais.
3. Testar fluxos principais no celular como PWA instalado.
4. Corrigir pontos criticos de UX mobile.
5. Criar pacote Android via TWA.
6. Publicar primeiro em teste interno.
7. So depois liberar para clientes.
