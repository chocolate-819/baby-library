import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// ==================== 系统表（必须保留）====================
export const healthCheck = pgTable("health_check", {
  id: integer("id").primaryKey(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// ==================== 书籍分级表 ====================
export const bookLevels = pgTable(
  "book_levels",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 50 }).notNull(),
    description: text("description"),
    order: integer("order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("book_levels_order_idx").on(table.order)]
);

// ==================== 书籍表 ====================
export const books = pgTable(
  "books",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    title: varchar("title", { length: 255 }).notNull(),
    coverImage: text("cover_image"),
    description: text("description"),
    levelId: integer("level_id").notNull(),
    totalPages: integer("total_pages").default(0),
    order: integer("order").notNull().default(0),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("books_level_id_idx").on(table.levelId),
    index("books_order_idx").on(table.order),
  ]
);

// ==================== 书籍资源关联表 ====================
export const bookResources = pgTable(
  "book_resources",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    bookId: integer("book_id").notNull(),
    resourceType: varchar("resource_type", { length: 20 }).notNull(), // pdf, audio, video
    baiduPath: text("baidu_path").notNull(), // 百度网盘文件路径
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size").default(0), // 文件大小（字节）
    duration: integer("duration").default(0), // 音视频时长（秒）
    downloadUrl: text("download_url"), // 临时下载链接
    urlExpiresAt: timestamp("url_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("book_resources_book_id_idx").on(table.bookId),
    index("book_resources_type_idx").on(table.resourceType),
  ]
);

// ==================== 用户阅读进度表 ====================
export const userReadingProgress = pgTable(
  "user_reading_progress",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 100 }).notNull(), // 设备ID
    bookId: integer("book_id").notNull(),
    currentPage: integer("current_page").default(0),
    completed: boolean("completed").default(false).notNull(),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_reading_progress_user_id_idx").on(table.userId),
    index("user_reading_progress_book_id_idx").on(table.bookId),
  ]
);

// ==================== 游戏关卡表 ====================
export const gameLevels = pgTable(
  "game_levels",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    requiredBooksCount: integer("required_books_count").notNull().default(1), // 需要完成的书籍数量
    levelId: integer("level_id").notNull(), // 关联的书籍分级ID
    order: integer("order").notNull().default(0),
    reward: text("reward"), // 奖励描述
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("game_levels_level_id_idx").on(table.levelId),
    index("game_levels_order_idx").on(table.order),
  ]
);

// ==================== 用户游戏进度表 ====================
export const userGameProgress = pgTable(
  "user_game_progress",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 100 }).notNull(),
    gameLevelId: integer("game_level_id").notNull(),
    completed: boolean("completed").default(false).notNull(),
    stars: integer("stars").default(0), // 星级评价 0-3
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [
    index("user_game_progress_user_id_idx").on(table.userId),
    index("user_game_progress_game_level_id_idx").on(table.gameLevelId),
  ]
);

// ==================== 百度网盘授权表 ====================
export const baiduTokens = pgTable(
  "baidu_tokens",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    userId: varchar("user_id", { length: 100 }).notNull().unique(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => [index("baidu_tokens_user_id_idx").on(table.userId)]
);

// ==================== Zod Schemas ====================
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Book Levels
export const insertBookLevelSchema = createCoercedInsertSchema(bookLevels).pick({
  name: true,
  description: true,
  order: true,
});

export const updateBookLevelSchema = createCoercedInsertSchema(bookLevels)
  .pick({
    name: true,
    description: true,
    order: true,
  })
  .partial();

// Books
export const insertBookSchema = createCoercedInsertSchema(books).pick({
  title: true,
  coverImage: true,
  description: true,
  levelId: true,
  totalPages: true,
  order: true,
});

export const updateBookSchema = createCoercedInsertSchema(books)
  .pick({
    title: true,
    coverImage: true,
    description: true,
    levelId: true,
    totalPages: true,
    order: true,
    isActive: true,
  })
  .partial();

// Book Resources
export const insertBookResourceSchema = createCoercedInsertSchema(bookResources).pick({
  bookId: true,
  resourceType: true,
  baiduPath: true,
  fileName: true,
  fileSize: true,
  duration: true,
});

// User Reading Progress
export const insertUserReadingProgressSchema = createCoercedInsertSchema(userReadingProgress).pick({
  userId: true,
  bookId: true,
  currentPage: true,
  completed: true,
});

export const updateUserReadingProgressSchema = createCoercedInsertSchema(userReadingProgress)
  .pick({
    currentPage: true,
    completed: true,
    lastReadAt: true,
  })
  .partial();

// Game Levels
export const insertGameLevelSchema = createCoercedInsertSchema(gameLevels).pick({
  name: true,
  description: true,
  requiredBooksCount: true,
  levelId: true,
  order: true,
  reward: true,
});

// User Game Progress
export const insertUserGameProgressSchema = createCoercedInsertSchema(userGameProgress).pick({
  userId: true,
  gameLevelId: true,
  completed: true,
  stars: true,
});

// Baidu Tokens
export const insertBaiduTokenSchema = createCoercedInsertSchema(baiduTokens).pick({
  userId: true,
  accessToken: true,
  refreshToken: true,
  expiresAt: true,
});

// ==================== TypeScript Types ====================
export type BookLevel = typeof bookLevels.$inferSelect;
export type InsertBookLevel = z.infer<typeof insertBookLevelSchema>;

export type Book = typeof books.$inferSelect;
export type InsertBook = z.infer<typeof insertBookSchema>;
export type UpdateBook = z.infer<typeof updateBookSchema>;

export type BookResource = typeof bookResources.$inferSelect;
export type InsertBookResource = z.infer<typeof insertBookResourceSchema>;

export type UserReadingProgress = typeof userReadingProgress.$inferSelect;
export type InsertUserReadingProgress = z.infer<typeof insertUserReadingProgressSchema>;
export type UpdateUserReadingProgress = z.infer<typeof updateUserReadingProgressSchema>;

export type GameLevel = typeof gameLevels.$inferSelect;
export type InsertGameLevel = z.infer<typeof insertGameLevelSchema>;

export type UserGameProgress = typeof userGameProgress.$inferSelect;
export type InsertUserGameProgress = z.infer<typeof insertUserGameProgressSchema>;

export type BaiduToken = typeof baiduTokens.$inferSelect;
export type InsertBaiduToken = z.infer<typeof insertBaiduTokenSchema>;
