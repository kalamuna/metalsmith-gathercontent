/*
 * metalsmith-gathercontent
*/

'use strict';

var debug = require("debug")("metalsmith-swig-helpers"),
    https = require("https"),
    fs = require("fs"),
    base64 = require('base-64'),
    fetch = require("node-fetch"),
    auth = JSON.parse(fs.readFileSync('auth.json', { 'encoding': 'utf8' })),
    _str = require("underscore.string");

const options = {
  method: 'GET',
  project: {
    id: "116904"
  },
  headers: {
    'Authorization': 'Basic ' + base64.encode(auth.user + ':' + auth.key),
    'Accept': 'application/vnd.gathercontent.v0.5+json'
  }
};

module.exports = function (opts) {

  return function (files, metalsmith, done) {

    getSiteData(options, metalsmith, done);

  };

}

function getSiteData(data, metalsmith, done) {
  var url = "https://api.gathercontent.com/items/?project_id=" + options.project.id;
  fetch(url, options )
  .then( function(res) {
    return res.json();
  }).then(function(json) {
    metalsmith.metadata()['gatherContent'] = getChildrenOf(json.data, 0);
    done();
  });
}

function getChildrenOf(data, parentId) {
  var children = {};
  for(var i = 0; i < data.length; i++) {
    var item = data[i];
    if(item.parent_id == parentId) {
      item.items = getChildrenOf(data, item.id)
      children[_str.slugify(item.name)] = item;
    }
  }
  return children;
}
