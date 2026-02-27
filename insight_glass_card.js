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
    element.style.cssText = [
      "width:100%",
      "height:100%",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "font-family:'Google Sans','Segoe UI',Arial,sans-serif",
      "background:transparent",
      "box-sizing:border-box",
      "padding:0"
    ].join(";");

    var style = document.createElement("style");
    style.textContent = "\
      .igc-wrapper{width:100%;height:100%;display:flex;align-items:stretch;justify-content:stretch;padding:6px;box-sizing:border-box;}\
      .igc-card{width:100%;border-radius:14px;border:1px solid rgba(255,255,255,0.75);padding:14px 18px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 16px rgba(0,0,0,0.07),inset 0 1px 0 rgba(255,255,255,0.85);box-sizing:border-box;}\
      .igc-text{line-height:1.6;font-weight:500;text-align:center;word-break:break-word;}\
      .igc-error{font-size:11px;color:#c0392b;font-style:italic;text-align:center;padding:8px;}\
    ";
    element.appendChild(style);

    var wrapper = document.createElement("div");
    wrapper.className = "igc-wrapper";
    element.appendChild(wrapper);

    this._wrapper = wrapper;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    try {
      var opacity  = Math.min(0.9, Math.max(0.05, parseFloat(config.bg_opacity) || 0.35));
      var blur     = Math.max(0, parseInt(config.blur_amount) || 14);
      var txtColor = config.text_color || "#2c3e7a";
      var fontSize = parseInt(config.font_size) || 13;

      var insightText = null;

      // Buscar en todas las medidas y dimensiones
      var allFields = []
        .concat(queryResponse.fields.dimensions || [])
        .concat(queryResponse.fields.measures   || []);

      if (data && data.length > 0 && allFields.length > 0) {
        for (var i = 0; i < allFields.length; i++) {
          var field = allFields[i];
          var cell  = data[0][field.name];

          if (!cell) continue;

          // Intentar todas las formas posibles de obtener el valor
          var val = null;
          if (typeof cell.rendered === "string" && cell.rendered.length > 0) {
            val = cell.rendered;
          } else if (typeof cell.value === "string" && cell.value.length > 0) {
            val = cell.value;
          } else if (cell.value !== null && cell.value !== undefined) {
            val = String(cell.value);
          }

          if (val) {
            insightText = val;
            break;
          }
        }
      }

      var cardContent;
      if (insightText) {
        cardContent = '<span class="igc-text" style="font-size:' + fontSize + 'px;color:' + txtColor + ';">' + insightText + '</span>';
      } else {
        var debugInfo = "Campos disponibles: " + allFields.map(function(f){ return f.name; }).join(", ");
        cardContent = '<span class="igc-error">Sin datos.<br><small>' + debugInfo + '</small></span>';
      }

      this._wrapper.innerHTML =
        '<div class="igc-card" style="' +
          'background:rgba(215,220,232,' + opacity + ');' +
          'backdrop-filter:blur(' + blur + 'px);' +
          '-webkit-backdrop-filter:blur(' + blur + 'px);' +
          'color:' + txtColor + ';' +
        '">' + cardContent + '</div>';

    } catch(e) {
      this._wrapper.innerHTML = '<div class="igc-card" style="background:rgba(215,220,232,0.35);"><span class="igc-error">Error: ' + e.message + '</span></div>';
    }

    done();
  }
});
