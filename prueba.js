looker.visualizations.add({
  options: {
    backgroundColor: {
      type: "string",
      label: "Color de Fondo",
      default: "#ffffff",
      display: "color"
    },
    borderColor: {
      type: "string",
      label: "Color del Borde",
      default: "#e0e0e0",
      display: "color"
    },
    fontSize: {
      type: "number",
      label: "Tamaño de Fuente (px)",
      default: 28
    }
  },

  create: function(element, config) {
    element.innerHTML = `
      <style>
        .main-container {
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          box-sizing: border-box;
          overflow: hidden;
        }
        .card {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 98%;
          height: 98%;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-align: center;
          font-family: sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        #viz-value {
          color: #000000;
          width: 100%;
          word-wrap: break-word;
        }
      </style>
      <div class="main-container">
        <div class="card" id="viz-card">
          <div id="viz-value">Iniciando...</div>
        </div>
      </div>
    `;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const card = document.getElementById('viz-card');
    const valueDisplay = document.getElementById('viz-value');

    // Aplicar estilos
    card.style.backgroundColor = config.backgroundColor || "#ffffff";
    card.style.borderColor = config.borderColor || "#e0e0e0";
    valueDisplay.style.fontSize = (config.fontSize || 28) + "px";

    // Extraer dato
    if (data && data.length > 0) {
      const firstRow = data[0];
      const dimensions = queryResponse.fields.dimension_like;
      const measures = queryResponse.fields.measure_like;
      const firstField = (dimensions && dimensions.length > 0) ? dimensions[0] : (measures && measures.length > 0 ? measures[0] : null);

      if (firstField && firstRow[firstField.name]) {
        const cell = firstRow[firstField.name];
        // Looker guarda el valor en .value o .rendered
        const val = cell.rendered !== undefined ? cell.rendered : cell.value;
        valueDisplay.innerHTML = val;
      } else {
        valueDisplay.innerText = "Sin datos";
      }
    } else {
      valueDisplay.innerText = "Esperando resultados...";
    }

    done();
  }
});
