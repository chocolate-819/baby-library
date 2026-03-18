import express from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';
import { insertBookSchema, updateBookSchema } from '../storage/database/shared/schema';

const router = express.Router();

/**
 * 获取书籍列表（支持按分级筛选）
 * GET /api/v1/books
 * Query: levelId?: number
 */
router.get('/', async (req: Request, res: Response) => {
  const { levelId } = req.query;
  const client = getSupabaseClient();

  // 获取书籍列表
  let query = client
    .from('books')
    .select('*')
    .eq('is_active', true)
    .order('order', { ascending: true });

  if (levelId) {
    query = query.eq('level_id', Number(levelId));
  }

  const { data: books, error } = await query;

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // 获取分级信息
  const { data: levels } = await client
    .from('book_levels')
    .select('*');

  const levelMap = new Map(levels?.map(l => [l.id, l]) || []);

  // 合并数据
  const booksWithLevel = books?.map(book => ({
    ...book,
    book_levels: levelMap.get(book.level_id) || null,
  })) || [];

  res.json({ data: booksWithLevel });
});

/**
 * 获取单本书籍详情（含资源）
 * GET /api/v1/books/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  // 获取书籍信息
  const { data: book, error: bookError } = await client
    .from('books')
    .select('*')
    .eq('id', Number(id))
    .single();

  if (bookError || !book) {
    return res.status(404).json({ error: 'Book not found' });
  }

  // 获取分级信息
  const { data: level } = await client
    .from('book_levels')
    .select('*')
    .eq('id', book.level_id)
    .single();

  // 获取书籍资源
  const { data: resources, error: resourceError } = await client
    .from('book_resources')
    .select('*')
    .eq('book_id', Number(id));

  if (resourceError) {
    return res.status(500).json({ error: resourceError.message });
  }

  res.json({
    data: {
      ...book,
      book_levels: level || null,
      resources: resources || [],
    },
  });
});

/**
 * 创建书籍
 * POST /api/v1/books
 * Body: title, coverImage?, description?, levelId, totalPages?, order?
 */
router.post('/', async (req: Request, res: Response) => {
  const parseResult = insertBookSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('books')
    .insert(parseResult.data)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 更新书籍
 * PUT /api/v1/books/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const parseResult = updateBookSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ error: parseResult.error.message });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('books')
    .update({
      ...parseResult.data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', Number(id))
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ data });
});

/**
 * 删除书籍（软删除）
 * DELETE /api/v1/books/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  const { error } = await client
    .from('books')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', Number(id));

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json({ success: true });
});

/**
 * 为书籍添加资源
 * POST /api/v1/books/:id/resources
 * Body: resourceType, baiduPath, fileName, fileSize?, duration?
 */
router.post('/:id/resources', async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getSupabaseClient();

  const resourceData = {
    ...req.body,
    book_id: Number(id),
  };

  const { data, error } = await client
    .from('book_resources')
    .insert(resourceData)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(201).json({ data });
});

/**
 * 获取书籍资源的下载链接
 * GET /api/v1/books/:id/resources/:resourceId/download
 */
router.get('/:id/resources/:resourceId/download', async (req: Request, res: Response) => {
  const { id, resourceId } = req.params;
  const client = getSupabaseClient();

  // 获取资源信息
  const { data: resource, error: resourceError } = await client
    .from('book_resources')
    .select('*')
    .eq('id', Number(resourceId))
    .eq('book_id', Number(id))
    .single();

  if (resourceError || !resource) {
    return res.status(404).json({ error: 'Resource not found' });
  }

  // 检查是否有有效的下载链接
  if (resource.download_url && resource.url_expires_at) {
    const expiresAt = new Date(resource.url_expires_at);
    if (expiresAt > new Date()) {
      return res.json({ downloadUrl: resource.download_url });
    }
  }

  // TODO: 调用百度网盘 API 获取新的下载链接
  res.json({
    downloadUrl: null,
    message: '请先配置百度网盘授权',
    baiduPath: resource.baidu_path,
  });
});

export default router;
