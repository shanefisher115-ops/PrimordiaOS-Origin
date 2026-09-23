export const Format = {
    currency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
        }).format(amount);
    },
    date(date) {
        return date.toISOString();
    },
};
