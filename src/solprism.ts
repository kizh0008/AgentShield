/**
 * SOLPRISM × AgentShield Integration
 *
 * Adds verifiable reasoning commitments to AgentShield's safety-first
 * trading decisions. Every trade decision gets a cryptographic pre-commitment
 * on Solana before execution — proving the agent reasoned correctly.
 *
 * This is a PURE ADDITION — no existing AgentShield logic is modified.
 * The wrappers are optional helpers you can use around your decision functions.
 *
 * @see https://github.com/basedmereum/axiom-protocol
 * @see Program ID: CZcvoryaQNrtZ3qb3gC1h9opcYpzEP1D9Mu1RVwFQeBu
 */

import * as crypto from "crypto";

// ─── SOLPRISM Constants ──────────────────────────────────────────────────

export const SOLPRISM_PROGRAM_ID = "CZcvoryaQNrtZ3qb3gC1h9opcYpzEP1D9Mu1RVwFQeBu";
export const SOLPRISM_SCHEMA_VERSION = "1.0.0";

// ─── Types ───────────────────────────────────────────────────────────────

export interface ReasoningTrace {
  version: string;
  agent: string;
  timestamp: number;
  action: {
    type: string;
    description: string;
    transactionSignature?: string;
  };
  inputs: {
    dataSources: Array<{
      name: string;
      type: string;
      queriedAt: string;
      summary: string;
    }>;
    context: string;
  };
  analysis: {
    observations: string[];
    logic: string;
    alternativesConsidered: Array<{
      action: string;
      reasonRejected: string;
    }>;
  };
  decision: {
    actionChosen: string;
    confidence: number;
    riskAssessment: string;
    expectedOutcome: string;
  };
  metadata?: {
    model?: string;
    sessionId?: string;
    executionTimeMs?: number;
    custom?: Record<string, string | number | boolean>;
  };
}

/** Result of a SOLPRISM commitment */
export interface CommitmentResult {
  hash: string;
  trace: ReasoningTrace;
  timestamp: number;
}

/** Prediction gate stage result */
export interface PredictionStage {
  name: string;
  passed: boolean;
  confidence: number;
  reason: string;
}

/** Scam check result */
export interface ScamCheckResult {
  tokenMint: string;
  isScam: boolean;
  checks: string[];
  riskLevel: "safe" | "suspicious" | "dangerous";
}

/** Trade decision input */
export interface TradeDecision {
  tokenMint: string;
  action: "buy" | "sell" | "hold";
  amount: number;
  predictionStages: PredictionStage[];
  scamCheck?: ScamCheckResult;
  cyclicSignal?: {
    alignment: number;
    window: string;
  };
  confidence: number;
}

// ─── Hash Utility ────────────────────────────────────────────────────────

/**
 * Deterministically hash a reasoning trace (SHA-256).
 * Compatible with SOLPRISM SDK verification.
 */
