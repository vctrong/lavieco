/** Copy shared by every admin form: error note, common failures (docs/04 §5.5). */
export const FORM_TEXT = {
  vi: {
    requiredNote: "Các mục có dấu * là bắt buộc.",
    aboveSubmit: (count: number) => `Còn ${count} mục cần điền hoặc sửa`,
    /** Read out by screen readers (hidden live region next to the note above the button). */
    announce: (count: number) => `Còn ${count} mục cần điền`,
    /** Fallback field messages for schemas that set none (src/shared/zod-vi.ts). */
    validation: {
      required: "Vui lòng nhập thông tin này.",
      invalid: "Thông tin này chưa hợp lệ.",
      email: "Email chưa đúng định dạng.",
      format: "Định dạng chưa đúng.",
      choose: "Vui lòng chọn một giá trị hợp lệ.",
      tooShort: (min: number) => `Cần ít nhất ${min} ký tự.`,
      tooLong: (max: number) => `Tối đa ${max} ký tự.`,
      atLeast: (min: number) => `Giá trị tối thiểu là ${min}.`,
      atMost: (max: number) => `Giá trị tối đa là ${max}.`,
      pickAtLeast: (min: number) => `Chọn ít nhất ${min} mục.`,
      pickAtMost: (max: number) => `Chọn tối đa ${max} mục.`,
    },
    failures: {
      unavailable: "Hệ thống đang bận. Vui lòng thử lại sau ít phút.",
      reference: (ref: string) => `Mã tham chiếu: ${ref}`,
      stale_version: "Trang đã có bản cập nhật, vui lòng tải lại.",
      offline: "Không kết nối được, kiểm tra mạng rồi thử lại.",
      bot: "Xác minh chưa thành công, vui lòng thử lại.",
      rate_limited: "Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.",
      rate_limited_in: (seconds: number) => `Bạn thao tác quá nhanh, thử lại sau ${seconds} giây.`,
      code_not_sent: "Chưa gửi được mã xác thực, thử lại sau ít phút.",
      invalid_input: "Một số thông tin chưa hợp lệ. Vui lòng kiểm tra các mục được đánh dấu.",
    },
    reload: "Tải lại trang",
    /** Draft notices of the long editors (`useStaffDraft`). */
    draft: {
      typing: "Đang nhập…",
      saving: "Đang lưu nháp…",
      savedAt: (time: string) => `Đã lưu nháp trên máy này lúc ${time}`,
      failed: "Trình duyệt không cho lưu nháp: đừng đóng trang trước khi bấm Lưu.",
      held: "Chưa lưu nháp mới: hãy chọn khôi phục hoặc bỏ bản nháp cũ ở đầu trang.",
      offer: (time: string) => `Có bản nháp chưa lưu lên hệ thống, ghi lúc ${time}.`,
      stale:
        "Dữ liệu trên hệ thống đã thay đổi sau bản nháp này. Khôi phục rồi bấm Lưu sẽ ghi đè thay đổi đó; hãy so lại trước khi lưu.",
      restore: "Khôi phục",
      discard: "Bỏ bản nháp",
    },
  },
} as const;
