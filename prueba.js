looker.visualizations.add({
  // Configuración de las opciones que aparecerán en el panel de edición
  options: {
    backgroundColor: {
      type: "string",
      label: "Color de Fondo",
      default: "#ffffff",
      display: "color"
    },
    titleText: {
      type: "string",
      label: "Título Personalizado",
      default: "Mi Título"
    },
    titleFontSize: {
      type: "number",
      label: "Tamaño del Título (px)",
      default: 18
    },
    valueFontSize: {
      type: "number",
      label: "Tamaño del Valor (px)",
      default: 32
    }
  },

  create: function(element, config) {
    element.innerHTML = `
      <style>
        .my-custom-viz {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          font-family: 'Open Sans', Helvetica, Arial, sans-serif;
          text-align: center;
          padding: 10px;
        }
        .viz-title { margin-bottom: 10px; font-weight: bold; }
        .viz-value { font-weight: 100; }
      </style>
      <div class="my-custom-viz" id="viz-container">
        <div class="viz-title" id="viz-title"></div>
        <div class="viz-value" id="viz-value"></div>
      </div>
    `;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const container = document.getElementById('viz-container');
    const title = document.getElementById('viz-title');
    const value = document.getElementById('viz-value');

    // Cambiar estilos según el panel de configuración
    container.style.backgroundColor = config.backgroundColor || "#ffffff";
    title.innerText = config.titleText || "Sin Título";
    title.style.fontSize = `${config.titleFontSize}px`;
    value.style.fontSize = `${config.valueFontSize}px`;

    // Obtener el primer valor de la primera columna
    if (data.length > 0) {
        const firstRow = data[0];
        const firstColumn = queryResponse.fields.measure_like[0];
        value.innerText = firstRow[firstColumn.name].rendered || firstRow[firstColumn.name].value;
    }

    done();
  }
});
