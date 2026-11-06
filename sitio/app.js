// Lógica compartida: conexión con Apps Script, sesión por ID, registro y avisos.
// No necesitas editar este archivo.
(function () {
  const S = window.SITIO;
  const DEMO = !S.apiUrl;
  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const ICONOS = {
    candado: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    copiar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
    medalla: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 13.9 7 22l5-3 5 3-1.5-8.1"/></svg>',
    descargar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m0 0-5-5m5 5 5-5M4 21h16"/></svg>',
    encuesta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  // Crea elementos sin riesgo de inyectar HTML
  function h(tag, props, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "html") el.innerHTML = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    hijos.flat(Infinity).forEach(c => { if (c != null && c !== false) el.append(c.nodeType ? c : String(c)); });
    return el;
  }

  const Sesion = {
    id: () => LS.get("cursos_id"),
    guardar: id => LS.set("cursos_id", id),
    salir: () => LS.del("cursos_id")
  };

  // ---------- Conexión con Apps Script ----------
  async function api(action, data) {
    if (DEMO) return Demo.atender(action, data || {});
    const r = await fetch(S.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // evita la verificación CORS previa
      body: JSON.stringify(Object.assign({ action }, data))
    });
    if (!r.ok) throw new Error("red");
    return r.json();
  }

  let _catalogo = null;
  async function catalogo() {
    if (!_catalogo) {
      const r = await api("catalogo");
      if (!r.ok) throw new Error(r.error || "red");
      _catalogo = r.cursos;
    }
    return _catalogo;
  }

  // ---------- Modo demo: simula la hoja en este navegador ----------
  const Demo = {
    db() { try { return JSON.parse(LS.get("demo_db")) || nuevo(); } catch (e) { return nuevo(); }
      function nuevo() { return { registro: {}, insc: [], evals: [], certs: [] }; } },
    guardar(d) { LS.set("demo_db", JSON.stringify(d)); },
    progreso(d, id, cid) {
      const modulos = {};
      d.evals.filter(e => e.id === id && e.curso === cid).forEach(e => {
        const m = modulos[e.orden] || (modulos[e.orden] = { aprobado: false, mejor: 0, intentos: 0 });
        m.intentos++; m.mejor = Math.max(m.mejor, e.pct);
        if (e.pct >= S.notaMinima) m.aprobado = true;
      });
      const c = d.certs.find(x => x.id === id && x.curso === cid);
      const encuesta = (d.encuestas || []).some(x => x.id === id && x.curso === cid);
      return { modulos, encuestaRequerida: true, encuesta, certificado: c ? { codigo: c.codigo, url: "", fecha: c.fecha } : null };
    },
    async atender(action, p) {
      await new Promise(r => setTimeout(r, 300));
      const d = this.db(), cat = S.demoCatalogo;
      const id = String(p.id || "").trim().toUpperCase();
      switch (action) {
        case "catalogo": return { ok: true, cursos: cat.map(c => Object.assign({}, c, { modulos: c.modulos.map(({ contenido, evaluacion, ...m }) => m) })) };
        case "registrar": {
          const correo = String(p.datos.correo || "").toLowerCase();
          if (Object.values(d.registro).some(v => v.correo === correo)) return { ok: true, existente: true };
          let nuevo; do { nuevo = (S.prefijoId || "DPREDU") + "-" + iniciales(p.datos.nombre) + "-" + azar(5); } while (d.registro[nuevo]);
          d.registro[nuevo] = Object.assign({}, p.datos, { correo });
          this.guardar(d);
          return { ok: true, id: nuevo };
        }
        case "ingresar": {
          if (!d.registro[id]) return { ok: false, error: "ID no encontrado" };
          const cursos = {};
          [...new Set(d.insc.filter(i => i.id === id).map(i => i.curso))].forEach(cid => {
            const c = cat.find(x => x.id === cid); if (!c) return;
            const pr = this.progreso(d, id, cid);
            const aprobados = c.modulos.filter(m => (pr.modulos[m.orden] || {}).aprobado).length;
            cursos[cid] = { aprobados, total: c.modulos.length, certificado: !!pr.certificado && pr.encuesta, faltaEncuesta: aprobados === c.modulos.length && !pr.encuesta };
          });
          return { ok: true, cursos };
        }
        case "progreso": {
          if (!d.registro[id]) return { ok: false, error: "ID no encontrado" };
          if (p.inscribir && !d.insc.some(i => i.id === id && i.curso === p.curso)) { d.insc.push({ id, curso: p.curso }); this.guardar(d); }
          // Igual que el servidor: solo enlaces de los pasos desbloqueados
          const pr = this.progreso(d, id, p.curso), c = cat.find(x => x.id === p.curso);
          const ap = m => (pr.modulos[m.orden] || {}).aprobado, enlaces = {};
          let abierto = true;
          c.modulos.filter(m => m.tipo !== "final").forEach(m => { if (abierto || ap(m)) enlaces[m.orden] = { contenido: m.contenido, evaluacion: m.evaluacion }; if (!ap(m)) abierto = false; });
          c.modulos.filter(m => m.tipo === "final").forEach(m => { if (abierto || ap(m)) enlaces[m.orden] = { contenido: m.contenido, evaluacion: m.evaluacion }; });
          const todos = c.modulos.every(ap);
          return Object.assign({ ok: true, enlaces, encuestaUrl: todos && !pr.encuesta ? "#demo" : "" }, pr);
        }
        case "recuperar": return { ok: true };
        case "demoEncuesta": {
          d.encuestas = d.encuestas || [];
          if (!d.encuestas.some(x => x.id === id && x.curso === p.curso)) d.encuestas.push({ id, curso: p.curso });
          this.guardar(d);
          return { ok: true };
        }
        case "verificar": {
          const c = d.certs.find(x => x.codigo === String(p.codigo || "").trim().toUpperCase());
          if (!c) return { ok: true, valido: false };
          return { ok: true, valido: true, nombre: (d.registro[c.id] || {}).nombre, curso: (cat.find(x => x.id === c.curso) || {}).titulo, fecha: c.fecha };
        }
        case "demoEvaluar": {
          d.evals.push({ id, curso: p.curso, orden: p.orden, pct: p.pct });
          const c = cat.find(x => x.id === p.curso), pr = this.progreso(d, id, p.curso);
          if (!pr.certificado && c.modulos.every(m => (pr.modulos[m.orden] || {}).aprobado))
            d.certs.push({ codigo: "C-" + azar(8), id, curso: p.curso, fecha: new Date().toLocaleDateString("es-GT") });
          this.guardar(d);
          return { ok: true };
        }
      }
      return { ok: false, error: "Acción no válida" };
    }
  };
  function azar(n) { let s = ""; for (let i = 0; i < n; i++) s += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]; return s; }

  // ---------- Utilidades de interfaz ----------
  // Aviso breve (estado del sistema)
  function aviso(texto, tipo) {
    let zona = document.getElementById("avisos");
    if (!zona) { zona = h("div", { id: "avisos", role: "status", "aria-live": "polite" }); document.body.append(zona); }
    const t = h("div", { class: "toast " + (tipo || "") }, texto);
    zona.replaceChildren(t); // solo el aviso más reciente
    setTimeout(() => { t.classList.add("sale"); setTimeout(() => t.remove(), 400); }, 4200);
  }

  async function copiarTexto(texto, boton) {
    try { await navigator.clipboard.writeText(texto); aviso("ID copiado al portapapeles", "ok"); }
    catch (e) { aviso("No se pudo copiar automáticamente. Selecciónalo y cópialo a mano."); }
  }

  // Diálogo de confirmación genérico
  function confirmar({ titulo, cuerpo, aceptar, cancelar }) {
    return new Promise(resolve => {
      const dlg = h("dialog", { class: "auth", "aria-labelledby": "conf-t" });
      const fin = v => { if (dlg.open) dlg.close(); dlg.remove(); resolve(v); };
      dlg.addEventListener("cancel", e => { e.preventDefault(); fin(false); });
      dlg.append(h("div", { class: "stack" },
        h("h2", { id: "conf-t" }, titulo), cuerpo,
        h("div", { class: "acciones" },
          h("button", { class: "btn", type: "button", onclick: () => fin(true) }, aceptar),
          h("button", { class: "btn ghost", type: "button", onclick: () => fin(false) }, cancelar || "Cancelar"))));
      document.body.append(dlg); dlg.showModal();
      dlg.querySelector(".btn.ghost").focus(); // la opción segura queda enfocada
    });
  }

  // Iniciales del nombre (máx. 4), igual que en Code.gs: "José de la Cruz Pérez" -> JCP
  function iniciales(nombre) {
    const OMITIR = ["DE", "DEL", "LA", "LAS", "LOS", "Y", "E", "DA", "DI", "VAN", "VON"];
    const ini = String(nombre || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
      .replace(/[^A-Z\s]/g, " ").split(/\s+/).filter(p => p && !OMITIR.includes(p))
      .map(p => p[0]).join("").slice(0, 4);
    return ini || "X";
  }

  // Normaliza el ID escrito: "dpredu alm 7f3k9" o "DPREDUALM7F3K9" -> "DPREDU-ALM-7F3K9"
  const PREFIJO = (S.prefijoId || "DPREDU").toUpperCase();
  function formatearId(v) {
    const s = String(v || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!s.startsWith(PREFIJO) || s.length < PREFIJO.length + 6) return String(v || "").toUpperCase().replace(/\s+/g, "");
    const resto = s.slice(PREFIJO.length);
    return `${PREFIJO}-${resto.slice(0, -5)}-${resto.slice(-5)}`;
  }
  const idValido = id => new RegExp(`^${PREFIJO}-[A-Z]{1,4}-[A-Z0-9]{5}$`).test(id);

  // Sugiere corrección de errores comunes en el dominio del correo
  const DOMINIOS = ["gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "yahoo.es", "icloud.com", "live.com"];
  function distancia(a, b) {
    const m = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) m[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }
  function sugerirCorreo(correo) {
    const [u, d] = String(correo).toLowerCase().split("@");
    if (!u || !d || DOMINIOS.includes(d)) return null;
    const s = DOMINIOS.find(x => distancia(x, d) <= 2);
    return s ? u + "@" + s : null;
  }
  const correoValido = c => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(c);
  const telefonoValido = t => /^[\d\s+()\-]+$/.test(t) && t.replace(/\D/g, "").length >= 8 && t.replace(/\D/g, "").length <= 15;

  // ---------- Barra superior ----------
  function barra(alCambiar) {
    const el = document.getElementById("barra");
    const id = Sesion.id();
    el.replaceChildren(
      h("a", { href: "index.html", class: "marca", "aria-label": `${S.titulo} · ${S.institucion}, ir al inicio` },
        S.logo ? h("img", { src: S.logo, alt: "", width: "40", height: "44" }) : null,
        h("span", { class: "txt" }, h("span", { class: "inst" }, S.institucion), h("span", { class: "nom" }, S.titulo))),
      h("div", { class: "sesion" }, id
        ? [h("span", { class: "etq" }, "Tu ID"),
           h("code", { class: "id" }, id),
           h("button", { class: "icono", type: "button", title: "Copiar ID", "aria-label": "Copiar ID", html: ICONOS.copiar, onclick: () => copiarTexto(id) }),
           h("button", { class: "link", type: "button", onclick: async () => {
             const ok = await confirmar({
               titulo: "¿Cerrar sesión en este dispositivo?",
               cuerpo: h("div", { class: "stack" },
                 h("p", {}, "Tu avance no se pierde. Para volver a entrar necesitarás tu ID:"),
                 h("div", { class: "idgrande" }, id),
                 h("p", { class: "msg" }, "Anótalo o cópialo antes de salir. También está en el correo de bienvenida.")),
               aceptar: "Sí, salir", cancelar: "Seguir aquí"
             });
             if (ok) { Sesion.salir(); aviso("Cerraste sesión. Tu avance quedó guardado."); alCambiar && alCambiar(); }
           } }, "Salir")]
        : h("button", { class: "btn ghost sm", type: "button", onclick: async () => { if (await pedirId({ vista: "ingreso" })) alCambiar && alCambiar(); } }, "Ingresar con mi ID"))
    );
    if (DEMO && !document.getElementById("aviso-demo")) {
      el.after(h("div", { id: "aviso-demo", class: "demo fila" },
        h("span", {}, "Modo demo: aún no está conectado a la hoja de Google. Los registros y el avance de prueba se guardan solo en este navegador."),
        h("button", { class: "btn ghost sm", type: "button", onclick: async () => {
          const ok = await confirmar({
            titulo: "¿Borrar los datos de prueba?",
            cuerpo: h("p", {}, "Se eliminarán de este navegador todos los registros, IDs, avances, encuestas y certificados de prueba. Los cursos y la configuración no cambian."),
            aceptar: "Sí, borrar todo", cancelar: "Cancelar"
          });
          if (!ok) return;
          LS.del("demo_db"); Sesion.salir();
          try { Object.keys(sessionStorage).filter(k => k.startsWith("ruta_")).forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
          location.href = "index.html";
        } }, "Borrar datos de prueba")));
    }
  }

  // ---------- Diálogo de registro / ingreso ----------
  function pedirId(opc) {
    opc = opc || {};
    return new Promise(resolve => {
      let terminado = false;
      const dlg = h("dialog", { class: "auth", "aria-labelledby": "auth-titulo" });
      const fin = v => { if (terminado) return; terminado = true; if (dlg.open) dlg.close(); dlg.remove(); resolve(v); };
      dlg.addEventListener("close", () => fin(null));
      const cerrar = () => h("button", { class: "cerrar", type: "button", "aria-label": "Cerrar", onclick: () => fin(null) }, "×");
      const mensaje = () => h("p", { class: "msg", role: "alert" });
      const falla = (m, e) => {
        m.className = "msg err";
        m.textContent = e && e.message && !/red|fetch|network/i.test(e.message) ? e.message : "No pudimos conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.";
      };
      // Muestra/oculta el error bajo un campo
      const errorCampo = (input, texto) => {
        const caja = input.closest(".campo"), p = caja.querySelector(".err-campo");
        input.setAttribute("aria-invalid", texto ? "true" : "false");
        p.textContent = texto || ""; p.hidden = !texto;
      };

      const vistas = {
        registro() {
          const m = mensaje();
          const btn = h("button", { class: "btn bloque", type: "submit" }, "Crear mi ID");
          const campos = S.campos.map(c => {
            const input = h("input", { id: "f-" + c.id, name: c.id, type: c.tipo || "text", autocomplete: c.autocomplete || "off", maxlength: c.tipo === "tel" ? "25" : "200",
              inputmode: c.tipo === "tel" ? "tel" : null,
              "aria-required": c.requerido ? "true" : null, "aria-describedby": "e-" + c.id + (c.ayuda ? " a-" + c.id : "") });
            input.addEventListener("input", () => errorCampo(input, ""));
            const sugerencia = h("p", { class: "sugerencia", hidden: true });
            if (c.tipo === "email") input.addEventListener("blur", () => {
              const s = sugerirCorreo(input.value.trim());
              sugerencia.replaceChildren(...(s ? ["¿Quisiste decir ", h("button", { class: "link", type: "button", onclick: () => { input.value = s; sugerencia.hidden = true; input.focus(); } }, s), "?"] : []));
              sugerencia.hidden = !s;
            });
            return h("div", { class: "campo" },
              h("label", { for: "f-" + c.id }, c.etiqueta, c.requerido ? h("span", { class: "req", "aria-hidden": "true" }, " *") : h("span", { class: "opc" }, " (opcional)")),
              c.ayuda ? h("p", { class: "ayuda", id: "a-" + c.id }, c.ayuda) : null,
              input,
              h("p", { class: "err-campo", id: "e-" + c.id, hidden: true }),
              sugerencia);
          });
          const consentimiento = S.aviso ? h("div", { class: "campo" },
            h("label", { class: "check" }, h("input", { type: "checkbox", id: "f-acepto" }), h("span", {}, S.aviso)),
            h("p", { class: "err-campo", hidden: true })) : null;

          const form = h("form", { class: "stack", novalidate: true, onsubmit: async ev => {
            ev.preventDefault();
            // Validación propia con mensajes claros (heurística 9)
            let primero = null;
            const datos = { sitio_web: form.elements.sitio_web.value };
            S.campos.forEach(c => {
              const input = form.elements[c.id]; const v = input.value.trim(); datos[c.id] = v;
              let err = "";
              if (c.requerido && !v) err = `Escribe tu ${c.etiqueta.toLowerCase()}.`;
              else if (c.tipo === "email" && v && !correoValido(v)) err = "Revisa el correo: debe tener la forma nombre@dominio.com";
              else if (c.tipo === "tel" && v && !telefonoValido(v)) err = "Revisa el teléfono: escribe al menos 8 dígitos (puedes usar espacios, guiones y +).";
              errorCampo(input, err); if (err && !primero) primero = input;
            });
            if (consentimiento) {
              const chk = consentimiento.querySelector("input");
              const p = consentimiento.querySelector(".err-campo");
              p.textContent = chk.checked ? "" : "Necesitamos tu autorización para guardar tu avance."; p.hidden = chk.checked;
              if (!chk.checked && !primero) primero = chk;
            }
            if (primero) { primero.focus(); return; }
            btn.disabled = true; btn.textContent = "Creando tu ID…"; m.className = "msg"; m.textContent = "";
            try {
              const r = await api("registrar", { datos });
              if (r.ok && r.id) { Sesion.guardar(r.id); evento("sign_up", { method: "id_estudiante" }); mostrar("listo", r.id); }
              else if (r.ok && r.existente) mostrar("ingreso", `Ya existe un registro con ${datos.correo}. Te reenviamos tu ID a ese correo: escríbelo aquí para continuar.`);
              else throw new Error(r.error);
            } catch (e) { falla(m, e); btn.disabled = false; btn.textContent = "Crear mi ID"; }
          } }, campos,
            // Campo trampa contra robots: invisible para las personas y para lectores de pantalla
            h("div", { class: "trampa", "aria-hidden": "true" }, h("label", {}, "Sitio web", h("input", { name: "sitio_web", type: "text", tabindex: "-1", autocomplete: "off" }))),
            consentimiento, btn, m);
          return [
            h("h2", { id: "auth-titulo" }, "Regístrate para empezar"),
            h("p", { class: "msg" }, (opc.curso ? `Para inscribirte en «${opc.curso}» necesitas un ID de estudiante. ` : "") +
              "Lo creas una sola vez y te sirve para todos los cursos. Los campos con * son obligatorios."),
            form,
            h("p", { class: "msg centro" }, "¿Ya tienes ID? ", h("button", { class: "link", type: "button", onclick: () => mostrar("ingreso") }, "Ingresa aquí"))
          ];
        },
        ingreso(nota) {
          const m = mensaje();
          const input = h("input", { id: "f-id", type: "text", class: "mayus", placeholder: "Ej. " + PREFIJO + "-ALM-7F3K9", autocomplete: "off",
            inputmode: "text", spellcheck: "false", "aria-describedby": "e-id a-id" });
          input.addEventListener("input", () => { input.value = input.value.toUpperCase(); errorCampo(input, ""); });
          input.addEventListener("blur", () => { if (input.value.trim()) input.value = formatearId(input.value); });
          const btn = h("button", { class: "btn bloque", type: "submit" }, "Ingresar");
          const form = h("form", { class: "stack", novalidate: true, onsubmit: async ev => {
            ev.preventDefault();
            const id = formatearId(input.value);
            input.value = id;
            if (!idValido(id)) { errorCampo(input, `Revisa el ID: tiene la forma ${PREFIJO}-ALM-7F3K9 (prefijo, tus iniciales y 5 caracteres).`); input.focus(); return; }
            btn.disabled = true; btn.textContent = "Buscando…"; m.textContent = "";
            try {
              const r = await api("ingresar", { id });
              if (r.ok) { Sesion.guardar(id); evento("login", { method: "id_estudiante" }); aviso("¡Bienvenido de vuelta! Tu avance está al día.", "ok"); fin(id); }
              else if (r.error === "ID no encontrado") { errorCampo(input, "No encontramos ese ID. Revisa que coincida con el del correo de bienvenida, o recupéralo abajo."); input.focus(); }
              else throw new Error(r.error);
            } catch (e) { falla(m, e); }
            btn.disabled = false; btn.textContent = "Ingresar";
          } },
            h("div", { class: "campo" }, h("label", { for: "f-id" }, "Tu ID de estudiante"),
              h("p", { class: "ayuda", id: "a-id" }, "Está en el correo que recibiste al registrarte."),
              input, h("p", { class: "err-campo", id: "e-id", hidden: true })),
            btn, m);
          return [
            h("h2", { id: "auth-titulo" }, "Ingresa con tu ID"),
            nota ? h("p", { class: "nota" }, nota) : null,
            form,
            h("p", { class: "msg centro" }, "¿Primera vez? ", h("button", { class: "link", type: "button", onclick: () => mostrar("registro") }, "Regístrate"),
              " · ", h("button", { class: "link", type: "button", onclick: () => mostrar("recuperar") }, "Olvidé mi ID"))
          ];
        },
        recuperar() {
          const m = mensaje();
          const input = h("input", { id: "f-rec", type: "email", autocomplete: "email", "aria-describedby": "e-rec" });
          input.addEventListener("input", () => errorCampo(input, ""));
          const btn = h("button", { class: "btn bloque", type: "submit" }, "Enviarme mi ID");
          const form = h("form", { class: "stack", novalidate: true, onsubmit: async ev => {
            ev.preventDefault();
            if (!correoValido(input.value.trim())) { errorCampo(input, "Revisa el correo: debe tener la forma nombre@dominio.com"); input.focus(); return; }
            btn.disabled = true; btn.textContent = "Enviando…";
            try {
              await api("recuperar", { correo: input.value.trim() });
              form.replaceChildren(h("p", { class: "nota ok" }, `Listo. Si ${input.value.trim()} está registrado, en unos minutos recibirás tu ID. Revisa también la carpeta de spam.`));
            } catch (e) { falla(m, e); btn.disabled = false; btn.textContent = "Enviarme mi ID"; }
          } }, h("div", { class: "campo" }, h("label", { for: "f-rec" }, "Correo con el que te registraste"), input, h("p", { class: "err-campo", id: "e-rec", hidden: true })), btn, m);
          return [h("h2", { id: "auth-titulo" }, "Recupera tu ID"),
            h("p", { class: "msg" }, "Te lo enviaremos al correo que usaste al registrarte."), form,
            h("p", { class: "msg centro" }, h("button", { class: "link", type: "button", onclick: () => mostrar("ingreso") }, "← Volver a ingresar"))];
        },
        listo(id) {
          return [
            h("div", { class: "exito", html: ICONOS.check }),
            h("h2", { id: "auth-titulo", class: "centro" }, "¡Listo! Este es tu ID"),
            h("div", { class: "idgrande" }, id),
            h("p", { class: "msg centro" }, "También te lo enviamos por correo. Guárdalo: con él entras a cualquier curso y retomas tu avance desde cualquier dispositivo."),
            h("div", { class: "acciones col" },
              h("button", { class: "btn bloque", type: "button", onclick: () => fin(id) }, opc.curso ? "Ir al curso" : "Continuar"),
              h("button", { class: "btn ghost bloque", type: "button", onclick: () => copiarTexto(id) }, h("span", { html: ICONOS.copiar, class: "ic" }), "Copiar ID"))
          ];
        }
      };
      function mostrar(nombre, arg) {
        dlg.replaceChildren(cerrar(), h("div", { class: "stack" }, vistas[nombre](arg)));
        const primero = dlg.querySelector("form input, .acciones .btn");
        if (primero) primero.focus();
      }
      document.body.append(dlg);
      mostrar(opc.vista || "registro");
      dlg.showModal();
    });
  }

  // ---------- Google Analytics 4 (opcional, sin datos personales) ----------
  if (S.analytics && !DEMO) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", S.analytics, { anonymize_ip: true });
    document.head.append(h("script", { async: true, src: "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(S.analytics) }));
  }
  function evento(nombre, params) { try { if (window.gtag) window.gtag("event", nombre, params || {}); } catch (e) {} }

  // Colores institucionales desde config.js
  if (S.colores) {
    const raiz = document.documentElement.style;
    if (S.colores.primario) raiz.setProperty("--accent", S.colores.primario);
    if (S.colores.secundario) raiz.setProperty("--accent-2", S.colores.secundario);
  }

  // Enlace del correo: index.html?id=DPREDU-ALM-7F3K9 inicia sesión directo
  const idUrl = new URLSearchParams(location.search).get("id");
  if (idUrl) Sesion.guardar(formatearId(idUrl));

  window.App = { S, DEMO, api, h, Sesion, catalogo, pedirId, barra, aviso, confirmar, ICONOS, evento };
})();
