import { supabase, supabasePublishableKey } from "@/integrations/supabase/client";

export abstract class BaseHttpService {
  protected abstract getBaseUrl(): string;

  protected async getAuthHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || ''}`,
      'apikey': supabasePublishableKey,
    };
  }

  protected async post<T>(body: Record<string, unknown>): Promise<T> {
    const headers = await this.getAuthHeaders();
    const response = await fetch(this.getBaseUrl(), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || result?.success === false) {
      throw new Error(result?.error || "Erro na comunicação com o serviço");
    }

    return (result?.data ?? result) as T;
  }
}
