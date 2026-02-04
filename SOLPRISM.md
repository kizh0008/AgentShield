# SOLPRISM × AgentShield Integration

**Verifiable Reasoning for Safety-First Trading**

## Why This Matters

AgentShield's entire thesis is **safety-first trading** — multi-stage confirmation, scam detection, and transaction firewalls. SOLPRISM adds the missing piece: **cryptographic proof that the agent reasoned correctly before acting**.

Without SOLPRISM:
> "Trust me, I checked all the safety gates."

With SOLPRISM:
> "Here's the SHA-256 hash I committed BEFORE the trade. Verify my full reasoning trace matches."

## How It Works

```
Trade signal detected
    ↓
AgentShield runs prediction stages
    ↓
SOLPRISM commits reasoning hash ← pre-commitment (before trade)
    ↓
AgentShield executes (or rejects) trade
    ↓
Full reasoning trace available for verification
```

### The Commit-Reveal Pattern

1. **COMMIT**: Before executing a trade, hash all decision data (prediction stages, scam checks, cyclic signals, firewall results) and publish the hash
2. **EXECUTE**: Run the trade (or reject it) normally
3. **VERIFY**: Anyone can later verify the full reasoning matches the pre-committed hash

This proves the agent's reasoning existed BEFORE the action — not fabricated after the fact.

## Usage

```typescript
import { SolprismShield, createTradeReasoningTrace } from './solprism';

// Initialize
const shield = new SolprismShield({ agentName: 'my-agent-shield' });

// Before a trade decision, commit the reasoning:
const commitment = shield.commitTradeDecision({
  tokenMint: 'So11111111111111111111111111111111111111112',
  action: 'buy',
  amount: 1.5,
  predictionStages: [
    { name: '10min-shortterm', passed: true, confidence: 85, reason: 'Uptrend confirmed' },
    { name: '5min-validation', passed: true, confidence: 78, reason: 'Secondary signal holds' },
    { name: '10min-final', passed: true, confidence: 82, reason: 'Third window passed' },
  ],
  scamCheck: {
    tokenMint: 'So111...',
    isScam: false,
    checks: ['liquidity-ok', 'holders-diverse', 'age-valid'],
    riskLevel: 'safe',
  },
  confidence: 82,
});

console.log(`Pre-trade reasoning hash: ${commitment.hash}`);

// Now execute the trade...
// The hash proves you reasoned BEFORE acting.

// Later, anyone can verify:
const isValid = shield.verify(commitment.hash, commitment.trace);
// true = reasoning was not tampered with
```

### Transaction Firewall Traces

```typescript
const firewallCommitment = shield.commitFirewallDecision({
  transactionType: 'swap',
  simulated: true,
  simulationPassed: true,
  spendLimitOk: true,
  slippageOk: true,
  programAllowed: true,
  approved: true,
  reason: 'All firewall checks passed',
});
```

## What Gets Committed

| AgentShield Check | SOLPRISM Trace Contents |
|-------------------|------------------------|
| Multi-stage prediction gate | Each stage result, confidence, pass/fail |
| Scam & liquidity defense | Risk level, specific checks run |
| Cyclic signal layer | Alignment score, time window |
| Transaction firewall | Simulation, limits, program allowlist |

## Integration Architecture

```
┌────────────────────────────────────────────────┐
│              AgentShield Pipeline                │
│                                                  │
│  Signal → Prediction → Scam Check → Firewall    │
│              ↓            ↓            ↓         │
│         ┌──────────────────────────────────┐     │
│         │  SolprismShield.commit(trace)     │     │
│         │  → Hash all decision data         │     │
│         │  → Pre-commit before execution    │     │
│         └──────────────────────────────────┘     │
│              ↓                                    │
│  Execute Trade (or Reject)                       │
│              ↓                                    │
│  Hash verifiable forever on Solana               │
└────────────────────────────────────────────────┘
```

## Files

- `src/solprism.ts` — Full integration (trace builders, commitment manager, verification)

## Links

- **SOLPRISM SDK**: [`@solprism/sdk@0.1.0`](https://github.com/basedmereum/axiom-protocol/tree/main/sdk)
- **SOLPRISM Program**: `CZcvoryaQNrtZ3qb3gC1h9opcYpzEP1D9Mu1RVwFQeBu`
- **Hackathon**: [Solana Agent Hackathon](https://colosseum.com/agent-hackathon)

## Zero Risk

- ✅ No changes to existing AgentShield logic
- ✅ Optional module — import only if you want it
- ✅ No new npm dependencies (uses Node.js `crypto`)
- ✅ No breaking changes to any existing code
