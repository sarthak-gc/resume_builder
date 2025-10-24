import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { envConfig } from "./config";
config();
// The client gets the API key from the environment variable ``.
const ai = new GoogleGenAI({
  googleAuthOptions: {
    apiKey: envConfig.GEMINI_API_KEY,
  },
});

export async function callAi(packages: string[]) {
  const response = await ai.models.generateContent({
    // model: "gemini-2.5-flash",
    model: "gemini-2.5-pro",
    contents: `
            Task:
    You will receive a comma-separated list of JavaScript (JS) and TypeScript (TS) package names. Each package name is a string, and the list can include both scoped and non-scoped package names (e.g., @types/express or express).

    1. Extract all unique and relevant skills based on the package names.
    2. Only return skills that are directly related to the package names and their specific functionalities.
       (For example: Using eslint should return "ESLint", using react should return "React.js", etc.)
    3. Do **not** include generic or high-level skills such as:
       - "Code Quality"
       - "Database Management"
       - "Design Systems"
       - "Development Tools"
       - "Build Tools"
       - "Styling"
    4. Return the result as a plain stringified JSON (not markdown). The JSON should have a single key "skills", which is an object of unique skills, categorized into multiple technology type (e.g., Frontend, Backend, Data Science).
    5. Skills should be specific, tangible, and relevant to what the package provides, **without assuming code context** and worth keeping in the resume for the skills section for the role that you feel like the person is capable of while analyzing the packages from the project.
    6. If you are unsure if a thing belongs there or not, that means it doesn't belong there. Don't add things just to make it bigger
    7. Again, Only return things that are worth adding for a mid-to-senior level engineer role. If you only find few out of those many that is given, its fine, just include those that are worth adding in resume. Please keep this in mind. And packages that does all the task on their own, and where the task of the user is just to add and call some in built functions, are not worth keeping in the resume.

    Input :
    ${packages.toLocaleString()}
    Output format:
    skills: {
      technology type: [skill1, skill2],
      technology type: [skill3, skill4]
    }



    Important Notes:
    - Ensure that all skills are unique across all the packages.
    - Only include skills that directly correspond to the functionalities or features of the package names, and that would be useful in a technical resume.
    - Avoid overly general or context-dependent skills that cannot be directly inferred from the package names.
        `,
  });
  if (response.text) {
    const jsonData = extractJsonFromMarkdown(response.text);
    return { skills: jsonData.skills };
  }
  return { skills: [] };
}

function extractJsonFromMarkdown(response: string) {
  // Remove markdown code block syntax
  const markdownStr = response.replace(/```json\n|\n```/g, "");
  // Parse the JSON string into an actual JavaScript object
  const json = JSON.parse(markdownStr);
  return json;
}
