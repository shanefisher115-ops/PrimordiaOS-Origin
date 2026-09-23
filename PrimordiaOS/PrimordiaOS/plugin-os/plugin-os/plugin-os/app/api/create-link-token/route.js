import { plaidClient } from '@/lib/plaid';
export async function POST() {
    const response = await plaidClient.linkTokenCreate({
        user: { client_user_id: 'USER_ID' },
        client_name: 'Creator OS',
        products: ['auth', 'transactions'],
        language: 'en',
        country_codes: ['US'],
    });
    return Response.json({ link_token: response.data.link_token });
}
