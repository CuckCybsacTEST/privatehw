begin;

/*
  Legacy migration:
  - converts all digital subscription entitlements from `all_digital`
    to the new tier key `tier:elite`
  - normalizes product_slug to `membership-elite` so grant resolution
    can keep reading the active subscription grants from products.metadata
  - preserves the strongest available expiry when a user already has a
    target `tier:elite` row

  Safe to run more than once.
*/

with legacy_entitlements as (
  select
    user_id,
    'membership-elite'::text as product_slug,
    'tier:elite'::text as entitlement_key,
    status,
    source_order_id,
    grant_source,
    granted_by,
    expires_at,
    created_at
  from public.entitlements
  where entitlement_key = 'all_digital'
),
upserted_entitlements as (
  insert into public.entitlements as current_entitlements (
    user_id,
    product_slug,
    entitlement_key,
    status,
    source_order_id,
    grant_source,
    granted_by,
    expires_at,
    created_at
  )
  select
    user_id,
    product_slug,
    entitlement_key,
    status,
    source_order_id,
    grant_source,
    granted_by,
    expires_at,
    created_at
  from legacy_entitlements
  on conflict (user_id, entitlement_key) do update
    set
      product_slug = excluded.product_slug,
      status = case
        when current_entitlements.status = 'active' or excluded.status = 'active' then 'active'
        when current_entitlements.status = 'expired' or excluded.status = 'expired' then 'expired'
        else 'revoked'
      end,
      source_order_id = coalesce(current_entitlements.source_order_id, excluded.source_order_id),
      grant_source = coalesce(current_entitlements.grant_source, excluded.grant_source),
      granted_by = coalesce(current_entitlements.granted_by, excluded.granted_by),
      expires_at = case
        when current_entitlements.expires_at is null or excluded.expires_at is null then null
        when excluded.expires_at > current_entitlements.expires_at then excluded.expires_at
        else current_entitlements.expires_at
      end,
      updated_at = timezone('utc', now())
  returning 1
)
delete from public.entitlements
where entitlement_key = 'all_digital';

/*
  Normalize the legacy subscription product if it still exists.
  The app startup sync will also keep products aligned with site_content.
*/
update public.products
set
  slug = 'membership-elite',
  title = 'Acceso total - Elite',
  product_type = 'subscription',
  checkout_mode = 'subscription',
  access_scope = 'tier:elite',
  active = true,
  metadata = jsonb_set(
    jsonb_set(
      coalesce(metadata, '{}'::jsonb),
      '{grants}',
      '["video","pack","blog","physical"]'::jsonb,
      true
    ),
    '{requiredGrant}',
    '"video"'::jsonb,
    true
  )
where slug = 'membership-total'
  and not exists (
    select 1
    from public.products
    where slug = 'membership-elite'
  );

commit;
