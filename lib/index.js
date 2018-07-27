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
const filesToSave = []

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

const mapData = (file, item, gcData, opts) => {
  for (const [key, gcKey] of Object.entries(opts.mappings)) {
    let val = item[gcKey]
    let lowerKey = key.toLowerCase()
    if (val && gcKey === 'Content_Content') {
      val = Buffer.from(val)
    }
    else if (val && gcKey === '_name') {
      val = _.kebabCase(val)
    }
    else if (
      val && (
        lowerKey.lastIndexOf('__image') === lowerKey.length - '__image'.length ||
        lowerKey.indexOf('__file') > -1
      )) {
      /* @Todo support attachments as well */
      /* @Todo support alt tags possibly classes etc */
      const filePath = opts.filePath.substr(opts.filePath.lastIndexOf('assets/'), opts.filePath.length)
      if (typeof val === 'Array') {
        const files = []
        val.forEach(file => {
          const fileName = '/assets/files/gathercontent/' + file.substr(file.lastIndexOf('/') + 1, file.length) + '.jpg'
          files.push({
            origin: src,
            src: fileName
          })
          filesToSave.push(file)
        })
        val = files
      }
      else {
        const src = val[0]
        const fileName = filePath + src.substr(src.lastIndexOf('/') + 1, src.length) + '.jpg'
        filesToSave.push(src)
        val = {
          origin: src,
          src: fileName
        }
      }
      if (key.toLowerCase().indexOf('__imagealt') > -1 && item[gcKey + 'alt']) {
        val.alt = item[gcKey + '__alt']
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
        }
        else {
          file.collection = _.trim(item.Meta_Collection)
        }
      }
      file.parentId = item._parent_id
      if (opts.mappings) {
        mapData(file, item, gcData, opts)
      }
      file.fullData = item
      if ((!opts.mappings || !opts.mappings.contents) && item.Content_Content) {
        file.contents = Buffer.from(item.Content_Content)
      }
      else if (!opts.mappings || !opts.mappings.contents) {
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


const saveFiles = (opts, done) => {
  const filesSaved = []
  filesToSave.forEach(src => {
    const fileName = src.substr(src.lastIndexOf('/') + 1, src.length)
    mkdirp.sync(`${process.cwd()}/${opts.filePath}`)
    const destFileName = `${opts.filePath}/${fileName}.jpg`
    request(src).pipe(fs.createWriteStream(destFileName)).on('close', () => {
      filesSaved.push(src)
      if (opts.verbose) {
        console.log('metalsmith-gathercontent saved file:', destFileName)
      }
      if (filesSaved.length === filesToSave.length) {
        done()
      }
    })
  })
}

module.exports = function (opts) {
  return (files, metalsmith, done) => {
    if (!opts) {
      done()
    } else if (!opts.authPath) {
      if (opts.verbose) {
        console.log('Metalsmith GatherContent requires an _auth.json file to function properly passing callback to next plugin…')
      }
      done()
    }
    // Retrieve the GatherContent authentication data.
    let auth = {
      user: process.env.GATHERCONTENT_USER,
      akey: process.env.GATHERCONTENT_AKEY
    }
    // Use auth.json when thhe environment variables arn't provided.
    if (!auth.user) {
      auth = JSON.parse(fs.readFileSync(opts.authPath, {encoding: 'utf8'}))
    }
    let gatherContentData = {}
    hithercontent.init(auth)
    hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
      gatherContentData = Object.assign({flat: {items: []}}, res)
      flattenChildItems(gatherContentData, gatherContentData.flat.items)
      gatherContentData.items = null
      delete gatherContentData.items
      parseContent(gatherContentData, files, opts)
      metalsmith.metadata().gatherContent = gatherContentData
      if (filesToSave && filesToSave.length > 0) {
        saveFiles(opts, done);
      }
      else {
        done()
      }
    })
  }
}
