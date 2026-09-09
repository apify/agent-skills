# Input schema

`.actor/input_schema.json` drives both validation and the Console form. The platform validates input against it before the Actor starts, so a field the code reads but the schema omits fails silently for users of the form. Full specification: https://docs.apify.com/actors/development/actor-definition/input-schema/specification/v1

```json
{
    "title": "E-commerce Product Scraper Input",
    "type": "object",
    "schemaVersion": 1,
    "properties": {
        "startUrls": {
            "title": "Start URLs",
            "type": "array",
            "description": "Category or product pages to start from",
            "editor": "requestListSources",
            "prefill": [{ "url": "https://example.com/category" }]
        },
        "maxRequestsPerCrawl": {
            "title": "Max requests per crawl",
            "type": "integer",
            "description": "Maximum number of pages to scrape (0 = unlimited)",
            "default": 1000,
            "minimum": 0,
            "sectionCaption": "Limits"
        },
        "locale": {
            "title": "Locale",
            "type": "string",
            "description": "Language of the scraped content",
            "editor": "select",
            "default": "en",
            "enum": ["cs", "en", "de"],
            "enumTitles": ["Czech", "English", "German"]
        },
        "proxyConfiguration": {
            "title": "Proxy configuration",
            "type": "object",
            "description": "Proxy settings for anti-bot protection",
            "editor": "proxy",
            "default": { "useApifyProxy": true }
        }
    },
    "required": ["startUrls"]
}
```

Every field needs `title`, `type`, and `description`. Types are `string`, `integer`, `number`, `boolean`, `object`, `array`.

## default, prefill, required

- `default` is what the Actor receives when the caller omits the field, from the form, API, CLI, or scheduler alike.
- `prefill` only fills the form. It never reaches the Actor unless the user submits it, so it is the safe place for example URLs.
- `required` forces the user to enter a value. Pair it with `prefill` when helpful; pairing it with `default` is redundant.
- `nullable: true` allows `null` independently of `required`.

## Editors by type

| Type | Editors | Notes |
|------|---------|-------|
| string | `textfield`, `textarea`, `select`, `datepicker`, `javascript`, `python`, `fileupload`, `hidden` | `pattern`, `minLength`, `maxLength`. `select` needs `enum` or `enumSuggestedValues` (free text allowed), labelled by `enumTitles`. `datepicker` takes `dateType`: `absolute`, `relative`, or `absoluteOrRelative`. |
| integer, number | `number`, `hidden` | `minimum`, `maximum`, and `unit` for a display suffix such as `"seconds"`. |
| boolean | `checkbox`, `hidden` | `groupCaption` and `groupDescription` on the first checkbox group a run of them. |
| object | `json`, `proxy`, `schemaBased`, `hidden` | `properties`, `required`, `additionalProperties`, `minProperties`, `maxProperties`. `proxy` yields `{ useApifyProxy, apifyProxyGroups, proxyUrls }`. `schemaBased` renders sub-properties as form fields, one level deep. |
| array | `requestListSources`, `stringList`, `keyValue`, `globs`, `pseudoUrls`, `select`, `json`, `schemaBased`, `fileupload`, `hidden` | `items`, `minItems`, `maxItems`, `uniqueItems`. Multiselect is `select` with `items.enum`. `keyValue` and `stringList` take `placeholderKey` / `placeholderValue`. |
| resource (string or array) | `resourcePicker`, `textfield`, `hidden` | `resourceType`: `dataset`, `keyValueStore`, `requestQueue`, or `mcpConnector`, with `resourcePermissions` `["READ"]` or `["READ", "WRITE"]` for storages. |

## Other field properties

- `sectionCaption` and `sectionDescription` start a collapsible section that runs until the next caption.
- `isSecret: true` encrypts the value at rest. Allowed with `textfield`, `textarea`, `hidden` (strings) and `json`, `hidden` (objects, arrays). `Actor.getInput()` decrypts transparently; reading the `INPUT` record directly returns `ENCRYPTED_VALUE:...`.
- `errorMessage` maps a validation keyword to a custom message, worth it for regex `pattern` fields: `{ "pattern": "Must be a valid email address" }`.
- `example` shows a sample value on the Store page.
- Escape backslashes twice in `pattern`, since it lives inside a JSON string.
- `patternKey` and `patternValue` are deprecated; use `items` or `properties` with `pattern` on the individual field.
- The whole file is capped at 500 kB. Top-level `additionalProperties: false` rejects unknown input keys.

Run `apify validate-schema` after editing.
