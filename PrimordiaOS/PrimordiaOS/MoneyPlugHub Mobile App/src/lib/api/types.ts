// ── Shared API types ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalEarned: string;
  activeRefs: number;
  streakDays: number;
  rank: number;
  rankDelta: number;
  weeklyEarnings: string;
  weeklyDelta: string;
}

export interface EarningsPoint {
  day: string;
  value: number;
}

export interface XPSummary {
  currentXP: number;
  levelXPGoal: number;
  level: number;
  levelName: string;
  todayXP: number;
  xpToNextLevel: number;
}

export interface XPRow {
  id: string;
  label: string;
  xp: number;
  iconType: "share" | "referral" | "quest";
  timestamp: string;
}

export interface ReferralEntry {
  id: string;
  name: string;
  platform: string;
  status: "Approved" | "Pending" | "Rejected";
  reward: string;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  xp: number;
  earned: string;
  change: number;
  avatar: string;
  isMe?: boolean;
}

// Generic async state wrapper
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
