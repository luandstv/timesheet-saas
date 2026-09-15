# Publicação na Vercel

## 1. Configuração

Use o preset Next.js, a raiz do repositório, Node.js 24.x e pnpm 11.8.0.
Mantenha a instalação automática da Vercel e habilite
`ENABLE_EXPERIMENTAL_COREPACK=1` para respeitar o `packageManager` do projeto.
Em ambiente CI, o pnpm usa o lockfile congelado. Localmente, use
`pnpm install --frozen-lockfile`. Build: `pnpm build`.

Configure as seguintes variáveis nos ambientes em que a aplicação será executada:

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL usada pela aplicação, pelo pooler |
| `DIRECT_URL` | Conexão usada pela configuração Prisma e pelas migrações |
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública do mesmo projeto Supabase |

Preview deve apontar preferencialmente para um banco e projeto Auth de testes.
Durante o desenvolvimento atual, Preview e Production compartilham os mesmos
valores por decisão do responsável pelo projeto. Alterações de dados em um
ambiente afetam o outro e o ambiente local. Separar banco e Auth antes de
receber dados reais de usuários.
Não versionar `.env` ou compartilhar credenciais em logs. A aplicação não usa
Service Role. Alterar variáveis exige um novo deploy.

O projeto está configurado com **Vercel Authentication → All Deployments**:
todos os endereços, inclusive Production, exigem acesso autorizado pela Vercel.
Essa proteção é adicional ao login da aplicação e foi adotada enquanto o produto
está em desenvolvimento. Não desabilitar automaticamente para executar testes.

## 2. Build e publicação

Execute `pnpm test`, `pnpm lint` e `pnpm build` antes de publicar. O build gera
o cliente Prisma ignorado pelo Git e depois executa o Next.js. Não depende de
arquivos gerados previamente na máquina Windows.

O build não aplica migrações. Em banco existente, confira o histórico antes de
executar `prisma migrate deploy`: há migrações que alteram colunas de minutos e
adicionam a chave de idempotência de `time_entries`; a preservação dos dados
precisa ser avaliada. Não use `migrate dev` em produção.

Crie primeiro um Preview na conta e equipe corretas da Vercel. Este documento
descreve o procedimento; a URL e os logs do deploy devem ser registrados quando
a publicação for concluída.

## 3. Fluxos com conta de teste

- Sem sessão, abrir dashboard e confirmar o redirecionamento para login.
- Entrar com uma conta de teste confirmada e carregar dashboard, ponto e relatórios.
- Registrar entrada, recarregar a página e verificar que oferece saída.
- Registrar saída e conferir o par e os minutos na mesma jornada nos relatórios.
- Abrir uma conta com entrada de ontem pendente: deve oferecer saída e mostrar
  a data anterior. Ao fechar, o timestamp deve ser atual, o movimento deve
  aparecer em “Registros de hoje” e os totais devem ficar na jornada original.

Não fechar ou alterar pontos reais para testar. Se a entrada foi esquecida,
registrar uma saída agora contabiliza todo o intervalo; ajuste retroativo ainda
precisa de um fluxo próprio. O teste automatizado simula a virada do dia sem
alterar o relógio ou registros persistidos.

Se for testar cadastro com confirmação por email, verificar as URLs do projeto
no Supabase e o fluxo de confirmação. O cadastro atual ainda não trata a
ausência de sessão após `signUp`; login com conta já confirmada é a primeira
validação.

## 4. Versão e evidências

Nos logs da Vercel, confirmar Node.js 24.x, geração do Prisma, Next.js 16.3.3
e build concluído. Guardar URL do Preview, identificação do deploy e resultado
dos fluxos. O sucesso do build local não comprova o comportamento publicado.

