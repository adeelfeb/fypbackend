// // Import required modules
// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';

// // Create an instance of an Express app
// const app = express();

// // Middleware to enable Cross-Origin Resource Sharing (CORS)
// // Allows requests from a specified origin, with credentials (like cookies) included
// app.use(cors({
//     origin: process.env.CORS_ORIGIN || "http://localhost:3000",  // Set a default origin if not in env
//     credentials: true,             // Allows cookies and other credentials in requests
// }));

// // Middleware to parse incoming JSON payloads
// app.use(express.json({
//     limit: "16kb", // Restricts JSON payload size to 16 kilobytes
// }));

// // Middleware to parse URL-encoded data (e.g., form submissions)
// // `extended: true` allows nested objects in the data
// app.use(express.urlencoded({
//     extended: true, // Enables rich objects and arrays in request data
//     limit: "16kb",  // Restricts payload size to 16 kilobytes
// }));

// // Middleware to serve static files from the "public" directory
// // Example: Files in /public/images will be available at /images
// app.use(express.static("public"));

// // Middleware to parse cookies from incoming requests
// // Cookies will be accessible via `req.cookies`
// app.use(cookieParser());

// // Default route
// app.get("/", (req, res) => {
//     res.send("Welcome to the API Server! Use /api/v1 for accessing routes.");
// });

// // Importing user-related routes from a separate file
// import userRouter from "../router/user.routes.js";

// // Declaring the base route for the userRouter
// // Any request starting with `/api/v1/users` will be handled by `userRouter`
// app.use("/api/v1/users", userRouter);

// // Importing video-related routes from a separate file
// import videoRouter from "../router/video.routes.js";

// // Declaring the base route for the videoRouter
// // Any request starting with `/api/v1/video` will be handled by `videoRouter`
// app.use("/api/v1/videos", videoRouter);

// // Export the app for use in other parts of the project (e.g., starting the server)
// export { app };




// // Import required modules
// import express from 'express';
// import cors from 'cors';
// import cookieParser from 'cookie-parser';
// import session from 'express-session'; // Import session handling
// import passport from './passport.js'; // Import Passport
// import config from './conf.js';


// // Create an instance of an Express app
// const app = express();

// // Middleware to enable Cross-Origin Resource Sharing (CORS)
// app.use(cors({
//     origin: process.env.CORS_ORIGIN || "http://localhost:3000",  // Set a default origin if not in env
//     credentials: true,             // Allows cookies and other credentials in requests
// }));

// // Middleware to parse incoming JSON payloads
// app.use(express.json({
//     limit: "16kb", // Restricts JSON payload size to 16 kilobytes
// }));

// // Middleware to parse URL-encoded data (e.g., form submissions)
// app.use(express.urlencoded({
//     extended: true, // Enables rich objects and arrays in request data
//     limit: "16kb",  // Restricts payload size to 16 kilobytes
// }));

// // Middleware to serve static files from the "public" directory
// app.use(express.static("public"));

// // Middleware to parse cookies from incoming requests
// app.use(cookieParser());

// // Session middleware
// app.use(session({
//     secret: process.env.SESSION_SECRET || 'supersecretkey', // Replace with a secure key in production
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//         secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
//         httpOnly: true,
//     }
// }));

// // Initialize Passport
// app.use(passport.initialize());
// app.use(passport.session());

// // Import and configure Passport strategies
// import './config/passport.js'; // Assuming your Passport strategy is set up in `config/passport.js`

// // Default route
// app.get("/", (req, res) => {
//     res.send("Welcome to the API Server! Use /api/v1 for accessing routes.");
// });


// // Import routes
// import userRouter from "../router/user.routes.js";
// // Declare routes
// app.use("/api/v1/users", userRouter);



// import videoRouter from "../router/video.routes.js";
// app.use("/api/v1/videos", videoRouter);

// // Export the app for use in other parts of the project (e.g., starting the server)
// export { app };


// Import required modules
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session'; 
import passport from './passport.js'; // Import Passport
import config from './conf.js'; // Import config.js for env variables
import authRouter from "../router/auth.routes.js"; // Import auth routes



// Create an instance of an Express app
const app = express();

// Middleware to enable Cross-Origin Resource Sharing (CORS)
app.use(cors({
    origin: config.corsOrigin, 
    credentials: true, 
}));

// Middleware to parse incoming JSON payloads
app.use(express.json({
    limit: "16kb", 
}));

// Middleware to parse URL-encoded data
app.use(express.urlencoded({
    extended: true,
    limit: "16kb",  
}));

// Middleware to serve static files
app.use(express.static("public"));

// Middleware to parse cookies
app.use(cookieParser());

// Session middleware
app.use(session({
    secret: config.sessionSecret, 
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', 
        httpOnly: true,
    }
}));

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());
app.use('/api/v1/auth', authRouter); // Mount the auth routes under '/api/v1/auth'

// Default route
app.get("/", (req, res) => {
    res.send("Welcome to the API Server! Use /api/v1 for accessing routes.");
});

// Import routes
import userRouter from "../router/user.routes.js";
import videoRouter from "../router/video.routes.js";

// Declare routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/videos", videoRouter);

// Export the app
export { app };
