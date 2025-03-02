import mongoose from "mongoose";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import { uploadOnCloudinary } from "../utils/cloudinary.js";


const generateAccessAndRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken, refreshToken}



    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating Access and Refresh Token")
    }
}


const registerUser = asyncHandler(async (req, res) => {
    // Destructuring the incoming data from req.body
    const { fullname, email, password, username } = req.body;

    // To check for the special empty space character
    const removeInvisibleChars = (str) => {
        return str.replace(
            /[\u200B\u200C\u200E\u200F\u202A-\u202E\u2060\u2061\u2062\u2063\u2064\u2065\u2066\u2067\u2068\u2069\u206A-\u206F\u200D\u200C\u200B\u202F\u205F\u3000\u00A0\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u200B\u200C\u200D\uFEFF]/g,
            ""
        );
    };

    // Ensure all fields are filled
    if ([fullname, email, password, username].some((field) => removeInvisibleChars(field)?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Check if user already exists
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });

    if (existedUser) {
        throw new ApiError(409, "User Already exists");
    }

    // Ensure avatar is present in req.files
    if (!req.files?.avatar || !req.files.avatar[0]?.path) {
        throw new ApiError(400, "Avatar is required");
    }

    // Get avatar and coverImage from req.files (if provided)
    const avatarLocalPath = req.files.avatar[0].path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;

    // Upload avatar to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    // Upload cover image to Cloudinary if present
    let coverImageUrl = "";
    if (coverImageLocalPath) {
        const coverImage = await uploadOnCloudinary(coverImageLocalPath);
        coverImageUrl = coverImage?.url || "";
    }

    // Create user in the database
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImageUrl,
        email,
        password,
        username: username.toLowerCase(),
    });

    // Fetch the created user without sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Log user details for testing
    console.log("Email received is:", createdUser.email);
    console.log("Full Name received is:", createdUser.fullname);
    console.log("Username received is:", createdUser.username);

    // Send a successful response
    return res.status(201).json(new ApiResponse(200, createdUser, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res)=>{
    const { email, password, username } = req.body;

    if(!(username || email)){
        throw new ApiError(400, "User or email required")
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })

    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401, "Invalide user Credentials #Password")
    }


    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User LoggedIn successfully"
        )
    )

})

// const logoutUser = asyncHandler(async (req, _)=>{
//     await User.findByIdAndUpdate(
//         req.user._id,
//         {
//             $set: {
//                 refreshToken: undefined
//             }
//         },
//         {
//             new: true
//         }
//     )

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return req.status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(new ApiResponse(200, {}, "User Logged Out"))
// })


const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset:{
                refreshToken: 1// this can also be used to remove the refreshToken that keeps the user loggedIn
            }
        },
        // { $set: { refreshToken: undefined } },
        { new: true }
    );

    const options = {
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
});


// const bcrypt = require('bcrypt');

// const refreshAccessToken = asyncHandler(async (req, res) => {
//     const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
//     if (!incomingRefreshToken) {
//         throw new ApiError(401, "Unauthorized request: Refresh token is missing");
//     }

//     try {
//         // Decode the token
//         const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

//         // Find the user
//         const user = await User.findById(decodedToken?._id);
//         if (!user) {
//             throw new ApiError(401, "Invalid refresh token: User not found");
//         }

//         // Compare refresh tokens (assumes refreshToken is hashed in DB)
//         const isMatch = await bcrypt.compare(incomingRefreshToken, user.refreshToken);
//         if (!isMatch) {
//             throw new ApiError(401, "Refresh token expired or has been used");
//         }

//         // Generate new tokens
//         const { newaccessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);

//         // Set cookie options
//         const options = {
//             secure: true,
//             httpOnly: true,
//             maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
//         };

//         // Send response
//         return res
//             .status(200)
//             .cookie("accessToken", newaccessToken, options)
//             .cookie("refreshToken", newrefreshToken, options)
//             .json(
//                 new ApiResponse(200, { newaccessToken, newrefreshToken }, "Access token refreshed")
//             );
//     } catch (error) {
//         throw new ApiError(401, error?.message || "Invalid refresh token");
//     }
// });


