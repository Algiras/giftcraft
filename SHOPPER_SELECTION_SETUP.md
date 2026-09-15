# GiftCraft shopper selection setup

GiftCraft charges only selections that Wix sends as line-item `modifierGroups`. This works with Wix Stores Catalog V3 products and with storefront cart/checkout line items that carry the same modifier-group envelope. It does not inspect a catalog version or modify a product's price.

For every product that can be wrapped, the merchant configures a Wix Stores **modifier**, not a variant option:

1. Open **Products** in the Wix site dashboard and select the product.
2. In **Modifiers**, choose **Add Modifier** and choose **Text choices**.
3. Set the modifier name to exactly `GiftCraft wrap`.
4. Add each eligible GiftCraft option's name as a choice, exactly as saved in the GiftCraft dashboard. For example, `Classic Crimson Ribbon`.
5. If greeting cards are offered, add a second **Text choices** modifier named exactly `GiftCraft greeting card` with a `Yes` choice.
6. Save the product and test its product page. The shopper must select the wrap choice; GiftCraft never charges merely because a merchant configured an option.

Use a free-text modifier for a greeting message only when Wix Stores makes that text available in the order line-item modifier details. The current fee handler intentionally does not parse or store free text. Gift-with-purchase fulfillment also remains outside this handler.

Catalog V3 merchants may create reusable `PRODUCT_MODIFIER` customizations and assign them to products. Catalog V1/older product pages that do not expose **Modifiers** cannot use this path; adding a normal variant option is not a substitute because the service-plugin request does not guarantee it appears as a modifier group.
