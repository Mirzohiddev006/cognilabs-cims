# CognilabsAI Frontend: Instagram Media Context, AI Stage, AI Follow-Up

Bu hujjat oxirgi backend o'zgarishlari uchun frontend integratsiya yo'riqnomasi.

## 1. Instagram Media Context Page

Yangi page kerak:

```text
CognilabsAI -> Instagram Media Contexts
```

Bu page orqali admin story/post/reel link qo'shadi va AI uchun izoh yozadi. Mijoz DMda shu story/post/reel bo'yicha yozsa, AI shu contextni bilib javob beradi.

## API Endpoints

Base:

```text
/cognilabsai/chat/instagram/media-contexts
```

List:

```http
GET /cognilabsai/chat/instagram/media-contexts?limit=50&offset=0&active=true
```

Response:

```json
{
  "items": [
    {
      "id": 1,
      "media_type": "reel",
      "url": "https://www.instagram.com/reel/ABC",
      "normalized_url": "https://www.instagram.com/reel/ABC",
      "media_id": "18000000000000000",
      "story_id": null,
      "title": "CRM haqida reel",
      "ai_description": "Bu reel CRM tizimi biznesdagi mijozlarni boshqarish haqida. AI mijozga CRM foydasini tushuntirsin va telefon raqam so'rasin.",
      "is_active": true,
      "created_at": "2026-07-27T15:10:00+05:00",
      "updated_at": "2026-07-27T15:10:00+05:00"
    }
  ],
  "total": 1,
  "limit": 50,
  "offset": 0
}
```

Create:

```http
POST /cognilabsai/chat/instagram/media-contexts
Content-Type: application/json
```

```json
{
  "media_type": "reel",
  "url": "https://www.instagram.com/reel/ABC/",
  "media_id": "18000000000000000",
  "story_id": null,
  "title": "CRM haqida reel",
  "ai_description": "Reel CRM tizimi haqida. Mijoz CRMga qiziqsa, qisqa tushuntirib telefon raqamini olishga harakat qil.",
  "is_active": true
}
```

Update:

```http
PATCH /cognilabsai/chat/instagram/media-contexts/{id}
```

```json
{
  "title": "Yangilangan title",
  "ai_description": "Yangilangan AI izoh",
  "is_active": true
}
```

Delete:

```http
DELETE /cognilabsai/chat/instagram/media-contexts/{id}
```

## Form Fields

Recommended UI fields:

```text
media_type: select -> story, post, reel, ad
url: text input
media_id: text input optional
story_id: text input optional
title: text input
ai_description: textarea required
is_active: switch
```

Frontend note:

```text
url berilsa backend normalized_url qiladi:
https://www.instagram.com/reel/ABC/?igsh=xyz -> https://www.instagram.com/reel/ABC
```

## 2. Conversations Kanban Fields

Conversation response ichiga yangi fields qo'shildi:

```json
{
  "ai_stage": "interested_crm",
  "ai_stage_label": "CRM tizimiga qiziqdi",
  "ai_interest": "CRM",
  "instagram_media_context_id": 1,
  "ai_follow_up_due_at": "2026-07-28T13:30:00+05:00",
  "ai_follow_up_sent_at": null
}
```

Frontend kanban uchun `ai_stage` bo'yicha group qilish mumkin.

Recommended columns:

```text
new
greeted
interested_crm
interested_ai
interested_website
interested_automation
interested_other
phone_received
lead_created
not_fit
lost
```

Column label uchun:

```text
ai_stage_label bo'lsa shuni ko'rsat.
Bo'lmasa ai_stage ni readable qilib ko'rsat.
```

Example:

```ts
const label = conversation.ai_stage_label || conversation.ai_stage?.replaceAll("_", " ");
```

## 3. Chat UI Media Context Display

Conversation detailda agar `instagram_media_context_id` bor bo'lsa, frontend media context detailni olib ko'rsatishi mumkin:

```http
GET /cognilabsai/chat/instagram/media-contexts/{instagram_media_context_id}
```

Chat headerda ko'rsatish tavsiya:

```text
Instagram context: [media_type] title
AI description preview
Open Instagram link
```

## 4. AI Follow-Up

Backend o'zi ishlaydi.

Rule:

```text
Faqat Instagram.
Telefon yo'q.
CRM lead yo'q.
Chat oxirgi message'dan 22 soat to'xtab qolgan.
Backend AI bilan follow-up generate qiladi va Instagramga yuboradi.
```

Frontend faqat fieldlarni ko'rsatadi:

```text
ai_follow_up_due_at
ai_follow_up_sent_at
```

UI badge:

```text
ai_follow_up_due_at != null -> "AI follow-up scheduled"
ai_follow_up_sent_at != null -> "AI follow-up sent"
crm_customer_id != null yoki lead_phone_number bor -> follow-up badge ko'rsatilmaydi
```

## 5. Lead Flow

AI endi mijoz telefon raqam yuborsa darhol CRM lead yaratadi.

To'liq ism, soha, qulay vaqt bo'lmasa ham lead yaratiladi.

Keyin mijoz ism/soha/vaqt bersa backend conversation `crm_customer_id` orqali CRM customer update qiladi.

Frontendda chatda quyidagilarni ko'rsatish foydali:

```text
lead_phone_number
lead_full_name
lead_business_field
lead_scheduled_time
crm_customer_id
```

## 6. Message Display

Webhookdan story/post/reel share kelsa backend message text ichiga context qo'shadi.

Example message text:

```text
shu haqida malumot bering
Mijoz Instagram post/reel/media bo'yicha yozdi.
Instagram media link: https://www.instagram.com/reel/ABC
Media nomi: CRM haqida reel
AI media izohi: Reel CRM tizimi haqida...
```

Frontend message textni oddiy multiline qilib chiqarishi yetadi.

CSS:

```css
white-space: pre-wrap;
```

## 7. Auth

Bu endpointlar `CognilabsAI Chat` permission bilan ishlaydi.

Existing auth header/cookie qanday ishlayotgan bo'lsa, shu bilan ishlaydi.

