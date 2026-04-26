"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Sound } from "@/types/sound";

interface UseSoundsResult {
  sounds: Sound[];
  loading: boolean;
  error: string | null;
}

export function useSounds(): UseSoundsResult {
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseBrowser) {
      setError("Supabase 환경변수 미설정 (NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY)");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabaseBrowser
      .from("sounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: dbError }) => {
        if (cancelled) return;
        if (dbError) {
          setError(dbError.message);
          setSounds([]);
        } else {
          setSounds((data ?? []) as Sound[]);
          setError(null);
        }
        setLoading(false);
      })
      .then(undefined, (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setSounds([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { sounds, loading, error };
}
