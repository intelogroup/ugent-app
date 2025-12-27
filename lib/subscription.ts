import { prisma } from './prisma';

export async function getUserSubscriptionStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
      stripePriceId: true,
    },
  });

  if (!user) {
    return null;
  }

  const isPremium = user.subscriptionStatus === 'ACTIVE' &&
    user.stripeCurrentPeriodEnd &&
    user.stripeCurrentPeriodEnd.getTime() > Date.now();

  return {
    isPremium,
    subscriptionStatus: user.subscriptionStatus,
    currentPeriodEnd: user.stripeCurrentPeriodEnd,
  };
}

export async function checkPremiumAccess(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status?.isPremium ?? false;
}
