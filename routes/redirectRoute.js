import express from 'express';
import { redirectLinkLimiter } from '../middleware/rateLimitMiddleware.js';
import { Link } from '../models/db.js';
import redisClient from '../config/redisClient.js';

const router = express.Router();

router.get('/:slug', redirectLinkLimiter, async (req, res) => {
  try {
    const link = await findLinkBySlug(req.params.slug);
    if (!link) {
      handleNotFound(res);
      return;
    }

    const { redirectUrl, fallbackUrl } = determineRedirectUrls(link, req);
    
    trackClick(link, req).catch(err => console.error('Track click error:', err));
    
    res.render('link', {
      title: link.title,
      description: link.description,
      image_url: link.image_url,
      redirect_url: redirectUrl,
      fallback_url: fallbackUrl,
      slug: link.slug
    });
  } catch (error) {
    handleRedirectError(res, error);
  }
});

async function findLinkBySlug(slug) {
  const cacheKey = `smartlink-express:link:${slug}`;
  const cachedLink = await redisClient.get(cacheKey);
  if (cachedLink) {
    const plainLink = JSON.parse(cachedLink);
    return Link.build(plainLink, { isNewRecord: false });
  }
  const link = await Link.findOne({ where: { slug } });
  if (link) {
    await redisClient.set(cacheKey, JSON.stringify(link.get({ plain: true })), { EX: 3600 });
  }
  return link;
}

function handleNotFound(res) {
  res.status(404).render('not-found', {
    redirect_url: process.env.REDIRECT_URL_DEFAULT
  });
}

async function trackClick(link, req) {
  const cacheKey = generateCacheKey(req, link.slug);
  
  try {
    if (redisClient.isReady) {
      const isNew = await redisClient.set(cacheKey, '1', { EX: 60, NX: true });
      if (isNew) {
        await updateClickCount(link.slug, req.headers['user-agent'] || '');
      }
    } else {
      throw new Error('Redis client not ready');
    }
  } catch (err) {
    console.error('Redis tracking error:', err);
    handleInMemoryTracking(link, req, cacheKey);
  }
}

function generateCacheKey(req, slug) {
  return `smartlink-express:click:${req.ip}:${req.headers['user-agent'] || 'unknown'}:${slug}`;
}

async function updateClickCount(slug, ua) {
  const updateFields = {
    click_count: 1,
    updated_at: new Date().toISOString()
  };
  
  if (/android/i.test(ua)) {
    updateFields.click_count_android = 1;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    updateFields.click_count_ios = 1;
  } else {
    updateFields.click_count_other = 1;
  }

  await Link.increment(updateFields, {
    where: { slug }
  });
  
  const cacheKey = `smartlink-express:link:${slug}`;
  await redisClient.expire(cacheKey, 3600).catch(() => {});
}

function handleInMemoryTracking(link, req, cacheKey) {
  const now = Date.now();
  const oneMinute = 60 * 1000;
  
  if (!global.clickCache) global.clickCache = new Map();
  
  if (!global.clickCache.has(cacheKey) || now - global.clickCache.get(cacheKey) > oneMinute) {
    updateClickCount(link.slug, req.headers['user-agent'] || '');
    global.clickCache.set(cacheKey, now);
  }
}

function determineRedirectUrls(link, req) {
  const ua = req.headers['user-agent'] || '';
  let redirectUrl = '';
  let fallbackUrl = '';

  if (/android/.test(ua)) {
    redirectUrl = `surplus://${link.path}`;
    fallbackUrl = process.env.FALLBACK_URL_DEFAULT_ANDROID;
  } else if (/iphone|ipad|ipod/.test(ua)) {
    redirectUrl = `surplus://${link.path}`;
    fallbackUrl = process.env.FALLBACK_URL_DEFAULT_IOS;
  } else {
    redirectUrl = process.env.REDIRECT_URL_DEFAULT;
    fallbackUrl = process.env.REDIRECT_URL_DEFAULT;
  }
  return { redirectUrl, fallbackUrl };
}

function handleRedirectError(res, error) {
  console.error('Error processing short link:', error);
  res.status(500).render('not-found', {
    redirect_url: process.env.REDIRECT_URL_DEFAULT
  });
}

export default router;