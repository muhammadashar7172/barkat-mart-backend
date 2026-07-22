import { Router } from 'express'
import Order from '../models/Order.js'
import Product from '../models/Product.js'
import { auth, adminOnly } from '../middleware/auth.js'

const router = Router()

router.get('/', auth, async (req, res) => {
  try {
    let orders
    if (req.user.role === 'admin') {
      orders = await Order.find().sort({ createdAt: -1 })
    } else {
      orders = await Order.find({ userId: req.userId }).sort({ createdAt: -1 })
    }
    res.json(orders)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', auth, async (req, res) => {
  try {
    const { items, total, address, phone } = req.body
    const order = await Order.create({
      userId: req.userId,
      userName: req.user.name,
      items,
      total,
      address,
      phone,
      status: 'pending'
    })

    for (const item of items) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.quantity } })
    }

    res.status(201).json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true })

    if (status === 'cancelled') {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, { $inc: { stock: item.quantity } })
      }
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