const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
    if (!incomingRefreshToken) {
        throw new ApiError(401, "Unauthorized request: Refresh token is missing");
    }

    try {
        // Decode the token
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

        // Find the user
        const user = await User.findById(decodedToken?._id);
        if (!user) {
            throw new ApiError(401, "Invalid refresh token: User not found");
        }

        // Check if the refresh token matches the one stored in the user's record
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token expired or has been used");
        }

        // Generate new tokens
        const { newaccessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);

        // Set cookie options
        const options = {
            secure: true,
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        };

        // Send response
        return res
            .status(200)
            .cookie("accessToken", newaccessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
                new ApiResponse(200, { newaccessToken, newrefreshToken }, "Access token refreshed")
            );
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token");
    }
});



// const changeCurrentPassword = asyncHandler(async (req, res)=>{
//     const {oldPassword, newPassword} = req.body

//     const user = User.findById(req.user?._id)
//     const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

//     if(!isPasswordCorrect){
//         throw new ApiError(400, "Old password not Correct")
//     }

//     user.password = newPassword
//     await user.save({validateBeforeSave: false})

//     return res.status(200)
//     .json(
//         new ApiResponse(200, "Password Change Successfully")
//     )
// })

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    // Find the user from the database and ensure it's awaited
    const user = await User.findById(req.user?._id);
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Use the isPasswordCorrect method defined in the schema
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Old password is incorrect");
    }

    // Set the new password and save it
    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Password changed successfully")
    );
});



const getCurrentUser = asyncHandler(async (req, res)=>{
    return res.status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched Successfully"))
})


const updateAccountDetails = asyncHandler(async(req, res)=>{
    const {fullname, email} = req.body
    if(!(fullname || email)){
        throw new ApiError(400, "All fields are required here")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email

            }
        },
        {new: true}
    ).select("-password")//maybe also remove refreshToken from here 

    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details Updated Successfully"))
})

const updateUserAvatar = asyncHandler(async(req, res)=>{
    const avatarLocalPath = req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "File is missing")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Error while Uploading Avatar")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(200, user, "Avatar Image Updated Successfully"))
})


const updateUserCoverImage = asyncHandler(async(req, res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "File is missing")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while Uploading Cover Image")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200).
    json(new ApiResponse(200, user, "Cover Image Updated Successfully"))
})


const getUserChannelProfile = asyncHandler(async(req, res)=>{
    const {username} = req.params
    
    if(!username?.trim()){
        throw new ApiError(400, "User is missing")
    }

    const channel = await User.aggregate([
        {
        $match: {
            username: username?.toLowerCase()
        }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields:{
                subscribersCount:{
                    $size: "$subscribers"
                },
                channelSubscribedToCount:{
                    $size: "$subscribedTo"
                },
                isSubscribed:{
                    $cond:{
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullname: 1,
                username: 1,
                email: 1,
                channelSubscribedToCount:1,
                subscribersCount:1 ,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1
            }
        }
])

    if(!channel?.length){
        throw new ApiError(404, "Channel Does not exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "Channel Fetched Successfully")
    )
})


// const getWatchHistory = asyncHandler(async(req, res )=>{
//     const user = await User.aggregate([
//         {
//             $match:{
//                 _id: req.user._id 
//             }
//         },
//         {
//             $lookup:{
//                 from: "videos",

//             }
//         }
//     ])
// })  //difference between these code sections is important to understand since it is a hard bug to find if you don't having basic understandings of the whole project backed system


const getWatchHistory = asyncHandler(async(req, res )=>{
    const user = await User.aggregate([
        {
            $match:{
                _id: new mongoose.Types.ObjectId(req.user._id) 
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline:[{
                    $lookup:{
                        from: "users", 
                        localField: "owner",
                        foreignField: "_id",
                        as: "owner",
                        pipeline:[{
                            $project:{
                                fullname: 1,
                                username: 1,
                                avatar:1
                            }
                        }]
                    }
                },
                {
                    $addFields:{
                        owner: {
                            $first: "$owner"
                        }
                    }
                }
            ]
                
            },
            
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(200, user[0].watchHistory , "Watch History Fetched Successfully")
    )
})



export { registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
 };
