import Redis from 'ioredis';

export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is open') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export async function checkCircuitBreaker(redis: Redis, destinationId: string): Promise<void> {
  const state = await redis.get(`cb:${destinationId}`);
  
  if (state === 'open') {
    throw new CircuitOpenError();
  }

  // Check failure count in last 60s
  const now = Date.now();
  const failures = await redis.zcount(`cb:failures:${destinationId}`, now - 60000, now);

  if (failures > 5) {
    // Transition to open
    await redis.set(`cb:${destinationId}`, 'open', 'EX', 300);
    throw new CircuitOpenError();
  }
}

export async function recordFailure(redis: Redis, destinationId: string): Promise<void> {
  const now = Date.now();
  await redis.zadd(`cb:failures:${destinationId}`, now, `${now}`);
  await redis.expire(`cb:failures:${destinationId}`, 120);
}

export async function recordSuccess(redis: Redis, destinationId: string): Promise<void> {
  // Reset circuit breaker to closed
  await redis.del(`cb:${destinationId}`);
  await redis.del(`cb:failures:${destinationId}`);
}
