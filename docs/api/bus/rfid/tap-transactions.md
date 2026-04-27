# API Docs: Tap Transactions

## Endpoint

- Method: `POST`
- URL: `/api/bus/rfid/tap-transactions`
- Content-Type: `application/json`

## Description

Endpoint ini mencatat transaksi tap kartu RFID pada bus.

Aturan utama:

- Jika kartu sedang di luar bus (`isInside = false`) maka request diproses sebagai `TAP_IN`.
- Jika kartu sedang di dalam bus (`isInside = true`) maka request diproses sebagai `TAP_OUT`.
- Saat `TAP_IN`, saldo kartu akan dipotong sebesar tarif tetap.
- Saat `TAP_IN`, request ditolak jika bus sudah penuh.
- Saat `TAP_OUT`, kartu wajib tap out di bus yang sama dengan `lastBusId`.

## Request Body

```json
{
  "rfidTag": "CARD-001",
  "busId": "cmabc123",
  "deviceKey": "device-secret-key",
  "latitude": -7.289,
  "longitude": 112.734
}
```

### Fields

- `rfidTag` (string, required): RFID tag kartu.
- `busId` (string, required): ID bus tempat tap terjadi.
- `deviceKey` (string, required): Device key yang harus cocok dengan IoT device bus.
- `latitude` (number, optional): Koordinat latitude saat tap.
- `longitude` (number, optional): Koordinat longitude saat tap.

## Success Response

- HTTP Status: `201`
- Format:

```json
{
  "success": true,
  "data": {
    "action": "TAP_IN",
    "transaction": {
      "id": "f7f7d2f0-1111-2222-3333-123456789abc",
      "type": "IN",
      "amount": 2500,
      "latTap": -7.289,
      "lngTap": 112.734,
      "createdAt": "2026-04-27T09:35:00.000Z",
      "rfidTag": "CARD-001",
      "busId": "cmabc123",
      "stationName": null
    },
    "card": {
      "id": "1e9fd7a8-1111-2222-3333-123456789abc",
      "rfidTag": "CARD-001",
      "isInside": true,
      "lastBusId": "cmabc123",
      "user": {
        "name": "Budi"
      }
    },
    "bus": {
      "id": "cmabc123",
      "passengerCount": 24
    }
  },
  "message": "Tap in recorded",
  "meta": null
}
```

Catatan:

- Jika kartu tidak terhubung user, maka `card.user` bernilai `null`.
- `action` bisa `TAP_IN` atau `TAP_OUT`.
- `transaction.type` akan mengikuti aksi: `IN` untuk tap in, `OUT` untuk tap out.

## Error Responses

Semua error menggunakan format standar API:

```json
{
  "success": false,
  "data": null,
  "message": "Error message",
  "meta": {},
  "errors": [
    {
      "key": "ERROR_KEY",
      "field": "fieldName",
      "message": "Human readable message"
    }
  ]
}
```

### 400 Bad Request

- `VALIDATION_ERROR`
- Penyebab umum:
  - body tidak sesuai schema
  - tipe data tidak valid

### 401 Unauthorized

- `UNAUTHORIZED`
- Penyebab umum:
  - `deviceKey` tidak valid

### 403 Forbidden

- `FORBIDDEN`
- Penyebab umum:
  - device tidak terhubung ke bus pada `busId` yang dikirim

### 404 Not Found

- `NOT_FOUND`
- Penyebab umum:
  - kartu RFID tidak ditemukan
  - bus tidak ditemukan

### 405 Method Not Allowed

- `METHOD_NOT_ALLOWED`
- Penyebab umum:
  - method selain `POST`

### 409 Conflict

- `INVALID_TAP_OUT_BUS`
  - tap out dilakukan di bus berbeda dari `lastBusId`
- `BUS_FULL`
  - saat tap in, kapasitas bus sudah penuh (`passengerCount >= maxPassengers`)
- `INSUFFICIENT_BALANCE`
  - saat tap in, saldo kartu kurang dari tarif

Contoh `BUS_FULL`:

```json
{
  "success": false,
  "data": null,
  "message": "Bus is full",
  "meta": {
    "passengerCount": 50,
    "maxPassengers": 50
  },
  "errors": [
    {
      "key": "BUS_FULL",
      "field": "busId",
      "message": "Bus is full"
    }
  ]
}
```

### 500 Internal Server Error

- `INTERNAL_SERVER_ERROR`
- Penyebab umum:
  - error tak terduga saat proses transaksi database

## Business Constants

- Tarif tap in tetap: `2500`

## Notes for Device/Firmware Integration

- Kirim `deviceKey` yang valid untuk device aktif pada bus terkait.
- Kirim `latitude`/`longitude` jika tersedia untuk jejak lokasi tap.
- Pastikan retry request di-handle dengan hati-hati agar tidak melakukan tap ganda tanpa kontrol di sisi device.
