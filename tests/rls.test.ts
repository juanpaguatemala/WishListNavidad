/**
 * Pruebas reales de RLS: ejecuta la migración en un Postgres embebido
 * (PGlite) con un stub mínimo del esquema `auth` y de los roles de
 * Supabase, y verifica el aislamiento entre hogares.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const USER_A = "00000000-0000-0000-0000-00000000000a";
const USER_B = "00000000-0000-0000-0000-00000000000b";
const HASH_A = "a".repeat(64);
const HASH_B = "b".repeat(64);

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  grant usage on schema public to anon, authenticated, service_role;
  -- Supabase concede por defecto todo a anon/authenticated; la migración debe revocarlo.
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
  insert into auth.users (id) values ('${USER_A}'), ('${USER_B}');
`;

let db: PGlite;

async function as(role: "anon" | "authenticated" | "service_role", userId?: string) {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${userId ?? ""}', false); set role ${role};`);
}

async function expectError(sql: string, params: unknown[] = []) {
  let failed = false;
  try {
    await db.query(sql, params);
  } catch {
    failed = true;
  }
  expect(failed, `Se esperaba error en: ${sql}`).toBe(true);
}

let householdA: string;
let householdB: string;
let childA: string;
let wishA: string;

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  const dir = path.join(__dirname, "..", "supabase", "migrations");
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }

  await as("authenticated", USER_A);
  householdA = (await db.query<{ h: string }>("select public.ensure_household() as h")).rows[0].h;
  childA = (
    await db.query<{ id: string }>(
      "insert into public.children (household_id, display_name, adventure_token_hash) values ($1, 'Sofi', $2) returning id",
      [householdA, HASH_A],
    )
  ).rows[0].id;

  await as("authenticated", USER_B);
  householdB = (await db.query<{ h: string }>("select public.ensure_household() as h")).rows[0].h;
  await db.query(
    "insert into public.children (household_id, display_name, adventure_token_hash) values ($1, 'Leo', $2)",
    [householdB, HASH_B],
  );

  // El servidor (service_role) escribe un deseo del niño A.
  await as("service_role");
  wishA = (
    await db.query<{ id: string }>(
      "insert into public.wishes (child_id, title, priority, position) values ($1, 'Bicicleta', 1, 0) returning id",
      [childA],
    )
  ).rows[0].id;
}, 60_000);

describe("RLS entre hogares", () => {
  it("ensure_household es idempotente y distinto por usuario", async () => {
    await as("authenticated", USER_A);
    const again = (await db.query<{ h: string }>("select public.ensure_household() as h")).rows[0].h;
    expect(again).toBe(householdA);
    expect(householdA).not.toBe(householdB);
  });

  it("al crear un niño se crea su recorrido", async () => {
    await as("authenticated", USER_A);
    const r = await db.query("select id from public.journeys where child_id = $1", [childA]);
    expect(r.rows).toHaveLength(1);
  });

  it("un padre solo ve los niños de su hogar", async () => {
    await as("authenticated", USER_B);
    const r = await db.query<{ display_name: string }>("select display_name from public.children");
    expect(r.rows.map((x) => x.display_name)).toEqual(["Leo"]);
  });

  it("un padre no puede ver deseos ni recorridos de otro hogar", async () => {
    await as("authenticated", USER_B);
    expect((await db.query("select id from public.wishes where child_id = $1", [childA])).rows).toHaveLength(0);
    expect((await db.query("select id from public.journeys where child_id = $1", [childA])).rows).toHaveLength(0);
  });

  it("un padre no puede crear niños en otro hogar", async () => {
    await as("authenticated", USER_B);
    await expectError(
      "insert into public.children (household_id, display_name, adventure_token_hash) values ($1, 'Intruso', $2)",
      [householdA, "c".repeat(64)],
    );
  });

  it("un padre no puede leer el hash del token", async () => {
    await as("authenticated", USER_A);
    await expectError("select adventure_token_hash from public.children");
  });

  it("un padre no puede mover un niño a otro hogar", async () => {
    await as("authenticated", USER_A);
    await expectError("update public.children set household_id = $1 where id = $2", [householdB, childA]);
  });

  it("un padre no puede escribir deseos directamente", async () => {
    await as("authenticated", USER_A);
    await expectError("insert into public.wishes (child_id, title) values ($1, 'x')", [childA]);
  });

  it("el estado de compra toma el hogar del deseo, no el del cliente", async () => {
    await as("authenticated", USER_B);
    // B intenta marcar el deseo de A mandando su propio household_id → debe fallar.
    await expectError(
      "insert into public.parent_wish_status (wish_id, household_id, purchase_status) values ($1, $2, 'comprado')",
      [wishA, householdB],
    );

    await as("authenticated", USER_A);
    // A manda un household_id falso; el trigger lo corrige al real.
    await db.query(
      "insert into public.parent_wish_status (wish_id, household_id, purchase_status, private_note) values ($1, $2, 'comprado', 'Escondido en el clóset')",
      [wishA, householdB],
    );
    const r = await db.query<{ household_id: string }>(
      "select household_id from public.parent_wish_status where wish_id = $1",
      [wishA],
    );
    expect(r.rows[0].household_id).toBe(householdA);

    await as("authenticated", USER_B);
    expect((await db.query("select * from public.parent_wish_status")).rows).toHaveLength(0);
  });

  it("anon no tiene acceso a ninguna tabla ni función", async () => {
    await as("anon");
    for (const t of ["households", "parent_memberships", "children", "journeys", "wishes", "parent_wish_status"]) {
      await expectError(`select * from public.${t}`);
    }
    await expectError("select public.ensure_household()");
  });

  it("borrar un niño elimina en cascada sus datos", async () => {
    await as("authenticated", USER_A);
    await db.query("delete from public.children where id = $1", [childA]);
    await as("service_role");
    expect((await db.query("select 1 from public.wishes where child_id = $1", [childA])).rows).toHaveLength(0);
    expect((await db.query("select 1 from public.journeys where child_id = $1", [childA])).rows).toHaveLength(0);
    expect((await db.query("select 1 from public.parent_wish_status where wish_id = $1", [wishA])).rows).toHaveLength(0);
  });
});
