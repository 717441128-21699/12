import { useMemo, useState, useEffect } from 'react';
import {
  Search,
  Calendar,
  Clock,
  Users,
  Tag,
  ChevronDown,
  User as UserIcon,
  Activity,
  Dumbbell,
  Bike,
  Flower2,
  Flame,
  Zap,
  Filter,
  MapPin,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useMemberStore } from '@/store/memberStore';
import { useCoachStore } from '@/store/coachStore';
import { useManagerStore } from '@/store/managerStore';
import { calculateActualPrice, getLevelName, formatPrice } from '@/utils/price';
import { cn } from '@/lib/utils';
import type { Course, CourseCategory } from '@/types';
import { mockUsers } from '@/utils/mockData';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  flower2: Flower2,
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
};

function getCategoryIcon(categoryId: string, categories: CourseCategory[]) {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && iconMap[cat.icon]) return iconMap[cat.icon];
  return Activity;
}

export default function Booking() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { bookings, waitingQueues, bookCourse, joinWaiting } = useMemberStore();
  const { courses, fetchCourses } = useCoachStore();
  const { categories, fetchCategories } = useManagerStore();

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedCoach, setSelectedCoach] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const memberLevel = currentUser?.memberLevel || currentUser?.level || 'normal';

  const coaches = useMemo(() => mockUsers.filter((u) => u.role === 'coach'), []);

  const availableDates = useMemo(() => {
    const dates = new Set(courses.map((c) => c.date));
    return Array.from(dates).sort();
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses
      .filter((c) => c.status !== 'cancelled')
      .filter((c) => (selectedDate === 'all' ? true : c.date === selectedDate))
      .filter((c) => (selectedCategory === 'all' ? true : c.categoryId === selectedCategory))
      .filter((c) => (selectedCoach === 'all' ? true : c.coachId === selectedCoach))
      .filter((c) =>
        searchQuery.trim() === ''
          ? true
          : c.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  }, [courses, selectedDate, selectedCategory, selectedCoach, searchQuery]);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleBook = (course: Course) => {
    const result = bookCourse(course.id, courses);
    if (result) {
      showToast('success', `预约成功：${course.title}`);
    } else {
      if (course.bookedCount >= course.capacity) {
        showToast('info', '课程已满员，已加入候补队列');
      } else {
        showToast('error', '预约失败，请重试');
      }
    }
  };

  const handleJoinWaiting = (course: Course) => {
    const result = joinWaiting(course.id);
    if (result) {
      showToast('info', '已加入候补队列');
    } else {
      showToast('error', '操作失败，请重试');
    }
  };

  const getMyBookingStatus = (courseId: string) => {
    if (!currentUser) return null;
    const booking = bookings.find(
      (b) => b.courseId === courseId && b.memberId === currentUser.id && b.status !== 'cancelled'
    );
    if (booking) return booking.status;
    const wq = waitingQueues.find((wq) => wq.courseId === courseId);
    if (wq) {
      if (typeof wq.myPosition === 'number' && wq.myPosition >= 1) {
        return { type: 'waiting' as const, position: wq.myPosition };
      }
      if (wq.members && Array.isArray(wq.members)) {
        const idx = wq.members.findIndex((m: any) => m.memberId === currentUser.id);
        if (idx >= 0) return { type: 'waiting' as const, position: idx + 1 };
      }
    }
    return null;
  };

  const getCoachName = (coachId: string) => {
    return coaches.find((c) => c.id === coachId)?.name || '未知教练';
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (dateStr === today.toISOString().slice(0, 10)) return '今天';
    if (dateStr === tomorrow.toISOString().slice(0, 10)) return '明天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-8">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {toast && (
          <div
            className={cn(
              'fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-card border text-sm flex items-center gap-2 animate-slide-in-right',
              toast.type === 'success' && 'bg-success/15 border-success/30 text-success',
              toast.type === 'error' && 'bg-danger/15 border-danger/30 text-danger',
              toast.type === 'info' && 'bg-info/15 border-info/30 text-info'
            )}
          >
            {toast.type === 'success' && <Zap className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold font-display mb-1">课程预约</h1>
          <p className="text-muted text-sm">
            {getLevelName(memberLevel)}专享{(calculateActualPrice(100, memberLevel).discountRate * 100).toFixed(0)}折优惠
          </p>
        </div>

        <div className="bg-surface rounded-2xl p-4 mb-6 shadow-card border border-border">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
              <input
                type="text"
                placeholder="搜索课程..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surfaceAlt border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2 lg:gap-3">
              <div className="relative">
                <select
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="appearance-none bg-surfaceAlt border border-border rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent cursor-pointer min-w-[120px]"
                >
                  <option value="all">全部日期</option>
                  {availableDates.map((d) => (
                    <option key={d} value={d}>
                      {formatDateLabel(d)} {d.slice(5)}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none bg-surfaceAlt border border-border rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent cursor-pointer min-w-[120px]"
                >
                  <option value="all">全部分类</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedCoach}
                  onChange={(e) => setSelectedCoach(e.target.value)}
                  className="appearance-none bg-surfaceAlt border border-border rounded-xl pl-4 pr-9 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent cursor-pointer min-w-[120px]"
                >
                  <option value="all">全部教练</option>
                  {coaches.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Filter className="w-4 h-4 text-muted self-center mr-1" />
            <button
              onClick={() => {
                setSelectedDate('all');
                setSelectedCategory('all');
                setSelectedCoach('all');
                setSearchQuery('');
              }}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs transition-colors',
                selectedDate === 'all' && selectedCategory === 'all' && selectedCoach === 'all' && !searchQuery
                  ? 'bg-accent text-white'
                  : 'bg-surfaceAlt text-muted hover:text-foreground'
              )}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? 'all' : cat.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs transition-colors border',
                  selectedCategory === cat.id
                    ? 'bg-accent/15 text-accent border-accent/40'
                    : 'bg-surfaceAlt text-muted border-border hover:text-foreground'
                )}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted">
            共 <span className="text-foreground font-semibold">{filteredCourses.length}</span> 节课程
          </p>
        </div>

        {filteredCourses.length === 0 ? (
          <div className="bg-surface rounded-2xl p-12 text-center shadow-card border border-border">
            <Search className="w-12 h-12 mx-auto text-muted opacity-40 mb-3" />
            <p className="text-muted">没有找到匹配的课程</p>
            <p className="text-xs text-muted mt-1">试试调整筛选条件</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCourses.map((course) => {
              const category = categories.find((c) => c.id === course.categoryId);
              const CategoryIcon = getCategoryIcon(course.categoryId, categories);
              const { actualPrice, discountRate } = calculateActualPrice(course.price, memberLevel);
              const capacityPercent = Math.round((course.bookedCount / course.capacity) * 100);
              const isFull = course.bookedCount >= course.capacity;
              const bookingStatus = getMyBookingStatus(course.id);
              const isBooked = bookingStatus === 'booked' || bookingStatus === 'completed';
              const isWaiting = bookingStatus !== null && typeof bookingStatus === 'object' && bookingStatus.type === 'waiting';

              return (
                <div
                  key={course.id}
                  className="bg-surface rounded-2xl shadow-card border border-border overflow-hidden hover:border-accent/40 transition-all group"
                >
                  <div
                    className="h-2 relative"
                    style={{ backgroundColor: `${category?.color || '#FF5E1A'}20` }}
                  >
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${capacityPercent}%`,
                        backgroundColor: category?.color || '#FF5E1A',
                      }}
                    />
                  </div>

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${category?.color || '#FF5E1A'}20` }}
                      >
                        <CategoryIcon
                          className="w-5 h-5"
                          style={{ color: category?.color || '#FF5E1A' }}
                        />
                      </div>
                      <div className="text-right">
                        <div className="flex items-baseline gap-1.5 justify-end">
                          <span className="text-xl font-bold text-accent">
                            {formatPrice(actualPrice)}
                          </span>
                          {discountRate < 1 && (
                            <span className="text-xs text-muted line-through">
                              {formatPrice(course.price)}
                            </span>
                          )}
                        </div>
                        {discountRate < 1 && (
                          <span className="text-xs text-accent bg-accent-soft px-1.5 py-0.5 rounded">
                            {(discountRate * 10).toFixed(1)}折
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="font-semibold text-base mb-2 group-hover:text-accent transition-colors">
                      {course.title}
                    </h3>

                    <div className="space-y-1.5 text-xs text-muted mb-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateLabel(course.date)} {course.date.slice(5)}</span>
                        <Clock className="w-3.5 h-3.5 ml-1" />
                        <span>{course.startTime}-{course.endTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{getCoachName(course.coachId)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">FitPro 旗舰店</span>
                        <Tag className="w-3.5 h-3.5 ml-1" />
                        <span>{category?.name || '未分类'}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="flex items-center gap-1 text-muted">
                          <Users className="w-3.5 h-3.5" />
                          容量
                        </span>
                        <span className={cn(isFull ? 'text-danger font-semibold' : 'text-foreground')}>
                          {course.bookedCount}/{course.capacity}
                          {isFull && ' 已满'}
                        </span>
                      </div>
                      <div className="h-2 bg-surfaceAlt rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            capacityPercent >= 90 ? 'bg-danger' : capacityPercent >= 70 ? 'bg-accent' : 'bg-success'
                          )}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>

                    {isBooked ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-success/15 text-success border border-success/30 cursor-not-allowed"
                      >
                        ✓ 已预约
                      </button>
                    ) : isWaiting ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-info/15 text-info border border-info/30 cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        候补中 · 第{bookingStatus.position}位
                      </button>
                    ) : isFull ? (
                      <button
                        onClick={() => handleJoinWaiting(course)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-purple/15 text-purple border border-purple/30 hover:bg-purple/25 transition-colors flex items-center justify-center gap-2"
                      >
                        <Clock className="w-4 h-4" />
                        候补排队
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBook(course)}
                        className="w-full py-2.5 rounded-xl text-sm font-medium bg-accent text-white hover:bg-accent-hover transition-colors flex items-center justify-center gap-2 shadow-glow"
                      >
                        <Zap className="w-4 h-4" />
                        立即预约
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
