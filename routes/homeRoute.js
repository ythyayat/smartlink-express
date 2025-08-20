import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  const userAgent = req.headers['user-agent']?.toLowerCase() || '';

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return res.redirect(process.env.FALLBACK_URL_DEFAULT_IOS);
  } else if (/android/.test(userAgent)) {
    return res.redirect(process.env.FALLBACK_URL_DEFAULT_ANDROID);
  } else {
    return res.redirect(process.env.REDIRECT_URL_DEFAULT);
  }
});

export default router;