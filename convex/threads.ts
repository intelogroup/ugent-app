import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

/**
 * List recent threads with preview
 */
export const listRecentThreadsWithPreview = query({
  args: {
    userId: v.string(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .order("desc")
      .take(args.limit);
  },
});

/**
 * Get all threads for a user
 */
export const getThreads = query({
  args: {
    userId: v.string(), // Support both v.id("users") and string tokenIdentifier
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;
    const offset = args.offset ?? 0;

    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .order("desc")
      .collect();

    return {
      threads: threads.slice(offset, offset + limit),
      total: threads.length,
    };
  },
});

/**
 * Get messages for a thread
 */
export const getMessages = query({
  args: {
    threadId: v.id("threads"),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50;
    const offset = args.offset ?? 0;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("desc") // Order by newest first for slicing
      .collect();

    // Reverse for display if needed, but here we return for API
    const sliced = messages.slice(offset, offset + limit);
    // Return in ascending order for the API
    return sliced.sort((a, b) => a.createdAt - b.createdAt);
  },
});

/**
 * Send a message and update thread
 */
export const sendMessage = mutation({
  args: {
    threadId: v.id("threads"),
    content: v.optional(v.string()),
    text: v.optional(v.string()), // Alias for content
    userId: v.optional(v.string()), // Optional for verification
    role: v.optional(v.union(v.literal("user"), v.literal("assistant"))),
  },
  handler: async (ctx, args) => {
    const content = args.text || args.content || "";
    const role = args.role || "user";

    const messageId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      content,
      role,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.threadId, {
      lastMessage: content,
      updatedAt: Date.now(),
    });

    return messageId;
  },
});

/**
 * Create a new thread
 */
export const create = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
    platform: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("threads", {
      userId: args.userId as any,
      title: args.title,
      platform: args.platform,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});

/**
 * Find or create a thread for a specific conversation
 * This is a helper for the API route that uses user-to-user logic
 */
export const findOrCreateThread = mutation({
  args: {
    userId: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", args.userId as any))
      .filter((q) => q.eq(q.field("title"), args.title))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("threads", {
      userId: args.userId as any,
      title: args.title,
      updatedAt: Date.now(),
      createdAt: Date.now(),
    });
  },
});
