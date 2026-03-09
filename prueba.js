/**
 * Looker Custom Visualization — Styled Text Card
 * 
 * Este archivo es una plantilla independiente para crear tarjetas de texto estilizadas.
 */

(function () {
    var viz = {
        id: "custom_text_title_card",
        label: "Styled Text Card",
        options: {
            font_size: {
                type: "number",
                label: "Font Size (px)",
                default: 18,
                section: "Style",
                order: 1
            },
            text_color: {
                type: "string",
                label: "Text Color",
                display: "color",
                default: "#0033a0",
                section: "Style",
                order: 2
            },
            bg_color: {
                type: "string",
                label: "Background Color",
                display: "color",
                default: "#ffffff",
                section: "Style",
                order: 3
            },
            border_color: {
                type: "string",
                label: "Border Color",
                display: "color",
                default: "#dfe1e5",
                section: "Style",
                order: 4
            },
            border_radius: {
                type: "number",
                label: "Border Radius (px)",
                default: 4,
                section: "Style",
                order: 5
            },
            is_bold: {
                type: "boolean",
                label: "Bold Text",
                default: true,
                section: "Style",
                order: 6
            },
            text_align: {
                type: "string",
                label: "Text Alignment",
                display: "select",
                values: [
                    { "Left": "left" },
                    { "Center": "center" },
                    { "Right": "right" }
                ],
                default: "center",
                section: "Style",
                order: 7
            },
            custom_label: {
                type: "string",
                label: "Custom Text Override",
                default: "",
                section: "Content",
                order: 1
            }
        },

        create: function (element, config) {
            element.innerHTML = "";
            var container = document.createElement("div");
            container.id = "text-card-container";
            container.style.cssText = "width:100%; height:100%; display:flex; box-sizing:border-box; overflow:hidden;";
            element.appendChild(container);

            var textElement = document.createElement("div");
            textElement.id = "text-card-content";
            textElement.style.cssText = "width:100%; display:flex; align-items:center; word-break:break-all;";
            container.appendChild(textElement);
        },

        updateAsync: function (data, element, config, queryResponse, details, done) {
            var container = element.querySelector("#text-card-container");
            var content = element.querySelector("#text-card-content");

            this.clearErrors();

            var displayText = "";
            if (config.custom_label) {
                displayText = config.custom_label;
            } else if (data && data.length > 0) {
                var firstField = queryResponse.fields.dimension_like[0] || queryResponse.fields.measure_like[0];
                if (firstField) {
                    var cell = data[0][firstField.name];
                    displayText = cell.rendered !== undefined ? cell.rendered : (cell.value !== undefined ? cell.value : "");
                }
            }

            container.style.backgroundColor = config.bg_color || "#ffffff";
            container.style.border = "1px solid " + (config.border_color || "#dfe1e5");
            container.style.borderRadius = (config.border_radius !== undefined ? config.border_radius : 4) + "px";
            container.style.padding = "8px 16px";

            content.style.justifyContent = config.text_align === "left" ? "flex-start" : config.text_align === "right" ? "flex-end" : "center";
            content.style.textAlign = config.text_align || "center";
            content.style.fontSize = (config.font_size || 18) + "px";
            content.style.color = config.text_color || "#0033a0";
            content.style.fontWeight = config.is_bold ? "bold" : "normal";
            content.style.fontFamily = "Inter, Roboto, 'Helvetica Neue', Arial, sans-serif";

            content.innerText = displayText;

            done();
        }
    };

    looker.plugins.visualizations.add(viz);
}());
