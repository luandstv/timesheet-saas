// Este loader só é registrado pelo teste do serviço. Intercepta Prisma antes
// que o módulo real carregue .env ou abra uma conexão com PostgreSQL.
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@/lib/prisma") {
    return {
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(
        'if (!globalThis.__timeEntryTestPrisma) throw new Error("Prisma fake não foi instalado"); export default globalThis.__timeEntryTestPrisma;',
      )}`,
    };
  }

  if (specifier.startsWith("@/")) {
    return nextResolve(
      new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href,
      context,
    );
  }

  return nextResolve(specifier, context);
}
