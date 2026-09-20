/**
 * Rounds a monetary amount to the nearest penny (2 decimal places).
 * Uses `Number.EPSILON` to reduce floating-point drift before rounding.
 *
 * @param amount - The value to round
 * @returns The amount rounded to 2 decimal places
 */
export const roundPenny = (amount: number): number => Math.round((amount + Number.EPSILON) * 100) / 100

const gbp = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

/**
 * Formats a number as British pound sterling (en-GB).
 *
 * @param amount - The amount in GBP
 * @returns A locale-formatted currency string (e.g. `£354.78`)
 */
export const formatCurrency = (amount: number): string => gbp.format(amount)
