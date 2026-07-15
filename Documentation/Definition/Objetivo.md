# OBJETIVO GENERAL
quiero hacer una web que me permita leer señales en tiempo real y en historico, estos dashboard se configuran mediante una vista que permite la edicion.

# Descripcion de los componentes

# simulador
El simulador genera 6 señales, que siguen estos parametros de base.
El simulador es un servicio que se levanta en cuanto se levanta el contenedor.
la descripcion de las señales se guardara en un json
durante las pruebas se modificaran datos de la tabla para comprobar la conectividad, pero para ello se reiniciaran los servicios.

| Señales | Unidad | tipo | Min | Max | Frecuencia | Tipo grafica |
| --- | --- | --- | --- | --- | --- | --- |
| Gen_RPM | RPM | Float | 0 | 2000 | 0,5 sg | triangular |
| hydrolic_temp | °C | float | -15 | 60 | 1 sg | sinuidal seno |
| Gear_oil_temp | °C | float | -20 | 40 | 1 sg | sinuidal coseno |
| Blades_PitchAngle | º | float | 0 | 360 | 2 sg | pulsos |
| Windspeed | m/s | float | 0 | 50 | 1 sg | cuadrada |
| Prod_pwr | kW | Float | 0 | 500 | 5 sg | triangular |
# WEB arquitectura

# pipeline realtime
Plantearemos una comunicacion websocket con el simulador y las señales entran desde el mismo
el servicio recibe del simulador una tabla con las variables y los datos que planteamos menos el de tipo de grafica
este dato debe ser dinamico
# pipeline historico

## BBDD historian
en una bbdd postgres creamos un historico con variables para las señales, que sean equivalentes a 4 dias de timestamp, cada uno tendra tantas entradas como lo que represente su frecuencia, y un timestamp adecuado a esto.
en estas señales los valores seran tipo random 

## comunicacion BBDD-web
consultas a la bbdd mediante api


# Web funcionalidades

## main
listado de los dashboards disponibles, sera una tabla donde nos describe el nombre, la descripcion,si es realtime o historico,acceder al editor (abre el editor con la configuracion asociada y podremos modificar y guardar), boton de eliminar con icono de papelera, una vez lo pulsamos nos pide confirmacion.

# editor
La funcion de esta vista es poder diseñar un dashboard de manera dinamica, para ello utilizaremos react, React-Grid-Layout para modificar el tamaño y la ubicacion de las graficas generadas y para las graficas echarts apache

### menu lateral
en el lateral tendremos un menu de las 
nombre: definir un nombre, si no por defecto se llamara dashboarXX donde XX es el numero de su id
descripcion: un campo texto con una longitud de 500 caracteres.
Pipeline de datos: [realtime o historian]
Señales:([despues de decidir el pipeline debemos recordar que las señales de pipeline realtime, pueden ser modificadas por lo que deben sincronizarse con la declaracion, las de historian leeran las que esten en la tabla del historian]
[podremos añadir varias señales en una grafica, cuando sea el caso escogeremos el color de los siguiente (azul marino, rojo, verde, amarillo, negro)])
tipo de grafica: ([en historian: Large scale area chart], [realtime: Smoothed Line Chart, Stacked Line Chart, Simple Gauge, Temperature Gauge chart] cuando sean mas de una señal, se adecua al caso mas extremo, en todas las graficas debemos poder hacer zoom, de echarts apache)
range grafica(
[realtime: tenemos un parametro fijo de lecturas de los ultimos 15 minutos]
[historian: tenedremos una serie de botones para configurar de que fecha a que fecha y de que hora a que hora]
)

una vez elegido todo se pulsa boton de lanzar widget y se crea la grafica en el grid, 
boton de guardar el dashboard
### layout
debemos poder mover y estirar o encoger la grafica como queramos.
debemos poder añadir o eliminar el elemento.
una vez definido donde va a ir el elemento, tendremos un boton de guardado
que es el que genera la vision estatica de donde va cada elemento y da de alta en el main la vista.


## vista fija
Al clickar en una de las vistas desde main veremos el dashboar tal como lo hemos definido en el editor
si es en tiempo real tendremos las señales moviendose segun llegan las nuevas señales.
si es estatico sera un exploratorio estatico


# stack tecnico
todo debe estar dockerizado
usaremos python
react
React-Grid-Layout
echarts apache



