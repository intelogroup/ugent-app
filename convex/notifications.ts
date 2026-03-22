import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getNotifications = query({
  args: {
    userId: v.id("users"),
    limit: v.number(),
    offset: v.number(),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const unreadCount = await ctx.db
      .query("notifications")
      .withIndex("by_user_read", (q) => q.eq("userId", args.userId).eq("isRead", false))
      .collect();

    return {
      notifications: notifications.slice(args.offset, args.offset + args.limit),
      unreadCount: unreadCount.length,
      total: notifications.length,
    };
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return true;
  },
});

export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    title: v.string(),
    content: v.string(),
    relatedUserId: v.optional(v.string()),
    relatedEntityId: v.optional(v.string()),
    relatedEntityType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      title: args.title,
      content: args.content,
      isRead: false,
      relatedUserId: args.relatedUserId,
      relatedEntityId: args.relatedEntityId,
      relatedEntityType: args.relatedEntityType,
      createdAt: Date.now(),
    });
    return notificationId;
  },
});
