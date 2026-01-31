const puppeteer = require("puppeteer");
const { GoogleSpreadsheet } = require("google-spreadsheet");

console.log("ENV GOOGLE_SERVICE_ACCOUNT =", process.env.GOOGLE_SERVICE_ACCOUNT);

const SHEET_ID = "13V7xOJkVp6wEA88J18m8Qspi05rL7t3FJtSuxQl_p98";
const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

(async () => {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();

  const jobsSheet = doc.sheetsByTitle["es_jobs"];
  const seenSheet = doc.sheetsByTitle["es_seenjobs"];
  const keywordSheet = doc.sheetsByTitle["es_keywords"];

  const seen = (await seenSheet.getRows()).map(r => r.JobKey);
  const keywords = (await keywordSheet.getRows()).map(r => r.Keyword.toLowerCase());

  console.log("Keywords:", keywords.join(","));
  console.log("Seen:", seen.length);

  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto("https://www.naukri.com/embedded-jobs", { waitUntil: "networkidle2" });

  const jobs = await page.evaluate(() => {
    const cards = document.querySelectorAll("article.jobTuple");
    let data = [];
    cards.forEach(card => {
      const title = card.querySelector("a.title")?.innerText;
      const company = card.querySelector("a.subTitle")?.innerText;
      const link = card.querySelector("a.title")?.href;
      const location = card.querySelector(".locWdth")?.innerText;
      if (title && link) data.push({ title, company, link, location });
    });
    return data;
  });

  console.log("Jobs found:", jobs.length);

  let added = 0;
  for (const job of jobs) {
    const key = job.company + "|" + job.title;
    if (seen.includes(key)) continue;

    if (!keywords.some(k => job.title.toLowerCase().includes(k))) continue;

    await jobsSheet.addRow({
      Date: new Date().toISOString(),
      Company: job.company,
      Role: job.title,
      Location: job.location,
      ApplyLink: job.link
    });

    await seenSheet.addRow({ JobKey: key });
    added++;
  }

  console.log("New jobs added:", added);
  await browser.close();
})();
