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
            itemsPerPage: 6,
            totalPages: 1,
            currentYear: new Date().getFullYear(),
            refreshTimer: null,
            searchQuery: '',
            isLoggedIn: false,
            user: null,
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
            loading: false,
            error: null,
            showDropdown: false, 
            apiBaseUrl: 'http://localhost:3000/api'
        };
    },
    computed: {
        lang() {
            return langData[this.currentLanguage];
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
            return this.filteredNews.slice(start, end);
        }
    },
    methods: {
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
        
        toggleAutoRefresh() {
            localStorage.setItem('newsAutoRefresh', this.autoRefresh);
            if (this.autoRefresh) {
                this.setupAutoRefresh();
            } else if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
        },
        setupAutoRefresh() {
            if (this.refreshTimer) {
                clearInterval(this.refreshTimer);
            }
            this.refreshTimer = setInterval(() => {
                this.loadNewsData();
            }, this.refreshInterval * 60 * 1000);
        },
        async loadNewsData() {
            this.loading = true;
            this.error = null;
            try {
                const category = this.navItems[this.activeNav].category;
                const tag = this.tags[this.activeTag] === '全部' ? 'all' : 
                             this.tags[this.activeTag] === '热门' ? 'hot' :
                             this.tags[this.activeTag] === '最新' ? 'latest' :
                             this.tags[this.activeTag].toLowerCase();
                
                const response = await fetch(`${this.apiBaseUrl}/news?category=${category}&tag=${tag}&search=${this.searchQuery}&page=${this.currentPage}&limit=${this.itemsPerPage}`);
                
                if (!response.ok) {
                    throw new Error('Failed to fetch news');
                }
                
                const data = await response.json();
                this.newsData = data.news;
                this.filteredNews = data.news;
                this.totalPages = data.pages;
                this.currentPage = data.currentPage;
            } catch (error) {
                console.error('加载新闻数据失败:', error);
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        goToPage(page) {
            if (page < 1 || page > this.totalPages || page === '...') return;
            this.currentPage = page;
            window.scrollTo({ top: 0, behavior: 'smooth' });
            this.loadNewsData();
        },
        prevPage() {
            this.goToPage(this.currentPage - 1);
        },
        nextPage() {
            this.goToPage(this.currentPage + 1);
        },
        formatDate(dateString) {
            const date = new Date(dateString);
            return this.currentLanguage === 'zh' 
                ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        },
        getCategoryName(category) {
            const map = {
                domestic: this.currentLanguage === 'zh' ? '国内' : 'Domestic',
                international: this.currentLanguage === 'zh' ? '国际' : 'International',
                technology: this.currentLanguage === 'zh' ? '科技' : 'Technology',
                sports: this.currentLanguage === 'zh' ? '体育' : 'Sports',
                entertainment: this.currentLanguage === 'zh' ? '娱乐' : 'Entertainment'
            };
            return map[category] || category;
        },
        toggleLanguage() {
            this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
            localStorage.setItem('newsLanguage', this.currentLanguage);
            
            this.navItems = [
                { text: this.currentLanguage === 'zh' ? '首页' : 'Home', category: 'all' },
                { text: this.currentLanguage === 'zh' ? '国内' : 'Domestic', category: 'domestic' },
                { text: this.currentLanguage === 'zh' ? '国际' : 'International', category: 'international' },
                { text: this.currentLanguage === 'zh' ? '科技' : 'Technology', category: 'technology' },
                { text: this.currentLanguage === 'zh' ? '体育' : 'Sports', category: 'sports' },
                { text: this.currentLanguage === 'zh' ? '娱乐' : 'Entertainment', category: 'entertainment' }
            ];
            
            this.tags = this.currentLanguage === 'zh' 
                ? ['全部', '热门', '最新', '政治', '经济', '健康']
                : ['All', 'Hot', 'Latest', 'Politics', 'Economy', 'Health'];
            
            this.loadNewsData();
        },
        toggleSettings() {
            this.showSettings = !this.showSettings;
        },
        toggleLoginModal() {
            this.showLoginModal = !this.showLoginModal;
        },
        toggleRegisterModal() {
            this.showRegisterModal = !this.showRegisterModal;
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
            window.location.href = `news-detail.html?id=${newsId}`;
        },
        changeCategory(index) {
            this.activeNav = index;
            this.loadNewsData();
        },
        filterByTag(index) {
            this.activeTag = index;
            this.loadNewsData();
        },
        searchNews() {
            this.currentPage = 1;
            this.loadNewsData();
        },
        async handleLogin() {
            if (!this.loginForm.username || !this.loginForm.password) {
                alert(this.lang.loginRequired);
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Login failed');
                }

                localStorage.setItem('token', data.token);
                this.isLoggedIn = true;
                this.user = data.user;
                this.showLoginModal = false;
                this.loginForm = { username: '', password: '' };
                
                this.loadNewsData();
            } catch (error) {
                console.error('Login error:', error);
                alert(error.message || 'Login failed');
            }
        },
        async fetchUserInfo() {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                
                const response = await fetch(`${this.apiBaseUrl}/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch user info');
                }
                
                const data = await response.json();
                this.user = data.user;
                this.isLoggedIn = true;
            } catch (error) {
                console.error('Error fetching user info:', error);
                localStorage.removeItem('token');
            }
        },
        async handleRegister() {
            if (!this.registerForm.username || !this.registerForm.email || 
                !this.registerForm.password || !this.registerForm.confirmPassword) {
                alert(this.lang.registerRequired);
                return;
            }

            if (this.registerForm.password !== this.registerForm.confirmPassword) {
                alert(this.lang.passwordsNotMatch);
                return;
            }

            try {
                const response = await fetch(`${this.apiBaseUrl}/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.registerForm)
                });

                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.message || 'Registration failed');
                }

                localStorage.setItem('token', data.token);
                this.isLoggedIn = true;
                this.user = data.user;
                this.showRegisterModal = false;
                this.registerForm = { username: '', email: '', password: '', confirmPassword: '' };
                
                this.loadNewsData();
            } catch (error) {
                console.error('Registration error:', error);
                alert(error.message || 'Registration failed');
            }
        },
        logout() {
            if (confirm(this.lang.confirmLogout)) {
                localStorage.removeItem('token');
                this.isLoggedIn = false;
                this.user = null;
                this.showDropdown = false;
                this.loadNewsData();
            }
        },
        checkAuth() {
            const token = localStorage.getItem('token');
            if (token) {
                this.fetchUserInfo();
            }
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
        
        if (this.autoRefresh) {
            this.setupAutoRefresh();
        }
        
        this.checkAuth();
        this.loadNewsData();
        document.addEventListener('click', this.handleClickOutside);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.handleClickOutside);
    }
});

app.mount('#app');