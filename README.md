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

### CLI

If you are using the command-line version of Metalsmith, you can install via npm, and then add the `metalsmith-jstransformer` key to your `metalsmith.json` file:

```json
{
  "plugins": {
    "metalsmith-gathercontent": {}
  }
}
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
  projectId: 152172,
  mappings: {
    id: 'id',
    slug: '_name',
    title: 'Content_Title',
    hero__image: 'Content_Hero-Image',
    tier: 'tier',
    summary: 'Content_Summary',
    contents: 'Content_Content',
    parentId: '_parent_id',
    article__image_gallery: 'Content_Image-Gallery'    
  },
  status: [
    922006
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

This plugin uses a "Meta" tab in gathercontent to store collections, and layouts.
Additionally if there are no mappings and a key `Content_Content` is present it will be automatically mapped to the `contents` property as a buffer.
As per hithercontent, keys within a Gather Content tab will be modified as follow `TabName_KeyName`

### status
An array of Gather Content workflow status codes to filter against.
This way you can work with only "ready" content. 
When blank it ingests all content in a project regardless of status code.

### verbose
More console.logs when set to true

## Files and Images
Right now any key with `__image` in the index is processed as an image, and downloaded to `src/assets/gathercontent/` similarly for `__file` we will likely need to change this. Images that are arrays are stored as arrays. 

## License
MIT
