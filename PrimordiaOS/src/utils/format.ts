export const Format = {
  currency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  },

  date(date: Date): string {
    return date.toISOString();
  },
};
