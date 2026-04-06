import mysql.connector

def get_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="",  # XAMPP
        database="ferreteria_is2_2026"
    )