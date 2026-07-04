begin;

create temporary table if not exists seed_encuentros_models (
  id uuid primary key,
  slug text not null,
  display_name text not null,
  sort_order integer not null,
  content jsonb not null
) on commit drop;

delete from public.encuentros_models
where slug in (
  'sol-lima',
  'luna-cusco',
  'iris-arequipa',
  'valeria-trujillo',
  'camila-piura',
  'naira-bogota',
  'sofia-medellin',
  'martina-santiago',
  'laura-quito',
  'noa-mendoza'
);

insert into seed_encuentros_models (id, slug, display_name, sort_order, content)
values
  (
    '11111111-1111-4111-8111-111111111111',
    'sol-lima',
    'Sol Lima',
    1,
    $json$
    {
      "heroTitle": "Sol Lima",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Tarjeta compacta para catalogo publico y reservas por modelo.",
      "profileAge": 24,
      "profileCity": "Lima",
      "profileNationality": "Peruana",
      "profileTopBadge": "Top",
      "recordsEncounters": true,
      "presencialPrice": "180",
      "presencialUnit": "hora",
      "topCarouselImages": ["img/teaser1.jpg", "img/teaser2.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Sol Lima",
        "description": "Sesiones coordinadas por horario con disponibilidad visible en el panel.",
        "galleryTitle": "Sol Lima",
        "gallerySubtitle": "Perfil verificado",
        "priceLabel": "S/180.00",
        "priceAmount": 18000,
        "advanceLabel": "S/50.00",
        "advanceAmount": 5000,
        "recordingDiscountPercent": 10,
        "recordingDiscountLabel": "Descuento por grabacion",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 30,
        "availableDates": ["2026-07-03", "2026-07-04", "2026-07-05"],
        "bookingStartTime": "10:00",
        "bookingEndTime": "18:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "yape", "label": "YAPE" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'luna-cusco',
    'Luna Cusco',
    2,
    $json$
    {
      "heroTitle": "Luna Cusco",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Catalogo claro, compacto y listo para publicacion publica.",
      "profileAge": 26,
      "profileCity": "Cusco",
      "profileNationality": "Peruana",
      "profileTopBadge": "",
      "recordsEncounters": false,
      "presencialPrice": "200",
      "presencialUnit": "sesion",
      "topCarouselImages": ["img/teaser3.jpg", "img/teaser4.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Luna Cusco",
        "description": "Fechas y horas organizadas para una publicacion simple y reutilizable.",
        "galleryTitle": "Luna Cusco",
        "gallerySubtitle": "Disponibilidad activa",
        "priceLabel": "S/200.00",
        "priceAmount": 20000,
        "advanceLabel": "S/60.00",
        "advanceAmount": 6000,
        "recordingDiscountPercent": 0,
        "recordingDiscountLabel": "Sin descuento",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 45,
        "availableDates": ["2026-07-04", "2026-07-05", "2026-07-06"],
        "bookingStartTime": "11:00",
        "bookingEndTime": "19:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "transferencia", "label": "Transferencia" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'iris-arequipa',
    'Iris Arequipa',
    3,
    $json$
    {
      "heroTitle": "Iris Arequipa",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Ficha publica con imagen lateral, datos claros y acceso directo.",
      "profileAge": 28,
      "profileCity": "Arequipa",
      "profileNationality": "Peruana",
      "profileTopBadge": "Top",
      "recordsEncounters": true,
      "presencialPrice": "190",
      "presencialUnit": "hora",
      "topCarouselImages": ["img/teaser5.jpg", "img/teaser6.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Iris Arequipa",
        "description": "Configuracion lista para mostrar fechas y horarios por modelo.",
        "galleryTitle": "Iris Arequipa",
        "gallerySubtitle": "Perfil verificado",
        "priceLabel": "S/190.00",
        "priceAmount": 19000,
        "advanceLabel": "S/50.00",
        "advanceAmount": 5000,
        "recordingDiscountPercent": 15,
        "recordingDiscountLabel": "Descuento por grabacion",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 30,
        "availableDates": ["2026-07-05", "2026-07-06", "2026-07-07"],
        "bookingStartTime": "12:00",
        "bookingEndTime": "18:00",
        "slotIntervalMinutes": 45,
        "availabilityMode": "everyday",
        "availableDays": 21,
        "paymentMethods": [
          { "value": "yape", "label": "YAPE" },
          { "value": "plin", "label": "PLIN" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'valeria-trujillo',
    'Valeria Trujillo',
    4,
    $json$
    {
      "heroTitle": "Valeria Trujillo",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Pensado para catalogo publico con tarjeta corta y clara.",
      "profileAge": 22,
      "profileCity": "Trujillo",
      "profileNationality": "Peruana",
      "profileTopBadge": "",
      "recordsEncounters": false,
      "presencialPrice": "175",
      "presencialUnit": "noche",
      "topCarouselImages": ["img/teaser7.jpg", "img/teaser8.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Valeria Trujillo",
        "description": "Modelo publicada para validar el flujo de reserva por tarjeta.",
        "galleryTitle": "Valeria Trujillo",
        "gallerySubtitle": "Disponibilidad activa",
        "priceLabel": "S/175.00",
        "priceAmount": 17500,
        "advanceLabel": "S/50.00",
        "advanceAmount": 5000,
        "recordingDiscountPercent": 0,
        "recordingDiscountLabel": "Sin descuento",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 60,
        "availableDates": ["2026-07-06", "2026-07-07", "2026-07-08"],
        "bookingStartTime": "10:30",
        "bookingEndTime": "18:30",
        "slotIntervalMinutes": 30,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "efectivo", "label": "Efectivo" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '55555555-5555-4555-8555-555555555555',
    'camila-piura',
    'Camila Piura',
    5,
    $json$
    {
      "heroTitle": "Camila Piura",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Entrada limpia para listados compactos en desktop y movil.",
      "profileAge": 27,
      "profileCity": "Piura",
      "profileNationality": "Peruana",
      "profileTopBadge": "Top",
      "recordsEncounters": true,
      "presencialPrice": "210",
      "presencialUnit": "hora",
      "topCarouselImages": ["img/teaser9.jpg", "img/teaser10.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Camila Piura",
        "description": "Reserva individual por modelo con disponibilidad visible en el catalogo.",
        "galleryTitle": "Camila Piura",
        "gallerySubtitle": "Perfil verificado",
        "priceLabel": "S/210.00",
        "priceAmount": 21000,
        "advanceLabel": "S/70.00",
        "advanceAmount": 7000,
        "recordingDiscountPercent": 20,
        "recordingDiscountLabel": "Descuento por grabacion",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 45,
        "availableDates": ["2026-07-07", "2026-07-08", "2026-07-09"],
        "bookingStartTime": "11:00",
        "bookingEndTime": "20:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 21,
        "paymentMethods": [
          { "value": "yape", "label": "YAPE" },
          { "value": "transferencia", "label": "Transferencia" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '66666666-6666-4666-8666-666666666666',
    'naira-bogota',
    'Naira Bogota',
    6,
    $json$
    {
      "heroTitle": "Naira Bogota",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Listado neutro, consistente y listo para operar multiples modelos.",
      "profileAge": 25,
      "profileCity": "Bogota",
      "profileNationality": "Colombiana",
      "profileTopBadge": "",
      "recordsEncounters": false,
      "presencialPrice": "205",
      "presencialUnit": "sesion",
      "topCarouselImages": ["img/teaser11.jpg", "img/teaser12.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Naira Bogota",
        "description": "Perfil importado con horarios simples y URL publica propia.",
        "galleryTitle": "Naira Bogota",
        "gallerySubtitle": "Disponibilidad activa",
        "priceLabel": "S/205.00",
        "priceAmount": 20500,
        "advanceLabel": "S/60.00",
        "advanceAmount": 6000,
        "recordingDiscountPercent": 0,
        "recordingDiscountLabel": "Sin descuento",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 30,
        "availableDates": ["2026-07-08", "2026-07-09", "2026-07-10"],
        "bookingStartTime": "10:00",
        "bookingEndTime": "18:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "tarjeta", "label": "Tarjeta" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '77777777-7777-4777-8777-777777777777',
    'sofia-medellin',
    'Sofia Medellin',
    7,
    $json$
    {
      "heroTitle": "Sofia Medellin",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Card de catalogo preparada para crecer con mas modelos.",
      "profileAge": 29,
      "profileCity": "Medellin",
      "profileNationality": "Colombiana",
      "profileTopBadge": "Top",
      "recordsEncounters": true,
      "presencialPrice": "220",
      "presencialUnit": "hora",
      "topCarouselImages": ["img/teaser1.jpg", "img/teaser4.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Sofia Medellin",
        "description": "Datos listos para mostrar un catalogo con multiples URLs publicas.",
        "galleryTitle": "Sofia Medellin",
        "gallerySubtitle": "Perfil verificado",
        "priceLabel": "S/220.00",
        "priceAmount": 22000,
        "advanceLabel": "S/70.00",
        "advanceAmount": 7000,
        "recordingDiscountPercent": 15,
        "recordingDiscountLabel": "Descuento por grabacion",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 45,
        "availableDates": ["2026-07-09", "2026-07-10", "2026-07-11"],
        "bookingStartTime": "12:00",
        "bookingEndTime": "20:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 21,
        "paymentMethods": [
          { "value": "yape", "label": "YAPE" },
          { "value": "plin", "label": "PLIN" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '88888888-8888-4888-8888-888888888888',
    'martina-santiago',
    'Martina Santiago',
    8,
    $json$
    {
      "heroTitle": "Martina Santiago",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Formato claro para mostrar imagen, datos y CTA en una sola tarjeta.",
      "profileAge": 23,
      "profileCity": "Santiago",
      "profileNationality": "Chilena",
      "profileTopBadge": "",
      "recordsEncounters": false,
      "presencialPrice": "195",
      "presencialUnit": "sesion",
      "topCarouselImages": ["img/teaser5.jpg", "img/teaser8.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Martina Santiago",
        "description": "Modelo lista para publicar con horarios controlados por modelo.",
        "galleryTitle": "Martina Santiago",
        "gallerySubtitle": "Disponibilidad activa",
        "priceLabel": "S/195.00",
        "priceAmount": 19500,
        "advanceLabel": "S/60.00",
        "advanceAmount": 6000,
        "recordingDiscountPercent": 0,
        "recordingDiscountLabel": "Sin descuento",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 30,
        "availableDates": ["2026-07-10", "2026-07-11", "2026-07-12"],
        "bookingStartTime": "10:30",
        "bookingEndTime": "18:30",
        "slotIntervalMinutes": 30,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "efectivo", "label": "Efectivo" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    '99999999-9999-4999-8999-999999999999',
    'laura-quito',
    'Laura Quito',
    9,
    $json$
    {
      "heroTitle": "Laura Quito",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Preparado para el catalogo /encuentros con un lenguaje visual consistente.",
      "profileAge": 30,
      "profileCity": "Quito",
      "profileNationality": "Ecuatoriana",
      "profileTopBadge": "Top",
      "recordsEncounters": true,
      "presencialPrice": "230",
      "presencialUnit": "hora",
      "topCarouselImages": ["img/teaser9.jpg", "img/teaser2.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Laura Quito",
        "description": "Registro listo para crecer sin depender de una sola modelo.",
        "galleryTitle": "Laura Quito",
        "gallerySubtitle": "Perfil verificado",
        "priceLabel": "S/230.00",
        "priceAmount": 23000,
        "advanceLabel": "S/80.00",
        "advanceAmount": 8000,
        "recordingDiscountPercent": 20,
        "recordingDiscountLabel": "Descuento por grabacion",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 60,
        "availableDates": ["2026-07-11", "2026-07-12", "2026-07-13"],
        "bookingStartTime": "11:00",
        "bookingEndTime": "19:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 21,
        "paymentMethods": [
          { "value": "transferencia", "label": "Transferencia" },
          { "value": "yape", "label": "YAPE" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'noa-mendoza',
    'Noa Mendoza',
    10,
    $json$
    {
      "heroTitle": "Noa Mendoza",
      "heroDescription": "Perfil publicado con disponibilidad coordinada y agenda actualizada.",
      "profileDescription": "Modelo de prueba con datos limpios para validar el catalogo multi-perfil.",
      "profileAge": 27,
      "profileCity": "Mendoza",
      "profileNationality": "Argentina",
      "profileTopBadge": "",
      "recordsEncounters": false,
      "presencialPrice": "215",
      "presencialUnit": "noche",
      "topCarouselImages": ["img/teaser10.jpg", "img/teaser12.jpg"],
      "encuentrosBooking": {
        "eyebrow": "Reserva",
        "title": "Agenda con Noa Mendoza",
        "description": "Tarjeta final de la tanda para comprobar orden y carga del catalogo.",
        "galleryTitle": "Noa Mendoza",
        "gallerySubtitle": "Disponibilidad activa",
        "priceLabel": "S/215.00",
        "priceAmount": 21500,
        "advanceLabel": "S/70.00",
        "advanceAmount": 7000,
        "recordingDiscountPercent": 0,
        "recordingDiscountLabel": "Sin descuento",
        "recordingPromptTitle": "Quieres grabar la cita?",
        "recordingPromptDescription": "Selecciona si aplica el descuento configurado.",
        "recordingYesLabel": "Si",
        "recordingNoLabel": "No",
        "currency": "PEN",
        "durationMinutes": 45,
        "availableDates": ["2026-07-12", "2026-07-13", "2026-07-14"],
        "bookingStartTime": "10:00",
        "bookingEndTime": "18:00",
        "slotIntervalMinutes": 60,
        "availabilityMode": "everyday",
        "availableDays": 14,
        "paymentMethods": [
          { "value": "plin", "label": "PLIN" },
          { "value": "tarjeta", "label": "Tarjeta" }
        ],
        "loginNote": "Las reservas requieren usuario registrado."
      }
    }
    $json$::jsonb
  )
on commit drop;

insert into public.encuentros_models (
  id,
  slug,
  display_name,
  status,
  sort_order,
  content,
  published_at,
  deleted_at
)
select
  id,
  slug,
  display_name,
  'published',
  sort_order,
  content,
  timezone('utc', now()) - ((11 - sort_order) * interval '3 minutes'),
  null
from seed_encuentros_models
on conflict (slug) do update set
  display_name = excluded.display_name,
  status = excluded.status,
  sort_order = excluded.sort_order,
  content = excluded.content,
  published_at = excluded.published_at,
  deleted_at = excluded.deleted_at,
  updated_at = timezone('utc', now());

commit;
