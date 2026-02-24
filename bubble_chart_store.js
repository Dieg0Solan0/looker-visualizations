/**
 * Looker Custom Visualization — Bubble Chart
 * Dashboard: Discounts Redeemed — Efficiency by Store
 *
 * Field mapping (in order):
 *   Dimension [0] → Store (label)
 *   Measure  [1]  → Discounts Redeemed (X axis)
 *   Measure  [2]  → AOV with Discount   (Y axis)
 *   Measure  [3]  → Total Sales          (bubble size)
 *
 * Dependencies: D3.js v7 (loaded via CDN below)
 */

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });

looker.plugins.visualizations.add({
  /* ─────────────────────────────────────────────
     1. VISUALIZATION OPTIONS (panel lateral)
  ───────────────────────────────────────────── */
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

  /* ─────────────────────────────────────────────
     2. CREATE — runs once when the viz is mounted
  ───────────────────────────────────────────── */
  create(element, config) {
    element.innerHTML = `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');

        .disc-viz-root {
          font-family: 'DM Sans', sans-serif;
          width: 100%;
          height: 100%;
          position: relative;
          background: #0f1117;
          border-radius: 8px;
          overflow: hidden;
          box-sizing: border-box;
        }

        /* ── Tooltip ── */
        .disc-tooltip {
          position: absolute;
          pointer-events: none;
          opacity: 0;
          transition: opacity .18s ease;
          background: rgba(15,17,23,.95);
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 10px;
          padding: 12px 16px;
          min-width: 200px;
          box-shadow: 0 8px 32px rgba(0,0,0,.5);
          z-index: 999;
        }
        .disc-tooltip.visible { opacity: 1; }
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

        /* ── Legend ── */
        .disc-legend {
          position: absolute;
          bottom: 14px;
          right: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .disc-legend-title {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255,255,255,.4);
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .disc-legend-bubbles {
          display: flex;
          align-items: flex-end;
          gap: 10px;
        }
        .disc-legend-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }
        .disc-legend-circle {
          background: rgba(255,255,255,.15);
          border: 1px solid rgba(255,255,255,.25);
          border-radius: 50%;
        }
        .disc-legend-label {
          font-size: 9px;
          color: rgba(255,255,255,.45);
        }

        /* ── Quadrant labels ── */
        .disc-quadrant-label {
          font-size: 10px;
          font-weight: 500;
          fill: rgba(255,255,255,.2);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── Axis ── */
        .disc-axis text {
          font-size: 11px;
          fill: rgba(255,255,255,.45);
          font-family: 'DM Sans', sans-serif;
        }
        .disc-axis line,
        .disc-axis path {
          stroke: rgba(255,255,255,.1);
        }
        .disc-grid line {
          stroke: rgba(255,255,255,.05);
          stroke-dasharray: 3 4;
        }
        .disc-grid path { stroke: none; }

        /* ── Axis titles ── */
        .disc-axis-title {
          font-size: 11px;
          font-weight: 500;
          fill: rgba(255,255,255,.4);
          font-family: 'DM Sans', sans-serif;
        }

        /* ── No-data state ── */
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
      <div class="disc-viz-root" id="disc-root">
        <div class="disc-tooltip" id="disc-tooltip"></div>
        <div class="disc-legend" id="disc-legend"></div>
      </div>
    `;
  },

  /* ─────────────────────────────────────────────
     3. UPDATE — runs on every data / filter change
  ───────────────────────────────────────────── */
  async updateAsync(data, element, config, queryResponse, details, done) {
    /* ── Load D3 if needed ── */
    await loadScript("https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js");

    const root = document.getElementById("disc-root");
    const tooltip = document.getElementById("disc-tooltip");
    const legendEl = document.getElementById("disc-legend");

    /* ── Remove previous SVG ── */
    d3.select(root).selectAll("svg").remove();
    root.querySelectorAll(".disc-no-data").forEach((n) => n.remove());

    /* ── Guard: need ≥ 4 fields ── */
    const fields = [
      ...(queryResponse.fields.dimensions || []),
      ...(queryResponse.fields.measures || []),
    ];
    if (fields.length < 4 || !data.length) {
      root.insertAdjacentHTML(
        "beforeend",
        `<div class="disc-no-data">
          Add fields: Store · Discounts Redeemed · AOV with Discount · Total Sales
        </div>`
      );
      done();
      return;
    }

    /* ── Parse data ── */
    const fStore = fields[0].name;
    const fX = fields[1].name;
    const fY = fields[2].name;
    const fSize = fields[3].name;

    const parsed = data.map((row) => ({
      store: row[fStore]?.value ?? "–",
      x: +row[fX]?.value || 0,
      y: +row[fY]?.value || 0,
      size: +row[fSize]?.value || 0,
      rendered: {
        x: row[fX]?.rendered ?? row[fX]?.value,
        y: row[fY]?.rendered ?? row[fY]?.value,
        size: row[fSize]?.rendered ?? row[fSize]?.value,
      },
    }));

    /* ── Color palettes ── */
    const palettes = {
      ocean: ["#00c6ff", "#0072ff", "#4facfe", "#43e97b", "#38f9d7"],
      coral: ["#f7971e", "#ffd200", "#f953c6", "#b91d73", "#ee0979"],
      forest: ["#56ab2f", "#a8e063", "#11998e", "#38ef7d", "#74ebd5"],
      purple: ["#a18cd1", "#fbc2eb", "#c471ed", "#f64f59", "#c471ed"],
    };
    const scheme = config.color_scheme || "ocean";
    const colorScale = d3
      .scaleOrdinal()
      .domain(parsed.map((d) => d.store))
      .range(palettes[scheme] || palettes.ocean);

    /* ── Dimensions ── */
    const W = root.clientWidth || 600;
    const H = root.clientHeight || 400;
    const margin = { top: 40, right: 24, bottom: 56, left: 64 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    /* ── Scales ── */
    const minR = config.min_bubble_px ?? 8;
    const maxR = config.max_bubble_px ?? 60;

    const xExt = d3.extent(parsed, (d) => d.x);
    const yExt = d3.extent(parsed, (d) => d.y);
    const sExt = d3.extent(parsed, (d) => d.size);

    const xPad = (xExt[1] - xExt[0]) * 0.12 || 10;
    const yPad = (yExt[1] - yExt[0]) * 0.12 || 10;

    const xScale = d3
      .scaleLinear()
      .domain([Math.max(0, xExt[0] - xPad), xExt[1] + xPad])
      .range([0, innerW]);

    const yScale = d3
      .scaleLinear()
      .domain([Math.max(0, yExt[0] - yPad), yExt[1] + yPad])
      .range([innerH, 0]);

    const rScale = d3
      .scaleSqrt()
      .domain([sExt[0] || 0, sExt[1] || 1])
      .range([minR, maxR]);

    /* ── SVG ── */
    const svg = d3
      .select(root)
      .insert("svg", ".disc-tooltip")
      .attr("width", W)
      .attr("height", H);

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    /* ── Grid ── */
    g.append("g")
      .attr("class", "disc-grid")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickSize(-innerH).tickFormat(""));

    g.append("g")
      .attr("class", "disc-grid")
      .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(""));

    /* ── Quadrant lines ── */
    if (config.show_quadrants !== false) {
      const xMid = (xExt[0] + xExt[1]) / 2;
      const yMid = (yExt[0] + yExt[1]) / 2;

      g.append("line")
        .attr("x1", xScale(xMid)).attr("x2", xScale(xMid))
        .attr("y1", 0).attr("y2", innerH)
        .attr("stroke", "rgba(255,255,255,.12)")
        .attr("stroke-dasharray", "5,4");

      g.append("line")
        .attr("x1", 0).attr("x2", innerW)
        .attr("y1", yScale(yMid)).attr("y2", yScale(yMid))
        .attr("stroke", "rgba(255,255,255,.12)")
        .attr("stroke-dasharray", "5,4");

      const qLabels = [
        { x: xScale(xMid) + 6, y: yScale(yExt[1]) + 14, text: "▲ AOV Alto · ▲ Volumen" },
        { x: 4,                  y: yScale(yExt[1]) + 14, text: "▲ AOV Alto · ▼ Volumen" },
        { x: xScale(xMid) + 6,  y: innerH - 6,            text: "▼ AOV Bajo · ▲ Volumen" },
        { x: 4,                  y: innerH - 6,            text: "▼ AOV Bajo · ▼ Volumen" },
      ];
      qLabels.forEach(({ x, y, text }) => {
        g.append("text")
          .attr("class", "disc-quadrant-label")
          .attr("x", x).attr("y", y)
          .text(text);
      });
    }

    /* ── Axes ── */
    const xAxis = d3.axisBottom(xScale).ticks(6).tickFormat(d3.format(","));
    const yAxis = d3.axisLeft(yScale).ticks(5).tickFormat((d) => `€${d3.format(",.0f")(d)}`);

    g.append("g")
      .attr("class", "disc-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(xAxis);

    g.append("g")
      .attr("class", "disc-axis")
      .call(yAxis);

    /* ── Axis titles ── */
    g.append("text")
      .attr("class", "disc-axis-title")
      .attr("x", innerW / 2)
      .attr("y", innerH + 44)
      .attr("text-anchor", "middle")
      .text("Discounts Redeemed");

    g.append("text")
      .attr("class", "disc-axis-title")
      .attr("transform", "rotate(-90)")
      .attr("x", -innerH / 2)
      .attr("y", -50)
      .attr("text-anchor", "middle")
      .text("AOV with Discount (€)");

    /* ── Bubbles ── */
    const bubbleGroup = g.append("g").attr("class", "disc-bubbles");

    const circles = bubbleGroup
      .selectAll("circle")
      .data(parsed)
      .join("circle")
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 0)
      .attr("fill", (d) => colorScale(d.store))
      .attr("fill-opacity", 0.72)
      .attr("stroke", (d) => colorScale(d.store))
      .attr("stroke-width", 1.5)
      .attr("stroke-opacity", 0.9)
      .style("cursor", "pointer")
      .transition()
      .duration(600)
      .delay((_, i) => i * 40)
      .ease(d3.easeBounceOut)
      .attr("r", (d) => rScale(d.size));

    /* ── Interaction ── */
    bubbleGroup
      .selectAll("circle")
      .on("mouseenter", function (event, d) {
        d3.select(this)
          .raise()
          .transition().duration(120)
          .attr("fill-opacity", 1)
          .attr("stroke-width", 2.5);

        tooltip.innerHTML = `
          <div class="disc-tooltip-store">${d.store}</div>
          <div class="disc-tooltip-row"><span>Discounts Redeemed</span><span>${d3.format(",")(d.x)}</span></div>
          <div class="disc-tooltip-row"><span>AOV with Discount</span><span>€${d3.format(",.2f")(d.y)}</span></div>
          <div class="disc-tooltip-row"><span>Total Sales</span><span>${d.rendered.size}</span></div>
        `;
        tooltip.classList.add("visible");
      })
      .on("mousemove", function (event) {
        const rect = root.getBoundingClientRect();
        let left = event.clientX - rect.left + 14;
        let top = event.clientY - rect.top - 10;
        if (left + 220 > W) left -= 230;
        tooltip.style.left = left + "px";
        tooltip.style.top = top + "px";
      })
      .on("mouseleave", function () {
        d3.select(this)
          .transition().duration(120)
          .attr("fill-opacity", 0.72)
          .attr("stroke-width", 1.5);
        tooltip.classList.remove("visible");
      });

    /* ── Store labels ── */
    if (config.show_labels !== false) {
      bubbleGroup
        .selectAll(".disc-store-label")
        .data(parsed)
        .join("text")
        .attr("class", "disc-store-label")
        .attr("x", (d) => xScale(d.x))
        .attr("y", (d) => yScale(d.y) - rScale(d.size) - 5)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("font-family", "'DM Sans', sans-serif")
        .attr("font-weight", "500")
        .attr("fill", "rgba(255,255,255,.75)")
        .text((d) => d.store);
    }

    /* ── Size legend ── */
    legendEl.innerHTML = "";
    const sizeSamples = [sExt[0], (sExt[0] + sExt[1]) / 2, sExt[1]].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    legendEl.innerHTML = `
      <div class="disc-legend-title">Total Sales</div>
      <div class="disc-legend-bubbles">
        ${sizeSamples
          .map((v) => {
            const r = rScale(v);
            const diameter = r * 2;
            return `
            <div class="disc-legend-item">
              <div class="disc-legend-circle" style="width:${diameter}px;height:${diameter}px;"></div>
              <span class="disc-legend-label">${d3.format(".2s")(v)}</span>
            </div>`;
          })
          .join("")}
      </div>
    `;

    done();
  },
});
