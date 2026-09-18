# Validação de segurança — AUD-001, AUD-002 e AUD-012

Data: 14/09/2026, atualizada em 18/09/2026. Escopo: versão local do Next.js,
proteção RLS do Supabase e condições dos três avisos vinculados aos cartões.
Esta análise não executou exploits nem verificou um ambiente de produção.

## Resultado

O pacote `next` já está na versão corrigida para os dois avisos neste checkout.
O projeto também usa ESLint 10.10.0; a compatibilidade do plugin React está
descrita ao final deste documento.

## AUD-012 — RLS e exposição da Data API

Data da validação: 18/09/2026.

O Jornix usa Supabase Auth no cliente, mas acessa os dados da aplicação pelo
Prisma no servidor. Por isso, as tabelas do schema `public` não precisam ficar
disponíveis para `anon` ou `authenticated` através do endpoint REST do
Supabase.

As migrações abaixo fecharam esse caminho:

- `20260918090000_lock_down_supabase_data_api` ativa RLS e revoga os grants de
  `anon` e `authenticated` nas 16 tabelas de negócio, nas sequências públicas e
  nos objetos futuros do Prisma.
- `20260918110000_lock_down_prisma_migrations_rls` ativa RLS e revoga os
  mesmos grants em `public._prisma_migrations`, que era o último alerta do
  Database Advisor.

O script `scripts/verify-rls.mjs` confirmou as 17 tabelas com
`rls_enabled: true`, `anon_can_select: false` e
`authenticated_can_select: false`. O teste público limitado a
`/_prisma_migrations?select=id&limit=1` respondeu HTTP `401` com o código
PostgreSQL `42501` (`permission denied for table _prisma_migrations`).

Para repetir a validação:

```bash
pnpm prisma migrate status
node scripts/verify-rls.mjs
```

No Windows PowerShell 5.1, execute
`powershell -ExecutionPolicy Bypass -File .\scripts\test-rls.ps1`.
O comando usa somente a chave pública do Supabase. A chave `service_role` não
deve ser usada no browser nem neste teste, porque ela ignora RLS.

