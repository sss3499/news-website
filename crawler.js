const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer-core'); // 只使用 puppeteer-core
const database = require('./database'); // 表示引入当前目录下的 database.js 文件
const config = require('config');
const path = require('path');
const fs = require('fs');

class NewsCrawler {
  constructor() {
    // 本地文件路径处理
    this.baseUrl = 'file:///' + path.resolve('news-website', 'index.html').replace(/\\/g, '/');
    // Chrome 可执行路径 - 根据你的实际安装位置修改
    this.chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }

  // 检查 Chrome 是否安装
  async checkChromeInstallation() {
    try {
      await fs.promises.access(this.chromePath);
      return true;
    } catch (error) {
      console.error('Chrome not found at:', this.chromePath);
      console.error('Please install Chrome or provide correct path');
      return false;
    }
  }

  // 使用axios和cheerio抓取静态页面
  async fetchNewsWithCheerio() {
    try {
      const response = await axios.get(this.baseUrl);
      const $ = cheerio.load(response.data);
      
      const newsList = [];
      $('.news-item').each((i, element) => {
        const title = $(element).find('.title').text().trim();
        const description = $(element).find('.description').text().trim();
        const url = $(element).find('a').attr('href');
        
        // 处理本地文件路径
        const absoluteUrl = url.startsWith('http') ? url : 
                          `file:///${path.resolve('news-website', url).replace(/\\/g, '/')}`;
        
        newsList.push({
          title,
          description,
          url: absoluteUrl,
          category: 'general'
        });
      });

      return newsList;
    } catch (error) {
      console.error('Error fetching news with cheerio:', error);
      return [];
    }
  }

  // 使用puppeteer-core抓取动态渲染的页面
  async fetchNewsWithPuppeteer() {
    // 检查 Chrome 是否安装
    if (!await this.checkChromeInstallation()) {
      return [];
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: this.chromePath,
        headless: true, // 使用 headless 模式
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // 必要的安全参数
      });
      
      const page = await browser.newPage();
      await page.goto(this.baseUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 // 30秒超时
      });

      const newsList = await page.evaluate(() => {
        const items = [];
        const cards = document.querySelectorAll('.news-card');
        
        cards.forEach(card => {
          try {
            items.push({
              title: card.querySelector('.card-title')?.innerText?.trim() || '无标题',
              description: card.querySelector('.card-text')?.innerText?.trim() || '无描述',
              image: card.querySelector('img')?.src || null,
              url: card.querySelector('a')?.href || '#',
              date: card.querySelector('.date')?.innerText?.trim() || new Date().toLocaleString(),
              category: 'latest'
            });
          } catch (e) {
            console.error('Error processing card:', e);
          }
        });
        
        return items;
      });

      return newsList;
    } catch (error) {
      console.error('Error fetching news with puppeteer:', error);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  // 获取新闻详情
  async fetchNewsDetail(url) {
    try {
      // 处理本地文件路径
      const fetchUrl = url.startsWith('file://') ? url : 
                      `file:///${path.resolve('news-website', url).replace(/\\/g, '/')}`;
      
      const response = await axios.get(fetchUrl);
      const $ = cheerio.load(response.data);
      
      return {
        content: $('.article-content').text().trim() || '无内容',
        source: $('.source').text().trim() || 'Unknown',
        tags: $('.tags').text().trim().split(',').map(tag => tag.trim()).join(',') || '无标签'
      };
    } catch (error) {
      console.error('Error fetching news detail:', error);
      return {
        content: '获取内容失败',
        source: 'Unknown',
        tags: '无标签'
      };
    }
  }

  // 主爬取方法
  async crawl() {
    console.log('Starting news crawling...');
    
    try {
      // 获取新闻列表
      const newsList = [
        ...await this.fetchNewsWithCheerio(),
        ...await this.fetchNewsWithPuppeteer()
      ];

      console.log(`Found ${newsList.length} news items`);

      // 处理每条新闻
      for (const news of newsList) {
        try {
          console.log(`Processing: ${news.title}`);
          
          // 检查是否已存在
          const exists = await database.newsExists(news.title);
          if (exists) {
            console.log(`News already exists: ${news.title}`);
            continue;
          }

          // 获取详情
          const detail = await this.fetchNewsDetail(news.url);
          
          // 组合完整新闻数据
          const fullNews = {
            title: news.title,
            description: news.description,
            content: detail.content,
            category: news.category,
            tags: detail.tags,
            image: news.image || null,
            source: detail.source,
            date: news.date ? new Date(news.date) : new Date()
          };

          // 存入数据库
          await database.insertNews(fullNews);
          console.log(`Saved news: ${news.title}`);
        } catch (error) {
          console.error(`Error processing news ${news.title}:`, error);
        }
      }

      console.log('News crawling completed.');
    } catch (error) {
      console.error('Error in crawl process:', error);
    }
  }
}

module.exports = new NewsCrawler();