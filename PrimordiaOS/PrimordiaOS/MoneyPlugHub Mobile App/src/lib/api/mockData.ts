/**
 * Mock data bridge.
 *
 * Set USE_MOCK = false and implement the `real*` functions below
 * to switch from mock responses to live Supabase queries.
 *
 * All exported fetch functions share the same signature regardless
 * of which backend is active, so components never change.
 */

import { supabase } from "./supabase";
import type {
  DashboardStats,
  EarningsPoint,
  XPSummary,
  XPRow,
  ReferralEntry,
  LeaderboardEntry,
} from "./types";

export const USE_MOCK = true; // ← flip to false when Supabase is configured

// ── Simulated network latency (ms) ───────────────────────────────────────────
const MOCK_DELAY = 600;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalEarned:    "$1,842",
  activeRefs:     47,
  streakDays:     14,
  rank:           23,
  rankDelta:      5,
  weeklyEarnings: "$1,840",
  weeklyDelta:    "+18.2%",
};

const MOCK_EARNINGS: EarningsPoint[] = [
  { day: "Mon", value: 120 },
  { day: "Tue", value: 185 },
  { day: "Wed", value: 140 },
  { day: "Thu", value: 310 },
  { day: "Fri", value: 275 },
  { day: "Sat", value: 420 },
  { day: "Sun", value: 390 },
];

const MOCK_XP_SUMMARY: XPSummary = {
  currentXP:      4280,
  levelXPGoal:    5000,
  level:          7,
  levelName:      "Plug Master",
  todayXP:        250,
  xpToNextLevel:  720,
};

const MOCK_XP_ROWS: XPRow[] = [
  { id: "xp1", label: "Shared Content",  xp: 100, iconType: "share",    timestamp: "Today, 9:14 AM" },
  { id: "xp2", label: "Logged Referral", xp: 50,  iconType: "referral", timestamp: "Today, 11:02 AM" },
  { id: "xp3", label: "Completed Quest", xp: 100, iconType: "quest",    timestamp: "Today, 2:47 PM" },
];

const MOCK_REFERRALS: ReferralEntry[] = [
  { id: "r1", name: "Emily", platform: "Acorns",  status: "Approved", reward: "$10" },
  { id: "r2", name: "Jake",  platform: "Rakuten", status: "Pending",  reward: "$25" },
  { id: "r3", name: "Maria", platform: "Honey",   status: "Rejected", reward: "—"  },
];

const MOCK_LEADERBOARD_GLOBAL: LeaderboardEntry[] = [
  { rank: 1, name: "CryptoKing",  handle: "@cryptoking",  xp: 24800, earned: "$8,420", change:  0, avatar: "C" },
  { rank: 2, name: "MoneyQueen", handle: "@moneyqueen", xp: 21200, earned: "$7,100", change:  1, avatar: "M" },
  { rank: 3, name: "HustleBro",  handle: "@hustlebro",  xp: 18900, earned: "$6,340", change: -1, avatar: "H" },
];

const MOCK_LEADERBOARD_FRIENDS: LeaderboardEntry[] = [
  { rank: 1, name: "HustleBro",  handle: "@hustlebro",  xp: 18900, earned: "$6,340", change:  0, avatar: "H" },
  { rank: 2, name: "plugmaster", handle: "@plugmaster", xp:  4280, earned: "$1,842", change:  2, avatar: "P", isMe: true },
  { rank: 3, name: "MoneyMike",  handle: "@mmike",      xp:  3100, earned: "$1,040", change: -1, avatar: "M" },
];

// ── Real Supabase fetchers (implement when USE_MOCK = false) ──────────────────

async function realFetchDashboardStats(): Promise<DashboardStats> {
  const { data, error } = await supabase
    .from("user_stats")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as DashboardStats;
}

async function realFetchEarnings(): Promise<EarningsPoint[]> {
  const { data, error } = await supabase
    .from("earnings_daily")
    .select("day, value")
    .order("date", { ascending: true })
    .limit(7);
  if (error) throw new Error(error.message);
  return data as EarningsPoint[];
}

async function realFetchXPSummary(): Promise<XPSummary> {
  const { data, error } = await supabase
    .from("xp_summary")
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as XPSummary;
}

async function realFetchXPRows(): Promise<XPRow[]> {
  const { data, error } = await supabase
    .from("xp_events")
    .select("id, label, xp, icon_type, timestamp")
    .order("timestamp", { ascending: false })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    id:        r.id as string,
    label:     r.label as string,
    xp:        r.xp as number,
    iconType:  r.icon_type as XPRow["iconType"],
    timestamp: r.timestamp as string,
  }));
}

async function realFetchReferrals(): Promise<ReferralEntry[]> {
  const { data, error } = await supabase
    .from("referrals")
    .select("id, name, platform, status, reward")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return data as ReferralEntry[];
}

async function realFetchLeaderboard(tab: "global" | "friends"): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from(tab === "global" ? "leaderboard_global" : "leaderboard_friends")
    .select("rank, name, handle, xp, earned, change, avatar, is_me")
    .order("rank", { ascending: true })
    .limit(10);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: Record<string, unknown>) => ({
    rank:   r.rank as number,
    name:   r.name as string,
    handle: r.handle as string,
    xp:     r.xp as number,
    earned: r.earned as string,
    change: r.change as number,
    avatar: r.avatar as string,
    isMe:   r.is_me as boolean | undefined,
  }));
}

// ── Public API (components call these exclusively) ────────────────────────────

export async function fetchDashboardStats(): Promise<DashboardStats> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return MOCK_DASHBOARD_STATS; }
  return realFetchDashboardStats();
}

export async function fetchEarnings(): Promise<EarningsPoint[]> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return MOCK_EARNINGS; }
  return realFetchEarnings();
}

export async function fetchXPSummary(): Promise<XPSummary> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return MOCK_XP_SUMMARY; }
  return realFetchXPSummary();
}

export async function fetchXPRows(): Promise<XPRow[]> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return MOCK_XP_ROWS; }
  return realFetchXPRows();
}

export async function fetchReferrals(): Promise<ReferralEntry[]> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return MOCK_REFERRALS; }
  return realFetchReferrals();
}

export async function fetchLeaderboard(tab: "global" | "friends"): Promise<LeaderboardEntry[]> {
  if (USE_MOCK) { await delay(MOCK_DELAY); return tab === "global" ? MOCK_LEADERBOARD_GLOBAL : MOCK_LEADERBOARD_FRIENDS; }
  return realFetchLeaderboard(tab);
}
