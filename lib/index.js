/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */
'use strict'
const fs = require('fs')
const hithercontent = require('hithercontent')
const auth = JSON.parse(fs.readFileSync("_auth.json", { "encoding": "utf8" }))


module.exports = function (opts) {

  hithercontent.init(auth)
  
  return function (files, metalsmith, done) {
    hithercontent.getProjectBranchWithFileInfo(116902, function(res) {
      processHitherContentData( { data: res, metalsmith: metalsmith, done)
    })
  }
}

function processHitherContentData( obj, done) {
  let data = hithercontent.reduceItemToKVPairs(obj.data)
  obj.metalsmith.metadata().gatherContent = data
  done();
}
