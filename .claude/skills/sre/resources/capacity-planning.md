# Capacity Planning

Resource forecasting, growth modeling, scalability analysis, load testing, and proactive capacity management.

## Table of Contents

- [Capacity Planning Process](#capacity-planning-process)
- [Resource Forecasting](#resource-forecasting)
- [Load Testing](#load-testing)
- [Scalability Analysis](#scalability-analysis)

## Capacity Planning Process

```yaml
quarterly_process:
  1_collect_data:
    - Current resource usage trends
    - Traffic growth patterns
    - Business projections
    - Seasonal variations

  2_forecast:
    - Project 6-12 months ahead
    - Account for growth initiatives
    - Include safety margin (20-30%)

  3_plan_upgrades:
    - Identify bottlenecks
    - Plan infrastructure changes
    - Budget for new resources

  4_implement:
    - Gradual rollout
    - Monitor impact
    - Adjust as needed
```

## Resource Forecasting

**Linear Growth Model:**
```python
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

def forecast_capacity(historical_data, months_ahead=6):
    """
    Forecast resource requirements

    Args:
        historical_data: DataFrame with 'date' and 'usage' columns
        months_ahead: Number of months to forecast

    Returns:
        Forecasted usage values
    """
    # Prepare data
    X = np.array(range(len(historical_data))).reshape(-1, 1)
    y = historical_data['usage'].values

    # Train model
    model = LinearRegression()
    model.fit(X, y)

    # Forecast
    future_X = np.array(range(len(historical_data),
                              len(historical_data) + months_ahead)).reshape(-1, 1)
    forecast = model.predict(future_X)

    # Add 30% safety margin
    return forecast * 1.3

# Usage
import pandas as pd
data = pd.DataFrame({
    'date': pd.date_range('2023-01-01', periods=12, freq='M'),
    'usage': [100, 110, 115, 125, 130, 140, 145, 155, 160, 170, 175, 185]
})

forecast = forecast_capacity(data, months_ahead=6)
print(f"Forecasted usage in 6 months: {forecast[-1]:.0f}")
```

**Capacity Metrics:**
```yaml
cpu:
  current_avg: 45%
  current_p95: 75%
  target_max: 80%
  growth_rate: 5% monthly
  action_needed: Scale in 4 months

memory:
  current_avg: 60%
  current_p95: 85%
  target_max: 85%
  growth_rate: 3% monthly
  action_needed: Scale in 6 months

storage:
  current_usage: 500GB
  total_capacity: 1TB
  growth_rate: 50GB monthly
  action_needed: Scale in 10 months
```

## Load Testing

**k6 Load Test:**
```javascript
// load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up to 100 users
    { duration: '10m', target: 100 },  // Stay at 100 users
    { duration: '5m', target: 500 },   // Ramp to 500 users
    { duration: '10m', target: 500 },  // Stay at 500
    { duration: '5m', target: 1000 },  // Spike to 1000
    { duration: '5m', target: 0 },     // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('https://api.example.com/');
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

**Run Load Test:**
```bash
# Local test
k6 run load-test.js

# Cloud test (distributed)
k6 cloud load-test.js

# With custom VUs
k6 run --vus 1000 --duration 30m load-test.js
```

## Scalability Analysis

**Horizontal vs Vertical Scaling:**
```yaml
horizontal_scaling:
  when: Stateless applications, need high availability
  pros:
    - No downtime
    - Better fault tolerance
    - Linear cost scaling
  cons:
    - More complex
    - Coordination overhead

vertical_scaling:
  when: Stateful applications, simpler architecture
  pros:
    - Simpler architecture
    - Less coordination
  cons:
    - Downtime required
    - Upper limits
    - Single point of failure
```

**Auto-scaling Configuration:**
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 100
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 5
        periodSeconds: 30
      selectPolicy: Max
```

---

**Related Resources:**
- [performance-optimization.md](performance-optimization.md)
- [resource-management.md](../platform-engineering/resources/resource-management.md)
