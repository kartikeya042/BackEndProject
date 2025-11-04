import { asyncHandler } from "../utils/asyncHandler.js";
import {APIError} from "../utils/apiError.js";
import {User} from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try{
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});

        return {accessToken, refreshToken};
    }
    catch(error){
        throw new APIError(500, 'Something went wrong while generating access and refresh token.')
    }
}

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

    const {username, fullName, email, password} = req.body;
    console.log("Email:", email);

    // Basic method:
    // if(fullname === ""){
    //     throw new APIError(400, "Full Name is required.")
    // }

    // Checking if all the fields are filled or not.
    if(
        [fullName, email, password, username].some((field) => 
        field?.trim() === "")
    ){
        throw new APIError(400, "All fields are required.")
    }

    // Checking if a user already exists or not.
    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new APIError(409, "User with email or username already exists.")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    // const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }
    if (!avatarLocalPath) {
        throw new APIError(400, "Avatar file is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new APIError(400, "Avatar file is required.");
    }
    
    const user = await User.create({
        fullName,
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

const loginUser = asyncHandler(async (req, res) =>{
    //req body => data
    // username or email
    // find the user
    // password check
    // access and refresh token
    //send cookies

    const {email, username, password} = req.body;

    if(!username && !email){
        throw new APIError(404, 'Username or email is required.')
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new APIError(404, 'User does not exist');
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new APIError(404, 'Invalid User credentials.')
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie('accessToken',accessToken, options)
    .cookie('refreshToken', refreshToken, options)
    .json(
        new APIResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged in successfully."
        )
    )

})


const logoutUser = asyncHandler(async(req,res) =>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new APIResponse(200, {}, "User Logged Out"))
})

const refreshAccessToken = asyncHandler(async(req,res) =>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new APIError(401, "Unauthorised Request");
    }

    try {
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    
        const user = User.findById(decodedToken?._id)
        if(!user){
            throw new APIError("Invalid refresh token");
        }
    
        if(incomingRefreshToken !== user?.refreshToken){
            throw new APIError(401, "Refresh token is expired or used.");
        }
    
        const options = {
            http: true,
            secure: true
        }
        const {accessToken, newrefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newrefreshToken, options)
        .json(
            new APIResponse(
                200,
                {accessToken, refreshToken: newrefreshToken},
                "Access token refreshed."
            )
        )       
    } catch (error) {
        throw new APIError(401, error?.message || "Invalid refresh token.")
    }
})

const changeCurrentPassword = asyncHandler(async(req,res) =>{
    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id);
    const isPasswordCorrect = await isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new APIError(400, "Invalid Old Password.");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false})

    return res
    .status(200)
    .json(new APIResponse(200, {}, "Password changed successfully."))
})

const getCurrentUser = asyncHandler(async(req, res) =>{
    return res
    .status(200)
    .json(200, req.user, "Current user fetched successfully.")
})

const updateAccountDetails = asyncHandler(async(req,res) =>{
    const {fullName, email} = req.body;
    if(!fullName || !email){
        throw new APIError(400, "All fields are required.")
    }

    const user = User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullName: fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new APIResponse(200, user, "Account details updated successfully."))
})

const updateUserAvatar = asyncHandler(async(req, res) =>{
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new APIError(400, "Avatar file is missing.")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if(!avatar.url){
        throw new APIError(400, "Error while uploading on avatar.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200, user, "Avatar updated successfully."))
})

const updateUserCoverImage = asyncHandler(async(req, res) =>{
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new APIError(400, "Cover Image file is missing.")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage.url){
        throw new APIError(400, "Error while uploading on Cover Image.")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url,
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(new APIResponse(200, user, "Cover Image updated successfully."))
})

export {registerUser, loginUser, logoutUser, refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage}