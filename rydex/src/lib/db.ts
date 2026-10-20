import mongoose from "mongoose"

let cached = global.mongooseConn
if (!cached) {
    cached = global.mongooseConn = { conn: null, promise: null }
}

const connectDb = async () => {
    const mongodbUrl = process.env.MONGODB_URL || process.env.MONGODB_URI
    if (!mongodbUrl) {
        throw new Error("db url not found!")
    }

    if (cached.conn) {
        return cached.conn
    }


    if(!cached.promise){
        cached.promise=mongoose.connect(mongodbUrl)
            .then(c => c.connection)
            .catch(err => {
                // M5/H2: Reset so future calls retry the connection
                cached.promise = null
                throw err
            })
    }

try {
    const conn=await cached.promise
    cached.conn = conn
    return conn
} catch (error) {
    // H2: Re-throw so API routes return 500 instead of silently failing
    console.error("[db] MongoDB connection error:", error instanceof Error ? error.message : error)
    throw error
}

}

export default connectDb