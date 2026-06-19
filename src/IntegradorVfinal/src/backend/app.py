from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity, get_jwt
from stock import StockManager
from movimientos import MovimientoManager
from clientes import ClienteManager
from descuentos import DescuentoManager
from solicitudes import SolicitudManager
from compras import CompraManager
from auth import AuthManager
import os
from datetime import timedelta
import openpyxl
from io import BytesIO

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = os.environ.get("JWT_SECRET_KEY", "ferreteria-super-secret-key-2026")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
app.config["JWT_TOKEN_LOCATION"] = ["headers"]
app.config["JWT_HEADER_NAME"] = "Authorization"
app.config["JWT_HEADER_TYPE"] = "Bearer"

jwt = JWTManager(app)
CORS(app)

@jwt.user_identity_loader
def user_identity_lookup(identity):
    print(f"🔍 Identity recibido: {identity} (tipo: {type(identity)})")
    return str(identity)

@app.errorhandler(Exception)
def handle_exception(e):
    """Manejador de errores global para ver todos los errores"""
    import traceback
    print("=" * 60)
    print("❌ ERROR DETECTADO:")
    print("=" * 60)
    traceback.print_exc()
    print("=" * 60)
    return jsonify({"error": str(e)}), 500

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"❌ Token inválido: {error}")
    return jsonify({"error": "Token inválido"}), 401

@jwt.unauthorized_loader
def unauthorized_callback(error):
    print(f"❌ No autorizado: {error}")
    return jsonify({"error": "Token no proporcionado o inválido"}), 401

# =========================
# AUTENTICACIÓN
# =========================

