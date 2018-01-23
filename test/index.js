const execFile = require('child_process').execFile
const exec = require('child_process').exec
const fs = require('fs')
const path = require('path')
const Kalastatic = require('kalastatic')
const test = require('testit')
const assertDir = require('assert-dir-equal')
const nconf = require('nconf')
const extend = require('extend-shallow')
const rimraf = require('rimraf')
const metalsmithGatherContent = require('../')

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

      console.log("testOpts", testOpts)

      const plugins = [
        // Load information from the environment variables.
        'metalsmith-env',
        // Define any global variables.
        'metalsmithGatherContent',
        // Create virtual md entries from gathercontent using hithercontent
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
      
      const pluginOptions = {
        'metalsmithGatherContent':  {
          authPath: 'test/fixtures/kalastatic/_auth.json',
          projectId: 152172,
          mappings: {
            id: 'id',
            slug: '_name',
            title: 'Content_Title',
            'hero-image': 'Content_HeroImage',
            tier: 'tier',
            summary: 'Content_Summary',
            contents: 'Content_Content',
            parent: '_parent_id'
          }      
        }
      }

      conf.set('plugins', plugins)
      conf.set('pluginOptions', pluginOptions)
      conf.overrides(testOpts)

      // Create the environment.
      const kalastatic = new Kalastatic(conf)
      console.log("::::", kalastatic.nconf.get('plugins'))      
      console.log("»»»»", kalastatic.nconf.get('base'))
      console.log("»»»»", kalastatic.nconf.get('destination'))

      kalastatic.build().then(() => {
        // Make sure the build passes.
        const base = kalastatic.nconf.get('base')
        console.log( "»» base »»", base )
        console.log( "»» destination »»", kalastatic.nconf.get('destination') )
        console.log('plugins?', kalastatic.nconf.get('plugins'))
        const build = path.join(base, kalastatic.nconf.get('destination'))
        const expected = path.join(base, 'expected')
        assertDir(build, expected)
        // Continue the test suite.
        resolve()
      }, reject).catch(reject)
    })
  })
}

setupTest('kalastatic')
