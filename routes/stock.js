import { Router } from 'express'
import Product from '../models/Product.js'
import StockMovement from '../models/StockMovement.js'
import { auth, adminOnly } from '../middleware/auth.js'

const router = Router()

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [products, movements] = await Promise.all([
      Product.find().sort({ name: 'asc' }),
      StockMovement.find().sort({ createdAt: -1 }).limit(50)
    ])
    res.json({ products, movements })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { productId, type, quantity, note } = req.body
    const product = await Product.findById(productId)
    if (!product) return res.status(404).json({ error: 'Product not found' })

    const newStock = type === 'in' ? product.stock + Number(quantity) : product.stock - Number(quantity)
    if (newStock < 0) return res.status(400).json({ error: 'Insufficient stock' })

    await Product.findByIdAndUpdate(productId, { stock: newStock })
    const movement = await StockMovement.create({
      productId,
      productName: product.name,
      type,
      quantity: Number(quantity),
      note
    })

    res.status(201).json(movement)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
