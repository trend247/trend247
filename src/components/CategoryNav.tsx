
type CategoryNavProps = {
    categories: { name: string; icon: string }[]
    selectedCategory: string
    onSelectCategory: (category: string) => void
}

function CategoryNav({
    categories,
    selectedCategory,
    onSelectCategory,
}: CategoryNavProps) {
    return (
        <nav className="desktop-categories">
            <button
                className={selectedCategory === 'الكل' ? 'active' : ''}
                onClick={() => onSelectCategory('الكل')}
            >
                الكل
            </button>

            {categories.map((category) => (
                <button
                    key={category.name}
                    className={selectedCategory === category.name ? 'active' : ''}
                    onClick={() => onSelectCategory(category.name)}
                >
                    {category.name}
                </button>
            ))}
        </nav>
    )
}

export default CategoryNav
