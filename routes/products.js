import { Router } from 'express'
import multer from 'multer'
import Product from '../models/Product.js'
import { auth, adminOnly } from '../middleware/auth.js'

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
})
const upload = multer({ storage })

router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query
    let filter = {}
    if (category) filter.category = category
    if (search) filter.name = { $regex: search, $options: 'i' }
    const products = await Product.find(filter).sort({ createdAt: -1 })
    res.json(products)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
    if (!product) return res.status(404).json({ error: 'Product not found' })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/', auth, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, unit, stock, category, description } = req.body
    const images = req.files?.map(f => `/uploads/${f.filename}`) || []
    const product = await Product.create({ name, price: Number(price), unit, stock: Number(stock) || 0, category, description, images })
    res.status(201).json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id', auth, adminOnly, upload.array('images', 5), async (req, res) => {
  try {
    const { name, price, unit, stock, category, description } = req.body
    const update = { name, price: Number(price), unit, stock: Number(stock) || 0, category, description }
    if (req.files?.length) {
      update.images = req.files.map(f => `/uploads/${f.filename}`)
    }
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
