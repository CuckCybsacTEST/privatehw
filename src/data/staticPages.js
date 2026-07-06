export const staticPages = {
  terms: {
    canonicalPath: '/terminos',
    title: 'Términos y condiciones',
    description: 'Reglas básicas de uso de Kinkly.',
    intro:
      'Estas condiciones resumen cómo usar Kinkly, publicar perfiles y navegar el catálogo sin perder claridad ni control.',
    sections: [
      {
        title: 'Uso del sitio',
        items: [
          'La plataforma está pensada para mayores de edad.',
          'Cada cuenta debe mantener datos coherentes y actualizados.',
          'Kinkly puede moderar contenido que incumpla las reglas internas.',
        ],
      },
      {
        title: 'Publicaciones y reservas',
        items: [
          'Cada perfil define su propia disponibilidad, tarifas y condiciones.',
          'La plataforma actúa como intermediaria técnica entre usuarios y modelos.',
          'Revisa siempre los detalles antes de confirmar cualquier reserva.',
        ],
      },
    ],
    note: 'Texto base operativo pendiente de revisión legal antes de salir a producción.',
    secondaryHref: '/ayuda',
    secondaryLabel: 'Centro de ayuda',
  },
  privacy: {
    canonicalPath: '/privacidad',
    title: 'Política de privacidad',
    description: 'Cómo tratamos los datos dentro de Kinkly.',
    intro:
      'Explicamos qué datos mínimos se usan para operar el sitio, gestionar accesos y sostener la experiencia de catálogo.',
    sections: [
      {
        title: 'Datos que usamos',
        items: [
          'Información de cuenta y contacto necesaria para registrar actividad básica.',
          'Datos técnicos mínimos para seguridad, rendimiento y trazabilidad.',
          'Contenido que la usuaria decide publicar dentro de su perfil.',
        ],
      },
      {
        title: 'Uso y retención',
        items: [
          'Usamos los datos para operar, moderar y mejorar la plataforma.',
          'No mostramos información privada fuera de los flujos previstos.',
          'El tiempo de retención debe definirse según el caso de uso real y la normativa aplicable.',
        ],
      },
    ],
    note: 'Resumen operativo. La versión definitiva debe revisarse con criterio legal y de cumplimiento.',
    secondaryHref: '/contacto',
    secondaryLabel: 'Contáctanos',
  },
  cookies: {
    canonicalPath: '/cookies',
    title: 'Política de cookies',
    description: 'Uso de cookies y tecnologías similares en Kinkly.',
    intro:
      'Detallamos las cookies necesarias para que el sitio funcione y las opciones de medición que pueden activarse más adelante.',
    sections: [
      {
        title: 'Cookies necesarias',
        items: [
          'Mantienen sesiones, preferencias y navegación básica.',
          'Permiten recordar estado de acceso y configuración mínima.',
          'Sin ellas, partes esenciales de la web dejan de funcionar correctamente.',
        ],
      },
      {
        title: 'Cookies de analítica',
        items: [
          'Solo deben activarse si se confirma su implementación real.',
          'Sirven para medir uso agregado, no para invadir la privacidad.',
          'El consentimiento debe definirse antes de ampliar el seguimiento.',
        ],
      },
    ],
    note: 'Si se añaden más herramientas de medición, esta página debe actualizarse primero.',
    secondaryHref: '/privacidad',
    secondaryLabel: 'Ver privacidad',
  },
  contact: {
    canonicalPath: '/contacto',
    title: 'Contáctanos',
    description: 'Canales básicos para soporte y consultas.',
    intro:
      'Usa esta página para resolver dudas operativas, reportar problemas de acceso o pedir ayuda con tu perfil.',
    sections: [
      {
        title: 'Qué enviar',
        items: [
          'Describe el problema con la mayor claridad posible.',
          'Incluye la URL o el perfil afectado si aplica.',
          'Añade capturas solo cuando ayuden a diagnosticar el caso.',
        ],
      },
      {
        title: 'Qué esperar',
        items: [
          'Respondemos por el canal disponible en el panel o en el flujo de soporte.',
          'Los casos urgentes deben priorizarse antes que las consultas generales.',
          'Si el contacto cambia, actualiza también esta página y el footer.',
        ],
      },
    ],
    note: 'Página básica de soporte, pensada para consultas operativas y no para comunicación comercial.',
    secondaryHref: '/ayuda',
    secondaryLabel: 'Centro de ayuda',
  },
  help: {
    canonicalPath: '/ayuda',
    title: 'Centro de ayuda',
    description: 'Guía rápida para usar Kinkly.',
    intro:
      'Encuentra respuestas simples para buscar perfiles, entender los filtros y moverte por las secciones principales del sitio.',
    sections: [
      {
        title: 'Cómo navegar',
        items: [
          'Usa la home para entrar por ciudad, nacionalidad o perfil.',
          'Abre los listados para ver el detalle y el contenido publicado.',
          'Vuelve al catálogo cuando necesites refinar la búsqueda.',
        ],
      },
      {
        title: 'Si algo no funciona',
        items: [
          'Prueba recargar la página o revisar el acceso de tu sesión.',
          'Si el contenido no carga, comprueba la conexión o el navegador.',
          'Si persiste el problema, usa la página de contacto.',
        ],
      },
    ],
    note: 'Este centro de ayuda empieza simple y puede crecer con preguntas reales de usuarios.',
    secondaryHref: '/contacto',
    secondaryLabel: 'Contáctanos',
  },
  report: {
    canonicalPath: '/denunciar-estafa',
    title: 'Cómo denunciar una estafa',
    description: 'Qué hacer si detectas un perfil o contacto sospechoso.',
    intro:
      'Si ves señales de fraude, deja de interactuar, guarda pruebas básicas y reporta el caso por los canales disponibles.',
    sections: [
      {
        title: 'Señales de alerta',
        items: [
          'Presión para pagar fuera de la plataforma.',
          'Cambios bruscos en datos, fotos o condiciones.',
          'Mensajes que intentan mover la conversación a canales no verificados.',
        ],
      },
      {
        title: 'Pasos recomendados',
        items: [
          'No compartas información sensible si no confías en el perfil.',
          'Conserva capturas, enlaces y cualquier referencia útil.',
          'Envía el caso al equipo de soporte o usa la página de contacto.',
        ],
      },
    ],
    note: 'La revisión de fraude debe ser operativa y rápida. Este texto es una base para arrancar.',
    secondaryHref: '/contacto',
    secondaryLabel: 'Reportar por contacto',
  },
}
