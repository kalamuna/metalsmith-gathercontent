'use strict'

const path = require('path')
const assertDir = require('assert-dir-equal')
const KalaStatic = require('kalastatic')
const test = require('testit')
const nconf = require('nconf')
const extend = require('extend-shallow')
const mgc = require('../lib/index.js')

function setupTest(name, opts) {

  test(name, () => {
    return new Promise((resolve, reject) => {
      // Create the configuration for the test.
      const conf = new nconf.Provider()
      // Force the settings for the test.
      const testOpts = {
        base: path.join('test', 'fixtures', name),
        plugins: [
          // Bring in data from gathercontent
          {
            plugin: mgc,
            name: 'metalsmith-gathercontent'
          },
          // Load information from the environment variables.
          'metalsmith-env',
          // Define any global variables.
          'metalsmith-define',
          // Add .json metadata to each file.
          'metalsmith-metadata-files',
          // Add base, dir, ext, name, and href info to each file.
          'metalsmith-paths',
          // Load metadata info the metalsmith metadata object.
          'metalsmith-metadata-convention',
          // Concatenate any needed files.
          'metalsmith-concat-convention',
          // Load all collections.
          'metalsmith-collections-convention',
          // Bring in static assets.
          'metalsmith-assets-convention',
          // Ignore all partials and layouts.
          'metalsmith-ignore',
          // Load all Partials.
          'metalsmith-jstransformer-partials',
          // Render all content with JSTransformers.
          'metalsmith-jstransformer',
          // Clean URLs.
          'metalsmith-clean-urls'
        ]
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
      verbose: false,
      authPath: '_auth.json',
      filePath: 'test/fixtures/general/src/assets/images/gathercontent',
      projectId: 152172,
      logMappings: true,
      mappings: {
        id: 'id',
        slug: '_name',
        name: '_name',
        title: 'Content_Title',
        heroImage: 'Content_HeroImage',
        tier: 'tier',
        summary: 'Content_Summary',
        contents: 'Content_Content',
        parentId: '_parent_id',
        first: 'Content_First-Name',
        last: 'Content_Last-Name',
        bio: 'Content_Bio',
        image: 'Content_Image',
        profile__image: 'Content_Profile-Image',
        type: '_type'
      }
    },
    'metalsmith-ignore': [
      '**/_*',
      'components/**/*'
    ],
    'metalsmith-jstransformer': {
      pattern: '!components/**',
      layoutPattern: 'templates/layouts/**'
    }
  }
})

setupTest('status-filtering', {
  pluginOpts: {
    'metalsmith-gathercontent': {
      verbose: 'true',
      authPath: '_auth.json',
      filePath: 'test/fixtures/status-filtering/src/assets/images/gathercontent',
      projectId: 152172,
      status: [
        922006
      ]
    },
    'metalsmith-jstransformer': {
      pattern: '!components/**',
      layoutPattern: 'templates/layouts/**'
    }
  }
})
