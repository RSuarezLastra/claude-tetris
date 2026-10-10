param(
    [string]$Ciudad = ""
)

# Obtiene el clima actual y el pronóstico de 3 días.
# Sin parámetros usa la ubicación aproximada por IP; con -Ciudad geocodifica ese nombre.
# APIs gratuitas y sin clave: ip-api.com, open-meteo.com.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

if ($Ciudad) {
    $geo = Invoke-RestMethod "https://geocoding-api.open-meteo.com/v1/search?name=$([uri]::EscapeDataString($Ciudad))&count=1&language=es"
    if (-not $geo.results) { Write-Error "No se encontró la ciudad '$Ciudad'"; exit 1 }
    $lat = $geo.results[0].latitude
    $lon = $geo.results[0].longitude
    $lugar = "$($geo.results[0].name), $($geo.results[0].country)"
} else {
    $ip = Invoke-RestMethod "http://ip-api.com/json/?fields=status,message,city,country,lat,lon"
    if ($ip.status -ne 'success') { Write-Error "No se pudo geolocalizar por IP: $($ip.message)"; exit 1 }
    $lat = $ip.lat
    $lon = $ip.lon
    $lugar = "$($ip.city), $($ip.country) (por IP)"
}

$url = "https://api.open-meteo.com/v1/forecast?latitude=$lat&longitude=$lon" +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,wind_speed_10m,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&forecast_days=3&timezone=auto"
$w = Invoke-RestMethod $url

$codigos = @{
    0='Despejado'; 1='Mayormente despejado'; 2='Parcialmente nublado'; 3='Nublado'
    45='Niebla'; 48='Niebla con escarcha'
    51='Llovizna ligera'; 53='Llovizna'; 55='Llovizna intensa'
    61='Lluvia ligera'; 63='Lluvia'; 65='Lluvia intensa'
    71='Nieve ligera'; 73='Nieve'; 75='Nieve intensa'
    80='Chubascos ligeros'; 81='Chubascos'; 82='Chubascos fuertes'
    95='Tormenta'; 96='Tormenta con granizo'; 99='Tormenta fuerte con granizo'
}
function Desc($c) { if ($codigos.ContainsKey([int]$c)) { $codigos[[int]$c] } else { "Código $c" } }

$c = $w.current
$u = $w.current_units
Write-Output "Ubicación: $lugar"
Write-Output "Ahora: $(Desc $c.weather_code)"
Write-Output "Temperatura: $($c.temperature_2m)$($u.temperature_2m) (sensación $($c.apparent_temperature)$($u.apparent_temperature))"
Write-Output "Humedad: $($c.relative_humidity_2m)$($u.relative_humidity_2m)"
Write-Output "Viento: $($c.wind_speed_10m) $($u.wind_speed_10m)"
Write-Output "Precipitación: $($c.precipitation) $($u.precipitation)"
Write-Output ""
Write-Output "Pronóstico:"
for ($i = 0; $i -lt $w.daily.time.Count; $i++) {
    $d = $w.daily
    Write-Output "  $($d.time[$i]): $(Desc $d.weather_code[$i]), mín $($d.temperature_2m_min[$i])° / máx $($d.temperature_2m_max[$i])°, lluvia $($d.precipitation_probability_max[$i])%"
}
