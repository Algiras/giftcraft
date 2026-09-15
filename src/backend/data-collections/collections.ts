/** Generated from src/backend/extensions/manifest.json — do not edit. */
export const DATA_COLLECTIONS_EXTENSION = {
  "componentName": "GiftCraft private options",
  "collections": [
    {
      "idSuffix": "giftcraft-options",
      "displayName": "GiftCraftOptions",
      "displayField": "title",
      "fields": [
        {
          "key": "title",
          "displayName": "Title",
          "type": "TEXT"
        },
        {
          "key": "payload",
          "displayName": "Payload",
          "type": "OBJECT",
          "objectOptions": {
            "fields": []
          }
        }
      ],
      "dataPermissions": {
        "itemRead": "PRIVILEGED",
        "itemInsert": "PRIVILEGED",
        "itemUpdate": "PRIVILEGED",
        "itemRemove": "PRIVILEGED"
      },
      "indexes": [],
      "initialData": []
    }
  ]
} as const;
