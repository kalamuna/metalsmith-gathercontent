/*
 * Metalsmith GatherContent
 * metalsmith-gathercontent
*/

'use strict'

const fs = require('fs')
const base64 = require('base-64')
const fetch = require('node-fetch')
const _str = require('underscore.string')

const auth = JSON.parse(fs.readFileSync('auth.json', {encoding: 'utf8'}))
// @todo make options part of opts from metalsmith when ready
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
const cacheFn =  `${options.cacheBaseName}_${options.project.id}.json`

/** The data were using as a cache (to test modify dates against before requesting stuff) */
let cache = {}
/** The data were going to pass to metalsmith */


/** do we have a cache file? */
if( cacheExists(cacheFn) ) {
  cache = loadJSONCache(cacheFn)
} else {
  cache = {data:[]}
  writeJSONFile(cacheFn, cache)
}

module.exports = function (opts) {
  return function (files, metalsmith, done) {
    // requestProjectInfo(opts,metalsmith, done)
    return getProject(opts, metalsmith, done)
    .then( json => {
      return updateItems(json)
    })
    .then( results => {
      // update cache based on results
      results.forEach( function(el,i) {
        console.log(el.data.name,el.data.id)
        var itemToUpdate = getItemById( cache.data, el.data.id )
        if(!itemToUpdate) {
          cache.data.push(el)
        }
      })
      saveCache()
    }).then(() => {
      var project = getStructuredData(cache.data)
      metalsmith.metadata().gathercontent = project
      writeJSONFile('project.json', project)
      done()
    }).catch( function(err) {
      console.log("Error", err)
    })
  }
}

function getProject(opts, metalsmith, done ) {
  console.log('» Requesting items from project', options.project.id);
  const url = `https://api.gathercontent.com/items/?project_id=${options.project.id}`
  return new Promise((resolve, reject) => {
    fetch(url, options)
    .then(res => res.json())
    .then(json => {
      return resolve(json)
    }).catch( function(err) {
      console.log("Error", err)
      done()
    })
  })
}

function updateItems(json) {
  var requests = []
  json.data.forEach(function(el) {
    let cachedItem = getItemById(cache.data, el.id)
    if(!cachedItem || cachedItem.updated_at.date != el.updated_at.date ) {
      console.log(`» Requesting updated data for item ${el.name}, (${el.id})`)
      requests.push( getItem(el.id) )
    }
  })
  return Promise.all(requests).then( res => {
    return res;
  })
}

function getItem(itemId) {
  const url = `https://api.gathercontent.com/items/${itemId}`
  return new Promise((resolve,reject) => {
    fetch(url, options)
    .then(res => res.json())
    .then(json => {
      return resolve(json)
    }).catch( function(err) {
      console.log("Error: ",err)
    })
  })
}

function getFiles(itemId) {
  const url = `https://api.gathercontent.com/items/${itemId}/files`
  return new Promise((resolve,reject) => {
    fetch(url, options)
    .then(res => res.json())
    .then(json => {
      console.log("getFiles»»»»",json)
      return resolve(json)
    }).catch( function(err) {
      console.log("Error: ",err)
    })
  })
}

function getItemById(iterable, itemId) {
  if(!isIterable(iterable)) {
    console.log("Error, getItemById passed a non iterable object")
    return false
  }
  return iterable.find(function(el){
    return el.id === itemId
  })
}

function getStructuredData(data) {
  let project = { pages: {}}
  let parentId = 0;
  data.forEach(function(el) {
    let ed = el.data;
    if(ed.parent_id == parentId) {
      let newEl = project.pages[_str.slugify(ed.name)] = {}
      newEl.name = ed.name
      newEl.parent_id = ed.parent_id
      newEl.id = ed.id
      newEl.notes = ed.notes
      newEl.type = ed.type
      newEl.components = ed.config[0].elements
      newEl.children = getChildrenOf(newEl, data)
    }
  })
  return project
}

function getChildrenOf(parent, data) {
  let children = []
  data.forEach(function(el) {
    let ed = el.data
    if(ed.parent_id == parent.id) {
      let newEl = {}
      newEl.name = ed.name
      newEl.parent_id = ed.parent_id
      newEl.id = ed.idea
      newEl.notes = ed.notes
      newEl.type = ed.type
      newEl.components = ed.config[0].elements
      // recursively get children
      children.push(newEl)
      newEl.children = getChildrenOf(ed, data)

    }
  })
  return children
}

// sync for now... we dont want to do stuff while file is being written
// less callback juggling.
function writeJSONFile(fn, data) {
  console.log( '» Writing data to to', fn)
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
    let stat = fs.statSync(fn)
    return stat.isFile()
  } catch (err) {
    return false;
  }
}

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function'
}
