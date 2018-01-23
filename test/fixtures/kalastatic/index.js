const metalsmith = require('metalsmith')
const md = require('metalsmith-markdown')
const collections = require('metalsmith-collections-convention')
const jsTransformer = require('metalsmith-jstransformer')
const testit = require('testit')
const equal = require('assert-dir-equal')
const metalsmithHitherContent = require('../../..')

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
    engineOptions: {
      twig: {
        namespaces: {
          atoms: __dirname + '/test/fixtures/kalastatic/src/components/atoms',
          molecules: __dirname + '/test/fixtures/kalastatic/src/components/molecules',
          organisms: __dirname + '/test/fixtures/kalastatic/src/components/organisms',
        }
      }
    }
  }))
  .build(err => {
    if (err) {
      return done(err)
    }
    equal('test/fixtures/kalastatic/build', 'test/fixtures/kalastatic/expected')
    done()
  })
})
