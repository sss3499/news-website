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
            },
            error: null
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
                    usernamePlaceholder: '请输入用户名',
                    passwordPlaceholder: '请输入密码',
                    emailPlaceholder: '请输入邮箱',
                    confirmPasswordPlaceholder: '请确认密码',
                    loginRequired: '请输入用户名和密码',
                    registerRequired: '请填写所有字段',
                    passwordsNotMatch: '两次密码输入不一致',
                    confirmLogout: '确定要退出登录吗？',
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
                    usernamePlaceholder: 'Enter username',
                    passwordPlaceholder: 'Enter password',
                    emailPlaceholder: 'Enter email',
                    confirmPasswordPlaceholder: 'Confirm password',
                    loginRequired: 'Please enter username and password',
                    registerRequired: 'Please fill all fields',
                    passwordsNotMatch: 'Passwords do not match',
                    confirmLogout: 'Are you sure to logout?',
                    welcome: 'Welcome',
                    pleaseLogin: 'Please login'
                }
            }[this.currentLanguage];
        }
    },
    methods: {
        toggleLoginModal() {
            this.showLoginModal = !this.showLoginModal;
            this.showRegisterModal = false;
            this.error = null;
        },
        toggleRegisterModal() {
            this.showRegisterModal = !this.showRegisterModal;
            this.showLoginModal = false;
            this.error = null;
        },
        async handleLogin() {
            if (!this.loginForm.username || !this.loginForm.password) {
                this.error = this.lang.loginRequired;
                return;
            }

            try {
                const response = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: this.loginForm.username,
                        password: this.loginForm.password
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '登录失败');
                }

                const data = await response.json();
                if (!data.success) {
                    throw new Error(data.error || '登录失败');
                }

                localStorage.setItem('token', data.token);
                this.isLoggedIn = true;
                this.user = data.user;
                this.showLoginModal = false;
                this.loginForm = { username: '', password: '' };
                this.error = null;
                
                // 重定向到首页
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Login error:', error);
                this.error = error.message;
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
                const response = await fetch('http://localhost:3000/api/register', {
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
                
                // 重定向到首页
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Registration error:', error);
                if (error.message.includes('ER_DUP_ENTRY')) {
                    this.error = '用户名或邮箱已存在';
                } else {
                    this.error = error.message;
                }
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