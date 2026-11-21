import type { Doodle } from "./doodles";

/**
 * Every word on /23 lives here, so the page can be reworded without touching
 * layout or motion code.
 *
 * `COPY.afterSpin` is imported by the client component only (never passed as
 * a prop from the page), so it ships in the JS bundle and stays out of the
 * HTML, link previews and reader modes until the dial has been spun.
 */

export const SONG = {
  // Served from public/audio, AAC at 96 kbps (~3 MB) so it loads quickly
  // on a phone connection.
  src: "/audio/dizzy-on-the-comedown-96.m4a",
  title: "dizzy on the comedown",
  artist: "turnover",
  duration: 258, // seconds; shown until the file's metadata arrives
  elementId: "t23-song",
} as const;

/** Browser tab and link preview. */
/**
 * The photos that flip by behind the song on the now-playing screen, in the
 * order the year happened. Copies live in public/23/chalk-nj (metadata
 * stripped), each cropped so her head sits dead centre at about the same
 * size, so every cut lands on her in the same spot; in grayscale with every
 * frame brought to the same average brightness and the same soft contrast: a fast cut between photos then
 * never swings from light to dark or flashes saturated colour, which is
 * what makes rapid image changes risky for photosensitive viewers. `focus` is
 * the CSS object-position: centre, so she stays centred whether the screen
 * shows them tall or square. Only photos with her in them. Each has white
 * chalk doodles baked in: a double outline traced around her (found with
 * macOS's on-device person detection) and a crown, stars and a heart
 * around her head, white only so the frames stay grayscale.
 */
export const FLIPBOOK = {
  label: "foto-foto setahun ini",
  // The flipbook cuts on the song's beat. It runs on the song's clock, so it
  // stops when the song pauses and follows it when she scrubs. Measured from
  // the audio file (spectral-flux onsets, comb-filtered): a steady 115 BPM
  // all the way through, first beat 0.152 s in.
  bpm: 115,
  firstBeat: 0.152,
  // Photos per beat: 4 is every sixteenth note (~7.7 a second), 2 every
  // eighth (~3.8 a second, gentler on photosensitive eyes), 1 every beat.
  framesPerBeat: 4,
  // With reduced motion: one photo per bar of four beats (~2.1 s) times two.
  reducedBeatsPerFrame: 8,
  frames: [
    { src: "/23/chalk-nj/01.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/02.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/03.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/04.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/05.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/06.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/07.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/08.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/09.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/10.jpg", focus: "50% 50%" },
    { src: "/23/chalk-nj/11.jpg", focus: "50% 50%" },
  ],
} as const;

/** The camcorder's burnt-in labels over the flipbook (NewJeans look). */
export const CAM = {
  rec: "REC",
  stamp: "NOV. 23 2026",
} as const;

export const META = {
  title: "the twenty-third",
  description: "a small page, and a song.",
} as const;

/**
 * The prompt she has to get through before the page. Each button names the
 * step it leads to; "play" starts the song and lets her in.
 */
export const INTRO = {
  hello: {
    title: "hai Sherin!",
    body: "akhirnya lo _debut_ di lokey.bio yaa, hehe.",
    actions: [{ label: "next", to: "headset" }],
  },
  headset: {
    body: "sebelum kita lanjut ke konten halaman ini, pake _headset_ lo dulu yaa",
    actions: [
      { label: "oke udah", to: "play" },
      { label: "ga bawa _headset_", to: "sure" },
    ],
  },
  sure: {
    body: "yakin? coba cari dulu di tas",
    actions: [
      { label: "oh ada", to: "play" },
      { label: "gaada", to: "anyway" },
    ],
  },
  // No buttons: the song starts and this lets itself out.
  anyway: {
    body: "wkwkkw yaudah gue _play anyway_ :p",
    actions: [],
  },
} as const;

export type IntroStep = keyof typeof INTRO;

/** The loading bar in the intro (intro.tsx, preload.ts). */
export const LOADING = {
  // Non-breaking hyphen, so "foto‑fotonya" never splits across lines.
  busy: "bentar ya, lagi nyiapin lagu sama foto\u2011fotonya",
  done: "udah siap!",
} as const;

/**
 * One win, shown as an EP photocard. `cover` is a portrait (55:85) photo in
 * public/23/covers (colour, metadata stripped); without one the front is set
 * in type from `coverWords`. `signAt` keeps the signature off faces; `tint`
 * picks the back's pastel.
 */
