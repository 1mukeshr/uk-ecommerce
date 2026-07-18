import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { STORAGE } from '../config'
import {
  getProductById,
  getProductMinPrice,
  getVariantBySize,
  getVariantStock,
} from '../data/siteData'
import { capitalizeWords } from '../utils/text'

const ShopContext = createContext(null)

const readStore = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

const withCapitalizedNames = (items) =>
  items.map((item) =>
    item?.name
      ? { ...item, name: capitalizeWords(item.name) }
      : item
  )

export function ShopProvider({ children }) {
  const [cart, setCart] = useState(() =>
    withCapitalizedNames(readStore(STORAGE.CART, []))
  )
  const [wishlist, setWishlist] = useState(() =>
    withCapitalizedNames(readStore(STORAGE.WISHLIST, []))
  )
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    localStorage.setItem(STORAGE.CART, JSON.stringify(cart))
  }, [cart])

  useEffect(() => {
    localStorage.setItem(STORAGE.WISHLIST, JSON.stringify(wishlist))
  }, [wishlist])

  useEffect(() => {
    if (!cartOpen) return undefined

    const body = document.body
    const prevOverflow = body.style.overflow

    // Keep page width stable - html already uses scrollbar-gutter: stable
    body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') setCartOpen(false)
    }
    document.addEventListener('keydown', onKey)

    return () => {
      body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [cartOpen])

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + (item.qty || 1), 0),
    [cart],
  )

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * (item.qty || 1), 0),
    [cart],
  )

  const wishlistCount = wishlist.length

  const openCart = useCallback(() => setCartOpen(true), [])
  const closeCart = useCallback(() => setCartOpen(false), [])
  const toggleCart = useCallback(() => setCartOpen((o) => !o), [])

  const addToCart = useCallback(
    (product, { size, qty = 1, open = true, price } = {}) => {
      const variant = getVariantBySize(product, size)
      const unitSize = variant.size
      const unitPrice = price ?? variant.price
      const stock = getVariantStock(product, unitSize)

      if (stock <= 0) return false

      let added = false

      setCart((prev) => {
        const key = `${product.id}::${unitSize}`
        const existing = prev.find((item) => item.key === key)
        const already = existing?.qty || 0
        const room = Math.max(0, stock - already)
        if (room <= 0) {
          added = false
          return prev
        }

        const addQty = Math.min(Math.max(1, qty), room)
        added = addQty > 0

        if (existing) {
          return prev.map((item) =>
            item.key === key
              ? {
                  ...item,
                  qty: already + addQty,
                  price: unitPrice,
                  maxStock: stock,
                }
              : item,
          )
        }

        return [
          ...prev,
          {
            key,
            id: product.id,
            name: capitalizeWords(product.name),
            image: product.image,
            price: unitPrice,
            size: unitSize,
            qty: addQty,
            maxStock: stock,
          },
        ]
      })

      if (added && open) setCartOpen(true)
      return added
    },
    [],
  )

  const updateCartQty = useCallback((key, qty) => {
    setCart((prev) => {
      if (qty <= 0) return prev.filter((item) => item.key !== key)

      return prev
        .map((item) => {
          if (item.key !== key) return item

          const product = getProductById(item.id)
          const stock = product
            ? getVariantStock(product, item.size)
            : Math.max(0, Number(item.maxStock) || 0)
          const nextQty = Math.min(qty, stock)

          if (nextQty <= 0) return null

          return { ...item, qty: nextQty, maxStock: stock }
        })
        .filter(Boolean)
    })
  }, [])

  const getCartQtyForVariant = useCallback(
    (productId, size) => {
      const key = `${productId}::${size}`
      return cart.find((item) => item.key === key)?.qty || 0
    },
    [cart],
  )

  const removeFromCart = useCallback((key) => {
    setCart((prev) => prev.filter((item) => item.key !== key))
  }, [])

  const clearCart = useCallback(() => {
    setCart([])
  }, [])

  const toggleWishlist = useCallback((product) => {
    setWishlist((prev) => {
      const exists = prev.some((item) => item.id === product.id)
      if (exists) return prev.filter((item) => item.id !== product.id)
      return [
        ...prev,
        {
          id: product.id,
          name: capitalizeWords(product.name),
          image: product.image,
          price: getProductMinPrice(product),
        },
      ]
    })
  }, [])

  const isInWishlist = useCallback(
    (productId) => wishlist.some((item) => item.id === productId),
    [wishlist],
  )

  const value = useMemo(
    () => ({
      cart,
      wishlist,
      cartCount,
      cartTotal,
      wishlistCount,
      cartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      updateCartQty,
      getCartQtyForVariant,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isInWishlist,
    }),
    [
      cart,
      wishlist,
      cartCount,
      cartTotal,
      wishlistCount,
      cartOpen,
      openCart,
      closeCart,
      toggleCart,
      addToCart,
      updateCartQty,
      getCartQtyForVariant,
      removeFromCart,
      clearCart,
      toggleWishlist,
      isInWishlist,
    ],
  )

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>
}

export function useShop() {
  const ctx = useContext(ShopContext)
  if (!ctx) throw new Error('useShop must be used within ShopProvider')
  return ctx
}
