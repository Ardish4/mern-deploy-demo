import dotenv from 'dotenv'
dotenv.config()

import connectDB from './utils/db.js'
import app from './app.js'

const PORT = process.env.PORT || 3000

connectDB()
.then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
  })
})
.catch((err) => {
  console.error('Failed to connect to the database:', err)
})
