// controllers/onboardingController.js
import asyncHandler from "express-async-handler";
import UserOnboarding from "./onboarding.model";
import { Request, Response } from "express";

export const createOrUpdateOnboarding = asyncHandler(
  async (req: Request, res: Response): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: "User not authenticated" });
      return;
    }

    const { _id } = req.user;
    console.log(_id);
    const onboardingData = req.body;

    let existingRecord = await UserOnboarding.findOne({ userId: _id });

    if (existingRecord) {
      existingRecord.set({ onboardingData });
      await existingRecord.save();
      res
        .status(200)
        .json({ message: "Onboarding updated", data: existingRecord });
      return;
    }

    const newRecord = await UserOnboarding.create({
      ...onboardingData,
      userId: _id,
    });
    res.status(201).json({ message: "Onboarding created", data: newRecord });
  }
);
