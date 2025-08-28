import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string;
          name: string;
          abbreviation: string;
          conference: 'AFC' | 'NFC';
          division: string;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          abbreviation: string;
          conference: 'AFC' | 'NFC';
          division: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          abbreviation?: string;
          conference?: 'AFC' | 'NFC';
          division?: string;
          created_at?: string;
        };
      };
      pools: {
        Row: {
          id: string;
          name: string;
          admin_id: string;
          starting_lives: number;
          current_week: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          admin_id: string;
          starting_lives?: number;
          current_week?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          admin_id?: string;
          starting_lives?: number;
          current_week?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      players: {
        Row: {
          id: string;
          pool_id: string;
          user_id: string;
          display_name: string;
          lives_remaining: number;
          is_eliminated: boolean;
          joined_at: string;
        };
        Insert: {
          id?: string;
          pool_id: string;
          user_id: string;
          display_name: string;
          lives_remaining?: number;
          is_eliminated?: boolean;
          joined_at?: string;
        };
        Update: {
          id?: string;
          pool_id?: string;
          user_id?: string;
          display_name?: string;
          lives_remaining?: number;
          is_eliminated?: boolean;
          joined_at?: string;
        };
      };
      games: {
        Row: {
          id: string;
          season: number;
          week_number: number;
          home_team: string;
          away_team: string;
          home_score: number | null;
          away_score: number | null;
          game_time: string;
          is_complete: boolean;
          winner: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season: number;
          week_number: number;
          home_team: string;
          away_team: string;
          home_score?: number | null;
          away_score?: number | null;
          game_time: string;
          is_complete?: boolean;
          winner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season?: number;
          week_number?: number;
          home_team?: string;
          away_team?: string;
          home_score?: number | null;
          away_score?: number | null;
          game_time?: string;
          is_complete?: boolean;
          winner?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      picks: {
        Row: {
          id: string;
          player_id: string;
          pool_id: string;
          week_number: number;
          team_id: string;
          is_correct: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          pool_id: string;
          week_number: number;
          team_id: string;
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          player_id?: string;
          pool_id?: string;
          week_number?: number;
          team_id?: string;
          is_correct?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      pool_standings: {
        Row: {
          pool_id: string;
          player_id: string;
          display_name: string;
          lives_remaining: number;
          is_eliminated: boolean;
          weeks_played: number;
          correct_picks: number;
          incorrect_picks: number;
        };
      };
    };
    Functions: {
      get_available_teams: {
        Args: {
          player_uuid: string;
        };
        Returns: {
          team_id: string;
          team_name: string;
          team_abbreviation: string;
        }[];
      };
    };
  };
};