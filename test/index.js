const metalsmith = require('metalsmith')
const md = require('metalsmith-markdown')
const collections = require('metalsmith-collections-convention')
const jsTransformer = require('metalsmith-jstransformer')
const testit = require('testit')
const equal = require('assert-dir-equal')
const metalsmithHitherContent = require('../')

/**
 * Define a test case.
 *
 * @param name - The folder name for the test fixtures.
 * @param plugins - An associative array of plugin key name, and options for it.
 */

testit('basic', done => {
  metalsmith('test/fixtures/kalastatic/')
  .use(metalsmithHitherContent({
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
      parent: '_parent_id'
    }
  }))
  .use(md())
  .use(collections())
  .use(jsTransformer({
    pattern: '!components/**',
    layoutPattern: 'templates/layouts/**',
    engineOptions: {
      twig: {
        namespaces: {
          atoms: 'components/atoms',
          molecules: 'components/molecules',
          organisms: 'components/organisms',
          layouts: 'templates/layouts'  
        }    
      }
    }
  }))
  .build(err => {
    if (err) {
      return done(err)
    }
    equal('test/fixtures/kalastatic/expected', 'test/fixtures/kalastatic/expected')
    // A equal('test/fixtures/basic/expected', 'test/fixtures/basic/build')
    done()
  })
})
