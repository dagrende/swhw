var d3 = require('d3');
var $ = require('jquery');
var _ = require('lodash');

var nodeWidth = 41;
var nodeHeight = 15;
var rtdbsigRadius = 12;

function getNodesLinksGroups(objs) {
  var typeClass = {
    ecu: 'node', layer: 'node', xpin: 'node', swcomp: 'node', rtdbsig: 'node', canmsg: 'node',
    grayarrow: 'link', blackarrow: 'link', blackwhitearrow: 'link', partof: 'link'
   };
  var nodeIndexById = {};
  var groupIndexById = {};
  var nodes = [], groups = [], links = [], otherLinks = [];

  // make index of all nodes and groups
  var objById = _.indexBy(objs, 'id');

  // find the groups - objs that are referred by container attributes
  _.each(objs, function(obj) {
    if (typeClass[obj.type] === 'node' && obj.container && objById[obj.container]) {
      var groupIndex = groupIndexById[obj.container];
      if (groupIndex === undefined) {
        var group = objById[obj.container];
        groupIndexById[obj.container] = groups.length;
        group.leaves = [];
        group.groups = [];
        groups.push(group);
      }
    }
  });

  // collect all nodes - objs that are not not groups
  _.each(objs, function(obj) {
    if (typeClass[obj.type] === 'node' && groupIndexById[obj.id] === undefined) {
        var nodeIndex = nodes.length;
        nodeIndexById[obj.id] = nodeIndex;
        obj.width = 60;
        obj.height = 40;
        nodes.push(obj);

        // if in a group - add it to the group as a leave
        if (obj.container && objById[obj.container]) {
          objById[obj.container].leaves.push(nodeIndex);
        }
    }
  });

  // collect groups that are inside groups
  _.each(groups, function(group) {
    if (group.container && objById[group.container]) {
      objById[group.container].groups.push(groupIndexById[group.id]);
    }
  });

  // collect all links and set source, target to node indices
  _.each(objs, function(obj) {
    if (typeClass[obj.type] === 'link') {
      var source = nodeIndexById[obj.from];
      var target = nodeIndexById[obj.to];
      if (source !== undefined && target !== undefined) {
        obj.source = source;
        obj.target = target;
        links.push(obj);
      } else {
        var objSource = objById[obj.from];
        var objTarget = objById[obj.to];
        if (objSource && objTarget) {
          obj.source = objSource;
          obj.target = objTarget;
          otherLinks.push(obj);
        }
      }


    }
  });

  return {nodes: nodes, groups: groups, links: links, otherLinks: otherLinks};
}

