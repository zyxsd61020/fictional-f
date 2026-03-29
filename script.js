const API = {
    baseUrl: '',
    
    getToken() {
        return localStorage.getItem('token');
    },
    
    setToken(token) {
        localStorage.setItem('token', token);
    },
    
    removeToken() {
        localStorage.removeItem('token');
    },
    
    async request(url, options = {}) {
        const token = this.getToken();
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            ...options,
            headers
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || '请求失败');
        }
        
        return data;
    },
    
    async get(url) {
        return this.request(url, { method: 'GET' });
    },
    
    async post(url, data) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    async put(url, data) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};

const App = {
    currentUser: null,
    currentPage: 'home',
    products: [],
    announcements: [],
    aiMode: false,
    aiMessages: [],
    
    async init() {
        this.bindEvents();
        await this.checkAuth();
        this.updateNav();
        await this.navigate('home');
    },
    
    async checkAuth() {
        const token = API.getToken();
        if (token) {
            try {
                this.currentUser = await API.get('/api/auth/me');
            } catch {
                API.removeToken();
                this.currentUser = null;
            }
        }
    },
    
    bindEvents() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.navigate(link.dataset.page);
            });
        });

        document.getElementById('loginBtn').addEventListener('click', () => {
            this.showLoginModal();
        });
    },
    
    updateNav() {
        const navAuth = document.getElementById('navAuth');
        if (this.currentUser) {
            navAuth.innerHTML = `
                <span style="margin-right: 16px;">👋 ${this.currentUser.nickname}</span>
                <button id="logoutBtn" class="btn btn-secondary">退出</button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
        } else {
            navAuth.innerHTML = `<button id="loginBtn" class="btn btn-primary">登录</button>`;
            document.getElementById('loginBtn').addEventListener('click', () => this.showLoginModal());
        }
    },
    
    async navigate(page, data = null) {
        if (['publish', 'profile'].includes(page) && !this.currentUser) {
            alert('请先登录');
            this.showLoginModal();
            return;
        }

        this.currentPage = page;
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.toggle('active', link.dataset.page === page);
        });

        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = '<div class="loading">加载中...</div>';
        
        switch (page) {
            case 'home':
                await this.renderHome();
                break;
            case 'publish':
                await this.renderPublish();
                break;
            case 'profile':
                await this.renderProfile();
                break;
            case 'detail':
                await this.renderDetail(data);
                break;
        }
    },
    
    showLoginModal() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="card" style="width: 100%; max-width: 450px; margin: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>校园认证</h2>
                        <button id="closeModal" style="border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="tabs" style="border-bottom: 2px solid #e0e0e0; margin-bottom: 24px;">
                        <button class="tab active" data-tab="login">登录</button>
                        <button class="tab" data-tab="register">注册</button>
                    </div>
                    <div id="loginForm">
                        <div class="form-group">
                            <label class="form-label">学号</label>
                            <input type="text" class="form-input" id="loginStudentId" placeholder="请输入学号">
                        </div>
                        <div class="form-group">
                            <label class="form-label">密码</label>
                            <input type="password" class="form-input" id="loginPassword" placeholder="请输入密码">
                        </div>
                        <button class="btn btn-primary" style="width: 100%;" id="doLogin">登录</button>
                    </div>
                    <div id="registerForm" class="hidden">
                        <div class="form-group">
                            <label class="form-label">学号</label>
                            <input type="text" class="form-input" id="regStudentId" placeholder="请输入学号">
                        </div>
                        <div class="form-group">
                            <label class="form-label">院系</label>
                            <input type="text" class="form-input" id="regDepartment" placeholder="例如：计算机学院">
                        </div>
                        <div class="form-group">
                            <label class="form-label">入学年份</label>
                            <select class="form-select" id="regYear">
                                <option value="">请选择</option>
                                ${[2020,2021,2022,2023,2024].map(y => `<option value="${y}">${y}级</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">昵称</label>
                            <input type="text" class="form-input" id="regNickname" placeholder="给自己起个名字">
                        </div>
                        <div class="form-group">
                            <label class="form-label">密码</label>
                            <input type="password" class="form-input" id="regPassword" placeholder="设置密码">
                        </div>
                        <button class="btn btn-primary" style="width: 100%;" id="doRegister">注册</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#closeModal').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal.firstChild) modal.remove();
        });

        modal.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', () => {
                modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                modal.querySelector('#loginForm').classList.toggle('hidden', tab.dataset.tab !== 'login');
                modal.querySelector('#registerForm').classList.toggle('hidden', tab.dataset.tab !== 'register');
            });
        });

        modal.querySelector('#doLogin').addEventListener('click', () => this.login(modal));
        modal.querySelector('#doRegister').addEventListener('click', () => this.register(modal));
    },
    
    async login(modal) {
        try {
            const studentId = modal.querySelector('#loginStudentId').value;
            const password = modal.querySelector('#loginPassword').value;

            const result = await API.post('/api/auth/login', { studentId, password });
            API.setToken(result.token);
            this.currentUser = result.user;
            this.updateNav();
            modal.remove();
            await this.navigate('home');
        } catch (error) {
            alert(error.message);
        }
    },
    
    async register(modal) {
        try {
            const studentId = modal.querySelector('#regStudentId').value;
            const department = modal.querySelector('#regDepartment').value;
            const enrollmentYear = modal.querySelector('#regYear').value;
            const nickname = modal.querySelector('#regNickname').value;
            const password = modal.querySelector('#regPassword').value;

            if (!studentId || !department || !enrollmentYear || !nickname || !password) {
                alert('请填写完整信息');
                return;
            }

            const result = await API.post('/api/auth/register', {
                studentId,
                department,
                enrollmentYear: parseInt(enrollmentYear),
                nickname,
                password
            });
            
            API.setToken(result.token);
            this.currentUser = result.user;
            this.updateNav();
            modal.remove();
            await this.navigate('home');
        } catch (error) {
            alert(error.message);
        }
    },
    
    logout() {
        API.removeToken();
        this.currentUser = null;
        this.updateNav();
        this.navigate('home');
    },
    
    async renderHome() {
        const mainContent = document.getElementById('mainContent');
        
        try {
            const [productsData, announcements] = await Promise.all([
                API.get('/api/products'),
                API.get('/api/announcements')
            ]);
            
            this.products = productsData.products || [];
            this.announcements = announcements;
            
            mainContent.innerHTML = `
                ${this.announcements.map(a => `
                    <div class="announcement">
                        <div class="announcement-title">📢 ${a.title}</div>
                        <div>${a.content}</div>
                    </div>
                `).join('')}
                
                <div class="card">
                    <div class="filter-bar">
                        <div class="search-box">
                            <input type="text" class="form-input" id="searchInput" placeholder="搜索商品...">
                        </div>
                        <select class="form-select" id="categoryFilter" style="width: 150px;">
                            <option value="">全部分类</option>
                            <option value="电子数码">电子数码</option>
                            <option value="生活用品">生活用品</option>
                            <option value="学习用品">学习用品</option>
                            <option value="服饰鞋帽">服饰鞋帽</option>
                            <option value="运动户外">运动户外</option>
                            <option value="寝室用品">寝室用品</option>
                            <option value="其他">其他</option>
                        </select>
                        <select class="form-select" id="conditionFilter" style="width: 120px;">
                            <option value="">新旧程度</option>
                            <option value="全新">全新</option>
                            <option value="九成新">九成新</option>
                            <option value="八成新">八成新</option>
                            <option value="五成新">五成新</option>
                        </select>
                        <button class="btn ${this.aiMode ? 'btn-primary' : 'btn-secondary'}" id="aiSearchToggle" style="margin-left: 10px;">
                            🤖 ${this.aiMode ? 'AI搜索中' : 'AI搜索'}
                        </button>
                    </div>
                </div>

                <div id="aiChatContainer" class="${this.aiMode ? '' : 'hidden'}" style="margin-bottom: 20px;">
                    <div class="card">
                        <h3 style="margin-bottom: 16px;">🤖 AI 智能推荐助手</h3>
                        <div id="aiChatMessages" style="height: 300px; overflow-y: auto; background: #f5f5f5; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
                            ${this.renderAiMessages()}
                        </div>
                        <div style="display: flex; gap: 10px;">
                            <input type="text" class="form-input" id="aiChatInput" placeholder="描述你想要找的商品...">
                            <button class="btn btn-primary" id="sendAiMessage">发送</button>
                        </div>
                    </div>
                </div>

                <div class="product-grid" id="productGrid">
                    ${this.renderProductCards(this.products)}
                </div>
            `;

            document.getElementById('searchInput').addEventListener('input', () => this.filterProducts());
            document.getElementById('categoryFilter').addEventListener('change', () => this.filterProducts());
            document.getElementById('conditionFilter').addEventListener('change', () => this.filterProducts());
            document.getElementById('aiSearchToggle').addEventListener('click', () => this.toggleAiMode());
            
            if (this.aiMode) {
                document.getElementById('sendAiMessage').addEventListener('click', () => this.sendAiMessage());
                document.getElementById('aiChatInput').addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') this.sendAiMessage();
                });
            }
        } catch (error) {
            mainContent.innerHTML = `<div class="card"><p>加载失败: ${error.message}</p></div>`;
        }
    },
    
    renderAiMessages() {
        if (this.aiMessages.length === 0) {
            return `
                <div style="text-align: center; color: #666; padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">👋</div>
                    <p>你好！我是 AI 智能推荐助手。</p>
                    <p>告诉我你想找什么样的商品，我来帮你推荐！</p>
                </div>
            `;
        }
        return this.aiMessages.map(msg => `
            <div style="margin-bottom: 16px; ${msg.role === 'user' ? 'text-align: right;' : ''}">
                <div style="display: inline-block; max-width: 80%; padding: 12px 16px; border-radius: 12px; 
                    ${msg.role === 'user' 
                        ? 'background: var(--jd-red); color: white;' 
                        : 'background: white; border: 1px solid #e0e0e0;'}">
                    ${msg.content}
                </div>
            </div>
        `).join('');
    },
    
    toggleAiMode() {
        this.aiMode = !this.aiMode;
        if (this.aiMode && this.aiMessages.length === 0) {
            this.aiMessages = [{
                role: 'assistant',
                content: '你好！我是校园集市的 AI 智能推荐助手 🤖。告诉我你想找什么样的商品，比如"我想买一个价格在100元以内的蓝牙耳机"，我会帮你智能推荐！'
            }];
        }
        this.renderHome();
    },
    
    async sendAiMessage() {
        const input = document.getElementById('aiChatInput');
        const content = input.value.trim();
        if (!content) return;
        
        this.aiMessages.push({ role: 'user', content });
        input.value = '';
        
        const messagesContainer = document.getElementById('aiChatMessages');
        messagesContainer.innerHTML = this.renderAiMessages();
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        try {
            this.aiMessages.push({ role: 'assistant', content: '正在思考中...' });
            messagesContainer.innerHTML = this.renderAiMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            const response = await API.post('/api/ai/chat', {
                message: content,
                products: this.products
            });
            
            this.aiMessages.pop();
            this.aiMessages.push({ role: 'assistant', content: response.reply });
            
            messagesContainer.innerHTML = this.renderAiMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            this.aiMessages.pop();
            this.aiMessages.push({ role: 'assistant', content: '抱歉，AI 服务暂时不可用，请稍后再试。' });
            messagesContainer.innerHTML = this.renderAiMessages();
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    },
    
    renderProductCards(products) {
        if (products.length === 0) {
            return `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">📦</div>
                    <h3>暂无商品</h3>
                    <p>快来发布第一个商品吧！</p>
                </div>
            `;
        }
        return products.map(p => {
            const img = p.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
            return `
                <div class="product-card" onclick="App.navigate('detail', '${p.id}')">
                    <img src="${img}" class="product-image" alt="${p.title}">
                    <div class="product-info">
                        <div class="product-title">${p.title}</div>
                        <div class="product-price">¥${p.price}</div>
                        <div class="product-meta">
                            <span>${p.condition}</span>
                            <span>👁 ${p.view_count || p.viewCount || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },
    
    filterProducts() {
        const keyword = document.getElementById('searchInput').value.toLowerCase();
        const category = document.getElementById('categoryFilter').value;
        const condition = document.getElementById('conditionFilter').value;

        let products = this.products.filter(p => p.status === 'selling');
        if (keyword) products = products.filter(p => p.title.toLowerCase().includes(keyword));
        if (category) products = products.filter(p => p.category === category);
        if (condition) products = products.filter(p => p.condition === condition);

        document.getElementById('productGrid').innerHTML = this.renderProductCards(products);
    },
    
    async renderPublish() {
        const mainContent = document.getElementById('mainContent');
        let uploadedImages = [];
        
        mainContent.innerHTML = `
            <div class="card">
                <h2 style="margin-bottom: 24px;">发布商品</h2>
                <form id="publishForm">
                    <div class="form-group">
                        <label class="form-label">商品名称 *</label>
                        <input type="text" class="form-input" id="productTitle" placeholder="请输入商品名称" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">分类 *</label>
                        <select class="form-select" id="productCategory" required>
                            <option value="">请选择分类</option>
                            <option value="电子数码">电子数码</option>
                            <option value="生活用品">生活用品</option>
                            <option value="学习用品">学习用品</option>
                            <option value="服饰鞋帽">服饰鞋帽</option>
                            <option value="运动户外">运动户外</option>
                            <option value="寝室用品">寝室用品</option>
                            <option value="其他">其他</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">价格（元）*</label>
                        <input type="number" class="form-input" id="productPrice" placeholder="0" min="0" required>
                    </div>
                    <div class="form-group">
                        <label class="form-label">成色 *</label>
                        <select class="form-select" id="productCondition" required>
                            <option value="">请选择成色</option>
                            <option value="全新">全新</option>
                            <option value="九成新">九成新</option>
                            <option value="八成新">八成新</option>
                            <option value="五成新">五成新</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">商品图片（最多3张）</label>
                        <input type="file" class="form-input" id="productImages" accept="image/*" multiple>
                        <div class="image-preview" id="imagePreview"></div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">商品描述</label>
                        <textarea class="form-textarea" id="productDesc" placeholder="详细描述一下你的商品吧..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">交易方式 *</label>
                        <select class="form-select" id="productTransaction" required>
                            <option value="">请选择交易方式</option>
                            <option value="校内面交">校内面交</option>
                            <option value="宿舍自提">宿舍自提</option>
                            <option value="指定地点">指定地点</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">联系方式 *</label>
                        <input type="text" class="form-input" id="productContact" placeholder="微信号/QQ号" required>
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%;">发布商品</button>
                </form>
            </div>
        `;

        document.getElementById('productImages').addEventListener('change', (e) => {
            const files = Array.from(e.target.files).slice(0, 3);
            uploadedImages = [];
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = '';
            
            files.forEach((file, index) => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    uploadedImages.push(ev.target.result);
                    preview.innerHTML += `
                        <div class="preview-item">
                            <img src="${ev.target.result}">
                            <button class="preview-remove" onclick="this.parentElement.remove()">×</button>
                        </div>
                    `;
                };
                reader.readAsDataURL(file);
            });
        });

        document.getElementById('publishForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await API.post('/api/products', {
                    title: document.getElementById('productTitle').value,
                    category: document.getElementById('productCategory').value,
                    price: parseFloat(document.getElementById('productPrice').value),
                    condition: document.getElementById('productCondition').value,
                    description: document.getElementById('productDesc').value,
                    images: uploadedImages,
                    transactionMethod: document.getElementById('productTransaction').value,
                    contact: document.getElementById('productContact').value
                });

                alert('发布成功！');
                await this.navigate('home');
            } catch (error) {
                alert('发布失败: ' + error.message);
            }
        });
    },
    
    async renderDetail(productId) {
        const mainContent = document.getElementById('mainContent');
        
        try {
            const [product, messages] = await Promise.all([
                API.get(`/api/products/${productId}`),
                API.get(`/api/products/${productId}/messages`)
            ]);
            
            if (!product) {
                await this.navigate('home');
                return;
            }

            const seller = product.User || { nickname: '用户', avatar: null };
            
            let isFavorited = false;
            if (this.currentUser) {
                try {
                    const favorites = await API.get('/api/users/favorites');
                    isFavorited = favorites.some(f => f.id == productId);
                } catch {}
            }

            const images = product.images?.length > 0 ? product.images : ['https://via.placeholder.com/600x400?text=No+Image'];
            
            mainContent.innerHTML = `
                <div class="card">
                    <button class="btn btn-secondary" onclick="App.navigate('home')" style="margin-bottom: 20px;">← 返回</button>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div>
                            <div id="imageCarousel" style="position: relative; border-radius: 12px; overflow: hidden;">
                                <img id="mainImage" src="${images[0]}" style="width: 100%; display: block; border-radius: 12px;">
                                ${images.length > 1 ? `
                                    <button id="prevBtn" style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; border: none; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: background 0.3s;">‹</button>
                                    <button id="nextBtn" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 40px; height: 40px; border-radius: 50%; background: rgba(0,0,0,0.5); color: white; border: none; cursor: pointer; font-size: 20px; display: flex; align-items: center; justify-content: center; transition: background 0.3s;">›</button>
                                    <div style="position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); display: flex; gap: 8px;">
                                        ${images.map((_, idx) => `<div class="carousel-dot" data-index="${idx}" style="width: ${idx === 0 ? '24px' : '8px'}; height: 8px; border-radius: 4px; background: ${idx === 0 ? 'white' : 'rgba(255,255,255,0.5)'}; cursor: pointer; transition: all 0.3s;"></div>`).join('')}
                                    </div>
                                ` : ''}
                            </div>
                            ${images.length > 1 ? `<div style="display: flex; gap: 10px; margin-top: 12px; overflow-x: auto; padding-bottom: 8px;">
                                ${images.map((i, idx) => `<img src="${i}" class="thumbnail ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid ${idx === 0 ? 'var(--jd-red)' : 'transparent'}; flex-shrink: 0;">`).join('')}
                            </div>` : ''}
                        </div>
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                                <span class="status-badge status-${product.status}">${product.status === 'selling' ? '在售' : product.status === 'reserved' ? '已预定' : '已售出'}</span>
                                ${this.currentUser ? `<button class="btn ${isFavorited ? 'btn-danger' : 'btn-primary'}" id="toggleFavorite">
                                    ${isFavorited ? '❤️ 已收藏' : '🤍 收藏'}
                                </button>` : ''}
                            </div>
                            <h1 style="margin-bottom: 16px;">${product.title}</h1>
                            <div style="font-size: 36px; color: #ff6b6b; font-weight: bold; margin-bottom: 24px;">¥${product.price}</div>
                            
                            <div style="display: grid; gap: 12px; margin-bottom: 24px;">
                                <div><strong>分类：</strong>${product.category}</div>
                                <div><strong>成色：</strong>${product.condition}</div>
                                <div><strong>交易方式：</strong>${product.transactionMethod}</div>
                                <div><strong>浏览：</strong>${product.viewCount || product.view_count || 0}次</div>
                            </div>
                            
                            ${product.description ? `<div style="margin-bottom: 24px;">
                                <h3 style="margin-bottom: 8px;">商品描述</h3>
                                <p style="color: #666;">${product.description}</p>
                            </div>` : ''}
                            
                            <div style="background: #f5f5f5; padding: 20px; border-radius: 12px;">
                                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 16px;">
                                    <div style="width: 50px; height: 50px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">👤</div>
                                    <div>
                                        <div style="font-weight: 600;">${seller.nickname}</div>
                                        <div style="color: #888; font-size: 14px;">${seller.department || ''}</div>
                                    </div>
                                </div>
                                <div style="background: white; padding: 12px; border-radius: 8px;">
                                    <strong>联系方式：</strong>${product.contact}
                                </div>
                            </div>
                            
                            ${product.user_id === this.currentUser?.id || product.userId === this.currentUser?.id ? `
                                <div style="margin-top: 24px;">
                                    <h3 style="margin-bottom: 12px;">交易状态</h3>
                                    <div style="display: flex; gap: 12px;">
                                        <button class="btn ${product.status === 'selling' ? 'btn-primary' : 'btn-secondary'}" onclick="App.updateStatus('${productId}', 'selling')">在售</button>
                                        <button class="btn ${product.status === 'reserved' ? 'btn-primary' : 'btn-secondary'}" onclick="App.updateStatus('${productId}', 'reserved')">已预定</button>
                                        <button class="btn ${product.status === 'sold' ? 'btn-primary' : 'btn-secondary'}" onclick="App.updateStatus('${productId}', 'sold')">已售出</button>
                                    </div>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <h3 style="margin-bottom: 20px;">💬 留言板</h3>
                    ${this.currentUser ? `
                        <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                            <textarea class="form-textarea" id="messageInput" placeholder="说点什么..." style="flex: 1;"></textarea>
                            <button class="btn btn-primary" id="sendMessage" style="height: fit-content;">发送</button>
                        </div>
                    ` : '<p style="margin-bottom: 20px; color: #888;">登录后可以留言</p>'}
                    
                    <div class="message-list">
                        ${messages.length === 0 ? '<div class="empty-state" style="padding: 40px;"><div class="empty-state-icon">💭</div><p>暂无留言</p></div>' : 
                        messages.map(m => {
                            const msgUser = m.User || { nickname: '用户' };
                            return `
                                <div class="message-item">
                                    <div class="message-header">
                                        <span class="message-user">${msgUser.nickname}</span>
                                        <span class="message-time">${new Date(m.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div>${m.content}</div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;

            if (document.getElementById('toggleFavorite')) {
                document.getElementById('toggleFavorite').addEventListener('click', () => this.toggleFavorite(productId));
            }

            if (document.getElementById('sendMessage')) {
                document.getElementById('sendMessage').addEventListener('click', () => this.sendMessage(productId));
            }

            // 图片轮播功能
            if (images.length > 1) {
                let currentIndex = 0;
                const mainImage = document.getElementById('mainImage');
                const prevBtn = document.getElementById('prevBtn');
                const nextBtn = document.getElementById('nextBtn');
                const thumbnails = document.querySelectorAll('.thumbnail');
                const dots = document.querySelectorAll('.carousel-dot');

                const updateImage = (index) => {
                    currentIndex = index;
                    mainImage.src = images[index];
                    
                    // 更新缩略图状态
                    thumbnails.forEach((thumb, idx) => {
                        thumb.classList.toggle('active', idx === index);
                        thumb.style.border = idx === index ? '2px solid var(--jd-red)' : '2px solid transparent';
                    });
                    
                    // 更新指示点状态
                    dots.forEach((dot, idx) => {
                        dot.style.width = idx === index ? '24px' : '8px';
                        dot.style.background = idx === index ? 'white' : 'rgba(255,255,255,0.5)';
                    });
                };

                // 上一张/下一张按钮
                prevBtn.addEventListener('click', () => {
                    updateImage((currentIndex - 1 + images.length) % images.length);
                });

                nextBtn.addEventListener('click', () => {
                    updateImage((currentIndex + 1) % images.length);
                });

                // 缩略图点击
                thumbnails.forEach((thumb, idx) => {
                    thumb.addEventListener('click', () => updateImage(idx));
                });

                // 指示点点击
                dots.forEach((dot, idx) => {
                    dot.addEventListener('click', () => updateImage(idx));
                });

                // 触摸滑动支持
                let touchStartX = 0;
                let touchEndX = 0;
                const carousel = document.getElementById('imageCarousel');

                carousel.addEventListener('touchstart', (e) => {
                    touchStartX = e.changedTouches[0].screenX;
                });

                carousel.addEventListener('touchend', (e) => {
                    touchEndX = e.changedTouches[0].screenX;
                    const diff = touchStartX - touchEndX;
                    if (Math.abs(diff) > 50) {
                        if (diff > 0) {
                            // 向左滑动，下一张
                            updateImage((currentIndex + 1) % images.length);
                        } else {
                            // 向右滑动，上一张
                            updateImage((currentIndex - 1 + images.length) % images.length);
                        }
                    }
                });

                // 键盘左右键支持
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'ArrowLeft') {
                        updateImage((currentIndex - 1 + images.length) % images.length);
                    } else if (e.key === 'ArrowRight') {
                        updateImage((currentIndex + 1) % images.length);
                    }
                });
            }
        } catch (error) {
            mainContent.innerHTML = `<div class="card"><p>加载失败: ${error.message}</p></div>`;
        }
    },
    
    async toggleFavorite(productId) {
        try {
            await API.post(`/api/products/${productId}/favorite`);
            await this.renderDetail(productId);
        } catch (error) {
            alert('操作失败: ' + error.message);
        }
    },
    
    async sendMessage(productId) {
        const input = document.getElementById('messageInput');
        const content = input.value.trim();
        if (!content) return;

        try {
            await API.post(`/api/products/${productId}/messages`, { content });
            await this.renderDetail(productId);
        } catch (error) {
            alert('发布失败: ' + error.message);
        }
    },
    
    async updateStatus(productId, status) {
        try {
            await API.put(`/api/products/${productId}/status`, { status });
            await this.renderDetail(productId);
        } catch (error) {
            alert('更新失败: ' + error.message);
        }
    },
    
    async renderProfile() {
        const mainContent = document.getElementById('mainContent');
        
        try {
            const [myProducts, favorites] = await Promise.all([
                API.get('/api/users/products'),
                API.get('/api/users/favorites')
            ]);

            mainContent.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <div style="width: 100px; height: 100px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: white; font-size: 40px; margin-bottom: 16px;">👤</div>
                    <h2>${this.currentUser.nickname}</h2>
                    <p style="color: #888; margin-bottom: 8px;">${this.currentUser.department} · ${this.currentUser.enrollmentYear}级</p>
                    <p style="color: #888; margin-bottom: 24px;">学号：${this.currentUser.studentId}</p>
                    <button class="btn btn-secondary" onclick="App.showEditProfile()">编辑资料</button>
                </div>

                <div class="card">
                    <div class="tabs">
                        <button class="tab active" data-tab="myProducts">我的发布 (${myProducts.length})</button>
                        <button class="tab" data-tab="myFavorites">我的收藏 (${favorites.length})</button>
                    </div>
                    <div id="myProducts">
                        <div class="product-grid">
                            ${myProducts.length === 0 ? `
                                <div class="empty-state" style="grid-column: 1/-1;">
                                    <div class="empty-state-icon">📦</div>
                                    <p>还没有发布商品</p>
                                    <button class="btn btn-primary" onclick="App.navigate('publish')" style="margin-top: 16px;">去发布</button>
                                </div>
                            ` : myProducts.map(p => {
                                const img = p.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
                                return `
                                    <div class="product-card" onclick="App.navigate('detail', '${p.id}')">
                                        <img src="${img}" class="product-image">
                                        <div class="product-info">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <div class="product-title" style="flex: 1;">${p.title}</div>
                                                <span class="status-badge status-${p.status}">${p.status === 'selling' ? '在售' : p.status === 'reserved' ? '已预定' : '已售出'}</span>
                                            </div>
                                            <div class="product-price">¥${p.price}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    <div id="myFavorites" class="hidden">
                        <div class="product-grid">
                            ${favorites.length === 0 ? `
                                <div class="empty-state" style="grid-column: 1/-1;">
                                    <div class="empty-state-icon">🤍</div>
                                    <p>还没有收藏商品</p>
                                </div>
                            ` : favorites.filter(p => p.status === 'selling').map(p => {
                                const img = p.images?.[0] || 'https://via.placeholder.com/400x300?text=No+Image';
                                return `
                                    <div class="product-card" onclick="App.navigate('detail', '${p.id}')">
                                        <img src="${img}" class="product-image">
                                        <div class="product-info">
                                            <div class="product-title">${p.title}</div>
                                            <div class="product-price">¥${p.price}</div>
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                </div>
            `;

            mainContent.querySelectorAll('.tabs .tab').forEach(tab => {
                tab.addEventListener('click', () => {
                    mainContent.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    mainContent.querySelector('#myProducts').classList.toggle('hidden', tab.dataset.tab !== 'myProducts');
                    mainContent.querySelector('#myFavorites').classList.toggle('hidden', tab.dataset.tab !== 'myFavorites');
                });
            });
        } catch (error) {
            mainContent.innerHTML = `<div class="card"><p>加载失败: ${error.message}</p></div>`;
        }
    },
    
    showEditProfile() {
        const modal = document.createElement('div');
        modal.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
                <div class="card" style="width: 100%; max-width: 450px; margin: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>编辑资料</h2>
                        <button onclick="this.closest('div').parentElement.remove()" style="border: none; background: none; font-size: 24px; cursor: pointer;">&times;</button>
                    </div>
                    <div class="form-group">
                        <label class="form-label">昵称</label>
                        <input type="text" class="form-input" id="editNickname" value="${this.currentUser.nickname}">
                    </div>
                    <div class="form-group">
                        <label class="form-label">联系方式</label>
                        <input type="text" class="form-input" id="editContact" value="${this.currentUser.contact || ''}" placeholder="微信号/QQ号">
                    </div>
                    <button class="btn btn-primary" style="width: 100%;" id="saveProfile">保存</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#saveProfile').addEventListener('click', async () => {
            try {
                const user = await API.put('/api/users/profile', {
                    nickname: modal.querySelector('#editNickname').value,
                    contact: modal.querySelector('#editContact').value
                });
                
                this.currentUser = user;
                this.updateNav();
                modal.remove();
                await this.renderProfile();
            } catch (error) {
                alert('保存失败: ' + error.message);
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
