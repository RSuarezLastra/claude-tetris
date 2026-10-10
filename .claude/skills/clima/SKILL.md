---
name: clima
description: Consulta el clima actual y el pronóstico de 3 días de la ubicación local del usuario (detectada por IP) o de una ciudad indicada. Úsala cuando pidan el clima, la temperatura, si va a llover o el pronóstico.
allowed-tools: PowerShell
---

# Clima local

Obtiene el tiempo actual y el pronóstico a 3 días usando APIs gratuitas sin clave (ip-api.com para geolocalizar por IP y Open-Meteo para los datos).

## Uso

1. Si el usuario indica una ciudad, ejecuta:

   ```powershell
   powershell -NoProfile -File .claude/skills/clima/scripts/clima.ps1 -Ciudad "<ciudad>"
   ```

2. Si no indica ciudad, ejecuta sin parámetros (usa la ubicación aproximada por IP):

   ```powershell
   powershell -NoProfile -File .claude/skills/clima/scripts/clima.ps1
   ```

3. Presenta el resultado en español de forma breve: condición actual, temperatura (y sensación térmica), humedad, viento y el pronóstico de los próximos días. Si el usuario preguntó algo concreto (¿llevo paraguas?, ¿hace frío?), respóndelo directamente a partir de los datos.

## Notas

- La geolocalización por IP es aproximada (puede dar la ciudad del proveedor de internet). Si la ubicación parece incorrecta, indícalo y ofrece repetir con `-Ciudad`.
- Si el script falla por falta de conexión o por una API caída, informa del error tal cual; no inventes datos del clima.
- Las temperaturas están en °C y el viento en km/h.