function GroupsRenderer(extensions) {
  var bounds = new Bounds();
  var extensions = extensions || [];

  return {
    bounds: bounds,
    // renders objects in parent
    // returns outer bounds {min: {x: , y: }, max: {x: , y: }} of all objects together after rendering
    render: function(parent, objects) {
      var width = 900,
          height = 600;

      var color = d3.scale.category20();

      var force = cola.d3adaptor()
          .linkDistance(100)
          .avoidOverlaps(true)
          .handleDisconnected(false)
          .size([width, height]);

      graph = getNodesLinksGroups(objects.objs);
      console.log(graph);

      force
          .nodes(graph.nodes)
          .links(graph.links)
          .groups(graph.groups)
          .start();

      var group = parent.selectAll(".group")
          .data(graph.groups)
        .enter().append("rect")
          .attr("rx", 8).attr("ry", 8)
          .attr("class", "group")
          .style("fill", function (d, i) { return color(i); });

      var link = parent.selectAll(".link")
          .data(graph.links.concat(graph.otherLinks))
        .enter().append("line")
          .attr("class", "link")
          .attr('marker-end', 'url(#markerArrowEndBlack)');

      var pad = 3;
      var node = parent.selectAll(".node")
          .data(graph.nodes)
        .enter().append("rect")
          .attr("class", "node")
          .attr("width", function (d) { return d.width - 2 * pad; })
          .attr("height", function (d) { return d.height - 2 * pad; })
          .attr("rx", 5).attr("ry", 5)
          .style("fill", function (d) { return color(graph.groups.length); })
          .call(force.drag);

      var label = parent.selectAll(".label")
          .data(graph.nodes)
         .enter().append("text")
          .attr("class", "label")
          .text(function (d) { return d.id; })
          .call(force.drag);

      node.append("title")
          .text(function (d) { return d.name; });

      force.on("tick", function () {

        parent.selectAll(".link")
          .each(function(d) {
            var p1 = {
              x: d.source.x || (d.source.bounds.x + d.source.bounds.X) / 2,
              y: d.source.y || (d.source.bounds.y + d.source.bounds.Y) / 2
            };
            var s1 = {
              width: d.source.width || (d.source.bounds.X - d.source.bounds.x),
              height: d.source.height || (d.source.bounds.Y - d.source.bounds.y)
            };
            var r1 = {
              x: p1.x - s1.width / 2,
              y: p1.y - s1.height / 2,
              width: s1.width,
              height: s1.height
            };
            var p2 = {
              x: d.target.x || (d.target.bounds.x + d.target.bounds.X) / 2,
              y: d.target.y || (d.target.bounds.y + d.target.bounds.Y) / 2
            };
            var s2 = {
              width: d.target.width || (d.target.bounds.X - d.target.bounds.x),
              height: d.target.height || (d.target.bounds.Y - d.target.bounds.y)
            };
            var r2 = {
              x: p2.x - s2.width / 2,
              y: p2.y - s2.height / 2,
              width: s2.width,
              height: s2.height
            };
            adjustToRectEdge(p1, p2, r2);
            adjustToRectEdge(p2, p1, r1);
            d3.select(this)
                .attr("x1",  p1.x)
                .attr("y1", p1.y)
                .attr("x2", p2.x)
                .attr("y2", p2.y);
        });

        parent.selectAll(".node").attr("x", function (d) { return d.x - d.width / 2 + pad; })
            .attr("y", function (d) { return d.y - d.height / 2 + pad; });

        parent.selectAll(".group").attr("x", function (d) { return d.bounds.x; })
             .attr("y", function (d) { return d.bounds.y; })
            .attr("width", function (d) { return d.bounds.width(); })
            .attr("height", function (d) { return d.bounds.height(); });

        parent.selectAll(".label").attr("x", function (d) { return d.x; })
             .attr("y", function (d) {
                 var h = this.getBBox().height;
                 return d.y + h/4;
             });
        bounds.updateBoundsCentered(graph.nodes);
      });
    return bounds;
  }
};
}

