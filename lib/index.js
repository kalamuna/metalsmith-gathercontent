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
const fileType = require('file-type')
const readChunk = require('read-chunk')
const isSvg = require('is-svg')

const defaultOpts = {
  saveRemoteAssets: true,
  useLocalData: false
}

/* To Title Case © 2018 David Gouch | https://github.com/gouch/to-title-case */

// eslint-disable-next-line no-extend-native
const toTitleCase = function (aString) {
  'use strict'
  const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i
  const alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/
  const wordSeparators = /([ :–—-])/
  return aString.split(wordSeparators)
    .map((current, index, array) => {
      if (
        /* Check for small words */
        current.search(smallWords) > -1 &&
        /* Skip first and last word */
        index !== 0 &&
        index !== array.length - 1 &&
        /* Ignore title end and subtitle start */
        array[index - 3] !== ':' &&
        array[index + 1] !== ':' &&
        /* Ignore small words that start a hyphenated phrase */
        (array[index + 1] !== '-' ||
          (array[index - 1] === '-' && array[index + 1] === '-'))
      ) {
        return current.toLowerCase()
      }
      /* Ignore intentional capitalization */
      if (current.substr(1).search(/[A-Z]|\../) > -1) {
        return current
      }
      /* Ignore URLs */
      if (array[index + 1] === ':' && array[index + 2] !== '') {
        return current
      }
      /* Capitalize the first letter */
      return current.replace(alphanumericPattern, match => {
        return match.toUpperCase()
      })
    })
    .join('')
}

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

const flattenChildItems = (currentTier, flatData) => {
  currentTier.items.forEach(child => {
    if (child.items.length > 0) {
      child.items = sortByProperty(child.items, '_position')
      flatData.push(child)
      flattenChildItems(child, flatData)
    }
    else {
      flatData.push(child)
    }
  })
}

const sortByProperty = (array, key) => {
  return array.sort(function(a, b) {
    if (typeof(a[key]) == "undefined" || typeof(b[key]) == "undefined" ) {
      return 0;  
    }
   
    const y = a[key]
    const x = a[key]  
    return ((x < y) ? -1 : ((x > y) ? 1 : 0))
  })
}

