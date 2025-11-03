import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js"
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async(req, _, next) =>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        // console.log("Access Token:", token)
        
        if(!token){
            throw new APIError(401, 'Unauthorised Request.');
        }
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        const user = await User.findById(decodedToken?._id).select("-password -refreshToken")
        if(!user){
            throw new APIError(401, "Invalid Access Token.")
        }
        req.user = user;
        next();
    } catch (error) {
        throw new APIError(401, error?.message || "Invalid Access Token");
    }
})