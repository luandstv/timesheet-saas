# Estratégia de testes

## Comando atual

```bash
pnpm test
```

Use Node.js 24.x e pnpm 11.8.0, conforme `package.json`. Os testes executam
TypeScript com o suporte nativo de remoção de tipos do Node.js.

O projeto usa o `node:test`, runner nativo e estável do Node.js. Um loader
pequeno em `tests/loader.mjs` permite que os testes executem módulos TypeScript
com os imports relativos usados pelas regras de domínio, sem adicionar outra
dependência de transformação.

## Cobertura atual

Os testes em `tests/` cobrem 40 cenários:

- normalização de datas civis no fuso brasileiro;
- intervalos inclusivos para colunas SQL `DATE`;
- cálculo dos 50 minutos de uma entrada e saída;
- limite de hora extra de 75% e excedente de 100%;
- trabalho em fim de semana;
- entrada sem saída correspondente;
- formatação longa e compacta de duração;
- parâmetros repetidos e intervalos inválidos nos relatórios;
- validação de login e confirmação de senha.
- continuidade de uma entrada aberta após meia-noite e recálculo na folha original;
- nova entrada somente após fechar o ponto anterior;
- isolamento por usuário e bloqueio de folhas não abertas;
- histórico de hoje incluindo saídas vinculadas à jornada de ontem;
- aviso de entrada pendente usando a data brasileira, inclusive na virada UTC.
- limite de 2h a 75% aplicado uma única vez por jornada, inclusive com vários
  intervalos e mudança de faixa FHC/FHCN;
- divisão explícita de 5h extras em 2h a 75% e 3h a 100% em dia útil;
- independência do limite entre jornadas e tratamento integral de 100% em
  feriados.
- idempotência de solicitações repetidas e serialização de solicitações
  concorrentes do mesmo usuário;
- suporte a múltiplos pares legítimos de entrada e saída na mesma jornada.

Os testes são unitários e não acessam PostgreSQL, Supabase ou o navegador.
Isso mantém a execução rápida e determinística.

`time-entry.test.mjs` executa os serviços reais de registro e cálculo com
Prisma em memória. O loader em `tests/fixtures/` intercepta a infraestrutura
antes de carregar banco ou `.env`. Esses testes não substituem uma verificação
de integração com PostgreSQL nem cobrem requisições concorrentes.

## Verificações complementares

```bash
node node_modules/typescript/bin/tsc --noEmit
pnpm lint
git diff --check
```

O lint pode emitir um aviso do TanStack Table sobre a compatibilidade de
`useReactTable` com o React Compiler. Esse aviso não impede a execução.

## Próxima camada

Para aumentar a confiança da aplicação, os próximos testes devem cobrir:

- componentes de formulário com React Testing Library;
- fluxo de atualização de configurações;
- integração das Server Actions com Prisma usando banco de teste;
- fluxos E2E com Playwright para login, entrada, saída e relatórios.

Server Components assíncronos devem ser verificados preferencialmente por
testes E2E, pois não são totalmente suportados pelos runners de unidade.
