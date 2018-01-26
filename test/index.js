'use strict'

const path = require('path')
const assertDir = require('assert-dir-equal')
const KalaStatic = require('kalastatic')
const test = require('testit')
const nconf = require('nconf')
const extend = require('extend-shallow')

function setupTest(name, opts) {
  test(name, () => {
    return new Promise((resolve, reject) => {
      // Create the configuration for the test.
      const conf = new nconf.Provider()

      // Force the settings for the test.
      const testOpts = {
        base: path.join('test', 'fixtures', name)
      }
      extend(testOpts, opts)
      conf.overrides(testOpts)

      // Create the environment.
      const kalastatic = new KalaStatic(conf)
      kalastatic.build().then(() => {
        // Make sure the build passes.
        const base = kalastatic.nconf.get('base')
        const build = path.join(base, kalastatic.nconf.get('destination'))
        const expected = path.join(base, 'expected')
        assertDir(build, expected)

        // Continue the test suite.
        resolve()
      }, reject).catch(reject)
    })
  })
}

setupTest('general', {
  pluginOpts: {
    'metalsmith-gathercontent': {
      authPath: '_auth.json',
      projectId: 152172,
      mappings: {
        id: 'id',
        slug: '_name',
        title: 'Content_Title',
        'hero-image': 'Content_HeroImage',
        tier: 'tier',
        summary: 'Content_Summary',
        contents: 'Content_Content',
        parentId: '_parent_id'
      }
    },
    'metalsmith-jstransformer': {
      pattern: '!components/**',
      layoutPattern: 'templates/layouts/**',
      engineOptions: {
        twig: {
          namespaces: {
            atoms: 'components/atoms',
            molecules: 'components/molecules',
            organisms: 'components/organisms'
          }
        }
      }
    }
  }
})

setupTest('status-filtering', {
  pluginOpts: {
    'metalsmith-gathercontent': {
      authPath: '_auth.json',
      projectId: 152172,
      mappings: {
        id: 'id',
        slug: '_name',
        title: 'Content_Title',
        'hero-image': 'Content_HeroImage',
        tier: 'tier',
        summary: 'Content_Summary',
        contents: 'Content_Content',
        parentId: '_parent_id'
      },
      status: [
        922006
      ]
    },
    'metalsmith-jstransformer': {
      pattern: '!components/**',
      layoutPattern: 'templates/layouts/**',
      engineOptions: {
        twig: {
          namespaces: {
            atoms: 'components/atoms',
            molecules: 'components/molecules',
            organisms: 'components/organisms'
          }
        }
      }
    }
  }
})
