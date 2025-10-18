import { Request, Response, Router } from "express";
import sendJsonResponse from "../utils/response";
import { githubScrape } from "../utils/scrape";
import { StatusCode } from "../utils/statusCodes";
import { validateProfileLinks } from "../validations/profileLinks";
const userRoutes = Router();

userRoutes.post("/profiles", async (req: Request, res: Response) => {
  const { linkedin, github } = req.body;

  const validationError = validateProfileLinks({ linkedin, github });
  if (validationError) {
    sendJsonResponse(res, StatusCode.BAD_REQUEST, false, validationError);
    return;
  }
  const details = await githubScrape(res, github);
  res.json({ details });
});

export default userRoutes;
