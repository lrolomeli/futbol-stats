import { createClient } from 'redis'

const globalForRedis = globalThis as unknown as {
  redis: ReturnType<typeof createClient> | undefined
}

async function getRedisClient() {
  if (globalForRedis.redis) return globalForRedis.redis

  const client = createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  })

  client.on('error', (err) => console.error('Redis Client Error', err))
  await client.connect()

  globalForRedis.redis = client
  return client
}

export { getRedisClient }
