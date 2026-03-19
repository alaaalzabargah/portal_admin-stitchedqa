/**
 * POST /api/admin/products/resolve-handles
 * Accepts an array of product names and returns matching Shopify handles.
 * Used by OrderHistory to build review links from order item names.
 */

import { NextRequest, NextResponse } from 'next/server'

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!

const PRODUCTS_BY_TITLES_QUERY = `
  query searchProducts($query: String!) {
    products(first: 25, query: $query) {
      edges {
        node {
          title
          handle
        }
      }
    }
  }
`

export async function POST(request: NextRequest) {
    try {
        const { productNames } = await request.json()

        if (!Array.isArray(productNames) || productNames.length === 0) {
            return NextResponse.json({ error: 'productNames array required' }, { status: 400 })
        }

        // Build a Shopify search query: title:name1 OR title:name2
        const searchQuery = productNames
            .map((name: string) => `title:"${name}"`)
            .join(' OR ')

        const response = await fetch(
            `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    query: PRODUCTS_BY_TITLES_QUERY,
                    variables: { query: searchQuery },
                }),
            }
        )

        if (!response.ok) {
            return NextResponse.json({ error: 'Shopify request failed' }, { status: 502 })
        }

        const json = await response.json()
        const products = json.data?.products?.edges || []

        // Map: product_name → { title, handle }
        const resolved: Record<string, { title: string; handle: string }> = {}
        for (const edge of products) {
            const { title, handle } = edge.node
            resolved[title] = { title, handle }
        }

        return NextResponse.json({ resolved })
    } catch (err) {
        console.error('Resolve handles error:', err)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