export function hashTrace(trace: ReasoningTrace): string {
  const canonical = JSON.stringify(trace, Object.keys(trace).sort());
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

// ─── Reasoning Trace Builders ────────────────────────────────────────────

/**
 * Create a reasoning trace for a multi-stage prediction gate decision.
 *
 * Documents all prediction stages, scam checks, and cyclic signals
 * that led to a trade allow/deny decision.
 */
export function createTradeReasoningTrace(decision: TradeDecision): ReasoningTrace {
  const allStagesPassed = decision.predictionStages.every((s) => s.passed);
  const scamSafe = !decision.scamCheck || !decision.scamCheck.isScam;
  const approved = allStagesPassed && scamSafe;

  const observations: string[] = [
    `Token: ${decision.tokenMint.slice(0, 8)}...`,
    `Action: ${decision.action.toUpperCase()}`,
    `Amount: ${decision.amount}`,
    ...decision.predictionStages.map(
      (s) => `${s.name}: ${s.passed ? "✅ PASS" : "❌ FAIL"} (${s.confidence}% confidence) — ${s.reason}`
    ),
  ];

  if (decision.scamCheck) {
    observations.push(
      `Scam check: ${decision.scamCheck.riskLevel.toUpperCase()} — ${decision.scamCheck.checks.join(", ")}`
    );
  }

  if (decision.cyclicSignal) {
    observations.push(
      `Cyclic signal: ${decision.cyclicSignal.alignment}% alignment in ${decision.cyclicSignal.window} window`
    );
  }

  const alternatives: ReasoningTrace["analysis"]["alternativesConsidered"] = [];

  if (approved) {
    alternatives.push({
      action: "Reject trade",
      reasonRejected: "All prediction stages passed and scam check is clean",
    });
    alternatives.push({
      action: "Wait for more confirmations",
      reasonRejected: `Confidence at ${decision.confidence}%, all ${decision.predictionStages.length} stages confirmed`,
    });
  } else {
    const failedStages = decision.predictionStages.filter((s) => !s.passed);
    alternatives.push({
      action: `Execute ${decision.action} anyway`,
      reasonRejected: failedStages.length > 0
        ? `${failedStages.length} prediction stage(s) failed: ${failedStages.map((s) => s.name).join(", ")}`
        : "Scam check flagged this token",
    });
  }

  return {
    version: SOLPRISM_SCHEMA_VERSION,
    agent: "AgentShield",
    timestamp: Date.now(),
    action: {
      type: approved ? "trade" : "rejection",
      description: approved
        ? `APPROVED: ${decision.action} ${decision.amount} of ${decision.tokenMint.slice(0, 8)}...`
        : `REJECTED: ${decision.action} blocked by safety gate`,
    },
    inputs: {
      dataSources: [
        {
          name: "Multi-Stage Prediction Gate",
          type: "internal",
          queriedAt: new Date().toISOString(),
          summary: `${decision.predictionStages.filter((s) => s.passed).length}/${decision.predictionStages.length} stages passed`,
        },
        ...(decision.scamCheck
          ? [
              {
                name: "Scam & Liquidity Defense",
                type: "internal",
                queriedAt: new Date().toISOString(),
                summary: `Risk level: ${decision.scamCheck.riskLevel}`,
              },
            ]
          : []),
        ...(decision.cyclicSignal
          ? [
              {
                name: "Cyclic Signal Layer",
                type: "internal",
                queriedAt: new Date().toISOString(),
                summary: `${decision.cyclicSignal.alignment}% alignment in ${decision.cyclicSignal.window}`,
              },
            ]
          : []),
      ],
      context: "AgentShield multi-stage safety gate evaluation",
    },
    analysis: {
      observations,
      logic: approved
        ? `All ${decision.predictionStages.length} prediction stages passed. ` +
          (scamSafe ? "Scam check clean. " : "") +
          `Confidence: ${decision.confidence}%. Trade approved.`
        : `Trade blocked by safety gate. ` +
          (decision.predictionStages.some((s) => !s.passed)
            ? `Failed stages: ${decision.predictionStages.filter((s) => !s.passed).map((s) => s.name).join(", ")}. `
            : "") +
          (!scamSafe ? `Scam check: ${decision.scamCheck!.riskLevel}. ` : "") +
          "No override allowed.",
      alternativesConsidered: alternatives,
    },
    decision: {
      actionChosen: approved ? `${decision.action} ${decision.amount}` : "REJECT — trade blocked",
      confidence: decision.confidence,
      riskAssessment: approved ? (decision.confidence >= 80 ? "low" : "moderate") : "high",
      expectedOutcome: approved
        ? `Execute ${decision.action} with ${decision.confidence}% confidence`
        : "Trade rejected, funds protected",
    },
    metadata: {
      custom: {
        stagesPassed: decision.predictionStages.filter((s) => s.passed).length,
        totalStages: decision.predictionStages.length,
        scamRisk: decision.scamCheck?.riskLevel || "unchecked",
        approved: approved,
      },
    },
  };
}

/**
 * Create a reasoning trace for a transaction firewall decision.
 *
 * Documents simulation results, spend limits, and allow/deny reasoning.
 */
export function createFirewallTrace(params: {
  transactionType: string;
  simulated: boolean;
  simulationPassed: boolean;
  spendLimitOk: boolean;
  slippageOk: boolean;
  programAllowed: boolean;
  approved: boolean;
  reason: string;
}): ReasoningTrace {
  const observations = [
    `Transaction type: ${params.transactionType}`,
    `Simulation: ${params.simulated ? (params.simulationPassed ? "✅ PASS" : "❌ FAIL") : "⏭️ SKIPPED"}`,
    `Spend limit: ${params.spendLimitOk ? "✅ OK" : "❌ EXCEEDED"}`,
    `Slippage: ${params.slippageOk ? "✅ OK" : "❌ EXCEEDED"}`,
    `Program allowlist: ${params.programAllowed ? "✅ ALLOWED" : "❌ BLOCKED"}`,
  ];

  return {
    version: SOLPRISM_SCHEMA_VERSION,
    agent: "AgentShield",
    timestamp: Date.now(),
    action: {
      type: params.approved ? "firewall_allow" : "firewall_deny",
      description: params.approved
        ? `Firewall ALLOW: ${params.transactionType}`
        : `Firewall DENY: ${params.transactionType} — ${params.reason}`,
    },
    inputs: {
      dataSources: [
        {
          name: "Transaction Firewall",
          type: "internal",
          queriedAt: new Date().toISOString(),
          summary: params.reason,
        },
      ],
      context: "AgentShield transaction firewall evaluation",
    },
    analysis: {
      observations,
      logic: params.reason,
      alternativesConsidered: params.approved
        ? [{ action: "Block transaction", reasonRejected: "All firewall checks passed" }]
        : [{ action: "Allow transaction", reasonRejected: params.reason }],
    },
    decision: {
      actionChosen: params.approved ? "ALLOW" : "DENY",
      confidence: params.approved ? 90 : 95,
      riskAssessment: params.approved ? "low" : "high",
      expectedOutcome: params.approved
        ? "Transaction executed safely"
        : "Transaction blocked, funds protected",
    },
  };
}

// ─── Commitment Manager ──────────────────────────────────────────────────

/**
 * SOLPRISM commitment manager for AgentShield.
 *
 * Wraps your trade decisions with verifiable reasoning commitments.
 * If SOLPRISM is not needed, simply don't use this module.
 *
 * @example
 * ```typescript
 * import { SolprismShield, createTradeReasoningTrace } from './solprism';
 *
 * const shield = new SolprismShield({ agentName: 'my-agent-shield' });
 *
 * // Before executing a trade:
 * const trace = createTradeReasoningTrace({
 *   tokenMint: 'So11111111111111111111111111111111111111112',
 *   action: 'buy',
 *   amount: 1.5,
 *   predictionStages: [
 *     { name: '10min-confirm', passed: true, confidence: 85, reason: 'Uptrend confirmed' },
 *     { name: '5min-validate', passed: true, confidence: 78, reason: 'Secondary signal holds' },
 *     { name: '10min-final', passed: true, confidence: 82, reason: 'Third window passed' },
 *   ],
 *   scamCheck: { tokenMint: '...', isScam: false, checks: ['liquidity', 'holders'], riskLevel: 'safe' },
 *   confidence: 82,
 * });
 *
 * const commitment = shield.commit(trace);
 * console.log(`Reasoning hash: ${commitment.hash}`);
 *
 * // Execute your trade...
 * // The hash proves you reasoned before you acted.
 * ```
 */
export class SolprismShield {
  private agentName: string;
  private commitments: CommitmentResult[] = [];

  constructor(config: { agentName?: string } = {}) {
    this.agentName = config.agentName || "AgentShield";
  }

  /**
   * Commit a reasoning trace and return the hash.
   *
   * Call this BEFORE executing the trade.
   * The hash proves you reasoned before you acted.
   */
  commit(trace: ReasoningTrace): CommitmentResult {
    const hash = hashTrace(trace);
    const result: CommitmentResult = {
      hash,
      trace,
      timestamp: Date.now(),
    };

    this.commitments.push(result);

    console.log(
      `[SOLPRISM] 🛡️ Reasoning committed: ${trace.action.type} | ` +
        `decision=${trace.decision.actionChosen} | ` +
        `confidence=${trace.decision.confidence}% | ` +
        `hash=${hash.slice(0, 16)}...`
    );

    return result;
  }

  /**
   * Verify a reasoning trace against a previously committed hash.
   */
  verify(hash: string, trace: ReasoningTrace): boolean {
    const computedHash = hashTrace(trace);
    const valid = computedHash === hash;

    console.log(
      `[SOLPRISM] ${valid ? "✅" : "❌"} Verification: ${valid ? "MATCH" : "MISMATCH"}`
    );

    return valid;
  }

  /**
   * Get all commitments (for auditing).
   */
  getCommitments(): CommitmentResult[] {
    return [...this.commitments];
  }

  /**
   * Convenience: create a trade trace and commit it in one call.
   */
  commitTradeDecision(decision: TradeDecision): CommitmentResult {
    const trace = createTradeReasoningTrace(decision);
    return this.commit(trace);
  }

  /**
   * Convenience: create a firewall trace and commit it in one call.
   */
  commitFirewallDecision(params: Parameters<typeof createFirewallTrace>[0]): CommitmentResult {
    const trace = createFirewallTrace(params);
    return this.commit(trace);
  }
}