Essa decisão segue as orientações do
[Supabase sobre RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
e sobre [segurança da Data API](https://supabase.com/docs/guides/api/securing-your-api).

| Evidência                                            | Versão |
| ---------------------------------------------------- | ------ |
| `package.json`: `dependencies.next`                  | 16.3.3 |
| `pnpm-lock.yaml`: importador e resolução de `next`   | 16.3.3 |
| `node_modules/next/package.json`                     | 16.3.3 |
| `package.json`: `devDependencies.eslint-config-next` | 16.3.3 |

O commit `160caec48ea1d425a809d89239dd6a87190de5ae` atualizou
`eslint-config-next` de 16.2.9 para 16.3.3. A atualização posterior do
workspace também colocou `next` em 16.3.3.

## AUD-001 — DoS em Server Actions

- Aviso: [GHSA-m99w-x7hq-7vfj / CVE-2026-64641](https://github.com/vercel/next.js/security/advisories/GHSA-m99w-x7hq-7vfj).
- Na linha 16, a faixa afetada é `>=16.0.0 <16.2.11`.
- A correção dessa linha começa em **16.2.11**.
- O aviso abrange App Router com pelo menos uma Server Action.
- O projeto usa `src/app` e ações com `"use server"` em login, cadastro,
  configurações e registro de ponto. Há chamadas dessas ações nos formulários
  e componentes, como `src/app/login/login-form.tsx` e
  `src/components/shared/clock-card.tsx`.

Conclusão: **o requisito de versão está atendido no workspace**. A exploração
não foi testada.

## AUD-002 — RCE em Windows

- Aviso: [GHSA-p293-qw3h-jr36 / CVE-2026-75604](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36).
- Na linha 16, a faixa afetada é `>=16.0 <16.3.3`.
- A correção dessa linha começa em **16.3.3**.
- O aviso descreve servidores em filesystem Windows, usando Pages Router
  ou App Router sem Cache Components.
- Este ambiente de desenvolvimento é Windows. O projeto usa App Router e
  `next.config.ts` não habilita `cacheComponents`.
- O usuário confirmou que a aplicação roda **somente localmente no Windows**;
  não há implantação de produção informada. A exposição de rede do servidor
  local não foi verificada.

Conclusão: **a versão mínima corrigida está presente no workspace**.
Não há exposição de produção a validar no cenário informado. O alcance de
rede e a exploração efetiva não foram testados; não há evidência de exploração
nesta análise.

## Correção recomendada e Vercel

Para concluir a validação do projeto, execute na raiz:

```bash
pnpm update next@16.3.3 eslint-config-next@16.3.3 --save-exact
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

O comando deve atualizar `package.json`, `pnpm-lock.yaml` e a instalação local
ao mesmo tempo. Não basta alterar apenas o manifesto. A Vercel instala a
versão registrada no lockfile; um lockfile desatualizado pode fazer o build
falhar ou resolver uma versão diferente da esperada.

Na Vercel, configure as variáveis `DATABASE_URL`, `DIRECT_URL`,
`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em cada ambiente
(Preview e Production). O runtime padrão das Functions da Vercel é Node.js em
ambiente Linux; isso elimina a condição específica do aviso de RCE em
filesystem Windows para a implantação, mas não elimina a necessidade de
corrigir o DoS nem de manter o Next.js atualizado. Se necessário, fixe a major
do Node em `package.json` com `engines.node` e alinhe a mesma versão no projeto
da Vercel.

O build local de produção foi validado com sucesso em 14/09/2026 usando
Next.js 16.3.3: compilação Turbopack, TypeScript, coleta de dados, geração de
páginas estáticas e otimização de rotas concluídas. Depois do primeiro deploy,
confirme no log da Vercel a versão instalada e faça smoke tests de login,
registro de ponto e relatórios. Só então marque os critérios de aceite dos
cartões como concluídos.

O smoke test local também foi executado com `next start`: `/login` e
`/register` responderam `200`, e as rotas `/`, `/dashboard`, `/reports`,
`/settings`, `/time-entries` e `/on-call` redirecionaram usuários não
autenticados para `/login` com `307`. Não foram usados dados de usuário nem
credenciais durante o teste.

## O que falta para encerrar os cartões

1. Ambiente confirmado: somente local Windows, com Next.js 16.3.3 instalado.
2. Manter `next` em uma versão estável corrigida. **16.3.3 é o mínimo
   da linha 16 que cobre estes dois avisos**, não uma declaração de ausência
   de outras vulnerabilidades. Manter `eslint-config-next` alinhado.
3. Manter manifesto e lockfile alinhados, conferir a versão resolvida após
   instalação e reconstruir/reiniciar a aplicação.
4. Executar testes, lint, TypeScript e build com a versão corrigida.
5. Validar login, registro de ponto e relatórios localmente. Quando houver
   publicação, verificar também a versão efetiva no servidor.

Os critérios de versão, o build local e os smoke tests de roteamento estão
atendidos. Ainda faltam testar fluxos autenticados com uma conta de teste e
validar o deploy na Vercel quando ele existir. A validação de implantação não
se aplica ao cenário atual, que é apenas local.

### Nota sobre ESLint 10

O projeto usa ESLint 10.10.0. A versão atual do `eslint-plugin-react`, trazida
por `eslint-config-next@16.3.3`, ainda tenta chamar `context.getFilename()`, uma
API removida no ESLint 10. `eslint.config.mjs` informa explicitamente React
19.2 para evitar essa autodetecção incompatível. O workaround pode ser removido
quando o plugin publicar uma versão compatível.

## Atualização de implantação — 15/09/2026

Após autorização do responsável para usar ambos os ambientes durante o
desenvolvimento, Production foi publicado na Vercel com sucesso:

- Deployment: `dpl_DyrpyueCxNWopQeXMC2M4NBUbZgT`, estado **Ready**.
- [Evidência de build](https://vercel.com/luan-alves/timesheet-saas/DyrpyueCxNWopQeXMC2M4NBUbZgT):
  Next.js **16.3.3**, pnpm **11.8.0**, geração Prisma e TypeScript concluídos.
- Vercel Authentication configurada para **All Deployments**, incluindo Production.
- Variáveis compartilhadas entre Preview e Production, mantendo as conexões
  de banco como segredos. Separação dos dados reais antes do lançamento permanece
  recomendada em `DEPLOYMENT.md`.

Assim, a conferência da versão no build publicado está atendida para os dois
avisos analisados. Os fluxos autenticados e a conexão ao banco em execução ainda
não foram verificados; os cartões não devem ser encerrados como totalmente
validados apenas pelo sucesso do deploy.
