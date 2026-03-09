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
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');
        
        .main-container {
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          box-sizing: border-box;
        }
        .card {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 95%;
          height: 90%;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-align: center;
          font-family: 'Open Sans', sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        #viz-value {
          color: #000000;
          width: 100%;
        }
      </style>
      <div class="main-container">
        <div class="card" id="viz-card">
          <div id="viz-value">Cargando...</div>
        </div>
      </div>
    `;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const card = document.getElementById('viz-card');
    const valueDisplay = document.getElementById('viz-value');

    // Aplicar estilos desde el panel
    card.style.backgroundColor = config.backgroundColor || "#ffffff";
    card.style.borderColor = config.borderColor || "#e0e0e0";
    valueDisplay.style.fontSize = `${config.fontSize}px`;

    // Extraer el dato de forma segura
    try {
        if (data && data.length > 0) {
            // Buscamos la primera celda del primer registro
            const firstRow = data[0];
            const firstFieldName = queryResponse.fields.dimension_like[0]?.name || queryResponse.fields.measure_like[0]?.name;
            
            if (firstFieldName && firstRow[firstFieldName]) {
                const cell = firstRow[firstFieldName];
                // Intentamos obtener el valor renderizado, si no, el valor bruto
                valueDisplay.innerText = cell.rendered || cell.value || "";
            } else {
                valueDisplay.innerText = "Sin datos";
            }
        }
    } catch (error) {
        valueDisplay.innerText = "Error de datos";
        console.error(error);
    }

    done();
  }
});
