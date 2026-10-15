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
      /** Two lines below lg and from xl up; joined into one line in the lg-only band. */
      titleLead: ["Giáo dục", "sáng tạo xanh,"],
      titleLines: ["thông qua"],
      titleAccent: "nghệ thuật",
      titleEnd: ".",
      taglineEn: "Art to learn green. Art to create green",
      quote:
        "“Giá trị của một thứ không nằm ở bản chất của nó, mà nằm ở cách con người sáng tạo và trao ý nghĩa cho nó.”",
      body: "Chúng tôi không bán đồ thủ công tái chế. Chúng tôi kiến tạo hành trình nhận thức thông qua nghệ thuật từ bột vỏ sò.",
      primaryCta: "Bước vào triển lãm",
      secondaryCta: "Dành cho trường học & doanh nghiệp",
      stampTitle: "GALLERY Nº 2026",
      stampPlace: "Can Tho Pilot",
      stampMaterial: "Vật liệu vỏ nghêu, sò, ốc Tây Đô",
    },
    heroArches: {
      main: {
        kicker: "Vật phẩm điển hình",
        number: "Nº 001 · Triển lãm",
        title: "Gốm bột vỏ sò đúc thủ công",
        place: "Xưởng thủ công cộng đồng · Cần Thơ",
      },
      deep: { number: "Nº 002 · Tuần hoàn", title: "Biến phế liệu thành giá trị" },
      raw: { number: "Nº 003 · Nguyên bản", title: "Vỏ sò giữ nguyên vân tự nhiên" },
    },
    storyCard: {
      label: "Story Card · Nº 001",
      title: "Gốm bột vỏ sò · Kể câu chuyện phế liệu",
      qrLabel: "Mã QR mẫu trên story card",
      note: "Thu gom tại Cần Thơ",
    },
    marquee: {
      words: ["LIFE", "ART", "VALUE", "INNOVATION", "ECO"],
      taglines: [
        "GIÁO DỤC SÁNG TẠO XANH, THÔNG QUA NGHỆ THUẬT",
        "ART TO LEARN GREEN. ART TO CREATE GREEN",
        "THÍ ĐIỂM TẠI CẦN THƠ",
      ],
      separator: "✦",
      screenReaderText:
        "Life, Art, Value, Innovation, Eco. Giáo dục sáng tạo xanh, thông qua nghệ thuật. Art to learn green. Art to create green. Thí điểm tại Cần Thơ.",
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
        "Bốn chặng biến đổi vật lý và ý niệm: đưa những mảnh vỏ bị bỏ đi sau bữa ăn trở thành tác phẩm nghệ thuật đong đầy cảm xúc.",
      phaseLabel: "Giai đoạn",
      stages: [
        {
          number: "01",
          title: "Thu gom vỏ thô",
          description: "Từ nhà hàng hải sản, quán ăn & chợ đầu mối tại Cần Thơ",
          visualKicker: "Tập kết vỏ thô",
          visualCaption: "Nhà hàng · Quán ăn · Chợ",
          tag: "Nº 01 · Thu gom",
          metric: "Thu gom tại Cần Thơ",
        },
        {
          number: "02",
          title: "Làm sạch & khử mùi",
          description:
            "Xịt rửa áp lực, luộc, ngâm dung dịch javel pha loãng, chà sạch, xả nước đến hết mùi rồi phơi nắng",
          visualKicker: "Xử lý vỏ thô",
          visualCaption: "Phơi nắng trọn ngày",
          tag: "Nº 02 · Làm sạch",
          metric: "Làm sạch & khử mùi nhiều bước",
        },
        {
          number: "03",
          title: "Tạo tác thủ công",
          description:
            "Vỏ đẹp giữ nguyên làm phụ kiện; phần còn lại nghiền bột, phối chất kết dính theo công thức tỷ lệ, đổ khuôn silicone và chà nhám hoàn thiện",
          visualKicker: "Khuôn silicone",
          visualCaption: "Nguyên bản & đúc bột",
          tag: "Nº 03 · Tạo tác",
          metric: "Chất kết dính theo công thức tỷ lệ",
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
          cardNote: "Gốm bột vỏ sò",
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
          tag: "MIỄN PHÍ GIAI ĐOẠN RA MẮT",
          title: "Cẩm nang xanh số",
          description:
            "Truy cập tức thì bằng cách quét mã QR đi kèm sản phẩm. Câu chuyện, kiến thức về giá trị của phế liệu và tư duy kinh tế tuần hoàn, kể bằng ngôn ngữ nghệ thuật.",
          footLabel: "Hình thức",
          foot: "Trang tương tác trực tuyến · Quét mã QR",
        },
        {
          number: "02",
          tag: "2 - 3 GIỜ THỰC HÀNH",
          title: "Workshop trải nghiệm",
          description:
            "Dành cho học sinh, sinh viên và nhóm cộng đồng. Tự tay đúc sản phẩm từ bột vỏ sò, kết hợp nội dung về giá trị của phế liệu và kinh tế tuần hoàn.",
          footLabel: "Kỹ năng đạt được",
          foot: "Tư duy chất liệu tuần hoàn & Tác phẩm thủ công cá nhân",
        },
        {
          number: "03",
          tag: "3 - 5 BUỔI / KHÓA",
          title: "Gói ngoại khóa học đường",
          description:
            "Tích hợp vào hoạt động trải nghiệm sáng tạo của nhà trường, module hóa theo số buổi để dễ đưa vào kế hoạch năm học. Học sinh vừa học về vật liệu tuần hoàn vừa tự tay sáng tạo.",
          footLabel: "Đối tượng ưu tiên",
          foot: "Trường tiểu học đến THPT",
        },
        {
          number: "04",
          tag: "DOANH NGHIỆP ESG",
          title: "Tài trợ giáo dục ESG",
          description:
            "Doanh nghiệp tài trợ chi phí chương trình cho một trường học hoặc cộng đồng cụ thể. LAVIECO triển khai chương trình; doanh nghiệp nhận lại truyền thông CSR và báo cáo tác động ESG.",
          footLabel: "Cam kết kết quả",
          foot: "Truyền thông CSR & báo cáo tác động ESG",
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
          storyQuote: "“Mỗi chiếc vỏ giữ nguyên hình dáng và đường vân của riêng nó.”",
          price: "30.000đ – 100.000đ",
          visualTitle: "Charm Vỏ Sò",
          visualMaterial: "Vỏ sò nguyên bản tuyển chọn",
          tag: "Nº 01 · Phụ kiện từ vỏ nguyên bản",
          highlight: "Vỏ sò nguyên bản",
          title: "Móc khóa, phone charm & dây chuyền",
          description:
            "Vỏ sò được tuyển chọn sau khi làm sạch, giữ hình dáng và vân tự nhiên, gia công thủ công thành phụ kiện.",
          foot: "Gia công thủ công",
        },
        {
          storyLabel: "Story Card Nº 02",
          storyQuote: "“Từ bột vỏ sò nghiền mịn, đổ khuôn và chà nhám bằng tay.”",
          price: "100.000đ – 250.000đ",
          visualTitle: "Đĩa Décor Vòm Sò",
          visualMaterial: "Đổ khuôn silicone thủ công",
          tag: "Nº 02 · Gốm bột vỏ sò",
          highlight: "Bột vỏ sò & chất kết dính",
          title: "Gốm bột vỏ sò",
          description:
            "Chậu cây, lót ly, đĩa đựng trang sức, ly nến thơm: đúc từ bột vỏ sò phối chất kết dính theo công thức tỷ lệ.",
          foot: "Kèm Story Card",
        },
        {
          storyLabel: "Tuyển tập Story Card & QR",
          storyQuote:
            "“Đại diện cho sự cộng hưởng doanh nghiệp và tạo sinh kế tự trọng cho người thợ.”",
          price: "250.000đ – 500.000đ",
          visualTitle: "Hộp Quà Tặng Xanh",
          visualMaterial: "Bao bì giấy kraft",
          tag: "Nº 03 · Tuyển tập quà tặng",
          highlight: "Phù hợp quà tặng CSR/ESG",
          title: "Combo quà tặng xanh",
          description:
            "Combo hoàn chỉnh: sản phẩm chính + story card + bao bì giấy kraft + mã QR dẫn vào Cẩm nang xanh số.",
          foot: "Quà tặng doanh nghiệp & sự kiện CSR",
        },
      ],
    },
    handbook: {
      badge: "Cánh cửa số hóa tri thức",
      title: "Từ một chiếc vỏ đến một hệ sinh thái",
      introBefore: "Quét mã QR để bước vào ",
      introEmphasis: "Cẩm nang xanh số",
      introAfter:
        ", nơi câu chuyện của vỏ sò tiếp tục qua các mẩu truyện tương tác và bài học về giá trị của phế liệu.",
      features: [
        {
          title: "Không cần cài đặt ứng dụng",
          description: "Mở trực tiếp trên mọi trình duyệt điện thoại chỉ với 1 giây chạm camera.",
        },
        {
          title: "Câu chuyện đằng sau món đồ",
          description:
            "Biết vật liệu đến từ đâu và hành trình từ phế liệu thành món đồ trên tay bạn.",
        },
        {
          title: "Bài học về kinh tế tuần hoàn",
          description:
            "Nội dung giáo dục về giá trị của phế liệu, gần gũi, dễ tiếp cận và không giáo điều.",
        },
      ],
      cta: "Khám phá thử bản xem trước cẩm nang",
      phone: {
        brand: "LAVIECO GREEN HANDBOOK",
        title: "Cẩm Nang Xanh Số · Tập 01",
        itemId: "ID: LV-CT-089",
        itemName: "Đĩa Đựng Trang Sức Bột Vỏ Sò",
        qrLabel: "Mã QR minh họa",
        rows: [
          { label: "Nơi thu gom:", value: "Cần Thơ", emphasis: false },
          { label: "Chất liệu:", value: "Bột vỏ sò", emphasis: true },
          { label: "Hoàn thiện:", value: "Thủ công", emphasis: false },
        ],
        button: "Đọc tiếp câu chuyện số hóa",
        copyright: (year: number) => `© ${year} Dự án Giáo dục Mỹ thuật Xanh`,
      },
      physicalCard: {
        label: "Story Card Vật Lý",
        quote: "“Đi kèm sản phẩm, kể câu chuyện và bài học.”",
      },
    },
    impact: {
      kicker: "Tác động bền vững",
      title: "Từ Cần Thơ, lan tỏa tư duy tuần hoàn",
      intro:
        "Chúng tôi kiến tạo mô hình tuần hoàn khép kín: trao cơ hội kinh tế chân chính cho cộng đồng địa phương và định hình thế hệ trẻ có trách nhiệm sinh thái.",
      pillars: [
        {
          title: "Tạo sinh kế bền vững & tự trọng",
          description:
            "LAVIECO giao nguyên liệu đã sơ chế cho các hộ gia đình khó khăn, người khuyết tật hoặc người chưa có nguồn thu nhập chính thức để gia công sản phẩm thủ công, và trả công theo sản phẩm hoàn thành. Chúng tôi làm việc với tinh thần đối tác sáng tạo bình đẳng, không dùng hình ảnh thương hại để làm từ thiện.",
          foot: "Trả công theo sản phẩm hoàn thành",
          badge: "Bảo trợ sinh kế",
        },
        {
          title: "Nâng cao nhận thức môi trường",
          description:
            "Qua nội dung giáo dục và truyền thông, LAVIECO thay đổi cách cộng đồng, đặc biệt là thế hệ trẻ, nhìn nhận giá trị của phế liệu và trách nhiệm giảm thiểu rác thải. Vỏ hải sản chỉ là chất liệu minh chứng đầu tiên, không phải giới hạn.",
          foot: "Không gian giáo dục: Lồng ghép mỹ thuật xanh",
          badge: "Thí điểm tại Cần Thơ",
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
      footnote: "* Khảo sát nội bộ LAVIECO, n = 99, chủ yếu Gen Z & sinh viên tại ĐBSCL/Cần Thơ.",
    },
    roadmap: {
      kicker: "Tầm nhìn dài hạn",
      title: "Lộ trình ba giai đoạn",
      intro:
        "Ba con sóng dâng cao: xây dựng từng bước có đo lường từ vật phẩm minh chứng đến nền tảng cộng đồng xanh.",
      phases: [
        {
          status: "Giai đoạn 1 · Đang thực hiện",
          title: "Sản phẩm minh chứng, story card & QR số",
          description:
            "Chuẩn hóa quy trình làm sạch và khử mùi vỏ, phát hành dòng sản phẩm minh chứng kèm story card và mã QR dẫn vào Cẩm nang xanh số; thử nghiệm LaviAgent.",
          wave: "Sóng khởi nguyên · GĐ 1",
          highlights: ["Story card & mã QR dẫn vào Cẩm nang xanh số"],
        },
        {
          status: "Giai đoạn 2 · Trung hạn",
          title: "Workshop, chương trình ngoại khóa & combo quà B2B",
          description:
            "Thương mại hóa workshop, gói ngoại khóa và DIY Kit cho trường học; triển khai combo quà tặng cho doanh nghiệp ESG.",
          wave: "Sóng lan tỏa · GĐ 2",
          highlights: ["Gói ngoại khóa cho trường học", "Workshop trải nghiệm & DIY Kit"],
        },
        {
          status: "Giai đoạn 3 · Dài hạn",
          title: "Cẩm nang xanh freemium, app cộng đồng tích điểm & thu gom phân loại",
          description:
            "Phát triển Cẩm nang xanh số theo mô hình Freemium, ra mắt ứng dụng cộng đồng tích điểm và hệ thống hỗ trợ thu gom phế liệu có phân loại.",
          wave: "Sóng đại dương · GĐ 3",
          badge: "Dự phóng",
          highlights: ["Cẩm nang xanh số Freemium", "Hỗ trợ thu gom phế liệu có phân loại"],
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
          "Dành cho những người yêu nghệ thuật bền vững muốn sở hữu các vật phẩm minh chứng, tự tay trải nghiệm workshop hoặc đăng ký nhận cẩm nang xanh số.",
        links: [
          {
            title: "Bộ sưu tập vật phẩm minh chứng",
            description: "Phụ kiện vỏ nguyên bản, gốm bột vỏ sò & combo quà tặng",
            cta: "Xem ↗",
          },
          {
            title: "Workshop trải nghiệm tại Cần Thơ",
            description: "2 - 3 giờ thực hành · Liên hệ để nhận lịch",
            cta: "Chi tiết ↗",
          },
        ],
        hotlineLabel: "Hotline / Zalo:",
      },
    },
  },
} as const;
