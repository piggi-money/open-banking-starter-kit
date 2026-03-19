<p align="center">
  <img src="https://avatars.githubusercontent.com/u/240262621?s=400&u=6abcdb43e769f978200e6ba3bd259e0819c02a69&v=4" alt="piggi" width="80" />
</p>

<h1 align="center">piggi open banking starter kit</h1>

<p align="center">
  <strong>Tu scraper. Nuestra experiencia. Tus finanzas categorizadas en segundos.</strong>
</p>

<p align="center">
  <a href="https://developers.piggi.cc">Documentacion</a> ·
  <a href="https://piggi.cl">Crear cuenta</a> ·
  <a href="https://github.com/kaihv/open-banking-chile">open-banking-chile</a>
</p>

---

## Que hace esto

Conecta cualquier cuenta bancaria chilena con **piggi** en 4 pasos. Este starter kit scrapea tus transacciones y las envia automaticamente a la API de **piggi** for devs, donde pasan por el mismo pipeline que usan todos nuestros usuarios:

```
Tu banco → Scraper local → API piggi → Categorizacion ML + Enriquecimiento Premium + Reglas → App piggi
```

> Las transacciones aparecen categorizadas en tu cuenta de **piggi** como si tuvieras banking sync nativo.

---

## Quick start

```bash
git clone https://github.com/piggi-money/open-banking-example.git
cd open-banking-example
npm install
```

```bash
cp .env.example .env
```

Edita `.env` con tu API key y credenciales:

```bash
PIGGI_API_URL=https://devapi.piggi.cc
PIGGI_API_KEY=pgd_tu_api_key

BCI_RUT=12345678-9
BCI_PASS=tu_clave
```

```bash
npm run dev
```

```
=== piggi open banking — 19-03-2026, 8:00:00 a. m. ===
Banks: bci
API: https://devapi.piggi.cc

[bci] Starting scrape...
  [bci] Logging in...
  [bci] Extracting movements...
[bci] Found 49 movements
[bci] Cuenta Corriente (account): 42 transactions
[bci] Cuenta Corriente — batch 1/1 (42 txs)...
[bci] Cuenta Corriente — 42 processed, 0 duplicates, 0 errors — COMPLETED
[bci] Tarjeta de Credito (credit_card_unbilled): 7 transactions
[bci] Tarjeta de Credito — batch 1/1 (7 txs)...
[bci] Tarjeta de Credito — 7 processed, 0 duplicates, 0 errors — COMPLETED

=== Done ===
```

---

## Configuracion

### API Key

Genera tu API key desde [piggi.cl](https://piggi.cl) → **Perfil** → **Open Banking**.

```bash
PIGGI_API_KEY=pgd_tu_api_key
```

> La key se muestra una sola vez. Guardala en un lugar seguro.

### Bancos

Agrega bancos en `config.json`. Las credenciales van en env vars:

```json
{
  "banks": [
    {
      "id": "bci",
      "enabled": true,
      "credentials": { "rut": "", "password": "" }
    },
    {
      "id": "santander",
      "enabled": true,
      "credentials": { "rut": "", "password": "" },
      "options": { "headful": true }
    }
  ]
}
```

```bash
# Las env vars sobreescriben las credenciales del config
BCI_RUT=12345678-9
BCI_PASS=tu_clave
SANTANDER_RUT=12345678-9
SANTANDER_PASS=tu_clave
```

> `headful: true` abre el browser visible — necesario para bancos con 2FA (Santander, BancoEstado).

### Env vars por banco

El prefijo es el `id` del banco en mayusculas:

| Banco | RUT | Password |
|-------|-----|----------|
| Banco Estado | `ESTADO_RUT` | `ESTADO_PASS` |
| Santander | `SANTANDER_RUT` | `SANTANDER_PASS` |
| Banco de Chile | `BCHILE_RUT` | `BCHILE_PASS` |
| BCI | `BCI_RUT` | `BCI_PASS` |
| BICE | `BICE_RUT` | `BICE_PASS` |
| Falabella | `FALABELLA_RUT` | `FALABELLA_PASS` |
| Itau | `ITAU_RUT` | `ITAU_PASS` |
| Scotiabank | `SCOTIABANK_RUT` | `SCOTIABANK_PASS` |

### Scheduler

Corre los scrapes automaticamente:

```json
{
  "schedule": {
    "enabled": true,
    "cron": "0 8,20 * * *"
  }
}
```

| Cron | Frecuencia |
|------|------------|
| `0 8,20 * * *` | 2x al dia (8am y 8pm) |
| `0 */6 * * *` | Cada 6 horas |
| `0 9 * * 1-5` | Lunes a viernes 9am |
| `30 7 * * *` | Todos los dias 7:30am |

> Con `"enabled": false` el scrape corre una sola vez y el proceso termina.

---

## Bancos soportados

| ID | Banco | 2FA | Notas |
|----|-------|-----|-------|
| `estado` | Banco Estado | Si | Requiere `headful: true` |
| `santander` | Banco Santander | Si | Clave dinamica |
| `bchile` | Banco de Chile | — | |
| `bci` | BCI | — | |
| `bice` | BICE | — | |
| `falabella` | Banco Falabella | — | |
| `itau` | Banco Itau | — | |
| `scotiabank` | Scotiabank | — | |

Powered by [open-banking-chile](https://github.com/kaihv/open-banking-chile).

---

## Como funciona

```
config.json + .env
       |
       v
  Por cada banco habilitado:
       |
       v
  ┌─────────────────────────┐
  │  open-banking-chile     │
  │  Scrape automatico      │
  │  Extrae movimientos     │
  └────────────┬────────────┘
               |
               v
  ┌─────────────────────────┐
  │  Transformacion         │
  │  Agrupa por producto    │
  │  Genera external_id     │
  │  (SHA-256 determinista) │
  └────────────┬────────────┘
               |
               v
  ┌─────────────────────────┐
  │  API piggi for devs     │
  │  POST /v1/transactions  │
  │  Batches de hasta 250   │
  │  Deduplicacion auto     │
  └────────────┬────────────┘
               |
               v
  ┌───────────────────────────┐
  │  Pipeline piggi           │
  │  Categorizacion ML        │
  │  Enriquecimiento Premium  │  
  │  Reglas personalizadas    │
  └───────────────────────────┘
               |
               v
       App piggi — tus
    transacciones categorizadas
```

**Deduplicacion:** Cada transaccion genera un `external_id` determinista con SHA-256. Si reenvias un batch, las transacciones que ya existen se ignoran automaticamente. Es seguro ejecutar el scraper multiples veces.

**Productos automaticos:** No necesitas configurar productos. El scraper detecta automaticamente cuentas corrientes y tarjetas de credito, y envia un batch separado por cada tipo.

---

## Requisitos

- **Node.js** 18+
- **Chrome** o Chromium instalado
- **API key** de [piggi for devs](https://piggi.cl)

---

## Estructura del proyecto

```
├── config.json        Bancos, schedule, API URL
├── .env               Credenciales (gitignored)
├── src/
│   ├── index.ts       Entry point + scheduler
│   ├── config.ts      Carga config + env overrides
│   ├── scraper.ts     Scrape → transforma → envia
│   ├── piggi.ts       Cliente HTTP para la API
│   ├── hash.ts        SHA-256 para external_id
│   └── types.ts       TypeScript types
```

---

## Links

| | |
|---|---|
| **API Docs** | [developers.piggi.cc](https://developers.piggi.cc) |
| **App** | [piggi.cl](https://piggi.cl) |
| **Scraper** | [open-banking-chile](https://github.com/kaihv/open-banking-chile) |
| **Licencia** | MIT |
