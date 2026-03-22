import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * Get the currently authenticated user
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

/**
 * Create or update a user (triggered by Auth)
 */
export const storeUser = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: args.name ?? existingUser.name,
        email: args.email ?? existingUser.email,
        image: args.image ?? existingUser.image,
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      image: args.image,
      tokenIdentifier: identity.tokenIdentifier,
      createdAt: Date.now(),
      plan: "trial",
    });
  },
});

/**
 * Get a user by their ID
 */
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

/**
 * Update user's Stripe information
 */
export const updateUserStripeInfo = mutation({
  args: {
    userId: v.optional(v.id("users")),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    stripePriceId: v.optional(v.string()),
    stripeCurrentPeriodEnd: v.optional(v.number()),
    subscriptionStatus: v.optional(v.union(
      v.literal("FREE"), 
      v.literal("ACTIVE"), 
      v.literal("PAST_DUE"), 
      v.literal("CANCELED"), 
      v.literal("TRIALING"), 
      v.literal("INCOMPLETE"), 
      v.literal("INCOMPLETE_EXPIRED"), 
      v.literal("UNPAID")
    )),
  },
  handler: async (ctx, args) => {
    const { userId, ...updateData } = args;
    
    let targetUserId = userId;
    
    if (!targetUserId && args.stripeCustomerId) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_stripe_customer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
        .unique();
      if (user) {
        targetUserId = user._id;
      }
    }
    
    if (!targetUserId) {
      throw new Error("User not found for Stripe update");
    }
    
    await ctx.db.patch(targetUserId, {
      ...updateData,
      updatedAt: Date.now(),
    });
    
    return targetUserId;
  },
});
