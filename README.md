# Mi Navidad Mágica — Incremento 1

Aventura navideña para niños con Santa (solo texto, animaciones y música instrumental opcional, **sin voz**). Los padres crean un enlace privado por niño; el niño responde preguntas, decora un árbol y escribe su libro de deseos; los padres ven todo en un panel privado y marcan compras sin que el niño lo vea.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS 4 · Framer Motion · Supabase (Postgres + Auth) · Zod · Vercel.

---

## 1. Arquitectura

```
supabase/migrations/20261118000000_init.sql   Tablas, triggers, funciones y RLS
src/proxy.ts                                  (antes "middleware") refresca sesión y protege /padres
src/app/
  page.tsx, HeroIntro.tsx                     Portada animada con Santa
  padres/login/                               Login/registro (server actions)
  padres/                                     Panel privado: page, data, actions, ChildCard…
  auth/callback/route.ts                      Confirmación de correo de Supabase
  aventura/[token]/page.tsx                   Carga server-side del niño y monta la aventura
  api/aventura/[token]/…                      API infantil: journey, wishes, wishes/[id], complete
src/components/
  Santa.tsx                                   Santa original en SVG (punto de reemplazo de arte)
  Experience.tsx, music.ts                    Reducir movimiento + música original Web Audio
  adventure/                                  Capítulos, TreeDecorator, WishBook, cliente API
  tree/TreeArt.tsx                            Árbol y adornos SVG (compartido niño/padres)
src/lib/
  validation.ts                               Esquemas Zod compartidos cliente/servidor
  tokens.ts                                   Token 256 bits + hash SHA-256
  adventure/server.ts, mappers.ts, types.ts   Acceso a datos infantil (lista blanca de columnas)
  http.ts, rate-limit.ts                      Límite de tamaño/frecuencia, respuestas no-store
  supabase/{server,admin,proxy-session}.ts    Clientes Supabase (admin = server-only)
tests/                                        Vitest: seguridad + RLS real en Postgres embebido
```

### Decisiones clave

| Decisión | Motivo |
|---|---|
| **Padres → sesión Supabase + RLS.** El panel usa la clave anon con cookies; toda consulta pasa por RLS. | Aislamiento por hogar garantizado por la base, no por el código. |
| **Hogar derivado de `auth.uid()`** con `ensure_household()` (SECURITY DEFINER, con bloqueo para evitar duplicados). | No se confía en ningún `household_id` del cliente. |
| **`parent_wish_status.household_id` lo fija un trigger** a partir del deseo. | Aunque el cliente mande otro hogar, se sobrescribe y RLS lo verifica. |
| **Niños sin cuenta.** Acceso por token de **256 bits** (base64url) que solo existe en el enlace; en BD se guarda su **SHA-256**. | Cumple ≥128 bits; un volcado de BD no permite abrir aventuras. |
| **Rutas infantiles con `service_role` solo en servidor** (`import "server-only"`), siempre filtrando por el `child_id` resuelto del hash, con **lista blanca de columnas**. | Los niños no tienen sesión; es el uso imprescindible. Nunca se consulta `parent_wish_status`. |
| **Privilegios de columna:** los padres no pueden leer `adventure_token_hash` ni cambiar `household_id`; no pueden escribir deseos; `anon` no tiene ningún privilegio. | Mínimo privilegio además de RLS. |
| **Ajustes al modelo:** `journeys.preferred_name` (nombre que escribe el niño, sin pisar la etiqueta del padre), `journeys.current_step` (retomar), `created_at/updated_at` y `parent_wish_status.purchase_status ∈ {pendiente, en_proceso, comprado, descartado}`. | Necesarios para los flujos pedidos. |
| **Cada mutación devuelve el estado completo confirmado por la BD.** La UI solo cambia tras respuesta OK; "Carta enviada" aparece solo si `completed_at` quedó guardado. | Nunca se simula éxito. |
| **Rate limiting en memoria** (por IP y por token) + límite de 16 KB por petición (sin confiar en `Content-Length`). | Best-effort en serverless; ver "Producción" para Upstash. |
| **Referrer-Policy: no-referrer** y `noindex` en `/aventura/*`; enlaces externos con `rel="noopener noreferrer nofollow"`. | El token nunca se filtra por cabecera Referer. |
| **Sin rastreadores ni analítica.** Ningún script de terceros, sin fuentes remotas. | Privacidad infantil. |
| **Santa, árbol y música originales** (SVG propio y melodía propia generada con Web Audio). | Sin assets de licencia dudosa; puntos de reemplazo: `Santa.tsx`, `music.ts`. |

### Flujo infantil (7 capítulos)

Invitación → Nombre → Preguntas (6 opciones + respuesta abierta opcional) → Árbol (tap/clic, arrastre con pointer events, teclado: flechas, Enter, N, Suprimir; reiniciar, guardar, terminar) → Libro de deseos (agregar, editar, borrar, subir/bajar; título obligatorio, descripción, URL e imagen opcionales, prioridad 1–3) → Carta (revisión) → Confirmación. Se puede volver a capítulos ya alcanzados; el progreso persiste.

---

## 2. Puesta en marcha

