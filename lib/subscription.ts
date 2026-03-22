// @ts-nocheck
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

export async function getUserSubscriptionStatus(userId: string) {
  try {
    const user = await fetchQuery(api.users.getUserById, { 
      userId: userId as Id<"users"> 
    });

    if (!user) {
      return null;
    }

    const isPremium = user.subscriptionStatus === 'ACTIVE' &&
      user.stripeCurrentPeriodEnd &&
      user.stripeCurrentPeriodEnd > Date.now();

    return {
      isPremium,
      subscriptionStatus: user.subscriptionStatus,
      currentPeriodEnd: user.stripeCurrentPeriodEnd,
    };
  } catch (error) {
    console.error("Error fetching user subscription status from Convex:", error);
    return null;
  }
}

export async function checkPremiumAccess(userId: string): Promise<boolean> {
  const status = await getUserSubscriptionStatus(userId);
  return status?.isPremium ?? false;
}
