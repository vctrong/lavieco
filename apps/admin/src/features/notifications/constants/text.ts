import type { PushTopic } from "@lavieco/shared/identity";

export const TEXT = {
  vi: {
    title: "Thông báo",
    lead: "Nhận thông báo trên điện thoại hoặc máy tính khi có đơn vé, đăng ký mới hay chương trình sắp hết chỗ.",
    device: {
      heading: "Máy này",
      on: "Đang nhận thông báo trên máy này.",
      off: "Máy này chưa bật thông báo.",
      enable: "Bật thông báo trên máy này",
      disable: "Tắt trên máy này",
      test: "Gửi thử",
      testSent: (count: number) =>
        count === 0
          ? "Chưa có máy nào nhận được. Bật thông báo trước rồi thử lại."
          : `Đã gửi tới ${count} thiết bị. Thông báo sẽ hiện sau vài giây.`,
      working: "Đang xử lý…",
    },
    hints: {
      unsupported:
        "Trình duyệt này không hỗ trợ thông báo đẩy. Hãy dùng Chrome trên Android hoặc Safari trên iPhone (iOS 16.4 trở lên).",
      iosInstall:
        "Trên iPhone, thông báo chỉ hoạt động khi đã cài app: bấm Chia sẻ rồi “Thêm vào MH chính”, mở LAVIECO từ màn hình chính và bật lại ở đây (cần iOS 16.4 trở lên).",
      denied:
        "Bạn đã chặn thông báo cho trang này. Mở Cài đặt của trình duyệt (hoặc Cài đặt > Thông báo > LAVIECO trên iPhone) để cho phép lại.",
      dev: "Thông báo chỉ chạy trên bản đã triển khai (service worker tắt khi chạy dev).",
      unavailable: "Máy chủ chưa cấu hình thông báo đẩy (VAPID). Báo người quản trị hạ tầng.",
    },
    topics: {
      heading: "Loại thông báo",
      lead: "Áp dụng cho mọi thiết bị của bạn. Chỉ hiện những loại mà quyền của bạn cho phép xem.",
      save: "Lưu lựa chọn",
      saved: "Đã lưu.",
      labels: {
        order_paid: "Đơn vé đã thanh toán",
        registration_free: "Đăng ký mới (vé miễn phí)",
        order_attention: "Đơn cần xử lý (cần hoàn tiền, lệch số tiền)",
        event_seats: "Chương trình sắp hết chỗ hoặc đã hết chỗ",
        lead_new: "Liên hệ hợp tác mới",
      } satisfies Record<PushTopic, string>,
      notes: {
        lead_new: "Sẽ hoạt động khi form hợp tác ra mắt.",
      } as Partial<Record<PushTopic, string>>,
    },
    devices: {
      heading: "Thiết bị đang nhận",
      none: "Chưa có thiết bị nào.",
      unknown: "Thiết bị",
      since: (date: string) => `từ ${date}`,
    },
    errors: {
      session_expired: "Phiên đăng nhập đã hết. Tải lại trang để đăng nhập lại.",
      forbidden: "Tài khoản của bạn không dùng được tính năng này.",
      invalid: "Dữ liệu không hợp lệ. Tải lại trang rồi thử lại.",
      push_unavailable: "Máy chủ chưa cấu hình thông báo đẩy (VAPID).",
      unavailable: "Hệ thống đang bận. Thử lại sau ít phút.",
      offline: "Mất kết nối mạng. Kiểm tra mạng rồi thử lại.",
      stale_version: "Trang đã có bản mới. Tải lại trang rồi thử lại.",
      subscribe_failed:
        "Trình duyệt không đăng ký được thông báo. Thử lại, hoặc tắt chế độ tiết kiệm pin/riêng tư.",
    },
  },
} as const;

export type NotificationsText = (typeof TEXT)["vi"];
