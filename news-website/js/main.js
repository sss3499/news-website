const { createApp } = Vue;

const app = createApp({
  data() {
    return {
      currentLanguage: 'zh',
      showSettings: false,
      showLoginModal: false,
      showRegisterModal: false,
      selectedTheme: 'light',
      selectedFontSize: 'medium',
      selectedLayout: 'list',
      autoRefresh: false,
      refreshInterval: 5,
      paginationEnabled: true,
      totalItems: 0,
      navItems: [
        { text: '首页', category: 'all' },
        { text: '国内', category: 'domestic' },
        { text: '国际', category: 'international' },
        { text: '科技', category: 'technology' },
        { text: '体育', category: 'sports' },
        { text: '娱乐', category: 'entertainment' }
      ],
      activeNav: 0,
      tags: ['全部', '热门', '最新', '政治', '经济', '健康'],
      activeTag: 0,
      newsData: [],
      filteredNews: [],
      currentPage: 1,
      itemsPerPage: 5,
      totalPages: 1,
      currentYear: new Date().getFullYear(),
      refreshTimer: null,
      searchQuery: '',
      isLoggedIn: false,
      user: null, // 初始化为null
      loginForm: {
        username: '',
        password: ''
      },
      registerForm: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      registerErrors: {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      },
      loading: false,
      error: null,
      showDropdown: false,
      apiBaseUrl: ''
    };
  },
  computed: {
    lang() {
      return {
        zh: {
          logoText: '全球新闻',
          login: '登录',
          register: '注册',
          logout: '退出',
          profile: '个人资料',
          home: '首页',
          searchPlaceholder: '搜索新闻...',
          loading: '加载中...',
          readMore: '阅读全文',
          previous: '上一页',
          next: '下一页',
          usernamePlaceholder: '请输入用户名',
          passwordPlaceholder: '请输入密码',
          emailPlaceholder: '请输入邮箱',
          confirmPasswordPlaceholder: '请确认密码',
          loginRequired: '请输入用户名和密码',
          registerRequired: '请填写所有字段',
          passwordsNotMatch: '两次密码输入不一致',
          confirmLogout: '确定要退出登录吗？',
          settingsTitle: '设置',
          themeSetting: '主题',
          lightTheme: '浅色',
          darkTheme: '深色',
          blueTheme: '蓝色',
          fontSizeSetting: '字体大小',
          smallFont: '小',
          mediumFont: '中',
          largeFont: '大',
          layoutSetting: '布局',
          listLayout: '列表',
          gridLayout: '网格',
          cardLayout: '卡片',
          autoRefresh: '自动刷新',
          refreshInterval: '刷新间隔(分钟)',
          minutes: '分钟',
          aboutUs: '关于我们',
          aboutText: '全球新闻提供最新的国内外新闻资讯',
          quickLinks: '快速链接',
          news: '新闻',
          contact: '联系我们',
          privacy: '隐私政策',
          allRightsReserved: '版权所有',
          welcome: '欢迎',
          pleaseLogin: '请登录'
        },
        en: {
          logoText: 'Global News',
          login: 'Login',
          register: 'Register',
          logout: 'Logout',
          profile: 'Profile',
          home: 'Home',
          searchPlaceholder: 'Search news...',
          loading: 'Loading...',
          readMore: 'Read more',
          previous: 'Previous',
          next: 'Next',
          usernamePlaceholder: 'Enter username',
          passwordPlaceholder: 'Enter password',
          emailPlaceholder: 'Enter email',
          confirmPasswordPlaceholder: 'Confirm password',
          loginRequired: 'Please enter username and password',
          registerRequired: 'Please fill all fields',
          passwordsNotMatch: 'Passwords do not match',
          confirmLogout: 'Are you sure to logout?',
          settingsTitle: 'Settings',
          themeSetting: 'Theme',
          lightTheme: 'Light',
          darkTheme: 'Dark',
          blueTheme: 'Blue',
          fontSizeSetting: 'Font Size',
          smallFont: 'Small',
          mediumFont: 'Medium',
          largeFont: 'Large',
          layoutSetting: 'Layout',
          listLayout: 'List',
          gridLayout: 'Grid',
          cardLayout: 'Card',
          autoRefresh: 'Auto Refresh',
          refreshInterval: 'Refresh interval (minutes)',
          minutes: 'minutes',
          aboutUs: 'About Us',
          aboutText: 'Global News provides the latest domestic and international news',
          quickLinks: 'Quick Links',
          news: 'News',
          contact: 'Contact Us',
          privacy: 'Privacy Policy',
          allRightsReserved: 'All Rights Reserved',
          welcome: 'Welcome',
          pleaseLogin: 'Please login'
        }
      }[this.currentLanguage];
    },

      visiblePages() {
      const pages = [];
      const range = 2;
      for (let i = 1; i <= this.totalPages; i++) {
        if (i === 1 || i === this.totalPages || 
            (i >= this.currentPage - range && i <= this.currentPage + range)) {
          pages.push(i);
        } else if (i === this.currentPage - range - 1 || i === this.currentPage + range + 1) {
          pages.push('...');
        }
      }
      return [...new Set(pages)];
    },
    paginatedNews() {
      const start = (this.currentPage - 1) * this.itemsPerPage;
      const end = start + this.itemsPerPage;
      // return this.filteredNews.slice(start, end);
      return this.filteredNews
    },
    shouldShowPagination() {
      return this.totalNewsCount > this.itemsPerPage;
    }
  },
  methods: {
    formatDate(dateString) {
      if (!dateString || dateString === 'NaN-NaN-NaN') {
        return this.currentLanguage === 'zh' ? '未知日期' : 'Unknown date';
      }
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split('-');
        return this.currentLanguage === 'zh' 
          ? `${year}年${month}月${day}日` 
          : new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid date');
        }
        return this.currentLanguage === 'zh' 
          ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` 
          : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch (e) {
        console.error('日期格式化错误:', e);
        return this.currentLanguage === 'zh' ? '未知日期' : 'Unknown date';
      }
    },
    changeTheme() {
      document.documentElement.setAttribute('data-theme', this.selectedTheme);
      localStorage.setItem('newsTheme', this.selectedTheme);
    },
    changeFontSize() {
      document.documentElement.setAttribute('data-font-size', this.selectedFontSize);
      localStorage.setItem('newsFontSize', this.selectedFontSize);
    },
    changeLayout() {
      document.documentElement.setAttribute('data-layout', this.selectedLayout);
      localStorage.setItem('newsLayout', this.selectedLayout);
    },
    toggleDropdown() {
      this.showDropdown = !this.showDropdown;
    },
    handleClickOutside(e) {
      if (!this.$el.contains(e.target)) {
        this.showDropdown = false;
      }
    },
    getCategoryName(category) {
      const categoryMap = {
        'all': this.currentLanguage === 'zh' ? '全部' : 'All',
        'domestic': this.currentLanguage === 'zh' ? '国内' : 'Domestic',
        'international': this.currentLanguage === 'zh' ? '国际' : 'International',
        'technology': this.currentLanguage === 'zh' ? '科技' : 'Technology',
        'sports': this.currentLanguage === 'zh' ? '体育' : 'Sports',
        'entertainment': this.currentLanguage === 'zh' ? '娱乐' : 'Entertainment',
        'general': this.currentLanguage === 'zh' ? '综合' : 'General'
      };
      return categoryMap[category] || category;
    },
     async handleLogin() {
      if (!this.loginForm.username || !this.loginForm.password) {
        this.error = this.lang.loginRequired;
        return;
      }

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(this.loginForm)
        });

        const data = await response.json();
        
        if (!data?.success) {
          throw new Error(data?.error || '登录失败');
        }

        localStorage.setItem('token', data.token);
        this.isLoggedIn = true;
        this.user = data.user || { username: this.loginForm.username };
        this.showLoginModal = false;
        this.loginForm = { username: '', password: '' };
        
      } catch (error) {
        console.error('登录错误:', error);
        this.error = error.message;
        this.user = null;
        this.isLoggedIn = false;
      }
    },

    logout() {
      if (confirm(this.lang.confirmLogout)) {
        localStorage.removeItem('token');
        this.user = null;
        this.isLoggedIn = false;
        this.showDropdown = false;
      }
    },

      async loadNewsData() {
  console.log('正在加载数据，当前页码:', this.currentPage);
  this.loading = true;
  this.error = null;
  try {
    const category = this.navItems[this.activeNav].category;
    const search = this.searchQuery;
    const tag = this.tags[this.activeTag];
    
    console.log('请求参数:', { 
      category, 
      search, 
      tag,
      page: this.currentPage 
    });

    // 构建查询参数
    const params = new URLSearchParams();
    params.append('page', this.currentPage);
    params.append('limit', this.itemsPerPage);
    if (category && category !== 'all') params.append('category', category);
    if (search) params.append('search', search);
    if (tag && tag !== '全部') params.append('tag', tag);

    const response = await fetch(
      `${this.apiBaseUrl}/api/news?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(`请求失败: ${response.status}`);
    }

    const data = await response.json();
    console.log('API响应数据:', data);
    
    if (!data?.success) {
      throw new Error(data?.error || '获取新闻失败');
    }

    // 确保使用Vue的响应式更新
    this.newsData = [...data.news];
    this.filteredNews = [...data.news];
    this.totalItems = data.total;
    this.totalPages = data.pages;
    this.currentPage = data.currentPage || 1;
    
    // 强制更新视图
    this.$forceUpdate();
    
  } catch (error) {
    console.error('加载新闻失败:', error);
    this.error = error.message || "加载新闻失败";
  } finally {
    this.loading = false;
  }
},

    // 修改paginatedNews计算属性
