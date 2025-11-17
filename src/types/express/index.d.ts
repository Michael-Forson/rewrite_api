import { JwtPayload } from "jsonwebtoken";
interface JwtUser extends JwtPayload {
  id: string;
  email?: string;
  role?: string;
  username?: string;
  isSuscribed?: string;
  iat: number;
  exp: number;
}
declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}
