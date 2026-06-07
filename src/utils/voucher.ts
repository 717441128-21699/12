import { Booking, Course, RefundRequest, User, Store } from '../types';
import { formatPrice } from './price';

export type VoucherType = 'booking' | 'refund' | 'attendance';

export interface BookingVoucherData {
  booking: Booking;
  course: Course;
  member: User;
  store?: Store;
}

export interface RefundVoucherData {
  refundRequest: RefundRequest;
  member: User;
  booking: Booking;
  course: Course;
}

export interface AttendanceVoucherData {
  booking: Booking;
  course: Course;
  member: User;
  coach?: User;
  store?: Store;
  trainingReport?: string;
}

function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(dateStr: string): string {
  return dateStr;
}

function generateVoucherId(type: VoucherType): string {
  const prefix = type === 'booking' ? 'BK' : type === 'refund' ? 'RF' : 'AT';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function addHeader(content: string, title: string, voucherId: string): string {
  let result = '';
  result += '='.repeat(60) + '\n';
  result += `  FitPro 健身连锁\n`;
  result += `  ${title}\n`;
  result += '='.repeat(60) + '\n';
  result += `  凭证编号: ${voucherId}\n`;
  result += `  生成时间: ${formatDateTime(new Date().toISOString())}\n`;
  result += '-'.repeat(60) + '\n';
  result += content;
  result += '\n' + '='.repeat(60) + '\n';
  result += '  本凭证由 FitPro 系统自动生成，具有法律效力\n';
  result += '  客服热线: 400-888-8888\n';
  result += '='.repeat(60) + '\n';
  return result;
}

export function generateBookingVoucher(data: BookingVoucherData): string {
  const { booking, course, member, store } = data;
  const voucherId = generateVoucherId('booking');

  let content = '';
  content += `  会员姓名: ${member.name}\n`;
  content += `  会员手机: ${member.phone}\n`;
  content += `  会员编号: ${member.id}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  课程名称: ${course.title}\n`;
  content += `  课程日期: ${formatDate(course.date)}\n`;
  content += `  课程时间: ${course.startTime} - ${course.endTime}\n`;
  if (store) {
    content += `  上课门店: ${store.name} (${store.city}${store.address})\n`;
  }
  content += `  预约编号: ${booking.id}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  课程原价: ${formatPrice(booking.price)}\n`;
  content += `  折扣率: ${Math.round(booking.discountRate * 100)}%\n`;
  content += `  实付金额: ${formatPrice(booking.actualPrice)}\n`;
  content += `  预约时间: ${formatDateTime(booking.bookedAt)}\n`;

  return addHeader(content, '课程预约凭证', voucherId);
}

export function generateRefundVoucher(data: RefundVoucherData): string {
  const { refundRequest, member, booking, course } = data;
  const voucherId = generateVoucherId('refund');

  let content = '';
  content += `  会员姓名: ${member.name}\n`;
  content += `  会员手机: ${member.phone}\n`;
  content += `  会员编号: ${member.id}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  退款申请编号: ${refundRequest.id}\n`;
  content += `  关联预约编号: ${refundRequest.bookingId}\n`;
  content += `  关联课程: ${course.title} (${formatDate(course.date)})\n`;
  content += `  退款原因: ${refundRequest.reason}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  总课程数: ${refundRequest.totalSessions} 节\n`;
  content += `  已完成课程: ${refundRequest.completedSessions} 节\n`;
  content += `  退款比例: ${(refundRequest.refundRatio * 100).toFixed(1)}%\n`;
  content += `  原支付金额: ${formatPrice(refundRequest.paidAmount)}\n`;
  content += `  应退金额: ${formatPrice(refundRequest.refundAmount)}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  申请时间: ${formatDateTime(refundRequest.createdAt)}\n`;
  content += `  审批状态: ${refundRequest.status === 'approved' ? '已通过' : refundRequest.status === 'rejected' ? '已驳回' : '待审批'}\n`;
  if (refundRequest.reviewedAt) {
    content += `  审批时间: ${formatDateTime(refundRequest.reviewedAt)}\n`;
  }

  return addHeader(content, '退款凭证', voucherId);
}

export function generateAttendanceVoucher(data: AttendanceVoucherData): string {
  const { booking, course, member, coach, store, trainingReport } = data;
  const voucherId = generateVoucherId('attendance');

  let content = '';
  content += `  会员姓名: ${member.name}\n`;
  content += `  会员手机: ${member.phone}\n`;
  content += `  会员编号: ${member.id}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  课程名称: ${course.title}\n`;
  content += `  课程日期: ${formatDate(course.date)}\n`;
  content += `  课程时间: ${course.startTime} - ${course.endTime}\n`;
  if (coach) {
    content += `  授课教练: ${coach.name}\n`;
  }
  if (store) {
    content += `  上课门店: ${store.name} (${store.city}${store.address})\n`;
  }
  content += `  预约编号: ${booking.id}\n`;
  content += '-'.repeat(60) + '\n';
  content += `  出勤状态: ${booking.attendance ? '已出勤' : '未出勤'}\n`;
  content += `  课程状态: ${booking.status === 'completed' ? '已完成' : booking.status}\n`;
  content += `  实付金额: ${formatPrice(booking.actualPrice)}\n`;
  if (trainingReport) {
    content += '-'.repeat(60) + '\n';
    content += `  训练报告:\n`;
    content += `    ${trainingReport}\n`;
  }

  return addHeader(content, '出勤凭证', voucherId);
}

export function downloadVoucher(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${Date.now()}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
