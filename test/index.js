'use strict'

const path = require('path')
const assertDir = require('assert-dir-equal')
const KalaStatic = require('kalastatic')
const test = require('testit')
const nconf = require('nconf')
const extend = require('extend-shallow')
const mgc = require('../lib/index.js')


test('filterMethod' , () => {
  let filteredItems;
  const statuses = [ 123, 234 ]
  const items = [
    {
      name: 'one',
      _status: {
        data: {
          id: '123'
        }
      }
    },
    {
      name: 'two',
      _status: {
        data: {
          id: '123'
        }
      }
    },
    {
      name: 'three',
      _status: {
        data: {
          id: '234'
        }
      }
    },
    {
      name: 'four',
      _status: {
        data: {
          id: '345'
        }
      }
    }
  ]
  filteredItems = items.filter(mgc.filterByStatus(statuses))
  assert(Object.entries(filteredItems).length === 3)
})
