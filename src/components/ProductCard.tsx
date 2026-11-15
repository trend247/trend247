
import { useEffect, useRef, useState } from 'react'
import type { Product } from '../context/store-context'
import { useStore } from '../context/useStore'

type ProductCardProps = {
    product: Product
    onSelect: (product: Product) => void
}

function ProductCard({ product, onSelect }: ProductCardProps) {
    const { favorites, toggleFavorite, addToCart } = useStore()

    const [justAdded, setJustAdded] = useState(false)
    const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    const isFavorite = favorites.includes(product.id)

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
                >
                    <img src={product.image} alt={product.name} />
                </button>

                <span className="discount-badge">
                    خصم {product.discount}
                </span>

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
                    >
                        {product.name}
                    </button>
                </h3>

                <div className="rating">
                    {product.rating} <span>★</span>
                </div>

                <div className="price">
                    <strong>{product.price} ر.س</strong>
                    <del>{product.oldPrice} ر.س</del>
                </div>

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
