# Attendance Frontend Auth Fix

## Muammo

Attendance GET API lar endi `X-Attendance-Key` ishlatmaydi.

Frontend hozir token yubormayotgani uchun backend quyidagini qaytaryapti:

```json
{
  "detail": "Token yuborilmagan. Authorization header kerak."
}
```

## Kerakli fix

Quyidagi GET requestlarda login access token yuborilsin:

- `GET /attendance/daily-records`
- `GET /attendance/daily-records/{employee_id}/{attendance_date}`
- `GET /attendance/users`

Header:

```http
Authorization: Bearer <access_token>
```

## Misol

```ts
await api.get("/attendance/daily-records", {
  params: {
    year: 2026,
    month: 8,
    page: 1,
    page_size: 100,
  },
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

Yaxshiroq variant: axios/fetch interceptor ichida barcha CIMS API requestlarga token avtomatik qo'shilsin.

## Muhim

`X-Attendance-Key` faqat qurilma/write endpointlar uchun qolgan:

- `POST /attendance/daily-records/bulk-upsert`
- `PUT /attendance/daily-records/{employee_id}/{attendance_date}`
- `PATCH /attendance/daily-records/{employee_id}/{attendance_date}`
- raw event upload endpointlar

Frontend read-only attendance sahifasida `X-Attendance-Key` kerak emas.
