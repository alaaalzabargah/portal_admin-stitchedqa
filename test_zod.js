const { z } = require('zod');

const ShopifyLineItemPropertySchema = z.object({
    name: z.string(),
    value: z.union([z.string(), z.number(), z.boolean()]).transform(String),
});

const validateSchema = z.union([
    z.array(ShopifyLineItemPropertySchema),
    z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]).transform(v => String(v || ''))),
    z.null()
]).optional().default([]);

const payload = [
  { name: "Sizing Type", value: "Standard" },
  { name: "partialpay_amount", value: "825.00" }
];

const result = validateSchema.safeParse(payload);
console.log(JSON.stringify(result, null, 2));
