import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';
import { Link } from './db.js';
import rateLimit from 'express-rate-limit';
import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: () => false
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8);

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const port = process.env.PORT;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));


const createLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later.'
});

const redirectLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.'
});

const statusLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.'
});


function apiKeyAuth(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== process.env.API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Web route: Home
app.get('/', (req, res) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return res.redirect(process.env.FALLBACK_URL_DEFAULT_IOS);
  } else if (/android/.test(userAgent)) {
    return res.redirect(process.env.FALLBACK_URL_DEFAULT_ANDROID);
  } else {
    return res.redirect(process.env.REDIRECT_URL_DEFAULT);
  }
});

// API: Create a new link
app.post('/api/links', apiKeyAuth, createLinkLimiter, async (req, res) => {
  const { path, slug, title, description, image_url } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'path is required' });
  }

  const finalSlug = slug || nanoid();

  try {
    await Link.create({ slug: finalSlug, title, description, image_url, path });
    res.json({
      success: true,
      short_url: `${req.protocol}://${req.get('host')}/${finalSlug}`,
      slug: finalSlug
    });
  } catch (error) {
    console.error('Error creating link:', error);
    res.status(500).json({ error: "Something went wrong" });
  }

});

// Web route: Handle short link
app.get('/:slug', redirectLinkLimiter, async (req, res) => {
  try {
    const link = await Link.findOne({ where: { slug: req.params.slug } });

    if (!link) {
      return res.status(404).render('not-found', {
        redirect_url: process.env.REDIRECT_URL_DEFAULT
      });
    }

    const ip = req.ip;
    const userAgent = req.headers['user-agent'] || 'unknown';
    const cacheKey = `smartlink-express:click:${ip}:${userAgent}:${req.params.slug}`;
    let shouldSave = false;

    try {
      const isNew = await redisClient.set(cacheKey, '1', { EX: 60, NX: true });
      if (isNew) {
        link.click_count += 1;

        const ua = req.headers['user-agent'] || '';
        if (/android/i.test(ua)) {
          link.click_count_android += 1;
        } else if (/iphone|ipad|ipod/i.test(ua)) {
          link.click_count_ios += 1;
        } else {
          link.click_count_other += 1;
        }
        shouldSave = true;
      }
    } catch (err) {
      console.error('Redis error - falling back to in-memory:', err);
      // Fallback to in-memory check if Redis fails
      const now = Date.now();
      const oneMinute = 60 * 1000;
      if (!global.clickCache) global.clickCache = new Map();

      if (!global.clickCache.has(cacheKey) || now - global.clickCache.get(cacheKey) > oneMinute) {
        link.click_count += 1;

        const ua = req.headers['user-agent'] || '';
        if (/android/i.test(ua)) {
          link.click_count_android += 1;
        } else if (/iphone|ipad|ipod/i.test(ua)) {
          link.click_count_ios += 1;
        } else {
          link.click_count_other += 1;
        }

        global.clickCache.set(cacheKey, now);
        shouldSave = true;
      }
    }


    const ua = req.headers['user-agent'] || '';
    let redirectUrl = '';
    let fallbackUrl = '';
    if (/android/i.test(ua)) {
      redirectUrl = `surplus://${link.path}`;
      fallbackUrl = process.env.FALLBACK_URL_DEFAULT_ANDROID;
    } else if (/iphone|ipad|ipod/i.test(ua)) {
      redirectUrl = `surplus://${link.path}`;
      fallbackUrl = process.env.FALLBACK_URL_DEFAULT_IOS;
    } else {
      redirectUrl = process.env.REDIRECT_URL_DEFAULT;
      fallbackUrl = process.env.REDIRECT_URL_DEFAULT;
    }

    if (shouldSave) {
      await link.save();
    }
    res.render('link', {
      title: link.title,
      description: link.description,
      image_url: link.image_url,
      redirect_url: redirectUrl,
      fallback_url: fallbackUrl,
      slug: link.slug
    });
  } catch (error) {
    console.error('Error processing short link:', error);
    res.status(500).render('not-found', {
      redirect_url: process.env.REDIRECT_URL_DEFAULT
    });
  }
});

// Get analytics for a link
app.get('/api/links/:slug/stats', apiKeyAuth, statusLinkLimiter, async (req, res) => {
  try {
    const link = await Link.findOne({ where: { slug: req.params.slug } });
    if (!link) return res.status(404).json({ error: 'Not Found' });
    res.json({
      slug: link.slug,
      click_count: link.click_count,
      platform: {
        ios: link.click_count_ios,
        android: link.click_count_android,
        other: link.click_count_other
      }
    });
  } catch (error) {
    console.error('Error getting link stats:', error);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '1.0.0' });
});

// Start server
app.listen(port, () => {
  console.log(`SmartLink server running at http://localhost:${port}`);
});

// Initial Redis connection attempt (non-blocking)
redisClient.connect().catch(() => {
  // Error already handled by 'error' event listener
});