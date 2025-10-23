import { config } from "dotenv";
import { Request, Response, Router } from "express";
import { callAi } from "../utils/ai";
import sendJsonResponse from "../utils/response";
import { githubScrape } from "../utils/scrape";
import { StatusCode } from "../utils/statusCodes";
import { validateProfileLinks } from "../validations/profileLinks";
const userRoutes = Router();
config();

userRoutes.post("/profiles", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { linkedin, github } = req.body || {};

  const validationError = validateProfileLinks({ linkedin, github });
  if (validationError) {
    sendJsonResponse(res, StatusCode.BAD_REQUEST, false, validationError);
    return;
  }
  try {
    const response = await githubScrape(res, github);

    const timeToGetGithubThingDone = Date.now();
    const flattenedDetails = response?.packageContents?.flat(3);

    if (!flattenedDetails) {
      res.json({ msg: "skill issue" });
      return;
    }

    const timeBeforeAiCall = Date.now();

    const x = await callAi(flattenedDetails);
    // AI ResponseTime
    const timeAfterAiCall = Date.now();

    const totalTimeForAiCall = (timeAfterAiCall - timeBeforeAiCall) / 1000;
    const totalTimeForGithub = (timeToGetGithubThingDone - startTime) / 1000;
    console.log(totalTimeForAiCall, totalTimeForGithub);

    res.json({
      skills: x.skills,
      personalDetails: response?.personalDetails,
    });
  } catch (e) {
    console.log(e);
    res.json({ msg: "Something went wrong123" });
  }
  // res.json({ details: flattenedDetails });
});

export default userRoutes;
