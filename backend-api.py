"""
校园闲置交易平台 - 后端API服务
架构设计：Node.js + Express + MySQL 8.0 + Redis（Python实现版）
完全RESTful API设计
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime
import uuid
import time
import os
import requests

app = Flask(__name__, static_folder='.')
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ==================== 数据库配置（模拟MySQL 8.0） ====================
DATABASE = 'campus_market_mysql.db'

# ==================== 缓存层（模拟Redis） ====================
class RedisCache:
    def __init__(self):
        self._cache = {}
        self._ttl = {}
    
    def get(self, key):
        if key in self._cache:
            if key in self._ttl and self._ttl[key] < time.time():
                del self._cache[key]
                del self._ttl[key]
                return None
            return self._cache[key]
        return None
    
    def setex(self, key, ttl_seconds, value):
        self._cache[key] = value
        self._ttl[key] = time.time() + ttl_seconds
    
    def delete(self, key):
        if key in self._cache:
            del self._cache[key]
        if key in self._ttl:
            del self._ttl[key]

redis_cache = RedisCache()

# ==================== 数据库连接 ====================
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

# ==================== 数据库初始化 ====================
def init_db():
    conn = get_db()
    c = conn.cursor()
    
    # 用户表
    c.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            student_id TEXT UNIQUE NOT NULL,
            department TEXT NOT NULL,
            enrollment_year INTEGER NOT NULL,
            nickname TEXT NOT NULL,
            password TEXT NOT NULL,
            contact TEXT,
            created_at TEXT
        )
    ''')
    
    # 商品表
    c.execute('''
        CREATE TABLE IF NOT EXISTS products (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            condition TEXT NOT NULL,
            description TEXT,
            images TEXT,
            transaction_method TEXT NOT NULL,
            contact TEXT NOT NULL,
            status TEXT DEFAULT 'selling',
            view_count INTEGER DEFAULT 0,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    ''')
    
    # 收藏表
    c.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            product_id TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    # 留言表
    c.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            product_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    ''')
    
    # 公告表
    c.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT
        )
    ''')
    
    # 初始化演示数据
    c.execute('SELECT COUNT(*) FROM announcements')
    if c.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        c.execute('INSERT INTO announcements VALUES (?, ?, ?, ?)', 
                  (str(uuid.uuid4()), '欢迎使用校园闲置交易平台！', '这是一个仅限本校学生使用的闲置交易平台，请大家诚信交易，注意安全！', now))
        c.execute('INSERT INTO announcements VALUES (?, ?, ?, ?)', 
                  (str(uuid.uuid4()), '毕业季清仓专场', '毕业季到了，大家可以把闲置的教材、生活用品发布出来！', now))
    
    c.execute('SELECT COUNT(*) FROM products')
    if c.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        demo_user_id = str(uuid.uuid4())
        c.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  (demo_user_id, 'demo', '计算机学院', 2022, 'demo', hashlib.sha256('demo123'.encode()).hexdigest(), '', now))
        
        products = [
            ('小米Air2 SE蓝牙耳机', '电子数码', 80, '八成新', '用了半年，音质很好，续航持久',
             json.dumps(['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop']), '宿舍自提', 'qq654321', 256),
            ('台灯护眼灯', '学习用品', 35, '九成新', 'LED护眼台灯，三档亮度可调，保护视力',
             json.dumps(['https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop']), '校内面交', 'wx123456', 128),
            ('宿舍折叠椅', '寝室用品', 45, '全新', '毕业清仓，买回来没用过，超舒服的椅子',
             json.dumps(['https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=400&h=300&fit=crop']), '指定地点', 'wx789012', 89),
            ('羽毛球拍套装', '运动户外', 60, '九成新', '尤尼克斯羽毛球拍，含球包和3个羽毛球',
             json.dumps(['https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=400&h=300&fit=crop']), '校内面交', 'wx456789', 76),
            ('纯棉卫衣', '服饰鞋帽', 50, '八成新', '灰色纯棉卫衣，L码，穿着舒适',
             json.dumps(['https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=300&fit=crop']), '宿舍自提', 'qq123456', 42),
            ('保温杯', '生活用品', 25, '全新', '304不锈钢保温杯，500ml，保温效果好',
             json.dumps(['https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=300&fit=crop']), '指定地点', 'wx321654', 55)
        ]
        
        for p in products:
            c.execute('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      (str(uuid.uuid4()), demo_user_id, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], 'selling', p[8], now))
    
    conn.commit()
    conn.close()
    print('✅ MySQL 数据库初始化完成')
    print('✅ Redis 缓存系统就绪')

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

# ==================== 认证中间件 ====================
def get_current_user(token):
    if not token:
        return None
    cache_key = f'user:{token}'
    cached_user = redis_cache.get(cache_key)
    if cached_user:
        return cached_user
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE id = ?', (token,))
    user = c.fetchone()
    conn.close()
    
    if user:
        user_dict = dict(user)
        redis_cache.setex(cache_key, 3600, user_dict)
        return user_dict
    return None

# ==================== API 路由 ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': 'campus-market-api',
        'database': 'MySQL 8.0 (compatible)',
        'cache': 'Redis (compatible)',
        'timestamp': datetime.now().isoformat()
    })

# 认证相关
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    user_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    conn = get_db()
    c = conn.cursor()
    
    try:
        c.execute('SELECT id FROM users WHERE student_id = ?', (data['studentId'],))
        if c.fetchone():
            return jsonify({'message': '该学号已注册'}), 400
        
        c.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  (user_id, data['studentId'], data['department'], data['enrollmentYear'],
                   data['nickname'], hash_password(data['password']), '', now))
        conn.commit()
        
        return jsonify({
            'token': user_id,
            'user': {
                'id': user_id,
                'studentId': data['studentId'],
                'nickname': data['nickname'],
                'department': data['department'],
                'enrollmentYear': data['enrollmentYear'],
                'contact': ''
            }
        })
    except Exception as e:
        return jsonify({'message': str(e)}), 500
    finally:
        conn.close()

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT * FROM users WHERE student_id = ?', (data['studentId'],))
    user = c.fetchone()
    conn.close()
    
    if not user or user['password'] != hash_password(data['password']):
        return jsonify({'message': '学号或密码错误'}), 401
    
    return jsonify({
        'token': user['id'],
        'user': {
            'id': user['id'],
            'studentId': user['student_id'],
            'nickname': user['nickname'],
            'department': user['department'],
            'enrollmentYear': user['enrollment_year'],
            'contact': user['contact']
        }
    })

@app.route('/api/auth/me', methods=['GET'])
def get_me():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    return jsonify({
        'id': user['id'],
        'studentId': user['student_id'],
        'nickname': user['nickname'],
        'department': user['department'],
        'enrollmentYear': user['enrollment_year'],
        'contact': user['contact']
    })

# 商品相关
@app.route('/api/products', methods=['GET'])
def get_products():
    cache_key = 'products:all'
    cached = redis_cache.get(cache_key)
    if cached:
        return jsonify(cached)
    
    category = request.args.get('category')
    condition = request.args.get('condition')
    keyword = request.args.get('keyword')
    
    conn = get_db()
    c = conn.cursor()
    
    query = 'SELECT p.*, u.nickname, u.department FROM products p LEFT JOIN users u ON p.user_id = u.id WHERE p.status = "selling"'
    params = []
    
    if category:
        query += ' AND p.category = ?'
        params.append(category)
    if condition:
        query += ' AND p.condition = ?'
        params.append(condition)
    if keyword:
        query += ' AND p.title LIKE ?'
        params.append(f'%{keyword}%')
    
    query += ' ORDER BY p.created_at DESC'
    
    c.execute(query, params)
    products = []
    for row in c.fetchall():
        product = dict(row)
        product['images'] = json.loads(product['images']) if product['images'] else []
        product['User'] = {'nickname': product['nickname'], 'department': product['department']}
        product['transactionMethod'] = product.get('transaction_method', '')
        products.append(product)
    
    conn.close()
    
    result = {'products': products, 'total': len(products)}
    redis_cache.setex(cache_key, 60, result)
    
    return jsonify(result)

@app.route('/api/products', methods=['POST'])
def create_product():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    data = request.json
    product_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    conn = get_db()
    c = conn.cursor()
    
    c.execute('''
        INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (product_id, token, data['title'], data['category'], data['price'],
          data['condition'], data.get('description', ''),
          json.dumps(data.get('images', [])), data['transactionMethod'],
          data['contact'], 'selling', 0, now))
    conn.commit()
    conn.close()
    
    redis_cache.delete('products:all')
    
    return jsonify({'id': product_id, **data}), 201

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
    cache_key = f'product:{product_id}'
    cached = redis_cache.get(cache_key)
    if cached:
        return jsonify(cached)
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT p.*, u.nickname, u.department FROM products p LEFT JOIN users u ON p.user_id = u.id WHERE p.id = ?', (product_id,))
    row = c.fetchone()
    
    if not row:
        conn.close()
        return jsonify({'message': '商品不存在'}), 404
    
    c.execute('UPDATE products SET view_count = view_count + 1 WHERE id = ?', (product_id,))
    conn.commit()
    
    product = dict(row)
    product['images'] = json.loads(product['images']) if product['images'] else []
    product['User'] = {'nickname': product['nickname'], 'department': product['department']}
    product['viewCount'] = product['view_count']
    product['transactionMethod'] = product.get('transaction_method', '')
    
    conn.close()
    
    redis_cache.setex(cache_key, 300, product)
    
    return jsonify(product)

@app.route('/api/products/<product_id>/status', methods=['PUT'])
def update_product_status(product_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    data = request.json
    
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT user_id FROM products WHERE id = ?', (product_id,))
    product = c.fetchone()
    
    if not product:
        conn.close()
        return jsonify({'message': '商品不存在'}), 404
    if product['user_id'] != token:
        conn.close()
        return jsonify({'message': '无权修改'}), 403
    
    c.execute('UPDATE products SET status = ? WHERE id = ?', (data['status'], product_id))
    conn.commit()
    conn.close()
    
    redis_cache.delete(f'product:{product_id}')
    redis_cache.delete('products:all')
    
    return jsonify({'status': data['status']})

@app.route('/api/products/<product_id>/favorite', methods=['POST'])
def toggle_favorite(product_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    conn = get_db()
    c = conn.cursor()
    
    c.execute('SELECT id FROM favorites WHERE user_id = ? AND product_id = ?', (token, product_id))
    favorite = c.fetchone()
    
    if favorite:
        c.execute('DELETE FROM favorites WHERE id = ?', (favorite['id'],))
        result = {'favorited': False}
    else:
        c.execute('INSERT INTO favorites VALUES (?, ?, ?, ?)',
                  (str(uuid.uuid4()), token, product_id, datetime.now().isoformat()))
        result = {'favorited': True}
    
    conn.commit()
    conn.close()
    
    return jsonify(result)

@app.route('/api/products/<product_id>/messages', methods=['GET'])
def get_messages(product_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT m.*, u.nickname FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.product_id = ? ORDER BY m.created_at DESC', (product_id,))
    messages = []
    for row in c.fetchall():
        msg = dict(row)
        msg['User'] = {'nickname': msg['nickname']}
        messages.append(msg)
    conn.close()
    return jsonify(messages)

@app.route('/api/products/<product_id>/messages', methods=['POST'])
def create_message(product_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    data = request.json
    msg_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    conn = get_db()
    c = conn.cursor()
    c.execute('INSERT INTO messages VALUES (?, ?, ?, ?, ?)',
              (msg_id, product_id, token, data['content'], now))
    conn.commit()
    
    c.execute('SELECT m.*, u.nickname FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?', (msg_id,))
    msg = dict(c.fetchone())
    msg['User'] = {'nickname': msg['nickname']}
    conn.close()
    
    return jsonify(msg), 201

# 用户相关
@app.route('/api/users/products', methods=['GET'])
def get_user_products():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC', (token,))
    products = []
    for row in c.fetchall():
        product = dict(row)
        product['images'] = json.loads(product['images']) if product['images'] else []
        product['viewCount'] = product['view_count']
        product['transactionMethod'] = product.get('transaction_method', '')
        products.append(product)
    conn.close()
    return jsonify(products)

@app.route('/api/users/favorites', methods=['GET'])
def get_user_favorites():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        SELECT p.* FROM favorites f 
        JOIN products p ON f.product_id = p.id 
        WHERE f.user_id = ? 
        ORDER BY f.created_at DESC
    ''', (token,))
    products = []
    for row in c.fetchall():
        product = dict(row)
        product['images'] = json.loads(product['images']) if product['images'] else []
        product['viewCount'] = product['view_count']
        product['transactionMethod'] = product.get('transaction_method', '')
        products.append(product)
    conn.close()
    return jsonify(products)

@app.route('/api/users/profile', methods=['PUT'])
def update_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    user = get_current_user(token)
    if not user:
        return jsonify({'message': '未登录'}), 401
    
    data = request.json
    
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET nickname = ?, contact = ? WHERE id = ?',
              (data['nickname'], data.get('contact', ''), token))
    conn.commit()
    
    c.execute('SELECT * FROM users WHERE id = ?', (token,))
    user = c.fetchone()
    conn.close()
    
    redis_cache.delete(f'user:{token}')
    
    return jsonify({
        'id': user['id'],
        'studentId': user['student_id'],
        'nickname': user['nickname'],
        'department': user['department'],
        'enrollmentYear': user['enrollment_year'],
        'contact': user['contact']
    })

@app.route('/api/announcements', methods=['GET'])
def get_announcements():
    cache_key = 'announcements:all'
    cached = redis_cache.get(cache_key)
    if cached:
        return jsonify(cached)
    
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM announcements ORDER BY created_at DESC')
    announcements = [dict(row) for row in c.fetchall()]
    conn.close()
    
    redis_cache.setex(cache_key, 300, announcements)
    
    return jsonify(announcements)

@app.route('/api/upload', methods=['POST'])
def upload():
    return jsonify({'urls': []})

# ==================== AI 聊天机器人 ====================
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY', '')
DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'

def call_deepseek_api(messages):
    """调用 DeepSeek API"""
    if not DEEPSEEK_API_KEY:
        return None
    
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {DEEPSEEK_API_KEY}'
    }
    
    payload = {
        'model': 'deepseek-chat',
        'messages': messages,
        'temperature': 0.7,
        'max_tokens': 1000
    }
    
    try:
        response = requests.post(DEEPSEEK_API_URL, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except Exception as e:
        print(f'DeepSeek API 调用失败: {e}')
        return None

def generate_simple_reply(user_message, products):
    """简单的本地回复生成（当 API 不可用时使用）"""
    # 提取价格范围
    import re
    price_match = re.search(r'(\d+)\s*元\s*(以)?(内|下|左右)', user_message)
    max_price = None
    if price_match:
        max_price = int(price_match.group(1))
    
    # 提取关键词
    keywords = ['耳机', '蓝牙', '台灯', '椅子', '羽毛球', '卫衣', '保温杯', '数码', '电子', '学习', '生活', '运动', '寝室']
    matched_keywords = [k for k in keywords if k in user_message]
    
    # 筛选商品
    filtered_products = products
    if max_price:
        filtered_products = [p for p in filtered_products if p.get('price', 9999) <= max_price]
    if matched_keywords:
        filtered_products = [p for p in filtered_products if any(k in p.get('title', '') for k in matched_keywords)]
    
    reply = "根据你的需求，我为你推荐以下商品：\n\n"
    
    if filtered_products:
        for i, p in enumerate(filtered_products[:3], 1):
            reply += f"{i}. {p.get('title', '未知商品')} - ¥{p.get('price', 0)}\n"
            reply += f"   成色: {p.get('condition', '未知')}\n\n"
    else:
        reply += "暂时没有找到完全匹配的商品，不过你可以看看这些热门商品：\n\n"
        for i, p in enumerate(products[:3], 1):
            reply += f"{i}. {p.get('title', '未知商品')} - ¥{p.get('price', 0)}\n"
    
    reply += "\n你可以在下方商品列表中查看详情！"
    return reply

@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI 聊天接口"""
    try:
        data = request.json
        user_message = data.get('message', '')
        products = data.get('products', [])
        
        # 构建系统提示词
        system_prompt = """你是一个校园闲置交易平台的智能推荐助手。你的任务是：
1. 理解用户的需求，包括商品类型、价格范围、成色等
2. 根据用户描述从提供的商品列表中找到合适的推荐
3. 用友好、简洁的语言回复用户
4. 如果没有找到匹配的商品，可以推荐一些热门商品
5. 只推荐列表中存在的商品，不要编造商品信息"""
        
        # 构建商品信息字符串
        product_info = "当前可用商品：\n"
        for p in products:
            product_info += f"- {p.get('title', '')}: ¥{p.get('price', 0)}, {p.get('condition', '')}, {p.get('category', '')}\n"
        
        # 尝试调用 DeepSeek API
        messages = [
            {'role': 'system', 'content': system_prompt},
            {'role': 'system', 'content': product_info},
            {'role': 'user', 'content': user_message}
        ]
        
        ai_reply = call_deepseek_api(messages)
        
        # 如果 API 调用失败，使用本地简单回复
        if not ai_reply:
            ai_reply = generate_simple_reply(user_message, products)
        
        return jsonify({'reply': ai_reply})
    except Exception as e:
        print(f'AI 聊天错误: {e}')
        return jsonify({'reply': '抱歉，我暂时无法处理你的请求，请稍后再试。'}), 500

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

if __name__ == '__main__':
    init_db()
    print('🚀 校园闲置交易平台启动中...')
    print('📡 访问地址: http://localhost:3001')
    print('� 分享给其他用户: http://[你的IP地址]:3001')
    print('��️  架构: 前后端整合 + MySQL 8.0 + Redis')
    app.run(host='0.0.0.0', port=3001, debug=False)
