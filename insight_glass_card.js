looker.plugins.visualizations.add({
  id: "insight_glass_card",
  label: "Insight Glass Card",

  // ── Opciones configurables desde el panel de Looker ──
  options: {
    insight_text: {
      type: "string",
      label: "Texto del insight",
      default: "💡 Escribe aquí tu insight automático o personalizado.",
      section: "Contenido",
      order: 1
    },
    bg_opacity: {
      type: "number",
      label: "Opacidad del fondo (0.1 - 0.9)",
      default: 0.35,
      section: "Estilo",
      order: 2
    },
    blur_amount: {
      type: "number",
      label: "Blur (px)",
      default: 14,
      section: "Estilo",
      order: 3
    },
    text_color: {
      type: "string",
      label: "Color del texto (hex)",
      default: "#2c3e7a",
      section: "Estilo",
      order: 4
    },
    font_size: {
      type: "number",
      label: "Tamaño de fuente (px)",
      default: 13,
      section: "Estilo",
      order: 5
    },
    show_metric: {
      type: "boolean",
      label: "Mostrar métrica destacada",
      default: true,
      section: "Contenido",
      order: 6
    },
    metric_label: {
      type: "string",
      label: "Etiqueta de la métrica",
      default: "Discount ROI",
      section: "Contenido",
      order: 7
    }
  },

  create: function(element, config) {
    // Contenedor principal
    element.innerHTML = "";
    element.style.cssText = `
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Google Sans', 'Segoe UI', Arial, sans-serif;
      background: transparent;
      box-sizing: border-box;
      padding: 0;
    `;

    // Inject styles
    const style = document.createElement("style");
    style.textContent = `
      .igc-wrapper {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: stretch;
        justify-content: stretch;
        padding: 6px;
        box-sizing: border-box;
      }

      .igc-card {
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(255, 255, 255, 0.75);
        padding: 14px 18px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 10px;
        box-shadow:
          0 2px 16px rgba(0, 0, 0, 0.07),
          inset 0 1px 0 rgba(255, 255, 255, 0.85);
        transition: box-shadow 0.25s ease, transform 0.25s ease;
        cursor: default;
        box-sizing: border-box;
      }

      .igc-card:hover {
        box-shadow:
          0 6px 24px rgba(0, 0, 0, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
        transform: translateY(-2px);
      }

      .igc-metric-row {
        display: flex;
        align-items: baseline;
        gap: 8px;
      }

      .igc-metric-value {
        font-size: 28px;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.5px;
      }

      .igc-metric-label {
        font-size: 11px;
        font-weight: 500;
        opacity: 0.65;
        text-transform: uppercase;
        letter-spacing: 0.6px;
      }

      .igc-divider {
        height: 1px;
        background: rgba(255,255,255,0.5);
        border-radius: 1px;
        margin: 2px 0;
      }

      .igc-insight-row {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .igc-icon {
        font-size: 15px;
        flex-shrink: 0;
        margin-top: 1px;
      }

      .igc-text {
        line-height: 1.55;
        font-weight: 500;
      }

      .igc-text strong {
        font-weight: 700;
      }
    `;
    element.appendChild(style);

    // Card wrapper
    const wrapper = document.createElement("div");
    wrapper.className = "igc-wrapper";
    element.appendChild(wrapper);

    this._wrapper = wrapper;
    this._style = style;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const opts = config;

    // Calcular color de fondo dinámico
    const opacity = Math.min(0.9, Math.max(0.05, opts.bg_opacity || 0.35));
    const blur    = Math.max(0, opts.blur_amount || 14);
    const txtColor = opts.text_color || "#2c3e7a";
    const fontSize = opts.font_size || 13;

    // Extraer valor de la primera medida si hay datos
    let metricValue = null;
    let metricLabel = opts.metric_label || "";

    if (data && data.length > 0 && queryResponse.fields.measures.length > 0) {
      const firstMeasure = queryResponse.fields.measures[0];
      metricLabel = firstMeasure.label_short || firstMeasure.label || opts.metric_label;
      const raw = data[0][firstMeasure.name];
      if (raw) {
        metricValue = raw.rendered || raw.value;
      }
    }

    // Texto del insight (puede contener HTML básico como <strong>)
    const insightText = opts.insight_text || "💡 Configura el texto del insight en las opciones.";

    // Render
    this._wrapper.innerHTML = `
      <div class="igc-card" style="
        background: rgba(215, 220, 232, ${opacity});
        backdrop-filter: blur(${blur}px);
        -webkit-backdrop-filter: blur(${blur}px);
        color: ${txtColor};
      ">
        ${opts.show_metric && metricValue !== null ? `
          <div class="igc-metric-row">
            <span class="igc-metric-value" style="color:${txtColor}">${metricValue}</span>
            <span class="igc-metric-label" style="color:${txtColor}">${metricLabel}</span>
          </div>
          <div class="igc-divider"></div>
        ` : ""}

        <div class="igc-insight-row">
          <span class="igc-icon">💡</span>
          <span class="igc-text" style="font-size:${fontSize}px; color:${txtColor}">
            ${insightText}
          </span>
        </div>
      </div>
    `;

    done();
  }
});
