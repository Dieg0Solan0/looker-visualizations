looker.plugins.visualizations.add({
  id: "insight_glass_card",
  label: "Insight Glass Card",

  options: {
    bg_opacity: {
      type: "number",
      label: "Opacidad del fondo (0.1 - 0.9)",
      default: 0.35,
      section: "Estilo",
      order: 1
    },
    blur_amount: {
      type: "number",
      label: "Blur (px)",
      default: 14,
      section: "Estilo",
      order: 2
    },
    text_color: {
      type: "string",
      label: "Color del texto (hex)",
      default: "#2c3e7a",
      section: "Estilo",
      order: 3
    },
    font_size: {
      type: "number",
      label: "Tamaño de fuente (px)",
      default: 13,
      section: "Estilo",
      order: 4
    }
  },

  create: function(element, config) {
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
        align-items: center;
        justify-content: center;
        box-shadow:
          0 2px 16px rgba(0, 0, 0, 0.07),
          inset 0 1px 0 rgba(255, 255, 255, 0.85);
        transition: box-shadow 0.25s ease, transform 0.25s ease;
        box-sizing: border-box;
      }
      .igc-card:hover {
        box-shadow:
          0 6px 24px rgba(0, 0, 0, 0.12),
          inset 0 1px 0 rgba(255, 255, 255, 0.9);
        transform: translateY(-2px);
      }
      .igc-text {
        line-height: 1.6;
        font-weight: 500;
        text-align: center;
      }
      .igc-error {
        font-size: 12px;
        color: #999;
        font-style: italic;
        text-align: center;
      }
    `;
    element.appendChild(style);

    const wrapper = document.createElement("div");
    wrapper.className = "igc-wrapper";
    element.appendChild(wrapper);

    this._wrapper = wrapper;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const opacity  = Math.min(0.9, Math.max(0.05, config.bg_opacity || 0.35));
    const blur     = Math.max(0, config.blur_amount || 14);
    const txtColor = config.text_color || "#2c3e7a";
    const fontSize = config.font_size  || 13;

    // ── Leer el valor de la primera dimensión o medida disponible ──
    let insightText = null;

    const allFields = [
      ...(queryResponse.fields.dimensions || []),
      ...(queryResponse.fields.measures   || [])
    ];

    if (data && data.length > 0 && allFields.length > 0) {
      const field = allFields[0];
      const cell  = data[0][field.name];
      if (cell) {
        insightText = cell.rendered != null ? cell.rendered : cell.value;
      }
    }

    const cardContent = insightText
      ? `<span class="igc-text" style="font-size:${fontSize}px; color:${txtColor};">${insightText}</span>`
      : `<span class="igc-error">Sin datos — conecta la medida<br><em>dynamic_efficiency_insight</em> o <em>dynamic_customer_behavior_insight</em></span>`;

    this._wrapper.innerHTML = `
      <div class="igc-card" style="
        background: rgba(215, 220, 232, ${opacity});
        backdrop-filter: blur(${blur}px);
        -webkit-backdrop-filter: blur(${blur}px);
        color: ${txtColor};
      ">
        ${cardContent}
      </div>
    `;

    done();
  }
});
