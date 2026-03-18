import express from 'express';
import type { Request, Response } from 'express';
import { getSupabaseClient } from '../storage/database/supabase-client';

const router = express.Router();

// 百度网盘 API 配置
const BAIDU_API_BASE = 'https://pan.baidu.com/rest/2.0/xpan';
const BAIDU_OAUTH_BASE = 'https://openapi.baidu.com/oauth/2.0';

// 类型定义
interface BaiduTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
}

interface BaiduFileListResponse {
  errno?: number;
  list?: Array<{
    path: string;
    filename: string;
    server_filename: string;
    size: number;
    isdir: number;
    server_mtime: string;
  }>;
}

interface BaiduDownloadResponse {
  errno?: number;
  list?: Array<{
    dlink: string;
  }>;
}

/**
 * 获取百度网盘授权URL
 * GET /api/v1/baidu/auth-url
 * Query: userId (required), redirectUri (required)
 */
router.get('/auth-url', async (req: Request, res: Response) => {
  const { userId, redirectUri } = req.query;

  if (!userId || !redirectUri) {
    return res.status(400).json({ error: 'userId and redirectUri are required' });
  }

  // 注意：需要在环境变量中配置 BAIDU_APP_KEY
  const appId = process.env.BAIDU_APP_KEY;
  if (!appId) {
    return res.status(500).json({ error: 'Baidu App Key not configured' });
  }

  const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
  const authUrl = `${BAIDU_OAUTH_BASE}/authorize?response_type=code&client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri as string)}&scope=basic,netdisk&display=mobile&state=${state}`;

  res.json({ data: { authUrl } });
});

/**
 * 处理百度网盘授权回调
 * POST /api/v1/baidu/callback
 * Body: code, userId
 */
router.post('/callback', async (req: Request, res: Response) => {
  const { code, userId } = req.body;

  if (!code || !userId) {
    return res.status(400).json({ error: 'code and userId are required' });
  }

  const appId = process.env.BAIDU_APP_KEY;
  const appSecret = process.env.BAIDU_APP_SECRET;
  const redirectUri = process.env.BAIDU_REDIRECT_URI;

  if (!appId || !appSecret || !redirectUri) {
    return res.status(500).json({ error: 'Baidu OAuth not configured' });
  }

  try {
    // 获取 access_token
    const tokenUrl = `${BAIDU_OAUTH_BASE}/token?grant_type=authorization_code&code=${code}&client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}`;

    const tokenResponse = await fetch(tokenUrl, { method: 'POST' });
    const tokenData = await tokenResponse.json() as BaiduTokenResponse;

    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error_description || tokenData.error });
    }

    // 计算过期时间
    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    // 存储到数据库
    const client = getSupabaseClient();
    const { error } = await client
      .from('baidu_tokens')
      .upsert({
        user_id: userId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ data: { success: true, message: 'Baidu account connected' } });
  } catch (error) {
    console.error('Baidu OAuth error:', error);
    res.status(500).json({ error: 'Failed to connect Baidu account' });
  }
});

/**
 * 检查百度网盘授权状态
 * GET /api/v1/baidu/status
 * Query: userId (required)
 */
router.get('/status', async (req: Request, res: Response) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();
  const { data, error } = await client
    .from('baidu_tokens')
    .select('access_token, expires_at')
    .eq('user_id', userId as string)
    .maybeSingle();

  if (error || !data) {
    return res.json({ data: { connected: false } });
  }

  const isExpired = new Date(data.expires_at) < new Date();
  res.json({
    data: {
      connected: !isExpired,
      expiresAt: data.expires_at,
    },
  });
});

/**
 * 获取网盘文件列表
 * GET /api/v1/baidu/files
 * Query: userId (required), path?, recursive?
 */
