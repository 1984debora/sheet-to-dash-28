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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      equipamentos: {
        Row: {
          armazenamento_capacidade: string | null
          armazenamento_tipo: string | null
          conexao: string | null
          created_at: string
          data_compra: string | null
          endereco_ip: string | null
          garantia_ate: string | null
          id: string
          localizacao_id: string | null
          marca: string | null
          modelo: string | null
          numero_serie: string | null
          observacoes: string | null
          patrimonio: string
          processador: string | null
          ram_capacidade: string | null
          ram_tipo: string | null
          segunda_tela: boolean
          sistema_operacional: string | null
          status: string
          tipo: string
          updated_at: string
          usuario_responsavel: string | null
        }
        Insert: {
          armazenamento_capacidade?: string | null
          armazenamento_tipo?: string | null
          conexao?: string | null
          created_at?: string
          data_compra?: string | null
          endereco_ip?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao_id?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio: string
          processador?: string | null
          ram_capacidade?: string | null
          ram_tipo?: string | null
          segunda_tela?: boolean
          sistema_operacional?: string | null
          status?: string
          tipo: string
          updated_at?: string
          usuario_responsavel?: string | null
        }
        Update: {
          armazenamento_capacidade?: string | null
          armazenamento_tipo?: string | null
          conexao?: string | null
          created_at?: string
          data_compra?: string | null
          endereco_ip?: string | null
          garantia_ate?: string | null
          id?: string
          localizacao_id?: string | null
          marca?: string | null
          modelo?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          patrimonio?: string
          processador?: string | null
          ram_capacidade?: string | null
          ram_tipo?: string | null
          segunda_tela?: boolean
          sistema_operacional?: string | null
          status?: string
          tipo?: string
          updated_at?: string
          usuario_responsavel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipamentos_localizacao_id_fkey"
            columns: ["localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      estoque_movimentos: {
        Row: {
          created_at: string
          equipamento_id: string
          id: string
          registrado_por: string | null
          status_anterior: string | null
          status_novo: string | null
          tipo: string
          usuario: string | null
        }
        Insert: {
          created_at?: string
          equipamento_id: string
          id?: string
          registrado_por?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo: string
          usuario?: string | null
        }
        Update: {
          created_at?: string
          equipamento_id?: string
          id?: string
          registrado_por?: string | null
          status_anterior?: string | null
          status_novo?: string | null
          tipo?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_movimentos_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      historico_usuarios: {
        Row: {
          equipamento_id: string
          fim: string | null
          id: string
          inicio: string
          usuario: string
        }
        Insert: {
          equipamento_id: string
          fim?: string | null
          id?: string
          inicio?: string
          usuario: string
        }
        Update: {
          equipamento_id?: string
          fim?: string | null
          id?: string
          inicio?: string
          usuario?: string
        }
        Relationships: [
          {
            foreignKeyName: "historico_usuarios_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      localizacoes: {
        Row: {
          created_at: string
          id: string
          nome: string
          setor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          setor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "localizacoes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes: {
        Row: {
          created_at: string
          custo: number | null
          data: string
          descricao: string
          equipamento_id: string
          id: string
          registrado_por: string | null
          status: string
          tecnico: string | null
          tipo: string
        }
        Insert: {
          created_at?: string
          custo?: number | null
          data?: string
          descricao: string
          equipamento_id: string
          id?: string
          registrado_por?: string | null
          status?: string
          tecnico?: string | null
          tipo?: string
        }
        Update: {
          created_at?: string
          custo?: number | null
          data?: string
          descricao?: string
          equipamento_id?: string
          id?: string
          registrado_por?: string | null
          status?: string
          tecnico?: string | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          created_at: string
          data: string
          destino_localizacao_id: string | null
          equipamento_id: string
          id: string
          motivo: string | null
          origem_localizacao_id: string | null
          registrado_por: string | null
          usuario_anterior: string | null
          usuario_novo: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          destino_localizacao_id?: string | null
          equipamento_id: string
          id?: string
          motivo?: string | null
          origem_localizacao_id?: string | null
          registrado_por?: string | null
          usuario_anterior?: string | null
          usuario_novo?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          destino_localizacao_id?: string | null
          equipamento_id?: string
          id?: string
          motivo?: string | null
          origem_localizacao_id?: string | null
          registrado_por?: string | null
          usuario_anterior?: string | null
          usuario_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_destino_localizacao_id_fkey"
            columns: ["destino_localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_equipamento_id_fkey"
            columns: ["equipamento_id"]
            isOneToOne: false
            referencedRelation: "equipamentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_origem_localizacao_id_fkey"
            columns: ["origem_localizacao_id"]
            isOneToOne: false
            referencedRelation: "localizacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_acessos: {
        Row: {
          anydesk: string | null
          criado_por: string
          email: string | null
          gerente_adm: string | null
          hostname: string
          id: string
          segredos_cifrados: string
          setor_id: string
          ultima_alteracao: string
          usuario: string | null
        }
        Insert: {
          anydesk?: string | null
          criado_por?: string
          email?: string | null
          gerente_adm?: string | null
          hostname: string
          id?: string
          segredos_cifrados: string
          setor_id: string
          ultima_alteracao?: string
          usuario?: string | null
        }
        Update: {
          anydesk?: string | null
          criado_por?: string
          email?: string | null
          gerente_adm?: string | null
          hostname?: string
          id?: string
          segredos_cifrados?: string
          setor_id?: string
          ultima_alteracao?: string
          usuario?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setor_acessos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_aplicativos: {
        Row: {
          created_at: string
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          setor_id: string
          ultima_atualizacao: string | null
          versao: string | null
        }
        Insert: {
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          setor_id: string
          ultima_atualizacao?: string | null
          versao?: string | null
        }
        Update: {
          created_at?: string
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          setor_id?: string
          ultima_atualizacao?: string | null
          versao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "setor_aplicativos_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setor_usuarios: {
        Row: {
          celular: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          setor_id: string
        }
        Insert: {
          celular?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          setor_id: string
        }
        Update: {
          celular?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "setor_usuarios_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      setores: {
        Row: {
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          usa_scanner: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          usa_scanner?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          usa_scanner?: boolean
        }
        Relationships: []
      }
      suprimento_movimentos: {
        Row: {
          created_at: string
          destino: string | null
          id: string
          quantidade: number
          registrado_por: string | null
          suprimento_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          destino?: string | null
          id?: string
          quantidade: number
          registrado_por?: string | null
          suprimento_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          destino?: string | null
          id?: string
          quantidade?: number
          registrado_por?: string | null
          suprimento_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "suprimento_movimentos_suprimento_id_fkey"
            columns: ["suprimento_id"]
            isOneToOne: false
            referencedRelation: "suprimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      suprimentos: {
        Row: {
          categoria: string
          condicao: string
          created_at: string
          especificacao: string | null
          id: string
          minimo: number
          nome: string
          quantidade: number
        }
        Insert: {
          categoria: string
          condicao?: string
          created_at?: string
          especificacao?: string | null
          id?: string
          minimo?: number
          nome: string
          quantidade?: number
        }
        Update: {
          categoria?: string
          condicao?: string
          created_at?: string
          especificacao?: string | null
          id?: string
          minimo?: number
          nome?: string
          quantidade?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
