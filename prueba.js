looker.plugins.visualizations.add({
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
        .main-card-container {
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 10px;
          box-sizing: border-box;
          width: 100%;
        }
        .premium-card {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          border: 1px solid #e0e0e0;
          border-radius: 4px;
          text-align: center;
          font-family: sans-serif;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        #viz-text-value {
          color: #000000;
          padding: 20px;
          line-height: 1.2;
          width: 100%;
        }
      </style>
      <div class="main-card-container">
        <div class="premium-card" id="viz-card-element">
          <div id="viz-text-value">Iniciando...</div>
        </div>
      </div>
    `;
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    const card = document.getElementById('viz-card-element');
    const textValue = document.getElementById('viz-text-value');

    if (card) card.style.backgroundColor = config.backgroundColor || "#ffffff";
    if (card) card.style.borderColor = config.borderColor || "#e0e0e0";
    if (textValue) textValue.style.fontSize = (config.fontSize || 28) + "px";

    try {
      if (data && data.length > 0) {
        const firstRow = data[0];
        const fields = [
          ...(queryResponse.fields.dimensions || []),
          ...(queryResponse.fields.measures || []),
          ...(queryResponse.fields.dimension_like || []),
          ...(queryResponse.fields.measure_like || [])
        ];

        if (fields.length > 0) {
          const firstFieldName = fields[0].name;
          const cell = firstRow[firstFieldName];
          textValue.innerHTML = cell.rendered !== undefined ? cell.rendered : cell.value;
        }
      }
    } catch (e) {
      console.error(e);
    }
    done();
  }
});
