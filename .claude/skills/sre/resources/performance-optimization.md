# Performance Optimization

Profiling techniques, bottleneck identification, database optimization, caching strategies, and performance tuning.

## Profiling

**Application Profiling:**
```bash
# Node.js profiling
node --prof app.js
node --prof-process isolate-*-v8.log > processed.txt

# Python profiling
python -m cProfile -o profile.stats app.py
python -m pstats profile.stats

# Go profiling
go tool pprof http://localhost:6060/debug/pprof/profile
```

**Database Query Profiling:**
```sql
-- PostgreSQL
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'user@example.com';

-- Add index
CREATE INDEX idx_users_email ON users(email);

-- MySQL
EXPLAIN SELECT * FROM users WHERE email = 'user@example.com';
```

## Caching Strategies

**Multi-Layer Caching:**
```
Application Cache (in-memory)
  ↓ miss
CDN Cache (edge)
  ↓ miss
Redis Cache (distributed)
  ↓ miss
Database
```

**Redis Caching:**
```typescript
import Redis from 'ioredis';
const redis = new Redis();

async function getCachedData(key: string) {
  // Try cache first
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  // Fetch from database
  const data = await database.query(key);

  // Cache for 1 hour
  await redis.setex(key, 3600, JSON.stringify(data));

  return data;
}
```

## Database Optimization

**Indexing Strategy:**
```sql
-- Add index for frequent queries
CREATE INDEX idx_orders_user_created ON orders(user_id, created_at);

-- Partial index for active records
CREATE INDEX idx_active_users ON users(id) WHERE status = 'active';

-- Covering index
CREATE INDEX idx_users_lookup ON users(email) INCLUDE (name, created_at);
```

**Connection Pooling:**
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  max: 20,  // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

## Performance Best Practices

1. **Use CDN for static assets**
2. **Implement proper caching**
3. **Optimize database queries**
4. **Use connection pooling**
5. **Enable compression**
6. **Lazy load resources**
7. **Minimize payload size**
8. **Use async/parallel processing**

---

**Related Resources:**
- [capacity-planning.md](capacity-planning.md)
- [observability-stack.md](observability-stack.md)
