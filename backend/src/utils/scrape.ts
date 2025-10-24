import { Octokit } from "@octokit/rest";
import { config } from "dotenv";
import { Response } from "express";
import puppeteer, { Browser } from "puppeteer";
import { ReturnDetails } from "../types/scrape";
import { envConfig } from "./config";
import sendJsonResponse from "./response";
import { StatusCode } from "./statusCodes";
config();
interface repoDetailsI {
  repoName: string;
  contentUrl: string;
  url: string;
  languages: string;
  language: string | undefined | null;
  stargazers_count: number | undefined;
  owner: string;
  default_branch: string;
  popular: boolean;
}
export const githubScrape = async (res: Response, username: string) => {
  const url = `https://www.github.com/${username}`;
  const githubProfile = await checkGitHubProfile(url);
  if (!githubProfile.exists) {
    sendJsonResponse(res, StatusCode.NOT_FOUND, false, githubProfile.msg);
    return;
  }

  const personalDetails = await getPersonalDetailsFromGithub(res, url);
  // const { website, socialProfiles } = personalDetails;
  // if (website) {
  //   // scrapePersonalWebsite();
  // }

  // if (socialProfiles.length != 0) {
  //   // scrapeSocialWebsites();
  // }

  const allRepos = await getRepos(res, url);
  if (allRepos.length == 0) {
    sendJsonResponse(
      res,
      StatusCode.NOT_FOUND,
      false,
      "Could not retrieve repo details"
    );

    return;
  }

  //  JavaScript, TypeScript
  const trees = await Promise.all(
    allRepos.map(async (repo) => {
      try {
        const packagePaths = await getPathTrees(res, repo);
        const a = packagePaths.languages.data;
        const languages = Object.keys(a);

        if (
          languages.includes("JavaScript") ||
          languages.includes("TypeScript")
        ) {
          return packagePaths;
        } else {
          return null;
        }
      } catch {
        return null;
      }
    })
  );

  const filteredTrees = trees.filter((t) => t !== null);
  const allPaths = filteredTrees.map((t) => t);

  const allTsJsRepos = allPaths
    .map((path) => {
      const packagesPaths = path.tree
        .filter((p) => {
          return p.path.includes("package.json");
        })
        .map((p) => p.path);

      return {
        allPackageJsonPaths: packagesPaths,
        repoName: path.repoName,
        owner: path.owner,
      };
    })
    .filter((p) => {
      return p.allPackageJsonPaths.length > 0;
    });

  const packageContents = allTsJsRepos.map(async (repo) => {
    const packages = await getPackageContents(res, repo);
    const uniquePackages = [...new Set(packages)];
    return uniquePackages;
  });

  return {
    packageContents: await Promise.all(packageContents),
    personalDetails,
  };
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

  // Loop through all found profiles and extract their details

  const githubDetails = await scrapeGitHubProfile(browser, url);
  // console.log(githubDetails, "DETAILS");
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
        // return `${property} not found`;
        return null;
      }
      let text = elem.textContent;
      if (!text) {
        return null;
        // return `${property} not found`;
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
        if (url) links.push(url);
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

export async function getRepos(res: Response, url: string) {
  const octokit = new Octokit({
    auth: envConfig.GITHUB_TOKEN,
  });

  const username = url.split("/")[url.split("/").length - 1];
  async function something() {
    try {
      const response = await octokit.rest.repos.listForUser({
        username,
        sort: "updated",
        per_page: 16,
      });

      console.log(
        `Success! Status: ${response.status}. Rate limit remaining: ${response.headers["x-ratelimit-remaining"]}`
      );
      return response;
    } catch (error) {
      // console.log(
      // `Error! Status: ${error?.status}. Rate limit remaining: ${error?.headers["x-ratelimit-remaining"]}. Message: ${error?.response.data.message}`
      // );
      console.log(error);
    }
  }

  const response = await something();
  const repos = response?.data;

  if (!repos || repos.length == 0) {
    return [];
  }
  let requiredData: repoDetailsI[] | undefined = [];

  repos.forEach(async (repo) => {
    if (repo.name == "-" || repo.name == "netflix-clone") {
    }
    requiredData.push({
      repoName: repo.name,
      contentUrl: repo.url + "/contents",
      url: repo.url,
      languages: repo.languages_url,
      stargazers_count: repo.stargazers_count,
      language: repo.language,
      owner: repo.owner.login,
      default_branch: repo.default_branch ? repo.default_branch : "main",
      popular: repo.stargazers_count
        ? repo.stargazers_count > 50
          ? true
          : false
        : false,
    });
  });

  return requiredData;
}

export async function getPathTrees(res: Response, repo: repoDetailsI) {
  const octokit = new Octokit({
    auth: envConfig.GITHUB_TOKEN,
  });

  const files = await octokit.rest.git.getTree({
    owner: repo.owner,
    repo: repo.repoName,
    recursive: "1",
    tree_sha: repo.default_branch,
  });

  const languages = await octokit.rest.repos.listLanguages({
    owner: repo.owner,
    repo: repo.repoName,
  });
  const updatedTree = {
    repoName: repo.repoName,
    owner: repo.owner,
    tree: files.data.tree,
    languages,
  };
  return updatedTree;
}

export async function getPackageContents(
  res: Response,
  repo: { allPackageJsonPaths: string[]; repoName: string; owner: string }
) {
  const octokit = new Octokit({
    auth: envConfig.GITHUB_TOKEN,
  });

  let packages = repo.allPackageJsonPaths.map(async (path) => {
    const file = await octokit.rest.repos.getContent({
      owner: repo.owner,
      repo: repo.repoName,
      path,
    });
    const fileContent = file.data as { content: Base64URLString };
    const packageContent = atob(fileContent.content);
    const parsedPackageContent = JSON.parse(packageContent) as {
      dependencies: {
        [key: string]: {
          [key: string]: string;
        };
      };
      devDependencies: {
        [key: string]: {
          [key: string]: string;
        };
      };
    };

    const packages = [];
    if (parsedPackageContent.dependencies) {
      const uniqueKeys = [
        ...new Set(Object.keys(parsedPackageContent.dependencies)),
      ];

      packages.push(uniqueKeys);
    }
    if (parsedPackageContent.devDependencies) {
      const uniqueKeys = [
        ...new Set(Object.keys(parsedPackageContent.devDependencies)),
      ];

      packages.push(uniqueKeys);
    }

    // const dependencyPackages = Object.keys(parsedPackageContent?.dependencies);
    // const devDependencyPackages = Object.keys(
    //   parsedPackageContent?.devDependencies
    // );
    // const packages = [...devDependencyPackages, ...dependencyPackages];

    return packages;
  });
  return await Promise.all(packages);
}

// const scrapeContent = async (url: string) => {
//   const browser = await puppeteer.launch({
//     headless: true,
//   });
//   const page = await browser.newPage();
//   await page.goto(url, {
//     waitUntil: "networkidle2",
//     timeout: 10000,
//   });
//   const packages = page.evaluate(() => {
//     const normalizeContent = (
//       elem: Element | null | undefined,
//       property: string
//     ) => {
//       if (!elem) {
//         return `${property} not found`;
//       }
//       let text = elem.textContent;
//       if (!text) {
//         return `${property} not found`;
//       }

//       text = text.trim();
//       text = text.replace(/\s+/g, " ");
//       text = text.replace(/\n+/g, "\n");
//       return text;
//     };
//     const textArea =
//       document.querySelectorAll("textarea")[
//         document.querySelectorAll("textarea").length - 1
//       ];
//     const content = normalizeContent(textArea, "package.json");
//     return content;
//   });
//   return packages;
// };

// const filterPackages = async (content: string) => {
//   return ["package1", "package2"];
// };
