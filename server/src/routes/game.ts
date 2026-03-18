import express from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertGameLevelSchema, insertUserGameProgressSchema } from '../storage/database/shared/schema';

const router = express.Router();

/**
 * 获取所有游戏关卡
 * GET /api/v1/game/levels
 */
router.get('/levels', async (req: Request, res: Response) => {
  const client = getSupabaseClient();

  // 获取关卡列表
  const { data: levels, error } = await client
    .from('game_levels')
    .select('*')
    .eq('is_active', true)
    .order('order', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 获取分级信息
  const levelIds = [...new Set(levels?.map(l => l.level_id) || [])];
  const { data: bookLevels } = await client
    .from('book_levels')
    .select('*')
    .in('id', levelIds);

  const levelMap = new Map(bookLevels?.map(l => [l.id, l]) || []);

  // 合并数据
  const levelsWithBookLevel = levels?.map(level => ({
    ...level,
    book_levels: levelMap.get(level.level_id) || null,
  })) || [];

  res.json({ data: levelsWithBookLevel });
});

/**
 * 获取关卡详情
 * GET /api/v1/game/levels/:id
 */
router.get('/levels/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  const { data: level, error } = await client
    .from('game_levels')
    .select('*')
    .eq('id', Number(id))
    .single();

  if (error || !level) {
    return res.status(404).json({ error: 'Game level not found' });
  }

  // 获取分级信息
  const { data: bookLevel } = await client
    .from('book_levels')
    .select('*')
    .eq('id', level.level_id)
    .single();

  res.json({
    data: {
      ...level,
      book_levels: bookLevel || null,
    },
  });
});

/**
 * 创建游戏关卡
 * POST /api/v1/game/levels
 * Body: name, description?, requiredBooksCount, levelId, order?, reward?
 */
router.post('/levels', async (req: Request, res: Response) => {
  const parseResult = insertGameLevelSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('game_levels')
    .insert(parseResult.data)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 获取用户游戏进度
 * GET /api/v1/game/progress
 * Query: userId (required)
 */
router.get('/progress', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 获取用户游戏进度
  const { data: userProgress, error } = await client
    .from('user_game_progress')
    .select('*')
    .eq('user_id', userId as string)
    .order('created_at', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!userProgress || userProgress.length === 0) {
    return res.json({ data: [] });
  }

  // 获取关卡信息
  const gameLevelIds = userProgress.map(p => p.game_level_id);
  const { data: gameLevels } = await client
    .from('game_levels')
    .select('*')
    .in('id', gameLevelIds);

  // 获取分级信息
  const bookLevelIds = [...new Set(gameLevels?.map(l => l.level_id) || [])];
  const { data: bookLevels } = await client
    .from('book_levels')
    .select('*')
    .in('id', bookLevelIds);

  const bookLevelMap = new Map(bookLevels?.map(l => [l.id, l]) || []);
  const gameLevelMap = new Map(gameLevels?.map(l => [
    l.id,
    {
      ...l,
      book_levels: bookLevelMap.get(l.level_id) || null,
    }
  ]) || []);

  // 合并数据
  const progressWithLevels = userProgress.map(p => ({
    ...p,
    game_levels: gameLevelMap.get(p.game_level_id) || null,
  }));

  res.json({ data: progressWithLevels });
});

/**
 * 检查关卡是否可解锁
 * GET /api/v1/game/levels/:id/check
 * Query: userId (required)
 */
router.get('/levels/:id/check', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 获取关卡信息
  const { data: level, error: levelError } = await client
    .from('game_levels')
    .select('*')
    .eq('id', Number(id))
    .single();

  if (levelError || !level) {
    return res.status(404).json({ error: 'Game level not found' });
  }

  // 获取该分级下的书籍
  const { data: booksInLevel } = await client
    .from('books')
    .select('id')
    .eq('level_id', level.level_id)
    .eq('is_active', true);

  const bookIds = booksInLevel?.map((b) => b.id) || [];

  let completedInLevel = 0;
  if (bookIds.length > 0) {
    const { count } = await client
      .from('user_reading_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId as string)
      .eq('completed', true)
      .in('book_id', bookIds);
    completedInLevel = count || 0;
  }

  const canUnlock = completedInLevel >= level.required_books_count;

  res.json({
    data: {
      canUnlock,
      required: level.required_books_count,
      completed: completedInLevel,
      levelName: level.name,
    },
  });
});

/**
 * 解锁/完成关卡
 * POST /api/v1/game/levels/:id/complete
 * Body: userId, stars?
 */
router.post('/levels/:id/complete', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userId, stars = 0 } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 检查是否已有进度
  const { data: existing } = await client
    .from('user_game_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('game_level_id', Number(id))
    .maybeSingle();

  if (existing) {
    // 更新进度
    const { data, error } = await client
      .from('user_game_progress')
      .update({
        completed: true,
        stars: Math.max(existing.stars || 0, stars),
        completed_at: new Date().toISOString(),
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

  // 创建新进度
  const { data, error } = await client
    .from('user_game_progress')
    .insert({
      user_id: userId,
      game_level_id: Number(id),
      completed: true,
      stars,
      completed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 获取用户游戏总览
 * GET /api/v1/game/overview
 * Query: userId (required)
 */
router.get('/overview', async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();

  // 获取所有关卡
  const { data: allLevels } = await client
    .from('game_levels')
    .select('id, name, order')
    .eq('is_active', true)
    .order('order', { ascending: true });

  // 获取用户进度
  const { data: userProgress } = await client
    .from('user_game_progress')
    .select('*')
    .eq('user_id', userId as string);

  const progressMap = new Map(
    userProgress?.map((p) => [p.game_level_id, p]) || []
  );

  const levelsWithProgress = allLevels?.map((level) => ({
    ...level,
    completed: progressMap.get(level.id)?.completed || false,
    stars: progressMap.get(level.id)?.stars || 0,
  })) || [];

  const completedLevels = levelsWithProgress.filter((l) => l.completed).length;
  const totalStars = levelsWithProgress.reduce((sum, l) => sum + l.stars, 0);

  res.json({
    data: {
      levels: levelsWithProgress,
      completedLevels,
      totalLevels: allLevels?.length || 0,
      totalStars,
    },
  });
});

export default router;
