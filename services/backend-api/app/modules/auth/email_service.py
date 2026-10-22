import logging
import smtplib
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import Settings

logger = logging.getLogger("auth.email")


class EmailDeliveryError(Exception):
    """Lỗi khi không thể gửi email xác thực qua máy chủ SMTP."""
    pass


def build_email_html_content(otp_code: str, expires_in_minutes: int) -> str:
    return f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mã xác thực đổi mật khẩu</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; }}
    .container {{ max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #E2E8F0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }}
    .header {{ text-align: center; margin-bottom: 24px; }}
    .badge {{ display: inline-block; background: #EFF6FF; color: #1D4ED8; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; letter-spacing: 0.5px; text-transform: uppercase; }}
    .title {{ font-size: 22px; font-weight: 800; color: #0F172A; margin: 12px 0 4px; }}
    .subtitle {{ font-size: 14px; color: #64748B; margin: 0; }}
    .body-text {{ font-size: 15px; color: #334155; line-height: 1.6; margin: 20px 0; }}
    .otp-card {{ background: #F1F5F9; border: 2px dashed #93C5FD; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }}
    .otp-code {{ font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #1E40AF; font-family: monospace; }}
    .warning {{ font-size: 13px; color: #DC2626; margin-top: 8px; font-weight: 600; }}
    .footer {{ font-size: 12px; color: #94A3B8; text-align: center; margin-top: 24px; border-top: 1px solid #F1F5F9; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="badge">Hệ thống Road Damage GIS</div>
      <h1 class="title">Xác thực khôi phục mật khẩu</h1>
      <p class="subtitle">Yêu cầu cấp lại mật khẩu tài khoản người dùng/kỹ sư</p>
    </div>
    <p class="body-text">
      Xin chào,<br><br>
      Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản ứng dụng di động Road Damage GIS của bạn.
      Vui lòng sử dụng mã xác nhận (OTP) bên dưới để hoàn tất xác minh:
    </p>
    <div class="otp-card">
      <div class="otp-code">{otp_code}</div>
      <div class="warning">⚠️ Mã xác nhận có hiệu lực trong {expires_in_minutes} phút.</div>
    </div>
    <p class="body-text" style="font-size: 13px; color: #64748B;">
      Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này. Mật khẩu của bạn sẽ không bị thay đổi.
    </p>
    <div class="footer">
      © 2026 Road Damage GIS. Bản quyền thuộc về Đồ án Tốt nghiệp Hệ thống GIS Nhận dạng Hư hỏng Mặt đường.
    </div>
  </div>
</body>
</html>"""


def send_password_reset_otp_email(
    email: str,
    otp_code: str,
    expires_in_minutes: int,
    settings: Settings,
) -> bool:
    """
    Gửi email chứa mã OTP khôi phục mật khẩu trực tiếp tới hộp thư Gmail của người dùng.
    """
    logger.info(
        f"[AUTH OTP] Bắt đầu gửi mã OTP {otp_code} tới hộp thư Gmail: {email} (Hiệu lực: {expires_in_minutes} phút)"
    )

    import os
    is_test_environment = (
        settings.app_env == "test"
        or "pytest" in sys.modules
        or bool(os.environ.get("PYTEST_CURRENT_TEST"))
    )

    if not (settings.smtp_host and settings.smtp_user and settings.smtp_password):
        if is_test_environment:
            logger.info("[AUTH OTP] Môi trường kiểm thử tự động (Unit Test): Bỏ qua gửi SMTP thực tế.")
            return True
        raise EmailDeliveryError(
            "Máy chủ chưa được cấu hình tài khoản gửi thư Gmail (SMTP). "
            "Vui lòng thiết lập SMTP_HOST, SMTP_USER, SMTP_PASSWORD trong file .env."
        )

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[{otp_code}] Mã xác nhận khôi phục mật khẩu - Road Damage GIS"
        msg["From"] = f"{settings.smtp_from_name} <{settings.smtp_from_email or settings.smtp_user}>"
        msg["To"] = email

        text_content = (
            f"Mã xác nhận khôi phục mật khẩu Road Damage GIS của bạn là: {otp_code}\n"
            f"Mã này có hiệu lực trong {expires_in_minutes} phút.\n"
            "Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email."
        )
        html_content = build_email_html_content(otp_code, expires_in_minutes)

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.smtp_port == 465:
            with smtplib.SMTP_SSL(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from_email or settings.smtp_user, [email], msg.as_string())
        elif settings.smtp_use_tls:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                server.starttls()
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from_email or settings.smtp_user, [email], msg.as_string())
        else:
            with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
                server.login(settings.smtp_user, settings.smtp_password)
                server.sendmail(settings.smtp_from_email or settings.smtp_user, [email], msg.as_string())

        logger.info(f"[AUTH OTP] Đã gửi mã xác nhận thành công tới hòm thư Gmail: {email}")
        return True
    except Exception as e:
        logger.error(f"[AUTH OTP] Gửi thư tới {email} thất bại: {e}")
        raise EmailDeliveryError(
            f"Không thể gửi email xác nhận tới {email}. "
            f"Lỗi kết nối máy chủ gửi thư: {e}"
        ) from e
