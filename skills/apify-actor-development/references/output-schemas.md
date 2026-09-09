# Output schemas

Generate or update `dataset_schema.json`, `output_schema.json`, and `key_value_store_schema.json` in `.actor/`, then wire them into `actor.json`. These files tell Apify Console how to display run results. Work on the Actor named in the request, or the one in the current directory.

## 1. Discover what the code outputs

1. Read `.actor/actor.json`. Note any existing schema files, and any inline `storages.dataset` or `storages.keyValueStore` objects (they migrate into files in step 5).
2. Search the repository for other `.actor/*_schema.json` files. Match their description style, field naming, example format, view size, and JSON formatting.
3. Find every dataset write: `pushData(` in JS/TS, `push_data(` in Python.
4. Find every key-value store write: `setValue(` in JS/TS, `set_value(` in Python. Ignore the default `INPUT` key.
5. Find the output type: a TypeScript interface, or a Python TypedDict, dataclass, or Pydantic model. When one exists it is the canonical field list; derive the schema from it and cross-check against the code that fills the values.

Done when you can list every output field with its type, source location, and nullability, and every key-value store key pattern. Present that list to the user.

## 2. Write `dataset_schema.json`

```json
{
    "actorSpecification": 1,
    "fields": {
        "$schema": "http://json-schema.org/draft-07/schema#",
        "type": "object",
        "properties": {},
        "required": [],
        "additionalProperties": true
    },
    "views": {
        "overview": {
            "title": "Overview",
            "description": "Most important fields at a glance",
            "transformation": { "fields": [] },
            "display": { "component": "table", "properties": {} }
        }
    }
}
```

**`fields.properties` is the superset**: every field the Actor can output. Views select a subset of it for display.

Rules for every field:

| Rule | Detail |
|------|--------|
| `"type"` | Always present. AJV rejects `nullable` without `type` on the same field. A TypeScript union such as `Foo \| string` becomes `"type": ["object", "string"]`. |
| `"nullable": true` | On every field. Websites and APIs drop values without warning. `nullable` is an Apify extension to draft-07. |
| `"description"` and `"example"` | On every field. Examples are anonymized: `"exampleuser"`, `"Example Channel"`, ISO dates like `"2025-01-15T12:00:00.000Z"`, URLs in the platform's format with fake IDs of the right length. |
| `"required": []` and `"additionalProperties": true` | On the top-level `fields` object **and** on every nested object inside `properties`. The nested level is the one most often missed. |

Two patterns cover the rest:

```json
"title": {
    "type": "string",
    "description": "Title of the scraped item",
    "nullable": true,
    "example": "Example Item Title"
},
"authorInfo": {
    "type": "object",
    "description": "Information about the author",
    "properties": {
        "name": { "type": "string", "nullable": true },
        "url": { "type": "string", "nullable": true }
    },
    "required": [],
    "additionalProperties": true,
    "nullable": true,
    "example": { "name": "Example Author", "url": "https://example.com/author" }
}
```

Arrays add `"items": { "type": "string" }`; enums add `"enum": [...]`.

**Views.** `transformation.fields` lists the 8 to 12 fields a user wants at a glance, in column order. `display.properties` gives each one a `label` and a `format` from `text`, `number`, `date`, `link`, `boolean`, `image`, `array`, `object`. Transformation also accepts `unwind`, `flatten`, `omit`, `limit`, and `desc`.

## 3. Write `key_value_store_schema.json` (only when step 1 found store writes)

Group the writes by key pattern. A fixed key such as `"REPORT"` becomes a collection with `key`; a dynamic key such as `` `screenshot-${id}` `` becomes one with `keyPrefix`. Each collection uses exactly one of the two.

```json
{
    "actorKeyValueStoreSchemaVersion": 1,
    "title": "Scraped Files",
    "description": "Downloaded files and screenshots",
    "collections": {
        "report": {
            "title": "Report",
            "description": "Final analysis report",
            "key": "REPORT",
            "contentTypes": ["application/json"]
        },
        "screenshots": {
            "title": "Screenshots",
            "description": "Page screenshots captured during scraping",
            "keyPrefix": "screenshot-",
            "contentTypes": ["image/png", "image/jpeg"]
        }
    }
}
```

`contentTypes` restricts MIME types. `jsonSchema` (draft-07) validates `application/json` records.

## 4. Write `output_schema.json`

```json
{
    "actorOutputSchemaVersion": 1,
    "title": "Output of the <Actor name>",
    "description": "One sentence describing the output data",
    "properties": {
        "dataset": {
            "type": "string",
            "title": "Results",
            "description": "Dataset containing all scraped data",
            "template": "{{links.apiDefaultDatasetUrl}}/items"
        }
    }
}
```

Every property has `"type": "string"`; the Apify meta-validator accepts no other type here. When step 3 produced a store schema, add a second property with template `{{links.apiDefaultKeyValueStoreUrl}}/keys`.

Available template variables: `links.apiDefaultDatasetUrl`, `links.apiDefaultKeyValueStoreUrl`, `links.publicRunUrl`, `links.consoleRunUrl`, `links.apiRunUrl`, `links.containerRunUrl`, `run.defaultDatasetId`, `run.defaultKeyValueStoreId`.

## 5. Wire `actor.json`

```json
"output": "./output_schema.json",
"storages": {
    "dataset": "./dataset_schema.json",
    "keyValueStore": "./key_value_store_schema.json"
}
```

Include `keyValueStore` only when step 3 ran. Move any inline schema objects into the files and replace them with these path strings.

## 6. Validate

Show the schemas to the user before writing them. The work is done when every line holds:

- [ ] Every output field found in step 1 is in `fields.properties`.
- [ ] Every field has `type`, `nullable: true`, `description`, and an anonymized `example`.
- [ ] `required: []` and `additionalProperties: true` sit on the top-level `fields` object and on every nested object.
- [ ] Field names match the keys the code writes (camelCase or snake_case as the code has them).
- [ ] The overview view lists 8 to 12 fields with correct formats.
- [ ] Every `output_schema.json` property has `"type": "string"`.
- [ ] If a store schema exists, its collections cover every `setValue` / `set_value` call, each with `key` or `keyPrefix` but not both.
- [ ] `actor.json` references every schema file.
- [ ] Style matches the other schemas in the repository, and fields derive from the existing type definition when one exists.

Then report the files written, the field count, the overview fields, and any field whose type or nullability needs the user's confirmation.
