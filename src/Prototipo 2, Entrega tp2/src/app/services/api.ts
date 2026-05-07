const API_URL = "http://localhost:5000";

export const api = {
  // =========================
  // PRODUCTOS
  // =========================

  async getProducts(branch: string) {
    const res = await fetch(`${API_URL}/products/${encodeURIComponent(branch)}`);
    if (!res.ok) throw new Error("Error al obtener productos");
    return res.json();
  },

  async createProduct(product: any) {
    const res = await fetch(`${API_URL}/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    if (!res.ok) throw new Error("Error al guardar producto");
    return res.json();
  },

  async updateProduct(id: number, product: any) {
    const res = await fetch(`${API_URL}/products/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(product),
    });

    if (!res.ok) throw new Error("Error al actualizar producto");
    return res.json();
  },

  async deleteProduct(id: number, branch: string) {
    const res = await fetch(
      `${API_URL}/products/${id}?branch=${encodeURIComponent(branch)}`,
      {
        method: "DELETE",
      }
    );

    if (!res.ok) throw new Error("Error al eliminar producto");
    return res.json();
  },

  // =========================
  // MOVIMIENTOS
  // =========================

  async getMovements() {
    const res = await fetch(`${API_URL}/movements`);
    if (!res.ok) throw new Error("Error al obtener movimientos");
    return res.json();
  },

  async saveMovement(movement: any) {
    const res = await fetch(`${API_URL}/movements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(movement),
    });

    if (!res.ok) throw new Error("Error al guardar movimiento");
    return res.json();
  },
};