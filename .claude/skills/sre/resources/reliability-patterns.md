# Reliability Patterns

Circuit breakers, retries, timeouts, bulkheads, rate limiting, graceful degradation, and resilience design patterns.

## Circuit Breaker Pattern

**Concept:**
```
Closed → Normal operation
  ↓ (failures exceed threshold)
Open → Fail fast, don't call service
  ↓ (after timeout)
Half-Open → Test if service recovered
  ↓ (success)
Closed → Resume normal operation
```

**Implementation (Resilience4j):**
```java
CircuitBreakerConfig config = CircuitBreakerConfig.custom()
    .failureRateThreshold(50)
    .waitDurationInOpenState(Duration.ofMillis(30000))
    .slidingWindowSize(10)
    .build();

CircuitBreaker circuitBreaker = CircuitBreaker.of("api", config);

Supplier<String> decoratedSupplier = CircuitBreaker
    .decorateSupplier(circuitBreaker, () -> callExternalService());

String result = Try.ofSupplier(decoratedSupplier)
    .recover(throwable -> "fallback value")
    .get();
```

## Retry Pattern

**Exponential Backoff:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;

      const delay = Math.pow(2, i) * 1000;  // 1s, 2s, 4s
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## Timeout Pattern

**Service Timeouts:**
```yaml
timeouts:
  connection_timeout: 5s
  read_timeout: 30s
  write_timeout: 30s
  idle_timeout: 120s
```

**Implementation:**
```typescript
async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

## Bulkhead Pattern

**Resource Isolation:**
```
Service A → Connection Pool A (20 connections)
Service B → Connection Pool B (20 connections)
Service C → Connection Pool C (10 connections)

Failure in Service A doesn't affect B or C
```

**Thread Pool Isolation:**
```java
ThreadPoolExecutor serviceAPool = new ThreadPoolExecutor(
    10,  // core size
    20,  // max size
    60L, TimeUnit.SECONDS,
    new LinkedBlockingQueue<>(100)
);
```

## Rate Limiting

**Token Bucket:**
```typescript
class RateLimiter {
  private tokens: number;
  private capacity: number;
  private refillRate: number;

  async acquire(): Promise<boolean> {
    if (this.tokens >= 1) {
      this.tokens--;
      return true;
    }
    return false;
  }

  refill() {
    this.tokens = Math.min(
      this.capacity,
      this.tokens + this.refillRate
    );
  }
}
```

**Nginx Rate Limiting:**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://backend;
    }
}
```

## Graceful Degradation

**Feature Flags:**
```typescript
async function getRecommendations(userId: string) {
  if (!featureFlags.isEnabled('ml_recommendations')) {
    // Fallback to simple algorithm
    return getPopularItems();
  }

  try {
    return await mlService.getRecommendations(userId);
  } catch (error) {
    // Degrade gracefully
    return getPopularItems();
  }
}
```

**Cache Fallback:**
```typescript
async function getData(key: string) {
  try {
    return await database.get(key);
  } catch (error) {
    // Serve stale data from cache
    const stale = await cache.get(key);
    if (stale) {
      logger.warn('Serving stale data due to DB error');
      return stale;
    }
    throw error;
  }
}
```

---

**Related Resources:**
- [chaos-engineering.md](chaos-engineering.md)
- [incident-management.md](incident-management.md)