@app.route("/auth/login", methods=["POST"])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    if not username or not password:
        return jsonify({"error": "Usuario y contraseña son obligatorios"}), 400
    
    try:
        manager = AuthManager()
        resultado = manager.login(username, password)
        return jsonify(resultado)
    except ValueError as e:
        return jsonify({"error": str(e)}), 401
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/auth/me", methods=["GET"])
@jwt_required()
def obtener_usuario_actual():
    try:
        identity = get_jwt_identity()
        claims = get_jwt()
        return jsonify({
            "id": identity,
            "username": claims.get("username"),
            "role": claims.get("role"),
            "branch": claims.get("branch"),
            "fullName": claims.get("fullName")
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# PRODUCTOS
# =========================

@app.route("/products/<sucursal>", methods=["GET"])
@jwt_required()
def obtener_productos(sucursal):
    print(f"📦 Endpoint alcanzado - sucursal: {sucursal}")  # <-- ESTE PRINT DEBERÍA APARECER
    try:
        print("🔍 Intentando obtener productos...")
        manager = StockManager(sucursal)
        productos = manager.obtener_productos()
        print(f"✅ Productos obtenidos: {len(productos)}")
        return jsonify(productos)
    except ValueError as e:
        print(f"❌ Error de valor: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"❌ Error general: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/products", methods=["POST"])
@jwt_required()
def guardar_producto():
    data = request.json
    print("📦 Datos recibidos para crear producto:", data)  # <-- AGREGAR
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para crear productos"}), 403
    
    try:
        manager = StockManager(data["branch"])
        manager.insertar_producto(data)
        return jsonify({"mensaje": "Producto creado"})
    except ValueError as e:
        print(f"❌ Error de validación: {str(e)}")  # <-- AGREGAR
        return jsonify({"error": str(e)}), 400
    except KeyError as e:
        print(f"❌ Falta campo: {str(e)}")  # <-- AGREGAR
        return jsonify({"error": f"Faltan datos obligatorios: {str(e)}"}), 400
    except Exception as e:
        print(f"❌ Error general: {str(e)}")  # <-- AGREGAR
        import traceback
        traceback.print_exc()  # <-- AGREGAR
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/products/<producto_id>", methods=["PUT"])
@jwt_required()
def actualizar_producto(producto_id):
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role == "contador":
        if set(data.keys()) != {"price", "branch"}:
            return jsonify({"error": "Los contadores solo pueden actualizar el precio"}), 403
    elif role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para actualizar productos"}), 403
    
    try:
        manager = StockManager(data["branch"])
        if role == "contador":
            manager.definir_precio(producto_id, data["price"])
        else:
            manager.actualizar_producto(producto_id, data)
        return jsonify({"mensaje": "Producto actualizado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except KeyError as e:
        return jsonify({"error": f"Faltan datos obligatorios: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/products/<producto_id>", methods=["DELETE"])
@jwt_required()
def eliminar_producto(producto_id):
    sucursal = request.args.get("branch")
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para eliminar productos"}), 403
    
    if not sucursal:
        return jsonify({"error": "Falta el parámetro 'branch'"}), 400
    
    try:
        manager = StockManager(sucursal)
        manager.eliminar_producto(producto_id)
        return jsonify({"mensaje": "Producto eliminado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

# =========================
# IMPORTAR EXCEL
# =========================

@app.route("/products/import-excel", methods=["POST"])
@jwt_required()
def importar_productos_excel():
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para importar productos"}), 403

    if 'file' not in request.files:
        return jsonify({"error": "No se envió ningún archivo"}), 400

    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"error": "Nombre de archivo vacío"}), 400

    if not (file.filename.endswith('.xlsx') or file.filename.endswith('.xls')):
        return jsonify({"error": "Formato de archivo no soportado. Use .xlsx o .xls"}), 400

    try:
        workbook = openpyxl.load_workbook(BytesIO(file.read()))
        sheet = workbook.active
        
        headers = [cell.value for cell in sheet[1]]
        required_columns = ['nombre', 'categoría', 'sucursal', 'stock_actual', 'stock_mínimo']
        # Columnas opcionales reconocidas
        optional_columns = ['unidad', 'precio']
        missing = [col for col in required_columns if col not in headers]
        
        if missing:
            return jsonify({
                "error": f"Faltan columnas requeridas: {', '.join(missing)}",
                "columnas_esperadas": required_columns + ['unidad (opcional)']
            }), 400

        productos_importados = []
        errores = []
        
        for idx, row in enumerate(sheet.iter_rows(min_row=2, values_only=True), start=2):
            row_data = dict(zip(headers, row))
            
            nombre = row_data.get('nombre')
            categoria = row_data.get('categoría')
            sucursal = row_data.get('sucursal')
            stock_actual = row_data.get('stock_actual')
            stock_minimo = row_data.get('stock_mínimo')
            unidad = row_data.get('unidad', 'Unidades')
            precio_raw = row_data.get('precio', None)
            
            if not nombre or not categoria or not sucursal:
                errores.append(f"Fila {idx}: Datos incompletos (nombre, categoría o sucursal faltantes)")
                continue
            
            try:
                stock_actual_int = int(stock_actual) if stock_actual is not None else 0
                stock_minimo_int = int(stock_minimo) if stock_minimo is not None else 0
            except (ValueError, TypeError):
                errores.append(f"Fila {idx}: Stock inválido (debe ser número)")
                continue

            try:
                if precio_raw is not None and str(precio_raw).strip() != '':
                    precio_float = float(str(precio_raw).replace(',', '.'))
                    if precio_float < 0:
                        errores.append(f"Fila {idx}: El precio no puede ser negativo")
                        continue
                else:
                    precio_float = 0.0
            except (ValueError, TypeError):
                errores.append(f"Fila {idx}: Precio inválido (debe ser número)")
                continue

            try:
                manager = StockManager(sucursal)
            except ValueError:
                errores.append(f"Fila {idx}: Sucursal '{sucursal}' no válida")
                continue

            productos_existentes = manager.obtener_productos()
            duplicado = next((p for p in productos_existentes if p["name"].lower() == nombre.lower()), None)
            
            if duplicado:
                errores.append(f"Fila {idx}: Producto '{nombre}' ya existe en '{sucursal}'")
                continue

            productos_importados.append({
                "name": nombre,
                "category": categoria,
                "branch": sucursal,
                "price": precio_float,
                "currentStock": stock_actual_int,
                "minStock": stock_minimo_int,
                "unit": unidad
            })

        if errores and not productos_importados:
            return jsonify({
                "error": "No se pudo importar ningún producto",
                "detalles": errores
            }), 400

        insertados = 0
        for producto in productos_importados:
            try:
                manager = StockManager(producto["branch"])
                manager.insertar_producto(producto)
                insertados += 1
            except Exception as e:
                errores.append(f"Error al insertar '{producto['name']}': {str(e)}")

        return jsonify({
            "mensaje": f"Importación completada",
            "insertados": insertados,
            "errores": errores if errores else None
        })

    except Exception as e:
        return jsonify({"error": f"Error al procesar el archivo: {str(e)}"}), 500

# =========================
# MOVIMIENTOS
# =========================

@app.route("/movements", methods=["GET"])
@jwt_required()
def obtener_movimientos():
    print("📦 Obteniendo movimientos...")  # <-- AGREGAR
    branch = request.args.get('branch')
    tipo = request.args.get('type')
    cliente = request.args.get('customer')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    limit = request.args.get('limit', default=100, type=int)

    filtros = {}
    if branch:
        filtros['branch'] = branch
    if tipo:
        filtros['type'] = tipo
    if cliente:
        filtros['customer'] = cliente
    if date_from:
        filtros['date_from'] = date_from
    if date_to:
        filtros['date_to'] = date_to
    filtros['limit'] = limit

    try:
        manager = MovimientoManager()
        movimientos = manager.obtener_movimientos(filtros)
        return jsonify(movimientos)
    except Exception as e:
        print(f"❌ Error al obtener movimientos: {str(e)}")  # <-- AGREGAR
        import traceback
        traceback.print_exc()  # <-- AGREGAR
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/movements", methods=["POST"])
@jwt_required()
def guardar_movimiento():
    data = request.json
    print("📦 Datos recibidos para movimiento:", data)  # debug
    claims = get_jwt()
    role = claims.get("role")

    if role == "contador":
        return jsonify({"error": "Los contadores no pueden registrar movimientos"}), 403

    try:
        manager = MovimientoManager()
        resultado = manager.insertar_movimiento(data)
        return jsonify({"mensaje": "Movimiento registrado", "id": resultado["id"]})
    except ValueError as e:
        print(f"❌ Error de validación en movimiento: {str(e)}")
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        print(f"❌ Error al registrar movimiento: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

# =========================
# CLIENTES
# =========================

@app.route("/customers", methods=["GET"])
@jwt_required()
def obtener_clientes():
    nombre = request.args.get('name')
    try:
        manager = ClienteManager()
        clientes = manager.obtener_clientes(nombre)
        return jsonify(clientes)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/customers", methods=["POST"])
@jwt_required()
def crear_cliente():
    data = request.json
    try:
        manager = ClienteManager()
        resultado = manager.insertar_cliente(data)
        return jsonify({"mensaje": "Cliente creado", "id": resultado["id"]})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/customers/<cliente_id>", methods=["PUT"])
@jwt_required()
def actualizar_cliente(cliente_id):
    data = request.json
    try:
        manager = ClienteManager()
        manager.actualizar_cliente(cliente_id, data)
        return jsonify({"mensaje": "Cliente actualizado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

# =========================
# DESCUENTOS
# =========================

@app.route("/discounts", methods=["GET"])
@jwt_required()
def obtener_descuentos():
    solo_activos = request.args.get('active', default='false').lower() == 'true'
    try:
        manager = DescuentoManager()
        descuentos = manager.obtener_descuentos(solo_activos)
        return jsonify(descuentos)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/discounts", methods=["POST"])
@jwt_required()
def crear_descuento():
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para crear descuentos"}), 403
    
    try:
        manager = DescuentoManager()
        resultado = manager.insertar_descuento(data)
        return jsonify({"mensaje": "Descuento creado", "id": resultado["id"]})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/discounts/<descuento_id>", methods=["PUT"])
@jwt_required()
def actualizar_descuento(descuento_id):
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para actualizar descuentos"}), 403
    
    try:
        manager = DescuentoManager()
        manager.actualizar_descuento(descuento_id, data)
        return jsonify({"mensaje": "Descuento actualizado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/discounts/<descuento_id>", methods=["DELETE"])
@jwt_required()
def eliminar_descuento(descuento_id):
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para eliminar descuentos"}), 403
    
    try:
        manager = DescuentoManager()
        manager.eliminar_descuento(descuento_id)
        return jsonify({"mensaje": "Descuento eliminado"})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

# =========================
# SOLICITUDES
# =========================

@app.route("/stock-requests", methods=["GET"])
@jwt_required()
def obtener_solicitudes():
    print("📦 Obteniendo solicitudes...")  # <-- AGREGAR
    branch = request.args.get('branch')
    estado = request.args.get('status')
    try:
        manager = SolicitudManager()
        solicitudes = manager.obtener_solicitudes(branch, estado)
        return jsonify(solicitudes)
    except Exception as e:
        print(f"❌ Error al obtener solicitudes: {str(e)}")  # <-- AGREGAR
        import traceback
        traceback.print_exc()  # <-- AGREGAR
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/stock-requests", methods=["POST"])
@jwt_required()
def crear_solicitud():
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para crear solicitudes"}), 403
    
    try:
        manager = SolicitudManager()
        resultado = manager.insertar_solicitud(data)
        return jsonify({"mensaje": "Solicitud creada", "id": resultado["id"]})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/stock-requests/<solicitud_id>/approve", methods=["PUT"])
@jwt_required()
def aprobar_solicitud(solicitud_id):
    claims = get_jwt()
    role = claims.get("role")
    usuario_id = get_jwt_identity()
    usuario_nombre = claims.get("fullName")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para aprobar solicitudes"}), 403
    
    try:
        manager = SolicitudManager()
        resultado = manager.aprobar_solicitud(solicitud_id, usuario_id, usuario_nombre)
        return jsonify({"mensaje": "Solicitud aprobada", "solicitud": resultado})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/stock-requests/<solicitud_id>/reject", methods=["PUT"])
@jwt_required()
def rechazar_solicitud(solicitud_id):
    claims = get_jwt()
    role = claims.get("role")
    usuario_id = get_jwt_identity()
    usuario_nombre = claims.get("fullName")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para rechazar solicitudes"}), 403
    
    try:
        manager = SolicitudManager()
        resultado = manager.rechazar_solicitud(solicitud_id, usuario_id, usuario_nombre)
        return jsonify({"mensaje": "Solicitud rechazada", "solicitud": resultado})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

# =========================
# COMPRAS
# =========================

@app.route("/purchase-orders", methods=["GET"])
@jwt_required()
def obtener_compras():
    branch = request.args.get('branch')
    estado = request.args.get('status')
    try:
        manager = CompraManager()
        compras = manager.obtener_compras(branch, estado)
        return jsonify(compras)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/purchase-orders", methods=["POST"])
@jwt_required()
def crear_compra():
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "employee"]:
        return jsonify({"error": "No tienes permisos para crear órdenes de compra"}), 403
    
    try:
        manager = CompraManager()
        resultado = manager.insertar_compra(data)
        return jsonify({"mensaje": "Orden de compra creada", "id": resultado["id"]})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/purchase-orders/<compra_id>", methods=["PUT"])
@jwt_required()
def actualizar_compra(compra_id):
    data = request.json
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para actualizar órdenes de compra"}), 403
    
    try:
        manager = CompraManager()
        manager.actualizar_compra(compra_id, data)
        return jsonify({"mensaje": "Orden de compra actualizada"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/purchase-orders/<compra_id>/deliver", methods=["PUT"])
@jwt_required()
def marcar_compra_entregada(compra_id):
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para marcar órdenes como entregadas"}), 403
    
    try:
        manager = CompraManager()
        resultado = manager.marcar_entregado(compra_id)
        return jsonify({"mensaje": "Orden marcada como entregada", "compra": resultado})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

def init_database():
    try:
        from auth import AuthManager
        from descuentos import DescuentoManager
        
        auth_manager = AuthManager()
        auth_manager.cursor.execute("SELECT COUNT(*) as count FROM usuarios")
        result = auth_manager.cursor.fetchone()
        user_count = result['count'] if result else 0
        
        if user_count == 0:
            print("📦 Creando usuarios por defecto...")
            default_users = [
                ("admin", "admin123", "admin", "all", "Administrador"),
                ("juanperez", "empleado123", "employee", "Sucursal Centro", "Juan Pérez"),
                ("mariagarcia", "empleado123", "employee", "Sucursal Norte", "María García"),
                ("carloslopez", "empleado123", "employee", "Sucursal Sur", "Carlos López"),
                ("contador", "contador123", "contador", "all", "Ana Martínez - Contador")
            ]
            
            for username, password, role, branch, full_name in default_users:
                auth_manager.create_user(username, password, role, branch, full_name)
                print(f"  ✅ Usuario '{username}' creado")
        
        auth_manager.cerrar()
        
        descuento_manager = DescuentoManager()
        descuento_manager.cursor.execute("SELECT COUNT(*) as count FROM descuentos")
        result = descuento_manager.cursor.fetchone()
        descuento_count = result['count'] if result else 0
        
        if descuento_count == 0:
            print("📦 Creando descuentos por defecto...")
            default_discounts = [
                ("Descuento cliente frecuente (10%)", "percentage", 10, True, "frequent_customers"),
                ("Oferta especial de temporada (15%)", "percentage", 15, False, "all"),
                ("Pago en efectivo (5%)", "percentage", 5, True, "all")
            ]
            
            for nombre, tipo, valor, activo, aplica_a in default_discounts:
                descuento_manager.insertar_descuento({
                    "name": nombre,
                    "type": tipo,
                    "value": valor,
                    "isActive": activo,
                    "appliesTo": aplica_a
                })
                print(f"  ✅ Descuento '{nombre}' creado")
        
        descuento_manager.cerrar()
        print("🎉 Inicialización completada")
        
    except Exception as e:
        print(f"⚠️ Error al inicializar la base de datos: {e}")
# =========================
# ESTADÍSTICAS Y ANÁLISIS
# =========================
from analisis import AnalisisManager

@app.route("/statistics/ventas-vs-stock", methods=["GET"])
@jwt_required()
def obtener_estadisticas():
    """Obtiene datos de stock vs ventas para análisis estadístico."""
    branch = request.args.get('branch')
    claims = get_jwt()
    role = claims.get("role")
    
    # Solo admin y contador pueden ver estadísticas
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para ver estadísticas"}), 403
    
    try:
        manager = AnalisisManager()
        resultado = manager.obtener_estadisticas_completas(branch)
        return jsonify(resultado)
    except Exception as e:
        print(f"❌ Error en estadísticas: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/predict", methods=["POST"])
@jwt_required()
def predecir():
    """Predice ventas basado en stock usando el modelo de regresión."""
    data = request.json
    x = data.get('x')
    branch = data.get('branch')
    
    if x is None:
        return jsonify({"error": "Falta el valor de X (stock)"}), 400
    
    claims = get_jwt()
    role = claims.get("role")
    
    if role not in ["admin", "contador"]:
        return jsonify({"error": "No tienes permisos para usar esta función"}), 403
    
    try:
        manager = AnalisisManager()
        # Obtener datos y regresión
        resultado = manager.obtener_estadisticas_completas(branch)
        regresion = resultado.get("regresion")
        
        if not regresion:
            return jsonify({"error": "No hay suficientes datos para hacer una predicción"}), 400
        
        y_pred = manager.predecir(x, regresion["slope"], regresion["intercept"])
        
        return jsonify({
            "x": x,
            "y_pred": y_pred,
            "equation": regresion["equation"],
            "correlation": regresion["correlation"]
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        try:
            manager.cerrar()
        except:
            pass

@app.route("/statistics/descriptivas", methods=["GET"])
@jwt_required()
def obtener_descriptivas():
    """Estadistica descriptiva: media, mediana, moda, desvio, CV, cuartiles."""
    branch   = request.args.get('branch')
    variable = request.args.get('variable', 'ventas')
    claims   = get_jwt()
    if claims.get("role") not in ["admin", "contador"]:
        return jsonify({"error": "Sin permisos"}), 403
    try:
        manager = AnalisisManager()
        datos   = manager.obtener_datos_ventas_vs_stock(branch)
        if not datos or len(datos) < 2:
            return jsonify({"descriptivas": None, "frecuencias": None})
        desc = manager.calcular_estadisticas_descriptivas(datos, variable)
        freq = manager.construir_tabla_frecuencias(datos, variable)
        return jsonify({"descriptivas": desc, "frecuencias": freq})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try: manager.cerrar()
        except: pass

@app.route("/statistics/inferencial", methods=["GET"])
@jwt_required()
def obtener_inferencial():
    """IC y prueba de hipotesis bilateral para la media de ventas."""
    branch   = request.args.get('branch')
    variable = request.args.get('variable', 'ventas')
    mu0_raw  = request.args.get('mu0')
    alpha    = float(request.args.get('alpha', 0.05))
    claims   = get_jwt()
    if claims.get("role") not in ["admin", "contador"]:
        return jsonify({"error": "Sin permisos"}), 403
    try:
        manager = AnalisisManager()
        datos   = manager.obtener_datos_ventas_vs_stock(branch)
        if not datos or len(datos) < 2:
            return jsonify({"intervalo_confianza": None, "prueba_hipotesis": None})
        mu0 = float(mu0_raw) if mu0_raw else None
        ic  = manager.calcular_intervalo_confianza(datos, variable)
        hip = manager.realizar_prueba_hipotesis(datos, variable, mu0, alpha)
        return jsonify({"intervalo_confianza": ic, "prueba_hipotesis": hip})
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try: manager.cerrar()
        except: pass

@app.route("/interpolate", methods=["POST"])
@jwt_required()
def interpolar():
    """Interpolacion lineal entre los dos puntos mas cercanos a x_nuevo."""
    data     = request.json
    x_nuevo  = data.get('x')
    branch   = data.get('branch')
    var_x    = data.get('variable_x', 'stock')
    var_y    = data.get('variable_y', 'ventas')
    if x_nuevo is None:
        return jsonify({"error": "Falta el valor x"}), 400
    claims = get_jwt()
    if claims.get("role") not in ["admin", "contador"]:
        return jsonify({"error": "Sin permisos"}), 403
    try:
        manager = AnalisisManager()
        datos   = manager.obtener_datos_ventas_vs_stock(branch)
        if len(datos) < 2:
            return jsonify({"error": None, "mensaje": "Se necesitan al menos 2 puntos con ventas registradas"})
        resultado = manager.interpolar_lineal(datos, float(x_nuevo), var_x, var_y)
        return jsonify(resultado)
    except Exception as e:
        import traceback; traceback.print_exc()
        return jsonify({"error": str(e)}), 500
    finally:
        try: manager.cerrar()
        except: pass

if __name__ == "__main__":
    init_database()
    app.run(debug=True, host="0.0.0.0", port=5000)