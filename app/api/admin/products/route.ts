/**
 * Products API Endpoint (Shopify Admin GraphQL)
 *
 * GET /api/admin/products?after=CURSOR&before=CURSOR
 * Returns 15 products per page with cursor-based pagination.
 */

import { NextRequest, NextResponse } from 'next/server';

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN!;

const PAGE_SIZE = 15;

const PRODUCTS_QUERY = `
  query getProductsForAdmin($first: Int, $after: String, $last: Int, $before: String) {
    productsCount {
      count
    }
    products(first: $first, after: $after, last: $last, before: $before, sortKey: CREATED_AT, reverse: true) {
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
      edges {
        cursor
        node {
          id
          title
          handle
          featuredImage {
            url
          }
        }
      }
    }
  }
`;

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const after = searchParams.get('after');
        const before = searchParams.get('before');

        // Build GraphQL variables for cursor-based pagination
        let variables: Record<string, any> = {};

        if (before) {
            // Going backwards
            variables = { last: PAGE_SIZE, before };
        } else {
            // Going forwards (default: first page)
            variables = { first: PAGE_SIZE, after: after || undefined };
        }

        const response = await fetch(
            `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2026-01/graphql.json`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
                },
                body: JSON.stringify({ query: PRODUCTS_QUERY, variables }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Shopify API error:', response.status, errorText);
            return NextResponse.json(
                { error: 'Failed to fetch products from Shopify' },
                { status: response.status }
            );
        }

        const json = await response.json();

        if (json.errors) {
            console.error('Shopify GraphQL errors:', json.errors);
            return NextResponse.json(
                { error: 'GraphQL query error', details: json.errors },
                { status: 500 }
            );
        }

        const { edges, pageInfo } = json.data.products;
        const totalCount = json.data.productsCount?.count ?? 0;

        const products = edges.map((edge: any) => ({
            id: edge.node.id,
            title: edge.node.title,
            handle: edge.node.handle,
            image: edge.node.featuredImage?.url || null,
        }));

        return NextResponse.json({
            products,
            totalCount,
            pageInfo: {
                hasNextPage: pageInfo.hasNextPage,
                hasPreviousPage: pageInfo.hasPreviousPage,
                startCursor: pageInfo.startCursor,
                endCursor: pageInfo.endCursor,
            },
        });
    } catch (err) {
        console.error('Products API exception:', err);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
