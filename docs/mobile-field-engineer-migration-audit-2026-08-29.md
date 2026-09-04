# Audit cấu trúc sau khi chuyển app kỹ sư

Ngày audit: 2026-08-29

Phạm vi:

- `apps/mobile-field-engineer`
- `packages/mobile-shared`
- `packages/shared-constants`
- `App.js`

## 1. Kết luận nhanh

App kỹ sư đã được đưa vào đúng project gốc và workspace hiện pass `npm exec tsc --noEmit`.

Tuy nhiên, cấu trúc hiện tại mới ở mức chạy được và tích hợp được, chưa sạch hoàn toàn về kiến trúc. Điểm coupling lớn nhất là `packages/mobile-shared` vẫn đang re-export trực tiếp từ `apps/mobile-reporter`.

## 2. Cấu trúc hiện tại

### 2.1 App kỹ sư

`apps/mobile-field-engineer`

- `App.tsx`
- `src/app/Navigation.tsx`
- `src/features/auth/EngineerLoginScreen.tsx`
- `src/features/home/EngineerHomeScreen.tsx`
- `src/features/map/EngineerMapScreen.tsx`
- `src/features/map/EngineerMapUi.tsx`
- `src/features/profile/EngineerProfileScreen.tsx`
- `src/features/tasks/EngineerTasksScreen.tsx`
- `src/features/tasks/EngineerTaskDetailScreen.tsx`
- `src/features/tasks/EngineerCheckInScreen.tsx`
- `src/features/tasks/EngineerSurveyScreen.tsx`
- `src/features/tasks/EngineerAttachmentsScreen.tsx`
- `src/features/tasks/EngineerHistoryScreen.tsx`
- `src/features/tasks/components/EngineerPhotoViewer.tsx`
- `src/services/authService.ts`
- `src/services/configureApiClient.native.ts`
- `src/services/configureApiClient.web.ts`
- `src/services/engineerReportService.ts`
- `src/shared/reporterShared.ts`
- `src/types/navigation.ts`

### 2.2 Shared mobile

`packages/mobile-shared/src`

- `authService.ts`
- `components.ts`
- `configureApiClient.native.ts`
- `configureApiClient.web.ts`
- `index.ts`
- `locationService.ts`
- `map.ts`
- `roadDamageTypes.ts`
- `theme.ts`

### 2.3 Shared constants

`packages/shared-constants/src`

- `roadDamage.js/.d.ts`
- `statusRuntime.js/.json/.d.ts`
- `engineerLabels.js/.d.ts`
- `fieldDomainMetadata.js/.d.ts`

### 2.4 Entrypoint app

`App.js`

- mặc định mở `mobile-reporter`
- nếu `EXPO_PUBLIC_APP_TARGET=engineer` thì mở `mobile-field-engineer`

## 3. Những phần đang ổn

- App kỹ sư đã nằm đúng trong `apps/`, cùng cấp với reporter và web admin.
- Shared constants đã có phần public/internal status, wording engineer và metadata domain.
- Entrypoint đã hỗ trợ chọn role app theo runtime target.
- Workspace hiện compile pass ở mức TypeScript.
- Map dùng chung đã được vá để hỗ trợ marker/popup tùy biến cho engineer mà không làm hỏng luồng reporter.

## 4. Những phần còn coupling

### 4.1 Coupling lớn nhất: `packages/mobile-shared` chưa là shared thật

Các file dưới đây vẫn re-export trực tiếp từ `apps/mobile-reporter`:

- `packages/mobile-shared/src/components.ts`
- `packages/mobile-shared/src/authService.ts`
- `packages/mobile-shared/src/configureApiClient.native.ts`
- `packages/mobile-shared/src/configureApiClient.web.ts`
- `packages/mobile-shared/src/locationService.ts`
- `packages/mobile-shared/src/map.ts`

Hệ quả:

- app kỹ sư vẫn phụ thuộc vào cấu trúc nội bộ của reporter
- nếu đổi file/component/service trong reporter, engineer có thể vỡ dây chuyền
- `mobile-shared` hiện là lớp chuyển tiếp, chưa phải nguồn dùng chung độc lập

### 4.2 Naming chưa sạch

Trong app kỹ sư vẫn còn file:

- `apps/mobile-field-engineer/src/shared/reporterShared.ts`

Tên file này gây hiểu nhầm vì app kỹ sư đang import “shared thật”, không nên mang tên `reporterShared`.

### 4.3 Import path còn khá sâu

Ví dụ:

- `../../../../../packages/shared-constants/src/engineerLabels`

Import vẫn chạy, nhưng về lâu dài khó bảo trì và dễ sai khi refactor.

## 5. Đánh giá mức độ phù hợp cho dự án

### Phù hợp ở mức hiện tại

- đủ để tiếp tục phát triển app kỹ sư trong project gốc
- đủ để compile/test chung trong một workspace
- đủ để giữ reporter là luồng mặc định, không phá hành vi cũ

### Chưa phù hợp nếu muốn ổn định dài hạn

- shared layer chưa tách hẳn khỏi reporter
- boundary giữa app cụ thể và package dùng chung chưa sạch
- chưa có tài liệu cách chạy reporter/engineer trong cùng repo

## 6. Danh sách cleanup nên làm tiếp

### P1

1. Tách `packages/mobile-shared` thành shared thật
   - di chuyển component/map/auth/location/config dùng chung ra package độc lập
   - bỏ re-export xuyên từ `apps/mobile-reporter`

2. Đổi tên `src/shared/reporterShared.ts`
   - đề xuất: `mobileShared.ts` hoặc `sharedUi.ts`

3. Chuẩn hóa cách chạy app theo role
   - ghi rõ lệnh chạy reporter
   - ghi rõ lệnh chạy engineer với `EXPO_PUBLIC_APP_TARGET=engineer`

4. Smoke test app kỹ sư trong project gốc
   - login
   - home
   - map
   - tasks
   - check-in
   - survey

### P2

5. Rút gọn import path
   - cân nhắc alias cho `packages/*`

6. Tách thêm facade ổn định cho shared constants
   - tránh import trực tiếp quá sâu vào `src/*.js`

7. Rà lại naming/domain của shared package
   - public reporter
   - internal engineer/admin
   - mobile shared

## 7. Trạng thái acceptance criteria

### Có sơ đồ cấu trúc rõ ràng

Đạt.

### Xác định được phần nào ổn, phần nào còn coupling

Đạt.

### Có danh sách điểm cần cleanup tiếp theo

Đạt.
