/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */

'use strict'

const fs = require('fs')
const hithercontent = require('hithercontent')
const lodash = require('lodash')

module.exports = function (opts) {
  return (files, metalsmith, done) => {
    const authPath = opts.authPath
    const auth = JSON.parse(fs.readFileSync(authPath, {encoding: 'utf8'}))
    let gatherContentData = {}
    hithercontent.init(auth)
    hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
      console.log('a', process.cwd())
      console.log('b', __dirname)
      gatherContentData = Object.assign({}, res)
      gatherContentData.items.forEach(item => {
        const file = {}
        file.contents = Buffer.from('')
        for (const [key, gcKey] of Object.entries(opts.mappings)) {
          if (item[gcKey]) {
            let val = item[gcKey]
            if (gcKey === 'Content_Content' && item[gcKey]) {
              val = Buffer.from(val)
            } else if (gcKey === '_name') {
              val = lodash.kebabCase(val)
            }
            file[key] = val
          }
        }
        // file.fullData = item
        if (item.collection) {
          file.collection = item.collection
        }
        if (item.Meta_layout) {
          file.layout = `@layouts/${lodash.trim(item.Meta_layout)}.html.twig`
        }
        console.log( "»»»",   file )
        const fileName = lodash.kebabCase(file.slug) + '.md'
        files[fileName] = Object.assign({}, file)
      })
      metalsmith.metadata().gatherContent = gatherContentData
      done()
    })
  }
}
