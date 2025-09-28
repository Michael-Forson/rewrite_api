import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI!;
    await mongoose.connect(mongoURI, {});
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB couldn't connect", error);
    // process.exit(1);
  }
};
export default connectDB;
