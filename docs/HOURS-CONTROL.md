# Controle mensal de horas do time

O controle mensal é opcional e existe apenas em espaços de empresa. Ele usa a
competência civil de `America/Sao_Paulo`, registra o total contratado, divide a
meta entre gestores e colaboradores e desconta os pares de ponto fechados.

## Ativação e configuração

Ao criar uma empresa, informe **Horas contratadas por mês** para ativar o
recurso. Também é possível abrir `Horas do time` e ativar o controle depois.
O owner configura os recursos em `Configurações > Recursos do espaço`:

- controle contratual de horas;
- exigência de aprovação para ajustes;
- notificações de mudança de meta ou turno;
- alertas de consumo e excedente.

Com a aprovação de ajustes desligada, uma correção válida é aplicada
automaticamente e não entra na fila de solicitações. O toggle tem efeito
imediato; solicitações que já estavam pendentes preservam seu estado.

## Operação mensal

Em `Horas do time`, o owner ou gestor pode trocar a competência, editar o pool
contratado, ajustar a distribuição individual, aplicar regras de turno e fechar
ou reabrir o mês. O primeiro rateio é igual entre os membros elegíveis; depois
que uma cota é editada manualmente, novos membros entram com zero até que o
gestor distribua sua cota.

Uma regra pode valer por um único dia ou por um intervalo, selecionar dias da
semana, informar horas diárias e identificar o turno. Sobreposições do mesmo
colaborador são bloqueadas. A pessoa recebe uma notificação com o intervalo,
turno e link para o detalhe. O mesmo painel mostra a barra de progresso,
consumo individual, excedentes e exportação em CSV, XLSX e PDF.

O colaborador pode consultar o resumo compartilhado e o detalhe de cada pessoa.
O detalhe mantém a competência na URL (`/team-hours/{memberId}?month=YYYY-MM`),
facilitando o compartilhamento entre gestores.

## Banco e publicação

Antes do deploy, aplique a migração `20260922120000_add_workspace_hours_control`
com `prisma migrate deploy`. Ela cria os orçamentos, rateios e regras, além dos
quatro toggles no espaço. As novas tabelas têm RLS habilitado e acesso direto
revogado para `anon` e `authenticated`; a aplicação acessa os dados pelo
servidor.

Depois da migração, valide uma empresa com colaboradores ativos, um par de
entrada/saída, uma alteração de cota, uma regra de turno, a notificação e as
três exportações. Não publique a branch sem autorização do responsável.
