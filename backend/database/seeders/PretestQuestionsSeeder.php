<?php

namespace Database\Seeders;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\Training;
use Illuminate\Database\Seeder;

class PretestQuestionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Membuat / memperbarui 50 Soal Pilihan Ganda (4 Opsi: A, B, C, D) untuk Pre-Test LK 1
     * sesuai data valid dari Bank Soal Perkaderan HMI (Seeder-Kuis.docx).
     */
    public function run(): void
    {
        $training = Training::first();
        $trainingId = $training ? $training->id : null;

        // 1. Pastikan Kuis Pre-Test Master ada
        $quiz = Quiz::updateOrCreate(
            ['quiz_code' => 'QZ-HMI-001'],
            [
                'training_id'      => $trainingId,
                'title'            => 'Pre-Test LK 1: Wawasan Ke-HMI-an, Keislaman & Keindonesiaan',
                'type'             => 'pretest',
                'duration_minutes' => 60,
                'passing_grade'    => 70,
                'link_code'        => 'PRETEST-LK1-HMI-2026',
                'status'           => 'Aktif',
                'created_by'       => 'Master of Training (MOT) BPL HMI',
                'description'      => 'Evaluasi awal objektif (50 Soal Pilihan Ganda 4 Opsi) untuk mengukur pemahaman awal calon kader.',
                'instructions'     => "1) Berdoalah sebelum memulai pengerjaan pre-test.\n2) Terdapat 50 butir soal pilihan ganda dengan 4 opsi pilihan (A, B, C, D).\n3) Pilihlah salah satu jawaban yang Anda anggap paling tepat.\n4) Waktu pengerjaan adalah 60 menit.\n5) Jawaban akan tersimpan secara otomatis saat disubmit.",
                'is_active'        => true,
            ]
        );

        // 2. Daftar 50 Soal Pilihan Ganda Asli & Valid (Seeder-Kuis.docx)
        $questionsData = [
            [
                'question_code' => 'PRETEST-01',
                'text' => 'Secara etimologis, kata filsafat berasal dari bahasa Yunani, yaitu philosophia, yang berarti ....',
                'options' => [
                    'A. Cinta terhadap kekuasaan',
                    'B. Cinta akan kebijaksanaan',
                    'C. Ilmu tentang alam',
                    'D. Pengetahuan tentang agama'
                ],
                'correct_answer' => 'B. Cinta akan kebijaksanaan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-02',
                'text' => 'Secara terminologis, filsafat dapat diartikan sebagai ....',
                'options' => [
                    'A. Kumpulan pendapat yang tidak boleh dipertanyakan',
                    'B. Ilmu yang hanya membahas fenomena alam',
                    'C. Pemikiran mendalam, kritis, dan sistematis mengenai hakikat realitas',
                    'D. Pengetahuan yang hanya bersumber dari pengalaman indrawi'
                ],
                'correct_answer' => 'C. Pemikiran mendalam, kritis, dan sistematis mengenai hakikat realitas',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-03',
                'text' => 'Cabang filsafat yang membahas sumber, dasar, dan batas pengetahuan adalah ....',
                'options' => [
                    'A. Aksiologi',
                    'B. Estetika',
                    'C. Metafisika',
                    'D. Epistemologi'
                ],
                'correct_answer' => 'D. Epistemologi',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-04',
                'text' => 'Aliran filsafat yang menekankan akal sebagai sumber utama pengetahuan disebut ....',
                'options' => [
                    'A. Rasionalisme',
                    'B. Empirisme',
                    'C. Skeptisisme',
                    'D. Materialisme'
                ],
                'correct_answer' => 'A. Rasionalisme',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-05',
                'text' => 'Secara etimologis, istilah logika berkaitan dengan kata Yunani logos, yang berhubungan dengan ....',
                'options' => [
                    'A. Kekuasaan dan pemerintahan',
                    'B. Keindahan dan seni',
                    'C. Kata, pikiran, dan penalaran',
                    'D. Perasaan dan emosi'
                ],
                'correct_answer' => 'C. Kata, pikiran, dan penalaran',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-06',
                'text' => 'Penalaran yang menarik kesimpulan khusus dari premis umum disebut ....',
                'options' => [
                    'A. Induktif',
                    'B. Deduktif',
                    'C. Intuitif',
                    'D. Analogis'
                ],
                'correct_answer' => 'B. Deduktif',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-07',
                'text' => 'Prinsip yang menyatakan bahwa suatu hal adalah dirinya sendiri disebut asas ....',
                'options' => [
                    'A. Nonkontradiksi',
                    'B. Alasan yang cukup',
                    'C. Kausalitas',
                    'D. Identitas'
                ],
                'correct_answer' => 'D. Identitas',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-08',
                'text' => 'Pernyataan yang sesuai dengan asas nonkontradiksi adalah ....',
                'options' => [
                    'A. Suatu pernyataan dapat benar dan salah sekaligus dalam kondisi yang sama',
                    'B. Semua pendapat manusia pasti benar',
                    'C. Suatu pernyataan tidak dapat sekaligus benar dan salah dalam pengertian serta kondisi yang sama',
                    'D. Kebenaran hanya ditentukan oleh suara terbanyak'
                ],
                'correct_answer' => 'C. Suatu pernyataan tidak dapat sekaligus benar dan salah dalam pengertian serta kondisi yang sama',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-09',
                'text' => 'Tujuan utama mempelajari logika bagi kader HMI adalah ....',
                'options' => [
                    'A. Memenangkan perdebatan dengan segala cara',
                    'B. Menghafal pendapat tokoh tanpa mengkritisinya',
                    'C. Menolak semua pendapat yang berbeda',
                    'D. Menyusun argumen secara runtut dan menguji kesimpulan secara rasional'
                ],
                'correct_answer' => 'D. Menyusun argumen secara runtut dan menguji kesimpulan secara rasional',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-10',
                'text' => 'NDP merupakan singkatan dari ....',
                'options' => [
                    'A. Nilai Dasar Perjuangan',
                    'B. Norma Dasar Perkaderan',
                    'C. Nilai Demokrasi Pancasila',
                    'D. Nalar Dasar Pergerakan'
                ],
                'correct_answer' => 'A. Nilai Dasar Perjuangan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-11',
                'text' => 'Fungsi utama NDP dalam organisasi HMI adalah ....',
                'options' => [
                    'A. Menggantikan seluruh aturan organisasi',
                    'B. Menjadi pedoman nilai dan landasan pemikiran perjuangan kader',
                    'C. Mengatur seluruh kegiatan administrasi kampus',
                    'D. Menjadi pedoman untuk kepentingan individu semata'
                ],
                'correct_answer' => 'B. Menjadi pedoman nilai dan landasan pemikiran perjuangan kader',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-12',
                'text' => 'Prinsip ketauhidan dalam NDP menegaskan ....',
                'options' => [
                    'A. Kebebasan manusia tanpa tanggung jawab',
                    'B. Kekuasaan manusia atas segala sesuatu',
                    'C. Keesaan Allah SWT sebagai dasar pandangan hidup',
                    'D. Penolakan terhadap ilmu pengetahuan'
                ],
                'correct_answer' => 'C. Keesaan Allah SWT sebagai dasar pandangan hidup',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-13',
                'text' => 'Dalam perspektif NDP, ilmu pengetahuan seharusnya digunakan untuk ....',
                'options' => [
                    'A. Memperoleh kekuasaan pribadi',
                    'B. Membenarkan semua tindakan penguasa',
                    'C. Mencari keuntungan tanpa memperhatikan moral',
                    'D. Memahami realitas dan meningkatkan kualitas kehidupan manusia'
                ],
                'correct_answer' => 'D. Memahami realitas dan meningkatkan kualitas kehidupan manusia',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-14',
                'text' => 'Hubungan manusia dengan alam menurut nilai Islam adalah ....',
                'options' => [
                    'A. Manusia bebas mengeksploitasi alam tanpa batas',
                    'B. Manusia bertanggung jawab mengelola dan menjaga alam',
                    'C. Alam tidak memiliki manfaat bagi kehidupan',
                    'D. Manusia tidak perlu mempelajari alam'
                ],
                'correct_answer' => 'B. Manusia bertanggung jawab mengelola dan menjaga alam',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-15',
                'text' => 'Sikap yang mencerminkan penerapan NDP dalam kehidupan kader adalah ....',
                'options' => [
                    'A. Jujur, kritis, bertanggung jawab, dan peduli terhadap masyarakat',
                    'B. Mengutamakan kepentingan pribadi di atas segalanya',
                    'C. Menghindari seluruh persoalan sosial',
                    'D. Menolak kritik dari anggota lain'
                ],
                'correct_answer' => 'A. Jujur, kritis, bertanggung jawab, dan peduli terhadap masyarakat',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-16',
                'text' => 'Hubungan antara NDP dan tujuan HMI adalah ....',
                'options' => [
                    'A. NDP tidak berkaitan dengan tujuan organisasi',
                    'B. NDP hanya digunakan dalam kegiatan seremonial',
                    'C. NDP menjadi landasan nilai untuk mewujudkan tujuan HMI',
                    'D. NDP hanya mengatur pemilihan pengurus'
                ],
                'correct_answer' => 'C. NDP menjadi landasan nilai untuk mewujudkan tujuan HMI',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-17',
                'text' => 'Sikap kader terhadap ketidakadilan yang sesuai dengan nilai perjuangan HMI adalah ....',
                'options' => [
                    'A. Membiarkan ketidakadilan demi keamanan pribadi',
                    'B. Mendukung ketidakadilan apabila menguntungkan kelompoknya',
                    'C. Menghindari seluruh bentuk tanggung jawab sosial',
                    'D. Berupaya menegakkan keadilan secara bertanggung jawab'
                ],
                'correct_answer' => 'D. Berupaya menegakkan keadilan secara bertanggung jawab',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-18',
                'text' => 'NDP mendorong kader HMI untuk mengembangkan hubungan yang seimbang antara ....',
                'options' => [
                    'A. Kekuasaan dan kepentingan pribadi',
                    'B. Keimanan, ilmu pengetahuan, dan amal perbuatan',
                    'C. Popularitas dan jabatan',
                    'D. Persaingan dan permusuhan'
                ],
                'correct_answer' => 'B. Keimanan, ilmu pengetahuan, dan amal perbuatan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-19',
                'text' => 'Nabi Muhammad SAW menerima wahyu pertama sekitar tahun ....',
                'options' => [
                    'A. 570 M',
                    'B. 610 M',
                    'C. 622 M',
                    'D. 632 M'
                ],
                'correct_answer' => 'B. 610 M',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-20',
                'text' => 'Peristiwa hijrah Nabi Muhammad SAW dari Makkah ke Madinah terjadi pada tahun ....',
                'options' => [
                    'A. 610 M',
                    'B. 615 M',
                    'C. 622 M',
                    'D. 632 M'
                ],
                'correct_answer' => 'C. 622 M',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-21',
                'text' => 'Piagam Madinah memiliki peran penting dalam ....',
                'options' => [
                    'A. Mengatur hubungan dan kehidupan bersama berbagai kelompok masyarakat Madinah',
                    'B. Menetapkan sistem kerajaan turun-temurun',
                    'C. Menghapus seluruh kegiatan perdagangan',
                    'D. Membatasi pengembangan ilmu pengetahuan'
                ],
                'correct_answer' => 'A. Mengatur hubungan dan kehidupan bersama berbagai kelompok masyarakat Madinah',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-22',
                'text' => 'Berikut ini yang bukan termasuk Khulafaur Rasyidin adalah ....',
                'options' => [
                    'A. Abu Bakar Ash-Shiddiq',
                    'B. Umar bin Khattab',
                    'C. Ali bin Abi Thalib',
                    'D. Muawiyah bin Abi Sufyan'
                ],
                'correct_answer' => 'D. Muawiyah bin Abi Sufyan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-23',
                'text' => 'Pusat pemerintahan Dinasti Abbasiyah yang berkembang menjadi pusat ilmu pengetahuan adalah ....',
                'options' => [
                    'A. Kairo',
                    'B. Baghdad',
                    'C. Damaskus',
                    'D. Cordoba'
                ],
                'correct_answer' => 'B. Baghdad',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-24',
                'text' => 'Tokoh Muslim yang dikenal berkontribusi besar dalam pengembangan aljabar adalah ....',
                'options' => [
                    'A. Ibnu Khaldun',
                    'B. Ibnu Battutah',
                    'C. Al-Khawarizmi',
                    'D. Al-Ghazali'
                ],
                'correct_answer' => 'C. Al-Khawarizmi',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-25',
                'text' => 'Baitul Hikmah dikenal sebagai pusat ....',
                'options' => [
                    'A. Penerjemahan, pengkajian, dan pengembangan ilmu pengetahuan',
                    'B. Pelatihan militer semata',
                    'C. Perdagangan rempah-rempah',
                    'D. Pertanian dan peternakan'
                ],
                'correct_answer' => 'A. Penerjemahan, pengkajian, dan pengembangan ilmu pengetahuan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-26',
                'text' => 'Pelajaran penting dari kemajuan peradaban Islam bagi kader HMI adalah ....',
                'options' => [
                    'A. Menghindari perkembangan teknologi',
                    'B. Mengutamakan perdebatan tanpa penelitian',
                    'C. Menolak pemikiran dari peradaban lain',
                    'D. Mengembangkan ilmu pengetahuan, keterbukaan, dan tradisi intelektual'
                ],
                'correct_answer' => 'D. Mengembangkan ilmu pengetahuan, keterbukaan, dan tradisi intelektual',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-27',
                'text' => 'Himpunan Mahasiswa Islam (HMI) didirikan pada tanggal ....',
                'options' => [
                    'A. 17 Agustus 1945',
                    'B. 5 Februari 1947',
                    'C. 28 Oktober 1928',
                    'D. 1 Juni 1945'
                ],
                'correct_answer' => 'B. 5 Februari 1947',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-28',
                'text' => 'Tokoh yang dikenal sebagai pendiri HMI adalah ....',
                'options' => [
                    'A. Mohammad Hatta',
                    'B. Soekarno',
                    'C. Lafran Pane',
                    'D. Mohammad Natsir'
                ],
                'correct_answer' => 'C. Lafran Pane',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-29',
                'text' => 'HMI didirikan di kota ....',
                'options' => [
                    'A. Yogyakarta',
                    'B. Jakarta',
                    'C. Bandung',
                    'D. Surabaya'
                ],
                'correct_answer' => 'A. Yogyakarta',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-30',
                'text' => 'Salah satu latar belakang berdirinya HMI adalah ....',
                'options' => [
                    'A. Keinginan membentuk organisasi perdagangan mahasiswa',
                    'B. Keinginan menggantikan seluruh organisasi kemahasiswaan',
                    'C. Kepentingan membangun organisasi yang hanya berorientasi politik praktis',
                    'D. Kebutuhan membangun organisasi mahasiswa Islam dalam konteks perjuangan kemerdekaan dan pengembangan umat'
                ],
                'correct_answer' => 'D. Kebutuhan membangun organisasi mahasiswa Islam dalam konteks perjuangan kemerdekaan dan pengembangan umat',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-31',
                'text' => 'Tujuan awal HMI berkaitan dengan ....',
                'options' => [
                    'A. Penguasaan ekonomi oleh mahasiswa',
                    'B. Mempertahankan Republik Indonesia, meningkatkan derajat rakyat, serta menegakkan dan mengembangkan ajaran Islam',
                    'C. Pembentukan pemerintahan baru di luar Republik Indonesia',
                    'D. Penghapusan kegiatan pendidikan tinggi'
                ],
                'correct_answer' => 'B. Mempertahankan Republik Indonesia, meningkatkan derajat rakyat, serta menegakkan dan mengembangkan ajaran Islam',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-32',
                'text' => 'HMI merupakan organisasi mahasiswa yang berorientasi pada ....',
                'options' => [
                    'A. Kepentingan individu semata',
                    'B. Kegiatan ekonomi semata',
                    'C. Keislaman, keilmuan, dan kebangsaan',
                    'D. Kegiatan seremonial semata'
                ],
                'correct_answer' => 'C. Keislaman, keilmuan, dan kebangsaan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-33',
                'text' => 'Makna keislaman dan keindonesiaan dalam perjuangan HMI adalah ....',
                'options' => [
                    'A. Mengintegrasikan nilai Islam dengan tanggung jawab terhadap bangsa Indonesia',
                    'B. Memisahkan kader dari persoalan kebangsaan',
                    'C. Mengutamakan identitas kelompok di atas persatuan',
                    'D. Menolak partisipasi mahasiswa dalam masyarakat'
                ],
                'correct_answer' => 'A. Mengintegrasikan nilai Islam dengan tanggung jawab terhadap bangsa Indonesia',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-34',
                'text' => 'Nilai utama yang dapat dipelajari dari sejarah perjuangan HMI adalah ....',
                'options' => [
                    'A. Menghindari tanggung jawab sosial',
                    'B. Mengutamakan jabatan organisasi',
                    'C. Menolak kritik terhadap organisasi',
                    'D. Konsistensi perjuangan, intelektualitas, dan pengabdian kepada umat serta bangsa'
                ],
                'correct_answer' => 'D. Konsistensi perjuangan, intelektualitas, dan pengabdian kepada umat serta bangsa',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-35',
                'text' => 'Konstitusi HMI merupakan ....',
                'options' => [
                    'A. Kumpulan pendapat pribadi para kader',
                    'B. Aturan dasar yang menjadi pedoman penyelenggaraan organisasi',
                    'C. Pedoman kegiatan akademik universitas',
                    'D. Aturan yang hanya berlaku bagi ketua umum'
                ],
                'correct_answer' => 'B. Aturan dasar yang menjadi pedoman penyelenggaraan organisasi',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-36',
                'text' => 'AD merupakan singkatan dari ....',
                'options' => [
                    'A. Administrasi Dasar',
                    'B. Anggaran Dewan',
                    'C. Anggaran Dasar',
                    'D. Aturan Delegasi'
                ],
                'correct_answer' => 'C. Anggaran Dasar',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-37',
                'text' => 'ART merupakan singkatan dari ....',
                'options' => [
                    'A. Anggaran Rumah Tangga',
                    'B. Aturan Rapat Tahunan',
                    'C. Anggaran Rencana Tahunan',
                    'D. Administrasi Rumah Tangga'
                ],
                'correct_answer' => 'A. Anggaran Rumah Tangga',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-38',
                'text' => 'Perbedaan utama AD dan ART adalah ....',
                'options' => [
                    'A. AD mengatur keuangan saja, sedangkan ART mengatur kaderisasi saja',
                    'B. AD hanya berlaku bagi anggota baru',
                    'C. ART lebih tinggi kedudukannya daripada seluruh ketentuan dasar organisasi',
                    'D. AD mengatur ketentuan pokok, sedangkan ART menjabarkan pelaksanaannya secara lebih operasional'
                ],
                'correct_answer' => 'D. AD mengatur ketentuan pokok, sedangkan ART menjabarkan pelaksanaannya secara lebih operasional',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-39',
                'text' => 'Mengapa kader HMI harus memahami konstitusi organisasi?',
                'options' => [
                    'A. Agar dapat mengabaikan keputusan organisasi',
                    'B. Agar memahami hak, kewajiban, kewenangan, dan mekanisme organisasi',
                    'C. Agar hanya mengikuti keputusan pengurus tanpa memahami aturan',
                    'D. Agar dapat mengubah aturan secara sepihak'
                ],
                'correct_answer' => 'B. Agar memahami hak, kewajiban, kewenangan, dan mekanisme organisasi',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-40',
                'text' => 'Pengambilan keputusan dalam forum organisasi harus dilakukan berdasarkan ....',
                'options' => [
                    'A. Kehendak pribadi pimpinan semata',
                    'B. Tekanan dari kelompok mayoritas tanpa prosedur',
                    'C. Ketentuan konstitusi dan mekanisme persidangan yang berlaku',
                    'D. Keputusan pihak di luar organisasi'
                ],
                'correct_answer' => 'C. Ketentuan konstitusi dan mekanisme persidangan yang berlaku',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-41',
                'text' => 'Jika terjadi perbedaan pendapat dalam forum HMI, sikap yang tepat adalah ....',
                'options' => [
                    'A. Menyelesaikannya melalui mekanisme organisasi dengan mengutamakan argumentasi dan aturan yang berlaku',
                    'B. Menghentikan seluruh kegiatan organisasi',
                    'C. Memaksakan pendapat pribadi tanpa musyawarah',
                    'D. Mengabaikan konstitusi demi kepentingan kelompok'
                ],
                'correct_answer' => 'A. Menyelesaikannya melalui mekanisme organisasi dengan mengutamakan argumentasi dan aturan yang berlaku',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-42',
                'text' => 'Rumusan tujuan HMI yang dikenal dalam konstitusi adalah membina mahasiswa menjadi ....',
                'options' => [
                    'A. Pemimpin politik yang mengutamakan kekuasaan',
                    'B. Pengusaha yang berorientasi pada keuntungan semata',
                    'C. Akademisi yang hanya berfokus pada nilai akademik',
                    'D. Insan akademis, pencipta, pengabdi yang bernafaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridai Allah SWT'
                ],
                'correct_answer' => 'D. Insan akademis, pencipta, pengabdi yang bernafaskan Islam dan bertanggung jawab atas terwujudnya masyarakat adil makmur yang diridai Allah SWT',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-43',
                'text' => 'Apa yang dimaksud dengan misi HMI dalam konteks perkaderan?',
                'options' => [
                    'A. Upaya memperoleh jabatan politik bagi seluruh kader',
                    'B. Pelaksanaan kegiatan tanpa landasan nilai',
                    'C. Pelaksanaan tujuan organisasi melalui perkaderan, pengembangan intelektualitas, dan pengabdian',
                    'D. Pembatasan kader untuk berpartisipasi dalam masyarakat'
                ],
                'correct_answer' => 'C. Pelaksanaan tujuan organisasi melalui perkaderan, pengembangan intelektualitas, dan pengabdian',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-44',
                'text' => 'Makna insan akademis dalam tujuan HMI adalah ....',
                'options' => [
                    'A. Pribadi yang memiliki pengetahuan, berpikir kritis, dan menjunjung tanggung jawab ilmiah',
                    'B. Pribadi yang hanya menghafal materi',
                    'C. Pribadi yang selalu menerima pendapat orang lain tanpa kajian',
                    'D. Pribadi yang menghindari diskusi ilmiah'
                ],
                'correct_answer' => 'A. Pribadi yang memiliki pengetahuan, berpikir kritis, dan menjunjung tanggung jawab ilmiah',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-45',
                'text' => 'Makna insan pencipta dalam tujuan HMI adalah ....',
                'options' => [
                    'A. Pribadi yang hanya menggunakan hasil karya orang lain',
                    'B. Pribadi yang mampu menghasilkan gagasan dan karya untuk menjawab kebutuhan masyarakat',
                    'C. Pribadi yang menolak inovasi',
                    'D. Pribadi yang menghindari perubahan sosial'
                ],
                'correct_answer' => 'B. Pribadi yang mampu menghasilkan gagasan dan karya untuk menjawab kebutuhan masyarakat',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-46',
                'text' => 'Makna insan pengabdi dalam tujuan HMI adalah ....',
                'options' => [
                    'A. Pribadi yang mengutamakan kepentingan pribadi',
                    'B. Pribadi yang hanya aktif ketika memperoleh penghargaan',
                    'C. Pribadi yang mengejar popularitas organisasi',
                    'D. Pribadi yang mendedikasikan kemampuan dan tindakannya bagi kepentingan umat dan masyarakat'
                ],
                'correct_answer' => 'D. Pribadi yang mendedikasikan kemampuan dan tindakannya bagi kepentingan umat dan masyarakat',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-47',
                'text' => 'Dalam KMO, kepemimpinan dapat diartikan sebagai ....',
                'options' => [
                    'A. Kemampuan memerintah tanpa menerima masukan',
                    'B. Kemampuan mempertahankan jabatan selama mungkin',
                    'C. Kemampuan memengaruhi, mengarahkan, dan menggerakkan orang untuk mencapai tujuan bersama',
                    'D. Kemampuan menyerahkan semua tanggung jawab kepada anggota'
                ],
                'correct_answer' => 'C. Kemampuan memengaruhi, mengarahkan, dan menggerakkan orang untuk mencapai tujuan bersama',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-48',
                'text' => 'Salah satu fungsi utama manajemen organisasi adalah ....',
                'options' => [
                    'A. Menghilangkan pembagian tugas',
                    'B. Merencanakan, mengorganisasikan, mengarahkan, dan mengendalikan kegiatan untuk mencapai tujuan',
                    'C. Memusatkan seluruh pekerjaan kepada satu orang',
                    'D. Menghindari evaluasi kegiatan'
                ],
                'correct_answer' => 'B. Merencanakan, mengorganisasikan, mengarahkan, dan mengendalikan kegiatan untuk mencapai tujuan',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-49',
                'text' => 'Seorang ketua komisariat membagi tugas sesuai kemampuan anggota, menetapkan target, dan mengevaluasi hasil kerja. Tindakan tersebut mencerminkan ....',
                'options' => [
                    'A. Penerapan kepemimpinan dan manajemen organisasi',
                    'B. Pengabaian tanggung jawab organisasi',
                    'C. Pelaksanaan kekuasaan tanpa tujuan',
                    'D. Penolakan terhadap kerja sama'
                ],
                'correct_answer' => 'A. Penerapan kepemimpinan dan manajemen organisasi',
                'score_weight' => 2,
            ],
            [
                'question_code' => 'PRETEST-50',
                'text' => 'Ketika program kerja organisasi tidak mencapai target, langkah paling tepat bagi pengurus adalah ....',
                'options' => [
                    'A. Menyalahkan anggota tanpa melakukan pemeriksaan',
                    'B. Menghentikan semua program secara permanen',
                    'C. Mengabaikan hasil kegiatan dan melanjutkan program yang sama',
                    'D. Mengevaluasi pelaksanaan, mengidentifikasi hambatan, dan menyusun perbaikan'
                ],
                'correct_answer' => 'D. Mengevaluasi pelaksanaan, mengidentifikasi hambatan, dan menyusun perbaikan',
                'score_weight' => 2,
            ],
        ];

        // 3. Masukkan / Update setiap butir soal ke dalam database
        foreach ($questionsData as $q) {
            Question::updateOrCreate(
                [
                    'quiz_id'       => $quiz->id,
                    'question_code' => $q['question_code']
                ],
                [
                    'type'           => 'multiple_choice',
                    'text'           => $q['text'],
                    'options'        => $q['options'],
                    'correct_answer' => $q['correct_answer'],
                    'score_weight'   => $q['score_weight'],
                    'required'       => true,
                ]
            );
        }
    }
}
