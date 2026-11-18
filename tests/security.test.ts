import { beforeEach, describe, expect, it } from "vitest";
import { toAdventureState, toChildWish } from "@/lib/adventure/mappers";
import { HttpError, readJsonBody } from "@/lib/http";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";
import { ADVENTURE_TOKEN_BYTES, generateAdventureToken, hashAdventureToken, isWellFormedToken } from "@/lib/tokens";
import {
  childNameSchema,
  isSafeHttpUrl,
  journeyPatchSchema,
  MAX_ORNAMENTS,
  treeDesignSchema,
  wishInputSchema,
  wishOrderSchema,
} from "@/lib/validation";

describe("tokens de aventura", () => {
  it("tienen al menos 128 bits y son únicos", () => {
    expect(ADVENTURE_TOKEN_BYTES * 8).toBeGreaterThanOrEqual(128);
    const tokens = new Set(Array.from({ length: 2000 }, generateAdventureToken));
    expect(tokens.size).toBe(2000);
    for (const t of tokens) expect(isWellFormedToken(t)).toBe(true);
  });

  it("se guardan como SHA-256 hex, nunca en claro", () => {
    const token = generateAdventureToken();
    const hash = hashAdventureToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashAdventureToken(token)).toBe(hash);
  });

  it("rechaza tokens mal formados antes de consultar la base", () => {
    expect(isWellFormedToken("")).toBe(false);
    expect(isWellFormedToken("abc")).toBe(false);
    expect(isWellFormedToken("' or 1=1 --" + "x".repeat(32))).toBe(false);
  });
});

