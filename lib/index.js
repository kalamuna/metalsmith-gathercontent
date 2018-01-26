/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */

'use strict'

const fs = require('fs')
const hithercontent = require('hithercontent')
const lodash = require('lodash')

const getItemById = (obj, id) => {
  for (let i = 0; i < obj.length; i++) {
    const item = obj[i]
    if (item.id === id) {
      return item
    }
  }
}

const buildFileName = (fileName, pId, items) => {
  if (pId && pId !== 0) {
    const parent = getItemById(items, pId)
    fileName = lodash.kebabCase(parent._name) + '/' + fileName
    if (parent._parent_id) {
      return buildFileName(fileName, parent._parent_id, items)
    }
  }
  return fileName
}

const parseContent = (gcData, files, opts) => {
  gcData.flat.items.forEach(item => {
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
    file.fullData = item
    if (item.collection) {
      file.collection = item.collection
    }
    if (item.Meta_layout) {
      file.layout = `templates/layouts/${lodash.trim(item.Meta_layout)}.html.twig`
    }
    const fileName = buildFileName(file.slug, file.parentId, gcData.flat.items) + '.md'
    // A console.log('Creating virtual markdown file:', fileName, 'with layout', file.layout)
    console.log('»»»', file)
    files[fileName] = Object.assign({}, file)
  })
}

const flattenChildItems = (tier, root) => {
  tier.items.forEach(child => {
    root.push(child)
    if (child.items.length > 0) {
      flattenChildItems(child, root)
    }
  })
}

module.exports = function (opts) {
  return (files, metalsmith, done) => {
    if (!opts) {
      done()
    }
    const authPath = opts.authPath
    const auth = JSON.parse(fs.readFileSync(authPath, {encoding: 'utf8'}))
    let gatherContentData = {}
    hithercontent.init(auth)
    hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
      gatherContentData = Object.assign({flat: {items: []}}, res)
      flattenChildItems(gatherContentData, gatherContentData.flat.items)
      gatherContentData.items = null
      delete gatherContentData.items
      parseContent(gatherContentData, files, opts)
      metalsmith.metadata().gatherContent = gatherContentData
      done()
    })
  }
}
