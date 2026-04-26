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
    let cancelled = false;
    setLoading(true);
    supabaseBrowser
      .from("sounds")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setSounds([]);
        } else {
          setSounds((data ?? []) as Sound[]);
          setError(null);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { sounds, loading, error };
}
