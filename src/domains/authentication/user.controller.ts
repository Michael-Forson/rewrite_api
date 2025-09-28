import { Request, Response } from "express";
import { generateToken } from "./services/accesstoken";
import UserModel, { IUserDocument } from "../../models/user.model";
import asyncHandler from "express-async-handler";
import { validateMongoDbId } from "../../utils/validateMonogoDbId";
import { generateRefreshToken } from "./services/refresh_token";
import jwt from "jsonwebtoken";

const User = UserModel;

// Type definitions
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    _id: string;
    email: string;
    username?: string;
    mobile?: string;
    accessToken?: string;
    refreshToken?: string;
  };
}

interface CreateUserRequest extends Request {
  body: {
    email: string;
    password: string;
    username?: string;
    firstname?: string;
    lastname?: string;
    mobile?: string;
  };
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface UpdateUserRequest extends AuthenticatedRequest {
  body: {
    firstname?: string;
    lastname?: string;
    email?: string;
    mobile?: string;
  };
}

interface RefreshTokenRequest extends Request {
  body: {
    refreshToken?: string;
  };
}

interface JwtPayload {
  id: string;
  iat?: number;
  exp?: number;
}

const createUser = asyncHandler(
  async (req: CreateUserRequest, res: Response): Promise<void> => {
    const { email } = req.body;
    const findUser: IUserDocument | null = await User.findOne({ email });

    if (!findUser) {
      // Create a new User
      const newUser: IUserDocument = await User.create(req.body);
      res.json(newUser);
    } else {
      // User already exists
      throw new Error("User already exists");
    }
  }
);

// Login user
const loginUserCtrl = asyncHandler(
  async (req: LoginRequest, res: Response): Promise<void> => {
    const { email, password } = req.body;
    console.log({ email, password });

    // Check if user exists or not
    const findUser: IUserDocument | null = await User.findOne({ email });

    if (findUser && (await findUser.isPasswordMatched(password))) {
      const refreshToken: string = await generateRefreshToken(findUser._id);
      const updateuser: IUserDocument | null = await User.findByIdAndUpdate(
        findUser.id,
        {
          refreshToken: refreshToken,
        },
        { new: true }
      );

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        maxAge: 72 * 60 * 60 * 1000,
      });

      res.json({
        _id: findUser._id,
        username: findUser.username,
        email: findUser.email,
        mobile: findUser.mobile,
        token: generateToken(findUser._id),
      });
    } else {
      throw new Error("Invalid Credentials");
    }
  }
);

// Handle refresh token for both custom login and Google OAuth
const handleRefreshToken = asyncHandler(
  async (req: RefreshTokenRequest, res: Response): Promise<void> => {
    const cookies = req.cookies;
    if (!cookies?.refreshToken) throw new Error("No Refresh Token in Cookies");

    const refreshToken: string = cookies.refreshToken;

    // Find the user in the database using the refresh token
    const user: IUserDocument | null = await User.findOne({ refreshToken });
    if (!user) throw new Error("No Refresh Token present in DB or not matched");

    // Verify the refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_SECRET as string,
      (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err || user.id !== decoded.id) {
          throw new Error("There is something wrong with the refresh token");
        }

        // If refresh token is valid, generate a new access token
        const accessToken: string = generateToken(user._id);
        res.json({ accessToken });
      }
    );
  }
);

// GOOGLE AUTHENTICATION
const googleLogin = (req: Request, res: Response): void => {
  // This is the login route (handled by Passport)
};

