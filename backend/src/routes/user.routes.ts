import { GoogleGenAI } from "@google/genai";
import { Request, Response, Router } from "express";
import puppeteer from "puppeteer";
import { callAi } from "../utils/ai";
import { envConfig } from "../utils/config";
import { githubScrape } from "../utils/scrape";
const userRoutes = Router();
userRoutes.post("/register", async (req: Request, res: Response) => {});

userRoutes.get("/test/:url", async (req: Request, res: Response) => {
  const website = "https://" + req.params.url;
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  try {
    await page.goto(website, {
      waitUntil: "networkidle2",
    });
  } catch (error: any) {
    console.log(error);
    if (error.message.includes("net::ERR_NAME_NOT_RESOLVED")) {
      res.json({ error: "invalid url" });
    }
    res.json({ something: "HI" });
    return;
  }
  const innerText = await page.evaluate(() => {
    const text = document.body.innerText.split("\n").join(" ");
    const links = Array.from(document.querySelectorAll("a"))
      .map((a) => a)
      .join(", ");

    return { text, links };
  });

  try {
    const { response } = await callAiPersonal(innerText.text, innerText.links);
    res.json({
      information: response,
    });
  } catch (e) {
    console.log(e);
    res.json({ msg: "SOMETHING went wrong" });
  } finally {
    await browser.close();
  }
});
userRoutes.post("/profiles", async (req: Request, res: Response) => {
  const startTime = Date.now();
  const { linkedin, github } = req.body || {};

  // const validationError = validateProfileLinks({ linkedin, github });
  // if (validationError) {
  // sendJsonResponse(res, StatusCode.BAD_REQUEST, false, validationError);
  // return;
  // }
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

const callAiPersonal = async (text: string, links: string) => {
  const ai = new GoogleGenAI({
    googleAuthOptions: {
      apiKey: envConfig.GEMINI_API_KEY,
    },
  });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-pro",
    contents: `
     Given the following text, extract and organize the information into a structured JSON format for a resume. The JSON should include the following sections: map the links to the appropriate things if possible, if unsure, don't link anywhere rather than linking without being sure
     input:
     ${text}
     links: ${links}

     output format:
{
  "personal_info": {
    "name": "get full name",
    "contact": "",
    "email": "",
    "location": "if not found directly you can use your brain to get it, like if the person is studying at xyz clz, you can get location of xyz clz as the person's location",
    "socials": "appropriate links from above"
  },
  "eduction": [
    {
      "institute": "name",
      "subject": "if there",
      "duration": "20xx-20xy(if available)",
      "field": "IT, Business, CS, Finance(get it from subject if possible)"
    }
  ],
  "projects": [
    {
      "name": "name",
      "description": "if any",
      "live": "if any",
      "code": "if any"
    }
  ]
}
Please ensure the output is in valid JSON format and organized exactly as described. The data should be complete, specific, and structured to generate a professional resume. If you don't find information, or if any information is missing, you can use null

    `,
  });
  if (response.text) {
    const jsonData = extractJsonFromMarkdown(response.text);
    console.log(jsonData, "JSON");
    return { response: jsonData };
  }
  return { response: {} };
};

function extractJsonFromMarkdown(response: string) {
  // Remove markdown code block syntax
  const markdownStr = response.replace(/```json\n|\n```/g, "");
  // Parse the JSON string into an actual JavaScript object
  const json = JSON.parse(markdownStr);
  return json;
}
