import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FaqSection from '../components/layout/FaqSection'
import Footer from '../components/layout/Footer'
import HeroBanner from '../components/layout/HeroBanner'
import OfferBanner from '../components/layout/OfferBanner'
import ProductSection from '../components/products/ProductSection'
import {
  ShieldIcon,
  TruckIcon,
  CheckCircleIcon,
  MountainIcon,
  HillsIcon,
  LeafIcon,
  StarRating,
  ArrowLeftIcon,
  ArrowRightIcon,
} from '../components/icons'
import { ROUTES } from '../config'
import { features } from '../data/siteData'
import {
  ADDRESSES_EVENT,
  LOCATION_EVENT,
  hasCompleteShippingAddress,
  requestOpenAddressPicker,
} from '../utils/locationStorage'
import { useShop } from '../context/ShopContext'
import { fetchRecentReviews } from '../services/reviewService'

const whyIcons = {
  leaf: LeafIcon,
  mountain: MountainIcon,
  shield: ShieldIcon,
}

const REVIEWS_VISIBLE = 3

/**
 * Home UX flow:
 * Banner → Trust → Best Sellers → Offers → Trending → Why us → Handpicked → Reviews
 */
const Home = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { openCart, cartCount } = useShop()
  const [checkoutHint, setCheckoutHint] = useState('')
  const [addressReady, setAddressReady] = useState(() =>
    hasCompleteShippingAddress()
  )
  const [homeReviews, setHomeReviews] = useState([])
  const [homeSummary, setHomeSummary] = useState({ average: 4.8, count: 0 })
  const [canSlideLeft, setCanSlideLeft] = useState(false)
  const [canSlideRight, setCanSlideRight] = useState(false)
  const reviewsTrackRef = useRef(null)

  useEffect(() => {
    let alive = true
    fetchRecentReviews(9).then((data) => {
      if (!alive) return
      setHomeReviews(data.reviews)
      setHomeSummary(data.summary)
    })
    return () => {
      alive = false
    }
  }, [])

  const updateReviewsScroll = useCallback(() => {
    const track = reviewsTrackRef.current
    if (!track) return
    const { scrollLeft, scrollWidth, clientWidth } = track
    setCanSlideLeft(scrollLeft > 8)
    setCanSlideRight(scrollLeft + clientWidth < scrollWidth - 8)
  }, [])

  const scrollReviews = (direction) => {
    const track = reviewsTrackRef.current
    if (!track) return
    const slide = track.querySelector('.reviews-slider__slide')
    const gap = 16
    const cardStep = slide
      ? slide.getBoundingClientRect().width + gap
      : track.clientWidth / REVIEWS_VISIBLE
    const visible = Math.max(
      1,
      Math.round(track.clientWidth / cardStep)
    )
    const step = cardStep * visible
    track.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: 'smooth',
    })
  }

  useEffect(() => {
    const track = reviewsTrackRef.current
    if (!track || homeReviews.length === 0) return undefined

    updateReviewsScroll()
    track.addEventListener('scroll', updateReviewsScroll, { passive: true })
    window.addEventListener('resize', updateReviewsScroll)

    return () => {
      track.removeEventListener('scroll', updateReviewsScroll)
      window.removeEventListener('resize', updateReviewsScroll)
    }
  }, [homeReviews.length, updateReviewsScroll])

  useEffect(() => {
    const sync = () => setAddressReady(hasCompleteShippingAddress())
    window.addEventListener(LOCATION_EVENT, sync)
    window.addEventListener(ADDRESSES_EVENT, sync)
    return () => {
      window.removeEventListener(LOCATION_EVENT, sync)
      window.removeEventListener(ADDRESSES_EVENT, sync)
    }
  }, [])

  useEffect(() => {
    const state = location.state
    if (!state?.needAddress && !state?.resumeCheckout) return undefined

    const hint =
      state.checkoutHint ||
      'Add your delivery address, then open your bag to checkout.'
    setCheckoutHint(hint)
    setAddressReady(hasCompleteShippingAddress())

    if (!hasCompleteShippingAddress()) {
      const t = window.setTimeout(() => {
        requestOpenAddressPicker({ message: hint })
      }, 400)
      navigate(ROUTES.HOME, { replace: true })
      return () => window.clearTimeout(t)
    }

    navigate(ROUTES.HOME, { replace: true })
    return undefined
  }, [location.state, navigate])

  return (
    <>
      <main className="home-page">
        {checkoutHint ? (
          <div className="home-checkout-banner" role="status">
            <div className="container home-checkout-banner__inner">
              <p>{checkoutHint}</p>
              <div className="home-checkout-banner__actions">
                {!addressReady ? (
                  <button
                    type="button"
                    className="btn-hero-primary"
                    onClick={() =>
                      requestOpenAddressPicker({ message: checkoutHint })
                    }
                  >
                    Add address
                  </button>
                ) : null}
                {cartCount > 0 && addressReady ? (
                  <button
                    type="button"
                    className="btn-hero-primary"
                    onClick={() => openCart()}
                  >
                    Open bag
                  </button>
                ) : null}
                <button
                  type="button"
                  className="home-checkout-banner__dismiss"
                  onClick={() => setCheckoutHint('')}
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <HeroBanner />

        {/* 1. Trust strip */}
        <section className="benefits benefits--home" aria-label="Why shop with us">
          <div className="container benefits-grid">
            <div className="benefit-item">
              <div className="benefit-icon" aria-hidden="true"><ShieldIcon size={22} /></div>
              <div className="benefit-copy">
                <h4>Secure pay</h4>
                <p>Safe checkout every time</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon" aria-hidden="true"><TruckIcon size={22} /></div>
              <div className="benefit-copy">
                <h4>Free shipping</h4>
                <p>On orders above ₹499</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon" aria-hidden="true"><CheckCircleIcon size={22} /></div>
              <div className="benefit-copy">
                <h4>100% natural</h4>
                <p>No artificial additives</p>
              </div>
            </div>
            <div className="benefit-item">
              <div className="benefit-icon" aria-hidden="true"><HillsIcon size={22} /></div>
              <div className="benefit-copy">
                <h4>From the hills</h4>
                <p>Direct from local makers</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Primary products */}
        <ProductSection
          id="bestsellers"
          title="Best Sellers"
          subtitle="Most-loved hill products families reorder every season."
          tag="bestseller"
          limit={5}
          seeAllHref={`${ROUTES.SHOP}?tag=bestseller`}
        />

        <OfferBanner />

        {/* What’s hot */}
        <ProductSection
          id="trending"
          title="Trending now"
          subtitle="What shoppers are discovering and adding to bag today."
          tag="trending"
          limit={5}
          seeAllHref={`${ROUTES.SHOP}?tag=trending`}
        />

        {/* Brand trust */}
        <section className="home-section why-section" id="why">
          <div className="container">
            <div className="why-section__intro">
              <p className="section-eyebrow">Why PahadLink</p>
              <h2>Better goods from the hills</h2>
              <p className="why-section__lead">
                A direct link between Himalayan makers and your doorstep - not a generic marketplace.
              </p>
            </div>
            <div className="why-grid">
              {features.map((feature, index) => {
                const Icon = whyIcons[feature.icon] || CheckCircleIcon
                return (
                  <article
                    key={feature.title}
                    className={`why-card${index === 1 ? ' why-card--featured' : ''}`}
                  >
                    <span className="why-card__step" aria-hidden="true">
                      0{index + 1}
                    </span>
                    <div className="why-card__icon">
                      <Icon size={24} />
                    </div>
                    <h3>{feature.title}</h3>
                    <p>{feature.desc}</p>
                    <ul className="why-card__points">
                      {feature.points.map((point) => (
                        <li key={point}>
                          <CheckCircleIcon size={15} />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* 7. Curated picks */}
        <ProductSection
          id="handpicked"
          title="Handpicked for you"
          subtitle="Fresh harvests and handmade finds from Himalayan makers."
          tag="handpicked"
          limit={5}
          seeAllHref={`${ROUTES.SHOP}?tag=handpicked`}
        />

        {/* 8. Social proof */}
        <section className="home-section reviews-section" id="reviews">
          <div className="container">
            <div className="section-head section-head--row reviews-head">
              <div>
                <h2>Loved across India</h2>
                <p>Real orders and honest feedback from pahadi food lovers.</p>
              </div>
              <div className="reviews-head__aside">
                <div
                  className="reviews-score"
                  aria-label={`Average rating ${homeSummary.average} out of 5`}
                >
                  <strong>{(homeSummary.average || 0).toFixed(1)}</strong>
                  <div>
                    <StarRating rating={homeSummary.average || 0} />
                    <span>
                      {homeSummary.count > 0
                        ? `Based on ${homeSummary.count}+ ratings`
                        : 'Based on verified orders'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="reviews-slider">
              {homeReviews.length > REVIEWS_VISIBLE && (
                <>
                  <button
                    type="button"
                    className="reviews-slider__nav reviews-slider__nav--prev"
                    onClick={() => scrollReviews('prev')}
                    disabled={!canSlideLeft}
                    aria-label="Previous reviews"
                  >
                    <ArrowLeftIcon size={16} />
                  </button>
                  <button
                    type="button"
                    className="reviews-slider__nav reviews-slider__nav--next"
                    onClick={() => scrollReviews('next')}
                    disabled={!canSlideRight}
                    aria-label="Next reviews"
                  >
                    <ArrowRightIcon size={16} />
                  </button>
                </>
              )}
              {canSlideLeft && (
                <div
                  className="reviews-slider__fade reviews-slider__fade--left"
                  aria-hidden="true"
                />
              )}
              {canSlideRight && (
                <div
                  className="reviews-slider__fade reviews-slider__fade--right"
                  aria-hidden="true"
                />
              )}
              <div className="reviews-slider__track" ref={reviewsTrackRef}>
                {homeReviews.map((review) => (
                  <article key={review.id} className="reviews-slider__slide review-card">
                    <div className="review-card__top">
                      <StarRating
                        rating={review.rating}
                        className="review-stars"
                      />
                      {review.verified ? (
                        <span className="review-verified">
                          <CheckCircleIcon size={14} />
                          Verified
                        </span>
                      ) : null}
                    </div>
                    <p className="review-text">{review.comment}</p>
                    {review.productName && (
                      <p className="review-product">Bought {review.productName}</p>
                    )}
                    <div className="review-author">
                      <span className="review-avatar" aria-hidden="true">
                        {(review.userName || 'PL')
                          .split(' ')
                          .map((part) => part[0])
                          .slice(0, 2)
                          .join('')}
                      </span>
                      <div>
                        <strong>{review.userName}</strong>
                        <span>{review.userLocation || 'India'}</span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <FaqSection
          page="home"
          title="Questions shoppers ask"
          subtitle="Quick answers before you place your first order."
        />
      </main>
      <Footer />
    </>
  )
}

export default Home
