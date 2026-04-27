"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { StageRecording } from "@/types/sound";

interface UseStageResult {
  recordings: StageRecording[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStageRecordings(): UseStageResult {
  const [recordings, setRecordings] = useState<StageRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!supabaseBrowser) {
      setError("Supabase 환경변수 미설정 (NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY)");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    supabaseBrowser
      .from("stage_recordings")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error: dbError }) => {
        if (cancelled) return;
        if (dbError) {
          setError(dbError.message);
          setRecordings([]);
        } else {
          setRecordings((data ?? []) as StageRecording[]);
          setError(null);
        }
        setLoading(false);
      })
      .then(undefined, (e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setRecordings([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  return {
    recordings,
    loading,
    error,
    refetch: () => setTick((n) => n + 1),
  };
}
