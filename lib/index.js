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

/** The project data from Gather Content to compare to the cache */
let project = {}
/** The data were using as a cache (to test modify dates against before requesting stuff) */
let cache = {}
/** The data were going to pass to metalsmith */
let data = {}

/** do we have a cache file? */
if( cacheExists(cacheFn) ) {
  cache = loadJSONCache(cacheFn)
} else {
  cache = writeJSONFile(cacheFn, {data:[]})
}

module.exports = function (opts) {

  return function (files, metalsmith, done) {
    // requestProjectInfo(opts,metalsmith, done)

    getProject(opts, metalsmith, done)
    .then( json => {
      project = json
      return updateItems(json)
    })
    .then( results => {
      // update cache based on results
      results.forEach( function(el,i) {
        var itemToUpdate = getItemById( cache.data, el.data.id )
        // update the data
        Object.assign(itemToUpdate, el.data)
      })
      saveFromCache();
      done();
    }).catch( function(err) {
      console.log("Error", err);
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
      console.log("Error", err);
    })
  })
}

function updateItems(json) {
  var requests = []
  json.data.forEach(function(el) {
    let cachedItem = getItemById(cache.data, el.id)
    if(!cachedItem) {
      console.log(`» Adding item ${el.name} (${el.id}), to cache`)
      cache.data.push(el)
    } else if(cachedItem.updated_at.date != el.updated_at.date ) {
      console.log(`» Requesting updated data for item ${el.name}, (${el.id})`)
      requests.push( getItem(el.id) )
    }
  })
  return Promise.all(requests).then( res => {
    return res;
  })
}

function getItem(itemId) {
  const url = 'https://api.gathercontent.com/items/' + itemId
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

function getItemById(iterable, itemId) {
  if(!isIterable(iterable)) {
    console.log("Error, getItemById passed a non iterable object")
    return false;
  }
  return iterable.find(function(el){
    return el.id === itemId
  })
}

function isIterable(obj) {
  // checks for null and undefined
  if (obj == null) {
    return false;
  }
  return typeof obj[Symbol.iterator] === 'function';
}

function getChildrenOf(parentId,data) {
  let children = {};
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    getItem(item, item.id)
    //console.log( '\n\n',item.name, item )
    // if (item.parent_id === parentId) {
      // getChildrenOf(item.id, data)
      children[_str.slugify(item.name)] = item.id
    // }
  }
  return children
}

function downloadFiles(files) {
  files.map(file => {
    fetch(file.url)
      .then(res => {
        console.log(`» Downloading ${file.filename}...`);
        const writeStream = fs.createWriteStream(file.filename);
        res.body.pipe(writeStream);
      });
  });
}

function requestFiles(itemId) {
  fetch(`https://api.gathercontent.com/items/${ITEM_ID}/files`, options)
    .then(function(res) {
        return res.json();
    }).then(function(json) {
        downloadFiles(json.data);
    }).catch(err => console.log)
}

// sync for now... we dont want to do stuff while file is being written
// less callback juggling.
function writeJSONFile(fn, data) {
  console.log( '» Writing data to to', fn)
  fs.writeFileSync(fn, JSON.stringify(data), 'utf8')
}

function saveFromCache() {
  writeJSONFile(cacheFn, cache)
}

function loadJSONCache(fn) {
  return JSON.parse(fs.readFileSync(fn, 'utf8'))
}

function cacheExists(fn) {
  try {
    let stat = fs.statSync(fn)
    return stat.isFile();
  } catch (err) {
    return false;
  }
}

function isEquivalent(a, b) {
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if (a[propName] !== b[propName]) {
            return false;
        }
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
}
