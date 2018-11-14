# metalsmith-gathercontent

[![CircleCI](https://circleci.com/gh/kalamuna/metalsmith-gathercontent.svg?style=svg)](https://circleci.com/gh/kalamuna/metalsmith-gathercontent)

A metalsmith plugin for GatherContent using the [hithercontent](https://www.npmjs.com/package/hithercontent) library.

## Installation
```cli
npm install --save metalsmith-gathercontent
```

Please note you need to create `_auth.json` with a GatherContent API key for this to work.
Also note tests wont work without an `_auth.json` present in the project root.

```json
{
    "user": "me@myself.net",
    "akey": "XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

Alternatively, you can use the following environment variables:
- `GATHERCONTENT_USER`
- `GATHERCONTENT_AKEY`

## Configuration

Right now this plugin is optional (though it passes the callback to the next metalsmith plugin if it finds no configuration) so some overriding needs to occur in `kalastatic.yaml`:
```
# We maybe able to only pass the bits we need, but here's the full plugin list being overridden.
plugins:
  - 'metalsmith-gathercontent'
  # Load information from the environment variables.
  - 'metalsmith-env'
  # Define any global variables.
  - 'metalsmith-define'
  # Add .json metadata to each file.
  - 'metalsmith-metadata-files'
  # Add base, dir, ext, name, and href info to each file.
  - 'metalsmith-paths'
  # Load metadata info the metalsmith metadata object.
  - 'metalsmith-metadata-convention'
  # Concatenate any needed files.
  - 'metalsmith-concat-convention'
  # Load all collections.
  - 'metalsmith-collections-convention'
  # Bring in static assets.
  - 'metalsmith-assets-convention'
  # Ignore all partials and layouts.
  - 'metalsmith-ignore'
  # Load all Partials.
  - 'metalsmith-jstransformer-partials'
  # Render all content with JSTransformers.
  - 'metalsmith-jstransformer'
  # Clean URLs.
  - 'metalsmith-clean-urls'

# Allows changing some of the plugin options.
pluginOpts:
  metalsmith-gathercontent:
    verbose: true
    saveJSON: true
    authPath: _auth.json
    filePath: src/assets/images/gathercontent
    projectId: XXXXXX
    mappings:
      id: id
      slug: _name
      component: Meta_Component
      title: Content_Title
      tier: tier
      type: _type
      summary: Content_Summary
      contents: Content_Content
      hero__image: Content_Hero-Image
      hero__image-alt: Content_Hero-Image-Alt
      template: Meta_Component
```

### JavaScript

If you are using the JS Api for Metalsmith, then you can require the module and add it to your `.use()` directives:

```js
var gatherContent = require('metalsmith-gathercontent');

metalsmith.use(gatherContent());
```

## Usage
```js
var gatherContent = require('metalsmith-gathercontent');
…
.use(gatherContent({
  authPath: '_auth.json',
  projectId: 000000,
  mappings: {
    id: 'id',
    slug: '_name',
    title: 'Content_Title',
    hero__image: 'Content_Hero-Image',
    'hero__image-alt': 'Content_Hero-Image-Alt',
    tier: 'tier',
    summary: 'Content_Summary',
    contents: 'Content_Content',
    parentId: '_parent_id',
    article__image_gallery: 'Content_Image-Gallery'    
  },
  status: [
    000000
  ]
}))
…
```

### projectId
The id of you Gather Content project.

### mappings
Key value pairs to map variables from the hithercontent output.
Where keys are the keys you want, and the values are what hithercontent is outputting.

This allows you to work with the Gather Content project as is.
All additional keys are stored in a `fullData` object.

HitherContent outputs field keys using the following convention `${TabName}_${Dash-Delimited-Field-Name}` so in our case we currently follow the convention of: `Content` or `${Content-Descriptor}" (eg: `Content-Left`), `Meta` and `Social`. Thus a field called "CTA Image" in the "Content tab" on the GatherContent side would come in as `Content_CTA-Image`.

Additionally if there are no mappings and a key `Content_Content` (a field named "Content" in the "Content" tab) is present it will be automatically mapped to the `contents` property as a markdown buffer and the key `fullData` contains the raw output from gatherContent key value pairs.

### status
An array of Gather Content workflow status codes to filter against.
This way you can work with only "ready" content.
When blank it ingests all content in a project regardless of status code.

### verbose
More console.logs when set to true

### saveJSON
Outputs the raw Hithercontent json, as well the nested json we process through the mappings and 'children' parsing. This is useful for debugging.

## Files and Images
Right now any post-mappings key ending in `__image` in the index is processed as an image, and downloaded to `src/assets/gathercontent/` (editable in `kalastatic.yaml`) additionally fully formed a11y images can be created with by naming fields with the following convention: the image is named `test__image` the alt text is `test__image-alt` so after processing `test__image` will hold `test__image.src`, `test__image.alt` and `test__image.origin`. We are working on a responsive image solution as we write this, as well as creating other conventions for certain common HTML primitives and microformats/schema.

## License
MIT
