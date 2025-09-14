// Always use try, catch and async-await while trying to communicate with the database.

// require('dotenv').config({path: 'D:/CS/Web Development/Tutorials/BackEnd/BackEndProject/.env'})
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { DB_NAME } from './constants.js';
import connectDB from './db/index.js';

dotenv.config({
    path: 'D:/CS/Web Development/Tutorials/BackEnd/BackEndProject/.env'
})

connectDB()

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