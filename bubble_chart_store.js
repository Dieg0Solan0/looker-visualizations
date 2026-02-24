/**
 * ═══════════════════════════════════════════════════════════════
 *  Looker Custom Visualization — Bubble Chart
 *  Dashboard: Discounts Redeemed — Efficiency by Store
 * ═══════════════════════════════════════════════════════════════
 *
 *  MAPEO DE CAMPOS (en este orden desde el Explore):
 *    Dimensión [0] → Store               (etiqueta de cada burbuja)
 *    Medida    [1] → Discounts Redeemed  (eje X)
 *    Medida    [2] → AOV with Discount   (eje Y)
 *    Medida    [3] → Total Sales         (tamaño de burbuja)
 *
 *  INTERACTIVIDAD:
 *    - Scroll / pinch → zoom
 *    - Click y arrastrar → pan (mover el chart)
 *    - Doble click → reset zoom
 *    - Hover → tooltip con datos
 */

/* ───────────────────────────────────────────────────────────────
   UTILIDAD: carga D3.js desde CDN solo una vez
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
   UTILIDAD: detecta si un color hex es oscuro o claro
   Devuelve true si oscuro → usaremos texto blanco
   Devuelve false si claro → usaremos texto oscuro
─────────────────────────────────────────────────────────────── */
function isDarkColor(hex) {
  const c = (hex || "").replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
}