module.exports = function (opts) {
  return (files, metalsmith, done) => {
    const filesToSave = {}
    // Retrieve the GatherContent authentication data.
    let auth = {
      user: process.env.GATHERCONTENT_USER,
      akey: process.env.GATHERCONTENT_AKEY
    }
    let gatherContentData
    let flatData = {
      items: []
    }

    const saveFiles = () => {
      const filesSaved = []
      Object.entries(filesToSave).forEach(file => {
        const src = file[1].src
        const origin = file[1].origin
        const fileName = src.substr(src.lastIndexOf('/') + 1, src.length)
        const destFileName = `${opts.filePath}/${fileName}`
        mkdirp.sync(`${process.cwd()}/${opts.filePath}`)
        request(origin).pipe(fs.createWriteStream(destFileName)).on('close', () => {
          filesSaved.push(src)
          let type = fileType(readChunk.sync(destFileName, 0, 4100))
          if (type === null && isSvg(fs.readFileSync(destFileName))) {
            type = {
              ext: 'svg',
              mime: 'image/svg+xml'
            }
          }
          if (type === null) {
            console.log(`Unknown filetype ${destFileName}`)
          } else {
            fs.rename(destFileName, `${destFileName}.${type.ext}`, err => {
              if (err) {
                console.log('Error:', err)
              }
            })
            if (opts.verbose > 0) {
              console.log(`metalsmith-gathercontent saved file: ${destFileName} of type ${type.ext}, ${type.mime}`)
            }
          }
          if (filesSaved.length === Object.entries(filesToSave).length) {
            done()
          }
        })
      })
    }

    const postParsing = (filesToSave, flatData) => {
      metalsmith.metadata().gatherContent = {
        flatData,
        templateMap: opts.templateMappings
      }
      if (filesToSave && Object.entries(filesToSave).length > 0 && opts.saveRemoteAssets) {
        saveFiles(opts, done)
      } else {
        done()
      }
    }

    const buildFile = (item, key, gcKey) => {
      opts = Object.assign(defaultOpts, opts)
      let val = item[gcKey]
      const filePath = opts.filePath.substr(opts.filePath.lastIndexOf('assets/'), opts.filePath.length)
      if (val.length > 1) {
        const files = []
        val.forEach(file => {
          if (file) {
            const fileNameStub = file.substr(file.lastIndexOf('/') + 1, file.length)
            const fileName = `/${filePath}/${fileNameStub}`
            val = {
              origin: file,
              src: `${fileName}`
            }
            files.push(val)
            filesToSave[fileNameStub] = val
          }
        })
        val = files
      } else if (val[0]) {
        const src = val[0]
        const fileNameStub = src.substr(src.lastIndexOf('/') + 1, src.length)
        const fileName = `/${filePath}/${fileNameStub}`
        val = {
          origin: src,
          src: `${fileName}`
        }
        filesToSave[fileNameStub] = val
      }
      if (key.toLowerCase().indexOf('__image-alt') > -1 && item[gcKey + 'alt']) {
        val.alt = item[gcKey + '__alt']
      }
      return val
    }

    const mapData = (obj, item) => {
      for (const [key, gcKey] of Object.entries(opts.mappings)) {
        let val = item[gcKey]
        const lowerKey = key.toLowerCase()
        if (val && gcKey === 'Content_Content') {
          val = Buffer.from(val)
        } else if (val && gcKey === '_name') {
          val = toTitleCase(val)
        } else if (
          val &&
          (
            (lowerKey.lastIndexOf('__image') > -1 && lowerKey.lastIndexOf('__image') === lowerKey.length - '__image'.length) ||
            (lowerKey.lastIndexOf('__file') > -1 && lowerKey.lastIndexOf('__file') === lowerKey.length - '__file'.length)
          )
        ) {
          val = buildFile(item, key, gcKey, opts)
        }
        if (opts.verbose > 2 && opts.logMappings && val) {
          console.log('Maping', obj._name, 'from', gcKey, 'to', key, 'with value', val)
        }
        if (val && val !== '') {
          if (typeof val === 'string') {
            val = val.trim()
          }
          if (gcKey === '_name') {
            obj.slug = _.kebabCase(val)
          }
          obj[key] = val
        }
      }
    }

    const mapChildData = item => {
      item.children.forEach(child => {
        mapData(child, child, opts)
        if (child.items && child.items.length > 0) {
          child.children = child.items
          mapChildData(child, opts)
        }
      })
    }

    const parseContent = (flatData, files) => {
      flatData.items.forEach(item => {
        const statusesToProcess = opts.status
        if (!opts.status || statusesToProcess.indexOf(Number(item._status.data.id)) > -1) {
          const file = {}
          file.parentId = item._parent_id
          file.contents = Buffer.from('')
          const fileName = buildFileName(_.kebabCase(item._name), file.parentId, flatData.items).trim() + '.md'
          let page = {}
          if (files[fileName]) {
            page = files[fileName]
          }
          if (Array.isArray(item.items) && item.items.length > 0) {
            page.children = item.items
            if (opts.mappings) {
              mapChildData(page, opts)
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
            if (opts.verbose > 2) {
              console.log('Applying layout', file.fileName, file.layout.trim())
            }
          }
          if ((opts.includeAsFile && opts.includeAsFile.includes(fileName)) || !opts.includeAsFile) {
            files[fileName] = Object.assign(page, file)
            if (opts.verbose > 0) {
              console.log('metalsmith-gathercontent creating virtual markdown file:', fileName)
            }
          }
        }
      })
    }

    if (!opts) {
      done()
    } else if (!opts.authPath) {
      console.log('Metalsmith GatherContent requires an _auth.json file to function properly passing callback to next plugin…')
      done()
    }
    // Use auth.json when thhe environment variables arn't provided.
    if (!auth.user) {
      auth = JSON.parse(fs.readFileSync(opts.authPath, {
        encoding: 'utf8'
      }))
    }
    if (opts.useLocalData && fs.existsSync('parsed.json')) {
      flatData = JSON.parse(fs.readFileSync('parsed.json', {
        encoding: 'utf8'
      }))
      parseContent(flatData, files, opts)
      postParsing(filesToSave, flatData, metalsmith, done, opts)
    } else {
      hithercontent.init(auth)
      hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
        gatherContentData = res
        if (opts.saveJSON) {
          console.log('Saving hithercontent json file')
          fs.writeFileSync('hithercontent.json', JSON.stringify(res), 'utf8')
        }
        flattenChildItems(gatherContentData, flatData.items)
        parseContent(flatData, files, opts)
        Object.entries(files).forEach(file => {
          if (opts.verbose > 2 && Boolean(opts.logFileContents)) {
            console.log('»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»')
            console.log(file)
            console.log('»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»»')
            console.log('')
          }
        })
        if (opts.saveJSON) {
          console.log('Saving parsed.json file')
          fs.writeFileSync('parsed.json', JSON.stringify(flatData), 'utf8')
        }
        postParsing(filesToSave, flatData, metalsmith, done, opts)
      })
    }
  }
}
