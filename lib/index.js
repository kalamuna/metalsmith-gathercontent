/*
 * metalsmith-gathercontent
*/

'use strict';

var debug = require("debug")("metalsmith-swig-helpers"),
    https = require("https"),
    fs = require("fs"),
    base64 = require('base-64'),
    fetch = require("node-fetch"),
    auth = JSON.parse(fs.readFileSync('auth.json', { 'encoding': 'utf8' }));

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

module.exports = plugin;

function plugin(opts) {

  return function through (files, metalsmith, done) {
    var project = requestProject(options);
    // uncomment done call once were not just console log testing
    // done();
  };

}

function requestProject(data) {
  var url = "https://api.gathercontent.com/items/?project_id=" + options.project.id;
  console.log("url", url);
  fetch(url, options )
  .then( function(res) {
    // console.log(res.statusText);
    // console.log(res.headers.raw())
    // console.log('res.text »',res.text());
    // console.log('res.body', res.body);
    // console.log(res.json())
    return res.json();
  }).then(function(json) {
        console.log(json.data);
        // recursion!
        // foreach item that have parent_id == 0 as page
        //  gathercontent.pages.unshift page
        // endforeach
        // foreach page in gathercontent.pages
        //  grab all items that have parent_id == page.id as item
        //  gathercontent.pages[page].items.unshift item
        //  foreach item in gathercontent.pages[page].items[item] as subitem
        //      grab all subitems that have ...
    });
}
