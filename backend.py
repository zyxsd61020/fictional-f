from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import sqlite3
import hashlib
import json
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

DATABASE = 'campus_market.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    
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
    
    c.execute('''
        CREATE TABLE IF NOT EXISTS announcements (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT
        )
    ''')
    
    c.execute('SELECT COUNT(*) FROM announcements')
    if c.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        import uuid
        c.execute('INSERT INTO announcements VALUES (?, ?, ?, ?)', 
                  (str(uuid.uuid4()), '欢迎使用校园闲置交易平台！', '这是一个仅限本校学生使用的闲置交易平台，请大家诚信交易，注意安全！', now))
        c.execute('INSERT INTO announcements VALUES (?, ?, ?, ?)', 
                  (str(uuid.uuid4()), '毕业季清仓专场', '毕业季到了，大家可以把闲置的教材、生活用品发布出来！', now))
    
    c.execute('SELECT COUNT(*) FROM products')
    if c.fetchone()[0] == 0:
        import uuid
        now = datetime.now().isoformat()
        demo_user_id = str(uuid.uuid4())
        c.execute('INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                  (demo_user_id, 'demo', '计算机学院', 2022, 'demo', hashlib.sha256('demo123'.encode()).hexdigest(), '', now))
        
        products = [
            ('高等数学同济第七版', '教材', 25, '九成新', '考研用过的教材，笔记很详细，适合考研和期末复习', 
             json.dumps(['https://picsum.photos/400/300?random=1']), '校内面交', 'wx123456', 128),
            ('小米Air2 SE蓝牙耳机', '数码', 80, '八成新', '用了半年，音质很好，续航持久',
             json.dumps(['https://picsum.photos/400/300?random=2']), '宿舍自提', 'qq654321', 256),
            ('宿舍折叠椅', '宿舍', 45, '全新', '毕业清仓，买回来没用过，超舒服的椅子',
             json.dumps(['https://picsum.photos/400/300?random=3']), '指定地点', 'wx789012', 89)
        ]
        
        for p in products:
            c.execute('INSERT INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      (str(uuid.uuid4()), demo_user_id, p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], 'selling', p[8], now))
    
    conn.commit()
    conn.close()

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('.', path)

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    import uuid
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
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE id = ?', (token,))
    user = c.fetchone()
    conn.close()
    
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

@app.route('/api/products', methods=['GET'])
def get_products():
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
        products.append(product)
    
    conn.close()
    return jsonify({'products': products, 'total': len(products)})

@app.route('/api/products', methods=['POST'])
def create_product():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = request.json
    import uuid
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
    
    return jsonify({'id': product_id, **data}), 201

@app.route('/api/products/<product_id>', methods=['GET'])
def get_product(product_id):
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
    
    conn.close()
    return jsonify(product)

@app.route('/api/products/<product_id>/status', methods=['PUT'])
def update_product_status(product_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
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
    
    return jsonify({'status': data['status']})

@app.route('/api/products/<product_id>/favorite', methods=['POST'])
def toggle_favorite(product_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    import uuid
    
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
    data = request.json
    import uuid
    
    conn = get_db()
    c = conn.cursor()
    msg_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    
    c.execute('INSERT INTO messages VALUES (?, ?, ?, ?, ?)',
              (msg_id, product_id, token, data['content'], now))
    conn.commit()
    
    c.execute('SELECT m.*, u.nickname FROM messages m LEFT JOIN users u ON m.user_id = u.id WHERE m.id = ?', (msg_id,))
    msg = dict(c.fetchone())
    msg['User'] = {'nickname': msg['nickname']}
    conn.close()
    
    return jsonify(msg), 201

@app.route('/api/users/products', methods=['GET'])
def get_user_products():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC', (token,))
    products = []
    for row in c.fetchall():
        product = dict(row)
        product['images'] = json.loads(product['images']) if product['images'] else []
        product['viewCount'] = product['view_count']
        products.append(product)
    conn.close()
    return jsonify(products)

@app.route('/api/users/favorites', methods=['GET'])
def get_user_favorites():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
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
        products.append(product)
    conn.close()
    return jsonify(products)

@app.route('/api/users/profile', methods=['PUT'])
def update_profile():
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    data = request.json
    
    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET nickname = ?, contact = ? WHERE id = ?',
              (data['nickname'], data.get('contact', ''), token))
    conn.commit()
    
    c.execute('SELECT * FROM users WHERE id = ?', (token,))
    user = c.fetchone()
    conn.close()
    
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
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT * FROM announcements ORDER BY created_at DESC')
    announcements = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify(announcements)

@app.route('/api/upload', methods=['POST'])
def upload():
    return jsonify({'urls': []})

if __name__ == '__main__':
    init_db()
    print('🚀 校园闲置交易平台后端启动中...')
    print('📡 访问地址: http://localhost:3000')
    app.run(host='0.0.0.0', port=3000, debug=False)
