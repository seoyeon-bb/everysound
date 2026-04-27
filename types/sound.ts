import type { CategoryKey } from "@/lib/categories";

export interface Sound {
  id: string;
  device_id: string;
  uploader_nickname: string | null;
  title: string;
  summary: string;
  description: string | null;
  audio_key: string | null;
  duration_ms: number | null;
  category: CategoryKey;
  tags: string[];
  play_count: number;
  launchpad_add_count: number;
  recommend_count: number;
  created_at: string;
}

export interface StageRecording {
  id: string;
  device_id: string;
  uploader_nickname: string | null;
  title: string;
  summary: string;
  audio_key: string | null;
  duration_ms: number | null;
  play_count: number;
  like_count: number;
  created_at: string;
}
