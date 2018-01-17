const assertDir = require('assert-dir-equal')
const Metalsmith = require('metalsmith')
const testit = require('testit')
const rmdir = require('rimraf')
const fs = require('fs')
const metalsmithJSTranformer = require('metalsmith-jstransformer')
const metalsmithHitherContent = require('../')
/**
 * Define a test case.
 *
 * @param name - The folder name for the test fixtures.
 * @param plugins - An associative array of plugin key name, and options for it.
 */

function test(name, plugins) {

  testit(name, done => {

    if ( name == "basic") {
      
      Metalsmith('test/fixtures/basic')
      .use(metalsmithJSTranformer({
        engineOptions: {
          twig: {
            filters: {
              slug: require('twig-drupal-filters/filters/clean_id')
            }
          }
        }
      }))
      .use(metalsmithHitherContent({
        authPath: "auth.json",
        projectId: 116902
      }))
      .build(function(err){
        if (err) return done(err);
        equal('test/fixtures/basic/expected', 'test/fixtures/basic/build');
        done();
      });  
    }

  })
}

testit('metalsmith-gathercontent', () => {
  test('basic')
})
