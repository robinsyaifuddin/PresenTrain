import React, { useState, useRef, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  User, Mail, Building, Briefcase, Phone, QrCode, 
  KeyRound, ShieldCheck, Save, ArrowLeft, CheckCircle2, Copy, Sparkles,
  Download, Printer, Award, Clock, Check, Shield, Camera, Trash2, Upload
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../../services/api';
import NotificationPopup from '@/components/ui/Feedback/NotificationPopup';

export default function ProfileView({ user, onUpdateUser, onBack }) {
  const [activeTab, setActiveTab] = useState('biodata');
  const qrTokenDisplay = user?.qrToken || user?.qrCode || `${user?.id || '881023'}`;
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [instansi, setInstansi] = useState(user?.instansi || '');
  const [gender, setGender] = useState(user?.gender || '');
  const [jabatan, setJabatan] = useState(user?.jabatan || (user?.role === 'super_admin' ? 'Super Administrator' : user?.role === 'admin' ? 'Panitia Operator' : 'Peserta Training'));
  const [phone, setPhone] = useState(user?.phone || '');
  const [bioNote, setBioNote] = useState('');
  
  const userAvatar = user?.avatar || user?.avatar_url || user?.picture || user?.photo || null;
  const [avatar, setAvatar] = useState(userAvatar);
  const fileInputRef = useRef(null);
  
  const [isPhotoDropdownOpen, setIsPhotoDropdownOpen] = useState(false);
  const photoDropdownRef = useRef(null);

  useEffect(() => {
    const currentAv = user?.avatar || user?.avatar_url || user?.picture || user?.photo || null;
    setAvatar(currentAv);
    if (user?.name) setName(user.name);
    if (user?.email) setEmail(user.email);
    if (user?.instansi) setInstansi(user.instansi);
    if (user?.gender) setGender(user.gender);
    if (user?.phone) setPhone(user.phone);
  }, [user?.avatar, user?.avatar_url, user?.picture, user?.photo, user?.name, user?.email, user?.instansi, user?.gender, user?.phone]);

  // Validasi & Sinkronisasi profil terkini dari backend saat halaman profil dibuka
  useEffect(() => {
    let isMounted = true;
    api.getCurrentUser()
      .then((latestUser) => {
        if (isMounted && latestUser && latestUser.id && onUpdateUser) {
          const mapped = {
            ...user,
            ...latestUser,
            qrToken: latestUser.user_qr_token || latestUser.qrToken || user?.qrToken,
          };
          onUpdateUser(mapped);
        }
      })
      .catch((err) => {
        console.warn('Gagal memuat profil sinkronisasi:', err);
      });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (photoDropdownRef.current && !photoDropdownRef.current.contains(event.target)) {
        setIsPhotoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [notification, setNotification] = useState('');
  const [copied, setCopied] = useState(false);

  const showToast = (msg) => {
    setNotification(msg);
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran foto terlalu besar (maksimal 5MB)!');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64Url = reader.result;
      setAvatar(base64Url);
      const updatedUserObj = {
        ...user,
        name,
        email,
        instansi,
        gender,
        jabatan,
        phone,
        avatar: base64Url
      };
      if (onUpdateUser) {
        onUpdateUser(updatedUserObj);
      }
      try {
        const res = await api.updateProfile({
          id: user?.db_id || user?.id,
          email: user?.email || email,
          name,
          instansi,
          gender,
          phone,
          avatar: base64Url
        });
        if (res && res.ok && res.data?.user && onUpdateUser) {
          onUpdateUser({
            ...updatedUserObj,
            ...res.data.user,
            class_id: res.data.user.class_id ?? user?.class_id,
            class_name: res.data.user.class_name ?? user?.class_name,
            class: res.data.user.class ?? user?.class,
          });
        }
      } catch (err) {
        console.warn('Gagal sinkronisasi avatar ke server:', err);
      }
      showToast('Foto profil berhasil diunggah!');
    };
    reader.readAsDataURL(file);
  };

  const handleDeletePhoto = async () => {
    setAvatar(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    const updatedUserObj = {
      ...user,
      name,
      email,
      instansi,
      jabatan,
      phone,
      avatar: null
    };
    if (onUpdateUser) {
      onUpdateUser(updatedUserObj);
    }
    try {
      const res = await api.updateProfile({
        id: user?.db_id || user?.id,
        email: user?.email || email,
        name,
        instansi,
        phone,
        avatar: null
      });
      if (res && res.ok && res.data?.user && onUpdateUser) {
        onUpdateUser({
          ...updatedUserObj,
          ...res.data.user,
          class_id: res.data.user.class_id ?? user?.class_id,
          class_name: res.data.user.class_name ?? user?.class_name,
          class: res.data.user.class ?? user?.class,
        });
      }
    } catch (err) {
      console.warn('Gagal menghapus avatar dari server:', err);
    }
    showToast('Foto profil berhasil dihapus!');
  };

  const handleDownloadHDQR = () => {
    try {
      const qrSvg = document.getElementById('profile-qr-code-svg');
      if (!qrSvg) {
        showToast('Gagal menemukan QR Code.');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Full HD 1200x1200px High Resolution canvas
      const hdSize = 1200;
      canvas.width = hdSize;
      canvas.height = hdSize;

      img.onload = () => {
        // Draw crisp solid white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, hdSize, hdSize);

        // Draw QR Code centered with 100px padding
        const padding = 100;
        const qrSize = hdSize - (padding * 2);
        ctx.drawImage(img, padding, padding, qrSize, qrSize);

        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        const safeName = (name || user?.name || 'Peserta').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.download = `QR_Absensi_${safeName}_FullHD.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        showToast('QR Code Full HD (.png) berhasil diunduh!');
      };

      img.onerror = () => {
        showToast('Gagal memproses unduhan gambar QR.');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download QR Error', err);
      showToast('Terjadi kesalahan saat mengunduh QR Code.');
    }
  };

  const handleCopyQrToken = () => {
    navigator.clipboard.writeText(qrTokenDisplay);
    setCopied(true);
    showToast('Token QR Presensi berhasil disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveBiodata = async (e) => {
    e.preventDefault();
    if (!name || !email) {
      showToast('Nama dan Email tidak boleh kosong!');
      return;
    }

    const updatedUserObj = {
      ...user,
      name,
      email,
      instansi,
      gender,
      jabatan,
      phone,
      avatar
    };

    if (onUpdateUser) {
      onUpdateUser(updatedUserObj);
    }

    try {
      const res = await api.updateProfile({
        id: user?.db_id || user?.id,
        email: user?.email || email,
        name,
        instansi,
        gender,
        phone,
        avatar
      });
      if (res && res.ok && res.data?.user && onUpdateUser) {
        onUpdateUser({
          ...updatedUserObj,
          ...res.data.user,
          class_id: res.data.user.class_id ?? user?.class_id,
          class_name: res.data.user.class_name ?? user?.class_name,
          class: res.data.user.class ?? user?.class,
        });
      }
    } catch (err) {
      console.warn('Gagal sinkronisasi biodata ke server:', err);
    }

    try {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
    } catch (err) {}

    showToast('Data Profil & Biodata Akun Berhasil Diperbarui!');
  };

  const isStaffAdmin = user?.role === 'super_admin' || user?.role === 'admin' || user?.raw_role === 'super_admin' || user?.raw_role === 'admin';
  const displayManualCode = (() => {
    if (!qrTokenDisplay) return '-';
    const match = String(qrTokenDisplay).match(/(\d{4,})$/);
    return match ? match[1] : qrTokenDisplay;
  })();

  const handleDownloadIDCardJPG = () => {
    try {
      const qrSvg = document.getElementById('printable-idcard-qr') || document.getElementById('profile-qr-code-svg');
      if (!qrSvg) {
        showToast('Gagal memproses QR Code untuk kartu.');
        return;
      }

      const svgData = new XMLSerializer().serializeToString(qrSvg);
      const qrImg = new Image();

      qrImg.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Ukuran kartu proporsional ID Card tegak (Portrait ID Card: 720 x 1080 px @ 2x HD)
        const width = 720;
        const height = 1080;
        canvas.width = width;
        canvas.height = height;

        // Background Gradient Hijau Emerald Menawan
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#064e3b');   // emerald-900
        bgGrad.addColorStop(0.5, '#047857'); // emerald-700
        bgGrad.addColorStop(1, '#115e59');   // teal-800
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Frame Border dalam (halus)
        ctx.strokeStyle = 'rgba(110, 231, 183, 0.25)';
        ctx.lineWidth = 4;
        ctx.strokeRect(30, 30, width - 60, height - 60);

        // Header Pill Badge "KARTU TANDA PESERTA RESMI"
        const badgeText = 'KARTU TANDA PESERTA RESMI';
        ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        const badgeWidth = ctx.measureText(badgeText).width + 48;
        const badgeX = (width - badgeWidth) / 2;
        const badgeY = 70;

        ctx.fillStyle = 'rgba(52, 211, 153, 0.2)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(badgeX, badgeY, badgeWidth, 38, 19);
        } else {
          ctx.rect(badgeX, badgeY, badgeWidth, 38);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(167, 243, 208, 0.4)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#a7f3d0';
        ctx.textAlign = 'center';
        ctx.fillText(badgeText, width / 2, badgeY + 26);

        // Title "PresenTrain Digital ID"
        ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('PresenTrain Digital ID', width / 2, 160);

        // Garis Pembatas Header
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 190);
        ctx.lineTo(width - 80, 190);
        ctx.stroke();

        // White Container Box untuk QR Code
        const qrBoxSize = 360;
        const qrBoxX = (width - qrBoxSize) / 2;
        const qrBoxY = 225;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 28);
        } else {
          ctx.rect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize);
        }
        ctx.fill();

        // Shadow / Inner border untuk QR Box
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw QR Image inside Box
        const qrPadding = 24;
        const drawQrSize = qrBoxSize - (qrPadding * 2);
        ctx.drawImage(qrImg, qrBoxX + qrPadding, qrBoxY + qrPadding, drawQrSize, drawQrSize);

        // Informasi Peserta
        const infoStartY = 640;

        // Nama Lengkap Peserta
        ctx.font = '900 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#ffffff';
        const participantName = name || user?.name || 'Peserta Training';
        ctx.fillText(participantName, width / 2, infoStartY);

        // Asal Instansi / Komisariat
        ctx.font = '600 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#d1fae5';
        const participantInstansi = instansi || user?.instansi || 'Peserta Training';
        ctx.fillText(participantInstansi, width / 2, infoStartY + 38);

        // Box Nomor Unik Presensi Manual
        const codeBoxY = infoStartY + 75;
        const codeBoxW = 440;
        const codeBoxH = 110;
        const codeBoxX = (width - codeBoxW) / 2;

        ctx.fillStyle = 'rgba(6, 78, 59, 0.65)';
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 16);
        } else {
          ctx.rect(codeBoxX, codeBoxY, codeBoxW, codeBoxH);
        }
        ctx.fill();
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText('NOMOR UNIK PRESENSI MANUAL', width / 2, codeBoxY + 32);

        ctx.font = '900 36px "Courier New", monospace';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(displayManualCode, width / 2, codeBoxY + 76);

        // Nomor Unik Presensi Manual (Tunggal)

        // Footer Garis & Status
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(80, 990);
        ctx.lineTo(width - 80, 990);
        ctx.stroke();

        ctx.font = '700 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText('Status: Terverifikasi Panitia Resmi • PresenTrain', width / 2, 1030);

        // Download as high-quality JPG
        const jpgUrl = canvas.toDataURL('image/jpeg', 0.95);
        const downloadLink = document.createElement('a');
        const safeName = (name || user?.name || 'Peserta').replace(/[^a-zA-Z0-9_-]/g, '_');
        downloadLink.href = jpgUrl;
        downloadLink.download = `Kartu_Peserta_${safeName}_HD.jpg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);

        showToast('Kartu peserta HD (.jpg) berhasil diunduh!');
      };

      qrImg.onerror = () => {
        showToast('Gagal memproses gambar QR untuk kartu.');
      };

      qrImg.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download ID Card Error:', err);
      showToast('Terjadi kesalahan saat mengunduh kartu peserta.');
    }
  };

  const handlePrintIDCard = () => {
    const printWindow = window.open('', '_blank', 'width=480,height=640');
    if (!printWindow) {
      window.print();
      return;
    }

    const qrSvgElement = document.getElementById('printable-idcard-qr') || document.getElementById('profile-qr-code-svg');
    const qrSvgHtml = qrSvgElement ? qrSvgElement.outerHTML : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Kartu Peserta - ${name}</title>
          <meta charset="utf-8">
          <style>
            @page {
              size: portrait;
              margin: 15mm;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              padding: 20px;
            }
            .id-card {
              width: 320px;
              background: linear-gradient(135deg, #065f46 0%, #047857 50%, #115e59 100%);
              color: #ffffff;
              border-radius: 24px;
              padding: 24px;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
              box-sizing: border-box;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .card-header {
              border-bottom: 1px solid rgba(16, 185, 129, 0.3);
              padding-bottom: 14px;
              margin-bottom: 20px;
              text-align: center;
            }
            .badge {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 1px;
              background: rgba(52, 211, 153, 0.2);
              color: #a7f3d0;
              padding: 4px 10px;
              border-radius: 9999px;
              display: inline-block;
              border: 1px solid rgba(110, 231, 183, 0.3);
            }
            .title {
              font-size: 18px;
              font-weight: 900;
              margin-top: 6px;
              margin-bottom: 0;
              color: #ffffff;
            }
            .qr-container {
              background: #ffffff;
              padding: 14px;
              border-radius: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 0 auto 20px auto;
              width: 140px;
              height: 140px;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
              box-sizing: border-box;
            }
            .user-info {
              text-align: center;
              margin-bottom: 20px;
            }
            .user-name {
              font-size: 18px;
              font-weight: 800;
              margin: 0 0 4px 0;
              color: #ffffff;
            }
            .user-instansi {
              font-size: 12px;
              color: #d1fae5;
              font-weight: 500;
              margin: 0 0 6px 0;
            }
            .manual-box {
              background: rgba(6, 78, 59, 0.6);
              border: 1px solid rgba(52, 211, 153, 0.4);
              border-radius: 10px;
              padding: 6px 10px;
              margin: 10px auto;
            }
            .manual-label {
              font-size: 9px;
              color: #6ee7b7;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .manual-val {
              font-size: 16px;
              color: #ffffff;
              font-family: monospace;
              font-weight: 900;
              letter-spacing: 2px;
            }
            .user-token {
              font-size: 10.5px;
              color: #a7f3d0;
              font-family: monospace;
              letter-spacing: 0.5px;
              margin: 6px 0 0 0;
            }
            .card-footer {
              border-top: 1px solid rgba(16, 185, 129, 0.3);
              padding-top: 14px;
              font-size: 10px;
              color: #d1fae5;
              text-align: center;
              font-weight: 600;
            }
          </style>
        </head>
        <body>
          <div class="id-card">
            <div class="card-header">
              <span class="badge">KARTU TANDA PESERTA RESMI</span>
              <h3 class="title">PresenTrain Digital ID</h3>
            </div>
            
            <div class="qr-container">
              ${qrSvgHtml}
            </div>
            
            <div class="user-info">
              <h4 class="user-name">${name}</h4>
              <p class="user-instansi">${instansi}</p>
              <div class="manual-box">
                <div class="manual-label">Nomor Presensi Manual</div>
                <div class="manual-val">${displayManualCode}</div>
              </div>
            </div>
            
            <div class="card-footer">
              Status: Terverifikasi Panitia
            </div>
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 350);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-6xl mx-auto font-sans animate-fade-in w-full">
      {notification && (
        <NotificationPopup
          message={notification}
          onClose={() => setNotification('')}
          duration={1000}
          type="success"
        />
      )}

      {onBack && (
        <button
          onClick={onBack}
          className="text-slate-600 hover:text-emerald-700 font-bold text-xs flex items-center space-x-1.5 underline underline-offset-4 cursor-pointer transition-colors w-fit mb-2"
          title="Kembali ke Beranda"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-md p-6 border border-slate-200/80 shadow-xs space-y-5 text-center">
            
            {/* Hidden Input File untuk Unggah Foto */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handlePhotoChange}
              className="hidden"
            />

            {/* Foto Profil Circle dengan Camera Edit Badge & Dropdown */}
            <div className="flex flex-col items-center">
              <div className="relative inline-block" ref={photoDropdownRef}>
                {/* Avatar Circle */}
                <div 
                  onClick={() => setIsPhotoDropdownOpen(!isPhotoDropdownOpen)}
                  className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full ring-4 ring-emerald-500/20 border-2 border-white shadow-md cursor-pointer overflow-hidden flex items-center justify-center bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-800 font-extrabold text-3xl select-none transition-all hover:ring-emerald-500/50 group"
                  title="Klik untuk kelola foto profil"
                >
                  {avatar ? (
                    <img 
                      src={avatar} 
                      alt={name || user?.name} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                      onError={() => setAvatar(null)}
                    />
                  ) : (
                    <span className="uppercase text-3xl font-black text-emerald-700">
                      {name ? name.charAt(0) : <User className="w-12 h-12 text-emerald-600" />}
                    </span>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera className="w-6 h-6 drop-shadow-md" />
                  </div>
                </div>

                {/* Badge Icon Kamera di Pojok Kanan Bawah */}
                <button
                  type="button"
                  onClick={() => setIsPhotoDropdownOpen(!isPhotoDropdownOpen)}
                  className="absolute bottom-1 right-1 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg border-2 border-white transition-all transform active:scale-90 hover:scale-105 cursor-pointer z-10"
                  title="Sunting Foto Profil"
                >
                  <Camera className="w-4 h-4" />
                </button>

                {/* Dropdown Menu Unggah & Hapus */}
                {isPhotoDropdownOpen && (
                  <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-48 bg-white rounded-md shadow-md border border-slate-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                    <button
                      type="button"
                      onClick={() => {
                        setIsPhotoDropdownOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full px-3.5 py-2.5 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold text-xs flex items-center space-x-2.5 transition-colors cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Unggah Foto</span>
                    </button>

                    {avatar && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsPhotoDropdownOpen(false);
                          handleDeletePhoto();
                        }}
                        className="w-full px-3.5 py-2.5 hover:bg-rose-50 text-slate-700 hover:text-rose-600 font-bold text-xs flex items-center space-x-2.5 transition-colors cursor-pointer border-t border-slate-100"
                      >
                        <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
                        <span>Hapus Foto</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{name || user?.name}</h3>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">{instansi}</p>
              
              <div className="mt-2.5 flex items-center justify-center">
                {user?.role === 'super_admin' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Super Administrator
                  </span>
                ) : user?.role === 'admin' ? (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Administrator Panitia
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-extrabold bg-teal-50 text-teal-800 border border-teal-200">
                    <Award className="w-3.5 h-3.5 mr-1" />
                    {user?.class_name || user?.className || (user?.class?.name ? user.class.name : 'Kelas Umum')}
                  </span>
                )}
              </div>
            </div>

            {!isStaffAdmin && (
              <div className="p-5 bg-slate-50 rounded-md border border-slate-200/90 space-y-3">
                <div className="bg-white p-4 rounded-md border border-slate-200 flex justify-center">
                  <QRCodeSVG
                    id="profile-qr-code-svg"
                    value={qrTokenDisplay}
                    size={170}
                    level="H"
                    includeMargin={true}
                    className="rounded-md"
                  />
                </div>

                {/* Nomor Unik Presensi Manual */}
                <div className="bg-emerald-50/70 border border-emerald-200 rounded-md p-2.5 text-center shadow-2xs">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block tracking-wider mb-0.5">
                    Nomor Unik Presensi Manual
                  </span>
                  <span className="font-mono font-black text-emerald-950 text-base tracking-widest block">
                    {displayManualCode}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadHDQR}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-md transition-colors shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer"
                  title="Unduh Gambar QR Code Full HD (.png)"
                >
                  <Download className="w-4 h-4" />
                  <span>Unduh QR</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 bg-white rounded-md border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">

          <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-4 space-x-6 text-xs font-bold">
            <button
              onClick={() => setActiveTab('biodata')}
              className={`pb-3.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                activeTab === 'biodata' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Informasi</span>
            </button>

            {!isStaffAdmin && (
              <button
                onClick={() => setActiveTab('id_card')}
                className={`pb-3.5 border-b-2 transition-all flex items-center space-x-2 cursor-pointer ${
                  activeTab === 'id_card' ? 'border-emerald-600 text-emerald-700 font-black' : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>Kartu Digital</span>
              </button>
            )}
          </div>

          <div className="p-6 flex-1">
            {activeTab === 'biodata' && (
              <form onSubmit={handleSaveBiodata} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white rounded-md border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alamat Email <span className="text-rose-500">*</span></label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 bg-white rounded-md border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Asal Komisariat</label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={instansi}
                        onChange={(e) => setInstansi(e.target.value)}
                        placeholder="Contoh: HMI Komisariat Tarbiyah UIN RIL"
                        className="w-full pl-10 pr-3 py-2.5 bg-white rounded-md border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Jenis Kelamin</label>
                    <div className="relative">
                      <select
                        value={gender || 'L'}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white rounded-md border border-slate-300 text-slate-900 font-semibold outline-none focus:border-emerald-600 transition-colors cursor-pointer"
                      >
                        <option value="L">Laki-laki</option>
                        <option value="P">Perempuan</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor WhatsApp / Telepon Kontak</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 bg-white rounded-md border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Catatan Biodata Ringkas</label>
                  <textarea
                    rows={1}
                    value={bioNote}
                    ref={(el) => {
                      if (el) {
                        el.style.height = 'auto';
                        el.style.height = `${Math.max(el.scrollHeight, 60)}px`;
                      }
                    }}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(e.target.scrollHeight, 60)}px`;
                    }}
                    onChange={(e) => {
                      setBioNote(e.target.value);
                      e.target.style.height = 'auto';
                      e.target.style.height = `${Math.max(e.target.scrollHeight, 60)}px`;
                    }}
                    className="w-full p-3 bg-white rounded-md border border-slate-300 text-slate-900 font-medium outline-none focus:border-emerald-600 transition-colors text-xs resize-none overflow-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-md flex items-center justify-center space-x-2 transition-colors cursor-pointer active:scale-95"
                  >
                    <Save className="w-4 h-4" />
                    <span className="hidden sm:inline">Simpan Perubahan Biodata</span>
                    <span className="sm:hidden">Simpan Biodata</span>
                  </button>
                </div>
              </form>
            )}

            {!isStaffAdmin && activeTab === 'id_card' && (
              <div className="space-y-5 text-xs">
                <div className="max-w-[340px] w-full mx-auto p-6 bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl border border-emerald-600/40 shadow-xl relative overflow-hidden space-y-5 text-center">
                  <div className="border-b border-emerald-500/30 pb-4 text-center">
                    <span className="text-[10px] font-extrabold uppercase bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/30 inline-block">
                      KARTU TANDA PESERTA RESMI
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">PresenTrain Digital ID</h3>
                  </div>

                  <div className="flex flex-col items-center justify-center gap-4 text-center">
                    <div className="bg-white p-3.5 rounded-2xl shadow-md shrink-0 mx-auto">
                      <QRCodeSVG id="printable-idcard-qr" value={qrTokenDisplay} size={140} level="H" />
                    </div>
                    <div className="space-y-2 text-center w-full">
                      <h4 className="text-lg font-extrabold text-white leading-tight">{name}</h4>
                      <p className="text-xs text-emerald-100 font-medium">{instansi}</p>
                      
                      {/* Box Nomor Unik Presensi Manual di Kartu */}
                      <div className="bg-emerald-950/50 border border-emerald-400/30 rounded-xl py-2 px-3 mx-2">
                        <span className="text-[9px] uppercase tracking-wider text-emerald-300 font-bold block">
                          Nomor Presensi Manual
                        </span>
                        <span className="font-mono text-base font-extrabold text-white tracking-widest block">
                          {displayManualCode}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-500/30 text-[10px] text-emerald-100 font-semibold text-center">
                    Status: Terverifikasi Panitia
                  </div>
                </div>

                <div className="flex justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadIDCardJPG}
                    className="p-2.5 sm:px-5 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl border border-emerald-500 flex items-center space-x-1.5 sm:space-x-2 transition-all cursor-pointer shadow-xs active:scale-95"
                    title="Unduh Kartu Peserta Format HD (.jpg)"
                  >
                    <Download className="w-4 h-4 text-white" />
                    <span>Unduh Kartu</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrintIDCard}
                    className="p-2.5 sm:px-4 sm:py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-2xl border border-slate-300 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                    title="Cetak via Dialog Browser / PDF"
                  >
                    <Printer className="w-4 h-4 text-slate-500" />
                    <span className="hidden sm:inline">Print</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
