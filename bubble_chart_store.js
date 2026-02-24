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
 */

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });

function isDarkColor(hex) {
  const c = (hex || "").replace("#", "");
  if (c.length < 6) return true;
  const r = parseInt(c.slice(0,2),16), g = parseInt(c.slice(2,4),16), b = parseInt(c.slice(4,6),16);
  return (0.299*r + 0.587*g + 0.114*b) / 255 < 0.5;
}

function getYFormatter(format) {
  switch(format) {
    case "percent": return (d) => `${d3.format(",.1f")(d)}%`;
    case "number":  return (d) => d3.format(",.0f")(d);
    default:        return (d) => `€${d3.format(",.0f")(d)}`;
  }
}

looker.plugins.visualizations.add({

  options: {
    color_scheme: {
      type: "string", label: "Color scheme", display: "select",
      values: [{"Ocean Blue":"ocean"},{"Coral Red":"coral"},{"Forest Green":"forest"},{"Purple Haze":"purple"}],
      default: "ocean", section: "Style", order: 1,
    },
    background_color: {
      type: "string", label: "Background color (hex)",
      display: "text", default: "#ffffff", section: "Style", order: 2,
    },
    show_labels: {
      type: "boolean", label: "Show store labels",
      default: true, section: "Style", order: 3,
    },
    show_quadrants: {
      type: "boolean", label: "Show quadrant lines",
      default: true, section: "Style", order: 4,
    },
    min_bubble_px: {
      type: "number", label: "Min bubble size (px)",
      default: 8, section: "Style", order: 5,
    },
    max_bubble_px: {
      type: "number", label: "Max bubble size (px)",
      default: 50, section: "Style", order: 6,
    },
    x_axis_title: {
      type: "string", label: "Título eje X", display: "text",
      default: "Discounts Redeemed", section: "Eje X", order: 1,
    },
    x_axis_min: {
      type: "number", label: "Mínimo eje X (vacío = automático)",
      display: "text", default: "", section: "Eje X", order: 2,
    },
    x_axis_max: {
      type: "number", label: "Máximo eje X (vacío = automático)",
      display: "text", default: "", section: "Eje X", order: 3,
    },
    x_log_scale: {
      type: "boolean", label: "Escala logarítmica (eje X)",
      default: false, section: "Eje X", order: 4,
    },
    y_axis_title: {
      type: "string", label: "Título eje Y", display: "text",
      default: "AOV with Discount", section: "Eje Y", order: 1,
    },
    y_axis_min: {
      type: "number", label: "Mínimo eje Y (vacío = automático)",
      display: "text", default: "", section: "Eje Y", order: 2,
    },
    y_axis_max: {
      type: "number", label: "Máximo eje Y (vacío = automático)",
      display: "text", default: "", section: "Eje Y", order: 3,
    },
    y_axis_format: {
      type: "string", label: "Formato eje Y", display: "select",
      values: [{"€ Euro":"euro"},{"% Porcentaje":"percent"},{"Número":"number"}],
      default: "euro", section: "Eje Y", order: 4,
    },
  },

  create(element, config) {
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        .disc-viz-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%; height: 100%;
          position: relative;
          box-sizing: border-box;
        }
        .disc-tooltip {
          position: fixed;
          pointer-events: none;
          opacity: 0;
          transition: opacity .15s ease;
          background: rgba(20,20,30,.96);
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 215px;
          box-shadow: 0 8px 32px rgba(0,0,0,.4);
          z-index: 99999;
        }
        .disc-tooltip.visible { opacity: 1; }
        .disc-tooltip-store {
          font-size: 13px; font-weight: 600; color: #fff;
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255,255,255,.12);
          padding-bottom: 6px;
        }
        .disc-tooltip-row {
          display: flex; justify-content: space-between; gap: 16px;
          font-size: 12px; color: rgba(255,255,255,.7); margin: 3px 0;
        }
        .disc-tooltip-row span:last-child { font-weight: 600; color: #fff; }
        .disc-zoom-hint {
          position: absolute; bottom: 4px; left: 50%;
          transform: translateX(-50%);
          font-size: 10px; opacity: 0.28;
          pointer-events: none; white-space: nowrap;
          font-family: 'DM Sans', sans-serif;
        }
        .disc-no-data {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
        }
        .disc-viz-root svg { cursor: grab; display: block; }
        .disc-viz-root svg:active { cursor: grabbing; }
      </style>
      <div class="disc-viz-root" id="disc-root">
        <div class="disc-tooltip" id="disc-tooltip"></div>
      </div>
    `;
  },

  async updateAsync(data, element, config, queryResponse, details, done) {

    await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");

    const root    = document.getElementById("disc-root");
    const tooltip = document.getElementById("disc-tooltip");

    /* ── Colores adaptativos según el fondo ── */
    const bgColor       = config.background_color || "#ffffff";
    const darkBg        = isDarkColor(bgColor);
    const textColor     = darkBg ? "rgba(255,255,255,.85)" : "rgba(0,0,0,.75)";
    const textColorDim  = darkBg ? "rgba(255,255,255,.30)" : "rgba(0,0,0,.30)";
    const axisColor     = darkBg ? "rgba(255,255,255,.30)" : "rgba(0,0,0,.25)";
    const gridColor     = darkBg ? "rgba(255,255,255,.07)" : "rgba(0,0,0,.06)";
    const quadrantColor = darkBg ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.12)";

    root.style.background = bgColor;

    d3.select(root).selectAll("svg").remove();
    root.querySelectorAll(".disc-no-data, .disc-zoom-hint").forEach((n) => n.remove());

    /* ── Validación ── */
    const fields = [
      ...(queryResponse.fields.dimensions || []),
      ...(queryResponse.fields.measures   || []),
    ];
    if (fields.length < 4 || !data.length) {
      root.insertAdjacentHTML("beforeend",
        `<div class="disc-no-data" style="color:${textColor}">
          Añade: Store · Discounts Redeemed · AOV with Discount · Total Sales
        </div>`);
      done(); return;
    }

    /* ── Parseo ── */
    const fStore = fields[0].name, fX = fields[1].name,
          fY = fields[2].name,     fSize = fields[3].name;

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

    const yFmt = getYFormatter(config.y_axis_format || "euro");

    /* ── Paletas ── */
    const palettes = {
      ocean:  ["#0072ff","#00c6ff","#0ea5e9","#06b6d4","#38bdf8"],
      coral:  ["#f7971e","#f953c6","#ee0979","#b91d73","#ffd200"],
      forest: ["#11998e","#56ab2f","#38ef7d","#74ebd5","#a8e063"],
      purple: ["#7c3aed","#a78bfa","#c471ed","#f64f59","#818cf8"],
    };
    const colorScale = d3.scaleOrdinal()
      .domain(parsed.map((d) => d.store))
      .range(palettes[config.color_scheme] || palettes.ocean);

    /* ── Dimensiones ──
       Márgenes generosos para que los títulos y ticks sean siempre visibles
       tanto en el Explore como en el dashboard */
    const W      = root.clientWidth  || 600;
    const H      = root.clientHeight || 400;

    /* FIX: márgenes más grandes para que los títulos no queden cortados */
    const margin = {
      top:    20,   /* espacio para bubbles que sobresalen arriba */
      right:  20,   /* espacio para bubbles que sobresalen a la derecha */
      bottom: 68,   /* espacio para eje X + su título */
      left:   80,   /* espacio para eje Y + su título */
    };

    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top  - margin.bottom;

    const minR = config.min_bubble_px ?? 8;
    /* FIX: limitamos el radio máximo al 10% de la dimensión menor
       para que las burbujas nunca sobresalgan del área de datos */
    const maxRLimit = Math.min(innerW, innerH) * 0.18;
    const maxR = Math.min(config.max_bubble_px ?? 50, maxRLimit);

    /* ── Dominios con padding extra = maxR en unidades de datos ──
       Esto garantiza que las burbujas más grandes no se corten en los bordes */
    const xExt = d3.extent(parsed, (d) => d.x);
    const yExt = d3.extent(parsed, (d) => d.y);
    const sExt = d3.extent(parsed, (d) => d.size);

    /* Padding proporcional al rango de datos */
    const xRange = xExt[1] - xExt[0] || 10;
    const yRange = yExt[1] - yExt[0] || 10;
    const xPad = xRange * 0.20;
    const yPad = yRange * 0.20;

    const xMin = (config.x_axis_min !== "" && config.x_axis_min != null)
      ? +config.x_axis_min : Math.max(0, xExt[0] - xPad);
    const xMax = (config.x_axis_max !== "" && config.x_axis_max != null)
      ? +config.x_axis_max : xExt[1] + xPad;
    const yMin = (config.y_axis_min !== "" && config.y_axis_min != null)
      ? +config.y_axis_min : Math.max(0, yExt[0] - yPad);
    const yMax = (config.y_axis_max !== "" && config.y_axis_max != null)
      ? +config.y_axis_max : yExt[1] + yPad;

    /* Escala X: lineal o logarítmica */
    const xScale0 = config.x_log_scale
      ? d3.scaleLog().domain([Math.max(1, xMin), xMax]).range([0, innerW])
      : d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]);

    const yScale0 = d3.scaleLinear().domain([yMin, yMax]).range([innerH, 0]);

    const rScale = d3.scaleSqrt()
      .domain([sExt[0] || 0, sExt[1] || 1])
      .range([minR, maxR]);

    /* Títulos de ejes */
    const xTitle = (config.x_axis_title && config.x_axis_title.trim())
      ? config.x_axis_title.trim() : "Discounts Redeemed";
    const yTitle = (config.y_axis_title && config.y_axis_title.trim())
      ? config.y_axis_title.trim() : "AOV with Discount";

    /* ── SVG ── */
    const svg = d3.select(root)
      .insert("svg", ".disc-tooltip")
      .attr("width", W).attr("height", H);

    /* Clip path: restringe el dibujo de burbujas al área de datos */
    svg.append("defs").append("clipPath").attr("id", "disc-clip")
      .append("rect")
      .attr("x", -maxR)           /* FIX: extendemos el clip por el radio máximo */
      .attr("y", -maxR)           /* para que las burbujas en los bordes no se corten */
      .attr("width",  innerW + maxR * 2)
      .attr("height", innerH + maxR * 2);

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /* Capas en orden (SVG dibuja de abajo a arriba) */
    const gGridX   = g.append("g").attr("transform", `translate(0,${innerH})`);
    const gGridY   = g.append("g");
    const gAxisX   = g.append("g").attr("transform", `translate(0,${innerH})`);
    const gAxisY   = g.append("g");

    /* Títulos de ejes — estáticos, siempre visibles */
    /* Título eje X — debajo del eje, con suficiente margen */
    g.append("text")
      .attr("x", innerW / 2)
      .attr("y", innerH + 52)          /* FIX: 52px debajo del área = siempre visible */
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("font-family", "'DM Sans', sans-serif")
      .attr("fill", textColor)
      .text(xTitle);

    /* Título eje Y — rotado, a la izquierda del eje */
    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -64)                  /* FIX: 64px a la izquierda = siempre visible */
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("font-weight", "600")
      .attr("font-family", "'DM Sans', sans-serif")
      .attr("fill", textColor)
      .text(yTitle);

    /* Badge escala log */
    if (config.x_log_scale) {
      g.append("text")
        .attr("x", innerW).attr("y", -6)
        .attr("text-anchor", "end")
        .attr("font-size", "9px").attr("fill", textColorDim)
        .attr("font-family", "'DM Sans',sans-serif")
        .text("escala logarítmica (X)");
    }

    /* Contenido con clip */
    const gContent = g.append("g").attr("clip-path", "url(#disc-clip)");

    /* ── Función de render (se llama al inicio y en cada zoom) ── */
    function render(xS, yS) {

      /* Grid */
      gGridX.call(d3.axisBottom(xS).tickSize(-innerH).tickFormat(""))
        .call((a) => a.select(".domain").remove())
        .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3 4");

      gGridY.call(d3.axisLeft(yS).tickSize(-innerW).tickFormat(""))
        .call((a) => a.select(".domain").remove())
        .selectAll("line").attr("stroke", gridColor).attr("stroke-dasharray", "3 4");

      /* Eje X */
      const xAxisGen = config.x_log_scale
        ? d3.axisBottom(xS).ticks(5, d3.format(","))
        : d3.axisBottom(xS).ticks(6).tickFormat(d3.format(","));

      gAxisX.call(xAxisGen);
      gAxisX.selectAll("text")
        .attr("fill", textColor).attr("font-size", "11px")
        .attr("font-family", "'DM Sans',sans-serif");
      gAxisX.selectAll(".domain").attr("stroke", axisColor);
      gAxisX.selectAll(".tick line").attr("stroke", axisColor);

      /* Eje Y */
      gAxisY.call(d3.axisLeft(yS).ticks(5).tickFormat(yFmt));
      gAxisY.selectAll("text")
        .attr("fill", textColor).attr("font-size", "11px")
        .attr("font-family", "'DM Sans',sans-serif");
      gAxisY.selectAll(".domain").attr("stroke", axisColor);
      gAxisY.selectAll(".tick line").attr("stroke", axisColor);

      /* Líneas de cuadrante */
      gContent.selectAll(".disc-q-line, .disc-q-label").remove();
      if (config.show_quadrants !== false) {
        const xMid = config.x_log_scale
          ? Math.sqrt(xMin * xMax) : (xMin + xMax) / 2;
        const yMid = (yMin + yMax) / 2;

        gContent.append("line").attr("class","disc-q-line")
          .attr("x1",xS(xMid)).attr("x2",xS(xMid)).attr("y1",0).attr("y2",innerH)
          .attr("stroke",quadrantColor).attr("stroke-dasharray","5,4");
        gContent.append("line").attr("class","disc-q-line")
          .attr("x1",0).attr("x2",innerW).attr("y1",yS(yMid)).attr("y2",yS(yMid))
          .attr("stroke",quadrantColor).attr("stroke-dasharray","5,4");

        [
          {x: xS(xMid)+6, y: 14,         t:"▲ AOV · ▲ Volumen"},
          {x: 4,           y: 14,          t:"▲ AOV · ▼ Volumen"},
          {x: xS(xMid)+6, y: innerH - 6, t:"▼ AOV · ▲ Volumen"},
          {x: 4,           y: innerH - 6, t:"▼ AOV · ▼ Volumen"},
        ].forEach(({x,y,t}) =>
          gContent.append("text").attr("class","disc-q-label")
            .attr("x",x).attr("y",y).text(t)
            .attr("font-size","10px").attr("fill",textColorDim)
            .attr("font-family","'DM Sans',sans-serif")
        );
      }

      /* Burbujas */
      gContent.selectAll("circle.disc-bubble")
        .data(parsed, (d) => d.store)
        .join(
          (enter) => enter.append("circle").attr("class","disc-bubble")
            .attr("r", 0)
            .call((e) => e.transition().duration(600).delay((_,i) => i*50)
              .ease(d3.easeBounceOut).attr("r",(d) => rScale(d.size)))
        )
        .attr("cx",(d) => xS(d.x))
        .attr("cy",(d) => yS(d.y))
        .attr("r", (d) => rScale(d.size))
        .attr("fill",(d) => colorScale(d.store))
        .attr("fill-opacity", 0.78)
        .attr("stroke",(d) => colorScale(d.store))
        .attr("stroke-width", 1.5)
        .style("cursor","pointer");

      /* Labels de tienda */
      gContent.selectAll("text.disc-store-label").remove();
      if (config.show_labels !== false) {
        gContent.selectAll("text.disc-store-label")
          .data(parsed, (d) => d.store)
          .join("text").attr("class","disc-store-label")
          .attr("x",(d) => xS(d.x))
          .attr("y",(d) => yS(d.y) - rScale(d.size) - 5)
          .attr("text-anchor","middle")
          .attr("font-size","10px").attr("font-weight","500")
          .attr("font-family","'DM Sans',sans-serif")
          .attr("fill",textColor)
          .text((d) => d.store);
      }
    }

    render(xScale0, yScale0);

    /* ── Zoom y Pan ── */
    const zoom = d3.zoom()
      .scaleExtent([0.4, 12])
      .on("zoom", (event) => {
        const t = event.transform;
        render(t.rescaleX(xScale0), t.rescaleY(yScale0));
      });

    svg.call(zoom)
      .on("dblclick.zoom", () =>
        svg.transition().duration(400).call(zoom.transform, d3.zoomIdentity)
      );

    /* ── Tooltip inteligente ── */
    gContent.selectAll("circle.disc-bubble")
      .on("mouseenter", function(event, d) {
        d3.select(this).raise()
          .transition().duration(100)
          .attr("fill-opacity",1).attr("stroke-width",2.5);
        tooltip.innerHTML = `
          <div class="disc-tooltip-store">${d.store}</div>
          <div class="disc-tooltip-row">
            <span>${xTitle}</span><span>${d3.format(",")(d.x)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>${yTitle}</span><span>${yFmt(d.y)}</span>
          </div>
          <div class="disc-tooltip-row">
            <span>Total Sales</span><span>${d.rendered.size}</span>
          </div>`;
        tooltip.classList.add("visible");
      })
      .on("mousemove", function(event) {
        const TW=225, TH=115;
        let left = event.clientX + 16;
        let top  = event.clientY - 12;
        if (left + TW > window.innerWidth)  left = event.clientX - TW - 12;
        if (top  + TH > window.innerHeight) top  = event.clientY - TH - 12;
        tooltip.style.left = left + "px";
        tooltip.style.top  = top  + "px";
      })
      .on("mouseleave", function() {
        d3.select(this).transition().duration(100)
          .attr("fill-opacity",0.78).attr("stroke-width",1.5);
        tooltip.classList.remove("visible");
      });

    /* Hint de zoom */
    root.insertAdjacentHTML("beforeend",
      `<div class="disc-zoom-hint" style="color:${textColor}">
        Scroll → zoom &nbsp;·&nbsp; Arrastrar → mover &nbsp;·&nbsp; Doble click → reset
      </div>`);

    done();
  },
});