// Callback after Google OAuth
const googleCallback = (req: AuthenticatedRequest, res: Response): void => {
  try {
    // Generate a JWT for the authenticated user
    if (!req.user) {
      throw new Error("User not found in request");
    }

    const { accessToken, refreshToken } = req.user;

    // Set the refresh token in an HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true, // Can't be accessed by client-side JavaScript
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production (only with HTTPS)
      sameSite: "strict", // Prevent CSRF attacks
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    // res.redirect(process.env.FRONTEND_URL as string);
    res.json({ message: "Successfuly authenticated" });
  } catch (err) {
    console.error("Error generating token:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
};

// Protected route
const profile = (req: AuthenticatedRequest, res: Response): void => {
  res.send(
    `<h1>Profile Page</h1><pre>${JSON.stringify(req.user, null, 2)}</pre>`
  );
};

const facebookAuth = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  const { accessToken, refreshToken } = req.user;

  // Set the refresh token in an HttpOnly cookie
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true, // Can't be accessed by client-side JavaScript
    secure: process.env.NODE_ENV === "production", // Use secure cookies in production (only with HTTPS)
    sameSite: "strict", // Prevent CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Redirect to frontend
  res.redirect(process.env.FRONTEND_URL as string);
};

// Logout functionality
const logout = asyncHandler(
  async (req: RefreshTokenRequest, res: Response): Promise<void> => {
    const cookie = req.cookies;
    if (!cookie?.refreshToken) throw new Error("No Refresh Token in Cookies");

    const refreshToken: string = cookie.refreshToken;
    const user: IUserDocument | null = await User.findOne({ refreshToken });

    if (!user) {
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
      });
      res.sendStatus(204); // No content
      return;
    }

    await User.findOneAndUpdate(
      { refreshToken },
      {
        refreshToken: "",
      }
    );

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    res.sendStatus(204);
  }
);

//mobile React native

// Handle refresh token for both custom login and Google OAuth
const handleRefreshTokenMobile = asyncHandler(
  async (req: RefreshTokenRequest, res: Response): Promise<void> => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new Error("No Refresh Token Sent");
    }

    // Find the user in the database using the refresh token
    const user: IUserDocument | null = await User.findOne({ refreshToken });
    if (!user) throw new Error("No Refresh Token present in DB or not matched");

    // Verify the refresh token
    jwt.verify(
      refreshToken,
      process.env.JWT_SECRET as string,
      (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err || user.id !== decoded.id) {
          throw new Error("There is something wrong with the refresh token");
        }

        // If refresh token is valid, generate a new access token
        const accessToken: string = generateToken(user._id);
        res.json({ accessToken });
      }
    );
  }
);

// Callback after Google OAuth
const googleCallbackMobile = (
  req: AuthenticatedRequest,
  res: Response
): void => {
  try {
    // Generate a JWT for the authenticated user
    if (!req.user) {
      throw new Error("User not found in request");
    }

    // Set the refresh token in an HttpOnly cookie
    // res.json(req.user);
      console.log(req.user)
    // Redirect to frontend
    res.redirect(process.env.EXPO_PUBLIC_PUBLIC_SCHEME as string);
  } catch (err) {
    console.error("Error generating tokSen:", err);
    res.status(500).json({ error: "Failed to generate token" });
  }
};

const facebookAuthMobile = (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  const { accessToken, refreshToken } = req.user;

  // Set the refresh token in an HttpOnly cookie
  res.json({ refreshToken: refreshToken });

  // Redirect to frontend
  res.redirect(process.env.FRONTEND_URL as string);
};

// Get all users
const getallUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    try {
      const getUsers: IUserDocument[] = await User.find();
      res.json(getUsers);
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// Get a single user
const getaUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
      const getUser: IUserDocument | null = await User.findById(id);
      res.json({
        getUser,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// Update a user
const updateaUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: "User not authenticated" });
    return;
  }

  const { id } = req.user as IUserDocument;
  validateMongoDbId(id);

  try {
    const updateUser: IUserDocument | null = await User.findByIdAndUpdate(
      id,
      {
        firstname: req.body.firstname,
        lastname: req.body.lastname,
        email: req.body.email,
        mobile: req.body.mobile,
      },
      {
        new: true,
      }
    );

    res.json({
      updateUser,
    });
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Unknown error");
  }
});

// Delete a user
const deleteaUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
      const deleteUser: IUserDocument | null = await User.findByIdAndDelete(id);
      res.json({
        deleteUser,
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// Block user
const blockUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
      const block: IUserDocument | null = await User.findByIdAndUpdate(
        id,
        { isBlocked: true },
        { new: true }
      );
      res.json({
        message: "User Blocked",
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

// Unblock user
const unblockUser = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    validateMongoDbId(id);

    try {
      const unblock: IUserDocument | null = await User.findByIdAndUpdate(
        id,
        { isBlocked: false },
        { new: true }
      );
      res.json({
        message: "User UnBlocked",
      });
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Unknown error");
    }
  }
);

export {
  createUser,
  loginUserCtrl,
  googleLogin,
  googleCallback,
  profile,
  facebookAuth,
  getallUser,
  getaUser,
  updateaUser,
  deleteaUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  facebookAuthMobile,
  googleCallbackMobile,
  handleRefreshTokenMobile,
};
