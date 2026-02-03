# AgentShield 🛡️

AgentShield is a **safety-first Solana trading agent** that executes trades only after **multi-stage confirmation**.  
It combines market validation, scam detection, and time-based cyclic signal analysis (inspired by Vedic astrology) before allowing any on-chain action.

---

## 🚀 What Problem Does AgentShield Solve?

Most trading bots:
- Chase single signals
- Ignore scam risk
- Execute instantly with no confirmation
- Can drain wallets if compromised

**AgentShield does the opposite.**

---

## 🧠 Core Principles

### 1. Multi-Stage Prediction Gate
A trade is allowed **only if all stages pass**:
- 📊 Short-term movement confirmation (10 min)
- ⏱️ Secondary validation (5 min)
- 📈 Third confirmation window (10 min)
- 🔁 Optional long-cycle trend check (1–10 hours)

No shortcut. No override.

---

### 2. Scam & Liquidity Defense
Before any prediction:
- Token creation-time checks
- Liquidity & holder analysis
- Basic rug / scam heuristics
- Program allowlist enforcement

If a token fails → **hard reject**.

---

### 3. Cyclic Signal Layer (Astrology-Inspired)
AgentShield can optionally apply **time-based cyclic rules** inspired by Vedic astrology:
- Planetary cycle windows
- Time-alignment scoring
- Trend bias validation

⚠️ Astrology is **never used alone** — it is an **additional confirmation layer**, not the trigger.

---

### 4. Transaction Firewall
Every transaction is:
- Simulated before execution
- Restricted by spend & slippage limits
- Logged with allow/deny reasoning
- Executed only via approved Solana programs

---

## 🏗️ High-Level Architecture

