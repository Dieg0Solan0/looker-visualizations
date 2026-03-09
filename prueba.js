(function() {
  const vizObject = {
    options: {
      backgroundColor: { type: "string", label: "Color de Fondo", default: "#ffffff", display: "color" },
      borderColor: { type: "string", label: "Color del Borde", default: "#e0e0e0", display: "color" },
      fontSize: { type: "number", label: "Tamaño de Fuente (px)", default: 28 }
    },

    create: function(element, config) {
      element.innerHTML = `
        <style>
          .main-wrapper { 
            height: 100%; 
            width: 100%; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            box-sizing: border-box; 
            padding: 2px; /* Reducido para que el borde esté más afuera */
          }
          .custom-card {
            width: 100%; 
            height: 100%; 
            display: flex; 
            flex-direction: column; /* Asegura el eje para centrado vertical */
            justify-content: center; 
            align-items: center;
            border: 1px solid #e0e0e0; 
            border-radius: 4px;
            font-family: sans-serif; 
            text-align: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
            overflow: hidden; /* Evita que el texto se salga si es muy grande */
          }
          #viz-content { 
            width: 100%; 
            color: #333; 
            font-weight: 500;
            padding: 5px; /* Espacio interno para que el texto no toque el borde */
            box-sizing: border-box;
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

      // Aplicar estilos personalizados
      if (container) {
        container.style.backgroundColor = config.backgroundColor || "#ffffff";
        container.style.borderColor = config.borderColor || "#e0e0e0";
      }
      if (content) {
        content.style.fontSize = (config.fontSize || 28) + "px";
      }

      // Lógica de captura de datos inspirada en Multiple Value
      try {
        if (data && data.length > 0) {
          const firstRow = data[0];
          // Obtenemos todos los campos disponibles (Dimensiones y Medidas)
          const fields = queryResponse.fields.dimension_like.concat(queryResponse.fields.measure_like);
          
          if (fields.length > 0) {
            const firstFieldName = fields[0].name;
            const cellValue = firstRow[firstFieldName];
            
            // Mostramos el valor renderizado (formateado) o el valor plano
            content.innerHTML = cellValue.rendered !== undefined ? cellValue.rendered : cellValue.value;
          } else {
            content.innerText = "Falta seleccionar un campo";
          }
        } else {
          content.innerText = "No hay datos";
        }
      } catch (err) {
        content.innerText = "Error de datos";
        console.error("Error en Viz:", err);
      }
      done();
    }
  };

  // Registro seguro para evitar que salga en blanco
  if (typeof looker !== 'undefined') {
    if (looker.plugins && looker.plugins.visualizations) {
      looker.plugins.visualizations.add(vizObject);
    } else {
      looker.visualizations.add(vizObject);
    }
  }
})();
