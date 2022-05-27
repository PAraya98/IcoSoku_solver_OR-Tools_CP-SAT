from ortools.sat.python import cp_model as cp
import numpy as np
import json
from flask import Flask, jsonify
from flask_cors import CORS

#SOLVER
def icosoku_solver(A,B,C,D,E,F,G,H,I,J,K,L):
    model = cp.CpModel()

    #La siguiente matriz 2D guardara todas las caras que tiene el icosoku un total de 20.

    pesos = np.array([   (0,0,0), (0,0,1), (0,0,2), (0,0,3), (0,1,1), 
                (0,1,2), (0,1,2), (0,1,2), (0,2,1), (0,2,1), 
                (0,2,1), (0,2,2), (0,3,3), (1,1,1), (1,2,3), 
                (1,2,3), (1,3,2), (1,3,2), (2,2,2), (3,3,3)
            ])

    #La siguiente lista guarda todos los posibles giros de cada cara y un contador
    #pesos_r=[PuntosEsquina1,PuntosEsquina2,PuntosEsquina3,rotación,NumeraciónCara]
    #La rotación puede tomar 3 valores que indicaran el giro que tendran para orientar su ubicación: 0=0° , 1=120° y 2=240°
    pesos_r = []

    #NFicha: sera un contador de 0 a 19 enumerando cada cara del ikosoku
    NFicha=0
    for esquina in pesos:
        [a, b, c] = esquina
        if(a == b == c):# en este caso al ser las caras iguales no se toma en cuenta su rotación
            pesos_r.append([a, b, c, 0, NFicha])
        else:        
            pesos_r.append([a, b, c, 0, NFicha])             
            pesos_r.append([b, c, a, 1, NFicha])
            pesos_r.append([c, a, b, 2, NFicha])            
        NFicha = NFicha + 1

    fichas = []  #Usara el paquete ortools guardando los posibles valores que pueden tener cada esquina de una cara, su rotación y su enumeración           
    for i in range(20):
        fila = []
        for Puntos in range(3):
            fila.append(
                model.NewIntVar(0, 3, "Esquina(%i)" % (Puntos+1))
            ) 
        fila.append(
                model.NewIntVar(0, 2, "Rotación(%i)" % (i+1))
        ) 
        fila.append(
                model.NewIntVar(0, 19, "Ficha(%i)" % (i+1))
        ) 
        fichas.append(fila)

    def get_var_ficha(x):
        return x[4]

    model.AddAllDifferent(list(map(get_var_ficha, fichas)))

    #Restringe las posibilidades de la lista "fichas" para que esten acorde a las caras reales que existen.
    for i in range(20):
        model.AddAllowedAssignments(fichas[i], pesos_r)

    #Restricción de la suma

    #Los valores de la A hasta la L, tomaran los valores de las 12 clavijas

    clavijas = [A,B,C,D,E,F,G,H,I,J,K,L]

    caras =  np.array([
                (B, A, C), (A, D, C), (A, E, D), (E, A, F), (B, F, A), 
                (F, B, K), (G, K, B), (G, B, C), (H, G, C), (D, H, C), 
                (I, D, E), (D, I, H), (I, E, J), (E, F, J), (F, K, J), 
                (K, G, L), (H, L, G), (L, H, I), (L, I, J), (K, L, J) 
             ])

    for clavija in clavijas: #Se pasa por cada clavija segun su número
        CaraEsquina = [] #Ubicara el numero de cara y su numero de rotación que estaran adyacentes a las clavijas
        j = 0
        for cara in caras:
            if clavija == cara[0]:
                CaraEsquina.append([j,0])
            elif clavija == cara[1]:
                CaraEsquina.append([j,1])
            elif clavija == cara[2]:
                CaraEsquina.append([j,2])
            j = j+1
        model.Add(sum((fichas[i][j] for i,j in CaraEsquina)) == clavija)# Regla de igualar el numero de clavija a la suma de todos los puntos 
        #de las caras seleccionadas con su especifica esquina

    ###################PRINTER#########################

    solver = cp.CpSolver()
    status = solver.Solve(model)
    solution_printer = SolutionPrinter(fichas, limit=1)
    
    #solver.parameters.num_search_workers = 2
    #solver.parameters.symmetry_level = 2
    #solver.parameters.instantiate_all_variables = True
    #solver.parameters.optimize_with_max_hs = True
    #solver.parameters.randomize_search  = True
    #solution_printer = SimpleSolutionCounter(x)
    
    
    solver.Solve(model, solution_printer)  

    str_out = solver.ResponseStats()
    str_out += solution_printer.getSolution() 

    return str_out, solution_printer.getSolucion()
    



