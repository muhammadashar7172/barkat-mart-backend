import mongoose from 'mongoose'

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  unit: { type: String, default: 'pcs' },
  stock: { type: Number, default: 0 },
  category: { type: String, default: '' },
  images: [{ type: String }],
  description: { type: String, default: '' }
}, { timestamps: true })

export default mongoose.model('Product', productSchema)
