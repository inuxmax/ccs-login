# User API Keys

Last Updated: 2026-03-12

## Mục tiêu

Bổ sung API backend để frontend có thể quản lý API key theo từng user trong tương lai, tách biệt với nhóm API key global hiện tại tại `/api/settings/auth/tokens`.

Tài liệu này mô tả pha 1: thiết kế contract và backend tối thiểu cho dashboard đang dùng session auth.

## Hiện trạng

Hệ thống hiện có các route global trong `settings-routes`:

- `GET /api/settings/auth/tokens`
- `GET /api/settings/auth/tokens/raw`
- `PUT /api/settings/auth/tokens`
- `POST /api/settings/auth/tokens/regenerate-secret`
- `POST /api/settings/auth/tokens/reset`

Các route trên quản lý:

- global API key
- global management secret
- per-variant override trong config

Chúng **không** quản lý API key theo user.

## Phạm vi pha 1

Pha 1 chỉ thêm backend API cho dashboard user hiện tại đã đăng nhập bằng session.

Mục tiêu:

1. Lưu API key theo user vào MongoDB.
2. Cho frontend lấy danh sách key của user hiện tại.
3. Cho frontend tạo key mới cho user hiện tại.
4. Cho frontend đổi tên key.
5. Cho frontend revoke key.
6. Không trả lại raw key sau lần tạo đầu tiên.

Ngoài phạm vi pha 1:

- dùng user API key để thay thế `cliproxy` global auth runtime
- phân quyền nhiều role ngoài `admin`
- chia sẻ key giữa nhiều user
- rotation tự động
- quota/usage per key

## Nguồn định danh user

Dashboard hiện đang lưu session sau đăng nhập Google:

- `req.session.authenticated`
- `req.session.username`
- `req.session.userEmail`
- `req.session.displayName`
- `req.session.role`

Pha 1 sẽ dùng:

- `userEmail` nếu có
- fallback sang `username`

Giá trị này được coi là `ownerId` logic của API key.

## MongoDB collections

Dùng cùng database hiện tại `ccs`.

### Collection: `user_api_keys`

Document mẫu:

```json
{
  "keyId": "uak_01jxyz...",
  "ownerId": "admin@example.com",
  "ownerEmail": "admin@example.com",
  "name": "Frontend dev key",
  "description": "Dùng cho dashboard frontend local",
  "prefix": "ccs_uak_abcd",
  "keyHash": "<sha256>",
  "lastFour": "9xk2",
  "status": "active",
  "scopes": ["frontend"],
  "createdAt": "2026-03-12T00:00:00.000Z",
  "updatedAt": "2026-03-12T00:00:00.000Z",
  "lastUsedAt": null,
  "revokedAt": null,
  "metadata": {
    "source": "dashboard"
  }
}
```

## Quy tắc bảo mật

1. Raw API key chỉ sinh một lần khi tạo mới.
2. Database chỉ lưu `keyHash`, không lưu plaintext.
3. API trả về `prefix` và `lastFour` để frontend hiển thị.
4. Khi revoke, không xóa cứng ngay; chỉ đánh dấu `status = revoked`.
5. Danh sách key không bao giờ chứa raw token.

## Token format đề xuất

Raw key format:

```text
ccs_uak_<id>_<secret>
```

Ví dụ:

```text
ccs_uak_01jxyz8l5w_mFQk8M6f8v2Qm8H1x7mT0vK1bqA2P4yC
```

Trong đó:

- `<id>`: định danh public của key
- `<secret>`: phần bí mật ngẫu nhiên

Hash lưu DB:

```text
sha256(rawKey)
```

## REST API đề xuất

Base path:

```text
/api/user-api-keys
```

Tất cả route đều yêu cầu dashboard session hợp lệ.

### `GET /api/user-api-keys`

Trả về danh sách key của user hiện tại.

Response:

