const mongoose = require("mongoose");
export const validateMongoDbId = (id: any) => {
  const isValid = mongoose.Types.ObjectId.isValid(id);
  if (!isValid) {
    throw new Error("This is not valid or not found");
  }
};