import type { RegistrationBlocker } from "@lavieco/shared/events";

/** Copy of the public program pages (`/chuong-trinh`). Event content comes from program-service. */
export const TEXT = {
  vi: {
    meta: {
      listTitle: "Chương trình",
      listDescription:
        "Workshop, talkshow và triển lãm giáo dục mỹ thuật xanh của LAVIECO tại Cần Thơ: biến phế liệu thành giá trị qua nghệ thuật.",
      schoolTitle: "Chương trình cho trường học",
      schoolDescription:
        "Gói ngoại khoá giáo dục sáng tạo xanh cho trường học: học về vật liệu tuần hoàn và tự tay sáng tạo.",
      previewTitle: "Bản xem trước",
    },
    hero: {
      eyebrow: "Nº 02 · Chương trình",
      title: "Học xanh bằng",
      titleAccent: "đôi tay",
      intro:
        "Mỗi chương trình là một lần chạm vào vòng tuần hoàn: nghe câu chuyện của phế liệu, hiểu chất liệu, rồi tự tay biến nó thành tác phẩm.",
    },
    ladder: {
      kicker: "Bốn nấc thang giá trị",
      intro:
        "Sản phẩm là vật chứng, giáo dục là cốt lõi. Mỗi nấc là một cách đồng hành cùng LAVIECO.",
      steps: [
        { number: "01", title: "Cẩm nang xanh số", note: "Quét QR trên sản phẩm" },
        { number: "02", title: "Workshop trải nghiệm", note: "2–3 giờ thực hành" },
        { number: "03", title: "Ngoại khoá học đường", note: "3–5 buổi mỗi khoá" },
        { number: "04", title: "Tài trợ giáo dục ESG", note: "Doanh nghiệp đồng hành" },
      ],
      schoolCta: "Dành cho trường học",
    },
    featured: {
      label: "Sắp diễn ra gần nhất",
      cta: "Xem chi tiết",
    },
    filters: {
      label: "Lọc chương trình",
      all: "Tất cả",
      online: "Trực tuyến",
      offline: "Tại xưởng",
      free: "Miễn phí",
      month: "Tháng",
      anyMonth: "Mọi tháng",
      apply: "Lọc",
      reset: "Xoá lọc",
    },
    list: {
      title: "Chương trình sắp tới",
      empty:
        "Chưa có chương trình nào khớp bộ lọc. Hãy quay lại sau, hoặc xem các chương trình đã diễn ra bên dưới.",
      more: "Xem thêm",
      pastTitle: "Chương trình đã diễn ra",
      pastIntro: "Những buổi học và triển lãm LAVIECO đã cùng cộng đồng thực hiện.",
      pastEmpty: "Chưa có chương trình nào trong lưu trữ.",
    },
    card: {
      free: "Miễn phí",
      priceFrom: (price: string) => `Từ ${price}`,
      seatsLeft: (count: number) => `Còn ${count} chỗ`,
      soldOut: "Hết chỗ",
      closed: "Đã đóng đăng ký",
      ended: "Đã diễn ra",
      online: "Trực tuyến",
      details: "Chi tiết",
    },
    detail: {
      back: "Tất cả chương trình",
      when: "Thời gian",
      where: "Địa điểm",
      online: "Trực tuyến",
      onlineNote: "Link tham gia được gửi trong email vé.",
      map: "Xem bản đồ",
      about: "Về chương trình",
      safety: "Lưu ý an toàn",
      speakers: "Người hướng dẫn",
      agenda: "Lịch trình",
      gallery: "Hình ảnh",
      tickets: "Loại vé",
      faq: "Câu hỏi thường gặp",
      policy: "Chính sách huỷ",
      register: "Đăng ký",
      registerNow: "Đăng ký ngay",
      registerNote: "Chỉ cần thông tin người đặt. Vé có mã QR được gửi qua email sau khi xác thực.",
      lookupTickets: "Tra cứu vé đã đặt",
      registerSoon: "Sắp mở đăng ký",
      registerSoonNote: "Đăng ký và nhận vé qua email sẽ mở trong thời gian tới.",
      blockers: {
        not_open: "Chưa mở đăng ký",
        online_link_pending: "Sắp mở đăng ký",
        sold_out: "Hết chỗ",
        sale_not_started: "Chưa mở bán vé",
        sale_ended: "Đã hết thời gian mở bán",
        event_started: "Chương trình đã bắt đầu",
      } satisfies Record<RegistrationBlocker, string>,
      closed: "Chương trình đã đóng đăng ký.",
      ended: "Chương trình đã diễn ra.",
      unlimited: "Không giới hạn chỗ",
      saleWindow: (from: string | null, to: string | null) =>
        from && to
          ? `Mở bán ${from} – ${to}`
          : from
            ? `Mở bán từ ${from}`
            : to
              ? `Mở bán đến ${to}`
              : "",
      maxPerOrder: (count: number) => `Tối đa ${count} vé mỗi đơn`,
      educationNote:
        "Mỗi chương trình là một phần của hành trình giáo dục sáng tạo xanh. Tác phẩm bạn làm ra là minh chứng; điều mang về là cách nhìn mới về phế liệu.",
      handbookCta: "Đọc Cẩm nang xanh số",
    },
    preview: {
      banner: "Bản xem trước · chỉ đội LAVIECO thấy trang này",
      status: {
        draft: "Nháp",
        published: "Đang mở",
        closed: "Đã đóng đăng ký",
        ended: "Đã kết thúc",
      },
    },
    school: {
      eyebrow: "Chương trình · Trường học",
      title: "Mang lớp học xanh",
      titleAccent: "đến trường",
      intro:
        "Gói ngoại khoá được module hoá theo số buổi để đưa vào kế hoạch năm học. Học sinh học về vật liệu tuần hoàn và tự tay sáng tạo; LAVIECO không thu thông tin cá nhân của học sinh, chỉ số lượng.",
      points: [
        "3–5 buổi mỗi khoá, từ tiểu học đến THPT",
        "Giáo cụ từ vỏ sò và vật liệu tái sinh, đã có hướng dẫn an toàn",
        "Báo giá theo số lượng học sinh, đội ngũ LAVIECO xác nhận",
      ],
      formTitle: "Gửi yêu cầu tư vấn",
      back: "Tất cả chương trình",
    },
    coverAlt: (title: string) => `Minh hoạ cho chương trình ${title}`,
  },
} as const;