router.get('/files', async (req: Request, res: Response) => {
  const { userId, path = '/' } = req.query;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();
  const { data: tokenData, error: tokenError } = await client
    .from('baidu_tokens')
    .select('access_token')
    .eq('user_id', userId as string)
    .maybeSingle();

  if (tokenError || !tokenData) {
    return res.status(401).json({ error: 'Baidu account not connected' });
  }

  try {
    const filesUrl = `${BAIDU_API_BASE}/file?method=list&access_token=${tokenData.access_token}&dir=${encodeURIComponent(path as string)}&order=name&desc=0&web=0&folder=0`;

    const response = await fetch(filesUrl);
    const result = await response.json() as BaiduFileListResponse;

    if (result.errno) {
      return res.status(400).json({ error: `Baidu API error: ${result.errno}` });
    }

    // 过滤支持的文件类型
    const supportedTypes = ['.pdf', '.mp3', '.mp4', '.wav', '.m4a', '.mov'];
    const filteredFiles = result.list?.filter((file) => {
      const ext = file.filename.toLowerCase().substring(file.filename.lastIndexOf('.'));
      return supportedTypes.includes(ext);
    }) || [];

    res.json({
      data: {
        files: filteredFiles.map((file) => ({
          path: file.path,
          name: file.server_filename,
          size: file.size,
          isDir: file.isdir === 1,
          modified: file.server_mtime,
          type: getFileType(file.filename),
        })),
      },
    });
  } catch (error) {
    console.error('Fetch files error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

/**
 * 获取文件下载链接
 * GET /api/v1/baidu/download
 * Query: userId (required), path (required)
 */
router.get('/download', async (req: Request, res: Response) => {
  const { userId, path } = req.query;

  if (!userId || !path) {
    return res.status(400).json({ error: 'userId and path are required' });
  }

  const client = getSupabaseClient();
  const { data: tokenData, error: tokenError } = await client
    .from('baidu_tokens')
    .select('access_token')
    .eq('user_id', userId as string)
    .maybeSingle();

  if (tokenError || !tokenData) {
    return res.status(401).json({ error: 'Baidu account not connected' });
  }

  try {
    const downloadUrl = `${BAIDU_API_BASE}/multimedia?method=filemetas&access_token=${tokenData.access_token}&fsids=[${path}]&dlink=1`;

    const response = await fetch(downloadUrl);
    const result = await response.json() as BaiduDownloadResponse;

    if (result.errno) {
      return res.status(400).json({ error: `Baidu API error: ${result.errno}` });
    }

    const dlink = result.list?.[0]?.dlink;
    if (!dlink) {
      return res.status(404).json({ error: 'Download link not found' });
    }

    // 添加 access_token 到下载链接
    const fullDownloadUrl = `${dlink}&access_token=${tokenData.access_token}`;

    res.json({
      data: {
        downloadUrl: fullDownloadUrl,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8小时有效
      },
    });
  } catch (error) {
    console.error('Get download link error:', error);
    res.status(500).json({ error: 'Failed to get download link' });
  }
});

/**
 * 刷新 access_token
 * POST /api/v1/baidu/refresh
 * Body: userId
 */
router.post('/refresh', async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const client = getSupabaseClient();
  const { data: tokenData, error: tokenError } = await client
    .from('baidu_tokens')
    .select('refresh_token')
    .eq('user_id', userId)
    .maybeSingle();

  if (tokenError || !tokenData) {
    return res.status(401).json({ error: 'Baidu account not connected' });
  }

  const appId = process.env.BAIDU_APP_KEY;
  const appSecret = process.env.BAIDU_APP_SECRET;

  if (!appId || !appSecret) {
    return res.status(500).json({ error: 'Baidu OAuth not configured' });
  }

  try {
    const refreshUrl = `${BAIDU_OAUTH_BASE}/token?grant_type=refresh_token&refresh_token=${tokenData.refresh_token}&client_id=${appId}&client_secret=${appSecret}`;

    const response = await fetch(refreshUrl, { method: 'POST' });
    const result = await response.json() as BaiduTokenResponse;

    if (result.error) {
      return res.status(400).json({ error: result.error_description || result.error });
    }

    const expiresAt = new Date(Date.now() + result.expires_in * 1000);

    await client
      .from('baidu_tokens')
      .update({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    res.json({ data: { success: true, expiresAt } });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

/**
 * 根据文件名判断文件类型
 */
function getFileType(filename: string): 'pdf' | 'audio' | 'video' | 'unknown' {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  if (ext === '.pdf') return 'pdf';
  if (['.mp3', '.wav', '.m4a', '.aac', '.flac'].includes(ext)) return 'audio';
  if (['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'video';
  return 'unknown';
}

export default router;
