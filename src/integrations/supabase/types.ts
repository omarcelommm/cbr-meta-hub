export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      mentorados: {
        Row: {
          cidade: string | null
          especialidade: string | null
          id: string
          nome: string | null
          user_id: string | null
        }
        Insert: {
          cidade?: string | null
          especialidade?: string | null
          id?: string
          nome?: string | null
          user_id?: string | null
        }
        Update: {
          cidade?: string | null
          especialidade?: string | null
          id?: string
          nome?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      metas_mensais: {
        Row: {
          ano: number
          cenario_escolhido: string | null
          dias_trabalhados: number
          id: string
          mentorado_id: string
          mes: number
          meta_escolhida: number
          pct_otimista: number
          pct_pessimista: number
          pct_realista: number
        }
        Insert: {
          ano: number
          cenario_escolhido?: string | null
          dias_trabalhados?: number
          id?: string
          mentorado_id: string
          mes: number
          meta_escolhida?: number
          pct_otimista?: number
          pct_pessimista?: number
          pct_realista?: number
        }
        Update: {
          ano?: number
          cenario_escolhido?: string | null
          dias_trabalhados?: number
          id?: string
          mentorado_id?: string
          mes?: number
          meta_escolhida?: number
          pct_otimista?: number
          pct_pessimista?: number
          pct_realista?: number
        }
        Relationships: [
          {
            foreignKeyName: "metas_mensais_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
      snapshots_horarios: {
        Row: {
          created_at: string
          horario: string
          id: string
          orcado: number
          realizado: number
          venda_diaria_id: string
        }
        Insert: {
          created_at?: string
          horario: string
          id?: string
          orcado?: number
          realizado?: number
          venda_diaria_id: string
        }
        Update: {
          created_at?: string
          horario?: string
          id?: string
          orcado?: number
          realizado?: number
          venda_diaria_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snapshots_horarios_venda_diaria_id_fkey"
            columns: ["venda_diaria_id"]
            isOneToOne: false
            referencedRelation: "vendas_diarias"
            referencedColumns: ["id"]
          },
        ]
      }
      vendas_diarias: {
        Row: {
          clientes_unicos: number
          consultas: number
          created_at: string
          data: string
          dia_trabalhado: boolean
          hiperbarica: number
          id: string
          injetaveis: number
          mentorado_id: string
          no_shows: number
          observacao: string | null
          orcado_total: number
          outros: number
          pacientes_novos: number
          procedimentos: number
          slots_agenda: number
          slots_ocupados: number
          updated_at: string
        }
        Insert: {
          clientes_unicos?: number
          consultas?: number
          created_at?: string
          data: string
          dia_trabalhado?: boolean
          hiperbarica?: number
          id?: string
          injetaveis?: number
          mentorado_id: string
          no_shows?: number
          observacao?: string | null
          orcado_total?: number
          outros?: number
          pacientes_novos?: number
          procedimentos?: number
          slots_agenda?: number
          slots_ocupados?: number
          updated_at?: string
        }
        Update: {
          clientes_unicos?: number
          consultas?: number
          created_at?: string
          data?: string
          dia_trabalhado?: boolean
          hiperbarica?: number
          id?: string
          injetaveis?: number
          mentorado_id?: string
          no_shows?: number
          observacao?: string | null
          orcado_total?: number
          outros?: number
          pacientes_novos?: number
          procedimentos?: number
          slots_agenda?: number
          slots_ocupados?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendas_diarias_mentorado_id_fkey"
            columns: ["mentorado_id"]
            isOneToOne: false
            referencedRelation: "mentorados"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
