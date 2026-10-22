# 📚 BẢNG TRA CỨU NGUỒN GỐC & TÀI LIỆU THAM KHẢO CỦA CÁC MODEL (PROVENANCE & CITATIONS)

Tài liệu này ghi nhận chi tiết nguồn gốc xuất xứ, tác giả, bài báo nghiên cứu và kho lưu trữ của toàn bộ **15 mô hình nhận diện hư hỏng mặt đường** đang có trong thư mục `G:\DILL G\AI LLM\DATN\Test\models` phục vụ báo cáo Đồ án Tốt nghiệp.

---

## 1. MÔ HÌNH NGHIÊN CỨU CỦA ĐỒ ÁN (OUR RESEARCH MODEL)

### 🏆 `yolo12s-rdd-vn-best.pt` (18.1 MB)
* **Tác giả**: Nguyễn Tuấn Kiệt (Đồ án Tốt nghiệp - Hệ thống Road Damage GIS).
* **Kiến trúc**: YOLOv12s (Small - 9.2M tham số, tích hợp cơ chế Area Attention).
* **Phương pháp huấn luyện**: Fine-tuning (Học chuyển giao) trên **24.538 ảnh đường sá Việt Nam (NTK Dataset)** với thuật toán tối ưu AdamW, Cosine LR scheduler, AMP FP16.
* **Mô hình nền tảng (Base)**: Được tinh chỉnh từ checkpoint `yolo12s_800px_seed0_best.pt` (RDD2022).
* **Hiệu quả thực nghiệm**:
  * Đạt **43.7% mAP@50** trên tập test đường sá Việt Nam (Tăng vọt **+67.6%** so với mô hình quốc tế).
  * Nhận diện **Ổ gà (D40) đạt 76.9%** (Precision: 83.6%, Recall: 70.6%).
  * Nhận diện **Nứt dọc/ngang (D00) đạt 52.0%** (Precision: 76.8%).
* **Tốc độ xử lý**: 1.8 ms / ảnh (RTX 3090) ~ 555 FPS; 14.7 ms / ảnh (Local GPU) ~ 68 FPS.

---

## 2. NHÓM BENCHMARK RDD2022 (SreekarAditya - Hugging Face)

* **Kho lưu trữ chính thức**: [huggingface.co/SreekarAditya/yolo-rdd2022-benchmark](https://huggingface.co/SreekarAditya/yolo-rdd2022-benchmark)
* **Tác giả**: Sreekar Aditya.
* **Tập dữ liệu huấn luyện**: Bộ dữ liệu quốc tế RDD2022 (Sekimoto Lab - Đại học Tokyo, gồm 47.420 ảnh từ Nhật Bản, Ấn Độ, Séc, Na Uy, Mỹ, Trung Quốc).
* **Danh sách các models thuộc nhóm này**:
  1. `yolov5s_seed0_best.pt` (17.7 MB): Đại diện thế hệ YOLOv5 (Glenn Jocher et al., 2020).
  2. `yolov8s_seed0_best.pt` (21.5 MB): Đại diện thế hệ YOLOv8 (Ultralytics, 2023).
  3. `yolov9s_seed0_best.pt` (14.5 MB): Đại diện thế hệ YOLOv9 với kiến trúc GELAN-C (Chien-Yao Wang et al., 2024).
  4. `yolov10s_seed0_best.pt` (15.8 MB): Đại diện thế hệ YOLOv10 với cơ chế NMS-free Dual Head (Ao Wang et al., Tsinghua University, 2024).
  5. `yolo11s_seed0_best.pt` (18.3 MB): Đại diện thế hệ YOLO11 mới nhất của Ultralytics (2024).
  6. `yolo12n_seed0_best.pt` (5.3 MB): Bản Nano siêu nhẹ của YOLOv12.
  7. `yolo12s_seed0_best.pt` (18.1 MB): Bản Small chuẩn 640px của YOLOv12 (Area Attention).
  8. `yolo12s_480px_seed0_best.pt` (18.0 MB): Bản Small tối ưu hóa cho độ phân giải thấp 480px.
  9. `yolo12s_800px_seed0_best.pt` (18.1 MB): Bản Small tối ưu hóa bắt nứt mảnh ở 800px.
  10. `yolo12m_seed0_best.pt` (38.9 MB): Bản Medium cỡ vừa (nặng gấp đôi bản S, 40MB).

---

## 3. NHÓM CHƯNG CẤT TRI THỨC (KNOWLEDGE DISTILLATION - TamAko783)

* **Kho lưu trữ chính thức**: [huggingface.co/TamAko783/YOLO26n_RDD_FRDC_Distilled_v2](https://huggingface.co/TamAko783/YOLO26n_RDD_FRDC_Distilled_v2)
* **Tác giả**: TamAko783.
* **Phương pháp**: Sử dụng kỹ thuật Chưng cất tri thức (Knowledge Distillation), nén tri thức từ mạng Teacher lớn sang mạng Student nhỏ hơn nhằm tăng tốc độ nhưng vẫn giữ độ chính xác.
* **Tập dữ liệu**: Unified Road Defect Dataset (Kết hợp RDD2022 và FRDC).
* **Danh sách models**:
  1. `YOLO26n_RDD_FRDC_Distilled_v2.pt` (5.1 MB): Bản Nano Distilled siêu nhỏ gọn.
  2. `YOLO26s_RDD_FRDC_Distilled_v2.pt` (19.4 MB): Bản Small Distilled.

---

## 4. NHÓM MÔ HÌNH RDD2022 CHUYÊN DỤNG (rezzzq)

* **Kho lưu trữ chính thức**: [huggingface.co/rezzzq/yolo12s-road-damage-rdd2022](https://huggingface.co/rezzzq/yolo12s-road-damage-rdd2022)
* **Tác giả**: rezzzq.
* **Mô hình**: `yolo12s_RDD2022_best.pt` (18.1 MB)
* **Mô tả**: Huấn luyện chuyên sâu trên 5 nhãn RDD2022 (D00, D10, D20, D40 và Repaired).

---

## 5. TÀI LIỆU THAM KHẢO HỌC THUẬT (CITATIONS CHO LUẬN VĂN)

1. **RDD2022 Paper**:
   > Deeksha Arya, Hiroya Maeda, Yoshihide Sekimoto, et al. *"RDD2022: A multi-national image dataset for automatic Road Damage Detection"*. arXiv:2209.08538, 2022.
2. **YOLOv12 Paper**:
   > Yanyi Tian, et al. *"YOLOv12: Attention-Centric Real-Time Object Detectors"*. arXiv:2502.12524, 2025.
3. **YOLOv10 Paper**:
   > Ao Wang, Hui Chen, Lihao Liu, et al. *"YOLOv10: Real-Time End-to-End Object Detection"*. arXiv:2405.14458, 2024.
4. **YOLOv9 Paper**:
   > Chien-Yao Wang, I-Hau Yeh, Hong-Yuan Mark Liao. *"YOLOv9: Learning What You Want to Learn Using Programmable Gradient Information"*. arXiv:2402.13616, 2024.
