import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { upload } from "../middlewares/multer.middleware.js";
import { APIResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req, res) =>{
    // Steps for registration:
    // take data from users;
    // validate the data;
    // check if user already exists
    // check for images, check for avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return response

    const {username, fullname, email, password} = req.body;
    console.log("Email:", email);

    // Basic method:
    // if(fullname === ""){
    //     throw new APIError(400, "Full Name is required.")
    // }

    // Checking if all the fields are filled or not.
    if(
        [fullname, email, password, username].some((field) => 
        field?.trim() === "")
    ){
        throw new APIError(400, "All fields are required.")
    }

    // Checking if a user already exists or not.
    const existedUser = User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new APIError(409, "User with email or username already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;

    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar file is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new APIError(400, "Avatar file is required.");
    }

    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    })

    // This is used to get the data and except for the given fields.
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new APIError(500, "Something went wrong while registering the user.");
    }

    return res.status(201).json(
        new APIResponse(200, createdUser, "User Registered Successfully.")
    )

})

export {registerUser}