/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
 */
'use strict'
const fs = require('fs')
const base64 = require('base-64')
const fetch = require('node-fetch')
const _str = require('underscore.string')

const auth = JSON.parse(fs.readFileSync('auth.json', {
  encoding: 'utf8'
}))

// @Todo make options part of opts from metalsmith when ready
const options = {
  cacheBaseName: 'gathercontent',
  method: 'GET',
  project: {
    id: '116904'
  },
  headers: {
    Authorization: 'Basic ' + base64.encode(auth.user + ':' + auth.key),
    Accept: 'application/vnd.gathercontent.v0.5+json'
  }
}

const cacheFn = `${options.cacheBaseName}_${options.project.id}.json`

/** The data were using as a cache (to test modify dates against before requesting stuff) */
let cache = {}

/** Tests if we have a cache file? */
if (cacheExists(cacheFn)) {
  cache = loadJSONCache(cacheFn)
} else {
  cache = {
    data: []
  }
  writeJSONFile(cacheFn, cache)
}

module.exports = function (opts) {
  return function (files, metalsmith, done) {
    getProject(opts, metalsmith, done)
    .then(json => {
      return updateItems(json)
    })
    .then(results => {
      // Update cache based on results of updateItems
      // console.log("»»»»»» ", results)
      results.forEach(el => {
        hasFiles(el)
        const itemToUpdate = getItemById(cache.data, el.data.id)
        Object.assign(itemToUpdate,el.data)
      })
      saveCache()
    }).then(() => {
      const project = getStructuredData(cache.data)
      metalsmith.metadata().gathercontent = project
      writeJSONFile('project.json', project)
      done()
    }).catch(err => {
      console.log('Error', err)
    })
  }
}

function hasFiles(el) {
  console.log("—– hasFiles »»", el.config)
  return (el.config && el.config.elements)
}

function getProject(opts, metalsmith, done) {
  console.log('» Requesting items from project', options.project.id)
  const url = `https://api.gathercontent.com/items/?project_id=${options.project.id}`
  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then(res => res.json())
      .then(json => {
        return (typeof json === 'object') ? resolve(json) : reject(json)
      }).catch(err => {
        console.log('Error', err)
        done()
      })
  })
}

function updateItems(json) {
  const requests = []
  json.data.forEach(el => {
    const cachedItem = getItemById(cache.data, el.id)
    if (!cachedItem) {
      cache.data.push(el)
      requests.push(getItem(el.id))
      console.log(`» Creating and requesting data for item ${el.name}, (${el.id})`)
    } else if (cachedItem.updated_at.date !== el.updated_at.date) {
      console.log(`» Requesting updated data for item ${el.name}, (${el.id})`)
      requests.push(getItem(el.id))
    }
  })
  return Promise.all(requests).then(res => {
    console.log(res)
    return res
  })
}

function getItem(itemId) {
  const url = `https://api.gathercontent.com/items/${itemId}`
  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then(res => res.json())
      .then(json => {
        console.log("getItem »»»", json)
        if(typeof json === 'object') {
          resolve(json)
        } else {
          reject(json)
        }
      }).catch(err => {
        console.log('Error: ', err)
      })
  })
}

function getFiles(itemId) {
  const url = `https://api.gathercontent.com/items/${itemId}/files`
  return new Promise((resolve, reject) => {
    fetch(url, options)
      .then(res => res.json())
      .then(json => {
        return (typeof json === 'object') ? resolve(json) : reject(json)
      }).catch(err => {
        console.log('Error: ', err)
      })
  })
}

function getItemById(iterable, itemId) {
  if (!isIterable(iterable)) {
    console.log('Error, getItemById passed a non iterable object')
    return false
  }
  return iterable.find(el => {
    return el.id === itemId
  })
}

function getStructuredData(data) {
  const project = {
    pages: {}
  }
  /* This code can probably be incorporated as some custom call to getChildrenOf
  *  but for purposes of getting something working out this may do for now.
  */
  data.forEach(el => {
    if (el.parent_id === 0) {
      project.pages[_str.slugify(el.name)] = {}
      const newEl = project.pages[_str.slugify(el.name)]
      newEl.name = el.name
      newEl.parentId = el.parent_id
      newEl.id = el.id
      newEl.notes = el.notes
      newEl.type = el.type
      // maybe this is a submethod?
      if (el.config) {
        if (el.config[0]) {
          if( el.config[0].elements) {
            newEl.components = [];
            el.config[0].elements.forEach((el,index) => {
              newEl.components[index] = {}
              var component = newEl.components[index]
              component = {
                type: el.type,
                name: el.name,
              }
              if(el.title) component.title = el.title
              if(el.subtitle) component.subtitle = el.subtitle
              if(el.label) component.label = el.label
              if(el.value) component.value = el.value
            })
            newEl.components = el.config[0].elements
          }
        }
      }
      newEl.children = getChildrenOf(newEl, data)
    }
  })
  return project
}

function getChildrenOf(parent, data) {
  const children = []
  data.forEach(el => {
    if (el.parent_id === parent.id) {
      const newEl = {}
      newEl.name = el.name
      newEl.parentId = el.parent_id
      newEl.id = el.idea
      newEl.notes = el.notes
      newEl.type = el.type
      if (el.config) {
        if (el.config[0]) {
          if( el.config[0].elements) {
            newEl.components = [];
            el.config[0].elements.forEach((el,index) => {
              newEl.components[index] = {}
              var component = newEl.components[index]
              component = {
                type: el.type,
              }
              if(el.title) component.title = el.title
              if(el.subtitle) component.subtitle = el.subtitle
              if(el.label) component.label = el.label
              if(el.value) component.value = el.value
            })
            newEl.components = el.config[0].elements
          }
        }
      }
      children.push(newEl)
      // Recursively get children
      newEl.children = getChildrenOf(el, data)
    }
  })
  return children
}

// Ssync for now... we dont want to do stuff while file is being written
// Less callback juggling.
function writeJSONFile(fn, data) {
  console.log('» Writing data to to', fn)
  fs.writeFileSync(fn, JSON.stringify(data), 'utf8')
}

function saveCache() {
  writeJSONFile(cacheFn, cache)
}

function loadJSONCache(fn) {
  return JSON.parse(fs.readFileSync(fn, 'utf8'))
}

function cacheExists(fn) {
  try {
    const stat = fs.statSync(fn)
    return stat.isFile()
  } catch (err) {
    return false
  }
}

function isIterable(obj) {
  // Checks for null and undefined
  if (obj === null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}
