# Audit phụ thuộc chéo giữa app kỹ sư và app reporter

Ngày audit: 2026-08-29

Phạm vi:

- `apps/mobile-field-engineer`
- `packages/mobile-shared`
- quan hệ với `apps/mobile-reporter`

## 1. Kết luận nhanh

Không còn phụ thuộc chéo ẩn trong phạm vi đã rà. Các phụ thuộc chéo chính đều đã lộ rõ và tập trung gần như toàn bộ ở `packages/mobile-shared`.

Nói cách khác:

- app kỹ sư không import trực tiếp quá nhiều từ reporter
- nhưng `packages/mobile-shared` đang đóng vai trò cầu nối và vẫn phụ thuộc mạnh vào `apps/mobile-reporter`

Đây là coupling có chủ đích tạm thời, không phải kiến trúc sạch dài hạn.

## 2. Bảng phụ thuộc chéo hiện có

| Khu vực | File | Đang phụ thuộc vào | Loại đánh giá | Nhận xét |
|---|---|---|---|---|
| mobile-shared | `src/components.ts` | `apps/mobile-reporter/src/components/*` | Dùng chung nhưng đặt sai chỗ | Hợp lý về mặt tái sử dụng UI, nhưng không nên re-export từ app cụ thể |
| mobile-shared | `src/authService.ts` | `apps/mobile-reporter/src/services/authService` | Dùng chung nhưng đặt sai chỗ | Logic auth là shared, nhưng nguồn hiện tại vẫn nằm ở reporter |
| mobile-shared | `src/configureApiClient.native.ts` | `apps/mobile-reporter/src/services/configureApiClient.native` | Dùng chung nhưng đặt sai chỗ | Nên kéo về package dùng chung |
| mobile-shared | `src/configureApiClient.web.ts` | `apps/mobile-reporter/src/services/configureApiClient.web` | Dùng chung nhưng đặt sai chỗ | Tương tự bản native |
| mobile-shared | `src/locationService.ts` | `apps/mobile-reporter/src/services/locationService` | Dùng chung nhưng đặt sai chỗ | Service vị trí là shared hợp lệ, nhưng đang nằm sai tầng |
| mobile-shared | `src/map.ts` | `apps/mobile-reporter/src/features/map/components/*` | Dùng chung nhưng đặt sai chỗ | Map engine dùng chung là đúng hướng, nhưng chưa tách thành package độc lập |
| mobile-field-engineer | `src/shared/reporterShared.ts` | `packages/mobile-shared/src` | Hợp lý tạm thời | Không kéo trực tiếp reporter, nhưng tên file gây hiểu nhầm |
| mobile-field-engineer | nhiều màn hình/services | `packages/shared-constants/src/*` | Dùng chung hợp lý | Đây là shared thật hơn, nên giữ |
| mobile-field-engineer | services/theme/types | `packages/mobile-shared/src/*` | Hợp lý tạm thời | Ổn trước mắt, nhưng chất lượng phụ thuộc vào việc làm sạch `mobile-shared` |

## 3. Phân loại theo mức độ

### 3.1 Dùng chung hợp lý

Đây là các phụ thuộc nên tồn tại về mặt nghiệp vụ hoặc kiến trúc:

- app kỹ sư dùng `packages/shared-constants`
- app kỹ sư dùng `packages/mobile-shared`
- app kỹ sư dùng shared theme/type/map helper

Lý do:

- tránh copy-paste
- giữ UI/UX đồng bộ
- dùng chung domain/status/label

### 3.2 Dùng chung nhưng đặt sai chỗ

Đây là nhóm lớn nhất hiện tại:

- `packages/mobile-shared/src/components.ts`
- `packages/mobile-shared/src/authService.ts`
- `packages/mobile-shared/src/configureApiClient.native.ts`
- `packages/mobile-shared/src/configureApiClient.web.ts`
- `packages/mobile-shared/src/locationService.ts`
- `packages/mobile-shared/src/map.ts`

Điểm chung:

- đều là “shared về bản chất”
- nhưng implementation thật lại đang nằm trong `apps/mobile-reporter`
- `mobile-shared` chỉ đang re-export lại

