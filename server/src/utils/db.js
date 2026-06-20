import mongoose from 'mongoose'

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.DB_URL || 'mongodb://db:27017'
    await mongoose.connect(`${mongoUri}/deploy_db`)
    console.log('MongoDB connected')
  } catch (error) {
    console.error(error)
    process.exit(1)
  }
}

export default connectDB
