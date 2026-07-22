import dns from 'dns'
import mongoose from 'mongoose'

let cached = global.mongoose
if (!cached) cached = global.mongoose = { conn: null, promise: null }

const connectDB = async () => {
  if (cached.conn) return cached.conn

  if (!cached.promise) {
    cached.promise = (async () => {
      const uri = process.env.MONGODB_URI

      if (uri.startsWith('mongodb+srv://')) {
        const url = new URL(uri)
        const srvHost = `_mongodb._tcp.${url.hostname}`

        const googleDNS = new dns.Resolver()
        googleDNS.setServers(['8.8.8.8', '8.8.4.4'])

        const [srvRecords, txtRecords] = await Promise.all([
          new Promise((resolve, reject) => {
            googleDNS.resolveSrv(srvHost, (err, records) => err ? reject(err) : resolve(records))
          }),
          new Promise((resolve) => {
            googleDNS.resolveTxt(url.hostname, (err, records) => err ? resolve([]) : resolve(records))
          }).catch(() => [])
        ])

        let replicaSet = null
        let authSource = 'admin'
        for (const txt of txtRecords) {
          const str = txt.join('')
          if (str.includes('replicaSet=')) replicaSet = str.split('replicaSet=')[1].split('&')[0]
          if (str.includes('authSource=')) authSource = str.split('authSource=')[1].split('&')[0]
        }

        const hosts = srvRecords.map(r => `${r.name}:${r.port}`).join(',')
        const user = decodeURIComponent(url.username)
        const pass = decodeURIComponent(url.password)
        const dbName = url.pathname.slice(1) || 'admin'

        let directUri = `mongodb://${user}:${pass}@${hosts}/${dbName}?authSource=${authSource}&tls=true`
        if (replicaSet) directUri += `&replicaSet=${replicaSet}`

        return mongoose.connect(directUri, {
          serverSelectionTimeoutMS: 15000,
          connectTimeoutMS: 15000,
          tls: true,
        })
      } else {
        return mongoose.connect(uri)
      }
    })()
  }

  cached.conn = await cached.promise
  return cached.conn
}

export default connectDB
