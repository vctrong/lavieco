/**
 * Fallback copy for the home page. Editorial copy will later come from
 * content-service; this keeps the page renderable without it (docs/04 §5.3).
 */
export const TEXT = {
  vi: {
    hero: {
      pilotBadge: "Đang thí điểm tại Cần Thơ",
      categoryBadge: "GREEN ART EDUCATION",
      watermark: "01",
      titleLines: ["Cuộc sống,", "qua từng nét"],
      titleAccent: "nghệ thuật",
      titleEnd: ".",
      quote:
        "“Giá trị của một thứ không nằm ở bản chất của nó, mà nằm ở cách con người trao ý nghĩa cho nó.”",
      body: "Chúng tôi không bán đồ thủ công tái chế. Chúng tôi kiến tạo hành trình nhận thức thông qua nghệ thuật từ bột vỏ sò.",
      primaryCta: "Bước vào triển lãm",
      secondaryCta: "Dành cho trường học & doanh nghiệp",
      stampTitle: "GALLERY Nº 2024",
      stampPlace: "Mekong Estuary Pilot",
      stampMaterial: "Vật liệu vỏ nghêu, sò, ốc Tây Đô",
    },
    heroArches: {
      main: {
        kicker: "Vật phẩm điển hình",
        number: "Nº 001 · Triển lãm",
        title: "Bột vỏ sò Cần Thơ ép mịn",
        place: "Xưởng thủ công cộng đồng · Cần Thơ",
      },
      deep: { number: "Nº 002 · Biển sâu", title: "Kết nối dòng chảy phù sa" },
      raw: { number: "Nº 003 · Thổ mộc", title: "Vỏ điệp & nghêu sông Hậu" },
    },
    storyCard: {
      label: "Story Card · Nº 001",
      title: "Vỏ điệp Bến Tre · Nghiền mịn 120 mesh",
      qrLabel: "Mã QR mẫu trên story card",
      note: "100% Thu gom bản địa",
    },
    marquee: {
      words: ["LIFE", "ART", "VALUE", "INNOVATION", "ECO"],
      taglines: ["CUỘC SỐNG, QUA TỪNG NÉT NGHỆ THUẬT", "CAN THO ESTUARY PILOT"],
      separator: "✦",
      screenReaderText:
        "Life, Art, Value, Innovation, Eco. Cuộc sống, qua từng nét nghệ thuật. Can Tho Estuary Pilot.",
    },
  },
} as const;
