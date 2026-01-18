# Shopify Integration - Environment Variables

Add the following to your `.env.local` file:

```bash
# Shopify Configuration
SHOPIFY_STORE_DOMAIN=yourstore.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_shopify_admin_api_token
SHOPIFY_WEBHOOK_SECRET=your_webhook_secret

# Webhook URL (your ngrok URL or production domain)
NEXT_PUBLIC_WEBHOOK_URL=https://unbiographically-chorial-jeffery.ngrok-free.dev/api/webhooks/shopify
```

## How to Get Shopify Credentials:

1. **Store Domain**: Your Shopify store URL (e.g., `mystore.myshopify.com`)

2. **Access Token**:
   - Go to Shopify Admin → Settings → Apps and sales channels
   - Click "Develop apps"
   - Create a new app
   - Configure Admin API scopes: `read_customers`, `write_customers`, `read_orders`, `write_orders`
   - Install the app and copy the Admin API access token

3. **Webhook Secret**:
   - When you register webhooks, Shopify will provide a signing secret
   - Or generate your own and use it when creating webhooks

4. **Webhook URL**:
   - If testing locally: use your ngrok URL
   - In production: use your actual domain
