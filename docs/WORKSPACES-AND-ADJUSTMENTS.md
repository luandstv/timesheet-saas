# Espaços, ajustes e fechamento mensal

## Espaços

Uma conta pode ter o espaço pessoal, usado para trabalho autônomo, e participar
de várias empresas. O cookie `jornix-workspace` só escolhe o espaço da sessão;
ele não concede acesso. Toda leitura e toda alteração verifica a associação do
usuário no banco.

O proprietário da empresa cria convites e define o gestor de cada colaborador.
Também pode compartilhar o código da empresa para que a pessoa solicite
entrada. A solicitação fica pendente até uma decisão do proprietário. O gestor
revisa apenas colaboradores ativos ligados a ele; o proprietário revisa toda a
empresa. Um papel legado em `users.role` não concede acesso entre espaços.

Desativar um vínculo mantém o histórico próprio em modo de leitura e bloqueia
novos pontos. O sistema exige que um ponto aberto seja encerrado ou ajustado
antes da desativação. Pendências continuam auditadas e ficam sob decisão do
proprietário.

## Ajustes

`TimeEntry` é o registro bruto e não deve ser atualizado ou apagado. A tabela
`adjustment_requests` guarda uma solicitação para uma entrada, saída ou
inclusão. A decisão é registrada no próprio pedido e também em
`workspace_audit`; triggers impedem mutações posteriores do histórico.

Uma solicitação comum só afeta a projeção efetiva depois da aprovação. O
proprietário pode habilitar o modo provisório: apenas uma correção de horário
marcada como esquecimento aparece na apuração enquanto aguarda confirmação.
Inclusões e exclusões continuam pendentes. Cancelar uma solicitação provisória
remove seu efeito sem tocar no registro bruto.

Antes de confirmar, a projeção efetiva das jornadas afetadas é validada: entradas
e saídas precisam alternar, não podem se sobrepor, não podem estar no futuro e
uma saída deve pertencer à mesma jornada da entrada. Dados históricos de outra
jornada não bloqueiam uma correção válida; eles continuam preservados para
auditoria e podem ser tratados em uma revisão própria. O cálculo de horas
normais, 75% e 100% consome essa projeção validada.

## Fechamento

O fechamento é individual por espaço e mês civil de `America/Sao_Paulo`. Pontos
abertos ou ajustes pendentes impedem o fechamento. A confirmação grava um
snapshot dos totais e aprova as folhas do período. Gestores fecham seus
colaboradores; o proprietário pode fechar qualquer pessoa e reabrir o mês com
motivo obrigatório. Cada decisão aparece no histórico do espaço.

## Publicação segura

Revise a migração antes de `prisma migrate deploy`. Ela cria os espaços pessoais
para as contas existentes e preenche `time_sheets.workspace_id` com o próprio
usuário, preservando os dados. Faça backup e valide a contagem de folhas,
usuários e vínculos antes e depois da aplicação.
