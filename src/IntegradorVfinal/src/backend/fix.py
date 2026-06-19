import bcrypt
import pymysql

# Conectar a la base de datos (sin contraseña)
conn = pymysql.connect(
    host="localhost",
    user="root",
    password="",  # XAMPP
    port=3306,
    database="ferreteria_is2_2026",
    autocommit=False
)
cursor = conn.cursor()

# Lista de usuarios con sus contraseñas reales
usuarios = [
    ("admin", "admin123"),
    ("juanperez", "empleado123"),
    ("mariagarcia", "empleado123"),
    ("carloslopez", "empleado123"),
    ("contador", "contador123")
]

for username, password in usuarios:
    # Generar hash bcrypt
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    # Actualizar en la base de datos
    cursor.execute(
        "UPDATE usuarios SET password_hash = %s WHERE username = %s",
        (hashed, username)
    )
    print(f"✅ Usuario '{username}' actualizado")

conn.commit()
cursor.close()
conn.close()
print("🎉 ¡Contraseñas actualizadas correctamente!")