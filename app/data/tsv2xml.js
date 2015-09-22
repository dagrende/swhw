var fs = require('fs'),
    readline = require('readline');

var rd = readline.createInterface({
    input: fs.createReadStream('ae.tsv'),
    output: process.stdout,
    terminal: false
});

var titles, xml = '';
var i = 0;
rd.on('line', function(line) {
    // console.log(i,':', line);
    if (i == 0) {
      titles = line.trim().split('\t').map(function(title) {return title.replace(' ', '_')});
    } else {
      xml += line.trim().split('\t').reduce(function(result, value, i) {
        return result + ' ' + titles[i] + '="' + value + '"';
      }, '  <item') + '/>\n';
    }
    i++;
});

rd.on('close' , function() {
  console.log('<?xml version="1.0" encoding="UTF-8"?>')
  console.log('<items>');
  console.log(xml);
  console.log('</items>');
});
