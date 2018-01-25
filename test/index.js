const metalsmith = require('metalsmith')
const md = require('metalsmith-markdown')
const testit = require('testit')
const env = require('metalsmith-env')
const define = require('metalsmith-define')
const metadataFiles = require('metalsmith-metadata-files')
const metalsmithPaths = require('metalsmith-paths')
const metadataConventions = require('metalsmith-metadata-convention')
const concatConventions = require('metalsmith-concat-convention')
const collections = require('metalsmith-collections-convention')
const assets = require('metalsmith-assets-convention')
const ignore = require('metalsmith-ignore')
const jsTransformerPartials = require('metalsmith-jstransformer-partials')
const jsTransformer = require('metalsmith-jstransformer')
const equal = require('assert-dir-equal')
const cleanURLs = require('metalsmith-clean-urls')
const metalsmithGatherContent = require('../')

/**
 * Define a test case.
 *
 * @param name - The folder name for the test fixtures.
 * @param plugins - An associative array of plugin key name, and options for it.
 */

testit('basic', done => {
  metalsmith('test/fixtures/kalastatic/')
  .use(metalsmithGatherContent({
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
  }))
  .use(md())
  .use(env())
  .use(define({
    'base_path': '/', // eslint-disable-line quote-props
    'build_path': '/' // eslint-disable-line quote-props
  }))
  .use(metadataFiles({
    inheritFilePrefix: '@kalastatic/'
  }))
  .use(metalsmithPaths())
  .use(metadataConventions())
  .use(concatConventions())
  .use(collections())
  .use(assets())
  .use(ignore([
    'components/**/*',
    'templates/**/*',
    '**/*.collection',
    '**/_*'
  ]))
  .use(jsTransformerPartials())
  .use(jsTransformer({
    engineOptions: {
      pattern: '**',
      layoutPattern: '../../fixtures/kalastatic/src/templates/layouts/**',
      twig: {
        namespaces: {
          atoms: 'components/atoms',
          molecules: 'components/molecules',
          organisms: 'components/organisms'
        }
      }
    }
  }))
  .use(cleanURLs())
  .build(err => {
    if (err) {
      return done(err)
    }
    equal('test/fixtures/kalastatic/expected', 'test/fixtures/kalastatic/expected')
    done()
  })
})
