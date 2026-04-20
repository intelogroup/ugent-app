// Prisma has been removed in favor of Convex.
// This file exists only to prevent breakages in routes that haven't been migrated yet.
export const prisma: any = new Proxy({}, {
  get: () => {
    throw new Error('Prisma has been removed. This route has not been migrated to Convex yet.');
  }
});
