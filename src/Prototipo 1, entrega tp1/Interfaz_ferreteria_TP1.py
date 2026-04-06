import tkinter as tk
from tkinter import ttk
from stock import insertar_producto
from tkinter import messagebox #Para devolver mensajes al usuario

# ============================
# PATRÓN OBSERVER (INTERFAZ)
# ============================

class Observer:
    """Interfaz base para observadores."""
    def update(self, data):
        pass


class Subject:
    """Sujeto que notifica a los observadores."""
    def __init__(self):
        self._observers = []

    def add_observer(self, observer: Observer):
        self._observers.append(observer)

    def notify(self, data):
        for observer in self._observers:
            observer.update(data)


# ============================
# PATRÓN STRATEGY (INTERFAZ)
# ============================

class InputStrategy:
    """Estrategia base para validación o tratamiento de inputs."""
    def process(self, data):
        pass


class DefaultInputStrategy(InputStrategy):
    """Estrategia por defecto (placeholder)."""
    def process(self, data):
        return data


# ============================
# PATRÓN FACTORY
# ============================

class WidgetFactory:
    """Fábrica para crear componentes de la interfaz."""

    @staticmethod
    def create_label(parent, text):
        return ttk.Label(parent, text=text, font=("Arial", 20))

    @staticmethod
    def create_entry(parent):
        return ttk.Entry(parent, font=("Arial", 20))

    @staticmethod
    def create_button(parent, text, command):
        return tk.Button(
            parent,
            text=text,
            command=command,
            font=("Arial", 35, "bold"),
            bg="#FF9800",
            fg="white",
            activebackground="#45a049",
            relief="raised",
            bd=3
        )


# ============================
# INTERFAZ PRINCIPAL
# ============================

class StockUI(Subject):
    """Interfaz principal para ingreso de productos."""

    def __init__(self, root):
        super().__init__()
        self.root = root
        self.root.title("Sistema de Stock - Ferretería")

        # Configuración responsive
        self.root.rowconfigure(0, weight=1)
        self.root.columnconfigure(0, weight=1)

        self.main_frame = ttk.Frame(root, padding=20)
        self.main_frame.grid(sticky="nsew")

        for i in range(6):
            self.main_frame.rowconfigure(i, weight=1)

        # Ajuste de columnas para alineación a la izquierda
        self.main_frame.columnconfigure(0, weight=0)
        self.main_frame.columnconfigure(1, weight=1)

        # Estrategia (inyectable en el futuro)
        self.strategy = DefaultInputStrategy()

        # Crear interfaz
        self._create_widgets()

    def _create_widgets(self):
        """Construcción de los elementos visuales."""

        # Campos del formulario
        self.fields = {
            "Nombre del producto": None,
            "Código": None,
            "Precio": None,
            "Cantidad": None,
            "Proveedor": None
            # Espacio separador dinámico
        }

        row = 0
        for label_text in self.fields:
            label = WidgetFactory.create_label(self.main_frame, label_text)
            entry = WidgetFactory.create_entry(self.main_frame)

            # Alineación hacia la izquierda
            label.grid(row=row, column=0, sticky="w", padx=10, pady=10)
            entry.grid(row=row, column=1, sticky="ew", padx=10, pady=10)

            self.fields[label_text] = entry
            row += 1

        # Espacio adaptable ampliado (doble fila expansible)
        self.main_frame.rowconfigure(row, weight=2)
        spacer1 = ttk.Frame(self.main_frame)
        spacer1.grid(row=row, column=0, columnspan=2, sticky="nsew")
        row += 1

        self.main_frame.rowconfigure(row, weight=2)
        spacer2 = ttk.Frame(self.main_frame)
        spacer2.grid(row=row, column=0, columnspan=2, sticky="nsew")
        row += 1

        # Botones
        self.button_frame = ttk.Frame(self.main_frame)
        self.button_frame.grid(row=row, column=0, columnspan=2, sticky="ew")

        self.button_frame.columnconfigure((0, 1), weight=1)
        self.button_frame.rowconfigure(0, weight=1)

        self.save_button = WidgetFactory.create_button(
            self.button_frame,
            "Guardar Producto",
            self._on_save
        )

        self.clear_button = WidgetFactory.create_button(
            self.button_frame,
            "Limpiar Campos",
            self._on_clear
        )

        self.save_button.grid(row=0, column=0, sticky="ew", padx=10, pady=10)
        self.clear_button.grid(row=0, column=1, sticky="ew", padx=10, pady=10)

    # ============================
    # EVENTOS (SIN LÓGICA REAL)
    # ============================

    def _on_save(self):
        """Evento de guardado (notifica a observadores)."""
        data = {key: entry.get() for key, entry in self.fields.items()}

        # Aplicación de estrategia (placeholder)
        processed_data = self.strategy.process(data)

        # Notificar a observadores
        self.notify(processed_data)

    def _on_clear(self):
        """Limpia los campos de entrada."""
        for entry in self.fields.values():
            entry.delete(0, tk.END)


# ============================
# OBSERVER DE EJEMPLO
# ============================

class ConsoleLogger(Observer):
    """Observador que imprime datos en consola (debug)."""
    def update(self, data):
        print("Datos recibidos en UI:", data)
# ============================
# OBSERVER FUCIONAL xd
# ============================
class DatabaseObserver(Observer):
    def update(self, data):
        try:
            alerta = insertar_producto(data)

            if alerta:
                messagebox.showwarning(
                    "Atención",
                    "Producto guardado, pero requiere reposición"
                )
            else:
                messagebox.showinfo(
                    "Éxito",
                    "Producto guardado correctamente"
                )

        except Exception as e:
            messagebox.showerror("Error", str(e))

