import mongoose from 'mongoose'

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

const connectDB = async () => {
  if (cached.conn) return cached.conn
  if (!cached.promise) {
    const uri = process.env.MONGODB_URI
    cached.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      tls: true,
    }).then(m => m)
  }
  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
