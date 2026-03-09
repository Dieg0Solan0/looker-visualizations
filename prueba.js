(function() {
  const vizObject = {
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
            width: 100%;
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
          }
        </style>
        <div class="main-container">
          <div class="card" id="viz-card">
            <div id="viz-value">Cargando datos...</div>
          </div>
        </div>
      `;
    },

    updateAsync: function(data, element, config, queryResponse, details, done) {
      const card = document.getElementById('viz-card');
      const valueDisplay = document.getElementById('viz-value');

      // Aplicar estilos
      if (card) {
        card.style.backgroundColor = config.backgroundColor || "#ffffff";
        card.style.borderColor = config.borderColor || "#e0e0e0";
      }
      if (valueDisplay) {
        valueDisplay.style.fontSize = (config.fontSize || 28) + "px";
      }

      // Capturar dato
      if (data && data.length > 0) {
        const firstRow = data[0];
        const fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
        const firstField = fields[0];

        if (firstField && firstRow[firstField.name]) {
          const cell = firstRow[firstField.name];
          valueDisplay.innerHTML = cell.rendered || cell.value || "";
        }
      }
      done();
    }
  };

  // Intentar registrar en ambos posibles nombres de objeto por seguridad
  if (typeof looker !== 'undefined' && looker.plugins && looker.plugins.visualizations) {
    looker.plugins.visualizations.add(vizObject);
  } else if (typeof looker !== 'undefined' && looker.visualizations) {
    looker.visualizations.add(vizObject);
  }
})();
