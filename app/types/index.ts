export interface NFLTeam {
  id: string;
  name: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: string;
}

export interface Week {
  weekNumber: number;
  games: Game[];
  deadline: Date;
}

export interface Game {
  id: string;
  weekNumber: number;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  gameTime: Date;
  isComplete: boolean;
  winner?: string;
}

export interface Player {
  id: string;
  name: string;
  email: string;
  livesRemaining: number;
  picks: Pick[];
  isEliminated: boolean;
}

export interface Pick {
  playerId: string;
  weekNumber: number;
  teamId: string;
  isCorrect?: boolean;
  timestamp: Date;
}

export interface Pool {
  id: string;
  name: string;
  adminId: string;
  players: Player[];
  currentWeek: number;
  startingLives: number;
  isActive: boolean;
  createdAt: Date;
}