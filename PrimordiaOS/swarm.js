import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Specialized Sub-Agent Tools Registry
const swarmTools = {
  // 1. Vault & Cashflow Agent
  get_vault_telemetry: async () => ({
    velocity: "+$0.0014/sec",
    runway_days: 142,
    net_worth: "$18,420",
    tier: 3,
    status: "Supercritical"
  }),

  // 2. Debt Elimination Agent
  calculate_debt_payoff: async ({ amount, strategy = "avalanche" }) => ({
    strategy,
    applied_amount: amount,
    new_payoff_date: "November 14, 2026",
    days_saved: 24,
    interest_saved: "$312.50"
  }),

  // 3. Creator Leverage & Affiliate Agent
  calculate_creator_leverage: async ({ referrals, avg_payout = 15 }) => {
    const monthly = referrals * avg_payout;
    const arr = monthly * 12;
    const stockEquivalent = arr / 0.08;
    return {
      monthly_recurring: `$${monthly}`,
      arr: `$${arr}`,
      stock_equivalent: `$${stockEquivalent.toLocaleString()}`
    };
  }
};

const toolDeclarations = [{
  functionDeclarations: [
    {
      name: "get_vault_telemetry",
      description: "Fetches live velocity, savings rate, runway days, and Vault Tier status.",
      parameters: { type: "OBJECT", properties: {} }
    },
    {
      name: "calculate_debt_payoff",
      description: "Calculates interest savings and updated debt-free milestones.",
      parameters: {
        type: "OBJECT",
        properties: {
          amount: { type: "NUMBER", description: "Payment amount in USD" },
          strategy: { type: "STRING", description: "avalanche or snowball" }
        },
        required: ["amount"]
      }
    },
    {
      name: "calculate_creator_leverage",
      description: "Calculates creator referral leverage vs stock portfolio equivalent.",
      parameters: {
        type: "OBJECT",
        properties: {
          referrals: { type: "NUMBER", description: "Monthly referral count" },
          avg_payout: { type: "NUMBER", description: "Average payout per referral in USD" }
        },
        required: ["referrals"]
      }
    }
  ]
}];

const supervisorModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  tools: toolDeclarations,
  systemInstruction: `You are PulseCore Root Supervisor for MoneyPlugHub.
Direct queries to appropriate tools:
- Vault balances, envelopes, velocity: call get_vault_telemetry
- Debt payments, payoff timelines, interest savings: call calculate_debt_payoff
- Referrals, affiliate income, asset yields: call calculate_creator_leverage
Deliver sharp, direct, 1-2 sentence responses with exact financial metrics.`
});

export async function processSwarmCommand(userMessage) {
  const chat = supervisorModel.startChat();
  let response = await chat.sendMessage(userMessage);
  const calls = response.response.functionCalls();

  if (calls && calls.length > 0) {
    const call = calls[0];
    const executor = swarmTools[call.name];
    const toolOutput = executor ? await executor(call.args) : { error: `Tool ${call.name} not found.` };

    response = await chat.sendMessage([{
      functionResponse: {
        name: call.name,
        response: toolOutput
      }
    }]);
  }

  return response.response.text();
}
