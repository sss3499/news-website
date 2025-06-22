const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            currentLanguage: 'zh',
            isLoggedIn: false,
            user: null,
            news: {
                id: null,
                title: '',
                content: '',
                date: new Date().toISOString(),
                source: '',
                views: 0,
                likes: 0,
                comments: 0,
                tags: [],
                image: '',
                url: ''
            },
            relatedNews: [],
            commentText: '',
            likedNews: [],
            loading: false,
            error: null,
            apiBaseUrl: 'http://localhost:3000/api', // 修改为您的API基础URL
            lang: {
                zh: {
                    logoText: '全球新闻',
                    login: '登录',
                    backToList: '返回列表',
                    views: '次浏览',
                    likes: '点赞',
                    viewOriginal: '查看原文',
                    relatedNews: '相关新闻',
                    comments: '评论',
                    commentPlaceholder: '写下你的评论...',
                    submitComment: '提交评论',
                    loading: '加载中...'
                },
                en: {
                    logoText: 'Global News',
                    login: 'Login',
                    backToList: 'Back to list',
                    views: 'views',
                    likes: 'likes',
                    viewOriginal: 'View original',
                    relatedNews: 'Related news',
                    comments: 'Comments',
                    commentPlaceholder: 'Write your comment...',
                    submitComment: 'Submit',
                    loading: 'Loading...'
                }
            }
        };
    },
     mounted() {
       this.checkAuth();
     },

    computed: {
        currentLang() {
            return this.lang[this.currentLanguage] || this.lang.zh;
        }
    },
    methods: {
        isLiked(newsId) {
            return this.likedNews.includes(newsId);
        },
        
        async toggleLike(newsId) {
            if (!this.isLoggedIn) {
                this.toggleLoginModal();
                return;
            }
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/news/${newsId}/like`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error('操作失败');
                }
                
                const data = await response.json();
                
                if (this.isLiked(newsId)) {
                    this.likedNews = this.likedNews.filter(id => id !== newsId);
                    this.news.likes = Math.max(0, this.news.likes - 1);
                } else {
                    this.likedNews.push(newsId);
                    this.news.likes += 1;
                }
            } catch (error) {
                console.error('点赞操作失败:', error);
                this.error = this.currentLanguage === 'zh' ? '点赞操作失败' : 'Like operation failed';
            }
        },

logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('token');
        this.isLoggedIn = false;
        this.user = null;
        window.location.href = 'index.html';
    }
},
        
        toggleLanguage() {
            this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
            localStorage.setItem('newsLanguage', this.currentLanguage);
        },
        
        formatDate(dateString) {
            if (!dateString) return this.currentLanguage === 'zh' ? '未知日期' : 'Unknown date';
            
            try {
                const date = new Date(dateString);
                if (isNaN(date.getTime())) throw new Error('Invalid date');
                
                return this.currentLanguage === 'zh' 
                    ? `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
                    : date.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                    });
            } catch (e) {
                console.error('日期格式化错误:', e);
                return this.currentLanguage === 'zh' ? '未知日期' : 'Unknown date';
            }
        },
        
        getTagName(tag) {
            const tagMap = {
                'politics': this.currentLanguage === 'zh' ? '政治' : 'Politics',
                'economy': this.currentLanguage === 'zh' ? '经济' : 'Economy',
                'sports': this.currentLanguage === 'zh' ? '体育' : 'Sports',
                'technology': this.currentLanguage === 'zh' ? '科技' : 'Technology',
                'entertainment': this.currentLanguage === 'zh' ? '娱乐' : 'Entertainment'
            };
            
            return tagMap[tag] || tag;
        },
        
        goBack() {
            window.history.back();
        },
        
        goToDetail(id) {
            window.location.href = `news-detail.html?id=${id}`;
        },
        
        toggleLoginModal() {
            window.location.href = 'login.html';
        },
        
        async submitComment() {
            if (!this.commentText.trim()) return;
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/news/${this.news.id}/comment`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: this.commentText
                    })
                });
                
                if (!response.ok) {
                    throw new Error('评论提交失败');
                }
                
                this.news.comments += 1;
                this.commentText = '';
            } catch (error) {
                console.error('提交评论失败:', error);
                this.error = this.currentLanguage === 'zh' ? '评论提交失败' : 'Failed to submit comment';
            }
        },
        
        async loadNewsDetail() {
            this.loading = true;
            this.error = null;
            
            const urlParams = new URLSearchParams(window.location.search);
            const newsId = urlParams.get('id');
            
            if (!newsId) {
                this.error = this.currentLanguage === 'zh' ? '未提供新闻ID' : 'News ID not provided';
                this.loading = false;
                return;
            }
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/news/${newsId}`);
                
                if (!response.ok) {
                    throw new Error(response.status === 404 
                        ? (this.currentLanguage === 'zh' ? '新闻不存在' : 'News not found')
                        : (this.currentLanguage === 'zh' ? '获取新闻详情失败' : 'Failed to fetch news detail'));
                }
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.error || (this.currentLanguage === 'zh' ? '获取新闻详情失败' : 'Failed to fetch news detail'));
                }
                
                this.news = data.news;
                
                // 加载相关新闻
                await this.loadRelatedNews(data.news.category);
            } catch (error) {
                console.error('加载新闻详情失败:', error);
                this.error = error.message;
            } finally {
                this.loading = false;
            }
        },
        
        async loadRelatedNews(category) {
            if (!category) return;
            
            try {
                const response = await fetch(`${this.apiBaseUrl}/news/related?category=${category}&limit=3&exclude=${this.news.id}`);
                
                if (!response.ok) {
                    throw new Error(this.currentLanguage === 'zh' ? '获取相关新闻失败' : 'Failed to fetch related news');
                }
                
                const data = await response.json();
                
                if (data.success) {
                    this.relatedNews = data.news;
                }
            } catch (error) {
                console.error('加载相关新闻失败:', error);
                // 不显示错误，因为相关新闻不是主要功能
            }
        },
        
        handleImageError(event) {
            event.target.src = 'images/default-news.jpg';
        },
        
        checkAuth() {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const decoded = jwt_decode(token);
          if (decoded && decoded.user) {
            this.isLoggedIn = true;
            this.user = decoded.user;
          }
        } catch (e) {
          localStorage.removeItem('token');
        }
      }
    },
        
        async fetchUserLikes() {
            try {
                const response = await fetch(`${this.apiBaseUrl}/user/likes`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.likedNews = data.likes;
                    }
                }
            } catch (error) {
                console.error('获取用户点赞失败:', error);
            }
        }
    },
    mounted() {
        // 从本地存储加载语言设置
        const savedLanguage = localStorage.getItem('newsLanguage');
        if (savedLanguage) {
            this.currentLanguage = savedLanguage;
        }
        
        this.checkAuth();
        this.loadNewsDetail();
    }
});

app.mount('#app');