import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import nodemailer from 'nodemailer'
import User from '../models/User.js'
import Otp from '../models/Otp.js'
import { auth } from '../middleware/auth.js'

const router = Router()

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `"Barkat Mart" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    })
    return true
  } catch (err) {
    console.error('Email error:', err.message)
    return false
  }
}

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ error: 'Email already registered' })

    const hashed = await bcrypt.hash(password, 10)
    const user = await User.create({ name, email, password: hashed })
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    await sendEmail(email, 'Welcome to Barkat Mart!', `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:auto;padding:30px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#1d3557;text-align:center;">Welcome to Barkat Mart</h2>
        <p style="color:#555;font-size:15px;">Hi <strong>${name}</strong>,</p>
        <p style="color:#555;font-size:15px;">Your account has been created successfully.</p>
        <div style="text-align:center;margin:30px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" style="background:#2a9d8f;color:#fff;padding:12px 30px;border-radius:8px;text-decoration:none;font-weight:600;">Start Shopping</a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">Thank you for choosing Barkat Mart</p>
      </div>
    `)

    res.status(201).json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findOne({ email })
    if (!user) return res.status(400).json({ error: 'Invalid credentials' })

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' })

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' })
    res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role }, token })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/me', auth, async (req, res) => {
  res.json({ user: req.user })
})

router.post('/send-otp', async (req, res) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ error: 'Email is required' })

    const user = await User.findOne({ email })
    if (!user) return res.status(404).json({ error: 'No account found with this email' })

    await Otp.updateMany({ email }, { $set: { used: true } })

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)
    await Otp.create({ email, otp, expiresAt })

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:440px;margin:auto;padding:30px;border:1px solid #eee;border-radius:12px;">
        <h2 style="color:#1d3557;text-align:center;margin-bottom:8px;">Password Reset</h2>
        <p style="color:#888;text-align:center;font-size:14px;margin-bottom:28px;">Use the OTP below to reset your password</p>
        <div style="text-align:center;margin:24px 0;">
          <div style="display:inline-flex;gap:8px;">
            ${otp.split('').map(d => `<span style="display:inline-block;width:48px;height:52px;line-height:52px;text-align:center;font-size:24px;font-weight:700;color:#1d3557;background:#f0f7f6;border:2px solid #2a9d8f;border-radius:10px;">${d}</span>`).join('')}
          </div>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;margin-top:24px;">This OTP expires in <strong>5 minutes</strong>.</p>
        <p style="color:#999;font-size:12px;text-align:center;">If you didn't request this, please ignore this email.</p>
      </div>
    `

    const sent = await sendEmail(email, `Your OTP: ${otp} - Barkat Mart`, html)
    if (sent) {
      res.json({ message: 'OTP sent to your email' })
    } else {
      console.log(`\n========================================`)
      console.log(`  DEV MODE - OTP for ${email}: ${otp}`)
      console.log(`========================================\n`)
      res.json({ message: 'OTP sent to your email', devOtp: otp })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' })

    const record = await Otp.findOne({
      email,
      otp,
      used: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 })

    if (!record) return res.status(400).json({ error: 'Invalid or expired OTP' })

    record.used = true
    await record.save()

    const resetToken = jwt.sign({ id: email, purpose: 'password-reset' }, process.env.JWT_SECRET, { expiresIn: '10m' })
    res.json({ message: 'OTP verified successfully', resetToken })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/reset-password', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body
    if (!resetToken || !newPassword) return res.status(400).json({ error: 'Token and new password are required' })

    let decoded
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET)
    } catch {
      return res.status(400).json({ error: 'Invalid or expired token' })
    }

    if (decoded.purpose !== 'password-reset') return res.status(400).json({ error: 'Invalid token' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await User.findOneAndUpdate({ email: decoded.id }, { password: hashed })

    res.json({ message: 'Password reset successful' })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
