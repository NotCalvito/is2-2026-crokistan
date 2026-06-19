import bcrypt
from conexion import get_connection
from flask_jwt_extended import create_access_token
from datetime import timedelta
import re

class AuthManager:
    def __init__(self):
        self.conexion = get_connection()
        self.cursor = self.conexion.cursor()

    def _hash_password(self, password: str) -> str:
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    def _verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )

    def login(self, username: str, password: str) -> dict:
        if not username or not password:
            raise ValueError("Usuario y contraseña son obligatorios")

        query = "SELECT * FROM usuarios WHERE username = %s"
        self.cursor.execute(query, (username,))
        user = self.cursor.fetchone()

        if not user:
            raise ValueError("Usuario o contraseña incorrectos")

        if not self._verify_password(password, user['password_hash']):
            raise ValueError("Usuario o contraseña incorrectos")

        print(f"🔑 Generando token para usuario: {username}, ID: {user['id']} (tipo: {type(user['id'])})")  # <-- AGREGAR
        
        user_id = str(user['id'])  # <-- CONVERTIR A STRING
        
        additional_claims = {
            "username": user['username'],
            "role": user['role'],
            "branch": user['branch'],
            "fullName": user['full_name']
        }

        access_token = create_access_token(
            identity=user_id,  # <-- AHORA ES UN STRING
            additional_claims=additional_claims,
            expires_delta=timedelta(hours=8)
        )
        
        print(f"✅ Token generado correctamente")  # <-- AGREGAR
        
        return {
            "token": access_token,
            "user": {
                "id": user_id,
                "username": user['username'],
                "role": user['role'],
                "branch": user['branch'],
                "fullName": user['full_name']
            }
        }

    def get_user_by_id(self, user_id: int) -> dict:
        query = "SELECT id, username, role, branch, full_name FROM usuarios WHERE id = %s"
        self.cursor.execute(query, (user_id,))
        user = self.cursor.fetchone()
        if not user:
            raise ValueError("Usuario no encontrado")
        return {
            "id": user['id'],
            "username": user['username'],
            "role": user['role'],
            "branch": user['branch'],
            "fullName": user['full_name']
        }

    def create_user(self, username: str, password: str, role: str, branch: str, full_name: str) -> dict:
        if not username or not password or not full_name:
            raise ValueError("Todos los campos son obligatorios")
        
        if role not in ["admin", "employee", "contador"]:
            raise ValueError("Rol inválido")
        
        query_check = "SELECT id FROM usuarios WHERE username = %s"
        self.cursor.execute(query_check, (username,))
        if self.cursor.fetchone():
            raise ValueError("El nombre de usuario ya está en uso")

        hashed = self._hash_password(password)

        query = """
        INSERT INTO usuarios (username, password_hash, role, branch, full_name)
        VALUES (%s, %s, %s, %s, %s)
        """
        self.cursor.execute(query, (username, hashed, role, branch, full_name))
        self.conexion.commit()

        user_id = self.cursor.lastrowid
        return {
            "id": user_id,
            "username": username,
            "role": role,
            "branch": branch,
            "fullName": full_name
        }

    def update_user(self, user_id: int, data: dict) -> dict:
        allowed_fields = ["role", "branch", "full_name", "password"]
        updates = []
        params = []

        for field in allowed_fields:
            if field in data:
                if field == "password":
                    hashed = self._hash_password(data['password'])
                    updates.append("password_hash = %s")
                    params.append(hashed)
                else:
                    updates.append(f"{field} = %s")
                    params.append(data[field])

        if not updates:
            raise ValueError("No hay datos para actualizar")

        params.append(user_id)
        query = f"UPDATE usuarios SET {', '.join(updates)} WHERE id = %s"
        self.cursor.execute(query, params)
        self.conexion.commit()

        if self.cursor.rowcount == 0:
            raise ValueError("Usuario no encontrado")

        return self.get_user_by_id(user_id)

    def cerrar(self):
        if self.cursor:
            self.cursor.close()
        if self.conexion:
            self.conexion.close()