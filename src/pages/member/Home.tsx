import { useMemo } from 'react';
import {
  Activity,
  Scale,
  Ruler,
  Flame,
  Calendar,
  Clock,
  User as UserIcon,
  Dumbbell,
  Bike,
  Flower2,
  Sparkles,
  TrendingUp,
  Apple,
  UtensilsCrossed,
  Coffee,
  Salad,
  ChevronRight,
  Target,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import { useMemberStore } from '@/store/memberStore';
import { useCoachStore } from '@/store/coachStore';
import { useManagerStore } from '@/store/managerStore';
import type { Course, CourseCategory } from '@/types';
import { cn } from '@/lib/utils';
import { mockUsers } from '@/utils/mockData';
import { getLevelName } from '@/utils/price';
import { parseISO, isToday, isAfter, format } from 'date-fns';

const iconMap: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  bike: Bike,
  flower2: Flower2,
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
  sparkles: Sparkles,
};

function getCategoryIcon(categoryId: string, categories: CourseCategory[]) {
  const cat = categories.find((c) => c.id === categoryId);
  if (cat && iconMap[cat.icon]) return iconMap[cat.icon];
  return Activity;
}

const weightTrendData = [
  { date: '第1周', weight: 72 },
  { date: '第2周', weight: 71.5 },
  { date: '第3周', weight: 71 },
  { date: '第4周', weight: 70.2 },
  { date: '第5周', weight: 69.8 },
  { date: '第6周', weight: 69.3 },
];

const trainingProgressData = [
  { name: '已完成', value: 68 },
  { name: '剩余', value: 32 },
];

const COLORS = ['#FF5E1A', '#333333'];