// render ECUs (node) and colored CAN buses (relation)
function SwHwRenderer(extensions) {
var bounds = new Bounds();
var extensions = extensions || [];

return {
  bounds: bounds,
  // renders objects in parent
  // returns outer bounds {min: {x: , y: }, max: {x: , y: }} of all objects together after rendering
  render: function(parent, objects) {
    var objectsByType = _.groupBy(objects.objs, 'type');
    // register missing types with empty list
    var nodeById = _.indexBy(objects.objs, 'id');

    function handleRelationType(rels, relClass) {
      var relation = parent.selectAll('.relation.' + relClass)
          .data(rels || [], function(d) {return d.id;});
      var relationEnter = relation.enter().append('line')
          .attr('class', 'relation ' + relClass);
      var relationExit = relation.exit().remove();

      return {relation: relation, enter: relationEnter, exit: relationExit};
    }
    handleRelationType(objectsByType.partof, 'partof')
      .relation
      .attr('stroke', 'gray')
      .attr('stroke-width', 4)
      .attr('stroke-dasharray', '4 4');
    handleRelationType(objectsByType.grayarrow, 'grayarrow')
      .relation
      .attr('stroke', '#777777')
      .attr('stroke-width', 2);
    handleRelationType(objectsByType.blackarrow, 'blackarrow')
      .relation
      .attr('stroke', 'black')
      .attr('stroke-width', 2);
    handleRelationType(objectsByType.blackwhitearrow, 'blackwhitearrow')
      .relation
      .attr('stroke', 'black')
      .attr('stroke-width', 2);

      // Create/update/delete node with rectangle and text
      function handleNodeType(objects, nodeClass) {
        var node = parent.selectAll('.node.' + nodeClass)
          .data(objects, function(d) {return String(d.id)});
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node ' + nodeClass);
        nodeEnter.append('rect')
            .attr('class', 'noderect');
        node.select('.noderect')
            .attr('width', nodeWidth)
            .attr('height', nodeHeight)
            .attr('stroke', 'black');
        nodeEnter.append('text');
        var nodeExit = node.exit().remove();
        crudText(node);
        return {node: node, enter: nodeEnter, exit: nodeExit};
      }

      function crudText(node) {
        var nodeRows = node.select('text').selectAll('tspan')
          .data(function(d) {return [d.title]});
        nodeRows.enter().append('tspan')
             .attr('x', '.6em').attr('dy', '1em');
        nodeRows.text(function(d) {return d});
        nodeRows.attr('fill', 'black');
        nodeRows.exit().remove();
      }

      // Create/update/delete node with circle and text
      function crudCircleNode(objects, nodeClass, r) {
        var node = parent.selectAll('.node.' + nodeClass)
          .data(objects, function(d) {return String(d.id)});
        var nodeEnter = node.enter().append('g')
            .attr('class', 'node ' + nodeClass);
        nodeEnter.append('circle')
            .attr('class', 'nodecircle');
        node.select('.nodecircle')
            .attr('r', r)
            .attr('stroke', 'black');
        nodeEnter.append('text');
        var nodeExit = node.exit().remove();

        crudText(node);
        return {node: node, enter: nodeEnter, exit: nodeExit};
      }

      handleNodeType(objectsByType.ecu, 'ecu').node
        .attr('fill', '#999999')
        .call(sizeRectAroundText);

      handleNodeType(objectsByType.layer, 'layer').node
        .attr('fill', '#2FC726')
        .call(sizeRectAroundText);

      handleNodeType(objectsByType.swcomp, 'swcomp').node
        .attr('fill', '#FEB0BF')
        .call(sizeRectAroundText);

      handleNodeType(objectsByType.xpin, 'xpin').node
        .attr('fill', '#81EE7E')
        .call(sizeRectAroundText);

      var canmsg = handleNodeType(objectsByType.canmsg, 'canmsg');
      canmsg.node.attr('fill', '#FBA16C')
        .call(sizeRectAroundText)
        .select('rect').attr('rx', 10).attr('ry', 10);

      // add centered circle
      canmsg.enter.each(function(d) {
        var g = d3.select(this);
        g.append('circle')
          .attr('r', 12)
          .attr('cx', g.select('rect').attr('width') / 2)
          .attr('cy', g.select('rect').attr('height') / 2)
          .attr('fill', '#FB4C09')
          .attr('stroke', 'black');
      });

      crudCircleNode(objectsByType.rtdbsig, 'rtdbsig', rtdbsigRadius).node
        .attr('fill', 'white')
        .call(adjustCircleText(rtdbsigRadius));

      // size node rect around text
      function sizeRectAroundText(nodeSel) {
        nodeSel.each(function(d, i) {
          var textBBox = d3.select(this).select('text').node().getBBox();
          var width = Math.max(40, textBBox.width) + textBBox.x * 2.0;
          var height = Math.max(40, textBBox.height) + textBBox.y * 2.1;
          d3.select(this).select('rect')
            .attr('width', width)
            .attr('height', height);
          d.width = width;
          d.height = height;
        });
      }

      function adjustCircleText(r) {
        return function(nodeSel) {
          nodeSel.each(function(d, i) {
            var textBBox = d3.select(this).select('text').node().getBBox();
            var width = Math.max(40, textBBox.width) + textBBox.x * 2.0;
            var height = Math.max(50, textBBox.height) + textBBox.y * 2.1;
            d3.select(this).select('circle')
              .attr('cx', width / 2.0)
              .attr('cy', height / 2.0);
            d.width = Math.max(width, r * 2.0);
            d.height = Math.max(height, r * 2.0);
          });
        };
      }

      var nodes = [].concat(
        objectsByType.ecu,
        objectsByType.canmsg,
        objectsByType.rtdbsig,
        objectsByType.layer,
        objectsByType.swcomp,
        objectsByType.xpin);
      var rels = [].concat(
        objectsByType.partof,
        objectsByType.grayarrow,
        objectsByType.blackarrow,
        objectsByType.blackwhitearrow);
      _.each(extensions, function(extension) {extension(parent, nodes, rels, nodeById, bounds)});

      return bounds;
    }
  };
}

