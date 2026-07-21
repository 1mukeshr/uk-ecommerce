/**
 * Rating summary math — shared by storefront and Review model.
 */

export function emptySummary() {
  return {
    average: 0,
    count: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  }
}

export function buildRatingSummary(reviews = []) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let total = 0
  let count = 0

  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)))
    if (!rating) continue
    distribution[rating] += 1
    total += rating
    count += 1
  }

  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    distribution,
  }
}
