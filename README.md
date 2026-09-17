# Jornix Timesheet SaaS

Jornix é uma aplicação web para registro de ponto, cálculo de jornada e
acompanhamento de horas trabalhadas. O produto usa o horário civil de
`America/Sao_Paulo` para registrar e exibir os pontos.

## Estado atual

### Funcionalidades disponíveis

- Cadastro e login com Supabase Auth.
- Dashboard com jornada do dia, semana e mês.
- Registro alternado de entrada e saída, preservando entradas abertas após meia-noite.
- Proteção contra registros duplicados em cliques repetidos e requisições concorrentes.
- Lista dos registros do dia.
- Cálculo de horas normais e horas extras de 75% e 100%.
- Em dias úteis, as primeiras 2h extras são 75% e o excedente é 100%; fins de
  semana e feriados são apurados integralmente como 100%.
- Relatórios por intervalo com resumo e detalhamento diário.
- Configuração de jornada, carga semanal e dados salariais.
- Tema claro e escuro.
- Layout responsivo com navegação lateral no desktop e inferior no mobile.
- Página inicial de sobreaviso preparada para a integração do domínio.
- Espaços pessoais e empresas independentes na mesma conta, com seleção de
  espaço e permissões por vínculo.
- Convites por email, solicitação por código da empresa e definição do gestor
  pelo responsável da empresa.
- Ajustes de ponto por movimento, com motivo obrigatório, histórico imutável,
  confirmação individual ou em lote e opção de ajuste provisório por
  esquecimento.
- Fechamento mensal por pessoa e espaço, reabertura justificada e histórico de
  auditoria.

### Pendências conhecidas

- O sobreaviso ainda usa dados demonstrativos e não entra nos totais reais.
- O painel de notificações ainda está reservado para uma próxima integração.
- O workflow de CI está preparado em `.github/workflows/ci.yml` e a conexão
  GitHub → Vercel está confirmada. Falta enviar o workflow e validar a primeira
  execução da CI e o primeiro deploy automático.

As pendências visuais e de produto estão detalhadas em
[`docs/UI-PENDING.md`](docs/UI-PENDING.md).

## Stack

- Next.js 16 com App Router e React 19.
- TypeScript.
- Tailwind CSS e componentes baseados em shadcn/ui.
- Prisma 7 com PostgreSQL.
- Supabase Auth.
- Luxon para datas, horários e fuso.
- Node.js Test Runner para testes unitários determinísticos.

## Rotas principais

| Rota            | Descrição                                           |
| --------------- | --------------------------------------------------- |
| `/login`        | Entrada na aplicação                                |
| `/register`     | Criação de conta                                    |
| `/dashboard`    | Resumo da jornada e registros recentes              |
| `/time-entries` | Consulta e registro de ponto                        |
| `/reports`      | Relatórios consolidados por período                 |
| `/settings`     | Jornada, carga horária e salário                    |
| `/on-call`      | Área visual preparada para sobreaviso               |
| `/workspaces`   | Espaços, equipe, convites e permissões              |
| `/adjustments`  | Ajustes de movimentos, decisões e fechamento mensal |

## Organização do código

```text
src/
├─ app/                 # Rotas, páginas e server actions
├─ components/
│  ├─ shared/           # Navegação, dashboard e componentes compartilhados
│  └─ ui/               # Primitivos visuais reutilizáveis
├─ lib/                 # Autenticação, datas, formatação e utilitários
├─ schemas/             # Validações de entrada com Zod
└─ services/            # Regras de negócio e acesso aos dados

prisma/schema.prisma    # Modelo PostgreSQL
tests/                  # Testes unitários
docs/                   # Documentação complementar
```

O dashboard separa a resolução dos parâmetros, o carregamento paralelo dos
dados e a construção do modelo visual em
`src/app/(authenticated)/dashboard/_lib/`.

