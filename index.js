const crawler = require('./crawler.js');
const database = require('./database.js');

// 定时爬取
async function startCrawler() {
  try {
    await crawler.crawl();
    
    // 每2小时运行一次
    setInterval(async () => {
  await crawler.crawl();
}, 2 * 60 * 60 * 1000);
  } catch (error) {
    console.error('Crawler startup error:', error);
    process.exit(1);
  }
}

// 启动爬虫
startCrawler();