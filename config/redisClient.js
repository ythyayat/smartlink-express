import redis from 'redis';

const redisClient = redis.createClient({
  url: process.env.REDIS_URL,
  socket: {
    reconnectStrategy: () => {
      return 1000;
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

redisClient.connect().catch((err) => {
  console.error('Redis connection failed', err);
});

export default redisClient;