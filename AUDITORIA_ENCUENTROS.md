# Auditoría de encuentros de PokéLockes

**Fecha:** 11/11/2026  
**Juego:** Pokémon Escarlata, *La máscara turquesa* y *El disco índigo*.

## Fuente y alcance

- **Pokéarth de Serebii (fuente no oficial)**: [Paldea](https://www.serebii.net/pokearth/paldea/), [Kitakami](https://www.serebii.net/pokearth/kitakami/) y [Terarium](https://www.serebii.net/pokearth/terarium/).
- Tipos y líneas evolutivas: tablas públicas de [PokéAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv).
- Se revisaron **52 páginas de áreas** en las **53 zonas** representadas en el diario. **Hondonada de la Columna / Colonnade Hollow** no tiene una ficha independiente en el índice utilizado; se muestra sin candidatos contrastados en lugar de inventarlos.
- El archivo generado `verified-encounters.js` contiene las sugerencias contrastadas de los 18 tipos; en total **3.720 entradas tipo × área × especie**. El mismo Pokémon puede aparecer en varias zonas y tipos: esto no representa 3.720 especies únicas.
- Se excluyen las especies exclusivas de **Púrpura** de las sugerencias para **Escarlata**; se incluyen preevoluciones con evolución al tipo elegido.
- **Tauros de Paldea de variedad ardiente** se identifica como una forma rara exclusiva de Escarlata. **Basculin de raya blanca** se etiqueta de forma específica en Soto Sempiterno (Timeless Woods) para su evolución a Basculegion.

## Precauciones

Pokémon/Nintendo no proporciona aquí una tabla oficial exhaustiva de encuentros por cada área. Serebii ofrece **apariciones asociadas a zonas**, no una garantía de que cualquier punto de la zona tenga esa especie. Las formas, niveles, horarios, clima, apariciones especiales y condiciones de desbloqueo pueden restringir un encuentro. Una especie que no aparezca en la tabla no queda demostrada imposible.

En el Biodomo, algunos iniciales salvajes requieren ampliaciones de biodiversidad. Las listas siguen siendo orientativas y no sustituyen comprobar la captura en el juego.

## Reproducir revisión

- Script: [`scripts/audit_pokearth.py`](scripts/audit_pokearth.py)
- Dataset versionado: [`verified-encounters.js`](verified-encounters.js)
- Flujo de auditoría: [`.github/workflows/encounters-audit.yml`](.github/workflows/encounters-audit.yml)

La revisión solo afecta a **sugerencias de encuentros**, no a capturas registradas, diarios ni sincronización Supabase. 
