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
export const USE_MOCK = true; // ← flip to false when Supabase is configured
// ── Simulated network latency (ms) ───────────────────────────────────────────
const MOCK_DELAY = 600;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
// ── Mock data ─────────────────────────────────────────────────────────────────
const MOCK_DASHBOARD_STATS = {
    totalEarned: "$1,842",
    activeRefs: 47,
    streakDays: 14,
    rank: 23,
    rankDelta: 5,
    weeklyEarnings: "$1,840",
    weeklyDelta: "+18.2%",
};
const MOCK_EARNINGS = [
    { day: "Mon", value: 120 },
    { day: "Tue", value: 185 },
    { day: "Wed", value: 140 },
    { day: "Thu", value: 310 },
    { day: "Fri", value: 275 },
    { day: "Sat", value: 420 },
    { day: "Sun", value: 390 },
];
const MOCK_XP_SUMMARY = {
    currentXP: 4280,
    levelXPGoal: 5000,
    level: 7,
    levelName: "Plug Master",
    todayXP: 250,
    xpToNextLevel: 720,
};
const MOCK_XP_ROWS = [
    { id: "xp1", label: "Shared Content", xp: 100, iconType: "share", timestamp: "Today, 9:14 AM" },
    { id: "xp2", label: "Logged Referral", xp: 50, iconType: "referral", timestamp: "Today, 11:02 AM" },
    { id: "xp3", label: "Completed Quest", xp: 100, iconType: "quest", timestamp: "Today, 2:47 PM" },
];
const MOCK_REFERRALS = [
    { id: "r1", name: "Emily", platform: "Acorns", status: "Approved", reward: "$10" },
    { id: "r2", name: "Jake", platform: "Rakuten", status: "Pending", reward: "$25" },
    { id: "r3", name: "Maria", platform: "Honey", status: "Rejected", reward: "—" },
];
const MOCK_LEADERBOARD_GLOBAL = [
    { rank: 1, name: "CryptoKing", handle: "@cryptoking", xp: 24800, earned: "$8,420", change: 0, avatar: "C" },
    { rank: 2, name: "MoneyQueen", handle: "@moneyqueen", xp: 21200, earned: "$7,100", change: 1, avatar: "M" },
    { rank: 3, name: "HustleBro", handle: "@hustlebro", xp: 18900, earned: "$6,340", change: -1, avatar: "H" },
];
const MOCK_LEADERBOARD_FRIENDS = [
    { rank: 1, name: "HustleBro", handle: "@hustlebro", xp: 18900, earned: "$6,340", change: 0, avatar: "H" },
    { rank: 2, name: "plugmaster", handle: "@plugmaster", xp: 4280, earned: "$1,842", change: 2, avatar: "P", isMe: true },
    { rank: 3, name: "MoneyMike", handle: "@mmike", xp: 3100, earned: "$1,040", change: -1, avatar: "M" },
];
// ── Real Supabase fetchers (implement when USE_MOCK = false) ──────────────────
async function realFetchDashboardStats() {
    const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .single();
    if (error)
        throw new Error(error.message);
    return data;
}
async function realFetchEarnings() {
    const { data, error } = await supabase
        .from("earnings_daily")
        .select("day, value")
        .order("date", { ascending: true })
        .limit(7);
    if (error)
        throw new Error(error.message);
    return data;
}
async function realFetchXPSummary() {
    const { data, error } = await supabase
        .from("xp_summary")
        .select("*")
        .single();
    if (error)
        throw new Error(error.message);
    return data;
}
async function realFetchXPRows() {
    const { data, error } = await supabase
        .from("xp_events")
        .select("id, label, xp, icon_type, timestamp")
        .order("timestamp", { ascending: false })
        .limit(10);
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((r) => ({
        id: r.id,
        label: r.label,
        xp: r.xp,
        iconType: r.icon_type,
        timestamp: r.timestamp,
    }));
}
async function realFetchReferrals() {
    const { data, error } = await supabase
        .from("referrals")
        .select("id, name, platform, status, reward")
        .order("created_at", { ascending: false })
        .limit(20);
    if (error)
        throw new Error(error.message);
    return data;
}
async function realFetchLeaderboard(tab) {
    const { data, error } = await supabase
        .from(tab === "global" ? "leaderboard_global" : "leaderboard_friends")
        .select("rank, name, handle, xp, earned, change, avatar, is_me")
        .order("rank", { ascending: true })
        .limit(10);
    if (error)
        throw new Error(error.message);
    return (data ?? []).map((r) => ({
        rank: r.rank,
        name: r.name,
        handle: r.handle,
        xp: r.xp,
        earned: r.earned,
        change: r.change,
        avatar: r.avatar,
        isMe: r.is_me,
    }));
}
// ── Public API (components call these exclusively) ────────────────────────────
export async function fetchDashboardStats() {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return MOCK_DASHBOARD_STATS;
    }
    return realFetchDashboardStats();
}
export async function fetchEarnings() {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return MOCK_EARNINGS;
    }
    return realFetchEarnings();
}
export async function fetchXPSummary() {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return MOCK_XP_SUMMARY;
    }
    return realFetchXPSummary();
}
export async function fetchXPRows() {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return MOCK_XP_ROWS;
    }
    return realFetchXPRows();
}
export async function fetchReferrals() {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return MOCK_REFERRALS;
    }
    return realFetchReferrals();
}
export async function fetchLeaderboard(tab) {
    if (USE_MOCK) {
        await delay(MOCK_DELAY);
        return tab === "global" ? MOCK_LEADERBOARD_GLOBAL : MOCK_LEADERBOARD_FRIENDS;
    }
    return realFetchLeaderboard(tab);
}
