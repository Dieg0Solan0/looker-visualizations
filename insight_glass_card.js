looker.plugins.visualizations.add({
  id: "insight_glass_card",
  label: "Insight Glass Card",
  options: {},

  create: function(element, config) {
    element.innerHTML = "<p style='color:red;font-size:20px;padding:20px;'>TEST OK - create() funcionó</p>";
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    element.innerHTML = "<p style='color:green;font-size:16px;padding:20px;'>TEST OK - updateAsync() funcionó<br>Filas: " + data.length + "</p>";
    done();
  }
});
