import mongoose from 'mongoose'

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    productName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 160,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    userLocation: {
      type: String,
      default: '',
      trim: true,
      maxlength: 80,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
      maxlength: 500,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    verified: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
)

reviewSchema.index({ productId: 1, createdAt: -1 })
reviewSchema.index(
  { productId: 1, user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  }
)

reviewSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    productId: this.productId,
    productName: this.productName || '',
    userName: this.userName,
    userLocation: this.userLocation || '',
    rating: this.rating,
    comment: this.comment || '',
    verified: Boolean(this.verified),
    createdAt: this.createdAt,
  }
}

export function buildRatingSummary(reviews = []) {
  const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  let total = 0

  for (const review of reviews) {
    const rating = Math.min(5, Math.max(1, Math.round(Number(review.rating) || 0)))
    if (!rating) continue
    distribution[rating] += 1
    total += rating
  }

  const count = reviews.length
  const average = count ? Math.round((total / count) * 10) / 10 : 0

  return { average, count, distribution }
}

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema)

export default Review
