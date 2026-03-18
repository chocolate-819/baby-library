import express from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertUserReadingProgressSchema } from '../storage/database/shared/schema';

const router = express.Router();

/**
 * 获取用户阅读进度列表
 * GET /api/v1/progress
 * Query: userId (required)
 */
router.get('/', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 获取阅读进度
  const { data: progressList, error } = await client
    .from('user_reading_progress')
    .select('*')
    .eq('user_id', userId as string)
    .order('last_read_at', { ascending: false });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 获取书籍信息
  if (!progressList || progressList.length === 0) {
    return res.json({ data: [] });
  }

  const bookIds = progressList.map(p => p.book_id);
  const { data: books } = await client
    .from('books')
    .select('id, title, cover_image, total_pages')
    .in('id', bookIds);

  const bookMap = new Map(books?.map(b => [b.id, b]) || []);

  // 合并数据
  const progressWithBooks = progressList.map(p => ({
    ...p,
    books: bookMap.get(p.book_id) || null,
  }));

  res.json({ data: progressWithBooks });
});

/**
 * 获取用户对特定书籍的阅读进度
 * GET /api/v1/progress/:bookId
 * Query: userId (required)
 */
router.get('/:bookId', async (req: Request, res: Response) => {
  const { bookId } = req.params;
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from('user_reading_progress')
    .select('*')
    .eq('user_id', userId as string)
    .eq('book_id', Number(bookId))
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data: data || null });
});

/**
 * 更新阅读进度
 * POST /api/v1/progress
 * Body: userId, bookId, currentPage, completed?
 */
router.post('/', async (req: Request, res: Response) => {
  const parseResult = insertUserReadingProgressSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const { userId, bookId, currentPage, completed } = parseResult.data;
  const client = getSupabaseClient();

  // 检查是否已有进度记录
  const { data: existing } = await client
    .from('user_reading_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .maybeSingle();

  if (existing) {
    // 更新现有记录
    const { data, error } = await client
      .from('user_reading_progress')
      .update({
        current_page: currentPage,
        completed: completed ?? existing.completed,
        last_read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.json({ data });
  }

  // 创建新记录
  const { data, error } = await client
    .from('user_reading_progress')
    .insert({
      user_id: userId,
      book_id: bookId,
      current_page: currentPage,
      completed: completed ?? false,
      last_read_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 标记书籍完成
 * PUT /api/v1/progress/:bookId/complete
 * Query: userId (required)
 */
router.put('/:bookId/complete', async (req: Request, res: Response) => {
  const { bookId } = req.params;
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  const { data, error } = await client
    .from('user_reading_progress')
    .update({
      completed: true,
      last_read_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId as string)
    .eq('book_id', Number(bookId))
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

/**
 * 获取用户统计数据
 * GET /api/v1/progress/stats/overview
 * Query: userId (required)
 */
router.get('/stats/overview', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 获取已完成书籍数
  const { count: completedCount } = await client
    .from('user_reading_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId as string)
    .eq('completed', true);

  // 获取正在阅读的书籍数
  const { count: readingCount } = await client
    .from('user_reading_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId as string)
    .eq('completed', false);

  // 获取各分级完成情况
  const { data: progressData } = await client
    .from('user_reading_progress')
    .select('book_id, completed')
    .eq('user_id', userId as string);

  const levelStats: Record<number, { completed: number; total: number }> = {};

  if (progressData && progressData.length > 0) {
    const bookIds = progressData.map(p => p.book_id);
    const { data: books } = await client
      .from('books')
      .select('id, level_id')
      .in('id', bookIds);

    const bookLevelMap = new Map(books?.map(b => [b.id, b.level_id]) || []);

    progressData.forEach((item) => {
      const levelId = bookLevelMap.get(item.book_id);
      if (levelId) {
        if (!levelStats[levelId]) {
          levelStats[levelId] = { completed: 0, total: 0 };
        }
        levelStats[levelId].total++;
        if (item.completed) {
          levelStats[levelId].completed++;
        }
      }
    });
  }

  res.json({
    data: {
      completedBooks: completedCount || 0,
      readingBooks: readingCount || 0,
      levelStats,
    },
  });
});

export default router;
