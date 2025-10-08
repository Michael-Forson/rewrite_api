import jwt from "jsonwebtoken";
export const generateAccessToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_SECRET!, { expiresIn: "1h" });
};
export const generateRefreshToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET!, { expiresIn: "3d" });
};
