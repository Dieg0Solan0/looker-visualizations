looker.viz.add({
  // 1. Definimos las opciones que aparecerán en el panel "Edit"
  options: {
    border_left_color: {
      type: "string",
      label: "Color Borde Izquierdo",
      default: "#004080",
      display: "color",
      section: "Bordes"
    },
    border_left_width: {
      type: "number",
      label: "Grosor Izquierdo (px)",
      default: 5,
      section: "Bordes"
    },
    border_top_color: {
      type: "string",
      label: "Color Borde Superior",
      default: "#E0E0E0",
      display: "color",
      section: "Bordes"
    },
    // Puedes repetir esto para border_right y border_bottom
  },

  create: function(element, config) {
    element.innerHTML = `<div id="viz-container"></div>`;
  },

  updateAsync: function(data, element, config, queryResponse) {
    const container = element.querySelector("#viz-container");
    const firstRow = data[0];
    const measures = queryResponse.fields.measure_like;

    // Extraemos el valor principal (Single Value) y los secundarios (Multiple)
    const mainValue = firstRow[measures[0].name].value;
    const secondaryValues = measures.slice(1).map(m => {
      return `<div style="text-align:center;">
                <p style="margin:0; font-size:10px; color:#666;">${m.label_short || m.label}</p>
                <p style="margin:0; font-size:14px; font-weight:bold;">${firstRow[m.name].value}</p>
              </div>`;
    }).join("");

    // Aplicamos el diseño con bordes independientes
    container.innerHTML = `
      <div style="
        background: white;
        padding: 15px;
        border-left: ${config.border_left_width}px solid ${config.border_left_color};
        border-top: 1px solid ${config.border_top_color};
        border-right: 1px solid #E0E0E0;
        border-bottom: 1px solid #E0E0E0;
        font-family: sans-serif;
      ">
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 15px;">${mainValue}</div>
        <div style="display: flex; justify-content: space-around; border-top: 1px solid #EEE; pt: 10px;">
          ${secondaryValues}
        </div>
      </div>
    `;
    this.done();
  }
});