export type Release = {
  lead: string;
  body: string;
  release: string;
  cover?: string;
  coverAlt?: string;
  coverWords?: readonly string[];
  /** The longer story, under the card row ("liner notes"); optional. */
  notes?: string;
  signAt?: "top" | "bottom";
  /** Crayon doodles over the front photo, clear of faces. */
  doodles?: readonly Doodle[];
  tint: "sky" | "bubblegum" | "lime" | "lilac";
};

/**
 * The music-app chrome around her story (English, like the app's own UI);
 * her words stay in STORY.
 */
export const ARTIST = {
  // Picks up the intro's "akhirnya lo debut di lokey.bio".
  label: "debut",
  name: "Sherin",
  bio: "to you",
  // The Kina paragraph is printed on the back of this.
  photocard: {
    label: "reminder",
    src: "/23/covers/photocard.jpg",
    alt: "berdiri di depan mosaik, pakai kemeja pink dan jeans",
    signature: "Sherin",
    set: "kina · 1/1",
    mark: "kina",
    doodles: [
      { kind: "crown", x: 52, y: 37, size: 15, rotate: -6, color: "lime" },
      { kind: "twinkle", x: 18, y: 16, size: 12, color: "pink" },
      { kind: "heart", x: 84, y: 56, size: 13, rotate: 10, color: "pink" },
      { kind: "star", x: 16, y: 66, size: 13, rotate: -12, color: "sky" },
    ],
    flip: "flip",
  },
  year: "2026",
} as const;

