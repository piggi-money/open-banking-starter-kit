# piggi open banking — starter kit

Conecta tus cuentas bancarias chilenas con **piggi** for devs. Scrapea tus transacciones y envialas automaticamente para categorizacion ML, enriquecimiento y analitica.

## Quick start

```bash
# 1. Instalar dependencias
npm install

# 2. Copiar config de ejemplo
cp .env.example .env
cp config.json config.local.json

# 3. Configurar tu API key de piggi y credenciales bancarias
#    Edita .env y/o config.local.json

# 4. Ejecutar
npm run dev
```

## Configuracion

### API Key de piggi

Genera tu API key desde [piggi.cl](https://piggi.cl) en **Perfil > Open Banking**.

Configura via env var (recomendado):

```bash
PIGGI_API_KEY=pgd_tu_api_key
PIGGI_API_URL=https://devapi.piggi.cc
```

O en `config.json` / `config.local.json`:

```json
{
  "piggi": {
    "apiUrl": "https://devapi.piggi.cc",
    "apiKey": "pgd_tu_api_key"
  }
}
```

### Bancos

Agrega los bancos que quieras scrapear en el array `banks`. Cada banco necesita:

| Campo | Descripcion |
|-------|-------------|
| `id` | ID del banco en [open-banking-chile](https://github.com/kaihv/open-banking-chile): `estado`, `santander`, `bchile`, `bci`, `bice`, `falabella`, `itau`, `scotiabank` |
| `credentials.rut` | Tu RUT (ej: `12345678-9`) |
| `credentials.password` | Tu clave de internet banking |
| `products` | Array de productos (cuenta corriente, tarjeta, etc.) |

Las credenciales se pueden pasar via env vars para no dejarlas en archivos:

```bash
BANCO_ESTADO_RUT=12345678-9
BANCO_ESTADO_PASS=tu_clave
```

### Calendarizacion

El campo `schedule.cron` define cuando correr los scrapes automaticamente:

```json
{
  "schedule": {
    "enabled": true,
    "cron": "0 8,20 * * *"
  }
}
```

Ejemplos:
- `"0 8,20 * * *"` — 2 veces al dia (8am y 8pm)
- `"0 */6 * * *"` — cada 6 horas
- `"0 9 * * 1-5"` — lunes a viernes a las 9am

Si `enabled` es `false`, el scrape se ejecuta una sola vez y el proceso termina.

## Bancos soportados

| ID | Banco | Slug piggi |
|----|-------|------------|
| `estado` | Banco Estado | `banco_estado` |
| `santander` | Banco Santander | `banco_santander` |
| `bchile` | Banco de Chile | `banco_de_chile` |
| `bci` | BCI | `banco_bci` |
| `bice` | BICE | `banco_bice` |
| `falabella` | Banco Falabella | `banco_falabella` |
| `itau` | Banco Itau | `banco_itau` |
| `scotiabank` | Scotiabank | `scotiabank` |

## Como funciona

1. Lee la configuracion (`config.json` + env vars)
2. Por cada banco habilitado, ejecuta el scraper de [open-banking-chile](https://github.com/kaihv/open-banking-chile)
3. Transforma los movimientos al formato de **piggi** for devs
4. Genera `external_id` deterministas (SHA-256) para deduplicacion
5. Envia batches de hasta 250 transacciones a la API
6. Si el scheduler esta activo, repite segun el cron configurado

Las transacciones en **piggi** pasan por el mismo pipeline que los usuarios con banking sync: categorizacion ML, enriquecimiento Xerpa y reglas personalizadas.

## Requisitos

- Node.js 18+
- Chrome o Chromium instalado
- API key de **piggi** for devs

## Documentacion

- [developers.piggi.cc](https://developers.piggi.cc) — Documentacion completa de la API
- [open-banking-chile](https://github.com/kaihv/open-banking-chile) — Libreria de scraping bancario