function SimpleLayoutExtension(parent, objects, rels, nodeById, bounds) {
  console.log('objects',objects,'rels',rels);
  var classification = {
    ecu: {id: 'id', isRelation: false, title: 'id'},
    layer: {id: 'id', isRelation: false, title: 'id'},
    swcomp: {id: 'id', isRelation: false, title: 'id'},
    xpin: {id: 'id', isRelation: false, title: 'id'},
    rtdbsig: {id: 'id', isRelation: false, title: 'id'},
    canmsg: {id: 'id', isRelation: false, title: 'id'},

    grayarrow: {id: 'id', isRelation: true, source: 'from', target: 'to', title: 'id'},
    blackarrow: {id: 'id', isRelation: true, source: 'from', target: 'to', title: 'id'},
    blackwhitearrow: {id: 'id', isRelation: true, source: 'from', target: 'to', title: 'id'},
    partof: {id: 'id', isRelation: true, source: 'parent', target: 'child', title: 'id'}
  };

  var nodes = [], groups = [];
  _.each(objects, function(obj) {
    if (obj.container) {
//      nodeById[obj.container].isGroup = true;
    }
  });
  _.each(objects, function(obj) {
    if (obj.isGroup) {
      groups.push(obj);
    } else {
      nodes.push(obj);
    }
  });
  _.each(objects, function(obj) {
    if (obj.container) {
      var container = nodeById[obj.container];
      if (obj.isGroup) {
        container.groups = container.groups || [];
        container.groups.push(groups.indexOf(obj))
      } else {
        container.leaves = container.leaves || [];
        container.leaves.push(nodes.indexOf(obj))
      }
    }
  });
  console.log('nodes',nodes,'groups',groups);
  groups.forEach(function (g) { g.padding = 0.01; });

  _.each(rels, function(rel) {
    rel.source = nodeById[rel[classification[rel.type].source]];
    rel.target = nodeById[rel[classification[rel.type].target]];
  });

  var force = cola.d3adaptor()
    .linkDistance(150)
    .nodes(nodes)
    .links(rels || _.slice([]))
    .groups(groups)
    .avoidOverlaps(true)
    .start(10,15,20);

  d3.selectAll('.node').call(force.drag);

  force.on('tick', function() {
    parent.selectAll('.relation').each(function(d) {
      d3.select(this)
        .attr('x1', function(d) {return d.source.x + d.source.width / 2;})
        .attr('y1', function(d) {return d.source.y + d.source.height / 2;})
        .attr('x2', function(d) {return d.target.x + d.target.width / 2;})
        .attr('y2', function(d) {return d.target.y + d.target.height / 2;});
    });

    parent.selectAll('.node')
        .each(function(d) {
          var item = d3.select(this);
          if (d.isGroup) {
            item
                .attr('transform', function(d) {return 'translate(' + d.bounds.x + ',' + d.bounds.y + ')';})
                .select('.noderect')
                .attr('width', function(d) {return d.bounds.width();})
                .attr('height', function(d) {return d.bounds.height();});
          } else {
            item.attr('transform', function(d) {return 'translate(' + d.x + ',' + d.y + ')';})
          }
        });
    bounds.updateBounds(nodes);
  });
}

