import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import authRoutes from '../routes/auth.js'
import productRoutes from '../routes/products.js'
import orderRoutes from '../routes/orders.js'
import categoryRoutes from '../routes/categories.js'
import userRoutes from '../routes/users.js'
import stockRoutes from '../routes/stock.js'
import contactRoutes from '../routes/contact.js'

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

const connectDB = async () => {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    }).then(m => m)
  }
  cached.conn = await cached.promise
  return cached.conn
}

const app = express()
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE'] }))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/categories', categoryRoutes)
app.use('/api/users', userRoutes)
app.use('/api/stock', stockRoutes)
app.use('/api/contact', contactRoutes)

app.get('/', (req, res) => res.json({ message: 'Barkat Mart API running' }))

export default async function handler(req, res) {
  await connectDB()
  return app(req, res)
}
