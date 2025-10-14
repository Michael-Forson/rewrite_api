import { IUserDocument } from "../../domains/authentication/user.model";

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}
