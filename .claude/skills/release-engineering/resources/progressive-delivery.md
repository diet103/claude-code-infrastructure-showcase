# Progressive Delivery

Feature flags, traffic splitting, gradual rollout, LaunchDarkly, Unleash, and progressive deployment techniques.

## Feature Flags

**LaunchDarkly:**
```typescript
import * as ld from 'launchdarkly-node-server-sdk';

const client = ld.init(process.env.LAUNCHDARKLY_SDK_KEY);

await client.waitForInitialization();

const user = {
  key: 'user@example.com',
  email: 'user@example.com',
  custom: {
    plan: 'premium'
  }
};

const showNewFeature = await client.variation('new-feature', user, false);

if (showNewFeature) {
  // New feature code
} else {
  // Old feature code
}
```

**Unleash:**
```typescript
import { startUnleash } from 'unleash-client';

const unleash = await startUnleash({
  url: 'https://unleash.example.com/api',
  appName: 'my-app',
  customHeaders: {
    Authorization: process.env.UNLEASH_API_KEY
  }
});

if (unleash.isEnabled('new-feature', { userId: 'user@example.com' })) {
  // New feature
}
```

## Traffic Splitting

**Istio VirtualService:**
```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
  - myapp
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: myapp
        subset: v2
  - route:
    - destination:
        host: myapp
        subset: v1
      weight: 90
    - destination:
        host: myapp
        subset: v2
      weight: 10
```

---

**Related Resources:**
- [deployment-strategies.md](deployment-strategies.md)
