const assertDir = require('assert-dir-equal')
const Metalsmith = require('metalsmith')
const testit = require('testit')
const rmdir = require('rimraf')

/**
 * Define a test case.
 *
 * @param name - The folder name for the test fixtures.
 * @param plugins - An associative array of plugin key name, and options for it.
 */

function test(name, plugins) {
  testit(name, done => {
    // Ensure we load the Metalsmith JSTransformer Layouts plugin.
    plugins = plugins || {}
    if (!plugins['..']) {
      plugins['..'] = {}
    }
    if (!plugins['metalsmith-jstransformer']) {
      plugins['metalsmith-jstransformer'] = {}
    }
    // Construct Metalsmith with a clean build directory.
    const testPath = 'test/fixtures/' + name
    rmdir.sync(testPath + '/build')
    // Boot up Metalsmith and load the plugins.
    const metalsmith = new Metalsmith(testPath)
    Object.keys(plugins).forEach(pluginName => {
      metalsmith.use(require(pluginName)(plugins[pluginName])) // eslint-disable-line import/no-dynamic-require
    })
    // Build with Metalsmith.
    metalsmith.build(err => {
      if (err) {
        return done(err)
      }
      assertDir(testPath + '/build', testPath + '/expected')
      done()
    })
  })
}

testit('metalsmith-jstransformer', () => {
  test('basic')
  test('recursive')
})
