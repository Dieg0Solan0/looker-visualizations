(function() {
  const vizObject = {
    options: {
      backgroundColor: { type: "string", label: "Color de Fondo", default: "#ffffff", display: "color" },
      textColor: { type: "string", label: "Color del Texto", default: "#333333", display: "color" },
      fontSize: { type: "number", label: "Tamaño de Fuente (px)", default: 28 },
      fontWeight: { 
        type: "string", 
        label: "Grosor de letra", 
        default: "500", 
        display: "select", 
        values: [{"Normal": "400"}, {"Media": "500"}, {"Negrita": "700"}] 
      }
    },

    create: function(element, config) {
      // Ajuste para que el contenedor raíz no genere scroll
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.overflow = "hidden";
      element.style.display = "flex";

      element.innerHTML = `
        <style>
          #viz-outer-container {
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden; /* Bloquea cualquier scroll interno */
            margin: 0;
            padding: 0;
          }
          #viz-content {
            width: 100%;
            text-align: center;
            line-height: 1;
            padding: 5px;
            box-sizing: border-box;
            user-select: none; /* Evita selección accidental al mover tiles */
          }
        </style>
        <div id="viz-outer-container">
          <div id="viz-content">Cargando...</div>
        </div>`;
    },

    updateAsync: function(data, element, config, queryResponse, details, done) {
      const container = document.getElementById('viz-outer-container');
      const content = document.getElementById('viz-content');

      // Aplicar estilos del panel
      if (container) {
        container.style.backgroundColor = config.backgroundColor || "#ffffff";
      }
      
      if (content) {
        content.style.fontSize = (config.fontSize || 28) + "px";
        content.style.color = config.textColor || "#333333";
        content.style.fontWeight = config.fontWeight || "500";
        content.style.fontFamily = "Open Sans, sans-serif";
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
