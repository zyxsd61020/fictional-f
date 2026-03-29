const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;

const data = {
  users: [],
  products: [
    {
      id: '1',
      userId: 'demo',
      title: '高等数学同济第七版',
      category: '教材',
      price: 25,
      condition: '九成新',
      description: '考研用过的教材，笔记很详细，适合考研和期末复习',
      images: ['https://picsum.photos/400/300?random=1'],
      transactionMethod: '校内面交',
      contact: 'wx123456',
      status: 'selling',
      viewCount: 128,
      createdAt: Date.now() - 3600000
    },
    {
      id: '2',
      userId: 'demo',
      title: '小米Air2 SE蓝牙耳机',
      category: '数码',
      price: 80,
      condition: '八成新',
      description: '用了半年，音质很好，续航持久',
      images: ['https://picsum.photos/400/300?random=2'],
      transactionMethod: '宿舍自提',
      contact: 'qq654321',
      status: 'selling',
      viewCount: 256,
      createdAt: Date.now() - 7200000
    }
  ],
  favorites: [],
  messages: [],
  reports: [],
  announcements: [
    { id: '1', title: '欢迎使用校园闲置交易平台！', content: '这是一个仅限本校学生使用的闲置交易平台，请大家诚信交易，注意安全！', createdAt: Date.now() },
    { id: '2', title: '毕业季清仓专场', content: '毕业季到了，大家可以把闲置的教材、生活用品发布出来！', createdAt: Date.now() - 86400000 }
  ],
  sessions: {}
};

const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json'
};

const serveStatic = (res, filePath) => {
  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';
  
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('File not found');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
};

const getBody = (req) => {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk.toString());
    req.on('end', () => resolve(body));
  });
};

