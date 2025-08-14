import 'dotenv/config';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { customAlphabet } from 'nanoid';
import { Link } from './db.js';

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
app.post('/api/links', apiKeyAuth, async (req, res) => {
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
    res.status(500).json({ error: error.message });
  }

});

// Web route: Handle short link
app.get('/:slug', async (req, res) => {
  const link = await Link.findOne({ where: { slug: req.params.slug } });

  if (!link) {
    return res.status(404).render('not-found');
  }

  link.click_count += 1;

  const ua = req.headers['user-agent'] || '';
  let redirectUrl = '';
  let fallbackUrl = '';
  if (/android/i.test(ua)) {
    redirectUrl = `surplus://${link.path}`;
    fallbackUrl = process.env.FALLBACK_URL_DEFAULT_ANDROID;
    link.click_count_android += 1;
  } else if (/iphone|ipad|ipod/i.test(ua)) {
    redirectUrl = `surplus://${link.path}`;
    fallbackUrl = process.env.FALLBACK_URL_DEFAULT_IOS;
    link.click_count_ios += 1;
  } else {
    redirectUrl = process.env.REDIRECT_URL_DEFAULT;
    fallbackUrl = process.env.REDIRECT_URL_DEFAULT;
    link.click_count_other += 1;
  }

  await link.save();

  res.render('link', {
    title: link.title,
    description: link.description,
    image_url: link.image_url,
    redirect_url: redirectUrl,
    fallback_url: fallbackUrl,
    slug: link.slug
  });
});

// Get analytics for a link
app.get('/api/links/:slug/stats', apiKeyAuth, async (req, res) => {
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
});

// Start server
app.listen(port, () => {
  console.log(`SmartLink server running at http://localhost:${port}`);
});
