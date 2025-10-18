import { Response } from "express";
import puppeteer, { Browser } from "puppeteer";
import { ReturnDetails } from "../types/scrape";
import sendJsonResponse from "../utils/response";
import { StatusCode } from "../utils/statusCodes";

export const githubScrape = async (res: Response, url: string) => {
  const githubProfile = await checkGitHubProfile(url);
  if (!githubProfile.exists) {
    sendJsonResponse(res, StatusCode.NOT_FOUND, false, githubProfile.msg);
    return;
  }

  const personalDetails = await getPersonalDetailsFromGithub(res, url);
  const { website, socialProfiles } = personalDetails;
  if (website) {
    // scrapePersonalWebsite();
  }

  if (socialProfiles.length != 0) {
    // scrapeSocialWebsites();
  }

  // const repoDetails = await getRepoDetails(res, url);
  return personalDetails;
};

export async function checkGitHubProfile(url: string): Promise<ReturnDetails> {
  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    const title = await page.title();
    if (title.startsWith("Page not found")) {
      return {
        msg: "Profile not found",
        exists: false,
      };
    }
    return {
      msg: "User exists",
      exists: true,
    };
  } catch (error) {
    console.error("Error while checking GitHub profile:", error);
    return {
      msg: error as string,
      exists: false,
    };
  }
}

export async function getPersonalDetailsFromGithub(res: Response, url: string) {
  const browser = await puppeteer.launch({ headless: true });

  console.log("was here 2");
  // Loop through all found profiles and extract their details

  const githubDetails = await scrapeGitHubProfile(browser, url);
  const details = {
    profile: url,
    ...githubDetails,
  };
  return details;
}

export async function scrapeGitHubProfile(browser: Browser, url: string) {
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 10000 });

  const profileDetails = await page.evaluate(() => {
    const normalizeContent = (
      elem: Element | null | undefined,
      property: string
    ) => {
      if (!elem) {
        return `${property} not found`;
      }
      let text = elem.textContent;
      if (!text) {
        return `${property} not found`;
      }

      text = text.trim();
      text = text.replace(/\s+/g, " ");
      text = text.replace(/\n+/g, "\n");
      return text;
    };

    const readMeElem = document.querySelector(".Box-body");
    const nameElem = document.querySelector('[itemprop="name"]');
    const bioElem = document.querySelector(".js-user-profile-bio");

    const locationElem = document.querySelector('[itemprop="homeLocation"]');
    const companyElem = document.querySelector('[itemprop="worksFor"]');
    const websiteElem = document.querySelector(
      '[data-test-selector="profile-website-url"]'
    );

    let links: string[] = [];
    const socialProfiles = document.querySelectorAll('[itemprop="social"]');

    socialProfiles.forEach((pf, index) => {
      if (pf.textContent) {
        const url = normalizeContent(pf, `Url ${index}`);
        links.push(url);
      }
    });

    const readMe = normalizeContent(readMeElem, "Read Me");
    const name = normalizeContent(nameElem, "Name");
    const bio = normalizeContent(bioElem, "Bio");
    const location = normalizeContent(locationElem, "Location");
    const company = normalizeContent(companyElem, "Current company");
    const website = normalizeContent(websiteElem, "Portfolio Website");

    return {
      readMe,
      bio,
      location,
      name,
      company,
      website,
      socialProfiles: links,
    };
  });

  await page.close();
  return profileDetails;
}