class SolutionPrinter(cp.CpSolverSolutionCallback):
    """SolutionPrinter"""
    def __init__(self, fichas, limit=0):
        cp.CpSolverSolutionCallback.__init__(self)

        self.__fichas = fichas
        self.__limit = limit
        self.__sol_fichas = []
        self.__solution_count = 0
        self.__sol_str = ""

    def OnSolutionCallback(self):
        
        caras_str = [   'BAC', 'ADC', 'AED', 'EAF', 'BFA', 
                        'FBK', 'GKB', 'GBC', 'HGC', 'DHC', 
                        'IDE', 'DIH', 'IEJ', 'EFJ', 'FKJ', 
                        'KGL', 'HLG', 'LHI', 'LIJ', 'KLJ'
                    ]

        self.__solution_count += 1

        
        self.__sol_str += f"Solution #{self.__solution_count}" + "\n"

        for i in range(20):
            self.__sol_str += caras_str[i] + " "
            for j in range(3):
                self.__sol_str += "%3i" % self.Value(self.__fichas[i][j]) + " "
            self.__sol_str += "  P: %2i"%self.Value(self.__fichas[i][4]+1) + " "
            if(self.Value(self.__fichas[i][3]) == 0):
                self.__sol_str += "R: 0°" + " "
            elif(self.Value(self.__fichas[i][3]) == 1):
                self.__sol_str += "R: 120°" + " "
            elif(self.Value(self.__fichas[i][3]) == 2):
                self.__sol_str += "R: 240°" + " "
            self.__sol_str += "\n"
            self.__sol_fichas.append(
                    [   self.Value(self.__fichas[i][0]),
                        self.Value(self.__fichas[i][1]),
                        self.Value(self.__fichas[i][2]),
                        self.Value(self.__fichas[i][3]),
                        self.Value(self.__fichas[i][4]) 
                    ]                
            )           
        if self.__limit > 0 and self.__solution_count >= self.__limit:
            self.StopSearch() 

    def getSolucion(self):
        def get_solution(x):
            return [x[0], x[1], x[2]]
        return list(map(get_solution, self.__sol_fichas))

    def getSolution(self):
        return self.__sol_str

#API

app = Flask(__name__)
CORS(app)

@app.route("/ico")
@app.route("/ico/")
@app.route("/ico/<string:parametros>")

def icosoku(parametros = None):
    elementos_posibles = [1,2,3,4,5,6,7,8,9,10,11,12]

    clavijas = list(map(int, parametros.split(',')))
    aux = list(set(list(map(int, parametros.split(',')))))

    if len(clavijas) == 12 and set(aux).issubset(set(elementos_posibles)) :
        [A,B,C,D,E,F,G,H,I,J,K,L] = clavijas
        out, sol = icosoku_solver(A,B,C,D,E,F,G,H,I,J,K,L)
        print(out,"\n")
        return jsonify( 
                soluciones = sol,
                output = out
            )
    else:
        return jsonify( 
            mensaje = "No se han ingresado las 12 clavijas correctamente!"
            )

if __name__ == '__main__':
    app.run(debug=True, port=4500 ,  host='0.0.0.0')