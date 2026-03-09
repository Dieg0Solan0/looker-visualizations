(function() {
  const vizObject = {
    options: {
      backgroundColor: { type: "string", label: "Color de Fondo", default: "#ffffff", display: "color" },
      textColor: { type: "string", label: "Color del Texto", default: "#333333", display: "color" },
      fontSize: { type: "number", label: "Tamaño de Fuente (px)", default: 28 },
      fontWeight: { 
        type: "string", 
        label: "Grosol de letra", 
        default: "700", 
        display: "select", 
        values: [{"Normal": "400"}, {"Media": "500"}, {"Negrita": "700"}] 
      }
    },

    create: function(element, config) {
      // Forzamos al elemento raíz a ocupar TODO el espacio sin excepciones
      element.style.setProperty('padding', '0', 'important');
      element.style.setProperty('margin', '0', 'important');
      element.style.setProperty('border', 'none', 'important');
      element.style.position = "absolute";
      element.style.top = "0";
      element.style.left = "0";
      element.style.width = "100%";
      element.style.height = "100%";
      element.style.overflow = "hidden";

      element.innerHTML = `
        <style>
          #canvas-target {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          #text-target {
            width: 100%;
            text-align: center;
            line-height: 1;
            padding: 5px;
            box-sizing: border-box;
            word-wrap: break-word;
          }
        </style>
        <div id="canvas-target">
          <div id="text-target">Cargando...</div>
        </div>`;
    },

    updateAsync: function(data, element, config, queryResponse, details, done) {
      const canvas = document.getElementById('canvas-target');
      const text = document.getElementById('text-target');

      if (canvas) {
        canvas.style.backgroundColor = config.backgroundColor || "#ffffff";
      }
      
      if (text) {
        text.style.fontSize = (config.fontSize || 28) + "px";
        text.style.color = config.textColor || "#333333";
        text.style.fontWeight = config.fontWeight || "700";
        text.style.fontFamily = "Open Sans, sans-serif";
      }

      try {
        if (data && data.length > 0) {
          const firstRow = data[0];
          const fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
          if (fields.length > 0) {
            const cell = firstRow[fields[0].name];
            text.innerHTML = cell.rendered !== undefined ? cell.rendered : cell.value;
          }
        }
      } catch (err) {
        console.error("Error:", err);
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
