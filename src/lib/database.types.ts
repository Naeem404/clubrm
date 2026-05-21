export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          onboarding_completed: boolean
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          role?: string
          onboarding_completed?: boolean
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: string
          onboarding_completed?: boolean
          avatar_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          id: string
          name: string
          email: string
          phone: string
          role: string
          status: string
          join_date: string
          avatar: string | null
          department: string
          year: string
          tasks_completed: number
          events_attended: number
          bio: string | null
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          phone?: string
          role?: string
          status?: string
          join_date?: string
          avatar?: string | null
          department?: string
          year?: string
          tasks_completed?: number
          events_attended?: number
          bio?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          email?: string
          phone?: string
          role?: string
          status?: string
          join_date?: string
          avatar?: string | null
          department?: string
          year?: string
          tasks_completed?: number
          events_attended?: number
          bio?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          title: string
          description: string
          start_date: string
          end_date: string
          all_day: boolean
          location: string
          color_id: string
          tags: string[]
          collaborators: string[]
          created_by: string
          capacity: number | null
          registered: number | null
          is_public: boolean
          status: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          start_date: string
          end_date: string
          all_day?: boolean
          location?: string
          color_id?: string
          tags?: string[]
          collaborators?: string[]
          created_by?: string
          capacity?: number | null
          registered?: number | null
          is_public?: boolean
          status?: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          start_date?: string
          end_date?: string
          all_day?: boolean
          location?: string
          color_id?: string
          tags?: string[]
          collaborators?: string[]
          created_by?: string
          capacity?: number | null
          registered?: number | null
          is_public?: boolean
          status?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string
          status: string
          priority: string
          assignees: string[]
          tags: string[]
          due_date: string | null
          start_date: string | null
          created_at: string
          completed_at: string | null
          dependencies: string[]
          subtasks: Json
          section: string | null
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string
          status?: string
          priority?: string
          assignees?: string[]
          tags?: string[]
          due_date?: string | null
          start_date?: string | null
          created_at?: string
          completed_at?: string | null
          dependencies?: string[]
          subtasks?: Json
          section?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          title?: string
          description?: string
          status?: string
          priority?: string
          assignees?: string[]
          tags?: string[]
          due_date?: string | null
          start_date?: string | null
          completed_at?: string | null
          dependencies?: string[]
          subtasks?: Json
          section?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          description: string
          amount: number
          category: string
          date: string
          status: string
          submitted_by: string
          approved_by: string | null
          receipt_url: string | null
          notes: string | null
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          description: string
          amount: number
          category: string
          date: string
          status?: string
          submitted_by: string
          approved_by?: string | null
          receipt_url?: string | null
          notes?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          description?: string
          amount?: number
          category?: string
          date?: string
          status?: string
          submitted_by?: string
          approved_by?: string | null
          receipt_url?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reimbursements: {
        Row: {
          id: string
          submitted_by: string
          amount: number
          description: string
          category: string
          date: string
          status: string
          receipt_url: string | null
          approved_by: string | null
          paid_date: string | null
          notes: string | null
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          submitted_by: string
          amount: number
          description: string
          category: string
          date: string
          status?: string
          receipt_url?: string | null
          approved_by?: string | null
          paid_date?: string | null
          notes?: string | null
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          submitted_by?: string
          amount?: number
          description?: string
          category?: string
          date?: string
          status?: string
          receipt_url?: string | null
          approved_by?: string | null
          paid_date?: string | null
          notes?: string | null
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      income: {
        Row: {
          id: string
          source: string
          amount: number
          type: string
          date: string
          notes: string | null
          recurring: boolean
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source: string
          amount: number
          type: string
          date: string
          notes?: string | null
          recurring?: boolean
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          source?: string
          amount?: number
          type?: string
          date?: string
          notes?: string | null
          recurring?: boolean
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          id: string
          total_budget: number
          term_label: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          total_budget: number
          term_label: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          total_budget?: number
          term_label?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sponsors: {
        Row: {
          id: string
          company: string
          logo: string | null
          tier: string
          status: string
          amount: number
          start_date: string
          end_date: string | null
          contacts: Json
          interactions: Json
          notes: string | null
          industry: string
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          company: string
          logo?: string | null
          tier: string
          status?: string
          amount?: number
          start_date: string
          end_date?: string | null
          contacts?: Json
          interactions?: Json
          notes?: string | null
          industry: string
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          company?: string
          logo?: string | null
          tier?: string
          status?: string
          amount?: number
          start_date?: string
          end_date?: string | null
          contacts?: Json
          interactions?: Json
          notes?: string | null
          industry?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          name: string
          description: string
          status: string
          start_date: string
          end_date: string
          posts: Json
          budget: number
          spent: number
          reach: number
          engagement: number
          tags: string[]
          organization_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string
          status?: string
          start_date: string
          end_date: string
          posts?: Json
          budget?: number
          spent?: number
          reach?: number
          engagement?: number
          tags?: string[]
          organization_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          description?: string
          status?: string
          start_date?: string
          end_date?: string
          posts?: Json
          budget?: number
          spent?: number
          reach?: number
          engagement?: number
          tags?: string[]
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      org_settings: {
        Row: {
          id: string
          name: string
          slug: string
          description: string
          email: string
          website: string
          university: string
          term: string
          timezone: string
          notification_prefs: Json
          theme: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string
          email: string
          website?: string
          university?: string
          term?: string
          timezone?: string
          notification_prefs?: Json
          theme?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string
          email?: string
          website?: string
          university?: string
          term?: string
          timezone?: string
          notification_prefs?: Json
          theme?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_invites: {
        Row: {
          id: string
          organization_id: string | null
          organization_name: string | null
          role: string
          email: string | null
          token: string
          expires_at: string | null
          used_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          organization_id?: string | null
          organization_name?: string | null
          role: string
          email?: string | null
          token: string
          expires_at?: string | null
          used_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          organization_id?: string | null
          organization_name?: string | null
          role?: string
          email?: string | null
          token?: string
          expires_at?: string | null
          used_at?: string | null
          created_by?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          id: string
          event_id: string
          name: string
          email: string
          rsvped_at: string
        }
        Insert: {
          id?: string
          event_id: string
          name: string
          email: string
          rsvped_at?: string
        }
        Update: {
          event_id?: string
          name?: string
          email?: string
          rsvped_at?: string
        }
        Relationships: []
      }
      sponsor_contacts: {
        Row: {
          id: string
          sponsor_id: string
          name: string
          email: string
          title: string
          phone: string
          organization: string
          tags: string[]
          notes: string | null
          last_contact: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sponsor_id: string
          name: string
          email: string
          title: string
          phone: string
          organization: string
          tags?: string[]
          notes?: string | null
          last_contact?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          sponsor_id?: string
          name?: string
          email?: string
          title?: string
          phone?: string
          organization?: string
          tags?: string[]
          notes?: string | null
          last_contact?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      stripe_sessions: {
        Row: {
          id: string
          user_id: string
          session_id: string
          amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          session_id: string
          amount: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          session_id?: string
          amount?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      socials: {
        Row: {
          id: string
          user_id: string
          full_name: string
          bio: string | null
          phone: string | null
          instagram: string
          facebook: string
          linkedin: string
          twitter: string
          tiktok: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          bio?: string | null
          phone?: string | null
          instagram: string
          facebook: string
          linkedin: string
          twitter: string
          tiktok: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          full_name?: string
          bio?: string | null
          phone?: string | null
          instagram?: string
          facebook?: string
          linkedin?: string
          twitter?: string
          tiktok?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          name: string
          category: "governance" | "finance" | "events" | "other"
          file_type: string
          size: string
          uploaded_at: string
          uploaded_by: string
          storage_path: string
        }
        Insert: {
          id?: string
          name: string
          category: "governance" | "finance" | "events" | "other"
          file_type: string
          size: string
          uploaded_at?: string
          uploaded_by: string
          storage_path: string
        }
        Update: {
          name?: string
          category?: "governance" | "finance" | "events" | "other"
          file_type?: string
          size?: string
          uploaded_by?: string
          storage_path?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}
