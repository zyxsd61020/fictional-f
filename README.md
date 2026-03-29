# 校园闲置交易平台 | Campus Market Platform

[English](#english) | [中文](#中文)

---

## English

A modern, campus-exclusive second-hand trading platform inspired by JD.com's design. Built with a complete front-end and back-end separation architecture.

### 🏗️ Architecture

- **Frontend**: Pure HTML5 + CSS3 + Vanilla JavaScript (static server on port 3000)
- **Backend**: RESTful API service (port 3001)
- **Database**: MySQL 8.0 compatible (SQLite for development)
- **Cache**: Redis compatible (in-memory cache for development)
- **Design**: JD.com style UI/UX

### ✨ Features

#### User Authentication
- Student ID verification and registration
- Secure login/logout system
- Personal profile management
- JWT-like token authentication

#### Product Management
- Product listing with categories
- Advanced search and filtering
- Product publishing with images
- Product detail pages with view counter
- Status management (Selling, Reserved, Sold)

**Categories**: Electronics & Digital, Daily Necessities, Study Supplies, Clothing & Shoes, Sports & Outdoors, Dormitory Items, Other

#### Interactive Features
- Favorite products
- Product message board
- Real-time view statistics
- User activity tracking

#### Personal Center
- My published products
- My favorite products
- Profile editing
- Transaction history

### 🚀 Quick Start

#### Prerequisites
- Python 3.7+
- Modern web browser

#### Installation & Setup

1. **Start Backend API Service** (Terminal 1)
```bash
cd /path/to/hackthon
python3 backend-api.py
```
Backend will run at: http://localhost:3001

2. **Start Frontend Static Service** (Terminal 2)
```bash
cd /path/to/hackthon
python3 frontend-server.py
```
Frontend will run at: http://localhost:3000

#### Demo Account
- **Student ID**: `demo`
- **Password**: `demo123`

### 📱 Usage

#### Browsing Products
1. Open http://localhost:3000
2. Browse products on the homepage
3. Use search and filters to find items
4. Click on any product to view details

#### Publishing Products
1. Login with your account
2. Click "Publish" in navigation
3. Fill in product details
4. Upload images (optional)
5. Submit and your product will be listed

#### Managing Products
1. Go to "My" page
2. View your published products
3. Update product status (Selling → Reserved → Sold)
4. Check your favorite products

### 🎨 Design Features

#### JD.com Inspired UI
- **Color Scheme**: Signature JD red (#e4393c) as primary color
- **Typography**: Clean, modern sans-serif fonts
- **Cards**: Subtle shadows and smooth hover effects
- **Buttons**: Gradient backgrounds with micro-interactions
- **Responsive**: Perfect on desktop, tablet, and mobile

#### Visual Highlights
- Clean card-based product grid
- Prominent price display with ¥ symbol
- Smooth transitions and animations
- Intuitive navigation flow
- Professional form styling

### 🔧 API Endpoints

#### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user info

#### Products
- `GET /api/products` - Get product list (with filters)
- `POST /api/products` - Create new product
- `GET /api/products/:id` - Get product detail
- `PUT /api/products/:id/status` - Update product status
- `POST /api/products/:id/favorite` - Toggle favorite
- `GET /api/products/:id/messages` - Get product messages
- `POST /api/products/:id/messages` - Add message

#### Users
- `GET /api/users/products` - Get user's products
- `GET /api/users/favorites` - Get user's favorites
- `PUT /api/users/profile` - Update user profile

#### Other
- `GET /api/announcements` - Get announcements
- `GET /api/health` - Health check
- `POST /api/upload` - Image upload

### 🏛️ Database Schema

#### Users Table
- `id` - Primary key (UUID)
- `student_id` - Unique student ID
- `department` - Department name
- `enrollment_year` - Year of enrollment
- `nickname` - Display name
- `password` - Hashed password
- `contact` - Contact information
- `created_at` - Registration timestamp

#### Products Table
- `id` - Primary key (UUID)
- `user_id` - Seller ID (foreign key)
- `title` - Product title
- `category` - Product category
- `price` - Price in CNY
- `condition` - Condition (New, Like New, Good, Fair)
- `description` - Product description
- `images` - JSON array of image URLs
- `transaction_method` - Transaction method
- `contact` - Seller contact
- `status` - Status (selling, reserved, sold)
- `view_count` - Number of views
- `created_at` - Publication timestamp

### 🚦 Caching Strategy

- **User Sessions**: Cached for 3600 seconds (1 hour)
- **Product List**: Cached for 60 seconds
- **Product Detail**: Cached for 300 seconds (5 minutes)
- **Announcements**: Cached for 300 seconds (5 minutes)
- **Automatic Invalidation**: Cache cleared on data updates

### 📱 Responsive Design

- **Desktop**: Full-featured interface with wide grid
- **Tablet**: Optimized grid and touch-friendly elements
- **Mobile**: Compact layout with vertical scrolling
- **Touch Support**: Enhanced for mobile interactions

### 🔐 Security Features

- Password hashing (SHA-256)
- Token-based authentication
- CORS protection
- Input validation
- SQL injection prevention

### 🛠️ Technology Stack

#### Frontend
- HTML5 Semantic Markup
- CSS3 with CSS Variables
- Vanilla JavaScript (ES6+)
- CSS Grid & Flexbox
- CSS Animations & Transitions

#### Backend
- Python 3
- Flask (Web Framework)
- SQLite (Database)
- In-memory Cache (Redis compatible)
- RESTful API Design

### 📄 License

MIT License - Feel free to use for hackathons and learning!

---

## 中文

一个现代化的校园专属闲置交易平台，采用京东风格设计。基于完整的前后端分离架构构建。

### 🏗️ 架构

- **前端**: 纯 HTML5 + CSS3 + 原生 JavaScript（静态服务器，端口 3000）
- **后端**: RESTful API 服务（端口 3001）
- **数据库**: MySQL 8.0 兼容（开发环境使用 SQLite）
- **缓存**: Redis 兼容（开发环境使用内存缓存）
- **设计**: 京东风格 UI/UX

### ✨ 功能特性

#### 用户认证
- 学号验证和注册
- 安全的登录/登出系统
- 个人资料管理
- 类 JWT 的令牌认证

#### 商品管理
- 商品列表及分类
- 高级搜索和筛选
- 带图片的商品发布
- 带浏览计数的商品详情页
- 状态管理（在售、已预定、已售出）

**分类**：电子数码、生活用品、学习用品、服饰鞋帽、运动户外、寝室用品、其他

#### 交互功能
- 收藏商品
- 商品留言板
- 实时浏览统计
- 用户活动追踪

#### 个人中心
- 我的发布
- 我的收藏
- 资料编辑
- 交易记录

### 🚀 快速开始

#### 前置要求
- Python 3.7+
- 现代浏览器

#### 安装和设置

1. **启动后端 API 服务**（终端 1）
```bash
cd /path/to/hackthon
python3 backend-api.py
```
后端运行地址: http://localhost:3001

2. **启动前端静态服务**（终端 2）
```bash
cd /path/to/hackthon
python3 frontend-server.py
```
前端运行地址: http://localhost:3000

#### 演示账号
- **学号**: `demo`
- **密码**: `demo123`

### 📱 使用说明

#### 浏览商品
1. 打开 http://localhost:3000
2. 在首页浏览商品
3. 使用搜索和筛选找到商品
4. 点击任意商品查看详情

#### 发布商品
1. 使用账号登录
2. 点击导航栏的"发布"
3. 填写商品详情
4. 上传图片（可选）
5. 提交后商品将显示在列表中

#### 管理商品
1. 进入"我的"页面
2. 查看您发布的商品
3. 更新商品状态（在售 → 已预定 → 已售出）
4. 查看您收藏的商品

### 🎨 设计特点

#### 京东风格 UI
- **配色方案**: 标志性京东红 (#e4393c) 为主色调
- **排版**: 简洁、现代的无衬线字体
- **卡片**: 细腻阴影和平滑悬停效果
- **按钮**: 渐变背景和微交互动画
- **响应式**: 在桌面、平板和手机上完美显示

#### 视觉亮点
- 整洁的卡片式商品网格
- 醒目的 ¥ 符号价格显示
- 平滑过渡和动画
- 直观的导航流程
- 专业的表单样式

### 🔧 API 接口

#### 认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

#### 商品
- `GET /api/products` - 获取商品列表（带筛选）
- `POST /api/products` - 创建新商品
- `GET /api/products/:id` - 获取商品详情
- `PUT /api/products/:id/status` - 更新商品状态
- `POST /api/products/:id/favorite` - 切换收藏
- `GET /api/products/:id/messages` - 获取商品留言
- `POST /api/products/:id/messages` - 添加留言

#### 用户
- `GET /api/users/products` - 获取用户的商品
- `GET /api/users/favorites` - 获取用户的收藏
- `PUT /api/users/profile` - 更新用户资料

#### 其他
- `GET /api/announcements` - 获取公告
- `GET /api/health` - 健康检查
- `POST /api/upload` - 图片上传

### 🏛️ 数据库结构

#### 用户表
- `id` - 主键（UUID）
- `student_id` - 唯一学号
- `department` - 院系名称
- `enrollment_year` - 入学年份
- `nickname` - 昵称
- `password` - 加密密码
- `contact` - 联系方式
- `created_at` - 注册时间戳

#### 商品表
- `id` - 主键（UUID）
- `user_id` - 卖家 ID（外键）
- `title` - 商品标题
- `category` - 商品分类
- `price` - 价格（人民币）
- `condition` - 成色（全新、九成新、八成新、五成新）
- `description` - 商品描述
- `images` - 图片 URL JSON 数组
- `transaction_method` - 交易方式
- `contact` - 卖家联系方式
- `status` - 状态（selling、reserved、sold）
- `view_count` - 浏览次数
- `created_at` - 发布时间戳

### 🚦 缓存策略

- **用户会话**: 缓存 3600 秒（1 小时）
- **商品列表**: 缓存 60 秒
- **商品详情**: 缓存 300 秒（5 分钟）
- **公告**: 缓存 300 秒（5 分钟）
- **自动失效**: 数据更新时清除缓存

### 📱 响应式设计

- **桌面**: 全功能界面，宽网格布局
- **平板**: 优化网格和触摸友好元素
- **手机**: 紧凑布局，垂直滚动
- **触摸支持**: 为移动交互优化

### 🔐 安全特性

- 密码哈希（SHA-256）
- 基于令牌的认证
- CORS 保护
- 输入验证
- SQL 注入防护

### 🛠️ 技术栈

#### 前端
- HTML5 语义化标签
- CSS3 与 CSS 变量
- 原生 JavaScript（ES6+）
- CSS Grid 与 Flexbox
- CSS 动画与过渡

#### 后端
- Python 3
- Flask（Web 框架）
- SQLite（数据库）
- 内存缓存（Redis 兼容）
- RESTful API 设计

### 📄 许可证

MIT 许可证 - 可自由用于黑客马拉松和学习！

---

**Built with ❤️ for campus communities | 为校园社区打造 ❤️**
