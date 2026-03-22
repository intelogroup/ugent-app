import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(), // From AuthKit/WorkOS
    telegramId: v.optional(v.string()),
    whatsappPhone: v.optional(v.string()),
    plan: v.optional(v.union(v.literal("trial"), v.literal("pro"), v.literal("expired"))),
    stripeCustomerId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_email", ["email"]),

  threads: defineTable({
    userId: v.string(), // tokenIdentifier or user ID string
    title: v.optional(v.string()),
    platform: v.optional(v.string()),
    lastMessage: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_thread", ["threadId", "createdAt"]),

  bookmarks: defineTable({
    userId: v.string(),
    messageId: v.id("messages"),
    threadId: v.id("threads"),
    question: v.string(),
    answer: v.string(),
    createdAt: v.number(),
  }).index("by_user", ["userId", "createdAt"]),

  // --- USMLE Pareto Ingestion Engine Tables ---

  ingestions: defineTable({
    rawText: v.string(),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    processedCount: v.number(),
    totalCount: v.number(),
    error: v.optional(v.string()),
    createdAt: v.number(),
  }),

  questions: defineTable({
    text: v.string(),
    correctAnswer: v.string(),
    options: v.array(v.object({
      text: v.string(),
      isCorrect: v.boolean(),
    })),
    explanation: v.string(),
    educationalObjective: v.optional(v.string()),
    subject: v.optional(v.string()),
    system: v.optional(v.string()),
    ingestionId: v.optional(v.id("ingestions")),
    // Legacy fields (optional to maintain compatibility)
    difficulty: v.optional(v.string()),
    systemId: v.optional(v.string()),
    topicId: v.optional(v.string()),
    subjectId: v.optional(v.string()),
  }).index("by_ingestionId", ["ingestionId"])
    .index("by_difficulty", ["difficulty"]),

  extracted_patterns: defineTable({
    questionId: v.id("questions"),
    diseaseName: v.string(),
    mechanism: v.string(),
    highLeverageClues: v.array(v.string()),
    discriminators: v.array(v.object({
      distractor: v.string(),
      ruleOutFact: v.string(),
    })),
    nextBestStep: v.optional(v.string()),
    clinicalContext: v.object({
      age: v.optional(v.string()),
      gender: v.optional(v.string()),
      physiologyState: v.optional(v.string()),
      onsetPattern: v.optional(v.string()),
    }),
    keySymptoms: v.array(v.string()),
    prerequisites: v.array(v.string()),
    tableData: v.optional(v.array(v.any())),
  }).index("by_questionId", ["questionId"])
    .index("by_diseaseName", ["diseaseName"]),

  pattern_frequencies: defineTable({
    type: v.string(), // "DISEASE" | "CLUE" | "SUBJECT" | "SYSTEM" | "CONTEXT"
    name: v.string(),
    count: v.number(),
    lastSeenAt: v.number(),
  }).index("by_type_name", ["type", "name"])
    .index("by_count", ["count"]),

  knowledge_dependencies: defineTable({
    from: v.string(),
    to: v.string(),
    strength: v.number(),
  }).index("by_from_to", ["from", "to"]),

  // Legacy tables - to be removed in Task 5
  diagnosticPatterns: defineTable({
    questionId: v.id("questions"),
    diseaseName: v.string(),
    clues: v.array(v.string()),
    distractors: v.array(v.string()),
    clinicalContext: v.object({
      ageRange: v.optional(v.string()),
      geography: v.optional(v.string()),
      typicalProfessions: v.optional(v.string()),
      onsetPattern: v.optional(v.string()),
    }),
    keySymptoms: v.array(v.string()),
  }).index("by_questionId", ["questionId"])
    .index("by_diseaseName", ["diseaseName"]),

  patternFrequencies: defineTable({
    type: v.string(),
    name: v.string(),
    count: v.number(),
    lastSeenAt: v.number(),
  }).index("by_type_name", ["type", "name"])
    .index("by_count", ["count"]),
});
