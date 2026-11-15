
import ProductCard from './ProductCard'
import type { Product } from '../context/store-context'

type ProductGridProps = {
    products: Product[]
    onSelectProduct: (product: Product) => void
}

function ProductGrid({
    products,
    onSelectProduct,
}: ProductGridProps) {
    return (
        <div className="products-grid">
            {products.map((product) => (
                <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelectProduct}
                />
            ))}
        </div>
    )
}

export default ProductGrid
