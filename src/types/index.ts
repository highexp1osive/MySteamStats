export interface GameWithPlaytime {
  id: string;
  steamAppId: number;
  name: string;
  coverUrl: string;
  headerUrl: string;
  genres: string[];
  playtimeMinutes: number;
  playtime2Weeks: number;
  lastPlayedAt: string | null;
}

export interface AIAnalysisResult {
  personality?: string;
  tags?: string[];
  summary?: string;
  recommendations?: { name: string; reason: string }[];
}
