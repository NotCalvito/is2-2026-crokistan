from Interfaz_ferreteria_TP1 import StockUI, ConsoleLogger, DatabaseObserver

# - StockUI → la interfaz gráfica
# - ConsoleLogger → observer para debug (imprime en consola)
# - DatabaseObserver → observer que guarda en la base de datos
import tkinter as tk 

root = tk.Tk()  
app = StockUI(root) #Abre la interfaz

app.add_observer(ConsoleLogger())
app.add_observer(DatabaseObserver())

root.mainloop()