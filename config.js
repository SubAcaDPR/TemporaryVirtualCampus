// ============================================================
//  CONFIGURACIÓN DEL SITIO — el único archivo que editas aquí.
//  Los cursos y módulos reales NO van aquí: se administran en la
//  hoja de Google (pestañas "Cursos" y "Módulos").
// ============================================================
window.SITIO = {
  titulo: "Campus virtual",
  institucion: "CONRED",
  institucionCompleta: "Coordinadora Nacional para la Reducción de Desastres",
  lema: "Aprende a reducir el riesgo de desastres, a tu ritmo",
  descripcion: "Cursos gratuitos y en línea. Te registras una sola vez y avanzas en todos los cursos con tu ID de estudiante.",

  // Identidad institucional
  logo: "logo.png",
  colores: {
    primario: "#0042AC",    // azul CONRED
    secundario: "#E25725"   // naranja CONRED
  },

  // URL de la aplicación web de Apps Script (termina en /exec).
  // Mientras esté vacía, el sitio funciona en MODO DEMO con los cursos de abajo.
  apiUrl: "",

  notaMinima: 80,           // solo para mostrarla; la que manda es NOTA_MINIMA en Code.gs
  prefijoId: "DPREDU",      // igual que PREFIJO_ID en Code.gs. IDs del tipo DPREDU-ALM-7F3K9

  // Datos del registro. Los "id" deben coincidir con CAMPOS en Code.gs.
  campos: [
    { id: "nombre", etiqueta: "Nombre completo", ayuda: "Así aparecerá en tus certificados.", tipo: "text", requerido: true, autocomplete: "name" },
    { id: "correo", etiqueta: "Correo electrónico", ayuda: "Ahí te enviaremos tu ID y tus certificados.", tipo: "email", requerido: true, autocomplete: "email" },
    { id: "telefono", etiqueta: "Teléfono", ayuda: "Con código de país si no es de Guatemala, por ejemplo +503 7000 0000.", tipo: "tel", requerido: true, autocomplete: "tel" }
  ],
  aviso: "Acepto que mis datos se usen para dar seguimiento a mi avance y emitir mis certificados.",

  // Correo de contacto que aparece en "Preguntas frecuentes" (opcional)
  contacto: "",

  // La encuesta y los enlaces a contenidos/evaluaciones NO van aquí: este archivo es público.
  // Se configuran en Code.gs y el servidor solo los entrega al estudiante que corresponde.

  // Google Analytics 4 (opcional): ID de medición, por ejemplo "G-ABC123XYZ".
  // Solo mide el uso del sitio; nunca se envían nombres, correos ni IDs de estudiante.
  analytics: "",

  // Cursos para el MODO DEMO (se ignoran cuando hay apiUrl). Solo títulos y enlaces de ejemplo.
  demoCatalogo: [
    demo("abc-riesgo", "ABC de la gestión del riesgo de desastres", "2 horas",
      "Comprende los conceptos base de la gestión del riesgo y el papel de la Coordinadora Nacional para la Reducción de Desastres (CONRED)."),
    demo("plan-familiar", "Plan familiar de respuesta", "2 horas",
      "Involucra a los miembros de tu familia en la planificación de cómo proceder ante situaciones de riesgo en el hogar."),
    demo("sendai", "Marco de Sendai", "",
      "Conoce el Marco de Sendai para la Reducción del Riesgo de Desastres 2015-2030: sus prioridades de acción y sus metas."),
    demo("vulcanologia", "Introducción a la vulcanología", "",
      "Conceptos básicos sobre los volcanes, su actividad y las amenazas asociadas."),
    demo("hidrometeorologicos", "Fenómenos hidrometeorológicos", "",
      "Lluvias intensas, tormentas tropicales, sequías y otros fenómenos: cómo se originan y cómo prepararse."),
    demo("incendios", "Incendios forestales", "",
      "Causas, prevención y respuesta ante incendios forestales."),
    demo("inform-gt", "INFORM GT", "",
      "Conoce el índice INFORM para la gestión del riesgo y su aplicación en Guatemala.")
  ]
};

// Genera 3 módulos de ejemplo + evaluación final para el modo demo
function demo(id, titulo, duracion, descripcion) {
  const m = n => ({ orden: n, tipo: "modulo", titulo: "Módulo " + n, descripcion: "", duracion: "", contenido: "https://sites.google.com/", evaluacion: "#" });
  return { id, titulo, duracion, descripcion, imagen: "",
    modulos: [m(1), m(2), m(3), { orden: 4, tipo: "final", titulo: "Evaluación final", descripcion: "Integra todo lo aprendido en el curso.", duracion: "", contenido: "", evaluacion: "#" }] };
}
