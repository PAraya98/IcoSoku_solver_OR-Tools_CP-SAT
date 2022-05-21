# IcoSoku solver with OR-Tools CP-SAT

Un agente resolutor de instancias del puzzle [IcoSoKu](https://en.wikipedia.org/wiki/Icosoku) realizado en Python con la suite de [OR-Tools](https://developers.google.com/optimization) con un modelo [CP-SAT](https://developers.google.com/optimization/cp).

Para la creación de este proyecto se utilizó como referencia el proyecto [nrizzo/3coSoKu](https://github.com/nrizzo/3coSoKu), además de una modificación del [visor 3D del icoSoku](https://nrizzo.github.io/3coSoKu/) para ver las soluciones entregadas por el resolutor de OR-Tools desarrollado.

## Requeriments:
Para el usó de este repositorio se requiere del siguiente software:

* Python 3.6^
* Python package manager PIP

## Instrucciones:
Siga las siguientes instrucciones para ejecutar el proyecto.

1. Clonar el repositorio:
``` 
$ git clone https://github.com/PAraya98/IcoSokuSolver.git
```
2. Instalar las dependencias:
``` 
$ pip install flask-cors ortools numpy
```
3. Ejecutar el Script de Python `IcoSokuSolver (API+Solver).py` que se encuentra en la raíz del repositorio.
``` 
$ python IcoSokuSolver (API+Solver).py
```
4. Abrir el `.html` del vizualizador 3D en su navegador web de preferencia`./IcoSoku_Solver (OR-Tools)/3coSoku viewer/index.html`.