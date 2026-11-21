import { neon } from "@neondatabase/serverless";
import type { Pool } from "pg";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rows = any[];
let _query: ((strings: TemplateStringsArray, values: unknown[]) => Promise<Rows>) | null = null;

function client() {
  if (_query) return _query;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  if (/@(localhost|127\.0\.0\.1)[:/]/.test(url)) {
    // Local Postgres for development (regular TCP driver).
    let pool: Pool | null = null;
    _query = async (strings, values) => {
      if (!pool) {
        const { Pool } = await import("pg");
        pool = new Pool({ connectionString: url, max: 3 });
      }
      const text = strings.reduce((acc, s, i) => acc + (i ? `$${i}` : "") + s, "");
      return (await pool.query(text, values)).rows;
    };
  } else {
    // Neon serverless Postgres over HTTP (production / Vercel).
    const n = neon(url);
    _query = (strings, values) => n(strings, ...values) as Promise<Rows>;
  }
  return _query;
}

/** Tagged-template SQL: values are always sent as parameters, never string-concatenated. */
export function sql(strings: TemplateStringsArray, ...values: unknown[]): Promise<Rows> {
  return client()(strings, values);
}

let schemaReady: Promise<void> | null = null;

/** Creates tables on first use, so there is no separate migration step. */
export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS account (
        id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        ig_user_id TEXT NOT NULL,
        username TEXT,
        profile_picture_url TEXT,
        access_token TEXT NOT NULL,
        token_expires_at TIMESTAMPTZ,
        connected_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS automations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        trigger_type TEXT NOT NULL DEFAULT 'comment',
        media_id TEXT,
        media_caption TEXT,
        media_thumbnail TEXT,
        match_mode TEXT NOT NULL DEFAULT 'contains',
        keywords TEXT[] NOT NULL DEFAULT '{}',
        dm_message TEXT NOT NULL,
        public_replies TEXT[] NOT NULL DEFAULT '{}',
        once_per_user BOOLEAN NOT NULL DEFAULT true,
        active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE TABLE IF NOT EXISTS events (
        id SERIAL PRIMARY KEY,
        automation_id INT REFERENCES automations(id) ON DELETE SET NULL,
        source TEXT NOT NULL,
        source_id TEXT UNIQUE,
        media_id TEXT,
        ig_user_id TEXT,
        username TEXT,
        incoming_text TEXT,
        status TEXT NOT NULL,
        error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
      await sql`CREATE INDEX IF NOT EXISTS events_created_idx ON events (created_at DESC)`;
      await sql`CREATE INDEX IF NOT EXISTS events_auto_user_idx ON events (automation_id, ig_user_id)`;
      await sql`CREATE TABLE IF NOT EXISTS follower_snapshots (
        day DATE PRIMARY KEY,
        followers INT NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    })().catch((e) => {
      schemaReady = null;
      throw e;
    });
  }
  return schemaReady;
}

export const TZ = process.env.APP_TIMEZONE || "Asia/Kolkata";

export type Account = {
  ig_user_id: string;
  username: string | null;
  profile_picture_url: string | null;
  access_token: string;
  token_expires_at: string | null;
  connected_at: string;
};

export type Automation = {
  id: number;
  name: string;
  trigger_type: "comment" | "dm";
  media_id: string | null;
  media_caption: string | null;
  media_thumbnail: string | null;
  match_mode: "any" | "contains" | "exact";
  keywords: string[];
  dm_message: string;
  public_replies: string[];
  once_per_user: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export async function getAccount(): Promise<Account | null> {
  await ensureSchema();
  const rows = await sql`SELECT * FROM account WHERE id = 1`;
  return (rows[0] as Account) ?? null;
}

/** Records today's follower count (one row per day, latest value wins). */
export async function recordFollowers(count: number) {
  await ensureSchema();
  await sql`INSERT INTO follower_snapshots (day, followers)
    VALUES ((now() AT TIME ZONE ${TZ})::date, ${count})
    ON CONFLICT (day) DO UPDATE SET followers = EXCLUDED.followers, recorded_at = now()`;
}
