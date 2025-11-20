// // seed.ts
// import mongoose from "mongoose";
// // Adjust this import path if your file structure is different
// import CopingStrategy from "../domains/copingStrategies/copingStrategies.model";
// import { masterStrategyArraySchema } from "../domains/copingStrategies/copingStrategies.validation";

// // --- Master Strategies Data (sortOrder removed) ---
// const MASTER_STRATEGIES = [
//   {
//     strategyType: "urge_surfing",
//     displayName: "Urge Surfing",
//     description:
//       "Ride the wave of your craving without acting on it. Cravings peak and pass like ocean waves.",
//     category: "cognitive",
//     defaultDurationMinutes: 20,
//     difficultyLevel: "intermediate",
//     iconName: "wave",
//     requiresSetup: false,
//     instructions: [
//       "Find a comfortable, quiet place to sit",
//       "Close your eyes and take a few deep breaths",
//       "Notice where you feel the craving in your body",
//       "Imagine the craving as a wave in the ocean",
//       "Watch it build, crest, and eventually subside",
//       "Don't try to push it away - just observe it",
//       'Remind yourself: "This feeling will pass"',
//       "Continue breathing slowly until the wave passes",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "breathing",
//     displayName: "Box Breathing",
//     description:
//       "Calm your nervous system with a simple 4-4-4-4 breathing pattern.",
//     category: "physiological",
//     defaultDurationMinutes: 5,
//     difficultyLevel: "beginner",
//     iconName: "lungs",
//     requiresSetup: false,
//     instructions: [
//       "Sit comfortably with your back straight",
//       "Breathe in slowly through your nose for 4 seconds",
//       "Hold your breath for 4 seconds",
//       "Exhale slowly through your mouth for 4 seconds",
//       "Hold your breath again for 4 seconds",
//       "Repeat this cycle 10 times",
//       "Focus only on your breathing",
//       "Notice how your body relaxes with each cycle",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "sos_contact",
//     displayName: "Call for Support",
//     description: "Reach out to someone who supports your recovery right now.",
//     category: "social",
//     defaultDurationMinutes: 10,
//     difficultyLevel: "beginner",
//     iconName: "phone",
//     requiresSetup: true,
//     instructions: [
//       "Choose the person who can best support you right now",
//       "Call or text them - don't wait",
//       'Be honest: "I\'m having a craving and need support"',
//       "Ask them to stay on the line or come over if possible",
//       "Talk about anything - distract yourself",
//       "Thank them for being there for you",
//       "Remember: asking for help is strength, not weakness",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "distraction",
//     displayName: "Distraction Activity",
//     description: "Engage your mind with a pre-selected activity you enjoy.",
//     category: "behavioral",
//     defaultDurationMinutes: 15,
//     difficultyLevel: "beginner",
//     iconName: "gamepad",
//     requiresSetup: true,
//     instructions: [
//       "Choose an activity from your distraction list",
//       "Commit to doing it for at least 10 minutes",
//       "Fully immerse yourself - no multitasking",
//       "Notice how your mind shifts away from the craving",
//       "If the activity isn't working, try a different one",
//       "The goal is engagement, not perfection",
//       "Give yourself credit for choosing this over using",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "walk_it_off",
//     displayName: "Walk It Off",
//     description:
//       "Take a brisk walk to release endorphins and change your environment.",
//     category: "physiological",
//     defaultDurationMinutes: 15,
//     difficultyLevel: "beginner",
//     iconName: "walking",
//     requiresSetup: false,
//     instructions: [
//       "Put on comfortable shoes and step outside",
//       "Walk at a brisk pace fast enough to feel it",
//       "Focus on your surroundings, not the craving",
//       "Count your steps or listen to music",
//       "Notice five things you can see around you",
//       "Take deep breaths of fresh air",
//       "Walk for at least 10 minutes",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "play_tape_forward",
//     displayName: "Play the Tape Forward",
//     description:
//       "Think through what will really happen if you use - not just the temporary relief.",
//     category: "cognitive",
//     defaultDurationMinutes: 10,
//     difficultyLevel: "intermediate",
//     iconName: "film",
//     requiresSetup: false,
//     instructions: [
//       'Pause and imagine: "If I use right now..."',
//       "In 1 hour, I will feel... (guilt, shame, regret)",
//       "Tomorrow morning, I will have to... (reset my counter, lie to people)",
//       "My loved ones will... (be disappointed, lose trust)",
//       "My health will... (suffer, deteriorate)",
//       "My goals will... (be delayed, feel impossible)",
//       "Compare this to how proud you'll feel if you resist",
//       'Ask yourself: "Is this temporary relief worth all that?"',
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "delay_tactic",
//     displayName: "Wait 10 Minutes",
//     description:
//       "Just delay the decision for 10 minutes. Cravings often pass faster than you think.",
//     category: "behavioral",
//     defaultDurationMinutes: 10,
//     difficultyLevel: "beginner",
//     iconName: "clock",
//     requiresSetup: false,
//     instructions: [
//       "Set a timer for 10 minutes",
//       'Tell yourself: "I\'ll decide in 10 minutes"',
//       "Do ANYTHING else during this time",
//       "Drink a glass of water",
//       "Watch a funny video",
//       "Text a friend about something random",
//       "When the timer goes off, set it for another 10 minutes",
//       "Most cravings peak and pass within 15-30 minutes",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "counter_thoughts",
//     displayName: "Challenge Your Thoughts",
//     description:
//       "Identify and challenge the automatic thoughts driving your craving.",
//     category: "cognitive",
//     defaultDurationMinutes: 10,
//     difficultyLevel: "advanced",
//     iconName: "brain",
//     requiresSetup: true,
//     instructions: [
//       "Notice what thought is driving the craving",
//       "Write it down or say it out loud",
//       'Ask: "Is this thought completely true?"',
//       "Look at your list of counter-thoughts",
//       "Choose the one that fits this situation",
//       "Repeat the counter-thought several times",
//       "Notice how the craving intensity shifts",
//       "Remember: thoughts are not facts",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "reason_reminder",
//     displayName: "Remember Your Why",
//     description: "Reconnect with your deepest reasons for choosing recovery.",
//     category: "motivational",
//     defaultDurationMinutes: 5,
//     difficultyLevel: "beginner",
//     iconName: "heart",
//     requiresSetup: true,
//     instructions: [
//       "Look at your list of reasons for recovery",
//       "Read each one slowly and out loud",
//       "Look at photos of your loved ones",
//       "Remember your proudest sober moment",
//       "Visualize your future self - healthy and free",
//       'Ask: "What would my best self do right now?"',
//       "You started this journey for important reasons",
//       "Those reasons are still valid, right now",
//     ],
//     isActive: true,
//   },
//   {
//     strategyType: "grounding_5_4_3_2_1",
//     displayName: "5-4-3-2-1 Grounding",
//     description:
//       "Use your five senses to anchor yourself in the. present moment.",
//     category: "cognitive",
//     defaultDurationMinutes: 5,
//     difficultyLevel: "beginner",
//     iconName: "hand",
//     requiresSetup: false,
//     instructions: [
//       "Take a deep breath and look around",
//       "Name 5 things you can SEE right now",
//       "Name 4 things you can TOUCH (feel their texture)",
//       "Name 3 things you can HEAR",
//       "Name 2 things you can SMELL",
//       "Name 1 thing you can TASTE",
//       "Take another deep breath",
//       "Notice how you feel more present and calm",
//     ],
//     isActive: true,
//   },
// ];
// // --- End of Data ---

