/**
 * Public API: Fetch a single product by handle for the customer review page.
 * GET /api/reviews/product/[handle]
 */

import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

const PRODUCT_BY_HANDLE_QUERY = `
  query getProductByHandle($handle: String!) {
    productByHandle(handle: $handle) {
      id
      title
      handle
      featuredImage {
        url
      }
      images(first: 3) {
        edges {
          node {
            url
          }
        }
      }
    }
  }
`;

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ handle: string }> }
) {
    const { handle } = await params;

    try {
        const response = await fetch(
            `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({
                    query: PRODUCT_BY_HANDLE_QUERY,
                    variables: { handle },
                }),
            }
        );

        if (!response.ok) {
            return NextResponse.json(
                { error: 'Failed to fetch product' },
                { status: response.status }
            );
        }

        const json = await response.json();
        const product = json.data?.productByHandle;

        if (!product) {
            return NextResponse.json(
                { error: 'Product not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            product: {
                id: product.id,
                title: product.title,
                handle: product.handle,
                image: product.featuredImage?.url || null,
                images: product.images?.edges?.map((e: any) => e.node.url) || [],
            },
        });
    } catch (err) {
        console.error('Product fetch error:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
