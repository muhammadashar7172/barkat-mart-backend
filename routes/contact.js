import { Router } from 'express'
import ContactMessage from '../models/ContactMessage.js'
import { auth, adminOnly } from '../middleware/auth.js'

const router = Router()

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required' })
    }
    const msg = await ContactMessage.create({ name, email, subject, message })
    res.status(201).json({ message: 'Message sent successfully', id: msg._id })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const messages = await ContactMessage.find().sort({ createdAt: -1 })
    res.json(messages)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.put('/:id/read', auth, adminOnly, async (req, res) => {
  try {
    await ContactMessage.findByIdAndUpdate(req.params.id, { read: true })
    res.json({ message: 'Marked as read' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await ContactMessage.findByIdAndDelete(req.params.id)
    res.json({ message: 'Deleted' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
