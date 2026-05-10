/**
 * Tipi minimi per il client; rigenera con `supabase gen types` quando lo schema è stabile.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Views: Record<string, never>
    Tables: {
      tournaments: {
        Row: {
          id: string
          organizer_id: string | null
          slug: string
          name: string
          location: string | null
          format: 5 | 6 | 7
          starts_on: string | null
          ends_on: string | null
          is_public: boolean
          theme_primary: string
          theme_secondary: string
          logo_url: string | null
          custom_domain: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['tournaments']['Row']> & {
          slug: string
          name: string
          format: 5 | 6 | 7
        }
        Update: Partial<Database['public']['Tables']['tournaments']['Row']>
        Relationships: []
      }
      platform_operators: {
        Row: {
          user_id: string
          created_at: string
        }
        Insert: { user_id: string }
        Update: Partial<{ user_id: string; created_at: string }>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          tournament_id: string
          group_id: string | null
          phase: 'group' | 'knockout' | 'placement'
          round_label: string | null
          knockout_slot: number | null
          home_team_id: string
          away_team_id: string
          scheduled_at: string | null
          started_at: string | null
          status: 'scheduled' | 'live' | 'finished' | 'cancelled'
          home_score: number
          away_score: number
          current_minute: number | null
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
        Relationships: []
      }
    }
    Enums: {
      match_phase: 'group' | 'knockout' | 'placement'
      match_status: 'scheduled' | 'live' | 'finished' | 'cancelled'
    }
    Functions: {
      create_tournament_with_owner: {
        Args: {
          p_organizer_id: string
          p_slug: string
          p_name: string
          p_location: string
          p_format: number
          p_theme_primary?: string | null
          p_theme_secondary?: string | null
          p_is_public?: boolean | null
          p_custom_domain?: string | null
        }
        Returns: string
      }
    }
  }
}
