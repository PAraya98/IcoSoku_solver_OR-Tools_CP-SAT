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
        if(esquina[0] == esquina[1] == esquina[2]):# en este caso al ser las caras iguales no se toma en cuenta su rotación
            pesos_r.append([esquina[0], esquina[1], esquina[2], 0, NFicha])
        else:        
            pesos_r.append([esquina[0], esquina[1], esquina[2], 0, NFicha])             
            pesos_r.append([esquina[1], esquina[2], esquina[0], 1, NFicha])
            pesos_r.append([esquina[2], esquina[0], esquina[1], 2, NFicha])            
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
    solution_printer = SolutionPrinter(fichas, clavijas, limit=0)
    
    #solver.parameters.num_search_workers = 2
    #solver.parameters.symmetry_level = 2
    #solver.parameters.instantiate_all_variables = True
    #solver.parameters.optimize_with_max_hs = True
    #solver.parameters.randomize_search  = True
    #solution_printer = SimpleSolutionCounter(x)
    
    
    status = solver.SearchForAllSolutions(model, solution_printer)  

    if not (status == cp.FEASIBLE or status == cp.OPTIMAL):
        print("No solution found!")

    str_out = solver.ResponseStats()
    str_out += solution_printer.getSolution() 

    return str_out, solution_printer.getSolucion()
    



class SolutionPrinter(cp.CpSolverSolutionCallback):
    """SolutionPrinter"""
    def __init__(self, fichas, clavijas, limit=0):
        cp.CpSolverSolutionCallback.__init__(self)
        self.__fichas = fichas
        self.__clavijas = clavijas
        self.__limit = limit
        self.__sol_fichas = []
        self.__solution_count = 0
        self.__sol_str = ""
        self.__err_count = 0

    def OnSolutionCallback(self):

        [A,B,C,D,E,F,G,H,I,J,K,L] = self.__clavijas 

        caras =  np.array([
                    (B, A, C), (A, D, C), (A, E, D), (E, A, F), (B, F, A), 
                    (F, B, K), (G, K, B), (G, B, C), (H, G, C), (D, H, C), 
                    (I, D, E), (D, I, H), (I, E, J), (E, F, J), (F, K, J), 
                    (K, G, L), (H, L, G), (L, H, I), (L, I, J), (K, L, J) 
        ])

        c = 0
        for clavija in self.__clavijas:
            index_list = []
            j = 0
            for cara in caras:
                if clavija == cara[0]:
                    index_list.append([j,0])
                elif clavija == cara[1]:
                    index_list.append([j,1])
                elif clavija == cara[2]:
                    index_list.append([j,2])
                j = j+1
        if(clavija != sum(self.Value(self.__fichas[i][j]) for i,j in index_list)):
            self.__err_count+= 1
            print('[ERR] ERR_COUNT: %i'% self.__err_count, end=' /')
        else:
            print('[OK ] ERR_COUNT: %i'% self.__err_count, end=' /')
        c = c+1
        

        self.__solution_count += 1
        print(f"Solution #{self.__solution_count}")

           
        if self.__limit > 0 and self.__solution_count >= self.__limit:
            self.StopSearch() 
    def getSolucion(self):
        def get_solution(x):
            return [x[0], x[1], x[2]]
        return list(map(get_solution, self.__sol_fichas))

    def getSolution(self):
        return self.__sol_str

def main(clavijas):
    ''' 
        Función para ejecutar el solver.
        @param clavijas -> Arreglo de las 12 diferentes clavijas
    '''
    elementos_posibles = [1,2,3,4,5,6,7,8,9,10,11,12]
    aux = list(set(clavijas))

    if len(aux) == 12 and set(aux).issubset(set(elementos_posibles)) :
        [A,B,C,D,E,F,G,H,I,J,K,L] = clavijas
        out, sol = icosoku_solver(A,B,C,D,E,F,G,H,I,J,K,L)
        print(out,"\n")
    else:
        print("No se han ingresado las 12 clavijas correctamente!")
    
main([11, 5, 7, 2,10, 3, 4, 9, 1,12, 6, 8])