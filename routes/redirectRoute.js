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

    const shouldSave = await trackClick(link, req);
    const { redirectUrl, fallbackUrl } = determineRedirectUrls(link, req);
    await saveLinkIfNecessary(link, shouldSave);
    
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
  return Link.findOne({ where: { slug } });
}

function handleNotFound(res) {
  res.status(404).render('not-found', {
    redirect_url: process.env.REDIRECT_URL_DEFAULT
  });
}

async function trackClick(link, req) {
  const cacheKey = generateCacheKey(req, link.slug);
  let shouldSave = false;

  try {
    const isNew = await redisClient.set(cacheKey, '1', { EX: 60, NX: true });
    if (isNew) {
      updateClickCount(link, req.headers['user-agent'] || '');
      shouldSave = true;
    }
  } catch (err) {
    console.error('Redis error - falling back to in-memory:', err);
    shouldSave = handleInMemoryTracking(link, req, cacheKey);
  }
  return shouldSave;
}

function generateCacheKey(req, slug) {
  return `smartlink-express:click:${req.ip}:${req.headers['user-agent'] || 'unknown'}:${slug}`;
}

function updateClickCount(link, ua) {
  link.click_count += 1;
  if (/android/i.test(ua)) {
    link.click_count_android += 1;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    link.click_count_ios += 1;
  } else {
    link.click_count_other += 1;
  }
}

function handleInMemoryTracking(link, req, cacheKey) {
  const now = Date.now();
  const oneMinute = 60 * 1000;
  if (!global.clickCache) global.clickCache = new Map();

  if (!global.clickCache.has(cacheKey) || now - global.clickCache.get(cacheKey) > oneMinute) {
    link.click_count += 1;
    updateClickCountByPlatform(link, req.headers['user-agent'] || '');
    global.clickCache.set(cacheKey, now);
    return true;
  }
  return false;
}

function updateClickCountByPlatform(link, ua) {
  if (/android/i.test(ua)) {
    link.click_count_android += 1;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    link.click_count_ios += 1;
  } else {
    link.click_count_other += 1;
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

async function saveLinkIfNecessary(link, shouldSave) {
  if (shouldSave) {
    await link.save();
  }
}

function handleRedirectError(res, error) {
  console.error('Error processing short link:', error);
  res.status(500).render('not-found', {
    redirect_url: process.env.REDIRECT_URL_DEFAULT
  });
}

export default router;