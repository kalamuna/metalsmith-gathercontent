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
const options = {
  method: 'GET',
  project: {
    id: '116904'
  },
  headers: {
    Authorization: 'Basic ' + base64.encode(auth.user + ':' + auth.key),
    Accept: 'application/vnd.gathercontent.v0.5+json'
  }
}

module.exports = function (opts) {
  return function (files, metalsmith, done) {
    getSiteData(opts, metalsmith, done)
  }
}

function getSiteData(data, metalsmith, done) {
  const url = 'https://api.gathercontent.com/items/?project_id=' + options.project.id
  fetch(url, options)
  .then(res => res.json())
  .then(json => {
    metalsmith.metadata().gatherContent = getChildrenOf(json.data, 0)
    done()
  })
}

function getChildrenOf(data, parentId) {
  const children = {}
  for (let i = 0; i < data.length; i++) {
    const item = data[i]
    if (item.parent_id === parentId) {
      item.items = getChildrenOf(data, item.id)
      children[_str.slugify(item.name)] = item
    }
  }
  return children
}
