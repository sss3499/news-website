const { createApp } = Vue;

const app = createApp({
    data() {
        return {
            lang: langData,
            currentLanguage: 'zh',
            news: {},
            relatedNews: [],
            comments: [],
            commentText: '',
            replyText: '',
            showReply: null,
            isLiked: {},
            showSettings: false,
            selectedTheme: 'light',
            selectedFontSize: 'medium',
            autoRefresh: false,
            refreshInterval: 5,
            isLoggedIn: false,
            user: null
        };
    },
    computed: {
        currentLang() {
            return this.lang[this.currentLanguage];
        }
    },
    methods: {
        toggleLanguage() {
            this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
            this.fetchNewsById();
        },
        toggleSettings() {
            this.showSettings = !this.showSettings;
        },
        changeTheme() {
            document.documentElement.setAttribute('data-theme', this.selectedTheme);
        },
        changeFontSize() {
            document.documentElement.setAttribute('data-font-size', this.selectedFontSize);
        },
        changeLayout() {
            // 可以在这里添加布局切换逻辑
        },
        toggleAutoRefresh() {
            if (this.autoRefresh) {
                this.startAutoRefresh();
            } else {
                this.stopAutoRefresh();
            }
        },
        startAutoRefresh() {
            // 模拟自动刷新逻辑
            setInterval(() => {
                console.log('自动刷新');
            }, this.refreshInterval * 60 * 1000);
        },
        stopAutoRefresh() {
            // 停止自动刷新
        },
        formatDate(date) {
            return new Date(date).toLocaleDateString(this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US');
        },
        fetchNewsById() {
            const newsId = new URLSearchParams(window.location.search).get('id');
            if (!newsId) return;

            // 使用当前语言的新闻数据
            this.news = this.currentLang.newsData.find(news => news.id === parseInt(newsId)) || {};
            
            // 模拟获取相关新闻
            this.relatedNews = this.currentLang.newsData
                .filter(news => news.id !== parseInt(newsId) && news.category === this.news.category)
                .slice(0, 3);
        },
        goBack() {
            window.history.back();
        },
        shareNews() {
            // 模拟分享逻辑
            alert('分享功能暂未实现');
        },
        toggleLike(newsId) {
            const news = this.news;
            if (news) {
                news.likes = (news.likes || 0) + (this.isLiked(newsId) ? -1 : 1);
            }
        },
        getTagName(tag) {
            const tags = {
                hot: this.lang.hot,
                latest: this.lang.latest,
                politics: this.lang.politics,
                economy: this.lang.economy,
                health: this.lang.health
            };
            return tags[tag] || tag;
        },
        showReplyBox(index) {
            this.showReply = index;
        },
        cancelReply() {
            this.showReply = null;
            this.replyText = '';
        },
        submitReply(commentId) {
            const reply = {
                author: this.user.username || 'Anonymous',
                content: this.replyText,
                date: new Date().toISOString()
            };
            const comment = this.comments.find(c => c.id === commentId);
            if (comment) {
                comment.replies = [...(comment.replies || []), reply];
            } else {
                this.comments.push({
                    id: commentId,
                    author: this.user.username || 'Anonymous',
                    content: this.commentText,
                    date: new Date().toISOString(),
                    replies: [reply]
                });
            }
            this.showReply = null;
            this.replyText = '';
        },
        submitComment() {
            const comment = {
                author: this.isLoggedIn ? this.user.username : 'Anonymous',
                content: this.commentText,
                date: new Date().toISOString()
            };
            this.comments.push(comment);
            this.commentText = '';
        }
    },
    mounted() {
        this.fetchNewsById();
    },
});

app.mount('#app');