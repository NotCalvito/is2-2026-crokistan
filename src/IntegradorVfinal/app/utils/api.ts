// src/app/utils/api.ts
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Función para obtener el token del localStorage
const getToken = () => {
    const token = localStorage.getItem('token');
    return token;
};

// Headers base con autenticación
const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getToken()}`
});

export const api = {
    // ========== AUTENTICACIÓN ==========
    login: async (username: string, password: string) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Error al iniciar sesión');
        }
        return res.json();
    },

    // ========== PRODUCTOS ==========
    getProducts: async (branch: string) => {
        const res = await fetch(`${API_URL}/products/${encodeURIComponent(branch)}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener productos');
        return res.json();
    },

    createProduct: async (product: any) => {
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(product),
        });
        if (!res.ok) throw new Error('Error al crear producto');
        return res.json();
    },

    updateProduct: async (id: string, product: any) => {
        const res = await fetch(`${API_URL}/products/${id}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(product),
        });
        if (!res.ok) throw new Error('Error al actualizar producto');
        return res.json();
    },

    deleteProduct: async (id: string, branch: string) => {
        const res = await fetch(`${API_URL}/products/${id}?branch=${encodeURIComponent(branch)}`, {
            method: 'DELETE',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al eliminar producto');
        return res.json();
    },

    importExcel: async (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_URL}/products/import-excel`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`
            },
            body: formData,
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || `Error al importar productos (${res.status})`);
        }
        return res.json();
    },

    // ========== MOVIMIENTOS ==========
    getMovements: async (filters?: { branch?: string; type?: string; customer?: string }) => {
        const params = new URLSearchParams(filters as any);
        const res = await fetch(`${API_URL}/movements?${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener movimientos');
        return res.json();
    },

    createMovement: async (movement: any) => {
        const res = await fetch(`${API_URL}/movements`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(movement),
        });
        if (!res.ok) throw new Error('Error al registrar movimiento');
        return res.json();
    },

    // ========== CLIENTES ==========
    getCustomers: async (name?: string) => {
        const params = name ? `?name=${encodeURIComponent(name)}` : '';
        const res = await fetch(`${API_URL}/customers${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener clientes');
        return res.json();
    },

    // ========== DESCUENTOS ==========
    getDiscounts: async (activeOnly?: boolean) => {
        const params = activeOnly ? '?active=true' : '';
        const res = await fetch(`${API_URL}/discounts${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener descuentos');
        return res.json();
    },

    createDiscount: async (discount: any) => {
        const res = await fetch(`${API_URL}/discounts`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(discount),
        });
        if (!res.ok) throw new Error('Error al crear descuento');
        return res.json();
    },

    updateDiscount: async (id: string, discount: any) => {
        const res = await fetch(`${API_URL}/discounts/${id}`, {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(discount),
        });
        if (!res.ok) throw new Error('Error al actualizar descuento');
        return res.json();
    },

    deleteDiscount: async (id: string) => {
        const res = await fetch(`${API_URL}/discounts/${id}`, {
            method: 'DELETE',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al eliminar descuento');
        return res.json();
    },

    // ========== SOLICITUDES DE STOCK ==========
    getStockRequests: async (branch?: string, status?: string) => {
        const params = new URLSearchParams();
        if (branch) params.append('branch', branch);
        if (status) params.append('status', status);
        const res = await fetch(`${API_URL}/stock-requests?${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener solicitudes');
        return res.json();
    },

    createStockRequest: async (request: any) => {
        const res = await fetch(`${API_URL}/stock-requests`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(request),
        });
        if (!res.ok) throw new Error('Error al crear solicitud');
        return res.json();
    },

    approveStockRequest: async (id: string) => {
        const res = await fetch(`${API_URL}/stock-requests/${id}/approve`, {
            method: 'PUT',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al aprobar solicitud');
        return res.json();
    },

    rejectStockRequest: async (id: string) => {
        const res = await fetch(`${API_URL}/stock-requests/${id}/reject`, {
            method: 'PUT',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al rechazar solicitud');
        return res.json();
    },

    // ========== COMPRAS A PROVEEDORES ==========
    getPurchaseOrders: async (branch?: string, status?: string) => {
        const params = new URLSearchParams();
        if (branch) params.append('branch', branch);
        if (status) params.append('status', status);
        const res = await fetch(`${API_URL}/purchase-orders?${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener órdenes de compra');
        return res.json();
    },

    createPurchaseOrder: async (order: any) => {
        const res = await fetch(`${API_URL}/purchase-orders`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(order),
        });
        if (!res.ok) throw new Error('Error al crear orden de compra');
        return res.json();
    },

    deliverPurchaseOrder: async (id: string) => {
        const res = await fetch(`${API_URL}/purchase-orders/${id}/deliver`, {
            method: 'PUT',
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al marcar como entregada');
        return res.json();
    },

    // ========== ESTADÍSTICAS ==========
    getStatistics: async (branch?: string) => {
        const params = branch ? `?branch=${encodeURIComponent(branch)}` : '';
        const res = await fetch(`${API_URL}/statistics/ventas-vs-stock${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener estadísticas');
        return res.json();
    },

    predict: async (x: number, branch?: string) => {
        const res = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ x, branch }),
        });
        if (!res.ok) throw new Error('Error al realizar predicción');
        return res.json();
    },

    getDescriptivas: async (branch?: string, variable = 'ventas') => {
        const params = new URLSearchParams({ variable });
        if (branch) params.set('branch', branch);
        const res = await fetch(`${API_URL}/statistics/descriptivas?${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener estadísticas descriptivas');
        return res.json();
    },

    getInferencial: async (branch?: string, variable = 'ventas', mu0?: number, alpha = 0.05) => {
        const params = new URLSearchParams({ variable, alpha: String(alpha) });
        if (branch) params.set('branch', branch);
        if (mu0 !== undefined) params.set('mu0', String(mu0));
        const res = await fetch(`${API_URL}/statistics/inferencial?${params}`, {
            headers: headers(),
        });
        if (!res.ok) throw new Error('Error al obtener estadística inferencial');
        return res.json();
    },

    interpolate: async (x: number, branch?: string, variable_x = 'stock', variable_y = 'ventas') => {
        const res = await fetch(`${API_URL}/interpolate`, {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ x, branch, variable_x, variable_y }),
        });
        if (!res.ok) throw new Error('Error al interpollar');
        return res.json();
    }
};