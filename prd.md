# 📋 Product Requirements Document (PRD)

## 1. Kullanıcı Hedefleri
- Sosyal etkileşimlerdeki kaygı seviyesini düşürmek.
- İletişim hatalarını kimse görmeden fark etmek.
- Farklı sosyal senaryolar için "cevap kalıpları" geliştirmek.

## 2. Temel Özellikler (MVP)
### A. Senaryo Seçici
- Ön tanımlı şablonlar: "Akademik Sunum", "İlk Buluşma", "İş Mülakatı", "Zor Komşu".
- Özel senaryo girişi: Kullanıcı kendi durumunu tanımlayabilir.

### B. AI Role-Play Motoru
- LLM tabanlı (Gemini/OpenAI) dinamik karakter yönetimi.
- Kullanıcının mesajlarına bağlamdan kopmadan, karakterin duygu durumuna göre cevap verme.

### C. Analiz ve Skorlama (Feedback Loop)
- Konuşma sonunda: *Özgüven Skoru*, *Nezaket Skoru* ve *Netlik Skoru*.
- İyileştirme önerileri: "Şu cümleyi kurmak yerine şunu deneyebilirsin."

## 3. Teknik Gereksinimler
- **Hız:** AI yanıt süresi < 2 saniye olmalı.
- **Gizlilik:** Konuşmalar sunucuda tutulmamalı (Client-side focus).
- **Erişilebilirlik:** Mobil cihazlardan kolayca mesajlaşılabilir arayüz.