// // ----------------- IMPORTANT: Update this URI -----------------
// const MONGO_URI = "mongodb://localhost:27017/rewrite";
// // -----------------------------------------------------------

// const seedDatabase = async () => {
//   try {
//     const validMasterList = masterStrategyArraySchema.parse(MASTER_STRATEGIES);
//     console.log("Master strategy list is valid!");
//     console.log(`Connecting to database at ${MONGO_URI}...`);
//     await mongoose.connect(MONGO_URI);
//     console.log("Database connected. Seeding strategies...");

//     let upsertCount = 0;
//     let newCount = 0;

//     // Use Promise.all for efficient, concurrent upsert operations
//     await Promise.all(
//       MASTER_STRATEGIES.map(async (strategy) => {
//         // This strategy data is typed as 'any' to match the schema
//         // flexibility, but it adheres to our TS interface.
//         const strategyData: any = strategy;

//         // Add the 'userId: null' to indicate this is a master/default strategy
//         strategyData.userId = null;

//         const result = await CopingStrategy.updateOne(
//           { strategyType: strategy.strategyType }, // Filter by unique type
//           { $set: strategyData }, // Set all data
//           { upsert: true } // Insert if not found, update if found
//         );

//         if (result.upsertedCount > 0) {
//           newCount++;
//         } else if (result.modifiedCount > 0 || result.matchedCount > 0) {
//           upsertCount++;
//         }
//       })
//     );

//     console.log("-----------------------------------------");
//     console.log("✅ Seeding complete!");
//     console.log(`✨ ${newCount} new master strategies inserted.`);
//     console.log(`🔄 ${upsertCount} existing master strategies updated.`);
//     console.log("-----------------------------------------");
//   } catch (error) {
//     console.error("❌ Error seeding database:", error);
//   } finally {
//     console.log("Closing database connection...");
//     await mongoose.disconnect();
//     console.log("Connection closed.");
//   }
// };

// // --- Execute the script ---
// seedDatabase();
