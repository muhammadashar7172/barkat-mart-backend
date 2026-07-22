import { Router } from 'express'
import Category from '../models/Category.js'
import { auth, adminOnly } from '../middleware/auth.js'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 })
    res.json(categories)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name } = req.body
    const exists = await Category.findOne({ name })
    if (exists) return res.status(400).json({ error: 'Category already exists' })
    const category = await Category.create({ name })
    res.status(201).json(category)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
