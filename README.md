# Hoja de Personaje — D&D 2024

Hoja de personaje interactiva para Dungeons & Dragons, actualizada a las
reglas de la revisión de **2024** (Player's Handbook 2024 / SRD 5.2).
Es una app web estática (HTML/CSS/JS puro, sin dependencias ni build),
pensada para usarse directamente en el navegador o alojarse en GitHub Pages.

## Cómo usarla

Abre `index.html` en cualquier navegador (no requiere servidor, aunque
funciona igual si lo sirves con `python3 -m http.server`).

- Elige **Clase**, **Especie** y **Trasfondo** en el encabezado.
- Pulsa **"Aplicar bonificaciones de Especie/Trasfondo/Clase"** para que la
  hoja rellene automáticamente: salvaciones competentes, habilidades del
  trasfondo, dote de origen, incremento de características (+2/+1),
  velocidad de la especie, equipo inicial y rasgos.
- Todos los modificadores (característica, salvaciones, habilidades,
  iniciativa, percepción pasiva, CD y bonif. de ataque de conjuros) se
  recalculan solos según el **nivel** y el bonificador de competencia.
- **Guardar/Cargar** usa el almacenamiento local del navegador.
  **Exportar/Importar JSON** permite mover el personaje entre dispositivos
  o hacer copia de seguridad.
- **Imprimir** genera una versión en 3 páginas (combate, trasfondo/historia,
  conjuros) lista para imprimir en PDF.

## Resumen de las novedades de reglas 2024 que aplica la hoja

La revisión de 2024 (a veces llamada informalmente "5.5e") reorganiza de
dónde vienen los bonificadores de un personaje:

- **Las especies (antes "razas") ya no dan bonificadores de característica.**
  Solo aportan talla, velocidad y rasgos (visión en la oscuridad,
  resistencias, rasgos especiales, etc.).
- **El trasfondo es quien da el incremento de características**: +2 a una
  característica y +1 a otra (o +1/+1/+1 a tres), elegidas entre 3 opciones
  fijas por trasfondo. También otorga 2 competencias en habilidades, una
  herramienta y equipo inicial.
- **Todos los personajes reciben una "Dote de Origen" gratis a nivel 1**,
  concedida por el trasfondo (Alerta, Habilidoso, Afortunado, Resistente,
  Iniciado en la Magia, etc.).
- El bonificador de competencia por nivel, las 18 habilidades y sus
  características asociadas, y las salvaciones por clase **no cambiaron**
  respecto a las reglas de 2014.
- Se añaden **Maestrías de Arma** (propiedades especiales al ser competente
  con un arma) y se ajustan varias clases (p. ej. Explorador, Brujo,
  Guerrero, Bárbaro) — no representadas en detalle en esta hoja, que se
  centra en los cálculos generales de la ficha.

Los datos de especies, trasfondos, clases y dotes están en
[`js/data.js`](js/data.js), resumidos/parafraseados a partir del **SRD 5.2**
de D&D 2024. El SRD 5.2 se publicó bajo licencia **Creative Commons
CC-BY-4.0**, por lo que su contenido de reglas puede usarse libremente
(incluso comercialmente) citando la fuente:

> Contenido de reglas basado en el System Reference Document 5.2 (SRD 5.2)
> de Wizards of the Coast, LLC, disponible bajo licencia
> [CC-BY-4.0](https://creativecommons.org/licenses/by/4.0/).

## Estructura del proyecto

```
index.html      Estructura de la hoja (3 páginas: combate, historia, conjuros)
css/style.css   Estilos (tema claro/oscuro automático, diseño imprimible)
js/data.js      Datos de reglas: habilidades, características, clases,
                especies, trasfondos, dotes de origen, alineamientos
js/app.js       Lógica: cálculo de modificadores, render dinámico,
                guardar/cargar/exportar/importar, tabla de ataques y conjuros
```

## Limitaciones conocidas

- Los rasgos de clase y subclase no están detallados nivel a nivel (más allá
  de dado de golpe, salvaciones y característica de conjuros); se documentan
  a mano en el campo "Rasgos y Habilidades".
- Las listas de conjuros no están precargadas; se añaden manualmente por
  nivel de conjuro.
- Es una herramienta de ficha, no un validador de reglas: no impide superar
  límites de característica ni fuerza combinaciones ilegales.