```json
{
  "items": [
    {
      "keyId": "uak_01jxyz",
      "name": "Frontend dev key",
      "description": "Dùng cho local app",
      "prefix": "ccs_uak_01jxyz",
      "lastFour": "9xk2",
      "status": "active",
      "scopes": ["frontend"],
      "createdAt": "2026-03-12T00:00:00.000Z",
      "updatedAt": "2026-03-12T00:00:00.000Z",
      "lastUsedAt": null,
      "revokedAt": null
    }
  ]
}
```

### `POST /api/user-api-keys`

Tạo key mới cho user hiện tại.

Request:

```json
{
  "name": "Frontend dev key",
  "description": "Dùng cho local app",
  "scopes": ["frontend"]
}
```

Response:

```json
{
  "item": {
    "keyId": "uak_01jxyz",
    "name": "Frontend dev key",
    "description": "Dùng cho local app",
    "prefix": "ccs_uak_01jxyz",
    "lastFour": "9xk2",
    "status": "active",
    "scopes": ["frontend"],
    "createdAt": "2026-03-12T00:00:00.000Z",
    "updatedAt": "2026-03-12T00:00:00.000Z",
    "lastUsedAt": null,
    "revokedAt": null
  },
  "rawKey": "ccs_uak_01jxyz8l5w_mFQk8M6f8v2Qm8H1x7mT0vK1bqA2P4yC"
}
```

### `PATCH /api/user-api-keys/:keyId`

Cập nhật metadata của key thuộc user hiện tại.

Request:

```json
{
  "name": "Frontend staging key",
  "description": "Đổi tên cho môi trường staging"
}
```

Response:

```json
{
  "item": {
    "keyId": "uak_01jxyz",
    "name": "Frontend staging key",
    "description": "Đổi tên cho môi trường staging",
    "prefix": "ccs_uak_01jxyz",
    "lastFour": "9xk2",
    "status": "active",
    "scopes": ["frontend"],
    "createdAt": "2026-03-12T00:00:00.000Z",
    "updatedAt": "2026-03-12T01:00:00.000Z",
    "lastUsedAt": null,
    "revokedAt": null
  }
}
```

### `POST /api/user-api-keys/:keyId/revoke`

Revoke key.

Response:

```json
{
  "success": true,
  "item": {
    "keyId": "uak_01jxyz",
    "status": "revoked",
    "revokedAt": "2026-03-12T02:00:00.000Z"
  }
}
```

## Mã lỗi đề xuất

- `400` dữ liệu đầu vào không hợp lệ
- `401` chưa đăng nhập dashboard
- `403` không thuộc quyền user hiện tại
- `404` không tìm thấy key
- `500` lỗi nội bộ hoặc MongoDB

## Hướng triển khai backend

### Bước 1

Tạo service MongoDB riêng cho user API keys để tránh trộn với collection `dashboard_users`.

### Bước 2

Tạo router mới `/api/user-api-keys` thay vì nhét vào `/api/settings/auth/tokens`, vì:

- dễ tách domain
- tránh phá vỡ UI settings hiện tại
- phù hợp frontend self-service về sau

### Bước 3

Thêm helper lấy current user từ session.

### Bước 4

Expose CRUD tối thiểu:

- list
- create
- update metadata
- revoke

## Hướng tích hợp frontend về sau

Frontend có thể làm theo flow:

1. `GET /api/user-api-keys` để load bảng.
2. `POST /api/user-api-keys` để tạo key và hiển thị modal copy raw key một lần.
3. `PATCH /api/user-api-keys/:keyId` để đổi tên/description.
4. `POST /api/user-api-keys/:keyId/revoke` để thu hồi key.

## Ghi chú tương thích

- Không thay đổi behavior của các route trong `/api/settings/auth/tokens`.
- Có thể sau này thêm route admin để quản lý key của user khác.
- Có thể sau này thêm `scopes`, `expiresAt`, `lastUsedAt`, audit log.
