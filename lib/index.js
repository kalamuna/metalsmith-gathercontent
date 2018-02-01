/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */

'use strict'

const fs = require('fs')
const hithercontent = require('hithercontent')
const _ = require('lodash')
const request = require('request')
const mkdirp = require('mkdirp')

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
    fileName = _.kebabCase(parent._name) + '/' + fileName
    if (parent._parent_id) {
      return buildFileName(fileName, parent._parent_id, items)
    }
  }
  return fileName
}

const mapData = (file, item, gcData, mappings) => {
  for (const [key, gcKey] of Object.entries(mappings)) {
    let val = item[gcKey]
    if (val && gcKey === 'Content_Content') {
      val = Buffer.from(val)
    } else if (val && gcKey === '_name') {
      val = _.kebabCase(val)
    } else if (val && gcKey.toLowerCase().indexOf('image') > -1 && val.length > 0) {
      /*
        @Todo: make a file object as well.
        gcKey.toLowerCase().indexOf('file')) {
      */
      if (!gcData.filesToSave) {
        gcData.filesToSave = []
      }
      if (val.length > 1) {
        const files = []
        val.forEach(file => {
          files.push({src: file})
          gcData.filesToSave.push(file)
        })
        val = files
      } else {
        const src = val[0]
        gcData.filesToSave.push(src)
        val = {src}
      }
    }
    if (val) {
      file[key] = val
    }
  }
}
const parseContent = (gcData, files, opts) => {
  gcData.flat.items.forEach(item => {
    const statusesToProcess = opts.status
    if (!opts.status || statusesToProcess.indexOf(Number(item._status.data.id)) > -1) {
      const file = {}
      file.contents = Buffer.from('')
      if (item.Meta_Collection) {
        if (item.Meta_Collection.indexOf(',') > -1) {
          file.collection = item.Meta_Collection.split(',')
          file.collection.forEach((item, i) => {
            file.collection[i] = _.trim(item.replace(/[\u200B-\u200D\uFEFF]/g, ''))
          })
        } else {
          file.collection = _.trim(item.Meta_Collection)
        }
      }
      file.parentId = item._parent_id
      if (opts.mappings) {
        mapData(file, item, gcData, opts.mappings)
      }
      file.fullData = item
      if ((!opts.mappings || !opts.mappings.contents) && item.Content_Content) {
        file.contents = Buffer.from(item.Content_Content)
      } else if (!opts.mappings || !opts.mappings.contents) {
        file.contents = Buffer.from('')
      }
      if (item.Meta_Layout && item.Meta_Layout !== '') {
        file.layout = `templates/layouts/${_.trim(item.Meta_Layout)}.html.twig`
      }
      const fileName = buildFileName(_.kebabCase(item._name), file.parentId, gcData.flat.items) + '.md'
      files[fileName] = Object.assign({}, file)
      if (opts.verbose) {
        console.log('metalsmith-gathercontent creating virtual markdown file:', fileName)
      }
    }
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
      if (gatherContentData.filesToSave && gatherContentData.filesToSave.length > 0) {
        const filesSaved = []
        gatherContentData.filesToSave.forEach(src => {
          const fileName = src.substr(src.lastIndexOf('/') + 1, src.length)
          mkdirp.sync(`${process.cwd()}/${opts.filePath}`)
          const destFileName = `${opts.filePath}/${fileName}.jpg`
          request(src).pipe(fs.createWriteStream(destFileName)).on('close', () => {
            filesSaved.push(src)
            if (opts.verbose) {
              console.log('metalsmith-gathercontent saved file:', destFileName)
            }
            if (filesSaved.length === gatherContentData.filesToSave.length) {
              done()
            }
          })
        })
      } else {
        done()
      }
    })
  }
}