Tác động:

- tạo phụ thuộc ngược từ package sang app
- reporter trở thành nơi “giữ nguồn chuẩn” ngoài ý muốn
- khó tách độc lập 2 app về lâu dài

### 3.3 Phụ thuộc chéo không nên giữ

Chưa thấy nhiều import trực tiếp từ `apps/mobile-field-engineer` sang `apps/mobile-reporter`, đây là điểm tốt.

Nhưng về mặt kiến trúc, các re-export sau trong `mobile-shared` không nên giữ lâu dài:

- re-export component UI từ reporter
- re-export service auth từ reporter
- re-export service location từ reporter
- re-export map component từ reporter

Đây không phải lỗi runtime ngay, nhưng là nợ kỹ thuật cần xử lý sớm.

## 4. Phụ thuộc chéo ẩn: có còn không?

Trong phạm vi rà bằng import path hiện tại:

- không thấy phụ thuộc chéo ẩn mới ngoài `mobile-shared`
- không thấy app kỹ sư kéo ngược trực tiếp nhiều file từ reporter
- coupling đã khá tập trung, nên dễ cleanup theo cụm

Kết luận cho acceptance criteria “không còn phụ thuộc chéo ẩn”:

Đạt ở mức audit/phát hiện.

## 5. File nào cần tách ra shared thật

### Nhóm ưu tiên P1

1. Component UI dùng chung
   - nguồn hiện tại: `apps/mobile-reporter/src/components/*`
   - đích nên chuyển tới: `packages/mobile-shared/src/components/*`

2. Auth service dùng chung
   - nguồn hiện tại: `apps/mobile-reporter/src/services/authService.ts`
   - đích nên chuyển tới: `packages/mobile-shared/src/auth/*` hoặc thay trực tiếp trong `packages/mobile-shared/src/authService.ts`

3. API client config mobile
   - nguồn hiện tại:
     - `apps/mobile-reporter/src/services/configureApiClient.native.ts`
     - `apps/mobile-reporter/src/services/configureApiClient.web.ts`
   - đích nên chuyển tới:
     - `packages/mobile-shared/src/configureApiClient.native.ts`
     - `packages/mobile-shared/src/configureApiClient.web.ts`

4. Location service
   - nguồn hiện tại: `apps/mobile-reporter/src/services/locationService.ts`
   - đích nên chuyển tới: `packages/mobile-shared/src/locationService.ts`

5. Map engine / map types
   - nguồn hiện tại:
     - `apps/mobile-reporter/src/features/map/components/RoadDamageMapView.*`
   - đích nên chuyển tới:
     - `packages/mobile-shared/src/map/*`
     - hoặc ít nhất `packages/mobile-shared/src/map.tsx + map.types.ts`

### Nhóm ưu tiên P2

6. Rà tên `reporterShared.ts`
   - đổi thành `mobileShared.ts` hoặc `sharedUi.ts`

7. Rút gọn import path sâu
   - cân nhắc alias cho `packages/*`

## 6. Hướng cleanup tốt nhất

### Bước 1

Tách `mobile-shared` thành shared package thật, bắt đầu từ:

- auth
- configureApiClient
- location

Vì đây là nhóm ít UI hơn, rủi ro thấp hơn map/component.

### Bước 2

Tách component UI nền:

- `AppButton`
- `AppIcon`
- `EmptyState`
- `InfoCard`
- `ScreenHeader`
- `Skeleton`
- `StateMessage`

### Bước 3

Tách map dùng chung:

- `RoadDamageMapView`
- `RoadDamageMapView.types`

Đây là bước cần cẩn thận nhất vì ảnh hưởng cả reporter và engineer.

## 7. Trạng thái acceptance criteria

### Có bảng phụ thuộc chéo rõ ràng

Đạt.

### Biết chính xác file nào cần tách ra shared thật

Đạt.

### Không còn phụ thuộc chéo “ẩn”

Đạt ở mức rà import hiện tại; mọi coupling chính đã được nhận diện.
