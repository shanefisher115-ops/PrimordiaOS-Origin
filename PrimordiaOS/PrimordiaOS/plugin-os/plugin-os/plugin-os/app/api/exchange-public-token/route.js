import { plaidClient } from '@/lib/plaid';
export async function POST(req) {
    const { public_token } = await req.json();
    const response = await plaidClient.itemPublicTokenExchange({
        public_token,
    });
    return Response.json({
        access_token: response.data.access_token,
    });
}
