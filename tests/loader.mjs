const extensionCandidates = [".ts", ".tsx", ".js", ".mjs"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".") && !specifier.startsWith("/")) {
      throw error;
    }

    for (const extension of extensionCandidates) {
      try {
        return await nextResolve(`${specifier}${extension}`, context);
      } catch {
        // Continua tentando as extensões suportadas pelo código do projeto.
      }
    }

    throw error;
  }
}
