# Stripe Sandbox Setup

## Variables

Completa estas variables en tu `.env` local:

```env
APP_URL=http://localhost:5173
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJ_service_role_key
```

`VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` ya se usan desde el frontend.

## Stripe test mode

1. Entra a [Stripe Dashboard](https://dashboard.stripe.com/test/apikeys) en `Test mode`.
2. Copia tu `Secret key` de prueba a `STRIPE_SECRET_KEY`.
3. No hace falta crear productos manualmente para empezar:
   - pagos unicos se generan dinamicamente desde la base
   - la suscripcion tambien se crea dinamicamente con intervalo mensual

## Webhook local

1. Instala Stripe CLI si aun no la tienes.
2. Inicia escucha local:

```powershell
stripe listen --forward-to localhost:4242/api/stripe/webhook
```

3. Stripe CLI te devolvera un `whsec_...`.
4. Copialo a `STRIPE_WEBHOOK_SECRET`.

## Supabase

1. Ejecuta de nuevo [`/D:/PROJECTS/supabase/schema.sql`](/D:/PROJECTS/supabase/schema.sql).
2. Ejecuta de nuevo [`/D:/PROJECTS/supabase/policies.sql`](/D:/PROJECTS/supabase/policies.sql).
3. Asegurate de que tu `.env` local tenga `SUPABASE_SERVICE_ROLE_KEY`.

## Flujo de prueba

1. Arranca el proyecto con `npm run dev`.
2. Crea una cuenta de cliente en [`/D:/PROJECTS/src/pages/AccessPage.jsx`](/D:/PROJECTS/src/pages/AccessPage.jsx) o entra con una ya existente.
3. Compra un video, un pack o la suscripcion desde la UI.
4. Usa una tarjeta de prueba de Stripe:

```text
4242 4242 4242 4242
```

5. Al completar el checkout, el webhook debe crear:
   - `orders`
   - `order_items`
   - `entitlements`

## Regla actual

- `membership-total` desbloquea `all_digital`
- `video-*` desbloquea solo ese video
- `pack-*` desbloquea solo ese pack
- `physical-*` no desbloquea contenido digital
