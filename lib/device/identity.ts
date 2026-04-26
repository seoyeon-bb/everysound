const DEVICE_ID_KEY = "everysound:device_id";
const NICKNAME_KEY = "everysound:nickname";

export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getNickname(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(NICKNAME_KEY);
}

export function setNickname(nickname: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(NICKNAME_KEY, nickname);
}
