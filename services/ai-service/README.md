# Road Damage GIS - AI Service

AI Service dùng FastAPI + Ultralytics YOLO để nhận dạng hư hỏng mặt đường.

## Cấu hình chạy thật theo repo hiện tại

Khuyến nghị sao chép file `.env.example` ở root repo thành `.env`:

```bash
copy ..\..\.env.example ..\..\.env
```

AI Service đã được cấu hình để đọc `.env` ở root repo. File `.env.example` trong thư mục service chỉ dùng khi bạn muốn override riêng cho AI service.

Cấu hình mặc định hiện tại:

```env
AI_SERVICE_HOST=127.0.0.1
AI_SERVICE_PORT=8001
AI_SERVICE_URL=http://localhost:8001
AI_API_PREFIX=/api/ai
AI_MODEL_PATH=./models/yolo12s_800px_seed0_best.pt
AI_IMAGE_SIZE=1216
AI_CONFIDENCE_THRESHOLD=0.05
AI_IOU_THRESHOLD=0.45
AI_DEVICE=auto
AI_INFERENCE_TIMEOUT_SECONDS=25
AI_MAX_IMAGE_PIXELS=25000000
```

Model mặc định đang trỏ tới file nằm trong repo:

```text
services/ai-service/models/yolo12s_800px_seed0_best.pt
```

Nếu muốn đổi model sau này, chỉ cần sửa `AI_MODEL_PATH` trong `.env`. Có thể dùng:

- đường dẫn tương đối tính từ `services/ai-service`
- hoặc đường dẫn tuyệt đối nếu bạn thật sự cần

Ví dụ đổi sang model khác trong cùng thư mục `models`:

```env
AI_MODEL_PATH=./models/ten-model-khac.pt
```

## Cài đặt

```bash
cd services/ai-service
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Chạy service

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Hoặc dùng đúng biến môi trường hiện tại:

```bash
uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

Backend API mặc định gọi AI service qua:

```env
AI_SERVICE_URL=http://localhost:8001
AI_DETECT_ENDPOINT=/api/ai/detect-road-damage
AI_TIMEOUT_SECONDS=20
```

Nếu đổi port của AI service thì cần cập nhật đồng bộ `AI_SERVICE_PORT`, `AI_SERVICE_URL` và `AI_TIMEOUT_SECONDS` trong file `.env` ở root repo.

## API

Health check:

```http
GET /health
```

Readiness check:

```http
GET /ready
```

`/ready` dùng để xác nhận:

- file model tồn tại
- model đã được load xong
- AI service đã sẵn sàng nhận ảnh để nhận dạng
- timeout inference và giới hạn ảnh đang được nạp đúng từ env

Nhận dạng ảnh:

```http
POST /api/ai/detect-road-damage
Content-Type: multipart/form-data

image=<file ảnh>
```

Response khi không phát hiện lỗi:

```json
{
  "success": true,
  "image_width": 1280,
  "image_height": 720,
  "detections_count": 0,
  "detections": [],
  "processing_time_ms": 86.42,
  "message": "Không phát hiện hư hỏng mặt đường."
}
```

Response khi phát hiện lỗi:

```json
{
  "success": true,
  "image_width": 1280,
  "image_height": 720,
  "detections_count": 1,
  "detections": [
    {
      "class_id": 3,
      "damage_type": "D40",
      "class_name": "Ổ gà",
      "confidence": 0.7021,
      "bbox": {
        "x1": 442.15,
        "y1": 220.04,
        "x2": 782.88,
        "y2": 374.52
      }
    }
  ],
  "processing_time_ms": 91.38,
  "message": "Phát hiện 1 hư hỏng mặt đường."
}
```

## Ghi chú phạm vi hiện tại

- AI Service hiện phù hợp để demo nhận dạng và tích hợp vào luồng gửi phản ánh.
- Cấu hình model và tham số đã được tách ra qua env, nên khi đổi model sau này không cần sửa code nếu chỉ thay đổi file `.pt`, confidence, image size hoặc device.
- AI service hiện đã có guardrails cho:
  - ảnh lỗi / không giải mã được
  - ảnh vượt dung lượng tối đa
  - ảnh có số pixel quá lớn
  - inference chạy quá timeout cho phép
- Kết quả preview AI ở backend đang được tái sử dụng qua `preview_token` cache in-memory, nên vẫn mang tính local demo/prototype kỹ thuật nhiều hơn production thực tế.
- Khi báo cáo nên nói đúng phạm vi: AI đã tích hợp chạy được trong hệ thống, nhưng để production thật vẫn cần bổ sung hạ tầng cache/distributed state, logging sâu hơn và kiểm thử tải với dữ liệu ảnh thực tế lớn.

## Smoke test guardrails

Có thể kiểm tra nhanh các nhánh lỗi thực tế mà không cần chạy full app:

```bash
cd services/ai-service
python scripts/run_ai_guardrail_smoke.py
```

Script này kiểm tra:

- ảnh không hợp lệ không làm crash service
- ảnh quá lớn bị chặn đúng
- ảnh quá nhiều pixel bị chặn đúng
- inference timeout trả lỗi đúng
- ảnh hợp lệ vẫn xử lý bình thường
