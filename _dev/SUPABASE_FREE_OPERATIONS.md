# Supabase Free işletim notları

8 Ekim 2026 tarihinde resmi fiyatlandırma: 500 MB veritabanı, 1 GB dosya depolama, 5 GB egress ve ayrıca 5 GB cached egress. API istek sayısı sınırsız; işlem gücü ve veri aktarımı sınırsız değildir. Free otomatik veritabanı yedeği sunmaz. Pro başlangıcı 25 USD/ay; günlük veritabanı yedekleri 7 gün saklanır, limitsiz değildir. Storage dosyaları için ayrıca yedek gerekir.

500 MB'nin kaç satışa yeteceği satır boyutu, indeksler ve diğer tablolar ölçülmeden söylenemez. 1 GB / 200 KB kabaca 5.000 dosyadır; ancak davetiye PNG/PDF'leri de aynı dosya kotasını tüketir. Eski materyallerin mevcut temizleme akışı kullanılmalıdır.

## Eklenen günlük kontrol

`Supabase database health` GitHub Actions iş akışı günlük 07:43 UTC'de (Budapeşte kışın 08:43, yazın 09:43) ve elle çalışır. Yalnızca public anahtarla `partners?select=id&limit=1` GET isteği yapar. İş verisine yazmaz; tablo, ping kaydı veya dosya oluşturmaz. Normalde bir istek, geçici hata durumunda en fazla üç deneme yapar. Kontrol bir partner satırı döndürürse erişim politikası uyarısı ile başarısız olur; satır veya kimlik loga yazılmaz. Yanıtın boş olması bütün RLS/RPC güvenliğinin doğrulandığı anlamına gelmez.

Başarısız kontrol GitHub Actions'ta başarısız run üretir. Bildirim alabilmek için hesabın Actions bildirim/e-posta tercihlerinin açık olması gerekir; bu kod ayrı e-posta servisi kurmaz. İş akışı varsayılan dala gönderilmeden otomasyon aktif değildir.

## Garanti ve kurtarma

Supabase 7 günlük düşük aktiviteye göre Free projeyi duraklatabilir. Site ana sayfasının açılması statik sayfa trafiğidir; tek başına veritabanı aktivitesi değildir. Günlük sağlık kontrolü erişimi gözlemlemek için kullanılır; pause engelleme garantisi vermez. GitHub schedule gecikebilir, hata verebilir; public depolarda 60 gün depo aktivitesi yoksa zamanlanmış iş akışları devre dışı bırakılabilir. Actions durumunu ve Supabase bildirimlerini takip edin.

Duraklatma durumunda Supabase Dashboard'dan projeyi geri açın ve partner girişini/materyalleri doğrulayın. İnaktiviteye bağlı otomatik duraklamayı kaldırmanın resmi yolu Pro'ya geçmektir; ücretli plana geçiş bu çalışma kapsamında yapılmadı. Pro da arızasız/sınırsız sistem garantisi değildir.

Kaynaklar:
- https://supabase.com/pricing
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule
