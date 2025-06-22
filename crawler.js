const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const Database = require('./database.js');

puppeteer.use(StealthPlugin());

class PeopleDailyCrawler {
  constructor() {
    this.config = {
      baseUrl: 'http://www.people.com.cn',
      outputDir: './output',
      debugDir: './debug',
      maxPages: 3,
      timeout: 30000,
      headless: false
    };

    this.db = new Database();
    this.selectors = {
      main: [
        'a[href*="/n1/"]', // 人民网常见新闻链接格式
        'a[href*="/n2/"]',
        'a[href*="/n3/"]',
        '.hdNews.clearfix li a',
        '.news-list li a',
        '.ej_list li a'
      ],
      fallback: 'a[href*="/n/"]',
      pagination: '.next-page'
    };
  }

  async crawl() {
    const browser = await this.initBrowser();
    const page = await browser.newPage();

    try {
      await this.setupPage(page);
      console.log('正在访问人民网...');
      
      await page.goto(this.config.baseUrl, {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      console.log('抓取主新闻列表...');
      
      let newsItems = await this.crawlMainContent(page);
      
      if (newsItems.length === 0) {
        console.log('主选择器无效，尝试备用方案...');
        // 重新加载页面确保框架有效
        await page.reload({ waitUntil: 'networkidle2' });
        newsItems = await this.crawlFallbackContent(page);
      }
      
      console.log(`共找到 ${newsItems.length} 条新闻`);
      
      if (newsItems.length > 0) {
        console.log('处理数据...');
        const processedData = await this.processNewsDataWithDetails(newsItems, browser);
        console.log('保存结果...');
        await this.saveResults(processedData);
        console.log('生成统计报告...');
        this.generateReport(processedData);
        return processedData;
      } else {
        console.log('未找到任何新闻链接');
        return [];
      }

    } catch (error) {
      console.error('爬取失败:', error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  async initBrowser() {
    return await puppeteer.launch({
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--window-size=1400,900'
      ],
      defaultViewport: null
    });
  }

  async setupPage(page) {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    await page.setRequestInterception(true);
    page.on('request', req => {
      const resourceType = req.resourceType();
      if (
        ['image', 'font', 'stylesheet'].includes(resourceType) ||
        req.url().includes('tracker') ||
        req.url().includes('analytics')
      ) {
        req.abort();
      } else {
        req.continue();
      }
    });

    // 添加页面错误处理
    page.on('error', err => {
      console.error('页面错误:', err);
    });

    page.on('pageerror', err => {
      console.error('页面错误:', err);
    });
  }

  async crawlMainContent(page) {
    let results = [];
    
    for (const selector of this.selectors.main) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 }).catch(() => {});
        const items = await page.$$eval(selector, this.evaluateNewsItems);
        if (items.length > 0) {
          console.log(`使用选择器 "${selector}" 找到 ${items.length} 条新闻`);
          results = [...results, ...items];
        }
      } catch (e) {
        console.log(`选择器 "${selector}" 无效: ${e.message}`);
      }
    }

    return results;
  }

  async crawlFallbackContent(page) {
    try {
      await page.waitForSelector(this.selectors.fallback, { timeout: 5000 });
      return await page.$$eval(this.selectors.fallback, this.evaluateNewsItems);
    } catch (e) {
      console.log('备用选择器也无效:', e.message);
      return [];
    }
  }

  evaluateNewsItems = (anchors) => {
    return anchors
     .map(a => {
        // 处理URL，确保是完整URL
        let url = a.href;
        if (!url.startsWith('http')) {
          // 处理相对路径
          if (url.startsWith('/')) {
            url = `http://www.people.com.cn${url}`;
          } else {
            // 处理其他形式的相对路径
            url = `http://www.people.com.cn/${url}`;
          }
        }
        
        const item = {
          title: a.innerText.replace(/\s+/g, ' ').trim(),
          url: url,
          source: '人民网'
        };

        // 从URL中提取日期
        const dateMatch = item.url.match(/(\d{4})(\d{2})(\d{2})/);
        if (dateMatch) {
          item.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
        } else {
          const now = new Date();
          item.date = now.toISOString().split('T')[0];
        }

        // 从URL中提取分类
        const categoryMatch = item.url.match(/\/n(\d+)\//);
        if (categoryMatch) {
          const categoryMap = {
            '1': 'politics',
            '2': 'society',
            '3': 'international',
            '4': 'economy',
            '5': 'culture',
            '6': 'sports',
            '7': 'technology',
            '8': 'military',
            '9': 'health'
          };
          item.category = categoryMap[categoryMatch[1]] || 'general';
        } else {
          item.category = 'general';
        }

        return item;
      })
      .filter(item => 
        item.title.length > 5 && 
        !item.title.includes('广告') &&
        item.url.includes('people.com.cn')
      );
  };

  async processNewsDataWithDetails(items, browser) {
    const uniqueItems = Array.from(new Set(items.map(i => i.url)))
      .map(url => items.find(i => i.url === url));

    const processedData = [];
    
    for (const item of uniqueItems.slice(0, 10)) {
      let detailPage;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount < maxRetries) {
        try {
          detailPage = await browser.newPage();
          await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 0.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
         
          // 设置超时和等待策略
          await detailPage.goto(item.url, { 
            waitUntil: 'networkidle2', 
            timeout: 30000 
          });

          // 等待主要内容加载
          await detailPage.waitForSelector('body', { timeout: 10000 });

          // 获取图片 - 使用更通用的选择器
          const image = await detailPage.evaluate(() => {
           const img = document.querySelector('img') || 
                      document.querySelector('.content img') || 
                      document.querySelector('.article img');
           return img ? img.src : null;
         }).catch(() => null);
        
          // 获取内容
          const content = await detailPage.evaluate(() => {
           const contentElement = document.querySelector('.article') || 
                               document.querySelector('.content') || 
                               document.body;
           return contentElement.innerText || '';
        }).catch(() => '');
         
          // 获取阅读全文链接
          const readMoreLink = await detailPage.evaluate(() => {
           const link = document.querySelector('a[href*="read"]') || 
                       document.querySelector('a:contains("阅读全文")') || 
                       document.querySelector('a:contains("Read more")');
           return link ? link.href : null;
        }).catch(() => null);

          processedData.push({
            ...item,
            content: content,
            image: image || 'images/default-news.jpg',
            url: readMoreLink || item.url // 使用阅读全文链接（如果有）
          });
         
          break; // 成功则跳出重试循环
         
        } catch (error) {
          retryCount++;
          console.error(`处理新闻详情失败 (尝试 ${retryCount}/${maxRetries}): ${item.url}`, error);
          
          if (retryCount >= maxRetries) {
            console.error(`无法获取新闻详情: ${item.url}`);
            processedData.push({
              ...item,
              content: '',
              image: 'images/default-news.jpg'
            });
          }
        }
        finally {
          if (detailPage && !detailPage.isClosed()) {
            await detailPage.close();
          }
        }
      }
    }
    
    return processedData;
  }

  async getReadMoreLink(page) {
    try {
      return await page.evaluate(() => {
       // 尝试多种方式获取阅读全文链接
        const selectors = [
          'a:contains("阅读全文")',
          'a:contains("Read more")',
          '.read-more a',
          '.more-link a'
        ];
        
        for (const selector of selectors) {
          const link = document.querySelector(selector);
          if (link && link.href) return link.href;
        }
        
        return null;
     });
   } catch (error) {
      console.error('获取阅读全文链接失败:', error);
      return null;
    }
  }

  async saveResults(data) {
     if (!fs.existsSync(this.config.outputDir)) {
        fs.mkdirSync(this.config.outputDir, { recursive: true });
    }

    const filename = path.join(this.config.outputDir, 'news.json');
    fs.writeFileSync(filename, JSON.stringify(data, null, 2));
    console.log(`结果已保存到文件: ${filename}`);

    console.log('开始保存到数据库...');
    let savedCount = 0;
    
    for (const item of data) {
      try {
        const exists = await this.db.newsExists(item.title);
        if (!exists) {
          await this.db.insertNews(item);
          savedCount++;
          console.log(`已保存: ${item.title}`);
        } else {
          console.log(`已存在: ${item.title}`);
        }
      } catch (error) {
        console.error(`保存新闻失败: ${item.title}`, error.message);
      }
    }

    console.log(`数据库保存完成，共保存 ${savedCount} 条新新闻`);
  }

  generateReport(data) {
    if (!data || !Array.isArray(data)) {
      console.error('无效的数据格式，无法生成报告');
      return;
    }

    const categories = [...new Set(data.map(item => item.category || '其他'))];
    const report = {
      total: data.length,
      byCategory: categories.map(cat => ({
        category: cat,
        count: data.filter(i => i.category === cat).length,
        examples: data.filter(i => i.category === cat).slice(0, 3).map(i => i.title)
      })),
      importantNews: data.filter(i => 
        i.title && (i.title.includes('!') || i.title.includes('重磅'))
      ).length,
      withVideo: data.filter(i => 
        i.url && (i.url.includes('tv') || i.url.includes('video'))
      ).length
    };

    console.log('\n=== 抓取报告 ===');
    console.log(`总新闻数: ${report.total}`);
    console.log('按分类统计:');
    report.byCategory.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count}条 (示例: ${cat.examples.join(' | ')})`);
    });
    console.log(`重要新闻: ${report.importantNews}条`);
    console.log(`含视频新闻: ${report.withVideo}条`);
  }
}
async function crawlPeopleNews() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  // 设置用户代理和视口
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
  await page.setViewport({ width: 1200, height: 800 });

  try {
    console.log('正在访问人民网...');
    await page.goto('http://www.people.com.cn/', { waitUntil: 'networkidle2', timeout: 60000 });

    // 等待新闻列表加载
    await page.waitForSelector('.news-list', { timeout: 10000 });

    // 处理分页
    let currentPage = 1;
    while (currentPage <= 3) { // 限制爬取3页作为示例
      console.log(`抓取第 ${currentPage} 页数据...`);
      
      // 获取当前页新闻数据
      const news = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('.news-list li')).map(item => ({
          title: item.querySelector('a').innerText.trim(),
          link: item.querySelector('a').href
        }));
      });

      console.log(`第 ${currentPage} 页新闻:`, news);

      // 尝试点击下一页
      const nextPageButton = await page.$('.next-page');
      if (nextPageButton) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          nextPageButton.click()
        ]);
        currentPage++;
      } else {
        break;
      }
    }
  } catch (error) {
    console.error('爬取过程中出错:', error);
  } finally {
    await browser.close();
  }
}

crawlPeopleNews();

(async () => {
  try {
    console.log('=== 人民网新闻爬虫启动 ===');
    const crawler = new PeopleDailyCrawler();
    const results = await crawler.crawl();
    console.log('=== 爬取完成 ===');
    console.log('抓取结果示例:', results.slice(0, 3));
  } catch (error) {
    console.error('!! 爬取失败 !!!', error);
    process.exit(1);
  }
})();