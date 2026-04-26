"use client";

import { useEffect, useState } from "react";
import {
  getOrCreateDeviceId,
  getNickname,
  setNickname as writeNickname,
} from "@/lib/device/identity";

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string>("");
  const [nickname, setNicknameState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDeviceId(getOrCreateDeviceId());
    setNicknameState(getNickname());
    setReady(true);
  }, []);

  const setNickname = (name: string) => {
    writeNickname(name);
    setNicknameState(name);
  };

  return { deviceId, nickname, setNickname, ready };
}