paginatedNews() {
  // 直接返回从服务器获取的当前页数据
  return this.filteredNews;
},
    async fetchUserInfo() {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        const response = await fetch(`${this.apiBaseUrl}/api/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('获取用户信息失败');
        }
        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || '获取用户信息失败');
        }
        this.user = data.user;
        this.isLoggedIn = true;
      } catch (error) {
        console.error('获取用户信息错误:', error);
        this.logout();
      }
    },
    async handleRegister() {
      // 重置错误信息
      this.registerErrors = {
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      };

      if (!this.registerForm.username) {
        this.registerErrors.username = this.lang.usernamePlaceholder;
        return;
      }
      if (!this.registerForm.email) {
        this.registerErrors.email = this.lang.emailPlaceholder;
        return;
      }
      if (!this.registerForm.password) {
        this.registerErrors.password = this.lang.passwordPlaceholder;
        return;
      }
      if (this.registerForm.password !== this.registerForm.confirmPassword) {
        this.registerErrors.confirmPassword = this.lang.passwordsNotMatch;
        return;
      }

      try {
        const response = await fetch(`${this.apiBaseUrl}/api/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            username: this.registerForm.username,
            email: this.registerForm.email,
            password: this.registerForm.password
          })
        });
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '注册失败');
        }
        const data = await response.json();
        localStorage.setItem('token', data.token);
        this.isLoggedIn = true;
        this.user = data.user;
        this.showRegisterModal = false;
        this.registerForm = { username: '', email: '', password: '', confirmPassword: '' };
        this.error = null;
        await this.fetchUserInfo();
      } catch (error) {
        console.error('注册错误:', error);
        this.error = error.message;
      }
    },
     checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwt_decode(token);
          this.user = decoded?.user || { username: '用户' };
          this.isLoggedIn = true;
        } catch (e) {
          console.error('Token解析失败:', e);
          this.logout();
        }
      } else {
        this.user = null;
        this.isLoggedIn = false;
      }
    },
  
    toggleLanguage() {
      this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
      localStorage.setItem('newsLanguage', this.currentLanguage);
      this.loadNewsData();
    },
    toggleSettings() {
      this.showSettings = !this.showSettings;
    },
    toggleLoginModal() {
      this.showLoginModal = !this.showLoginModal;
      this.error = null;
    },
    toggleRegisterModal() {
      this.showRegisterModal = !this.showRegisterModal;
      this.showLoginModal = false;
      this.error = null;
    },
    isLiked(newsId) {
      return false;
    },
    toggleLike(newsId) {
      const news = this.newsData.find(item => item.id === newsId);
      if (news) {
        news.likes = (news.likes || 0) + (this.isLiked(newsId) ? -1 : 1);
      }
    },
    goToDetail(newsId) {
      const news = this.newsData.find(item => item.id === newsId);
      if (!news) return;
      if (news.url) {
        let targetUrl = news.url;
        if (!targetUrl.startsWith('http')) {
          targetUrl = `http://www.people.com.cn${targetUrl}`;
        }
        window.open(targetUrl, '_blank');
      } else {
        window.location.href = `news-detail.html?id=${newsId}`;
      }
    },
    changeCategory(index) {
      this.activeNav = index;
      this.currentPage = 1;
      this.loadNewsData();
    },
    filterByTag(index) {
      this.activeTag = index;
      this.currentPage = 1;
      this.loadNewsData();
    },
    searchNews() {
      this.currentPage = 1;
      this.loadNewsData();
    },
    goToPage(page) {
      if (page === '...' || page === this.currentPage) return;
      this.currentPage = page;
      this.loadNewsData();
    },

    prevPage() {
      if (this.currentPage > 1) {
        this.currentPage--;
        this.loadNewsData();
      }
    },

    nextPage() {
      if (this.currentPage < this.totalPages) {
        this.currentPage++;
        this.loadNewsData();
      }
    },

    goToProfile() {
      window.location.href = 'profile.html';
    }
  },
  mounted() {
    const settings = {
      theme: localStorage.getItem('newsTheme') || 'light',
      fontSize: localStorage.getItem('newsFontSize') || 'medium',
      layout: localStorage.getItem('newsLayout') || 'list',
      autoRefresh: localStorage.getItem('newsAutoRefresh') === 'true',
      refreshInterval: parseInt(localStorage.getItem('newsRefreshInterval')) || 5,
      language: localStorage.getItem('newsLanguage') || 'zh'
    };
    this.selectedTheme = settings.theme;
    this.selectedFontSize = settings.fontSize;
    this.selectedLayout = settings.layout;
    this.autoRefresh = settings.autoRefresh;
    this.refreshInterval = settings.refreshInterval;
    this.currentLanguage = settings.language;
    this.changeTheme();
    this.changeFontSize();
    this.changeLayout();
    this.checkAuth();
    this.loadNewsData();
    if (this.autoRefresh) {
      this.setupAutoRefresh();
    }
    document.addEventListener('click', this.handleClickOutside);
  },
  beforeUnmount() {
    if (this.abortController) {
      this.abortController.abort();
    }
  }
});

app.mount('#app');