/**
 * ═══════════════════════════════════════════════════════════════
 *  Looker Custom Visualization — Bubble Chart
 *  Dashboard: Discounts Redeemed — Efficiency by Store
 * ═══════════════════════════════════════════════════════════════
 *
 *  MAPEO DE CAMPOS (en este orden desde el Explore):
 *    Dimensión [0] → Store         (etiqueta de cada burbuja)
 *    Medida    [1] → Discounts Redeemed  (eje X)
 *    Medida    [2] → AOV with Discount   (eje Y)
 *    Medida    [3] → Total Sales         (tamaño de burbuja)
 */

/* ───────────────────────────────────────────────────────────────
   UTILIDAD: carga un script externo (D3.js) solo una vez.
   Looker no incluye D3 por defecto, así que lo cargamos
   dinámicamente desde un CDN antes de renderizar el chart.
─────────────────────────────────────────────────────────────── */
const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

/* ───────────────────────────────────────────────────────────────
   REGISTRO DE LA VISUALIZACIÓN EN LOOKER
   looker.plugins.visualizations.add() es la API oficial de Looker
   para registrar custom visualizations. Recibe un objeto con:
     - options  → controles que aparecen en el panel "Style"
     - create   → se ejecuta UNA VEZ al montar el componente
     - updateAsync → se ejecuta cada vez que cambian datos o filtros
─────────────────────────────────────────────────────────────── */
looker.plugins.visualizations.add({

  /* ═══════════════════════════════════════════════════════════
     OPCIONES DEL PANEL LATERAL (pestaña "Style" en Looker)
     Cada opción se convierte en un control interactivo que
     el usuario puede cambiar sin tocar el código.
  ═══════════════════════════════════════════════════════════ */
  options: {

    /* Paleta de colores para las burbujas */
    color_scheme: {
      type: "string",
      label: "Color scheme",
      display: "select",
      values: [
        { "Ocean Blue": "ocean" },
        { "Coral Red": "coral" },
        { "Forest Green": "forest" },
        { "Purple Haze": "purple" },
      ],
      default: "ocean",
      section: "Style",
    },

    /* Color de fondo del chart — TOCA AQUÍ PARA CAMBIAR EL FONDO
       Por defecto: #0f1117 (negro casi puro)
       Otros ejemplos: "#1a1a2e" (azul oscuro), "#ffffff" (blanco), "#1e1e1e" (gris oscuro) */
    background_color: {
      type: "string",
      label: "Background color",
      display: "text",
      default: "#0f1117",
      section: "Style",
    },

    /* Muestra u oculta el nombre de la tienda encima de cada burbuja */
    show_labels: {
      type: "boolean",
      label: "Show store labels",
      default: true,
      section: "Style",
    },

    /* Muestra u oculta las líneas de cuadrante (líneas cruzadas en el centro) */
    show_quadrants: {
      type: "boolean",
      label: "Show quadrant lines",
      default: true,
      section: "Style",
    },

    /* Tamaño mínimo de burbuja en píxeles (para stores con poco volumen) */
    min_bubble_px: {
      type: "number",
      label: "Min bubble size (px)",
      default: 8,
      section: "Style",
    },

    /* Tamaño máximo de burbuja en píxeles (para stores con mucho volumen) */
    max_bubble_px: {
      type: "number",
      label: "Max bubble size (px)",
      default: 60,
      section: "Style",
    },
  },

  /* ═══════════════════════════════════════════════════════════
     CREATE — se ejecuta UNA SOLA VEZ cuando Looker monta el tile.
     Aquí inyectamos el HTML base y los estilos CSS.
     No pongas lógica de datos aquí — solo estructura visual.
  ═══════════════════════════════════════════════════════════ */
  create(element, config) {
    element.innerHTML = `
      <style>
        /* Importamos la fuente DM Sans desde Google Fonts */
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        /* Contenedor raíz — ocupa todo el tile de Looker */
        .disc-viz-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          height: 100%;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          box-sizing: border-box;
          /* El color de fondo se aplica dinámicamente en updateAsync */
        }

        /* ── Tooltip — aparece al hacer hover sobre una burbuja ── */
        .disc-tooltip {
          position: absolute;
          pointer-events: none;        /* No interfiere con el mouse */
          opacity: 0;                  /* Invisible por defecto */
          transition: opacity .18s ease;
          background: rgba(15,17,23,.95);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 200px;
          box-shadow: 0 8px 32px rgba(0,0,0,.5);
          z-index: 999;
        }
        .disc-tooltip.visible { opacity: 1; } /* Se activa con JS al hacer hover */

        .disc-tooltip-store {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,.1);
          padding-bottom: 6px;
        }
        .disc-tooltip-row {
          display: flex;
          justify-content: space-between;
          gap: 16px;
          font-size: 12px;
          color: rgba(255,255,255,.7);
          margin: 3px 0;
        }
        .disc-tooltip-row span:last-child {
          font-weight: 600;
          color: #fff;
        }

        /* ── Etiquetas de cuadrante (texto en las esquinas) ── */
        .disc-quadrant-label {
          font-size: 10px;
          font-weight: 500;
          fill: rgba(255,255,255,.2);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Ejes X e Y ── */
        .disc-axis text {
          font-size: 11px;
          fill: rgba(255,255,255,.45);
          font-family: 'DM Sans', sans-serif;
        }
        .disc-axis line,
        .disc-axis path {
          stroke: rgba(255,255,255,.1);
        }

        /* ── Líneas de la cuadrícula de fondo ── */
        .disc-grid line {
          stroke: rgba(255,255,255,.05);
          stroke-dasharray: 3 4;     /* Línea punteada */
        }
        .disc-grid path { stroke: none; }

        /* ── Títulos de los ejes ── */
        .disc-axis-title {
          font-size: 11px;
          font-weight: 500;
          fill: rgba(255,255,255,.4);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Estado vacío cuando no hay datos suficientes ── */
        .disc-no-data {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255,255,255,.4);
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
        }
      </style>

      <!-- Contenedor principal del chart -->
      <div class="disc-viz-root" id="disc-root">
        <!-- Tooltip: se posiciona dinámicamente con JS -->
        <div class="disc-tooltip" id="disc-tooltip"></div>
        <!-- LEYENDA DE TAMAÑO ELIMINADA — era las 3 bolas transparentes -->
      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════════
     UPDATE ASYNC — se ejecuta cada vez que:
       - Cambian los datos (nuevos filtros, refresh)
       - El usuario modifica una opción del panel Style
       - Se redimensiona el tile
     Aquí va TODA la lógica de renderizado del chart.
  ═══════════════════════════════════════════════════════════ */
  async updateAsync(data, element, config, queryResponse, details, done) {

    /* Carga D3.js v7 desde CDN (solo la primera vez, luego queda cacheado) */
    await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");

    const root = document.getElementById("disc-root");
    const tooltip = document.getElementById("disc-tooltip");

    /* ── Aplicar color de fondo dinámicamente ──
       PARA CAMBIAR EL FONDO: modifica el campo "Background color" en el panel Style
       o cambia el default en las options de arriba */
    root.style.background = config.background_color || "#0f1117";

    /* Limpiamos el SVG anterior para redibujar desde cero */
    d3.select(root).selectAll("svg").remove();
    root.querySelectorAll(".disc-no-data").forEach((n) => n.remove());

    /* ── Validación de campos ──
       Necesitamos exactamente 4 campos: Store, X, Y, Size
       Si faltan, mostramos un mensaje de ayuda */
    const fields = [
      ...(queryResponse.fields.dimensions || []),
      ...(queryResponse.fields.measures || []),
    ];
    if (fields.length < 4 || !data.length) {
      root.insertAdjacentHTML(
        "beforeend",
        `<div class="disc-no-data">
          Añade los campos en orden: Store · Discounts Redeemed · AOV with Discount · Total Sales
        </div>`
      );
      done();
      return;
    }

    /* ── Extracción de datos de Looker ──
       Looker devuelve cada fila como un objeto donde las claves
       son los nombres de campo y los valores tienen .value y .rendered */
    const fStore = fields[0].name;   // Dimensión: nombre de la tienda
    const fX     = fields[1].name;   // Medida: Discounts Redeemed (eje X)
    const fY     = fields[2].name;   // Medida: AOV with Discount (eje Y)
    const fSize  = fields[3].name;   // Medida: Total Sales (tamaño burbuja)

    const parsed = data.map((row) => ({
      store: row[fStore]?.value ?? "–",
      x:     +row[fX]?.value || 0,
      y:     +row[fY]?.value || 0,
      size:  +row[fSize]?.value || 0,
      rendered: {
        /* .rendered contiene el valor ya formateado por Looker (ej: "€1,234") */
        x:    row[fX]?.rendered    ?? row[fX]?.value,
        y:    row[fY]?.rendered    ?? row[fY]?.value,
        size: row[fSize]?.rendered ?? row[fSize]?.value,
      },
    }));

    /* ── Paletas de color para las burbujas ──
       Cada paleta tiene 5 colores que se asignan ciclicamente a las tiendas */
    const palettes = {
      ocean:  ["#00c6ff", "#0072ff", "#4facfe", "#43e97b", "#38f9d7"],
      coral:  ["#f7971e", "#ffd200", "#f953c6", "#b91d73", "#ee0979"],
      forest: ["#56ab2f", "#a8e063", "#11998e", "#38ef7d", "#74ebd5"],
      purple: ["#a18cd1", "#fbc2eb", "#c471ed", "#f64f59", "#c471ed"],
    };
    const scheme = config.color_scheme || "ocean";

    /* d3.scaleOrdinal asigna un color de la paleta a cada tienda */
    const colorScale = d3
      .scaleOrdinal()
      .domain(parsed.map((d) => d.store))
      .range(palettes[scheme] || palettes.ocean);

    /* ── Dimensiones del contenedor ──
       Tomamos el tamaño real del tile para que el chart sea responsive */
    const W = root.clientWidth  || 600;
    const H = root.clientHeight || 400;

    /* Márgenes internos para dejar espacio a los ejes y sus títulos */
    const margin = { top: 40, right: 24, bottom: 56, left: 64 };
    const innerW = W - margin.left - margin.right;  // Ancho del área de datos
    const innerH = H - margin.top - margin.bottom;  // Alto del área de datos

    /* ── Escalas de D3 ──
       Cada escala mapea un valor de datos a una posición en píxeles */
    const minR = config.min_bubble_px ?? 8;   // Radio mínimo de burbuja
    const maxR = config.max_bubble_px ?? 60;  // Radio máximo de burbuja

    /* Extensión (min, max) de cada variable para definir dominios */
    const xExt = d3.extent(parsed, (d) => d.x);
    const yExt = d3.extent(parsed, (d) => d.y);
    const sExt = d3.extent(parsed, (d) => d.size);

    /* Padding para que las burbujas no queden pegadas al borde */
    const xPad = (xExt[1] - xExt[0]) * 0.12 || 10;
    const yPad = (yExt[1] - yExt[0]) * 0.12 || 10;

    /* Escala lineal para X: valor de datos → posición horizontal en px */
    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, innerW]);

    /* Escala lineal para Y: valor de datos → posición vertical en px
       Nota: range va de innerH a 0 porque en SVG Y crece hacia abajo */
    const yScale = d3.scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([innerH, 0]);

    /* Escala de raíz cuadrada para el tamaño:
       Usamos sqrt porque el área del círculo es proporcional a r²,
       así que para que el ÁREA sea proporcional al valor usamos sqrt */
    const rScale = d3.scaleSqrt()
      .domain([sExt[0] || 0, sExt[1] || 1])
      .range([minR, maxR]);

    /* ── Creación del SVG principal ── */
    const svg = d3.select(root)
      .insert("svg", ".disc-tooltip")  // Insertamos antes del tooltip
      .attr("width", W)
      .attr("height", H);

    /* Grupo principal desplazado por los márgenes */
    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /* ── Cuadrícula de fondo ──
       Generamos líneas horizontales y verticales tenues */
    g.append("g")
      .attr("class", "disc-grid")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(-innerH).tickFormat(""));

    g.append("g")
      .attr("class", "disc-grid")
      .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(""));

    /* ── Líneas de cuadrante ──
       Se dibujan en el punto medio de X e Y para dividir el chart en 4 zonas.
       Solo se muestran si show_quadrants está activado en el panel Style */
    if (config.show_quadrants !== false) {
      const xMid = (xExt[0] + xExt[1]) / 2;
      const yMid = (yExt[0] + yExt[1]) / 2;

      /* Línea vertical central */
      g.append("line")
        .attr("x1", xScale(xMid)).attr("x2", xScale(xMid))
        .attr("y1", 0).attr("y2", innerH)
        .attr("stroke", "rgba(255,255,255,.12)")
        .attr("stroke-dasharray", "5,4");

      /* Línea horizontal central */
      g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", yScale(yMid)).attr("y2", yScale(yMid))
        .attr("stroke", "rgba(255,255,255,.12)")
        .attr("stroke-dasharray", "5,4");

      /* Etiquetas descriptivas de cada cuadrante */
      const qLabels = [
        { x: xScale(xMid) + 6, y: yScale(yExt[1]) + 14, text: "▲ AOV Alto · ▲ Volumen" },
        { x: 4,                 y: yScale(yExt[1]) + 14, text: "▲ AOV Alto · ▼ Volumen" },
        { x: xScale(xMid) + 6, y: innerH - 6,            text: "▼ AOV Bajo · ▲ Volumen" },
        { x: 4,                 y: innerH - 6,            text: "▼ AOV Bajo · ▼ Volumen" },
      ];
      qLabels.forEach(({ x, y, text }) => {
        g.append("text").attr("class", "disc-quadrant-label")
          .attr("x", x).attr("y", y).text(text);
      });
    }

    /* ── Ejes ──
       d3.axisBottom y d3.axisLeft generan los ejes con ticks y etiquetas */
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(","));
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `€${d3.format(",.0f")(d)}`);

    g.append("g").attr("class", "disc-axis")
      .attr("transform", `translate(0,${innerH})`).call(xAxis);

    g.append("g").attr("class", "disc-axis").call(yAxis);

    /* ── Títulos de los ejes ── */
    g.append("text").attr("class", "disc-axis-title")
      .attr("x", innerW / 2).attr("y", innerH + 44)
      .attr("text-anchor", "middle")
      .text("Discounts Redeemed");

    g.append("text").attr("class", "disc-axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2).attr("y", -50)
      .attr("text-anchor", "middle")
      .text("AOV with Discount (€)");

    /* ── Burbujas ──
       Usamos un grupo separado para poder aplicar eventos de mouse */
    const bubbleGroup = g.append("g").attr("class", "disc-bubbles");

    /* Dibujamos un círculo por cada fila de datos */
    bubbleGroup.selectAll("circle")
      .data(parsed)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))      // Posición X
      .attr("cy", (d) => yScale(d.y))      // Posición Y
      .attr("r", 0)                         // Empieza en 0 para animar la entrada
      .attr("fill", (d) => colorScale(d.store))
      .attr("fill-opacity", 0.72)
      .attr("stroke", (d) => colorScale(d.store))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.9)
      .style("cursor", "pointer")
      /* Animación de entrada: las burbujas "crecen" al cargar */
      .transition()
      .duration(600)
      .delay((_, i) => i * 40)             // Delay escalonado por burbuja
      .ease(d3.easeBounceOut)
      .attr("r", (d) => rScale(d.size));   // Radio final basado en Total Sales

    /* ── Interactividad: hover sobre burbujas ── */
    bubbleGroup.selectAll("circle")
      .on("mouseenter", function (event, d) {
        /* Al entrar: agrandamos ligeramente la burbuja y mostramos el tooltip */
        d3.select(this).raise()             // Traemos al frente para que no quede detrás de otras
          .transition().duration(120)
          .attr("fill-opacity", 1)
          .attr("stroke-width", 2.5);

        /* Construimos el contenido del tooltip con los datos de la tienda */
        tooltip.innerHTML = `
          <div class="disc-tooltip-store">${d.store}</div>
          <div class="disc-tooltip-row">
            <span>Discounts Redeemed</span>
            <span>${d3.format(",")(d.x)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>AOV with Discount</span>
            <span>€${d3.format(",.2f")(d.y)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>Total Sales</span>
            <span>${d.rendered.size}</span>
          </div>
        `;
        tooltip.classList.add("visible");
      })
      .on("mousemove", function (event) {
        /* Seguimos el cursor para posicionar el tooltip cerca del mouse */
        const rect = root.getBoundingClientRect();
        let left = event.clientX - rect.left + 14;
        let top  = event.clientY - rect.top  - 10;
        /* Evitamos que el tooltip se salga por la derecha */
        if (left + 220 > W) left -= 230;
        tooltip.style.left = left + "px";
        tooltip.style.top  = top  + "px";
      })
      .on("mouseleave", function () {
        /* Al salir: volvemos la burbuja a su estado normal y ocultamos el tooltip */
        d3.select(this).transition().duration(120)
          .attr("fill-opacity", 0.72)
          .attr("stroke-width", 1.5);
        tooltip.classList.remove("visible");
      });

    /* ── Etiquetas de tienda ──
       Texto encima de cada burbuja con el nombre de la tienda.
       Se puede ocultar con la opción "Show store labels" del panel Style */
    if (config.show_labels !== false) {
      bubbleGroup.selectAll(".disc-store-label")
        .data(parsed)
        .join("text")
        .attr("class", "disc-store-label")
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y) - rScale(d.size) - 5)  // Encima de la burbuja
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "'DM Sans', sans-serif")
        .attr("font-weight", "500")
        .attr("fill", "rgba(255,255,255,.75)")
        .text((d) => d.store);
    }

    /* ── Fin del renderizado ──
       done() le indica a Looker que la visualización terminó de cargar.
       Sin esto, Looker puede mostrar un spinner infinito. */
    done();
  },
});
