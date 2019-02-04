/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */

/* DONE map object id for children */
/* Todo merge template-maps and field-mapppings - with field mappings defined per template (and globally) */
/* Todo make it so that failed asset downloads emit error, but do not break the build */
/* Todo sort children based on position property and use array sort for that */
/* Todo use array filter for filtering out status-filters */
/* Todo create {% getChildDataById|id %} */
/* Todo {% inkludeChildbyId|id|templateIdOrString %} */
/* Todo {% inkludeTree %} */

'use strict'
const fs = require('fs')
const hithercontent = require('hithercontent')
const _ = require('lodash')
const request = require('request')
const mkdirp = require('mkdirp')
const fileType = require('file-type')
const readChunk = require('read-chunk')

const defaultOpts = {
  saveRemoteAssets: true,
  useLocalData: false
}

let filesToSave = {}

/* To Title Case © 2018 David Gouch | https://github.com/gouch/to-title-case */

// eslint-disable-next-line no-extend-native
const toTitleCase = function (aString) {
  'use strict'
  const articlesAndPrepositions = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i
  const alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/
  const wordSeparators = /([ :–—-])/
  return aString.split(wordSeparators)
    .map((current, index, array) => {
      if (
        /* Check for articles and prepositions words */
        current.search(articlesAndPrepositions) > -1 &&
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


const sanitizeKeys = (item) => {
  // Clean up some keys that we don't really need (right now) for filesize sake
  delete item._name
  delete item._position
  delete item._status
  delete item._tier
  delete item._overdue
  delete item._archived_by
  delete item._archived_at
  delete item._overdue
  delete item._updated_at
  delete item._created_at
  delete item._due_dates
  delete item._notes
  delete item._status
  delete item._id
  delete item._project_id
  delete item._custom_state_id
  delete item.Meta_Layout
  delete item.items
  return item
}

module.exports = function (opts) {
  const flattenItems = (currentTier, flatData) => {
      if (currentTier.items.length > 0) {
      currentTier.children = []
      currentTier.items.forEach(child => {
        flatData.push(child)
        currentTier.children.unshift(child._id)
        if (child.items.length > 0) {
          flattenItems(child, flatData)
        }
      })
      currentTier.items = null
      delete currentTier.items
    }
  }
  // Groups keys like src and alt for images and other file assets
  const buildAssetFile = (item, key, gcKey ) => {
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
    const componentMap = opts.mappings[obj._template_id];
    const globalMap = opts.mappings['global'].mappings;
    const mappings = Object.merge(globalMap, componentMap.mappings)
    if(componentMap.includeMap.length > 0) {
      componentMap.includeMap.forEach((includedMapping) => {
        console.log('mapping »»', obj._template_id, '»» include mappings from', includedMapping, opts.mappings[includedMapping])
        mappings = Object.merge(mappings, opts.mappings[includedMapping].mappings)
      })
    }
    for (const [key, gcKey] of Object.entries(mappings)) {
      let val = item[gcKey]
      const lowerKey = key.toLowerCase()
      if (opts.verbose > 2 && opts.logMappings && val) {
        console.log('Maping', obj._name, 'from', gcKey, 'to', key, 'with value', val)
      }
      if (val && gcKey === 'Content_Content') {
        // markdown content (body vs yaml frontmatter)
        val = Buffer.from(val)
      } else if (
        // is an image or a file
        val &&
        (
          (lowerKey.lastIndexOf('__image') > -1 && lowerKey.lastIndexOf('__image') === lowerKey.length - '__image'.length) ||
          (lowerKey.lastIndexOf('__file') > -1 && lowerKey.lastIndexOf('__file') === lowerKey.length - '__file'.length)
        )
      ) {
        val = buildAssetFile(item, key, gcKey)
      }
      if (val && val !== '') {
        if (typeof val === 'string') {
          val = val.trim()
        }
        delete obj[gcKey]
        obj[key] = val
      }
    }
    return obj
  }

  // do the metalsmith stuff
  return (files, metalsmith, done) => {
    // Depends on done, so inside the metalsmith return wrapper
    const pages = []
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
          const type = fileType(readChunk.sync(destFileName, 0, 4100))
          fs.rename(destFileName, `${destFileName}.${type.ext}`, err => {
            if (err) {
              console.log('Error:', err)
            }
          })
          console.log(`metalsmith-gathercontent saved file: ${destFileName} of type ${type.ext}, ${type.mime}`)
          if (filesSaved.length === Object.entries(filesToSave).length) {
            done()
          }
        }).on('error', (err) => {
          console.log('Error donloading remote asset:', err)
          if (filesSaved.length === Object.entries(filesToSave).length) {
            done()
          }
        })
      })
    }
    // Relies on `files` so inside metalsmith wrapper
    const parseContent = () => {
      flatData.items.forEach(item => {
        const file = {}
        file.contents = Buffer.from('')
        const fileName = buildFileName(_.kebabCase(item._name), item._parent_id, flatData.items).trim() + '.md'
        let page = {}
        if (files[fileName]) {
          page = files[fileName]
        }
        // Some default mappings to target certain metalsmith conventions
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
        if (item._name) {
          item.name = toTitleCase(item._name)
          item._slug = _.kebabCase(item._name)
        }
        if ((!opts.mappings || !opts.mappings.contents) && item.Content_Content) {
          file.contents = Buffer.from(item.Content_Content)
        } else if (!opts.mappings || !opts.mappings.contents) {
          file.contents = Buffer.from('')
        }
        if (item.Meta_Layout && item.Meta_Layout.trim() !== '') {
          item._layout = item.Meta_Layout.trim()
        }
        if (item._custom_state_id) {
          item._published_status = item._custom_state_id
        }
        // Map data if needed
        if (opts.mappings) {
          mapData(file, item)
        }
        // if we want this to be a page in metalsmith
        if ((opts.includeAsFile && opts.includeAsFile.includes(fileName)) || !opts.includeAsFile) {
          pages.unshift(Object.assign(page,file))
          files[fileName] = Object.assign(page, file)
          if (opts.verbose > 0) {
            console.log('metalsmith-gathercontent creating virtual markdown file:', fileName)
          }
        }
        // Clean up keys (mostly to save on file sizes and make parsed.json legible)
        item = sanitizeKeys(item)
      })
    }
    // Relies on `done` so within the metalsmith return wrapper
    const postParsing = (filesToSave, flatData) => {
      metalsmith.metadata().gatherContent = {
        flatData,
        templateMap: opts.templateMappings
      }
      if (opts.saveJSON) {
        console.log('Saving parsed.json file')
        fs.writeFileSync('parsed.json', JSON.stringify(pages), 'utf8')
      }
      if (opts.saveRemoteAssets === true) {
        if (filesToSave && Object.entries(filesToSave).length > 0) {
          saveFiles(done)
        } else {
          done()
        }
      } else {
        done()
      }
    }

    // Start the process…
    filesToSave = {}
    if (!opts) {
      done()
    } else if (!opts.authPath) {
      console.log('Metalsmith GatherContent requires an _auth.json file to function properly passing callback to next plugin…')
      done()
    }
    // Retrieve the GatherContent authentication data.
    let auth = {
      user: process.env.GATHERCONTENT_USER,
      akey: process.env.GATHERCONTENT_AKEY
    }
    let gatherContentData
    let flatData = {
      items: []
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
    } else {
      hithercontent.init(auth)
      hithercontent.getProjectBranchWithFileInfo(opts.projectId, hithercontent.reduceItemToKVPairs, res => {
        gatherContentData = res
        if (opts.saveJSON) {
          console.log('Saving hithercontent json file')
          fs.writeFileSync('hithercontent.json', JSON.stringify(res), 'utf8')
        }
        flattenItems(gatherContentData, flatData.items)
      })
    }
    parseContent()
    postParsing()
  }
}
