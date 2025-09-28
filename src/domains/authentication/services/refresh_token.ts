const jwt = require("jsonwebtoken");
export const generateRefreshToken = (id: any) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, { expiresIn: "3d" });
};

