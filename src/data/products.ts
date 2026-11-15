
import type { Product } from '../context/store-context'

export const products: Product[] = [
  {
    id: 1,
    name: 'سماعات لاسلكية',
    category: 'الإلكترونيات',
    price: 449,
    oldPrice: 699,
    rating: 4.8,
    discount: '35%',
    image: 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=700',
  },
  {
    id: 2,
    name: 'حذاء رياضي عصري',
    category: 'الأزياء',
    price: 209,
    oldPrice: 349,
    rating: 4.6,
    discount: '40%',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700',
  },
  {
    id: 3,
    name: 'ساعة ذكية متطورة',
    category: 'الإلكترونيات',
    price: 559,
    oldPrice: 799,
    rating: 4.7,
    discount: '30%',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700',
  },
  {
    id: 4,
    name: 'حقيبة عصرية',
    category: 'الأزياء',
    price: 149,
    oldPrice: 199,
    rating: 4.5,
    discount: '25%',
    image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700',
  },
]
