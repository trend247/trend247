
export type BannerPosition = 'hero' | 'secondary' | 'category'

export type StoreBanner = {
    id: string
    name: string
    title: string
    description: string
    image: string
    mobileImage: string
    link: string
    buttonText: string
    position: BannerPosition
    categoryId: string
    active: boolean
    sortOrder: number
    createdAt?: unknown
    updatedAt?: unknown
}

export type BannerInput = Omit<
    StoreBanner,
    'id' | 'createdAt' | 'updatedAt'
>
