import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (file: Blob | File | null): Promise<string | null> => {
  if (!file) {
      return null
  }
  try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const originalName = (file as File).name || ''
      const extension = originalName.split('.').pop()?.toLowerCase()
      
      let format = extension && ["jpg", "jpeg", "png", "webp"].includes(extension) ? extension : undefined
      if (extension === 'pdf' || file.type === 'application/pdf') {
        format = 'png'
      }

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream({
          resource_type: "auto",
          format,
          flags: "attachment:false"
        }, (error, result) => {
          if (error) {
              console.error("Cloudinary Upload Error:", error)
              reject(error)
          } else {
              resolve(result?.secure_url ?? null)
          }
        })

        uploadStream.end(buffer)
      })
  } catch (error) {
      console.error("Cloudinary Upload Exception:", error)
      return null
  }
}

export default uploadOnCloudinary