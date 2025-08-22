import express from 'express';
import { customAlphabet } from 'nanoid';
import { Link } from '../models/db.js';
import { apiKeyAuth } from '../middleware/authMiddleware.js';
import { createLinkLimiter, statusLinkLimiter } from '../middleware/rateLimitMiddleware.js';

const nanoid = customAlphabet('1234567890abcdefghijklmnopqrstuvwxyz', 8);
const router = express.Router();

// API: Create a new link
router.post('/links', apiKeyAuth, createLinkLimiter, async (req, res) => {
  const { path, slug, title, description, image_url } = req.body;

  if (!path) {
    return res.status(400).json({ error: 'path is required' });
  }

  if (slug && (slug.length < 3 || slug.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(slug))) {
    return res.status(400).json({
      error: 'Invalid slug format. Must be 3-100 characters and contain only letters, numbers, hyphens, and underscores.'
    });
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

// Get analytics for a link
router.get('/links/:slug/stats', apiKeyAuth, statusLinkLimiter, async (req, res) => {
  try {
    const slug = req.params.slug;
    if (slug.length < 3 || slug.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return res.status(400).json({
        error: 'Invalid slug format. Must be 3-100 characters and contain only letters, numbers, hyphens, and underscores.'
      });
    }
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

export default router;