describe("validación de URLs y textos", () => {
  it("solo permite http/https", () => {
    expect(isSafeHttpUrl("https://tienda.example/juguete")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
    for (const bad of ["javascript:alert(1)", "data:text/html,<b>x</b>", "ftp://x.com", "//x.com", "vbscript:x"]) {
      expect(isSafeHttpUrl(bad)).toBe(false);
    }
  });

  it("valida deseos: título obligatorio, límites y URLs", () => {
    expect(wishInputSchema.safeParse({ title: "  ", priority: 1 }).success).toBe(false);
    expect(wishInputSchema.safeParse({ title: "x".repeat(81), priority: 1 }).success).toBe(false);
    expect(wishInputSchema.safeParse({ title: "Bici", priority: 4 }).success).toBe(false);
    expect(wishInputSchema.safeParse({ title: "Bici", priority: 1, url: "javascript:alert(1)" }).success).toBe(false);
    expect(wishInputSchema.safeParse({ title: "Bici", priority: 1, extra: "x" }).success).toBe(false);

    const ok = wishInputSchema.parse({ title: " Bici\u0007 ", description: "", url: "", imageUrl: "https://a.b/c.png", priority: 2 });
    expect(ok).toEqual({ title: "Bici", description: null, url: null, imageUrl: "https://a.b/c.png", priority: 2 });
  });

  it("el texto con HTML se guarda como texto (React lo escapa al mostrarlo)", () => {
    const r = wishInputSchema.parse({ title: "<img src=x onerror=alert(1)>", priority: 1 });
    expect(r.title).toBe("<img src=x onerror=alert(1)>");
  });

  it("nombres: solo letras, sin datos extra", () => {
    expect(childNameSchema.safeParse("Sofía").success).toBe(true);
    expect(childNameSchema.safeParse("María José").success).toBe(true);
    expect(childNameSchema.safeParse("sofi@mail.com").success).toBe(false);
    expect(childNameSchema.safeParse("5555-1234").success).toBe(false);
    expect(childNameSchema.safeParse("").success).toBe(false);
  });

  it("el parche de recorrido no borra campos ausentes", () => {
    const r = journeyPatchSchema.parse({ preferredName: "Leo" });
    expect(r).toEqual({ preferredName: "Leo" });
    expect("specialMemory" in r).toBe(false);
    expect(journeyPatchSchema.safeParse({ completedAt: "2026-12-24" }).success).toBe(false);
    expect(journeyPatchSchema.safeParse({ currentStep: 7 }).success).toBe(false);
  });

  it("árbol: límite de adornos, una sola estrella, coordenadas acotadas", () => {
    const orn = (i: number, kind = "esfera") => ({ id: `orn${i}`.padEnd(4, "0"), kind, color: "rojo", x: 50, y: 50 });
    expect(treeDesignSchema.safeParse([orn(1), orn(2)]).success).toBe(true);
    expect(treeDesignSchema.safeParse(Array.from({ length: MAX_ORNAMENTS + 1 }, (_, i) => orn(i))).success).toBe(false);
    expect(treeDesignSchema.safeParse([orn(1, "estrella"), orn(2, "estrella")]).success).toBe(false);
    expect(treeDesignSchema.safeParse([{ ...orn(1), x: 200 }]).success).toBe(false);
    expect(treeDesignSchema.safeParse([orn(1), orn(1)]).success).toBe(false);
  });

  it("reordenar exige UUIDs sin repetir", () => {
    const id = "6f1d1d3c-8c1a-4b7e-9b51-1b8f0f3d1a11";
    expect(wishOrderSchema.safeParse({ ids: [id] }).success).toBe(true);
    expect(wishOrderSchema.safeParse({ ids: [id, id] }).success).toBe(false);
    expect(wishOrderSchema.safeParse({ ids: ["1; drop table wishes"] }).success).toBe(false);
  });
});

describe("datos infantiles", () => {
  it("el mapeo de deseos descarta campos privados aunque vengan en la fila", () => {
    const row = {
      id: "w1",
      title: "Bici",
      description: null,
      url: null,
      image_url: null,
      priority: 1,
      position: 0,
      purchase_status: "comprado",
      private_note: "escondida",
      household_id: "h1",
    };
    const wish = toChildWish(row);
    expect(Object.keys(wish).sort()).toEqual(["description", "id", "imageUrl", "position", "priority", "title", "url"]);
    const json = JSON.stringify(toAdventureState("Sofi", null, [row]));
    expect(json).not.toContain("comprado");
    expect(json).not.toContain("escondida");
    expect(json).not.toContain("household");
  });

  it("un árbol corrupto en la base se descarta en lugar de romper la app", () => {
    const state = toAdventureState(
      "Sofi",
      { preferred_name: null, favorite_christmas_aspect: "otra", special_memory: null, tree_design: [{ bad: 1 }], current_step: 2, completed_at: null },
      [],
    );
    expect(state.journey.treeDesign).toEqual([]);
    expect(state.journey.favoriteChristmasAspect).toBeNull();
  });
});

describe("límites de peticiones", () => {
  beforeEach(() => resetRateLimits());

  it("bloquea tras superar el límite y se recupera tras la ventana", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i++) expect(rateLimit("k", 5, 60_000, now).ok).toBe(true);
    const blocked = rateLimit("k", 5, 60_000, now + 1);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(rateLimit("k", 5, 60_000, now + 60_001).ok).toBe(true);
  });

  it("rechaza cuerpos demasiado grandes aunque mientan en Content-Length", async () => {
    const big = JSON.stringify({ title: "x".repeat(20_000) });
    const req = new Request("http://localhost/api", {
      method: "POST",
      headers: { "content-type": "application/json", "content-length": "10" },
      body: big,
    });
    await expect(readJsonBody(req)).rejects.toMatchObject({ status: 413 });
  });

  it("rechaza tipos de contenido no JSON y JSON inválido", async () => {
    const form = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "text/plain" }, body: "x" });
    await expect(readJsonBody(form)).rejects.toBeInstanceOf(HttpError);
    const broken = new Request("http://localhost/api", { method: "POST", headers: { "content-type": "application/json" }, body: "{" });
    await expect(readJsonBody(broken)).rejects.toMatchObject({ status: 400 });
  });
});
