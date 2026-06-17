export async function getOrCreateCorsairTenant(userId: string) {
  const existing = await db.query.corsairConnections.findFirst({
    where: eq(corsairConnections.userId, userId),
  });

  if (existing) {
    return getCorsairInstance().tenant(existing.corsairAccountId);
  }

  const inst = getCorsairInstance();

  const tenant = await inst.tenants.create(userId);

  await db.insert(corsairConnections).values({
    userId,
    corsairAccountId: tenant.id,
  });
 
  return inst.tenant(tenant.id);
}