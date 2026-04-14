import Chromium from "@sparticuz/chromium";
import puppeteerCore from "puppeteer-core";

export async function getBrowser() {
  // Vercel (프로덕션) 환경
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return puppeteerCore.launch({
      args: Chromium.args,
      executablePath: await Chromium.executablePath(),
      headless: true,
    });
  }

  // 로컬 개발 환경
  const puppeteer = await import("puppeteer");
  return puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
}