const jsonResponse = (res, data, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

const checkAuth = (req) => {
  const cookie = req.headers.cookie;
  if (!cookie) return null;
  const sessionId = cookie.split(';').find(c => c.trim().startsWith('sessionId='));
  if (!sessionId) return null;
  const id = sessionId.split('=')[1];
  return data.sessions[id];
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname === '/' || pathname === '/index.html') {
    serveStatic(res, path.join(__dirname, 'index.html'));
    return;
  }
  if (pathname === '/style.css') {
    serveStatic(res, path.join(__dirname, 'style.css'));
    return;
  }
  if (pathname === '/script.js') {
    serveStatic(res, path.join(__dirname, 'script.js'));
    return;
  }

  if (pathname === '/api/auth/register' && req.method === 'POST') {
    const body = JSON.parse(await getBody(req));
    const { studentId, department, enrollmentYear, nickname, password } = body;
    
    if (data.users.find(u => u.studentId === studentId)) {
      jsonResponse(res, { message: '该学号已注册' }, 400);
      return;
    }
    
    const user = {
      id: generateId(),
      studentId,
      department,
      enrollmentYear: parseInt(enrollmentYear),
      nickname,
      password: hashPassword(password),
      contact: ''
    };
    data.users.push(user);
    
    const sessionId = generateId();
    data.sessions[sessionId] = user;
    
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly`);
    jsonResponse(res, {
      token: sessionId,
      user: { ...user, password: undefined }
    });
    return;
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = JSON.parse(await getBody(req));
    const { studentId, password } = body;
    
    const user = data.users.find(u => u.studentId === studentId && u.password === hashPassword(password));
    if (!user) {
      jsonResponse(res, { message: '学号或密码错误' }, 401);
      return;
    }
    
    const sessionId = generateId();
    data.sessions[sessionId] = user;
    
    res.setHeader('Set-Cookie', `sessionId=${sessionId}; Path=/; HttpOnly`);
    jsonResponse(res, {
      token: sessionId,
      user: { ...user, password: undefined }
    });
    return;
  }

  if (pathname === '/api/auth/me' && req.method === 'GET') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    jsonResponse(res, { ...user, password: undefined });
    return;
  }

  if (pathname === '/api/products' && req.method === 'GET') {
    const category = url.searchParams.get('category');
    const condition = url.searchParams.get('condition');
    const keyword = url.searchParams.get('keyword');
    
    let products = data.products.filter(p => p.status === 'selling');
    if (category) products = products.filter(p => p.category === category);
    if (condition) products = products.filter(p => p.condition === condition);
    if (keyword) products = products.filter(p => p.title.toLowerCase().includes(keyword.toLowerCase()));
    
    jsonResponse(res, { products, total: products.length });
    return;
  }

  if (pathname === '/api/products' && req.method === 'POST') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const body = JSON.parse(await getBody(req));
    const product = {
      id: generateId(),
      userId: user.id,
      ...body,
      status: 'selling',
      viewCount: 0,
      createdAt: Date.now()
    };
    data.products.unshift(product);
    jsonResponse(res, product, 201);
    return;
  }

  if (pathname.match(/^\/api\/products\/\w+$/) && req.method === 'GET') {
    const id = pathname.split('/')[3];
    const product = data.products.find(p => p.id === id);
    if (!product) {
      jsonResponse(res, { message: '商品不存在' }, 404);
      return;
    }
    product.viewCount++;
    const seller = data.users.find(u => u.id === product.userId) || { nickname: '用户' };
    jsonResponse(res, { ...product, User: seller });
    return;
  }

  if (pathname.match(/^\/api\/products\/\w+\/status$/) && req.method === 'PUT') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const id = pathname.split('/')[3];
    const product = data.products.find(p => p.id === id);
    if (!product) {
      jsonResponse(res, { message: '商品不存在' }, 404);
      return;
    }
    if (product.userId !== user.id) {
      jsonResponse(res, { message: '无权修改' }, 403);
      return;
    }
    
    const body = JSON.parse(await getBody(req));
    product.status = body.status;
    jsonResponse(res, product);
    return;
  }

  if (pathname.match(/^\/api\/products\/\w+\/favorite$/) && req.method === 'POST') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const productId = pathname.split('/')[3];
    const idx = data.favorites.findIndex(f => f.userId === user.id && f.productId === productId);
    
    if (idx > -1) {
      data.favorites.splice(idx, 1);
      jsonResponse(res, { favorited: false });
    } else {
      data.favorites.push({ id: generateId(), userId: user.id, productId, createdAt: Date.now() });
      jsonResponse(res, { favorited: true });
    }
    return;
  }

  if (pathname.match(/^\/api\/products\/\w+\/messages$/) && req.method === 'GET') {
    const productId = pathname.split('/')[3];
    const messages = data.messages
      .filter(m => m.productId === productId)
      .map(m => ({
        ...m,
        User: data.users.find(u => u.id === m.userId) || { nickname: '用户' }
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    jsonResponse(res, messages);
    return;
  }

  if (pathname.match(/^\/api\/products\/\w+\/messages$/) && req.method === 'POST') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const productId = pathname.split('/')[3];
    const body = JSON.parse(await getBody(req));
    const message = {
      id: generateId(),
      productId,
      userId: user.id,
      content: body.content,
      createdAt: Date.now()
    };
    data.messages.push(message);
    jsonResponse(res, { ...message, User: user }, 201);
    return;
  }

  if (pathname === '/api/users/products' && req.method === 'GET') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const products = data.products.filter(p => p.userId === user.id).sort((a, b) => b.createdAt - a.createdAt);
    jsonResponse(res, products);
    return;
  }

  if (pathname === '/api/users/favorites' && req.method === 'GET') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const favorites = data.favorites
      .filter(f => f.userId === user.id)
      .map(f => data.products.find(p => p.id === f.productId))
      .filter(Boolean);
    jsonResponse(res, favorites);
    return;
  }

  if (pathname === '/api/users/profile' && req.method === 'PUT') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    
    const body = JSON.parse(await getBody(req));
    const dbUser = data.users.find(u => u.id === user.id);
    if (dbUser) {
      dbUser.nickname = body.nickname;
      dbUser.contact = body.contact;
      for (const sid in data.sessions) {
        if (data.sessions[sid].id === user.id) {
          data.sessions[sid] = dbUser;
        }
      }
    }
    jsonResponse(res, { ...dbUser, password: undefined });
    return;
  }

  if (pathname === '/api/announcements' && req.method === 'GET') {
    jsonResponse(res, data.announcements);
    return;
  }

  if (pathname === '/api/upload' && req.method === 'POST') {
    const user = checkAuth(req);
    if (!user) {
      jsonResponse(res, { message: '未登录' }, 401);
      return;
    }
    jsonResponse(res, { urls: [] });
    return;
  }

  jsonResponse(res, { message: 'Not Found' }, 404);
});

server.listen(PORT, () => {
  console.log(`🎓 校园闲置交易平台已启动！`);
  console.log(`📡 访问地址: http://localhost:${PORT}`);
  console.log(`✅ 服务器运行中...`);
});
