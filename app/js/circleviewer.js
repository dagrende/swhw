var d3 = require('d3');

// use var cv = new CircleViewer(site); to create
// an svg element containing circles in the site element
// and render it with cv();
function CircleViewer(site) {
  function render() {
    var svg = site.selectAll('svg')
      .data(['anything'])
      .enter().append('svg')
        .attr('width', 1000)
        .attr('height', 700);

    var circle = svg.selectAll("circle")
        .data([32, 57, 112, 293]);

    var circleEnter = circle.enter().append("circle");
    circleEnter.attr("cy", 20);
    circleEnter.attr("cx", function(d, i) { return i * 100 + 30; });
    circleEnter.attr("r", function(d) { return Math.sqrt(d); });
  }

  return render;
}

module.exports = CircleViewer;