export default function Home() {
  const currentUser = useAuthStore((s) => s.currentUser);
  const { bodyData, dietPlan, bookings, trainingPlan } = useMemberStore();
  const { courses } = useCoachStore();
  const { categories } = useManagerStore();

  const memberLevel = currentUser?.memberLevel || currentUser?.level || 'normal';

  const coaches = useMemo(() => mockUsers.filter((u) => u.role === 'coach'), []);

  const sampleBodyData = useMemo(() => {
    if (bodyData) return bodyData;
    return {
      height: 175,
      weight: 70,
      bodyFat: 18,
      bmi: 22.9,
      bmr: 1680,
    };
  }, [bodyData]);

  const upcomingBookings = useMemo(() => {
    if (!currentUser) return [];
    const myBookings = bookings.filter(
      (b) => b.memberId === currentUser.id && b.status === 'booked'
    );
    const now = new Date();
    return myBookings
      .map((b) => {
        const course = courses.find((c) => c.id === b.courseId);
        return course ? { booking: b, course } : null;
      })
      .filter((item): item is { booking: typeof bookings[0]; course: Course } => item !== null)
      .filter(({ course }) => {
        const courseDate = parseISO(course.date);
        return isAfter(courseDate, now) || isToday(courseDate);
      })
      .sort((a, b) => (a.course.date + a.course.startTime).localeCompare(b.course.date + b.course.startTime))
      .slice(0, 3);
  }, [bookings, courses, currentUser]);

  const sampleDietPlan = useMemo(() => {
    if (dietPlan) return dietPlan;
    return {
      dailyCalories: 2100,
      protein: 150,
      carbs: 210,
      fat: 70,
      meals: [
        { type: 'breakfast' as const, name: '高蛋白减脂早餐', calories: 420, items: ['燕麦粥50g', '水煮蛋2个', '脱脂牛奶200ml'] },
        { type: 'lunch' as const, name: '低卡营养午餐', calories: 650, items: ['糙米饭100g', '鸡胸肉150g', '西兰花200g'] },
        { type: 'dinner' as const, name: '轻食减脂晚餐', calories: 520, items: ['清蒸鱼150g', '烤蔬菜200g', '藜麦50g'] },
        { type: 'snack' as const, name: '健康加餐', calories: 180, items: ['希腊酸奶100g', '坚果15g', '苹果1个'] },
      ],
    };
  }, [dietPlan]);

  const completedTrainingSessions = useMemo(() => {
    if (!currentUser) return 0;
    return bookings.filter(
      (b) => b.memberId === currentUser.id && b.status === 'completed'
    ).length;
  }, [bookings, currentUser]);

  const mealIcons: Record<string, React.ComponentType<{ className?: string }>> = {
    breakfast: Coffee,
    lunch: UtensilsCrossed,
    dinner: Salad,
    snack: Apple,
  };

  const mealLabels: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '加餐',
  };

  const getCoachName = (coachId: string) => {
    return coaches.find((c) => c.id === coachId)?.name || '未知教练';
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    if (dateStr === format(today, 'yyyy-MM-dd')) return '今天';
    if (dateStr === format(tomorrow, 'yyyy-MM-dd')) return '明天';
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  const bmiStatus = useMemo(() => {
    const bmi = sampleBodyData.bmi;
    if (bmi < 18.5) return { label: '偏瘦', color: 'text-info' };
    if (bmi < 24) return { label: '正常', color: 'text-success' };
    if (bmi < 28) return { label: '偏胖', color: 'text-warning' };
    return { label: '肥胖', color: 'text-danger' };
  }, [sampleBodyData.bmi]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-bold font-display mb-1">
            你好，{currentUser?.name || '会员'} 👋
          </h1>
          <p className="text-muted text-sm">
            {getLevelName(memberLevel)}专享，坚持训练，遇见更好的自己
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-purple flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
                <Scale className="w-5 h-5 text-accent" />
              </div>
              <span className="text-sm text-muted">体重</span>
            </div>
            <TrendingUp className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{sampleBodyData.weight}</span>
            <span className="text-sm text-muted">kg</span>
          </div>
          <div className="mt-2 text-xs text-muted">目标：65kg</div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-info/15 flex items-center justify-center">
              <Ruler className="w-5 h-5 text-info" />
            </div>
            <span className="text-sm text-muted">身高</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{sampleBodyData.height}</span>
            <span className="text-sm text-muted">cm</span>
          </div>
          <div className="mt-2 text-xs text-muted">BMI: <span className={cn('text-sm', bmiStatus.color)}>{bmiStatus.label}</span></div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple/15 flex items-center justify-center">
              <Activity className="w-5 h-5 text-purple" />
            </div>
            <span className="text-sm text-muted">体脂率</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{sampleBodyData.bodyFat}</span>
            <span className="text-sm text-muted">%</span>
          </div>
          <div className="mt-2 text-xs text-muted">健康范围：15-20%</div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-success/15 flex items-center justify-center">
              <Flame className="w-5 h-5 text-success" />
            </div>
            <span className="text-sm text-muted">基础代谢</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold">{sampleBodyData.bmr}</span>
            <span className="text-sm text-muted">kcal</span>
          </div>
          <div className="mt-2 text-xs text-muted">每日能量消耗</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">体重变化趋势</h2>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={weightTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="date" stroke="#888" fontSize={12} />
                <YAxis stroke="#888" fontSize={12} domain={[65, 75]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E1E1E',
                    border: '1px solid #333',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#F5F5F5' }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#FF5E1A"
                  strokeWidth={3}
                  dot={{ fill: '#FF5E1A', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, fill: '#FF5E1A' }}
                  name="体重(kg)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">训练完成进度</h2>
          </div>
          <div className="relative h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trainingProgressData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                >
                  {trainingProgressData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-gradient">{completedTrainingSessions || 17}</span>
              <span className="text-xs text-muted">已完成节</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF5E1A' }} />
              <span className="text-muted">已完成</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#333' }} />
              <span className="text-muted">待完成</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">即将开始的课程</h2>
          </div>
          <button className="text-sm text-accent flex items-center gap-1 hover:underline">
            查看全部 <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {upcomingBookings.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar className="w-12 h-12 mx-auto text-muted opacity-40 mb-3" />
            <p className="text-muted">暂无即将开始的课程</p>
            <p className="text-xs text-muted mt-1">去预约页面挑选喜欢的课程吧</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingBookings.map(({ booking, course }) => {
              const category = categories.find((c) => c.id === course.categoryId);
              const CategoryIcon = getCategoryIcon(course.categoryId, categories);
              return (
                <div
                  key={booking.id}
                  className="bg-surfaceAlt rounded-2xl p-4 border border-border hover:border-accent/40 transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${category?.color || '#FF5E1A'}20` }}
                    >
                      <CategoryIcon
                        className="w-5 h-5"
                        style={{ color: category?.color || '#FF5E1A' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{course.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formatDateLabel(course.date)} {course.date.slice(5)}</span>
                        <Clock className="w-3.5 h-3.5 ml-1" />
                        <span>{course.startTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted">
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>{getCoachName(course.coachId)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Apple className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">今日饮食建议</h2>
          </div>
          <div className="text-sm text-muted">
            目标摄入 <span className="text-accent font-semibold">{sampleDietPlan.dailyCalories}</span> kcal
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-surfaceAlt rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center">
                <Flame className="w-4 h-4 text-accent" />
              </div>
              <span className="text-xs text-muted">蛋白质</span>
            </div>
            <p className="text-xl font-bold">{sampleDietPlan.protein}g</p>
            <div className="h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-accent" style={{ width: '70%' }} />
            </div>
          </div>
          <div className="bg-surfaceAlt rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-info/15 flex items-center justify-center">
                <Activity className="w-4 h-4 text-info" />
              </div>
              <span className="text-xs text-muted">碳水</span>
            </div>
            <p className="text-xl font-bold">{sampleDietPlan.carbs}g</p>
            <div className="h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-info" style={{ width: '60%' }} />
            </div>
          </div>
          <div className="bg-surfaceAlt rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple/15 flex items-center justify-center">
                <Target className="w-4 h-4 text-purple" />
              </div>
              <span className="text-xs text-muted">脂肪</span>
            </div>
            <p className="text-xl font-bold">{sampleDietPlan.fat}g</p>
            <div className="h-1.5 bg-surface rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-purple" style={{ width: '45%' }} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sampleDietPlan.meals.map((meal, idx) => {
            const MealIcon = mealIcons[meal.type] || Apple;
            return (
              <div key={idx} className="bg-surfaceAlt rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-success/15 flex items-center justify-center">
                      <MealIcon className="w-4 h-4 text-success" />
                    </div>
                    <span className="font-medium text-sm">{mealLabels[meal.type]}</span>
                  </div>
                  <span className="text-xs text-muted">{meal.calories} kcal</span>
                </div>
                <p className="text-sm font-semibold mb-2">{meal.name}</p>
                <div className="flex flex-wrap gap-1.5">
                  {meal.items.map((item, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-1 rounded-lg bg-surface text-muted"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {trainingPlan && trainingPlan.weeks.length > 0 && (
        <div className="bg-surface rounded-2xl p-5 shadow-card border border-border">
          <div className="flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">本周训练计划</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
            {trainingPlan.weeks[0].days.map((day, idx) => (
              <div
                key={idx} className="bg-surfaceAlt rounded-xl p-3 text-center"
              >
                <p className="text-sm font-semibold mb-1">{day.day}</p>
                <p className="text-xs text-accent mb-2">{day.focus}</p>
                <p className="text-[10px] text-muted">{day.exercises.length} 个动作
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
