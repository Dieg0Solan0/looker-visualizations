(function() {
  const vizObject = {
    options: {
      backgroundColor: { type: "string", label: "Color de Fondo", default: "#ffffff", display: "color" },
      textColor: { type: "string", label: "Color del Texto", default: "#333333", display: "color" },
      fontSize: { type: "number", label: "Tamaño de Fuente (px)", default: 28 },
      borderColor: { type: "string", label: "Color del Borde", default: "#e0e0e0", display: "color" },
      borderShow: { type: "boolean", label: "Mostrar Borde", default: true }
    },

    create: function(element, config) {
      element.innerHTML = `
        <style>
          .main-wrapper { 
            height: 100%; width: 100%; display: flex; 
            justify-content: center; align-items: center; 
            box-sizing: border-box; padding: 0;
          }
          .custom-card {
            width: 100%; height: 100%; display: flex; 
            justify-content: center; align-items: center;
            font-family: sans-serif; text-align: center;
            border-radius: 4px;
            /* Se eliminó box-shadow para quitar el relieve */
          }
          #viz-content { 
            width: 100%; 
            line-height: 1; /* Ayuda al centrado vertical exacto */
            margin: 0;
          }
        </style>
        <div class="main-wrapper">
          <div class="custom-card" id="viz-container">
            <div id="viz-content">Cargando...</div>
          </div>
        </div>`;
    },

    updateAsync: function(data, element, config, queryResponse, details, done) {
      const container = document.getElementById('viz-container');
      const content = document.getElementById('viz-content');

      // Aplicar estilos y centrado
      if (container) {
        container.style.backgroundColor = config.backgroundColor || "#ffffff";
        container.style.border = config.borderShow ? `1px solid ${config.borderColor || "#e0e0e0"}` : "none";
      }
      if (content) {
        content.style.fontSize = (config.fontSize || 28) + "px";
        content.style.color = config.textColor || "#333333";
      }

      try {
        if (data && data.length > 0) {
          const firstRow = data[0];
          const fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
          
          if (fields.length > 0) {
            const cellValue = firstRow[fields[0].name];
            content.innerHTML = cellValue.rendered !== undefined ? cellValue.rendered : cellValue.value;
          }
        }
      } catch (err) {
        console.error("Error en Viz:", err);
      }
      done();
    }
  };

  if (typeof looker !== 'undefined') {
    if (looker.plugins && looker.plugins.visualizations) {
      looker.plugins.visualizations.add(vizObject);
    } else {
      looker.visualizations.add(vizObject);
    }
  }
})();
