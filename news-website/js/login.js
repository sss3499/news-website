const app = Vue.createApp({
    data() {
        return {
            currentLanguage: 'zh',
            showLoginModal: false,
            showRegisterModal: false,
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
            registerErrors: {
                username: '',
                email: '',
                password: '',
                confirmPassword: ''
            }
        };
    },
    computed: {
        lang() {
            return langData[this.currentLanguage];
        }
    },
    methods: {
        toggleLoginModal() {
            this.showLoginModal = !this.showLoginModal;
            this.showRegisterModal = false;
        },
        toggleRegisterModal() {
            this.showRegisterModal = !this.showRegisterModal;
            this.showLoginModal = false;
        },
        async handleLogin() {
            if (!this.loginForm.username || !this.loginForm.password) {
                alert(this.lang.loginRequired);
                return;
            }

            try {
                // 这里应该是实际的API请求
                // 模拟登录成功
                this.isLoggedIn = true;
                this.user = { username: this.loginForm.username };
                localStorage.setItem('token', 'simulated-token');
                this.showLoginModal = false;
                this.loginForm = { username: '', password: '' };
                
                // 重定向到首页
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Login error:', error);
                alert('Login failed');
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
                this.registerErrors.username = this.lang.registerRequired;
                return;
            }
            if (!this.registerForm.email) {
                this.registerErrors.email = this.lang.registerRequired;
                return;
            }
            if (!this.registerForm.password) {
                this.registerErrors.password = this.lang.registerRequired;
                return;
            }
            if (this.registerForm.password !== this.registerForm.confirmPassword) {
                this.registerErrors.confirmPassword = this.lang.passwordsNotMatch;
                return;
            }

            try {
                // 这里应该是实际的API请求
                // 模拟注册成功
                this.isLoggedIn = true;
                this.user = { username: this.registerForm.username };
                localStorage.setItem('token', 'simulated-token');
                this.showRegisterModal = false;
                this.registerForm = { username: '', email: '', password: '', confirmPassword: '' };
                
                // 重定向到首页
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Registration error:', error);
                alert('Registration failed');
            }
        },
        logout() {
            if (confirm(this.lang.confirmLogout)) {
                localStorage.removeItem('token');
                this.isLoggedIn = false;
                this.user = null;
                window.location.reload();
            }
        },
        checkAuth() {
            const token = localStorage.getItem('token');
            if (token) {
                this.isLoggedIn = true;
                this.user = { username: 'User' };
            }
        }
    },
    mounted() {
        this.checkAuth();
    }
});

app.mount('#app');