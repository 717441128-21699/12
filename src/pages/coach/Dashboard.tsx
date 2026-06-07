import { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Bell,
  Check,
  X,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  ListChecks,
  Activity,
  Dumbbell,
  Bike,
  Flame,
  Flower2,
  Sparkles,
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, addDays, parseISO } from 'date-fns';
import { useCoachStore } from '@/store/coachStore';
import { useMemberStore } from '@/store/memberStore';
import { useManagerStore } from '@/store/managerStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import type { Course, Booking } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  flower2: Flower2,
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
  sparkles: Sparkles,
};

function getCategoryIcon(iconName: string) {
  return iconMap[iconName] || Activity;
}

function isWithin30Minutes(course: Course): boolean {
  const now = new Date();
  const courseDateTime = parseISO(`${course.date}T${course.startTime}:00`);
  const diffMs = courseDateTime.getTime() - now.getTime();
  const diffMinutes = diffMs / (1000 * 60);
  return diffMinutes > 0 && diffMinutes <= 30;
}

export default function CoachDashboard() {
  const { courses, createCourse, checkConflict, checkIn } = useCoachStore();
  const { bookings } = useMemberStore();
  const { categories } = useManagerStore();
  const currentUser = useAuthStore((s) => s.currentUser);
  const coachId = currentUser?.id ?? 'coach1';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [showCheckInModal, setShowCheckInModal] = useState<{
    course: Course;
    attendances: Record<string, boolean>;
  } | null>(null);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const [form, setForm] = useState({
    categoryId: categories[0]?.id ?? '',
    title: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    endTime: '10:00',
    capacity: 15,
    price: categories[0]?.basePrice ?? 100,
    description: '',
  });
  const [conflict, setConflict] = useState(false);
  const [formError, setFormError] = useState('');

  const weekDays = useMemo(() => {
    const end = endOfWeek(weekStart, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: weekStart, end });
  }, [weekStart]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = 6; h <= 22; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`);
    }
    return slots;
  }, []);

  const coachCourses = useMemo(
    () => courses.filter((c) => c.coachId === coachId),
    [courses, coachId]
  );

  const handleFormChange = (field: string, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'date' || field === 'startTime' || field === 'endTime') {
      const next = { ...form, [field]: value };
      const hasConflict = checkConflict(
        coachId,
        String(next.date),
        String(next.startTime),
        String(next.endTime)
      );
      setConflict(hasConflict);
    }
    if (field === 'categoryId') {
      const cat = categories.find((c) => c.id === value);
      if (cat) {
        setForm((prev) => ({ ...prev, categoryId: String(value), price: cat.basePrice }));
      }
    }
    setFormError('');
  };

  const handleCreateCourse = () => {
    if (!form.title.trim()) {
      setFormError('请输入课程标题');
      return;
    }
    if (form.startTime >= form.endTime) {
      setFormError('结束时间必须晚于开始时间');
      return;
    }
    if (conflict) {
      setFormError('该时段存在课程冲突');
      return;
    }
    const result = createCourse({
      categoryId: form.categoryId,
      title: form.title,
      date: form.date,
      startTime: form.startTime,
      endTime: form.endTime,
      capacity: form.capacity,
      price: form.price,
      description: form.description,
    });
    if (result) {
      setShowCreateModal(false);
      setForm({
        categoryId: categories[0]?.id ?? '',
        title: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        endTime: '10:00',
        capacity: 15,
        price: categories[0]?.basePrice ?? 100,
        description: '',
      });
      setConflict(false);
      setFormError('');
    }
  };

  const openCheckIn = (course: Course) => {
    const courseBookings = bookings.filter(
      (b) => b.courseId === course.id && b.status === 'booked'
    );
    const attendances: Record<string, boolean> = {};
    courseBookings.forEach((b) => {
      attendances[b.id] = b.attendance ?? false;
    });
    setShowCheckInModal({ course, attendances });
  };

  const handleCheckIn = () => {
    if (!showCheckInModal) return;
    const attendanceList = Object.entries(showCheckInModal.attendances).map(
      ([bookingId, present]) => ({
        bookingId,
        present,
      })
    );
    checkIn(showCheckInModal.course.id, attendanceList);
    setShowCheckInModal(null);
  };

  const getCourseBookings = (courseId: string): Booking[] => {
    return bookings.filter((b) => b.courseId === courseId);
  };

  const getMemberName = (memberId: string): string => {
    const users = useAuthStore.getState().users;
    const user = users.find((u) => u.id === memberId);
    return user?.name ?? memberId;
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color ?? '#FF5E1A';
  };

  const getCoursesForDay = (day: Date) => {
    return coachCourses.filter((c) => isSameDay(parseISO(c.date), day));
  };

  const courseBookingsCount = (course: Course) => {
    return getCourseBookings(course.id).filter((b) => b.status === 'booked').length;
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient">教练工作台</h1>
            <p className="text-muted mt-1">管理课程安排与学员出勤</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors shadow-glow"
          >
            <Plus size={18} />
            创建课程
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">本周课程</p>
                <p className="text-3xl font-display font-bold mt-1">
                  {coachCourses.filter((c) => {
                    const d = parseISO(c.date);
                    return d >= weekStart && d <= endOfWeek(weekStart, { weekStartsOn: 1 });
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent-soft flex items-center justify-center">
                <CalendarDays className="text-accent" size={22} />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">已完成课程</p>
                <p className="text-3xl font-display font-bold mt-1">
                  {coachCourses.filter((c) => c.status === 'completed').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/15 flex items-center justify-center">
                <Check className="text-success" size={22} />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">进行中</p>
                <p className="text-3xl font-display font-bold mt-1">
                  {coachCourses.filter((c) => c.status === 'ongoing').length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-info/15 flex items-center justify-center">
                <Activity className="text-info" size={22} />
              </div>
            </div>
          </div>
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted text-sm">今日学员</p>
                <p className="text-3xl font-display font-bold mt-1">
                  {coachCourses
                    .filter((c) => isSameDay(parseISO(c.date), new Date()))
                    .reduce((sum, c) => sum + courseBookingsCount(c), 0)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple/15 flex items-center justify-center">
                <Users className="text-purple" size={22} />
              </div>
            </div>
          </div>
        </div>

        <div className="glass rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="text-accent" size={20} />
              <h2 className="text-xl font-display font-semibold">周视图课程安排</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setWeekStart((d) => addDays(d, -7))}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm text-muted px-2">
                {format(weekStart, 'MM月dd日')} -{' '}
                {format(endOfWeek(weekStart, { weekStartsOn: 1 }), 'MM月dd日')}
              </span>
              <button
                onClick={() => setWeekStart((d) => addDays(d, 7))}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="py-2 text-center text-xs text-muted">时间</div>
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'py-2 text-center rounded-lg',
                      isSameDay(day, new Date()) && 'bg-accent-soft'
                    )}
                  >
                    <p className="text-xs text-muted">
                      {['一', '二', '三', '四', '五', '六', '日'][day.getDay() === 0 ? 6 : day.getDay() - 1]}
                    </p>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        isSameDay(day, new Date()) && 'text-accent'
                      )}
                    >
                      {format(day, 'dd')}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-1">
                <div className="space-y-1">
                  {timeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="h-16 text-xs text-muted text-right pr-2 pt-1"
                    >
                      {slot}
                    </div>
                  ))}
                </div>
                {weekDays.map((day) => (
                  <div key={day.toISOString()} className="relative space-y-1">
                    {timeSlots.map((slot) => (
                      <div
                        key={slot}
                        className="h-16 border-t border-border/30 relative"
                      />
                    ))}
                    {getCoursesForDay(day).map((course) => {
                      const [startH, startM] = course.startTime.split(':').map(Number);
                      const [endH, endM] = course.endTime.split(':').map(Number);
                      const top = ((startH - 6) * 60 + startM) * (64 / 60);
                      const height = (endH - startH) * 60 + (endM - startM);
                      const color = getCategoryColor(course.categoryId);
                      const Icon = getCategoryIcon(
                        categories.find((c) => c.id === course.categoryId)?.icon ?? 'activity'
                      );
                      const upcoming = isWithin30Minutes(course);
                      return (
                        <div
                          key={course.id}
                          onClick={() => setSelectedCourse(course)}
                          className="absolute left-1 right-1 rounded-lg p-2 cursor-pointer hover:opacity-90 transition-all hover:scale-[1.02]"
                          style={{
                            top: `${top}px`,
                            height: `${(height * 64) / 60 - 4}px`,
                            backgroundColor: `${color}22`,
                            borderLeft: `3px solid ${color}`,
                          }}
                        >
                          <div className="flex items-start gap-1 h-full">
                            <Icon size={14} style={{ color }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold truncate">
                                {course.title}
                              </p>
                              <p className="text-[10px] text-muted truncate">
                                {course.startTime}-{course.endTime}
                              </p>
                              <p className="text-[10px] text-muted">
                                {courseBookingsCount(course)}/{course.capacity}人
                              </p>
                            </div>
                            {upcoming && (
                              <Bell
                                size={12}
                                className="text-accent animate-pulse-soft shrink-0"
                              />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">创建新课程</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormError('');
                  setConflict(false);
                }}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted block mb-2">课程分类</label>
                <select
                  value={form.categoryId}
                  onChange={(e) => handleFormChange('categoryId', e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-muted block mb-2">课程标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => handleFormChange('title', e.target.value)}
                  placeholder="输入课程标题"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-sm text-muted block mb-2">上课日期</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => handleFormChange('date', e.target.value)}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-2">开始时间</label>
                  <input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => handleFormChange('startTime', e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-2">结束时间</label>
                  <input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => handleFormChange('endTime', e.target.value)}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted block mb-2">容量 (人)</label>
                  <input
                    type="number"
                    min={1}
                    value={form.capacity}
                    onChange={(e) => handleFormChange('capacity', Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-sm text-muted block mb-2">价格 (¥)</label>
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) => handleFormChange('price', Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-muted block mb-2">课程描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => handleFormChange('description', e.target.value)}
                  placeholder="可选，描述课程内容"
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent resize-none"
                />
              </div>

              {conflict && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  <AlertTriangle size={16} />
                  <span>该时段与已有课程时间冲突</span>
                </div>
              )}
              {formError && (
                <div className="flex items-center gap-2 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  <AlertTriangle size={16} />
                  <span>{formError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setFormError('');
                  setConflict(false);
                }}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateCourse}
                disabled={conflict}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                创建课程
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedCourse && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">{selectedCourse.title}</h3>
              <button
                onClick={() => setSelectedCourse(null)}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-muted">
                <Calendar size={16} />
                <span>{selectedCourse.date}</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <Clock size={16} />
                <span>
                  {selectedCourse.startTime} - {selectedCourse.endTime}
                </span>
                {isWithin30Minutes(selectedCourse) && (
                  <span className="ml-auto flex items-center gap-1 text-accent text-sm animate-pulse-soft">
                    <Bell size={14} />
                    即将开始
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-muted">
                <Users size={16} />
                <span>
                  {courseBookingsCount(selectedCourse)}/{selectedCourse.capacity} 人已预约
                </span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <MapPin size={16} />
                <span>FitPro 旗舰店</span>
              </div>
              <div className="flex items-center gap-3 text-muted">
                <span className="text-lg font-semibold text-foreground">
                  ¥{selectedCourse.price}
                </span>
              </div>
              {selectedCourse.description && (
                <p className="text-sm text-muted pt-2 border-t border-border">
                  {selectedCourse.description}
                </p>
              )}

              <div className="pt-4 border-t border-border">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <ListChecks size={16} className="text-accent" />
                  学员名单
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {getCourseBookings(selectedCourse.id)
                    .filter((b) => b.status === 'booked')
                    .map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between p-3 bg-surfaceAlt/50 rounded-lg"
                      >
                        <span>{getMemberName(b.memberId)}</span>
                        {b.attendance === true && (
                          <span className="text-success text-xs bg-success/15 px-2 py-0.5 rounded">
                            已出勤
                          </span>
                        )}
                        {b.attendance === false && (
                          <span className="text-danger text-xs bg-danger/15 px-2 py-0.5 rounded">
                            未出勤
                          </span>
                        )}
                      </div>
                    ))}
                  {getCourseBookings(selectedCourse.id).filter((b) => b.status === 'booked')
                    .length === 0 && (
                    <p className="text-muted text-sm text-center py-4">暂无学员预约</p>
                  )}
                </div>
              </div>
            </div>

            {(selectedCourse.status === 'scheduled' || selectedCourse.status === 'ongoing') && (
              <button
                onClick={() => {
                  openCheckIn(selectedCourse);
                  setSelectedCourse(null);
                }}
                className="w-full mt-6 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                学员出勤打卡
              </button>
            )}
          </div>
        </div>
      )}

      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">出勤打卡</h3>
              <button
                onClick={() => setShowCheckInModal(null)}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-muted mb-4">{showCheckInModal.course.title}</p>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {Object.keys(showCheckInModal.attendances).length === 0 ? (
                <p className="text-muted text-center py-8">暂无预约学员</p>
              ) : (
                getCourseBookings(showCheckInModal.course.id)
                  .filter((b) => b.status === 'booked')
                  .map((booking) => {
                    const bookingId = booking.id;
                    return (
                      <div
                        key={bookingId}
                        className="flex items-center justify-between p-3 bg-surfaceAlt/50 rounded-lg"
                      >
                        <span>{getMemberName(booking.memberId)}</span>
                        <button
                          onClick={() =>
                            setShowCheckInModal((prev) => {
                              if (!prev) return prev;
                              return {
                                ...prev,
                                attendances: {
                                  ...prev.attendances,
                                  [bookingId]: !prev.attendances[bookingId],
                                },
                              };
                            })
                          }
                          className={cn(
                            'w-8 h-8 rounded-lg flex items-center justify-center transition-all',
                            showCheckInModal.attendances[bookingId]
                              ? 'bg-success text-white'
                              : 'bg-surface border border-border hover:border-success'
                          )}
                        >
                          {showCheckInModal.attendances[bookingId] && <Check size={16} />}
                        </button>
                      </div>
                    );
                  })
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCheckInModal(null)}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCheckIn}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
              >
                确认打卡
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
