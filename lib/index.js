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

let filesToSave = []

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

const buildImage = (item, key, gcKey, opts) => {
  let val = item[gcKey]
  const filePath = opts.filePath.substr(opts.filePath.lastIndexOf('assets/'), opts.filePath.length)
  if (val.length > 1) {
    const files = []
    val.forEach(file => {
      const fileName = `/${filePath}/${file.substr(file.lastIndexOf('/') + 1, file.length)}`
      const fileObj = {
        origin: file,
        src: fileName
      }
      files.push(fileObj)
      filesToSave.push(files)
    })
    val = files
  } else if (val[0]) {
    const src = val[0]
    const fileName = `/${filePath}/${src.substr(src.lastIndexOf('/') + 1, src.length)}`
    val = {
      origin: src,
      src: fileName
    }
    filesToSave.push(val)
  }
  if (key.toLowerCase().indexOf('__image-alt') > -1 && item[gcKey + 'alt']) {
    val.alt = item[gcKey + '__alt']
  }
  return val
}

const mapData = (obj, item, opts) => {
  for (const [key, gcKey] of Object.entries(opts.mappings)) {
    let val = item[gcKey]
    const lowerKey = key.toLowerCase()
    if (val && gcKey === 'Content_Content') {
      val = Buffer.from(val)
    } else if (val && gcKey === '_name') {
      val = _.kebabCase(val)
    } else if (val && lowerKey.lastIndexOf('__image') > -1 && lowerKey.lastIndexOf('__image') === lowerKey.length - '__image'.length) {
      val = buildImage(item, key, gcKey, opts)
    }
    if (opts.verbose && opts.logMappings && val) {
      console.log('\tmap to', obj._name, key, gcKey, val)
    }
    if (val && val !== '') {
      obj[key] = val
    }
  }
}

const mapChildData = (item, opts) => {
  item.children.forEach(child => {
    mapData(child, child, opts)
    if (child.items && child.items.length > 0) {
      child.children = child.items
      mapChildData(child, opts)
    }
  })
}

const parseContent = (flatData, files, opts) => {
  const virtualMdFiles = []
  flatData.items.forEach(item => {
    const statusesToProcess = opts.status
    if (!opts.status || statusesToProcess.indexOf(Number(item._status.data.id)) > -1) {
      const file = {}
      file.parentId = item._parent_id
      file.contents = Buffer.from('')
      const fileName = buildFileName(_.kebabCase(item._name), file.parentId, flatData.items).trim() + '.md'
      file.fileName = fileName
      files[fileName] = files[fileName] || {}
      if (Array.isArray(item.items) && item.items.length > 0) {
        files[fileName].children = item.items
        if (opts.mappings) {
          mapChildData(files[fileName], opts)
        }
      }
      if (item.Meta_Collection) {
        if (item.Meta_Collection.indexOf(',') > -1) {
          file.collection = item.Meta_Collection.split(',')
          file.collection.forEach((item, i) => {
            file.collection[i] = item.replace(/[\u200B-\u200D\uFEFF]/g, '').trim()
          })
        } else {
          file.collection = item.Meta_Collection.trim()
        }
      }
      if (opts.mappings) {
        mapData(file, item, opts)
      }
      file.fullData = item
      if ((!opts.mappings || !opts.mappings.contents) && item.Content_Content) {
        file.contents = Buffer.from(item.Content_Content)
      } else if (!opts.mappings || !opts.mappings.contents) {
        file.contents = Buffer.from('')
      }
      if (item.Meta_Layout && item.Meta_Layout.trim() !== '') {
        file.layout = item.Meta_Layout.trim()
        if (opts.verbose) {
          console.log('Applying layout', file.fileName, file.layout.trim())
        }
      }
      virtualMdFiles.push(file)
      files[fileName] = Object.assign(files[fileName], file)
      if (opts.verbose) {
        console.log('metalsmith-gathercontent creating virtual markdown file:', fileName)
      }
    }
  })
  return virtualMdFiles
}

const flattenChildItems = (currentTier, flatData) => {
  currentTier.items.forEach(child => {
    flatData.push(child)
    if (child.items.length > 0) {
      flattenChildItems(child, flatData)
    }
  })
}

const saveFiles = (opts, done) => {
  const filesSaved = []
  filesToSave.forEach(file => {
    const {src, origin} = file
    const fileName = src.substr(src.lastIndexOf('/') + 1, src.length)
    const destFileName = `${opts.filePath}/${fileName}`
    mkdirp.sync(`${process.cwd()}/${opts.filePath}`)
    request(origin).pipe(fs.createWriteStream(destFileName)).on('close', () => {
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
    filesToSave = []
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
    hithercontent.init(auth)
    hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
      const flatData = {items: []}
      const gatherContentData = res
      if (opts.saveJSON) {
        fs.writeFileSync('origin.json', JSON.stringify(res), 'utf8')
      }
      flattenChildItems(gatherContentData, flatData.items)
      parseContent(flatData, files, opts)
      Object.entries(files).forEach(file => {
        if (opts.verbose && opts.logFileContents) {
          console.log('»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»')
          console.log(file)
          console.log('»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»')
          console.log('')
        }
      })
      /*
        This is just useful, it doesn't get parsed by metalsmith (thats virtualMdFiles)
        but this data will continue to be available, for flexibility
      */
      if (opts.saveJSON) {
        fs.writeFileSync('flat.json', JSON.stringify(flatData), 'utf8')
      }
      metalsmith.metadata().gatherContent = {
        flatData,
        data: gatherContentData
      }
      if (filesToSave && filesToSave.length > 0) {
        saveFiles(opts, done)
      } else {
        done()
      }
    })
  }
}
