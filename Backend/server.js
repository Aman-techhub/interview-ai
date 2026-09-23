require("dotenv").config()
const app=require("./src/app")
const connectToDB=require("./src/config/database")


connectToDB()

const PORT=3000

const server=app.listen(PORT,()=>{
    console.log(`server is running on port ${PORT}`)
})

