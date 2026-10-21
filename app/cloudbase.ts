const ENV_ID = "bie-hua-le-d1gxyvjyhe74f8387";
const API_BASE = `https://${ENV_ID}.api.tcloudbasegateway.com`;
const DEVICE_KEY = "bie-hua-le-device-id";
const TOKEN_KEY = "bie-hua-le-cloud-token";
const ROOM_KEY = "bie-hua-le-cloud-room";

type TokenState = { accessToken: string; userId: string };

function deviceId() {
  let value = localStorage.getItem(DEVICE_KEY);
  if (!value) {
    value = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, value);
  }
  return value;
}

export async function cloudSignIn(): Promise<TokenState> {
  // CloudBase access tokens expire after a short period. Always request a fresh
  // token when the app starts; the stable device id keeps this browser tied to
  // the same anonymous account and avoids reusing an expired session token.
  sessionStorage.removeItem(TOKEN_KEY);
  const response = await fetch(`${API_BASE}/auth/v1/signin/anonymously`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-device-id": deviceId() },
    body: "{}",
  });
  if (!response.ok) throw new Error("腾讯云匿名登录失败");
  const data = await response.json();
  const state = { accessToken: data.access_token as string, userId: data.sub as string };
  sessionStorage.setItem(TOKEN_KEY, JSON.stringify(state));
  return state;
}

async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}/v1/rdb/rest/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || "云端请求失败");
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function saveProfile(token: string, userId: string, nickname: string) {
  return request("profiles?on_conflict=user_id", token, {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ user_id: userId, nickname }),
  });
}

export async function createRoom(token: string, name: string, budget: number) {
  const rows = await request<Array<{ room_id: number; invite_code: string }>>("rpc/create_challenge", token, {
    method: "POST", body: JSON.stringify({ p_name: name, p_budget: budget }),
  });
  const room = rows[0];
  localStorage.setItem(ROOM_KEY, String(room.room_id));
  return room;
}

export async function joinRoom(token: string, code: string) {
  const roomId = await request<number>("rpc/join_challenge", token, {
    method: "POST", body: JSON.stringify({ p_invite_code: code }),
  });
  localStorage.setItem(ROOM_KEY, String(roomId));
  return roomId;
}

export type CloudRoom = { id: number; name: string; invite_code: string; daily_budget: number; owner_id: string };
export type CloudExpense = { id: number; room_id: number; user_id: string; amount: number; category: string; spent_on: string; created_at: string };

export async function loadMyRoom(token: string) {
  const savedRoomId = Number(localStorage.getItem(ROOM_KEY));
  if (savedRoomId > 0) {
    const savedRooms = await request<CloudRoom[]>(`challenge_rooms?select=*&id=eq.${savedRoomId}`, token);
    if (savedRooms[0]) return savedRooms[0];
    localStorage.removeItem(ROOM_KEY);
  }
  const memberships = await request<Array<{ room_id: number }>>("room_members?select=room_id&order=joined_at.desc&limit=1", token);
  if (!memberships.length) return null;
  localStorage.setItem(ROOM_KEY, String(memberships[0].room_id));
  const rooms = await request<CloudRoom[]>(`challenge_rooms?select=*&id=eq.${memberships[0].room_id}`, token);
  return rooms[0] || null;
}

export async function loadScores(token: string, roomId: number, date: string) {
  const [members, profiles, expenses] = await Promise.all([
    request<Array<{ user_id: string }>>(`room_members?select=user_id&room_id=eq.${roomId}`, token),
    request<Array<{ user_id: string; nickname: string }>>("profiles?select=user_id,nickname", token),
    request<CloudExpense[]>(`expenses?select=*&room_id=eq.${roomId}&spent_on=eq.${date}&order=created_at.desc`, token),
  ]);
  return { members, profiles, expenses };
}

export async function addCloudExpense(token: string, roomId: number, userId: string, amount: number, category: string, date: string) {
  const rows = await request<CloudExpense[]>("expenses", token, {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ room_id: roomId, user_id: userId, amount, category, spent_on: date }),
  });
  return rows[0];
}

export async function updateCloudExpense(token: string, id: number, amount: number, category: string) {
  return request(`expenses?id=eq.${id}`, token, { method: "PATCH", body: JSON.stringify({ amount, category }) });
}

export async function deleteCloudExpense(token: string, id: number) {
  return request(`expenses?id=eq.${id}`, token, { method: "DELETE" });
}
