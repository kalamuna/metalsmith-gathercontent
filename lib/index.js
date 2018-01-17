/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */
'use strict'
const fs = require('fs')
const hithercontent = require('hithercontent')

module.exports = function (opts) {

  
  return function (files, metalsmith, done){

    console.log("» »»»",opts);// opts["metalsmith-gathercontent"]) // opts['metalsmith-gathercontent'])
  
    const authPath = opts['metalsmith-gathercontent'].authPath
    const auth = JSON.parse(fs.readFileSync( authPath, { "encoding": "utf8" }))

    let gatherContentData = {}
    hithercontent.init(auth)


    hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, function(res) {
      console.log( res )
      gatherContentData = res
      console.log('»»»»', gatherContentData.items.length)
    })

    // gatherContentData.items.forEach(function(item) {
    //   console.log( "»»", item.name )
    // })

    metalsmith.metadata().gatherContent = gatherContentData

    // loop through files;
    // console.log(gatherContentData);
    // done()
  }
}
