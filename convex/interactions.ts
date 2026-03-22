import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const track = mutation({
  args: {
    userId: v.id("users"),
    actionType: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    testId: v.optional(v.id("tests")),
    questionId: v.optional(v.id("questions")),
    answerId: v.optional(v.id("answers")),
    metadata: v.optional(v.string()),
    durationMs: v.optional(v.number()),
    clientIP: v.optional(v.string()),
    userAgent: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("user_interactions", {
      ...args,
      createdAt: Date.now(),
    });
  },
});
