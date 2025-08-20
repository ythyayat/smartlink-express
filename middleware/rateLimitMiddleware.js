import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

export const createLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: 'Too many requests, please try again later.',
  trustProxy: true,
  keyGenerator: ipKeyGenerator
});

export const redirectLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
  trustProxy: true,
  keyGenerator: ipKeyGenerator
});

export const statusLinkLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: 'Too many requests, please try again later.',
  trustProxy: true,
  keyGenerator: ipKeyGenerator
});