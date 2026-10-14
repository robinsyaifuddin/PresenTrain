<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Reset Kata Sandi PresenTrain</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f1f5f9;
      margin: 0;
      padding: 0;
      color: #334155;
    }
    .wrapper {
      max-width: 580px;
      margin: 32px auto;
      background: #ffffff;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0,0,0,0.06);
      border: 1px solid #e2e8f0;
    }
    .header {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      padding: 32px 28px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 6px 0 0 0;
      font-size: 13px;
      color: #d1fae5;
    }
    .content {
      padding: 32px 28px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 12px;
    }
    .otp-box {
      margin: 24px 0;
      padding: 24px;
      background: #f8fafc;
      border: 2px dashed #059669;
      border-radius: 16px;
      text-align: center;
    }
    .otp-label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 38px;
      font-weight: 800;
      color: #059669;
      letter-spacing: 8px;
      margin: 4px 0;
    }
    .expiry {
      font-size: 12px;
      color: #b91c1c;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-card {
      background: #ecfdf5;
      border-left: 4px solid #059669;
      padding: 14px 16px;
      border-radius: 8px;
      margin: 20px 0;
      font-size: 13px;
      color: #065f46;
    }
    .footer {
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      padding: 20px 28px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    .footer p {
      margin: 4px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>PresenTrain</h1>
      <p>Sistem Presensi & Pelatihan Terpadu</p>
    </div>

    <div class="content">
      <div class="greeting">Halo, {{ $userName }}!</div>
      <p style="font-size: 14px; color: #475569; margin: 0 0 16px 0;">
        Kami menerima permintaan untuk mereset kata sandi akun PresenTrain Anda. Masukkan kode One-Time Password (OTP) berikut untuk melanjutkan verifikasi:
      </p>

      <div class="otp-box">
        <div class="otp-label">Kode Verifikasi OTP Anda</div>
        <div class="otp-code">{{ $otp }}</div>
        <div class="expiry">Berlaku selama {{ $expiresInMinutes }} menit</div>
      </div>

      <div class="info-card">
        <strong>Penting:</strong> Jangan berikan kode OTP ini kepada siapa pun, termasuk panitia atau administrator PresenTrain.
      </div>

      <p style="font-size: 13px; color: #64748b; margin-top: 20px;">
        Jika Anda tidak merasa melakukan permintaan reset kata sandi ini, silakan abaikan email ini. Akun dan kata sandi Anda tetap aman.
      </p>
    </div>

    <div class="footer">
      <p>Email ini dikirim secara otomatis oleh sistem <strong>PresenTrain</strong>.</p>
      <p>&copy; {{ date('Y') }} PresenTrain. Seluruh hak cipta dilindungi.</p>
    </div>
  </div>
</body>
</html>