export const STORY = {
  kicker: "23 november",
  // One entry per line of the big title; a red ball ends the last one.
  title: ["happy", "birthday,", "Sherin"],

  // Her sentences from before are kept word for word; the rest was added
  // around them in the same voice.
  opening: [
    "kalau katanya semua orang akan mengalami _quarter life crisis_, _I really hope God is kind enough to bless you with the most merciful kind of crisis_ (atau bahkan jangan sampai kena krisis sama sekali yaa, haha).",
    "tapi gue cukup yakin, Sherin yang gue kenal sanggup melewati segala jenis krisis _like she always does_ (alias lo keren).",
    "_btw_, gue ngetik ini dalam keadaan _sober_, ditemani lagu yang sama yang lagi lo dengerin sekarang. lagu ini udah gue puter _on repeat_ sejak halaman ini mulai gue bikin, jadi maaf kalo nanti lagunya ikut nyangkut di kepala lo juga.",
    "oh iya, _disclaimer_ dulu: tulisan ini mungkin agak panjang. bukan karena gue gak bisa nulis singkat, tapi karena ternyata setahun itu lumayan banyak isinya. dimanapun lo baca ini, cari tempat bersandar ya biar ga pegel.",
    'katanya umur segini itu umur yang aneh. udah gak bisa pake alasan "masih muda" buat semua hal, tapi juga belum cukup tua buat ngerasa hidup udah ketebak. orang-orang di sekitar mulai sibuk ngebandingin _timeline_: siapa yang udah ini, siapa yang belum itu, siapa yang kayaknya lebih duluan sampe. capek gak sih? gue aja yang cuma nonton udah capek.',
    "jadi sebelum lo ikut-ikutan ngitung apa yang belum, gue mau ngajak lo ngitung apa yang udah. tenang, gak pake rumus kok.",
  ],

  // Set like the title, one line per entry; the lines from pinkFrom on are
  // in pink. Read straight through it is one sentence.
  recall: {
    lines: [
      "gimana kalo",
      "kita _recall_",
      "pencapaian lo",
      "setahun",
      "ke belakang?",
    ],
    pinkFrom: 3,
  },

  // Her year as a discography: each win is a release.
  wins: [
    {
      lead: "pengangkatan sebagai karyawan kontrak.",
      body: "lo inget ga di Senin pagi itu lo keliling kantor buat _introduce yourself_ dengan seragam baru? gue sih inget ya. ikut bangga!",
      release: "1st EP",
      notes:
        'buat sebagian orang, "karyawan kontrak" mungkin cuma satu baris di sistem HR. tapi gue tau di balik satu baris itu ada berapa banyak pagi yang lo mulai lebih awal, berapa banyak hal baru yang lo pelajari sambil pura-pura udah paham (semua orang begitu kok, termasuk gue), dan berapa kali lo harus senyum ke orang yang baru lo kenal lima menit. Senin pagi itu lo keliling dari meja ke meja, nyebutin nama yang sama berkali-kali dengan semangat yang sama. jujur, itu bukan hal yang gampang. gue aja kalo disuruh begitu, mungkin di meja ketiga udah nyari alasan ke toilet.',
      cover: "/23/covers/contract-hands.jpg",
      // The office group photo, centred on her face; everyone but her (face and
      // peace-sign hands) is blurred.
      coverAlt: "foto bareng satu kantor dengan seragam baru",
      signAt: "top",
      doodles: [
        { kind: "star", x: 80, y: 20, size: 18, rotate: 12, color: "lime" },
        { kind: "sparks", x: 25, y: 36, size: 16, rotate: -8, color: "lime" },
        { kind: "heart", x: 80, y: 40, size: 12, rotate: 14, color: "pink" },
        { kind: "twinkle", x: 22, y: 64, size: 10, color: "sky" },
      ],
      tint: "sky",
    },
    {
      lead: "ikut DANA cup _badminton_ mewakili kantor.",
      body: "perlu gue akui semua _skill_ olahraga yang lo suka emang gokil! _next time_ ada _event_ gini lagi, gue bakal bawa spanduk yang lebih gede.",
      release: "2nd EP",
      notes:
        "mewakili kantor itu artinya ada satu kantor yang percaya sama lo, dan kepercayaan kayak gitu gak dibagiin ke sembarang orang. gue gak akan pura-pura ngerti aturan skor _badminton_, karena memang gak ngerti. yang gue tau, lo selalu keliatan paling semangat kalo udah urusan olahraga. soal spanduk yang lebih gede tadi, ukurannya masih gue rundingin sama abang sablon. doain lolos _budget_.",
      // The team photo, centred on her face; everyone but her (face and
      // peace-sign hand) is blurred.
      cover: "/23/covers/dana.jpg",
      coverAlt: "foto bareng tim badminton kantor di DANA cup",
      signAt: "top",
      doodles: [
        { kind: "star", x: 80, y: 17, size: 18, rotate: -10, color: "lime" },
        { kind: "sparks", x: 22, y: 34, size: 16, rotate: -6, color: "pink" },
        { kind: "heart", x: 80, y: 38, size: 13, rotate: 12, color: "pink" },
        { kind: "twinkle", x: 50, y: 24, size: 10, color: "sky" },
      ],
      tint: "bubblegum",
    },
    {
      lead: "lo liburan ke Shanghai!",
      body: "siapa sangka _in this economy_ bisa liburan ke Shanghai kan yaa? oh iya, gue punya foto yang menurut gue keren waktu di Shanghai, nanti gue lampirin di bawah ya!",
      release: "3rd EP",
      notes:
        "liburan itu kedengerannya simpel, tapi siapapun yang pernah nyusun _itinerary_ tau kalo itu butuh nyali: ngatur cuti, ngatur _budget_ (_in this economy_, sekali lagi), dan berani ke tempat yang bahasanya aja belum tentu nyambung. dan lo jalanin semuanya. foto di depan itu salah satu buktinya: sore di pinggir sungai, angin yang makin lama makin nusuk, lampu kota yang mulai nyala satu-satu, dan lo yang keliatan santai banget kayak udah langganan ke sana. semoga ini bukan yang terakhir, dan _trip_ berikutnya lebih jauh lagi.",
      cover: "/23/covers/shanghai.jpg",
      coverAlt: "foto di tepi sungai Shanghai malam hari",
      signAt: "top",
      doodles: [
        { kind: "twinkle", x: 84, y: 12, size: 13, color: "lime" },
        { kind: "sparks", x: 66, y: 8, size: 16, color: "pink" },
        { kind: "heart", x: 16, y: 46, size: 14, rotate: -12, color: "pink" },
        { kind: "swirl", x: 15, y: 82, size: 18, rotate: 8, color: "sky" },
      ],
      tint: "lilac",
    },
    {
      lead: "menang TPS padel cup!",
      body: "bukan sekali, tapi berkali kali! lo pake AI ya buat gerakin raket sama kaki?",
      release: "4th EP",
      notes:
        'awalnya gue kira "berkali-kali" itu cuma hiperbola, sampai gue liat sendiri papan WINNER-nya. tapi kalo boleh jujur, yang bikin gue kagum bukan menangnya. menang itu hasil, dan hasil bisa dateng dari mana aja, termasuk dari lawan yang lagi apes (kayak gue, sampe masuk ke final). yang bikin gue kagum itu prosesnya: latihan yang gak keliatan, pegel yang gak lo ceritain, dan keputusan buat tetep dateng lagi minggu depannya. itu bagian yang gak pernah masuk foto. makanya gue tulis di sini.',
      cover: "/23/covers/padel.jpg",
      coverAlt: "memegang papan WINNER di turnamen padel",
      doodles: [
        { kind: "crown", x: 61, y: 26, size: 15, rotate: 6, color: "lime" },
        { kind: "sparks", x: 88, y: 26, size: 16, rotate: 10, color: "pink" },
        { kind: "star", x: 88, y: 62, size: 14, rotate: -8, color: "lime" },
        { kind: "twinkle", x: 22, y: 60, size: 11, color: "sky" },
      ],
      tint: "lime",
    },
  ] satisfies Release[],

  linerNotes: "liner notes",

  smallWins: [
    "dan gue yakin dibalik hal yang bisa gue sebutin di atas, masih banyak _b-side_ yang udah lo rilis di periode 23 november 2025 sampai 23 november 2026. dan biasanya, _b-side_ justru yang paling disayang.",
    "_b-side_ itu lagu-lagu yang gak dijadiin _single_, gak dibikinin video klip, gak diputer di radio. tapi justru di situ biasanya musisinya paling jujur, karena di situ dia lagi dengerin dirinya sendiri.",
    'mungkin _b-side_ lo yang paling jujur malah belum kerekam sama sekali. lo yang biasanya jadi tempat orang lain cerita, mungkin belum sempet dengerin cerita lo sendiri, atau belum nemu jawaban buat pertanyaan "sebenernya gue maunya apa?". dan itu gapapa. nyari diri sendiri itu bukan lomba, gak ada _deadline_-nya, dan gak ada yang berhak nentuin kapan lo harus udah ketemu.',
    "dan kalo nanti _b-side_ itu akhirnya lo rekam, gak perlu langsung sempurna. albumnya masih panjang.",
  ],

  // Under the photocard, in the reminder section.
  kinaNote: [
    "kalimat itu sengaja gue tulis di belakang _photocard_, biar bisa lo simpen kayak _photocard_ beneran. bukan buat dipajang, tapi buat dikeluarin pas lagi perlu, di hari-hari di mana lo lupa sama isinya.",
    "karena kadang, orang yang paling jago ngedengerin orang lain justru yang paling jarang dengerin suaranya sendiri. jadi kalo suatu hari lo lagi bingung mau ngikutin arus atau nyari tau kata hati lo sendiri, keluarin kartu ini dan kasih kesempatan buat yang kedua, sepelan apapun. hasilnya mau gimana juga, itu tetep langkah yang pantes dirayain.",
  ],

  kina: "waktu kita duduk di Kina, gue pernah bilang kalo lo punya banyak potensi dan lo punya semua modal untuk target apapun yang lo mau. _statement_ itu gak berubah sampai sekarang, Sherin. dan gue gak sabar untuk liat apa yang bisa lo capai di periode 23 november 2026 sampai seterusnya.",

  // Before the closing line, on the light sheet at the end.
  closingNotes: [
    "semoga tahun ini jadi tahun di mana lo pelan-pelan menemukan diri lo sendiri.",
    "oh iya, satu lagi. kalo selama baca ini lo ngerasa ada bagian yang kepanjangan atau agak berlebihan, anggap aja _bonus track_.",
  ],

  closing: "lastly, wishing you another year of little moments to cherish!",
} as const;

/** The dial at the end (spin.tsx). */
export const COPY = {
  // Lettering around the dial. It repeats until the circle is full.
  ring: "happy birthday · the twenty-third · ",
  numeral: "23",
  // Caption under the dial, and its name for screen readers.
  hint: "p.s. coba puter angkanya.",
  dialLabel: "Spin the 23",
  // What settles into the caption's place once a spin has come down, in two
  // beats: the wish, then the quiet part.
  afterSpin: "go get dizzy with your life!",
  // The end of the second line is a link that opens a WhatsApp chat with
  // him (wa.me, his number in international form without the "+").
  afterSpinNote: "and if you need someone to spin with, ",
  afterSpinLink: "i know a guy.",
  afterSpinHref: "https://wa.me/628194040819",
} as const;
