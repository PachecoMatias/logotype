const mysqlShimUrl = new URL('./migration-lock-mysql-shim.mjs', import.meta.url).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'mysql2/promise' && context.parentURL !== mysqlShimUrl) {
    return {
      shortCircuit: true,
      url: mysqlShimUrl,
    };
  }

  return nextResolve(specifier, context);
}
