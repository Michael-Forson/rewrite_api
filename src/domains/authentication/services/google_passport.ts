import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import UserModel, { IUserDocument } from "../../../models/user.model";
import { generateRefreshToken } from "./refresh_token";
import { generateToken } from "./accesstoken";

// Use the imported model directly
const User = UserModel;

console.log("User model:", User);
console.log("User.findOne:", typeof User.findOne);
console.log("User.modelName:", User.modelName);

const GOOGLE_REDIRECT_URI = `${process.env.EXPO_PUBLIC_BASE_URL}/api/v1/user/google/callback`;

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: GOOGLE_REDIRECT_URI,
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: any,
      done: Function
    ) => {
      try {
        // Find user in the database
        let user: IUserDocument | null = await User.findOne({
          googleId: profile.id,
        });

        if (!user) {
          // If user doesn't exist, create a new one
          user = new User({
            googleId: profile.id,
            username: profile.displayName,
            email:
              profile.emails && profile.emails.length > 0
                ? profile.emails[0].value
                : "No email ",
          }) as IUserDocument;
        }

        // Generate a new refresh token
        const newRefreshToken = generateRefreshToken(user._id);

        // Store the refresh token in the database
        user.refreshToken = newRefreshToken;
        await user.save(); // Save the updated user with the new refresh token
        const { id, username, email, role } = user;
        // Generate the access token
        const newAccessToken = generateToken(user._id);

        // Pass the user and tokens to the next middleware
        return done(null, {
          user: { id, username, email, role },
          accessToken: newAccessToken,
          refreshToken: newRefreshToken,
        });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);
