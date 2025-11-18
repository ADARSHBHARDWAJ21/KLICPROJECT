import { useCallback, useMemo } from "react";
import { useAuth } from "@clerk/clerk-expo";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://olujiwcxifvfuyuvbtkv.supabase.co";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9sdWppd2N4aWZ2ZnV5dXZidGt2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxNDM3MTMsImV4cCI6MjA2NDcxOTcxM30.K9T_f4HJa0Ebi01Gzg99_ILjQKU3K1xUGF_xU2yvC1g";

export function useSupabase() {
  const { getToken } = useAuth();

  const client = useMemo<SupabaseClient>(() => {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        "Missing Supabase environment variables. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY."
      );
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          const token = await getToken({ template: "supabase" }).catch(() => null);
          const headers = new Headers(options.headers ?? {});

          if (token) {
            headers.set("Authorization", `Bearer ${token}`);
          }

          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [getToken]);

  const fetchSupabase = useCallback(
    async <T,>(callback: (supabase: SupabaseClient) => Promise<T>) => {
      return callback(client);
    },
    [client]
  );

  return { supabase: client, fetchSupabase };
}

