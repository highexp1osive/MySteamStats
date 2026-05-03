export interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  playtime_2weeks?: number;
  img_icon_url: string;
  img_logo_url: string;
  last_played?: number;
}

export interface PlayerSummary {
  steamid: string;
  personaname: string;
  avatarfull: string;
  profileurl: string;
}

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