looker.plugins.visualizations.add({

  /* ═══════════════════════════════════════════════════════════
     OPCIONES DEL PANEL LATERAL (pestaña "Style" en Looker)
  ═══════════════════════════════════════════════════════════ */
  options: {
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

    /* Color de fondo en hex. Los ejes y texto se adaptan solos al fondo. */
    background_color: {
      type: "string",
      label: "Background color (hex)",
      display: "text",
      default: "#ffffff",
      section: "Style",
    },

    show_labels: {
      type: "boolean",
      label: "Show store labels",
      default: true,
      section: "Style",
    },

    show_quadrants: {
      type: "boolean",
      label: "Show quadrant lines",
      default: true,
      section: "Style",
    },

    min_bubble_px: {
      type: "number",
      label: "Min bubble size (px)",
      default: 8,
      section: "Style",
    },

    max_bubble_px: {
      type: "number",
      label: "Max bubble size (px)",
      default: 60,
      section: "Style",
    },
  },

  /* ═══════════════════════════════════════════════════════════
     CREATE — se ejecuta UNA SOLA VEZ al montar el tile
  ═══════════════════════════════════════════════════════════ */
  create(element, config) {
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .disc-viz-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          height: 100%;
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* Tooltip — position:fixed para que nunca quede cortado */
        .disc-tooltip {
          position: fixed;
          pointer-events: none;
          opacity: 0;
          transition: opacity .15s ease;
          background: rgba(20,20,30,.96);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 210px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
          z-index: 99999;
        }
        .disc-tooltip.visible { opacity: 1; }
        .disc-tooltip-store {
          font-size: 13px;
          font-weight: 600;
          color: #fff;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,.12);
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
        .disc-tooltip-row span:last-child { font-weight: 600; color: #fff; }

        /* Hint de zoom en la parte inferior */
        .disc-zoom-hint {
          position: absolute;
          bottom: 6px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          opacity: 0.3;
          pointer-events: none;
          font-family: 'DM Sans', sans-serif;
          white-space: nowrap;
        }

        .disc-no-data {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
        }

        /* Cursores para indicar que se puede arrastrar */
        .disc-viz-root svg { cursor: grab; }
        .disc-viz-root svg:active { cursor: grabbing; }
      </style>

      <div class="disc-viz-root" id="disc-root">
        <div class="disc-tooltip" id="disc-tooltip"></div>
      </div>
    `;
  },

  /* ═══════════════════════════════════════════════════════════
     UPDATE ASYNC — se ejecuta en cada cambio de datos u opciones
  ═══════════════════════════════════════════════════════════ */
  async updateAsync(data, element, config, queryResponse, details, done) {

    await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");

    const root    = document.getElementById("disc-root");
    const tooltip = document.getElementById("disc-tooltip");

    /* ── Colores adaptativos según el fondo ──
       Si el fondo es oscuro usamos texto blanco, si es claro usamos texto oscuro */
    const bgColor       = config.background_color || "#ffffff";
    const darkBg        = isDarkColor(bgColor);
    const textColor     = darkBg ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.65)";
    const textColorDim  = darkBg ? "rgba(255,255,255,.25)" : "rgba(0,0,0,.25)";
    const axisColor     = darkBg ? "rgba(255,255,255,.2)"  : "rgba(0,0,0,.2)";
    const gridColor     = darkBg ? "rgba(255,255,255,.06)" : "rgba(0,0,0,.05)";
    const quadrantColor = darkBg ? "rgba(255,255,255,.15)" : "rgba(0,0,0,.1)";

    root.style.background = bgColor;

    /* Limpiamos el render anterior */
    d3.select(root).selectAll("svg").remove();
    root.querySelectorAll(".disc-no-data, .disc-zoom-hint").forEach((n) => n.remove());

    /* ── Validación ── */
    const fields = [
      ...(queryResponse.fields.dimensions || []),
      ...(queryResponse.fields.measures   || []),
    ];
    if (fields.length < 4 || !data.length) {
      root.insertAdjacentHTML("beforeend", `
        <div class="disc-no-data" style="color:${textColor}">
          Añade: Store · Discounts Redeemed · AOV with Discount · Total Sales
        </div>`);
      done();
      return;
    }

    /* ── Parseo de datos ── */
    const fStore = fields[0].name;
    const fX     = fields[1].name;
    const fY     = fields[2].name;
    const fSize  = fields[3].name;

    const parsed = data.map((row) => ({
      store: row[fStore]?.value ?? "–",
      x:     +row[fX]?.value    || 0,
      y:     +row[fY]?.value    || 0,
      size:  +row[fSize]?.value || 0,
      rendered: {
        x:    row[fX]?.rendered    ?? row[fX]?.value,
        y:    row[fY]?.rendered    ?? row[fY]?.value,
        size: row[fSize]?.rendered ?? row[fSize]?.value,
      },
    }));

    /* ── Paletas ── */
    const palettes = {
      ocean:  ["#0072ff", "#00c6ff", "#0ea5e9", "#06b6d4", "#38bdf8"],
      coral:  ["#f7971e", "#f953c6", "#ee0979", "#b91d73", "#ffd200"],
      forest: ["#11998e", "#56ab2f", "#38ef7d", "#74ebd5", "#a8e063"],
      purple: ["#7c3aed", "#a78bfa", "#c471ed", "#f64f59", "#818cf8"],
    };
    const colorScale = d3.scaleOrdinal()
      .domain(parsed.map((d) => d.store))
      .range(palettes[config.color_scheme] || palettes.ocean);

    /* ── Dimensiones y escalas base ── */
    const W      = root.clientWidth  || 600;
    const H      = root.clientHeight || 400;
    const margin = { top: 40, right: 30, bottom: 60, left: 70 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    const minR = config.min_bubble_px ?? 8;
    const maxR = config.max_bubble_px ?? 60;

    const xExt = d3.extent(parsed, (d) => d.x);
    const yExt = d3.extent(parsed, (d) => d.y);
    const sExt = d3.extent(parsed, (d) => d.size);
    const xPad = (xExt[1] - xExt[0]) * 0.15 || 10;
    const yPad = (yExt[1] - yExt[0]) * 0.15 || 10;

    /* Escalas originales (sin zoom) */
    const xScale0 = d3.scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, innerW]);
    const yScale0 = d3.scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([innerH, 0]);
    const rScale = d3.scaleSqrt()
      .domain([sExt[0] || 0, sExt[1] || 1])
      .range([minR, maxR]);

    /* ── SVG y estructura ── */
    const svg = d3.select(root)
      .insert("svg", ".disc-tooltip")
      .attr("width", W).attr("height", H);

    /* Clip path: las burbujas no se dibujan fuera del área al hacer zoom/pan */
    svg.append("defs").append("clipPath").attr("id", "disc-clip")
      .append("rect").attr("width", innerW).attr("height", innerH);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    /* Grupos para cada capa (el orden importa para el z-index en SVG) */
    const gGridX   = g.append("g").attr("transform", `translate(0,${innerH})`);
    const gGridY   = g.append("g");
    const gAxisX   = g.append("g").attr("transform", `translate(0,${innerH})`);
    const gAxisY   = g.append("g");
    const gContent = g.append("g").attr("clip-path", "url(#disc-clip)");

    /* ── Función principal de render ──
       Recibe las escalas actuales (originales o ajustadas por zoom)
       y redibuja grid, ejes, líneas de cuadrante, burbujas y labels */
    function render(xS, yS) {

      /* Grid horizontal y vertical */
      gGridX.call(d3.axisBottom(xS).tickSize(-innerH).tickFormat(""))
        .call((ax) => ax.select(".domain").remove())
        .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3 4");

      gGridY.call(d3.axisLeft(yS).tickSize(-innerW).tickFormat(""))
        .call((ax) => ax.select(".domain").remove())
        .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3 4");

      /* Eje X */
      gAxisX.call(d3.axisBottom(xS).ticks(6).tickFormat(d3.format(",")));
      gAxisX.selectAll("text").attr("fill", textColor).attr("font-size", "11px").attr("font-family", "'DM Sans',sans-serif");
      gAxisX.selectAll(".domain, line").attr("stroke", axisColor);

      /* Eje Y */
      gAxisY.call(d3.axisLeft(yS).ticks(5).tickFormat((d) => `€${d3.format(",.0f")(d)}`));
      gAxisY.selectAll("text").attr("fill", textColor).attr("font-size", "11px").attr("font-family", "'DM Sans',sans-serif");
      gAxisY.selectAll(".domain, line").attr("stroke", axisColor);

      /* Líneas de cuadrante */
      gContent.selectAll(".disc-q-line, .disc-q-label").remove();
      if (config.show_quadrants !== false) {
        const xMid = (xExt[0] + xExt[1]) / 2;
        const yMid = (yExt[0] + yExt[1]) / 2;

        [
          { x1: xS(xMid), x2: xS(xMid), y1: 0,      y2: innerH },
          { x1: 0,        x2: innerW,    y1: yS(yMid), y2: yS(yMid) },
        ].forEach(({ x1, x2, y1, y2 }) =>
          gContent.append("line").attr("class", "disc-q-line")
            .attr("x1", x1).attr("x2", x2).attr("y1", y1).attr("y2", y2)
            .attr("stroke", quadrantColor).attr("stroke-dasharray", "5,4")
        );

        [
          { x: xS(xMid) + 6, y: 14,         t: "▲ AOV · ▲ Volumen" },
          { x: 4,             y: 14,          t: "▲ AOV · ▼ Volumen" },
          { x: xS(xMid) + 6, y: innerH - 6, t: "▼ AOV · ▲ Volumen" },
          { x: 4,             y: innerH - 6, t: "▼ AOV · ▼ Volumen" },
        ].forEach(({ x, y, t }) =>
          gContent.append("text").attr("class", "disc-q-label")
            .attr("x", x).attr("y", y).text(t)
            .attr("font-size", "10px").attr("font-family", "'DM Sans',sans-serif")
            .attr("fill", textColorDim)
        );
      }

      /* Burbujas — join para actualizar posición en zoom sin reanimar */
      gContent.selectAll("circle.disc-bubble")
        .data(parsed, (d) => d.store)
        .join(
          (enter) => enter.append("circle").attr("class", "disc-bubble")
            .attr("r", 0)
            .call((e) => e.transition().duration(600).delay((_, i) => i * 50)
              .ease(d3.easeBounceOut).attr("r", (d) => rScale(d.size)))
        )
        .attr("cx", (d) => xS(d.x))
        .attr("cy", (d) => yS(d.y))
        .attr("r", (d) => rScale(d.size))
        .attr("fill", (d) => colorScale(d.store))
        .attr("fill-opacity", 0.75)
        .attr("stroke", (d) => colorScale(d.store))
        .attr("stroke-width", 1.5)
        .style("cursor", "pointer");

      /* Labels de tienda */
      gContent.selectAll("text.disc-store-label").remove();
      if (config.show_labels !== false) {
        gContent.selectAll("text.disc-store-label")
          .data(parsed, (d) => d.store)
          .join("text").attr("class", "disc-store-label")
          .attr("x", (d) => xS(d.x))
          .attr("y", (d) => yS(d.y) - rScale(d.size) - 5)
          .attr("text-anchor", "middle")
          .attr("font-size", "10px").attr("font-weight", "500")
          .attr("font-family", "'DM Sans',sans-serif")
          .attr("fill", textColor)
          .text((d) => d.store);
      }
    }

    /* Primer render */
    render(xScale0, yScale0);

    /* ── Títulos de ejes (no se mueven con zoom) ── */
    g.append("text")
      .attr("x", innerW / 2).attr("y", innerH + 50).attr("text-anchor", "middle")
      .attr("font-size", "11px").attr("font-weight", "500")
      .attr("font-family", "'DM Sans',sans-serif").attr("fill", textColor)
      .text("Discounts Redeemed");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2).attr("y", -56).attr("text-anchor", "middle")
      .attr("font-size", "11px").attr("font-weight", "500")
      .attr("font-family", "'DM Sans',sans-serif").attr("fill", textColor)
      .text("AOV with Discount (€)");

    /* ── ZOOM Y PAN ──
       Scroll → zoom in/out
       Drag   → pan (mover el área)
       Doble click → reset a la vista original */
    const zoom = d3.zoom()
      .scaleExtent([0.4, 12])
      .on("zoom", (event) => {
        const t  = event.transform;
        const xS = t.rescaleX(xScale0);
        const yS = t.rescaleY(yScale0);
        render(xS, yS);
      });

    svg.call(zoom)
      .on("dblclick.zoom", () =>
        svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
      );

    /* ── TOOLTIP inteligente (position:fixed + detección de bordes) ──
       Usamos coordenadas de viewport (clientX/Y) para que el tooltip
       nunca quede cortado, incluso en burbujas en la esquina inferior */
    gContent.selectAll("circle.disc-bubble")
      .on("mouseenter", function (event, d) {
        d3.select(this).raise()
          .transition().duration(100)
          .attr("fill-opacity", 1).attr("stroke-width", 2.5);

        tooltip.innerHTML = `
          <div class="disc-tooltip-store">${d.store}</div>
          <div class="disc-tooltip-row">
            <span>Discounts Redeemed</span><span>${d3.format(",")(d.x)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>AOV with Discount</span><span>€${d3.format(",.2f")(d.y)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>Total Sales</span><span>${d.rendered.size}</span>
          </div>
        `;
        tooltip.classList.add("visible");
      })
      .on("mousemove", function (event) {
        const TW = 225, TH = 115;
        let left = event.clientX + 16;
        let top  = event.clientY - 12;
        if (left + TW > window.innerWidth)  left = event.clientX - TW - 12;
        if (top  + TH > window.innerHeight) top  = event.clientY - TH - 12;
        tooltip.style.left = left + "px";
        tooltip.style.top  = top  + "px";
      })
      .on("mouseleave", function () {
        d3.select(this).transition().duration(100)
          .attr("fill-opacity", 0.75).attr("stroke-width", 1.5);
        tooltip.classList.remove("visible");
      });

    /* Hint de zoom */
    root.insertAdjacentHTML("beforeend", `
      <div class="disc-zoom-hint" style="color:${textColor}">
        Scroll → zoom &nbsp;·&nbsp; Arrastrar → mover &nbsp;·&nbsp; Doble click → reset
      </div>`);

    done();
  },
});
