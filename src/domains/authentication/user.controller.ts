import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "./services/jwtToken";
import UserModel, { IUserDocument } from "./user.model";
import asyncHandler from "express-async-handler";
import { validateMongoDbId } from "../../utils/validateMonogoDbId";
import jwt from "jsonwebtoken";
import { normalizeToUTCDate } from "../../utils/dateManagement";

const User = UserModel;

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
interface GoogleCreateUserRequest extends Request {
  body: {
    email: string;
    googleId: string;
  };
}

export interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

interface UpdateUserRequest {
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
    const { email, password, ...otherFields } = req.body;
    const existingUser: IUserDocument | null = await User.findOne({ email });
    if (existingUser) {
      // Case: OAuth user (no password yet) - add hashed password
      if (!existingUser.password) {
        existingUser.password = password; // Set it—pre-save hook will hash
        existingUser.markModified("password"); // Ensure hook detects change

        // Optional: Apply other fields if provided (e.g., name update)
        Object.assign(existingUser, otherFields);

        const updatedUser = await existingUser.save(); // Triggers pre-save hook
        res.status(200).json({
          message: "Password added to your account",
          user: updatedUser,
        }); // Exclude password in response
        return;
      }
      // Case: Already has password - prevent duplicate registration
      res.status(409).json({
        message:
          "User with this email already registered. Try login or password reset.",
      });
      return;
    }
    const currentDate = new Date();

    const normalizedCreatedAt = normalizeToUTCDate(currentDate);

    const userPayload = {
      ...req.body,
      createdAt: normalizedCreatedAt,
    };

    // Create a new User
    const newUser: IUserDocument = await User.create(userPayload);

    res.json(newUser);
  }
);
const continueWithGoogle = asyncHandler(
  async (req: GoogleCreateUserRequest, res: Response): Promise<void> => {
    const { email, googleId } = req.body;
    if (!email) {
      throw new Error("No email is sent!!! ");
    }
    // Find or create user
    let user = await User.findOne({ email });

    if (!user) {
      const currentDate = new Date();
      const normalizedCreatedAt = normalizeToUTCDate(currentDate);

      user = await User.create({
        email,
        googleId,
        createdAt: normalizeToUTCDate,
      });
    }

    // Generate and update refresh token
    const refreshToken = await generateRefreshToken(user._id);
    await User.findByIdAndUpdate(user._id, { refreshToken }, { new: true });

    // Send response
    res.json({
      id: user._id,
      username: user?.username,
      email: user.email,
      accesstoken: generateAccessToken(user._id),
      refreshToken,
    });
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
        token: generateAccessToken(findUser._id),
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
      process.env.JWT_REFRESH_SECRET as string,
      (err: jwt.VerifyErrors | null, decoded: any) => {
        if (err || user.id !== decoded.id) {
          throw new Error("There is something wrong with the refresh token");
        }

        // If refresh token is valid, generate a new access token
        const accessToken: string = generateAccessToken(user._id);
        const refreshToken: string = generateRefreshToken(user._id);
        res.json({ accessToken, refreshToken });
      }
    );
  }
);

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
        const accessToken: string = generateAccessToken(user._id);
        res.json({ accessToken });
      }
    );
  }
);

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

  const { _id } = req.user;
  validateMongoDbId(_id);

  try {
    const updateUser: IUserDocument | null = await User.findByIdAndUpdate(
      _id,
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
  getallUser,
  getaUser,
  updateaUser,
  deleteaUser,
  blockUser,
  unblockUser,
  handleRefreshToken,
  logout,
  handleRefreshTokenMobile,
  continueWithGoogle,
};
