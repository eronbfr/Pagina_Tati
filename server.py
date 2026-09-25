"""
Tati Portela Fitness - Backend Server
Armazena os dados dos alunos cadastrados em arquivo JSON no servidor.
"""

import json
import os
import shutil
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
USERS_FILE = os.path.join(DATA_DIR, 'usuarios.json')
BACKUP_DIR = os.path.join(DATA_DIR, 'backups')


def ensure_data_dir():
    """Cria os diretórios de dados se não existirem."""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(BACKUP_DIR, exist_ok=True)
    if not os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'w', encoding='utf-8') as f:
            json.dump({}, f)


def load_users():
    """Carrega os usuários do arquivo JSON."""
    ensure_data_dir()
    try:
        with open(USERS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return {}


def save_users(users):
    """Salva os usuários no arquivo JSON com backup automático."""
    ensure_data_dir()
    # Cria backup antes de salvar
    if os.path.exists(USERS_FILE):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_file = os.path.join(BACKUP_DIR, f'usuarios_backup_{timestamp}.json')
        shutil.copy2(USERS_FILE, backup_file)
        # Mantém apenas os últimos 10 backups
        backups = sorted(
            [f for f in os.listdir(BACKUP_DIR) if f.startswith('usuarios_backup_')],
            reverse=True
        )
        for old_backup in backups[10:]:
            os.remove(os.path.join(BACKUP_DIR, old_backup))

    with open(USERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(users, f, ensure_ascii=False, indent=2)


# ==========================================
# ROTAS DA API
# ==========================================

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)


@app.route('/api/users', methods=['GET'])
def get_users():
    """Retorna todos os usuários cadastrados."""
    users = load_users()
    return jsonify(users)


@app.route('/api/users/<email>', methods=['GET'])
def get_user(email):
    """Retorna um usuário específico pelo email."""
    users = load_users()
    user = users.get(email)
    if not user:
        return jsonify({'error': 'Usuário não encontrado'}), 404
    return jsonify(user)


@app.route('/api/users/<email>', methods=['PUT'])
def save_user(email):
    """Cria ou atualiza um usuário."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400

    users = load_users()
    users[email] = data
    save_users(users)
    return jsonify({'success': True, 'message': 'Usuário salvo com sucesso'})


@app.route('/api/users/<email>', methods=['DELETE'])
def delete_user(email):
    """Remove um usuário."""
    users = load_users()
    if email not in users:
        return jsonify({'error': 'Usuário não encontrado'}), 404

    del users[email]
    save_users(users)
    return jsonify({'success': True, 'message': 'Usuário removido'})


@app.route('/api/users/bulk', methods=['PUT'])
def save_all_users():
    """Salva todos os usuários de uma vez (sincronização completa)."""
    data = request.get_json()
    if not isinstance(data, dict):
        return jsonify({'error': 'Dados inválidos'}), 400

    save_users(data)
    return jsonify({
        'success': True,
        'message': f'{len(data)} usuário(s) salvos',
        'total': len(data)
    })


@app.route('/api/register', methods=['POST'])
def register_user():
    """Registra um novo usuário."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('nome'):
        return jsonify({'error': 'Nome e email são obrigatórios'}), 400

    email = data['email']
    users = load_users()

    if email in users:
        return jsonify({'error': 'Este email já está cadastrado'}), 409

    users[email] = data
    save_users(users)
    return jsonify({'success': True, 'message': 'Cadastro realizado com sucesso'}), 201


@app.route('/api/login', methods=['POST'])
def login_user():
    """Verifica credenciais de login."""
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Email e senha são obrigatórios'}), 400

    email = data['email']
    password = data['password']
    users = load_users()
    user = users.get(email)

    if not user or user.get('password') != password:
        return jsonify({'error': 'Email ou senha incorretos'}), 401

    return jsonify({'success': True, 'user': user})


@app.route('/api/export', methods=['GET'])
def export_all():
    """Exporta todos os dados para download."""
    users = load_users()
    export_data = {
        'appName': 'Tati Portela Fitness',
        'exportDate': datetime.now().isoformat(),
        'totalAlunos': len(users),
        'alunos': users
    }
    return jsonify(export_data)


@app.route('/api/import', methods=['POST'])
def import_data():
    """Importa dados de um backup."""
    data = request.get_json()
    if not data:
        return jsonify({'error': 'Dados inválidos'}), 400

    # Suporta formato {alunos: {...}} ou direto {email: userObj}
    if 'alunos' in data and isinstance(data['alunos'], dict):
        imported = data['alunos']
    elif isinstance(data, dict):
        imported = {k: v for k, v in data.items()
                    if isinstance(v, dict) and 'email' in v and 'nome' in v}
    else:
        return jsonify({'error': 'Formato inválido'}), 400

    users = load_users()
    added = 0
    updated = 0
    for email, user in imported.items():
        if email in users:
            updated += 1
        else:
            added += 1
        users[email] = user

    save_users(users)
    return jsonify({
        'success': True,
        'added': added,
        'updated': updated,
        'total': len(users)
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Retorna estatísticas gerais."""
    users = load_users()
    return jsonify({
        'totalAlunos': len(users),
        'alunos': [
            {
                'nome': u.get('nome', ''),
                'email': e,
                'createdAt': u.get('createdAt', ''),
                'objetivo': u.get('objetivo', ''),
                'totalTreinos': len(u.get('workoutHistory', []))
            }
            for e, u in users.items()
        ]
    })


if __name__ == '__main__':
    ensure_data_dir()
    print('\n' + '=' * 50)
    print('  🏋️  Tati Portela Fitness - Servidor')
    print('=' * 50)
    print(f'  Dados em: {DATA_DIR}')
    print(f'  Arquivo: {USERS_FILE}')
    print(f'  URL: http://localhost:5000')
    print(f'  App: http://localhost:5000/app.html')
    print('=' * 50 + '\n')
    app.run(host='0.0.0.0', port=5000, debug=True)
