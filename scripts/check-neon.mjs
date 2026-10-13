import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

const baseUrl = process.argv[2];
if (!baseUrl) throw new Error("Usage: npm run test:neon -- http://localhost:5100");
const databaseUrl = new URL(process.env.DATABASE_URL);
assert.match(databaseUrl.hostname, /-pooler\..*\.neon\.tech$/, "Use the pooled Neon connection for the app");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 15000 });
let categoryId;

async function request(path, method = "GET", body) {
  const response = await fetch(new URL(path, baseUrl), {
    method,
    ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  assert.equal(response.ok, true, `${method} ${path} returned ${response.status}`);
  const json = await response.json();
  assert.equal(json.success, true);
  return json.data;
}

try {
  const tls = await pool.query("SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()");
  assert.equal(tls.rows[0]?.ssl, true);
  console.log("PASS: pooled Neon Postgres connection uses TLS");

  const title = `Neon smoke test ${randomUUID()}`;
  const created = await request("/api/v1/category/create", "POST", { title });
  categoryId = created.id;
  assert.equal(typeof categoryId, "string");
  const stored = await pool.query('SELECT title FROM "Category" WHERE id = $1', [categoryId]);
  assert.equal(stored.rows[0]?.title, title);
  console.log("PASS: HTTP create persisted in the configured Neon database");

  const retrieved = await request(`/api/v1/category/show-by-id?id=${categoryId}`);
  assert.equal(retrieved.title, title);
  const updatedTitle = `${title} updated`;
  await request(`/api/v1/category/update?id=${categoryId}`, "PATCH", { title: updatedTitle });
  const updated = await pool.query('SELECT title FROM "Category" WHERE id = $1', [categoryId]);
  assert.equal(updated.rows[0]?.title, updatedTitle);
  console.log("PASS: HTTP read and update round-trip through Neon");

  await request(`/api/v1/category/delete?id=${categoryId}`, "DELETE");
  const deleted = await pool.query('SELECT id FROM "Category" WHERE id = $1', [categoryId]);
  assert.equal(deleted.rowCount, 0);
  categoryId = undefined;
  console.log("PASS: HTTP delete removed the test record");

  const posts = await request("/api/v1/post/all-post");
  assert.equal(Array.isArray(posts), true);
  console.log("PASS: public post feed reads Neon successfully");
} finally {
  if (categoryId) {
    // Only clean up the exact disposable category created by this test.
    await pool.query('DELETE FROM "Category" WHERE id = $1', [categoryId]);
  }
  await pool.end();
}
