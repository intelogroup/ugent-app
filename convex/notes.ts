import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getNotes = query({
  args: {
    userId: v.id("users"),
    limit: v.number(),
    offset: v.number(),
    search: v.optional(v.string()),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let notesQuery = ctx.db
      .query("notes")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));

    let notes = await notesQuery.order("desc").collect();

    if (args.search) {
      const searchLower = args.search.toLowerCase();
      notes = notes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchLower) ||
          note.content.toLowerCase().includes(searchLower)
      );
    }

    if (args.isPinned !== undefined) {
      notes = notes.filter((note) => note.isPinned === args.isPinned);
    }

    // Sort by pinned first, then by createdAt desc
    notes.sort((a, b) => {
      if (a.isPinned !== b.isPinned) {
        return a.isPinned ? -1 : 1;
      }
      return b.createdAt - a.createdAt;
    });

    return {
      notes: notes.slice(args.offset, args.offset + args.limit),
      total: notes.length,
    };
  },
});

export const createNote = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    tags: v.array(v.string()),
    questionId: v.optional(v.id("questions")),
    systemId: v.optional(v.id("systems")),
    topicId: v.optional(v.id("topics")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("notes", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      tags: args.tags,
      questionId: args.questionId,
      systemId: args.systemId,
      topicId: args.topicId,
      isPinned: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("notes"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    isPinned: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { noteId, ...updates } = args;
    await ctx.db.patch(noteId, {
      ...updates,
      updatedAt: Date.now(),
    });
    return true;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("notes"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.noteId);
    return true;
  },
});
