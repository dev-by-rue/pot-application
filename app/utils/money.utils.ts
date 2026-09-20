export const roundPenny = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

export const formatCurrency = (amount: number): string => gbp.format(amount)
