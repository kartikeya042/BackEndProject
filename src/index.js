// Always use try, catch and async-await while trying to communicate with the database.

// require('dotenv').config({path: 'D:/CS/Web Development/Tutorials/BackEnd/BackEndProject/.env'})
import dotenv from 'dotenv';
import connectDB from './db/index.js';
import { app } from './app.js';

dotenv.config({
    path: 'D:/CS/Web Development/Tutorials/BackEnd/BackEndProject/.env'
})

connectDB()
.then(() => {
    app.listen(process.env.PORT || 8000, ()=>{
        console.log(`Server is running at port number: ${process.env.PORT}`);
    })
})
.catch((err) => {
    console.log("MongoDB connection failed!!", err);
})

/*
import express from 'express';
const app = express()

( async() => {
    try{
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        app.on("error", (error) =>{
            console.log("ERROR", error)
            throw error
        })

        app.listen(process.env.PORT, ()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch(error){
        console.log("ERROR: ", error)
        throw err
    }
})()
*/