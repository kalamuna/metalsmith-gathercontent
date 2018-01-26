# metalsmith-gathercontent
A metalsmith plugin for GatherContent using the [hithercontent](https://www.npmjs.com/package/hithercontent) library.

## Installation
```npm install --save metalsmith-gathercontent```

Please note you need to create _auth.json with a GatherContent API key for this to work.
```
{
    "user": "me@myself.net",
    "akey": "XXXXXXXXXXXXXXXXXXXXXXXX"
}
```

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
```
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
    })
…
```

### projectId
The id of you Gather Content project.

### mappings
Key value pairs to map variables from the hithercontent output.
Where keys are the keys you want, and the values are what hithercontent is outputting.
This allows you to work with the Gather Content project as is.
All additional keys are stored in `fullData`

### status
An array of Gather Content workflow status codes to filter against.
This way you can work with only "ready" content. 
When blank it ingests all content in a project regardless of status code.

## License
MIT
