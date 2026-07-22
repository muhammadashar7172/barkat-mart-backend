import mongoose from 'mongoose'

const stockMovementSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  type: { type: String, enum: ['in', 'out'], required: true },
  quantity: { type: Number, required: true },
  note: { type: String, default: '' }
}, { timestamps: true })

export default mongoose.model('StockMovement', stockMovementSchema)
