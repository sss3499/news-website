// 使用 Vue 的 createApp 和 router
const { createApp, ref } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// 模拟语言包
const lang = {
  zh: {
    logoText: 'Global 新闻',
    login: '登录',
    register: '注册',
    logout: '退出登录',
    phoneLogin: '手机号登录',
    passwordLogin: '密码登录',
    otherLogin: '其他登录方式',
    registerNow: '立即注册'
  }
};

// 登录组件
const LoginComponent = {
  template: `
    <div class="login-container">
      <h2>用户登录</h2>
      <form @submit.prevent="submitLogin">
        <div class="input-group">
          <label for="phone">手机号</label>
          <input type="text" id="phone" v-model="loginForm.phone" placeholder="请输入手机号">
        </div>
        <div class="input-group">
          <label for="password">密码</label>
          <input type="password" id="password" v-model="loginForm.password" placeholder="请输入密码">
        </div>
        <button type="submit">登录</button>
        <p class="switch-mode">
          还没有账号？<a href="#" @click="$router.push('/register')">立即注册</a>
        </p>
      </form>
      <div class="other-login">
        <p>其他登录方式：</p>
        <button @click="loginWithWeChat"><i class="fab fa-weixin"></i> 微信登录</button>
        <button @click="loginWithQQ"><i class="fab fa-qq"></i> QQ 登录</button>
      </div>
    </div>
  `,
  setup() {
    const loginForm = ref({ phone: '', password: '' });
    const submitLogin = () => {
      console.log('提交登录:', loginForm.value);
      // 实际开发中应调用 API 验证登录信息
      alert('登录成功');
      router.app.isLoggedIn = true;
      router.push('/');
    };
    const loginWithWeChat = () => alert('微信登录暂未实现');
    const loginWithQQ = () => alert('QQ 登录暂未实现');

    return {
      loginForm,
      submitLogin,
      loginWithWeChat,
      loginWithQQ
    };
  }
};

// 注册组件
const RegisterComponent = {
  template: `
    <div class="register-container">
      <h2>用户注册</h2>
      <form @submit.prevent="submitRegister">
        <div class="input-group">
          <label for="newPhone">手机号</label>
          <input type="text" id="newPhone" v-model="registerForm.phone" placeholder="请输入手机号">
        </div>
        <div class="input-group">
          <label for="newPassword">密码</label>
          <input type="password" id="newPassword" v-model="registerForm.password" placeholder="请输入密码">
        </div>
        <button type="submit">注册</button>
        <p class="switch-mode">
          已有账号？<a href="#" @click="$router.push('/login')">去登录</a>
        </p>
      </form>
    </div>
  `,
  setup() {
    const registerForm = ref({ phone: '', password: '' });
    const submitRegister = () => {
      console.log('提交注册:', registerForm.value);
      alert('注册成功，请登录');
      router.push('/login');
    };

    return { registerForm, submitRegister };
  }
};

// 创建路由
const routes = [
  { path: '/login', component: LoginComponent },
  { path: '/register', component: RegisterComponent },
  { path: '/', redirect: '/login' }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 创建应用
const app = createApp({
  setup() {
    const isLoggedIn = ref(false);
    const langData = lang['zh'];

    function logout() {
      if (confirm('确定要退出登录吗？')) {
        isLoggedIn.value = false;
        alert('已退出登录');
        router.push('/login');
      }
    }

    return {
      lang: langData,
      isLoggedIn,
      logout
    };
  }
});

// 挂载路由
app.use(router);
app.mount('#app');