var d3 = require('d3');
var $ = require('jquery');
var _ = require('lodash');
var Viewer = require('./modelviewer');

var objects;

var toolbar = d3.select('#toolbar');

function maxNodeId() {
  return _.reduce(objects.objs, function(max, obj) {
    return obj.type === 'node' ? Math.max(max, obj.id) : max;
  }, 0);
}

function removeLastObject() {
  var lastObject = objects.objs.pop();
  _.remove(objects.objs, function(obj) {return obj.type === 'node' && obj.id === lastObject.id});
}

function clear() {
  objects.objs = []; viewer();
}

var svgDiv = d3.select('#graph');
svgDiv.style('height', $(window).innerHeight());
var viewer = new Viewer(svgDiv);

viewer();
// read model from file and call viewer() when ready
$.get( "data/swhw.json")
  .done(function(data) {
    objects = data;
    viewer.objects(objects);
    viewer();
  })
  .fail(function(err) {
    console.log('error', err);
  });

function makeRandomGraph(options) {
  objects.objs = [];
  for (var i = 0; i < options.objectCount; i++) {
    objects.objs.push({
      id: i,
      type: 'node',
      title: 'object' + i
    });
  }

console.log('options.relationCount',options.relationCount);
  var relCount = 0;
  var relMap = {};
  for (var i = 0; i < options.objectCount * options.objectCount && relCount < options.relationCount; i++) {
    var fromi = _.random(options.objectCount - 1),
      toi = _.random(options.objectCount - 1);
    var relKey = fromi + '_' + toi,
      relKeyRev = toi + '_' + fromi;
    if ((options.allowMultipleRelsBetweenObjectPair || !(relMap[relKey] || relMap[relKeyRev])) && (options.allowRelationToSelf || fromi != toi)) {
      var rel = {
        id: options.objectCount + relCount,
        type: 'relation',
        from: fromi,
        to: toi,
        title: relKey
      };
      relMap[relKey] = rel;
      objects.objs.push(rel);
      relCount++;
    }
  }
}
