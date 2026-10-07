import type { TrelloBoard, TrelloList, TrelloCard } from "./types";

const TRELLO_API = "https://api.trello.com/1";

function getCredentials() {
  if (typeof window === "undefined") return null;
  const key = localStorage.getItem("trello_api_key");
  const token = localStorage.getItem("trello_token");
  if (!key || !token) return null;
  return { key, token };
}

export function isConfigured(): boolean {
  return getCredentials() !== null;
}

export function configure(apiKey: string, token: string) {
  localStorage.setItem("trello_api_key", apiKey);
  localStorage.setItem("trello_token", token);
}

export function disconnect() {
  localStorage.removeItem("trello_api_key");
  localStorage.removeItem("trello_token");
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const creds = getCredentials();
  if (!creds) throw new Error("Trello not configured");

  const url = new URL(`${TRELLO_API}${path}`);
  url.searchParams.set("key", creds.key);
  url.searchParams.set("token", creds.token);

  const res = await fetch(url.toString(), options);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Trello API ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

export async function getBoards(): Promise<TrelloBoard[]> {
  return request("/members/me/boards?fields=name&filter=open");
}

export async function getLists(boardId: string): Promise<TrelloList[]> {
  return request(`/boards/${boardId}/lists?fields=name,idBoard`);
}

export async function getCards(listId: string): Promise<TrelloCard[]> {
  return request(`/lists/${listId}/cards?fields=name,desc,url,idList`);
}

export async function createCard(
  listId: string,
  name: string,
  desc: string
): Promise<TrelloCard> {
  return request("/cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idList: listId, name, desc }),
  });
}
