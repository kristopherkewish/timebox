/// <reference types="@cloudflare/workers-types" />

export interface Env {
  DB: D1Database;
}

export type AuthData = Record<string, unknown> & {
  user?: {
    id: string;
    email: string;
    username: string;
  };
  sessionId?: string;
};