function Bounds() {
  var listeners = [];
  return {
    min: {x: 0, y: 0},
    max: {x: 0, y: 0},
    onChange: function(listener) {listeners.push(listener);},
    fireChange: function() {_.each(listeners, function(listener) {listener(this)}.bind(this))},
    // update bounds with rectangles that have x,y in top left corner
    updateBounds: function(objs) {
      this.min.x = this.max.x = objs.length ? objs[0].x : 0;
      this.min.y = this.max.y = objs.length ? objs[0].y : 0;
      _.each(objs, function(obj, i) {
        this.min.x = Math.min(this.min.x, obj.x);
        this.min.y = Math.min(this.min.y, obj.y);
        this.max.x = Math.max(this.max.x, obj.x + (obj.width || 0));
        this.max.y = Math.max(this.max.y, obj.y + (obj.height || 0));
      }.bind(this));
      this.fireChange();
    },
    // update bounds with rects that are centered around x,y
    updateBoundsCentered: function(objs) {
      this.min.x = this.max.x = objs.length ? objs[0].x - objs[0].width / 2 : 0;
      this.min.y = this.max.y = objs.length ? objs[0].y - objs[0].height / 2 : 0;
      _.each(objs, function(obj, i) {
        this.min.x = Math.min(this.min.x, obj.x - (obj.width || 0) / 2);
        this.min.y = Math.min(this.min.y, obj.y - (obj.height || 0) / 2);
        this.max.x = Math.max(this.max.x, obj.x + (obj.width || 0) / 2);
        this.max.y = Math.max(this.max.y, obj.y + (obj.height || 0) / 2);
      }.bind(this));
      this.fireChange();
    }
  };
}

// sets result.x/.y to the crossing of two lines defined by points 1-2 and 3-4
function lineCrossing(result, x1, y1, x2, y2, x3, y3, x4, y4) {
  var px = ((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-((y1-y2)*(x3-x4)));
  var py = ((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/((x1-x2)*(y3-y4)-((y1-y2)*(x3-x4)));
  result.x = px;
  result.y = py;
}

// change point rp so that line p-rp stops at the edge of rect r
// p, rp have x, y
// r has x, y, width, height
function adjustToRectEdge(p, rp, r) {
  var x3, y3, x4, y4;
  var dx = rp.x - p.x;
  var dy = rp.y - p.y;
  var k = dx == 0 ? 1000000 : dy / dx;
  var rk = r.height / r.width;
  x3 = r.x;
  y3 = r.y;
  if (Math.abs(k) < Math.abs(rk)) {
    // line crosses left or right rect edge
    x4 = r.x;
    y4 = r.y + r.height;
    if (dx < 0) {
      // line crosses right edge
      x3 += r.width;
      x4 += r.width;
    }
  } else {
    // line crosses top or bottom rect edge
    x4 = r.x + r.width;
    y4 = r.y;
    if (dy < 0) {
      // line crosses bottom edge
      y3 += r.height;
      y4 += r.height;
    }
  }
  lineCrossing(rp, p.x, p.y, rp.x, rp.y, x3, y3, x4, y4);
}

// use var v = new ModelViewer(site); to create
// an svg element the model in the site element (a d3 selection)
// and render it with v();
function ModelViewer(site) {
  var objects;
  var renderers = {
    'swhw': new GroupsRenderer()
//    'swhw': new SwHwRenderer([SimpleLayoutExtension])
  };

  function render() {
    if (objects) {
      var svg = site.selectAll('svg')
        .data([1]);
      var svgEnter = svg.enter().append('svg');

      var defs = svgEnter.append('defs');
      var markerData = [
        {name: 'markerArrowEndBlack', refX: 10, pathd: 'M0,-5 L10,0 L0,5 z', color: 'black'}
      ];
      defs.selectAll('marker')
        .data(markerData).enter().append('marker')
        .attr('id', function(d) {return d.name})
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', function(d) {return d.refX})
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .attr('fill', function(d) {return d.color})
        .attr('stroke', function(d) {return d.color})
        .append('path')
          .attr('d', function(d) {return d.pathd});


      var renderer = renderers[objects.renderer];
      renderer.bounds.onChange(function(bounds) {
        var margin = 10;
        svg
        .attr('width', bounds.max.x - bounds.min.x + 2 * margin)
        .attr('height', bounds.max.y - bounds.min.y + 2 * margin)
        .attr('viewBox', ''
          + (bounds.min.x - margin) + ' ' + (bounds.min.y - margin) + ' '
          + (bounds.max.x - bounds.min.x + 2 * margin) + ' ' + (bounds.max.y - bounds.min.y + 2 * margin));
      });
      renderer.render(svg, objects);
    }
  }

  // setter/getter for model, that has structure:
  // {renderer: 'renderername', objs: [...]}
  render.objects = function(newObjects) {
    if (!newObjects) {return objects;}
    objects = newObjects;
    return this;
  }

  return render;
}

module.exports = ModelViewer;
