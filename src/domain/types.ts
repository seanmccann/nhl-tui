export type DetailTab = "summary" | "pbp" | "box";

export type GamePhase = "live" | "upcoming" | "final";

export type AppScreen =
  | {
      type: "scoreboard";
    }
  | {
      type: "standings";
    }
  | {
      type: "leaders";
    }
  | {
      type: "game";
      gameId: number;
      tab: DetailTab;
      pbpPage: number;
    };

export type BannerKind = "goal" | "game-start" | "period" | "game-end";

export type Banner = {
  id: string;
  kind: BannerKind;
  gameId: number;
  team?: string;
  title: string;
  subtitle?: string;
  createdAt: number;
};

export type AppEvent =
  | { type: "goal_scored"; gameId: number; team: string; timestamp: number }
  | { type: "game_started"; gameId: number; timestamp: number }
  | { type: "period_changed"; gameId: number; period: string; timestamp: number }
  | { type: "game_ended"; gameId: number; timestamp: number };

export type NormalizedTeam = {
  id: number;
  abbrev: string;
  location: string;
  shortName: string;
  score: number;
  shotsOnGoal?: number;
  record?: string;
};

export type GameClock = {
  periodNumber: number;
  periodType: string;
  periodLabel: string;
  timeRemaining: string;
  running: boolean;
  inIntermission: boolean;
};

export type NormalizedGame = {
  id: number;
  season: number;
  state: string;
  phase: GamePhase;
  section: "LIVE" | "UPCOMING" | "FINAL";
  startTimeUtc: string;
  startTimeEpochMs: number;
  startTimeLabel: string;
  statusLabel: string;
  contextLabel: string;
  periodLabel?: string;
  venue: string;
  away: NormalizedTeam;
  home: NormalizedTeam;
  clock?: GameClock;
};

export type SummaryGoal = {
  eventId: number;
  team: string;
  scorer: string;
  strength: string;
  timeInPeriod: string;
  periodLabel: string;
  scoreAfter: string;
  assists: string[];
};

export type SummaryPenalty = {
  team: string;
  player: string;
  drawnBy?: string;
  kind: string;
  duration: number;
  timeInPeriod: string;
  periodLabel: string;
};

export type SummaryScoringPeriod = {
  periodLabel: string;
  goals: SummaryGoal[];
};

export type SummaryPenaltyPeriod = {
  periodLabel: string;
  penalties: SummaryPenalty[];
};

export type ThreeStar = {
  star: number;
  player: string;
  team: string;
  position: string;
  statLine: string;
};

export type PeriodShots = {
  periodLabel: string;
  away: number;
  home: number;
};

export type GameSummary = {
  scoring: SummaryScoringPeriod[];
  penalties: SummaryPenaltyPeriod[];
  threeStars: ThreeStar[];
  shotsByPeriod?: PeriodShots[];
};

export type NormalizedPlay = {
  id: number;
  sortOrder: number;
  type: string;
  team?: string;
  title: string;
  detail?: string;
  score?: string;
  isGoal: boolean;
  periodLabel: string;
  timeInPeriod: string;
  timeRemaining: string;
};

export type PlayByPlay = {
  plays: NormalizedPlay[];
  lastEventId?: number;
};

export type SkaterStatLine = {
  playerId: number;
  sweaterNumber?: number;
  name: string;
  position: string;
  goals: number;
  assists: number;
  points: number;
  plusMinus?: number;
  shots: number;
  hits: number;
  pim: number;
  toi: string;
};

export type GoalieStatLine = {
  playerId: number;
  sweaterNumber?: number;
  name: string;
  saves: number;
  shotsAgainst: number;
  goalsAgainst: number;
  savePct: number;
  toi: string;
};

export type TeamBoxScore = {
  team: NormalizedTeam;
  skaters: SkaterStatLine[];
  goalies: GoalieStatLine[];
};

export type BoxScore = {
  away: TeamBoxScore;
  home: TeamBoxScore;
};

export type StandingsEntry = {
  teamAbbrev: string;
  teamName: string;
  conferenceAbbrev: string;
  conferenceName: string;
  divisionAbbrev: string;
  divisionName: string;
  divisionRank: number;
  conferenceRank: number;
  wildcardRank: number;
  leagueRank: number;
  points: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  row: number;
  streak: string;
  clinchIndicator?: string;
};

export type StandingsSection = {
  title: string;
  entries: StandingsEntry[];
};

export type ConferenceStandings = {
  conferenceAbbrev: string;
  conferenceName: string;
  sections: StandingsSection[];
};

export type NormalizedStandings = {
  date: string;
  conferences: ConferenceStandings[];
  lastUpdatedAt: number;
};

export type LeaderTableKey =
  | "points"
  | "goals"
  | "assists"
  | "goalsAgainstAverage"
  | "savePctg"
  | "shutouts";

export type LeaderEntry = {
  rank: number;
  playerId: number;
  player: string;
  teamAbbrev: string;
  position: string;
  value: number;
  displayValue: string;
};

export type LeaderTable = {
  key: LeaderTableKey;
  title: string;
  valueLabel: string;
  entries: LeaderEntry[];
};

export type NormalizedLeaders = {
  skaterTables: LeaderTable[];
  goalieTables: LeaderTable[];
  lastUpdatedAt: number;
};

export type NormalizedGameDetail = {
  game: NormalizedGame;
  summary?: GameSummary;
  pbp?: PlayByPlay;
  box?: BoxScore;
  lastUpdatedAt: number;
};

export type AppState = {
  screen: AppScreen;
  scoreboardDate: string;
  followingToday: boolean;
  games: NormalizedGame[];
  standingsByDate: Record<string, NormalizedStandings>;
  standingsErrorByDate: Record<string, string | undefined>;
  leaders?: NormalizedLeaders;
  leadersErrorMessage?: string;
  gameDetails: Record<number, NormalizedGameDetail>;
  gameDetailErrors: Record<number, string | undefined>;
  scoreboardLoadedDate?: string;
  scoreboardUpdatedAt?: number;
  scoreboardErrorMessage?: string;
  selectedGameId?: number;
  bannerQueue: Banner[];
  activeBanner?: Banner;
  recentEvents: AppEvent[];
  manualRefreshToken: number;
};
