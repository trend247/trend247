
import { useEffect, useRef, useState } from 'react'
import type { Product } from '../context/store-context'
import { useStore } from '../context/useStore'

type ProductCardProps = {
    product: Product
    onSelect: (product: Product) => void
}

function ProductCard({ product, onSelect }: ProductCardProps) {
    const {
        favorites,
        toggleFavorite,
        addToCart,
        getProductPricing,
    } = useStore()

    const [justAdded, setJustAdded] = useState(false)
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isFavorite = favorites.includes(product.id)

    // حساب السعر حسب العرض الساري
    const pricing = getProductPricing(product)

    const hasOffer =
        Boolean(pricing.offerId) &&
        pricing.offerDiscount > 0

    // الخصم اليدوي المسجل على المنتج
    const hasManualDiscount =
        !hasOffer &&
        product.oldPrice > product.price &&
        product.price > 0

    const hasDiscount = hasOffer || hasManualDiscount

    const currentPrice = hasOffer
        ? pricing.unitPrice
        : product.price

    const originalPrice = hasOffer
        ? pricing.originalUnitPrice
        : product.oldPrice

    const discountPercentage =
        hasDiscount && originalPrice > 0
            ? Math.round(
                ((originalPrice - currentPrice) / originalPrice) * 100
            )
            : 0

    useEffect(() => {
        return () => {
            if (resetTimer.current) {
                clearTimeout(resetTimer.current)
            }
        }
    }, [])

    const handleAddToCart = () => {
        addToCart(product)

        setJustAdded(true)

        if (resetTimer.current) {
            clearTimeout(resetTimer.current)
        }

        resetTimer.current = setTimeout(() => {
            setJustAdded(false)
        }, 1400)
    }

    return (
        <article
            className={`product-card ${justAdded ? 'product-added' : ''}`}
        >
            <div className="product-image">
                <button
                    className="product-details-trigger"
                    onClick={() => onSelect(product)}
                    aria-label={`عرض تفاصيل ${product.name}`}
                    type="button"
                >
                    <img src={product.image} alt={product.name} />
                </button>

                {hasOffer && (
                    <span className="discount-badge offer-badge">
                        🔥 عرض خاص {discountPercentage}%
                    </span>
                )}

                {!hasOffer && hasManualDiscount && (
                    <span className="discount-badge">
                        خصم {product.discount || `${discountPercentage}%`}
                    </span>
                )}

                <button
                    className={`favorite-button ${isFavorite ? 'liked' : ''}`}
                    onClick={() => toggleFavorite(product.id)}
                    aria-label="إضافة للمفضلة"
                    type="button"
                >
                    {isFavorite ? '♥' : '♡'}
                </button>
            </div>

            <div className="product-info">
                <small>{product.category}</small>

                <h3>
                    <button
                        className="product-name-trigger"
                        onClick={() => onSelect(product)}
                        type="button"
                    >
                        {product.name}
                    </button>
                </h3>

                <div className="rating">
                    {product.rating} <span>★</span>
                </div>

                <div className="price">
                    <strong>{currentPrice.toFixed(2)} ر.س</strong>

                    {hasDiscount && (
                        <del>{originalPrice.toFixed(2)} ر.س</del>
                    )}
                </div>

                {hasOffer && (
                    <div className="product-card-offer-info">
                        <span>🏷️ {pricing.offerName}</span>
                        <span>
                            وفّر {pricing.offerDiscount.toFixed(2)} ر.س
                        </span>
                    </div>
                )}

                <button
                    className={`add-button ${justAdded ? 'added' : ''}`}
                    onClick={handleAddToCart}
                    type="button"
                    aria-live="polite"
                >
                    {justAdded ? (
                        <>✓ تمت الإضافة</>
                    ) : (
                        <>🛒 أضف إلى السلة</>
                    )}
                </button>
            </div>
        </article>
    )
}

export default ProductCard
