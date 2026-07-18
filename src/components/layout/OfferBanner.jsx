import { Link } from 'react-router-dom'
import { ArrowRightIcon } from '../icons'
import { ROUTES } from '../../config'
import { homeOffers } from '../../data/siteData'

const OfferBanner = () => {
  if (!homeOffers?.length) return null

  const featured =
    homeOffers.find((offer) => offer.featured) || homeOffers[0]
  const sideOffers = homeOffers.filter((offer) => offer.id !== featured.id)

  return (
    <section className="home-offer" aria-label="Current offers">
      <div className="container home-offer__layout">
        <Link
          to={featured.href || ROUTES.SHOP}
          className="home-offer__featured"
        >
          <img
            src={featured.image}
            alt={featured.title}
            className="home-offer__featured-img"
            loading="lazy"
          />
          <div className="home-offer__featured-shade" aria-hidden="true" />
          <div className="home-offer__featured-copy">
            <p className="home-offer__eyebrow">{featured.eyebrow}</p>
            <h2>{featured.title}</h2>
            <p className="home-offer__text">{featured.text}</p>
            <div className="home-offer__actions">
              {featured.code && (
                <span className="home-offer__code">
                  Code <strong>{featured.code}</strong>
                </span>
              )}
              <span className="home-offer__cta">
                {featured.cta}
                <ArrowRightIcon size={15} />
              </span>
            </div>
          </div>
        </Link>

        {sideOffers.length > 0 && (
          <div className="home-offer__side">
            {sideOffers.map((offer) => (
              <Link
                key={offer.id}
                to={offer.href || ROUTES.SHOP}
                className="home-offer__tile"
              >
                <span className="home-offer__tile-media" aria-hidden="true">
                  <img src={offer.image} alt="" loading="lazy" />
                </span>
                <span className="home-offer__tile-copy">
                  <em>{offer.eyebrow}</em>
                  <strong>{offer.title}</strong>
                  <span className="home-offer__tile-cta">
                    {offer.cta}
                    <ArrowRightIcon size={14} />
                  </span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default OfferBanner