### Requisitos
Node.js ≥ 20.9 y una cuenta de Supabase (o Supabase CLI + Docker para local).

```bash
npm install
cp .env.example .env.local   # completa los valores (ver sección 4)
```

### Opción A — Supabase remoto (recomendado para empezar)
1. Crea un proyecto en https://supabase.com.
2. **SQL Editor** → pega y ejecuta `supabase/migrations/20261118000000_init.sql`.
   (O con la CLI: `npx supabase link --project-ref <ref>` y `npx supabase db push`).
3. **Authentication → Providers → Email**: deja habilitado Email. Recomendado: "Confirm email" activado.
4. **Authentication → URL Configuration**:
   - Site URL: tu dominio (p. ej. `https://mi-navidad-magica.vercel.app`).
   - Redirect URLs: añade `https://TU-DOMINIO/auth/callback` y `http://localhost:3000/auth/callback`.
5. **Project Settings → API**: copia Project URL, anon key y service_role key a `.env.local`.
6. `npm run dev` → http://localhost:3000

### Opción B — Supabase local (Docker)
```bash
npx supabase init          # solo la primera vez (conserva la carpeta supabase/migrations)
npx supabase start         # muestra API URL, anon key y service_role key
npx supabase db reset      # aplica las migraciones
```
Copia las claves mostradas a `.env.local` (`NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`). Los correos de confirmación se ven en Inbucket/Mailpit (`http://127.0.0.1:54324`).

### Probar el flujo completo
1. `/padres` → crea cuenta / inicia sesión.
2. "Crear enlace mágico" con un nombre o apodo → **copia el enlace** (solo se muestra una vez).
3. Abre el enlace en el móvil o en una ventana privada y completa la aventura.
4. Recarga en cualquier capítulo: el progreso, árbol y deseos siguen ahí.
5. En `/padres` verás respuestas, árbol y deseos; cambia estado de compra y notas. Nada de eso aparece en la aventura.

---

## 3. Despliegue en Vercel
1. Sube el proyecto a un repositorio Git e impórtalo en Vercel (framework: Next.js, sin cambios de build).
2. **Settings → Environment Variables** (Production y Preview): las 4 variables de la sección 4.
3. Deploy. Después, en Supabase añade `https://TU-DOMINIO/auth/callback` a Redirect URLs.
4. Si agregas o cambias variables, **vuelve a desplegar** (las páginas leen la configuración en el build).

---

## 4. Variables y configuraciones que debes proporcionar

| Variable | Dónde se obtiene | Ámbito |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL | Público |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/publishable key | Público |
| `NEXT_PUBLIC_SITE_URL` | Tu dominio de Vercel, sin barra final | Público (opcional; si falta se usa el host de la petición) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role/secret key | **Solo servidor**. Nunca con `NEXT_PUBLIC_` |

Configuraciones en Supabase: migración aplicada, proveedor Email habilitado, Site URL y Redirect URLs (`/auth/callback`). Recomendado: SMTP propio para correos de confirmación en producción y "Leaked password protection".

Sin estas variables la app compila y muestra una pantalla de **"Configuración pendiente"**.

---

## 5. Calidad y pruebas

```bash
npm run typecheck   # next typegen + tsc
npm run lint        # eslint
npm run test        # vitest
npm run build       # build de producción
npm run check       # todo lo anterior
```

- `tests/rls.test.ts` ejecuta **la migración real** en Postgres embebido (PGlite) con un stub de `auth.uid()` y roles de Supabase, y comprueba: hogares aislados, no crear niños en otro hogar, no leer el hash del token, no mover niños de hogar, padres sin escritura de deseos, `household_id` forzado por trigger en estados de compra, `anon` sin acceso y borrado en cascada.
- `tests/security.test.ts`: entropía y hash del token, URLs solo http/https, límites de Zod, árbol (máx. 60, una estrella), el mapeo infantil descarta campos privados, rate limiting, cuerpos sobredimensionados aunque mientan en `Content-Length`.

**Lo que NO está probado automáticamente** (requiere tu proyecto Supabase): el recorrido completo navegador ↔ API ↔ Supabase. Sigue "Probar el flujo completo" tras configurar las variables.

---

## 6. Seguridad y privacidad (resumen)
- Niños: solo nombre de pila/apodo (validado: solo letras). Sin correo, dirección, fecha de nacimiento, teléfono ni fotos.
- Padres pueden borrar un participante y **todo** lo asociado (cascada en BD).
- Si un enlace se comparte por error: "Generar nuevo enlace" invalida el anterior al instante.
- No se inyecta HTML de usuarios (React escapa todo; no hay `dangerouslySetInnerHTML`).
- Las imágenes de deseos se cargan sin referrer y desde la URL que dio el niño; si prefieres no mostrarlas, quita el `<img>` de `WishBook.tsx`.

### Producción / siguientes pasos
- Rate limiting compartido: reemplazar `src/lib/rate-limit.ts` por Upstash Redis (`@upstash/ratelimit`) manteniendo la firma `rateLimit(key, limit, windowMs)`.
- Content-Security-Policy estricta con nonces (ver guía de CSP de Next.js).
- Sustituir arte/música en `Santa.tsx` y `music.ts` por recursos con licencia si se desea.
