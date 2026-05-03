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
  completed?: boolean;
}
