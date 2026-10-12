import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type QueryResult<T> = { results: T[] };
type RunResult = { meta: { changes: number } };

let client: SupabaseClient | null = null;
let bucketReady: Promise<void> | null = null;
let schemaReady: Promise<void> | null = null;

function supabase() {
  if (client) return client;
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}

function sqlLiteral(value: unknown) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "0";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return `'${text.replace(/'/g, "''")}'`;
}

function bindSql(template: string, values: unknown[]) {
  let index = 0;
  let sql = template.replace(/\?/g, () => sqlLiteral(values[index++]));
  sql = sql.replace(/\bAS\s+([a-z][A-Za-z0-9]*[A-Z][A-Za-z0-9]*)\b/g, 'AS "$1"');
  sql = sql.replace(/MAX\(0\s*,/gi, "GREATEST(0,");
  if (/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i.test(sql)) {
    sql = sql.replace(/^\s*INSERT\s+OR\s+IGNORE\s+INTO\b/i, "INSERT INTO");
    sql = `${sql.replace(/;\s*$/, "")} ON CONFLICT DO NOTHING`;
  }
  return sql;
}

class Statement {
  private values: unknown[] = [];
  constructor(private readonly template: string) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  sql() {
    return bindSql(this.template, this.values);
  }

  async run(): Promise<RunResult> {
    const { data, error } = await supabase().rpc("expo_exec", { p_sql: this.sql() });
    if (error) throw new Error(error.message);
    return { meta: { changes: Number((data as { changes?: number } | null)?.changes || 0) } };
  }

  async all<T = Record<string, unknown>>(): Promise<QueryResult<T>> {
    const { data, error } = await supabase().rpc("expo_query", { p_sql: this.sql() });
    if (error) throw new Error(error.message);
    return { results: (Array.isArray(data) ? data : []) as T[] };
  }

  async first<T = Record<string, unknown>>(): Promise<T | null> {
    const result = await this.all<T>();
    return result.results[0] || null;
  }
}

class Database {
  readonly dialect = "postgres" as const;

  prepare(sql: string) {
    return new Statement(sql);
  }

  async batch(statements: Statement[]) {
    if (!statements.length) return [];
    const { data, error } = await supabase().rpc("expo_batch", { p_statements: statements.map((statement) => statement.sql()) });
    if (error) throw new Error(error.message);
    return data;
  }

  async ensureSchema() {
    if (!schemaReady) {
      schemaReady = (async () => {
        const { error } = await supabase().from("settings").select("id").limit(1);
        if (error) throw new Error(`Supabase schema is not ready: ${error.message}`);
      })();
    }
    return schemaReady;
  }
}

const DB = new Database();

function storageBucket() {
  return process.env.SUPABASE_STORAGE_BUCKET?.trim() || "product-images";
}

async function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const api = supabase().storage;
      const bucket = storageBucket();
      const { data } = await api.getBucket(bucket);
      if (data) return;
      const { error } = await api.createBucket(bucket, { public: false, fileSizeLimit: 8 * 1024 * 1024 });
      if (error && !/already exists/i.test(error.message)) throw new Error(error.message);
    })();
  }
  return bucketReady;
}

const FILES = {
  async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> }) {
    await ensureBucket();
    const { error } = await supabase().storage.from(storageBucket()).upload(key, value, {
      upsert: true,
      contentType: options?.httpMetadata?.contentType,
      cacheControl: "31536000",
      metadata: options?.customMetadata,
    });
    if (error) throw new Error(error.message);
  },
  async get(key: string) {
    await ensureBucket();
    const { data, error } = await supabase().storage.from(storageBucket()).download(key);
    if (error || !data) return null;
    return {
      body: data,
      httpEtag: `"${key}"`,
      writeHttpMetadata(headers: Headers) {
        if (data.type) headers.set("content-type", data.type);
      },
    };
  },
  async delete(key: string) {
    await ensureBucket();
    const { error } = await supabase().storage.from(storageBucket()).remove([key]);
    if (error) throw new Error(error.message);
  },
};

export const env = {
  DB,
  FILES,
  get APP_USERNAME() { return process.env.APP_USERNAME; },
  get APP_PASSWORD() { return process.env.APP_PASSWORD; },
  get APP_SESSION_SECRET() { return process.env.APP_SESSION_SECRET; },
};
