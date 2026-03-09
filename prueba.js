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
      // Forzamos al elemento padre de Looker a no tener scroll ni rellenos
      element.style.padding = "0";
      element.style.margin = "0";
      element.style.display = "block";
      element.style.overflow = "hidden";

      element.innerHTML = `
        <style>
          /* Contenedor que elimina cualquier margen externo del tile */
          .full-height-wrapper { 
            height: 100vh; 
            width: 100%; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          .custom-card {
            width: 100%; 
            height: 100%; 
            display: flex; 
            justify-content: center; 
            align-items: center;
            font-family: sans-serif; 
            text-align: center;
            box-sizing: border-box;
          }
          #viz-content { 
            width: 100%; 
            /* Quitamos line-height para que no empuje el texto hacia abajo */
            line-height: normal; 
            margin: 0;
            padding: 0;
          }
        </style>
        <div class="full-height-wrapper">
          <div class="custom-card" id="viz-container">
            <div id="viz-content">Cargando...</div>
          </div>
        </div>`;
    },

    updateAsync: function(data, element, config, queryResponse, details, done) {
      const container = document.getElementById('viz-container');
      const content = document.getElementById('viz-content');

      if (container) {
        container.style.backgroundColor = config.backgroundColor || "#ffffff";
        // Si borderShow es false, eliminamos el borde por completo para que sea plano
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
