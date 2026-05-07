from flask import Flask, jsonify, request
from flask_cors import CORS
from stock import StockManager

app = Flask(__name__)
CORS(app)

# =========================
# PRODUCTOS
# =========================

@app.route("/products/<sucursal>", methods=["GET"])
def obtener_productos(sucursal):
    try:
        manager = StockManager(sucursal)
        productos = manager.obtener_productos()
        return jsonify(productos)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        try:
            manager.cerrar()
        except:
            pass


@app.route("/products", methods=["POST"])
def guardar_producto():
    data = request.json

    try:
        manager = StockManager(data["branch"])
        manager.insertar_producto(data)  # ✅ corregido
        return jsonify({"mensaje": "Producto creado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except KeyError:
        return jsonify({"error": "Faltan datos obligatorios"}), 400
    finally:
        try:
            manager.cerrar()
        except:
            pass


@app.route("/products/<producto_id>", methods=["PUT"])
def actualizar_producto(producto_id):
    data = request.json

    try:
        manager = StockManager(data["branch"])
        manager.actualizar_producto(producto_id, data)  # ✅ corregido
        return jsonify({"mensaje": "Producto actualizado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except KeyError:
        return jsonify({"error": "Faltan datos obligatorios"}), 400
    finally:
        try:
            manager.cerrar()
        except:
            pass


@app.route("/products/<producto_id>", methods=["DELETE"])
def eliminar_producto(producto_id):
    sucursal = request.args.get("branch")

    if not sucursal:
        return jsonify({"error": "Falta el parámetro 'branch'"}), 400

    try:
        manager = StockManager(sucursal)
        manager.eliminar_producto(producto_id)
        return jsonify({"mensaje": "Producto eliminado"})
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    finally:
        try:
            manager.cerrar()
        except:
            pass


# =========================
# MOVIMIENTOS (TEMPORAL)
# =========================

movimientos = []


@app.route("/movements", methods=["GET"])
def obtener_movimientos():
    return jsonify(movimientos)


@app.route("/movements", methods=["POST"])
def guardar_movimiento():
    data = request.json
    movimientos.append(data)
    return jsonify({"mensaje": "Movimiento registrado"})


# =========================
# MAIN
# =========================

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)