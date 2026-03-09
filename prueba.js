looker.visualizations.add({
  options: {
    backgroundColor: {
      type: "string",
      label: "Color de Fondo",
      default: "#ffffff",
      display: "color"
    },
    textColor: {
      type: "string",
      label: "Color del Texto",
      default: "#333333",
      display: "color"
    },
    fontSize: {
      type: "number",
      label: "Tamaño de Fuente (px)",
      default: 40
    },
    fontWeight: {
      type: "string",
      label: "Grosor de letra",
      default: "normal",
      display: "select",
      values: [
        {"Normal": "normal"},
        {"Negrita": "bold"},
        {"Ligera": "100"}
      ]
    }
  },

  create: function(element, config) {
    element.innerHTML = `
      <style>
        .canvas-container {
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          text-align: center;
          width: 100%;
          transition: background-color 0.3s;
        }
        #viz-text {
          font-family: 'Open Sans', Helvetica, Arial, sans-serif;
          line-height: 1.2;
          width: 100%;
          padding: 20px;
        }
      </style>
      <div class="canvas-container" id="viz-canvas">
        <div id="viz-text"></div>
      </div>
    `;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const canvas = document.getElementById('viz-canvas');
    const textTarget = document.getElementById('viz-text');

    // 1. Aplicar estilos visuales del panel
    canvas.style.backgroundColor = config.backgroundColor || "#ffffff";
    textTarget.style.color = config.textColor || "#333333";
    textTarget.style.fontSize = `${config.fontSize}px`;
    textTarget.style.fontWeight = config.fontWeight || "normal";

    // 2. Lógica para extraer el valor (Dimensión o Medida)
    let displayValue = "No data";

    if (data && data.length > 0) {
      // Buscamos el primer campo disponible (priorizando dimensiones para tu caso)
      const field = queryResponse.fields.dimension_like[0] || queryResponse.fields.measure_like[0];
      
      if (field) {
        const rawValue = data[0][field.name];
        // Usamos el valor renderizado (formateado) o el valor plano
        displayValue = LookerCharts.Utils.htmlForCell(rawValue) || rawValue.value;
      }
    }

    textTarget.innerHTML = displayValue;
    
    // Indicar a Looker que la visualización terminó de cargar
    done();
  }
});
