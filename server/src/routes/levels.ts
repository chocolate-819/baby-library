import express from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertBookLevelSchema } from '../storage/database/shared/schema';

const router = express.Router();

/**
 * 获取所有分级
 * GET /api/v1/levels
 */
router.get('/', async (req: Request, res: Response) => {
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('book_levels')
    .select('*')
    .order('order', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

/**
 * 获取分级详情（含该分级下的书籍数量）
 * GET /api/v1/levels/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  const { data: level, error: levelError } = await client
    .from('book_levels')
    .select('*')
    .eq('id', Number(id))
    .single();

  if (levelError || !level) {
    return res.status(404).json({ error: 'Level not found' });
  }

  // 获取该分级下的书籍数量
  const { count, error: countError } = await client
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', Number(id))
    .eq('is_active', true);

  if (countError) {
    return res.status(500).json({ error: countError.message });
  }

  res.json({
    data: {
      ...level,
      booksCount: count || 0,
    },
  });
});

/**
 * 创建分级
 * POST /api/v1/levels
 * Body: name, description?, order?
 */
router.post('/', async (req: Request, res: Response) => {
  const parseResult = insertBookLevelSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('book_levels')
    .insert(parseResult.data)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 更新分级
 * PUT /api/v1/levels/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  const { data, error } = await client
    .from('book_levels')
    .update(req.body)
    .eq('id', Number(id))
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

/**
 * 删除分级
 * DELETE /api/v1/levels/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  // 检查是否有书籍使用该分级
  const { count } = await client
    .from('books')
    .select('*', { count: 'exact', head: true })
    .eq('level_id', Number(id));

  if (count && count > 0) {
    return res.status(400).json({
      error: 'Cannot delete level with existing books',
      booksCount: count,
    });
  }

  const { error } = await client
    .from('book_levels')
    .delete()
    .eq('id', Number(id));

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

export default router;
