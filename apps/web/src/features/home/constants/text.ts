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
    manifesto: {
      tag: "Bản tuyên ngôn · The Manifesto",
      lead: "LAVIECO",
      emphasis: "không bán",
      afterEmphasis: "đồ thủ công tái chế thông thường. Sản phẩm chỉ là bằng chứng hữu hình.",
      pursuit:
        "Điều chúng tôi theo đuổi là để mỗi người nhìn thấy giá trị ở nơi người khác chỉ thấy",
      struck: "rác",
      rewrite: "chất liệu",
      end: ".",
      caption: "Giá trị khởi sinh từ cách bạn trao gửi ý nghĩa",
    },
    journey: {
      kicker: "Hành trình tái sinh nguyên bản",
      title: "Từ vỏ đến tác phẩm",
      intro:
        "Bốn chặng biến đổi vật lý và ý niệm: đưa những mảnh vỏ vô tri từ bàn tiệc sông Hậu trở thành tác phẩm nghệ thuật đong đầy cảm xúc.",
      phaseLabel: "Giai đoạn",
      stages: [
        {
          number: "01",
          title: "Thu gom bản địa",
          description: "Nhà hàng hải sản, quán ăn & chợ đầu mối Cần Thơ",
          visualKicker: "Tập kết vỏ thô",
          visualCaption: "Bến Ninh Kiều",
          tag: "Nº 01 · Thu gom",
          metric: "~350kg/th",
        },
        {
          number: "02",
          title: "Nghiền mịn & khử mùi",
          description: "Quy trình làm sạch nhiệt, nghiền mịn đa cấp độ giữ nguyên canxi tự nhiên",
          visualKicker: "Khử khuẩn vi sinh",
          visualCaption: "120 Mesh Canxi",
          tag: "Nº 02 · Tinh khiết",
          metric: "100% An toàn",
        },
        {
          number: "03",
          title: "Đúc & tạo hình",
          description: "Khuôn nghệ thuật bản địa, pha kết dính sinh học thân thiện môi trường",
          visualKicker: "Khuôn điêu khắc",
          visualCaption: "Vòm sóng phù sa",
          tag: "Nº 03 · Đúc thủ công",
          metric: "Bio-resin gốc nước",
        },
        {
          number: "04",
          title: "Kể chuyện & trao ý nghĩa",
          description: "Mỗi tác phẩm mang một story card và mã QR dẫn vào hành trình sinh thái",
          phaseNote: "Giai đoạn 04 · Đích đến",
          qrTitle: "Mã QR Tri Thức Xanh",
          qrNote: "Dẫn vào cẩm nang số",
          qrLabel: "Mã QR minh họa",
          cardId: "LAVIECO ID #04",
          cardWeight: "0.24kg vỏ",
          cardQuote: "“Vỏ sò không phải rác — là câu chuyện tái sinh.”",
          storyCardLabel: "Story Card",
        },
      ],
    },
    programs: {
      badge: "Lõi giá trị của LAVIECO",
      title: "Bốn nấc thang giá trị",
      intro:
        "Sản phẩm là vật chứng, giáo dục mới là tương lai. Chúng tôi thiết kế 4 tầng trải nghiệm giáo dục nghệ thuật xanh, từng bước chuyển hoá thói quen và nhận thức cộng đồng.",
      cta: "Nhận tư vấn chương trình chi tiết",
      levels: [
        {
          number: "01",
          tag: "MIỄN PHÍ TRỌN ĐỜI",
          title: "Cẩm nang xanh số",
          description:
            "Truy cập tức thì qua việc quét mã QR in trên đáy mỗi sản phẩm. Kho lưu trữ tranh vẽ, infographic kiến thức rác thải ven sông và bài học bảo tồn đa dạng sinh học ĐBSCL.",
          footLabel: "Hình thức",
          foot: "Trang tương tác trực tuyến · Quét mã QR",
        },
        {
          number: "02",
          tag: "2 - 3 GIỜ THỰC HÀNH",
          title: "Workshop trải nghiệm",
          description:
            "Dành cho bạn trẻ, gia đình và nhóm du khách tại Cần Thơ. Tận tay trộn bột vỏ sò hữu cơ, pha màu khoáng tự nhiên và đúc nên tác phẩm nghệ thuật mang về nhà.",
          footLabel: "Kỹ năng đạt được",
          foot: "Tư duy chất liệu tuần hoàn & Tác phẩm thủ công cá nhân",
        },
        {
          number: "03",
          tag: "3 - 5 BUỔI / KHÓA",
          title: "Gói ngoại khóa học đường",
          description:
            "Tích hợp chặt chẽ vào chương trình Hoạt Động Trải Nghiệm và Mỹ Thuật tại các trường phổ thông và đại học. Học sinh đóng vai nhà sinh thái học nhí và nghệ sĩ sáng tạo.",
          footLabel: "Đối tượng ưu tiên",
          foot: "Trường công lập & Quốc tế khu vực miền Tây",
        },
        {
          number: "04",
          tag: "DOANH NGHIỆP ESG",
          title: "Tài trợ giáo dục ESG",
          description:
            "Đồng hành cùng tập đoàn kiến tạo các lớp học xanh cho trẻ em vùng chịu ảnh hưởng biến đổi khí hậu. Cung cấp báo cáo đo lường tác động xã hội và chỉ số rác thải được giải cứu.",
          footLabel: "Cam kết kết quả",
          foot: "Báo cáo ESG tiêu chuẩn & Quà tặng đối tác đúc biểu trưng",
        },
      ],
    },
    collection: {
      kicker: "Vật phẩm minh chứng",
      title: "Bằng chứng nhỏ, ý nghĩa lớn",
      priceNote: "Khoảng giá niêm yết. Giá chốt do đội ngũ LAVIECO xác nhận khi bạn gửi yêu cầu.",
      cta: "Xem toàn bộ bộ sưu tập",
      items: [
        {
          storyLabel: "Story Card Nº 01",
          storyQuote: "“Gom từ 4 chiếc vỏ sò bến Ninh Kiều, giảm 0.08kg rác thải hữu cơ.”",
          price: "30.000đ – 100.000đ",
          visualTitle: "Charm Biển Vỗ",
          visualMaterial: "Bột vỏ sò mịn 120 mesh",
          tag: "Nº 01 · Phụ kiện sinh thái",
          highlight: "100% Tự nhiên",
          title: "Móc khóa nghệ thuật vỏ sò",
          description:
            "Đúc từ bột canxi vỏ sò nghiền mịn, chạm khắc ký tự sóng phù sa và kèm mã QR định danh.",
          foot: "Kèm Story Card riêng",
        },
        {
          storyLabel: "Story Card Nº 02",
          storyQuote: "“Mặt mờ lì đánh bóng sáp ong hữu cơ, hơi thở cửa biển Định An.”",
          price: "100.000đ – 250.000đ",
          visualTitle: "Đĩa Décor Vòm Sò",
          visualMaterial: "Đánh bóng sáp ong hữu cơ",
          tag: "Nº 02 · Điêu khắc ứng dụng",
          highlight: "85% Vỏ nghêu Cần Thơ",
          title: "Décor để bàn từ bột vỏ sò",
          description:
            "Khay cắm bút, đĩa trang sức hình vòm sóng biển, tối giản và bền chắc theo thời gian.",
          foot: "Kèm Story Card & Hộp kraft",
        },
        {
          storyLabel: "Tuyển tập Story Card & QR",
          storyQuote:
            "“Đại diện cho sự cộng hưởng doanh nghiệp và tạo sinh kế tự trọng cho người thợ.”",
          price: "250.000đ – 500.000đ",
          visualTitle: "Hộp Quà Tặng Xanh",
          visualMaterial: "Bao bì kraft tái chế thủ công",
          tag: "Nº 03 · Tuyển tập quà tặng",
          highlight: "ESG Certified",
          title: "Bộ quà tặng xanh cao cấp",
          description:
            "Combo hoàn chỉnh: sản phẩm + story card + hộp kraft + mã QR cá nhân hóa cho đối tác.",
          foot: "Tùy biến logo cho sự kiện B2B",
        },
      ],
    },
    handbook: {
      badge: "Cánh cửa số hóa tri thức",
      title: "Từ một chiếc vỏ đến một hệ sinh thái",
      introBefore: "Quét mã QR để bước vào ",
      introEmphasis: "Cẩm nang xanh số",
      introAfter:
        ", nơi câu chuyện của vỏ sò tiếp tục sống động qua các mẩu truyện tương tác, thông số giảm thiểu rác thải và thư viện bài học giáo dục nghệ thuật mở.",
      features: [
        {
          title: "Không cần cài đặt ứng dụng",
          description: "Mở trực tiếp trên mọi trình duyệt điện thoại chỉ với 1 giây chạm camera.",
        },
        {
          title: "Chứng thư số định danh nghệ nhân",
          description:
            "Biết rõ câu chuyện của người thợ Cần Thơ đã hoàn thiện món đồ trên tay bạn.",
        },
        {
          title: "Kho tư liệu bài giảng cho giáo viên",
          description:
            "Tải miễn phí giáo án mẫu về bảo vệ môi trường nước cho học sinh tiểu học & THCS.",
        },
      ],
      cta: "Khám phá thử bản xem trước cẩm nang",
      phone: {
        brand: "LAVIECO GREEN HANDBOOK",
        title: "Cẩm Nang Xanh Số · Tập 01",
        itemId: "ID: LV-CT-089",
        itemName: "Vật Phẩm Khay Sóng Biển",
        qrLabel: "Mã QR minh họa",
        rows: [
          { label: "Nơi thu gom:", value: "Quận Ninh Kiều, Cần Thơ", emphasis: false },
          { label: "Lượng vỏ tái chế:", value: "0.24 kg", emphasis: true },
          { label: "Người thợ tạo tác:", value: "Hợp tác xã Hoa Biển", emphasis: false },
        ],
        button: "Đọc tiếp câu chuyện số hóa",
        copyright: "© 2026 Dự án Giáo dục Mỹ thuật Xanh",
      },
      physicalCard: {
        label: "Story Card Vật Lý",
        quote: "“Được in trên giấy kraft từ xơ thực vật.”",
      },
    },
    impact: {
      kicker: "Tác động bền vững",
      title: "Từ Cần Thơ ra biển lớn",
      intro:
        "Chúng tôi kiến tạo mô hình tuần hoàn khép kín: trao cơ hội kinh tế chân chính cho cộng đồng địa phương và định hình thế hệ trẻ có trách nhiệm sinh thái.",
      pillars: [
        {
          title: "Tạo sinh kế bền vững & tự trọng",
          description:
            "Nguyên liệu bột vỏ sò đã khử khuẩn được chuyển giao đến các hộ gia đình khó khăn và hội người khuyết tật tại địa phương Cần Thơ để thực hiện các công đoạn hoàn thiện thủ công. Chúng tôi chi trả thù lao thỏa đáng theo từng sản phẩm hoàn tất với tinh thần đối tác sáng tạo bình đẳng, không dùng hình ảnh thương hại để làm từ thiện.",
          foot: "Đối tác thủ công: Hội Phụ nữ & Hợp tác xã Cần Thơ",
          badge: "Bảo trợ sinh kế",
        },
        {
          title: "Nâng nhận thức sinh thái ven biển",
          description:
            "Vùng Đồng bằng sông Cửu Long là vựa hải sản lớn nhất nước nhưng cũng chịu sức ép rác thải canxi từ các cơ sở chế biến. Bằng cách tái định nghĩa vỏ sò thành “chất liệu mỹ thuật”, LAVIECO kích hoạt niềm tự hào văn hóa sinh thái bản địa trong lòng thế hệ trẻ học đường.",
          foot: "Không gian giáo dục: Lồng ghép mỹ thuật xanh",
          badge: "Thí điểm tại Tây Đô",
        },
      ],
      stats: [
        {
          value: "15%",
          unit: "/năm",
          caption: "Tăng trưởng nhu cầu tiêu dùng sản phẩm xanh tại Việt Nam",
          source: "Nguồn: Bộ Công Thương",
        },
        {
          value: "72%",
          unit: "",
          caption: "Người tiêu dùng sẵn sàng chi trả nhiều hơn cho sản phẩm thân thiện môi trường",
          source: "Nguồn: Báo cáo PwC Việt Nam, 2024",
        },
        {
          value: "54%",
          unit: "",
          caption: "Chấp nhận mức giá cao hơn tới 10% cho các sản phẩm từ vật liệu tái chế",
          source: "Nguồn: Báo cáo PwC Việt Nam, 2024",
        },
      ],
      footnote:
        "* Dữ liệu đối chiếu kết hợp khảo sát nội bộ LAVIECO (n = 99, đối tượng học sinh - sinh viên & phụ huynh tại Cần Thơ / ĐBSCL, quý III/2024).",
    },
    roadmap: {
      kicker: "Tầm nhìn dài hạn",
      title: "Lộ trình ba giai đoạn",
      intro:
        "Ba con sóng dâng cao: xây dựng từng bước có đo lường từ vật phẩm minh chứng đến nền tảng cộng đồng xanh.",
      phases: [
        {
          status: "Đang thực hiện",
          title: "Giai đoạn 1: Sản phẩm minh chứng, story card & QR số",
          description:
            "Hoàn thiện công nghệ xử lý khử mùi bột vỏ sò an toàn, phát hành bộ sản phẩm minh chứng đầu tiên và thẻ Story Card định danh nghệ nhân Cần Thơ.",
          wave: "Sóng khởi nguyên · GĐ 1",
          highlights: ["Nền tảng canxi tinh khiết & định danh nguồn gốc"],
        },
        {
          status: "Quý 2 - 4 / 2025",
          title: "Giai đoạn 2: Mở rộng workshop, chương trình ngoại khóa & combo quà B2B",
          description:
            "Tổ chức chuỗi workshop cố định tại Ninh Kiều, đưa gói giáo dục nghệ thuật xanh vào 5 trường học và triển khai giải pháp quà tặng ESG cho doanh nghiệp.",
          wave: "Sóng lan tỏa · GĐ 2",
          highlights: [
            "5 trường phổ thông & ĐH tại Cần Thơ",
            "Chuỗi workshop trải nghiệm cuối tuần",
          ],
        },
        {
          status: "Sắp tới · 2026 trở đi",
          title:
            "Giai đoạn 3: Cẩm nang xanh freemium, app cộng đồng tích điểm & trạm thu gom phân loại",
          description:
            "Nâng cấp cẩm nang xanh số thành nền tảng giáo dục mở, ra mắt ứng dụng phân loại tích điểm đổi quà và mở rộng xưởng vệ tinh sang các tỉnh ven sông Mekong.",
          wave: "Sóng đại dương · GĐ 3",
          badge: "Dự phóng",
          highlights: [
            "Mạng lưới trạm thu gom An Giang, Kiên Giang",
            "Nền tảng số hóa Freemium toàn vùng ĐBSCL",
          ],
        },
      ],
    },
    contact: {
      badge: "Đồng hành cùng chúng tôi",
      titleBefore: "Cùng nhìn thấy giá trị ở nơi người khác chỉ thấy",
      titleAccent: "rác",
      titleEnd: ".",
      intro:
        "Hãy chọn cánh cửa phù hợp với bạn để cùng viết tiếp hành trình giáo dục nghệ thuật xanh.",
      organizationDoor: {
        label: "Cánh cửa 01 · Tổ chức",
        title: "Tôi là trường học hoặc doanh nghiệp",
        description:
          "Chúng tôi muốn phối hợp tổ chức ngoại khóa, đặt quà tặng B2B hoặc tài trợ chương trình ESG tại địa phương.",
      },
      personalDoor: {
        label: "Cánh cửa 02 · Cá nhân",
        title: "Tôi muốn mang một câu chuyện về nhà",
        description:
          "Dành cho những người yêu nghệ thuật bền vững muốn sở hữu các vật phẩm minh chứng, tự tay trải nghiệm workshop cuối tuần hoặc đăng ký nhận cẩm nang xanh số.",
        links: [
          {
            title: "Bộ sưu tập vật phẩm minh chứng",
            description: "Móc khóa, charm, khay để bàn kèm story card",
            cta: "Xem ↗",
          },
          {
            title: "Lịch workshop tại Cần Thơ",
            description: "Mỗi thứ Bảy & Chủ Nhật hàng tuần",
            cta: "Chi tiết ↗",
          },
        ],
        hotlineLabel: "Hotline / Zalo:",
      },
    },
  },
} as const;