Referências: [Prisma na Vercel](https://www.prisma.io/docs/orm/v7/prisma-client/deployment/serverless/deploy-to-vercel),
[Node.js na Vercel](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions),
[gerenciadores de pacotes](https://vercel.com/docs/package-managers).

## Registro de preparação — 15/09/2026

- Projeto criado: `luan-alves/timesheet-saas`, Node.js 24.x.
- Corepack habilitado em Preview. O usuário cadastrou as quatro variáveis pelo
  painel; presença e escopo Preview confirmados pela CLI, sem consultar valores.
- Integração GitHub pendente: a Vercel solicitou adicionar uma Login Connection
  para a conta GitHub. O Preview poderá ser enviado pela CLI.
- Local: 40 testes passaram; lint sem erros; geração Prisma e build Next.js
  16.3.3, incluindo TypeScript, passaram.
- Validação visual/autenticada pendente: abertura do navegador local bloqueada
  pela revisão automática por limite de uso do Codex. Nenhum registro real foi
  alterado para validar o ponto entre dias.

### Tentativa de publicação

- Comando: `vercel deploy --yes --no-wait --target preview --scope luan-alves`.
- Deployment: `dpl_7kPXhYvwNk5C9CdEPUGLRMzGKypy`.
- [Inspeção e logs](https://vercel.com/luan-alves/timesheet-saas/7kPXhYvwNk5C9CdEPUGLRMzGKypy).
- A Vercel retornou `target: production` apesar do Preview explícito.
- Estado final: `ERROR`. O cancelamento foi solicitado quando o envio já havia
  terminado em erro; não houve publicação bem-sucedida.
- Logs confirmam pnpm 11.8.0, lockfile atualizado e Next.js 16.3.3 instalado.
  O build falhou ao carregar a configuração Prisma: `DIRECT_URL` ausente no
  ambiente Production. As variáveis continuam configuradas apenas em Preview.
- Uma repetição do comando foi bloqueada pela revisão automática por risco de
  novo deploy Production não autorizado. Nenhuma variável foi copiada para
  Production nessa tentativa.

### Configuração posterior autorizada

- O usuário autorizou configurar ambos os ambientes durante o desenvolvimento.
- As quatro variáveis e `ENABLE_EXPERIMENTAL_COREPACK` passaram a ter os escopos
  Preview e Production, preservando os valores cadastrados no painel.
- `DATABASE_URL` e `DIRECT_URL` permanecem do tipo Secret; as demais, Config.
- A proteção foi ampliada e verificada pela API: `ssoProtection.deploymentType: all`.
- Envio Production concluído: `dpl_DyrpyueCxNWopQeXMC2M4NBUbZgT`, estado **Ready**.
- [Aplicação](https://timesheet-saas-luan-alves.vercel.app).
- [URL desta versão](https://timesheet-saas-a2wclykga-luan-alves.vercel.app).
- [Logs da publicação](https://vercel.com/luan-alves/timesheet-saas/DyrpyueCxNWopQeXMC2M4NBUbZgT).
- Logs confirmam pnpm 11.8.0, Prisma Client 7.8.0 gerado no Linux, Next.js
  16.3.3, TypeScript e build concluídos. Deploy finalizado em 15/09/2026 às
  11h38 de Brasília.
- O acesso exige primeiro autorização pela Vercel e depois login na aplicação.
  Testes autenticados de login, entrada/saída e relatórios continuam pendentes;
  build bem-sucedido não comprova a conexão ao banco durante esses fluxos.

### Ajuste local após a publicação

Após relato de carregamento persistente ao fechar uma jornada do dia anterior,
o `ClockCard` deixou de disparar um `router.refresh()` redundante e passou a
encerrar o estado de envio em `finally`, com bloqueio síncrono de cliques
repetidos. Essa alteração é local e ainda não está no deployment acima.
A confirmação visual do cenário relatado permanece pendente; a suíte de domínio
não cobre o ciclo de renderização do navegador.

O AUD-006 adiciona uma migração para `time_entries.request_id`. Antes de
publicar essa versão, aplique `prisma migrate deploy` no banco de destino e
execute o fluxo autenticado com dois pares de sobreaviso e uma repetição da
mesma solicitação.
