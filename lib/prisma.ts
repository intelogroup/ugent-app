// Legacy stub — these routes have not been migrated to Convex yet.
// They will throw at runtime but compile cleanly.
export const prisma: any = new Proxy({}, {
  get() {
    throw new Error('Prisma has been removed. This route has not been migrated to Convex yet.');
  }
});
