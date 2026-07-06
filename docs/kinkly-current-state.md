# Kinkly - Estado actual y siguiente paso

Fecha de corte: 2026-07-05

## Dónde estamos

La plataforma ya está reorientada como `Kinkly`, con foco en un directorio de perfiles y navegación por ciudad, nacionalidad y facetas derivadas.

### Ya resuelto

- `Kinkly` quedó como marca visible en la entrada pública, navegación y títulos SEO principales.
- La home ya funciona como hub de catálogo.
- `/encuentros` actúa como cluster principal del directorio.
- Existen landings indexables para:
  - ciudad
  - nacionalidad
  - ciudad + nacionalidad
- Se añadieron enlaces internos desde perfiles hacia ciudad, nacionalidad y combinación.
- Se creó un componente SEO común y se normalizaron canonical, `noindex` y metadatos base.
- `robots.txt` y `sitemap.xml` ya se regeneran desde script.
- El sitemap ya intenta incluir ciudades, nacionalidades y combinaciones reales cuando la API local responde.

## Qué debemos retomar

El siguiente bloque de trabajo ya no es arquitectura base. Ahora toca cerrar SEO técnico de control y validación.

### Prioridad alta

1. Verificación en Google Search Console.
2. Definición final de qué facetas deben indexarse y cuáles no.
3. Añadir datos estructurados donde aporten valor:
   - `Organization`
   - `WebSite`
   - `BreadcrumbList`
   - `ItemList`
   - `ProfilePage` o equivalente si aplica al perfil
4. Consolidar patrones de `title`, `meta description` y canonical por tipo de página.
5. Revisar indexabilidad real de:
   - home
   - hub `/encuentros`
   - ciudades
   - nacionalidades
   - combinaciones
   - perfiles

### Prioridad media

1. Afinar interlinking entre:
   - ciudad
   - nacionalidad
   - combinación
   - perfiles relacionados
2. Reducir facetas de bajo valor si no aportan volumen real.
3. Revisar profundidad de clics y enlaces huérfanos.
4. Medir eventos de SEO/conversión:
   - clic en perfil
   - clic en ciudad
   - clic en nacionalidad
   - clic en combinación
   - clic en CTA
   - reproducción de audio
   - salida a links externos

### Prioridad baja

1. Limpiar textos auxiliares que todavía usen nomenclatura antigua en mensajes no críticos.
2. Pulir branding no visible para búsqueda, si no afecta al usuario ni a la indexación.

## Estado técnico importante

- Las keys de almacenamiento local siguen usando el prefijo `privatehw.*` a propósito para no romper sesiones ni datos locales.
- El build ya pasa.
- El grafo local ya se actualizó con Graphify.
- El sitemap dinámico depende de que la API de modelos esté accesible durante el build.

## Próximo paso recomendado

Si retomamos desde aquí, la secuencia más útil es:

1. Schema y metadatos finales.
2. Reglas definitivas de indexación para facetas.
3. Instrumentación de eventos y control en GA4/Search Console.
4. Auditoría de enlaces internos y páginas huérfanas.

## Nota operativa

Este documento es la referencia de continuidad para el siguiente ciclo de trabajo técnico.
