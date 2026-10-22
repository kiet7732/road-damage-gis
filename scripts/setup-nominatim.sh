#!/usr/bin/env bash
set -e

ACTION="${1:-up}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/docker-compose.nominatim.yml"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "Error: Không tìm thấy file $COMPOSE_FILE" >&2
  exit 1
fi

if ! command -v docker &>/dev/null; then
  echo "Error: Docker chưa được cài đặt hoặc chưa được thêm vào PATH." >&2
  exit 1
fi

if ! docker info &>/dev/null; then
  echo "Error: Docker daemon chưa được khởi động." >&2
  exit 1
fi

case "$ACTION" in
  up)
    echo ">>> Đang khởi động container Nominatim OSM Vietnam..."
    docker compose -f "$COMPOSE_FILE" up -d
    echo ""
    echo "[THÔNG TIN QUAN TRỌNG]"
    echo "- Lần chạy đầu tiên sẽ tự động tải 'vietnam-latest.osm.pbf' và import vào PostgreSQL."
    echo "- Thời gian import lần đầu thường mất từ 10 - 25 phút tuỳ cấu hình máy và tốc độ mạng."
    echo "- Các lần chạy tiếp theo sẽ khởi động ngay lập tức (3-5s)."
    echo ""
    echo "Để theo dõi tiến trình import, chạy lệnh:"
    echo "  ./scripts/setup-nominatim.sh logs"
    echo "Để kiểm tra trạng thái:"
    echo "  ./scripts/setup-nominatim.sh status"
    echo "Để kiểm tra độ trễ endpoint (AC-02):"
    echo "  ./scripts/setup-nominatim.sh test"
    ;;

  down)
    echo ">>> Đang dừng container Nominatim..."
    docker compose -f "$COMPOSE_FILE" down
    echo "Đã dừng container thành công."
    ;;

  restart)
    echo ">>> Đang khởi động lại container Nominatim..."
    docker compose -f "$COMPOSE_FILE" restart
    echo "Đã khởi động lại container."
    ;;

  logs)
    echo ">>> Đang xem log trực tiếp từ rdg-nominatim (Nhấn Ctrl+C để thoát)..."
    docker compose -f "$COMPOSE_FILE" logs -f nominatim
    ;;

  status)
    echo ">>> Trạng thái container Nominatim:"
    docker compose -f "$COMPOSE_FILE" ps
    echo ""
    echo ">>> Kiểm tra kết nối đến http://localhost:8080..."
    if curl -s -f -m 3 "http://localhost:8080/status.php" >/dev/null; then
      echo "Nominatim đang hoạt động bình thường."
    else
      echo "Lưu ý: Endpoint http://localhost:8080 chưa sẵn sàng (có thể đang import dữ liệu OSM)."
    fi
    ;;

  test)
    echo ">>> Kiểm tra endpoint reverse geocoding (AC-02)..."
    TEST_URL="http://localhost:8080/reverse?format=json&lat=10.782345&lon=106.699876&addressdetails=1&accept-language=vi"
    echo "URL: $TEST_URL"

    START_TIME=$(date +%s%N)
    RESPONSE=$(curl -s -m 5 "$TEST_URL" || true)
    END_TIME=$(date +%s%N)

    if [ -n "$RESPONSE" ] && [[ "$RESPONSE" == *"address"* ]]; then
      ELAPSED_MS=$(( (END_TIME - START_TIME) / 1000000 ))
      echo ""
      echo "[KẾT QUẢ TEST THÀNH CÔNG]"
      echo "  - Thời gian phản hồi: ${ELAPSED_MS} ms"
      echo "  - Phản hồi: $RESPONSE"
      if [ "$ELAPSED_MS" -lt 20 ]; then
        echo ">>> Đạt tiêu chí AC-02 (< 20ms)!"
      else
        echo ">>> Chú ý: Thời gian ${ELAPSED_MS} ms (mong đợi < 20ms trên môi trường production)."
      fi
    else
      echo ""
      echo "[LỖI] Không thể kết nối đến local Nominatim hoặc nhận dữ liệu không hợp lệ."
      echo "Kiểm tra log import bằng: ./scripts/setup-nominatim.sh logs"
    fi
    ;;

  *)
    echo "Sử dụng: $0 {up|down|restart|logs|status|test}"
    exit 1
    ;;
esac
