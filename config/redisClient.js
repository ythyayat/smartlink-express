import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: () => false
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

redisClient.connect().catch((err) => {
  console.error('Redis connection failed', err);
});

export default redisClient;