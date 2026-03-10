# Commerce Phase 1

Esta fase prepara la base comercial del proyecto antes de conectar Stripe.

## Que se agrego

- `products`: catalogo comercial unificado
- `orders`: cabecera de compras
- `order_items`: items por orden
- `entitlements`: accesos concedidos a cada usuario

## Regla de acceso implementada

- `membership-total` desbloquea todo el contenido digital
- cada video desbloquea solo ese video
- cada pack desbloquea solo ese pack
- la coleccion fisica no desbloquea contenido digital

## Que ejecutar en Supabase

1. Abre `SQL Editor`
2. Ejecuta de nuevo:
   - `supabase/schema.sql`
   - `supabase/policies.sql`

Los scripts usan `create table if not exists`, asi que son seguros como actualizacion aditiva.

## Estado actual del frontend

- la UI ya usa `products` y `entitlements`
- si las tablas nuevas aun no existen en Supabase, la app hace fallback local
- cuando el schema exista, los productos se sincronizaran automaticamente desde el contenido

## Siguiente fase

Conectar Stripe en modo test para:

- `membership-total` como suscripcion
- videos, packs y fisicos como compras unicas
- webhook para crear `orders` y `entitlements`

## Variables que necesitaremos despues

- `STRIPE_SECRET_KEY`
- `VITE_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_WEBHOOK_SECRET`