Cada conta recebe um espaço pessoal durante a migração. Os registros existentes
continuam nesse espaço e não são copiados para uma empresa. Um usuário pode
participar de várias empresas, mas os serviços autenticados validam o
`workspaceId` e o vínculo ativo antes de ler ou alterar uma jornada. Salário e
jornada continuam pessoais e não são expostos a gestores.

Os movimentos originais são somente de leitura depois de gravados. Uma correção
é uma solicitação separada, que pode alterar o horário efetivo após aprovação,
sem apagar o histórico. A mesma projeção efetiva é usada no relógio, nos
relatórios e no cálculo de horas extras. A migração
`20260916190000_workspaces_adjustments_closures` faz o preenchimento inicial;
valide o banco antes de aplicá-la em produção.

## Configuração local

### Requisitos

- Node.js 24.x (aplicação e testes).
- pnpm 11.8.0, fixado no `package.json`.
- Projeto Supabase com PostgreSQL disponível.

### Instalação

```bash
pnpm install --frozen-lockfile
```

Copie `.env.example` para `.env` e preencha:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

`DATABASE_URL` é usada pelas consultas normais através do pooler. `DIRECT_URL`
é usada pelo Prisma nas migrações e precisa estar definida ao carregar sua
configuração durante a geração do cliente no build.

### Banco de dados

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

O cliente Prisma é gerado em `generated/prisma`.

Depois de revisar o SQL da migração e fazer o backup do ambiente, a aplicação
em um banco já existente usa `pnpm prisma migrate deploy`. O build não aplica
migrações automaticamente.

### Desenvolvimento

```bash
pnpm dev
```

A aplicação fica disponível em <http://localhost:3000>.

## Scripts

```bash
pnpm dev       # servidor de desenvolvimento
pnpm build     # gera o cliente Prisma e cria o build de produção
pnpm start     # inicia o build de produção
pnpm lint      # ESLint
pnpm format    # formata código e documentação com Prettier
pnpm format:check # verifica formatação sem alterar arquivos
pnpm test      # testes unitários
```

Os testes unitários cobrem cálculo de jornada, horas extras, datas brasileiras,
formatação, validação de relatórios e autenticação. O detalhamento está em
[`docs/TESTING.md`](docs/TESTING.md).

## Datas e fuso horário

O fuso funcional do produto é definido em `src/lib/constants.ts` como
`America/Sao_Paulo`. Entradas, saídas, relógio ao vivo e definição de “hoje”
usam esse fuso.

As colunas SQL do tipo `DATE` são normalizadas internamente para UTC apenas no
momento da persistência e da consulta. Isso evita que o horário do servidor
exclua o primeiro dia de um relatório; não altera o horário exibido ao usuário.

Uma entrada sem saída continua aberta no dia seguinte. A saída usa o horário
atual e fecha a jornada da entrada original; não é retroativa. O histórico
“Registros de hoje” considera o instante do movimento, enquanto a apuração
permanece na data da jornada. A interface avisa quando a entrada é de outro dia.

## Deploy na Vercel

O preparo, as quatro variáveis necessárias e a validação após a publicação
estão em [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). O build gera o cliente
Prisma, mas não aplica migrações automaticamente.

## Documentação complementar

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): responsabilidades das camadas
  e fluxo dos principais dados.
- [`docs/TESTING.md`](docs/TESTING.md): estratégia, comandos e cobertura atual.
- [`docs/UI-PENDING.md`](docs/UI-PENDING.md): pendências de produto e interface.
- [`docs/WORKSPACES-AND-ADJUSTMENTS.md`](docs/WORKSPACES-AND-ADJUSTMENTS.md):
  regras de espaços, ajustes, permissões e fechamento.

## Próximos passos

- Implementar o domínio de sobreaviso e substituir os mocks.
- Adicionar notificações persistidas.
- Criar testes de componentes e fluxos E2E.
- Configurar CI/CD com lint, TypeScript, testes e build.
- Evoluir permissões para os perfis administrador, gestor e colaborador.
