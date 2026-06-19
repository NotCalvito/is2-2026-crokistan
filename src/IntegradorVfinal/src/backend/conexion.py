import pymysql
import pymysql.cursors

def get_connection():
    try:
        conn = pymysql.connect(
            host="localhost",
            user="root",
            password="",  # XAMPP
            port=3306,
            database="ferreteria_is2_2026",
            cursorclass=pymysql.cursors.DictCursor,
            autocommit=False
        )
        return conn
    except Exception as e:
        print(f"Error conectando a MySQL: {e}")
        raise