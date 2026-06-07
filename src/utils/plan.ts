import {
  TrainingGoal,
  TrainingPlan,
  TrainingWeek,
  TrainingDay,
  TrainingExercise,
  DietPlan,
  DietMeal,
  MemberBodyData,
} from '../types';
import { calculateBMR, calculateTDEE } from './bmi';

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

const exerciseTemplates: Record<TrainingGoal, Record<string, TrainingExercise[]>> = {
  lose_fat: {
    '全身有氧': [
      { name: '跑步机慢跑', sets: 1, reps: '30分钟', rest: '-' },
      { name: '开合跳', sets: 4, reps: '30次', rest: '30秒' },
      { name: '高抬腿', sets: 4, reps: '20次', rest: '30秒' },
      { name: '波比跳', sets: 3, reps: '15次', rest: '45秒' },
      { name: '跳绳', sets: 1, reps: '15分钟', rest: '-' },
    ],
    '上肢力量': [
      { name: '俯卧撑', sets: 4, reps: '15次', rest: '45秒' },
      { name: '哑铃推胸', sets: 4, reps: '12次', rest: '60秒' },
      { name: '哑铃划船', sets: 4, reps: '12次', rest: '60秒' },
      { name: '哑铃肩推', sets: 3, reps: '12次', rest: '45秒' },
      { name: '平板支撑', sets: 3, reps: '45秒', rest: '30秒' },
    ],
    '下肢力量': [
      { name: '深蹲', sets: 4, reps: '15次', rest: '60秒' },
      { name: '箭步蹲', sets: 4, reps: '每侧12次', rest: '45秒' },
      { name: '硬拉', sets: 4, reps: '12次', rest: '60秒' },
      { name: '腿举', sets: 3, reps: '15次', rest: '45秒' },
      { name: '小腿提踵', sets: 4, reps: '20次', rest: '30秒' },
    ],
    'HIIT燃脂': [
      { name: '登山跑', sets: 4, reps: '30秒', rest: '30秒' },
      { name: '深蹲跳', sets: 4, reps: '15次', rest: '30秒' },
      { name: '俯卧撑跳', sets: 3, reps: '12次', rest: '45秒' },
      { name: '战绳', sets: 4, reps: '30秒', rest: '30秒' },
      { name: '椭圆机', sets: 1, reps: '20分钟', rest: '-' },
    ],
    '核心训练': [
      { name: '卷腹', sets: 4, reps: '20次', rest: '30秒' },
      { name: '俄罗斯转体', sets: 4, reps: '每侧15次', rest: '30秒' },
      { name: '仰卧举腿', sets: 3, reps: '15次', rest: '30秒' },
      { name: '侧平板支撑', sets: 3, reps: '每侧30秒', rest: '30秒' },
      { name: '死虫式', sets: 3, reps: '每侧10次', rest: '30秒' },
    ],
  },
  muscle_gain: {
    '胸部训练': [
      { name: '平板卧推', sets: 4, reps: '10次', rest: '90秒' },
      { name: '上斜哑铃推举', sets: 4, reps: '12次', rest: '90秒' },
      { name: '双杠臂屈伸', sets: 3, reps: '力竭', rest: '60秒' },
      { name: '龙门架夹胸', sets: 3, reps: '15次', rest: '60秒' },
      { name: '俯卧撑', sets: 3, reps: '20次', rest: '45秒' },
    ],
    '背部训练': [
      { name: '引体向上', sets: 4, reps: '力竭', rest: '90秒' },
      { name: '杠铃划船', sets: 4, reps: '10次', rest: '90秒' },
      { name: '坐姿划船', sets: 4, reps: '12次', rest: '60秒' },
      { name: '高位下拉', sets: 4, reps: '12次', rest: '60秒' },
      { name: '单臂哑铃划船', sets: 3, reps: '每侧12次', rest: '60秒' },
    ],
    '腿部训练': [
      { name: '杠铃深蹲', sets: 5, reps: '8次', rest: '120秒' },
      { name: '罗马尼亚硬拉', sets: 4, reps: '10次', rest: '90秒' },
      { name: '腿举', sets: 4, reps: '12次', rest: '90秒' },
      { name: '腿弯举', sets: 3, reps: '12次', rest: '60秒' },
      { name: '小腿提踵', sets: 4, reps: '20次', rest: '45秒' },
    ],
    '肩部训练': [
      { name: '杠铃推举', sets: 4, reps: '10次', rest: '90秒' },
      { name: '哑铃侧平举', sets: 4, reps: '15次', rest: '60秒' },
      { name: '哑铃前平举', sets: 3, reps: '12次', rest: '60秒' },
      { name: '蝴蝶机反向飞鸟', sets: 3, reps: '15次', rest: '45秒' },
      { name: '耸肩', sets: 3, reps: '15次', rest: '45秒' },
    ],
    '手臂训练': [
      { name: '杠铃弯举', sets: 4, reps: '12次', rest: '60秒' },
      { name: '哑铃交替弯举', sets: 3, reps: '每侧12次', rest: '45秒' },
      { name: '窄距卧推', sets: 4, reps: '10次', rest: '60秒' },
      { name: '绳索下压', sets: 4, reps: '15次', rest: '45秒' },
      { name: '锤式弯举', sets: 3, reps: '12次', rest: '45秒' },
    ],
  },
  shaping: {
    '臀腿塑形': [
      { name: '深蹲', sets: 4, reps: '15次', rest: '45秒' },
      { name: '臀桥', sets: 4, reps: '20次', rest: '30秒' },
      { name: '侧向弓步', sets: 3, reps: '每侧12次', rest: '45秒' },
      { name: '蚌式开合', sets: 3, reps: '每侧15次', rest: '30秒' },
      { name: '台阶登踏', sets: 3, reps: '每侧12次', rest: '45秒' },
    ],
    '核心塑形': [
      { name: '卷腹', sets: 4, reps: '25次', rest: '30秒' },
      { name: '平板支撑', sets: 4, reps: '60秒', rest: '30秒' },
      { name: '仰卧自行车', sets: 3, reps: '每侧20次', rest: '30秒' },
      { name: '侧卧卷腹', sets: 3, reps: '每侧15次', rest: '30秒' },
      { name: '超人式', sets: 3, reps: '15次', rest: '30秒' },
    ],
    '上肢塑形': [
      { name: '哑铃推举', sets: 3, reps: '15次', rest: '45秒' },
      { name: '哑铃侧平举', sets: 3, reps: '15次', rest: '30秒' },
      { name: '俯身哑铃飞鸟', sets: 3, reps: '15次', rest: '45秒' },
      { name: '弹力带拉伸', sets: 3, reps: '15次', rest: '30秒' },
      { name: '墙壁俯卧撑', sets: 3, reps: '20次', rest: '30秒' },
    ],
    '全身塑形': [
      { name: '开合跳', sets: 3, reps: '30秒', rest: '30秒' },
      { name: '深蹲跳', sets: 3, reps: '12次', rest: '30秒' },
      { name: '箭步蹲', sets: 3, reps: '每侧10次', rest: '30秒' },
      { name: '登山跑', sets: 3, reps: '30秒', rest: '30秒' },
      { name: '瑜伽拉伸', sets: 1, reps: '15分钟', rest: '-' },
    ],
    '柔韧拉伸': [
      { name: '下犬式', sets: 3, reps: '30秒', rest: '15秒' },
      { name: '战士一式', sets: 3, reps: '每侧30秒', rest: '15秒' },
      { name: '三角式', sets: 3, reps: '每侧30秒', rest: '15秒' },
      { name: '树式', sets: 3, reps: '每侧30秒', rest: '15秒' },
      { name: '婴儿式放松', sets: 1, reps: '2分钟', rest: '-' },
    ],
  },
  rehabilitation: {
    '颈椎康复': [
      { name: '颈部缓慢旋转', sets: 3, reps: '每侧5次', rest: '10秒' },
      { name: '颈部侧屈', sets: 3, reps: '每侧5次', rest: '10秒' },
      { name: '下颌微收', sets: 3, reps: '10秒保持', rest: '10秒' },
      { name: '肩胛后缩', sets: 3, reps: '10次', rest: '10秒' },
      { name: '热敷放松', sets: 1, reps: '10分钟', rest: '-' },
    ],
    '腰椎康复': [
      { name: '猫牛式', sets: 3, reps: '10次', rest: '10秒' },
      { name: '骨盆倾斜', sets: 3, reps: '10次', rest: '10秒' },
      { name: '鸟狗式', sets: 3, reps: '每侧5次', rest: '15秒' },
      { name: '膝盖抱胸', sets: 3, reps: '每侧15秒', rest: '10秒' },
      { name: '儿童式放松', sets: 2, reps: '30秒', rest: '-' },
    ],
    '肩部康复': [
      { name: '钟摆运动', sets: 3, reps: '每侧10次', rest: '10秒' },
      { name: '爬墙练习', sets: 3, reps: '10次', rest: '15秒' },
      { name: '弹力带外旋', sets: 3, reps: '10次', rest: '10秒' },
      { name: '肩部环绕', sets: 3, reps: '每侧5次', rest: '10秒' },
      { name: '交叉拉伸', sets: 2, reps: '每侧20秒', rest: '-' },
    ],
    '膝关节康复': [
      { name: '直腿抬高', sets: 3, reps: '每侧10次', rest: '10秒' },
      { name: '靠墙静蹲', sets: 3, reps: '20秒保持', rest: '15秒' },
      { name: '踝泵运动', sets: 3, reps: '15次', rest: '10秒' },
      { name: '股四头肌收缩', sets: 3, reps: '10次保持', rest: '10秒' },
      { name: '腘绳肌拉伸', sets: 2, reps: '每侧20秒', rest: '-' },
    ],
    '全身恢复': [
      { name: '深呼吸练习', sets: 5, reps: '10次', rest: '5秒' },
      { name: '全身扫描放松', sets: 1, reps: '10分钟', rest: '-' },
      { name: '温和散步', sets: 1, reps: '15分钟', rest: '-' },
      { name: '泡沫轴放松', sets: 1, reps: '10分钟', rest: '-' },
      { name: '冥想放松', sets: 1, reps: '10分钟', rest: '-' },
    ],
  },
};

const goalWeeklyFocus: Record<TrainingGoal, string[]> = {
  lose_fat: ['全身有氧', '上肢力量', 'HIIT燃脂', '下肢力量', '核心训练', '有氧恢复'],
  muscle_gain: ['胸部训练', '背部训练', '腿部训练', '肩部训练', '手臂训练', '主动恢复'],
  shaping: ['臀腿塑形', '核心塑形', '上肢塑形', '全身塑形', '柔韧拉伸', '轻量有氧'],
  rehabilitation: ['颈椎康复', '腰椎康复', '肩部康复', '膝关节康复', '全身恢复', '休息放松'],
};

function getWeeklySchedule(goal: TrainingGoal, week: number): TrainingDay[] {
  const focusList = goalWeeklyFocus[goal];
  const intensityMultiplier = 1 + (week - 1) * 0.1;

  return [
    { day: '周一', focus: focusList[0], exercises: exerciseTemplates[goal][focusList[0]] },
    { day: '周二', focus: focusList[1], exercises: exerciseTemplates[goal][focusList[1]] },
    { day: '周三', focus: '休息', exercises: [{ name: '充分休息或轻度拉伸', sets: 1, reps: '30分钟', rest: '-' }] },
    { day: '周四', focus: focusList[2], exercises: exerciseTemplates[goal][focusList[2]] },
    { day: '周五', focus: focusList[3], exercises: exerciseTemplates[goal][focusList[3]] },
    { day: '周六', focus: focusList[4], exercises: exerciseTemplates[goal][focusList[4]] },
    {
      day: '周日',
      focus: focusList[5] || '休息',
      exercises:
        focusList[5] && exerciseTemplates[goal][focusList[5]]
          ? exerciseTemplates[goal][focusList[5]]
          : [{ name: '充分休息', sets: 1, reps: '全天', rest: '-' }],
    },
  ].map(day => ({
    ...day,
    exercises: day.exercises.map(ex => ({
      ...ex,
      sets: Math.round(ex.sets * intensityMultiplier),
    })),
  }));
}

export function generateTrainingPlan(bodyData: MemberBodyData): TrainingPlan {
  const weeks: TrainingWeek[] = [1, 2, 3, 4].map(weekNum => ({
    week: weekNum,
    days: getWeeklySchedule(bodyData.goal, weekNum),
  }));

  return {
    id: generateId(),
    memberId: bodyData.memberId,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

const dietMealTemplates: Record<TrainingGoal, DietMeal[]> = {
  lose_fat: [
    {
      type: 'breakfast',
      name: '高蛋白减脂早餐',
      calories: 380,
      items: ['燕麦粥50g', '水煮蛋2个', '脱脂牛奶200ml', '蓝莓50g'],
    },
    {
      type: 'lunch',
      name: '低卡营养午餐',
      calories: 550,
      items: ['糙米饭100g', '鸡胸肉150g', '西兰花200g', '橄榄油拌沙拉'],
    },
    {
      type: 'dinner',
      name: '轻食减脂晚餐',
      calories: 420,
      items: ['清蒸鱼150g', '烤蔬菜200g', '藜麦50g', '蔬菜汤1碗'],
    },
    {
      type: 'snack',
      name: '健康加餐',
      calories: 150,
      items: ['希腊酸奶100g', '坚果15g', '苹果1个'],
    },
  ],
  muscle_gain: [
    {
      type: 'breakfast',
      name: '高蛋白增肌早餐',
      calories: 680,
      items: ['全麦面包2片', '煎蛋3个', '牛奶300ml', '香蕉1根', '花生酱2勺'],
    },
    {
      type: 'lunch',
      name: '能量午餐',
      calories: 850,
      items: ['糙米饭200g', '牛排200g', '混合蔬菜200g', '牛油果半个'],
    },
    {
      type: 'dinner',
      name: '增肌晚餐',
      calories: 720,
      items: ['三文鱼200g', '红薯150g', '芦笋150g', '鹰嘴豆沙拉'],
    },
    {
      type: 'snack',
      name: '增肌加餐',
      calories: 350,
      items: ['乳清蛋白粉1勺', '燕麦棒1根', '蓝莓100g'],
    },
  ],
  shaping: [
    {
      type: 'breakfast',
      name: '均衡营养早餐',
      calories: 450,
      items: ['燕麦50g', '水煮蛋2个', '低脂牛奶250ml', '草莓80g'],
    },
    {
      type: 'lunch',
      name: '塑形午餐',
      calories: 620,
      items: ['藜麦饭100g', '鸡胸肉150g', '烤蔬菜200g', '橄榄油拌菠菜'],
    },
    {
      type: 'dinner',
      name: '轻盈晚餐',
      calories: 480,
      items: ['虾仁150g', '蒸南瓜100g', '凉拌黄瓜', '紫菜蛋花汤'],
    },
    {
      type: 'snack',
      name: '塑形加餐',
      calories: 200,
      items: ['无糖酸奶150g', '杏仁15g', '猕猴桃1个'],
    },
  ],
  rehabilitation: [
    {
      type: 'breakfast',
      name: '温和营养早餐',
      calories: 420,
      items: ['小米粥1碗', '水煮蛋1个', '全麦面包1片', '温牛奶200ml'],
    },
    {
      type: 'lunch',
      name: '滋补午餐',
      calories: 580,
      items: ['软米饭100g', '清蒸鲈鱼150g', '炖南瓜150g', '青菜豆腐汤'],
    },
    {
      type: 'dinner',
      name: '养身晚餐',
      calories: 450,
      items: ['山药排骨汤', '蒸鸡脯肉120g', '清炒时蔬200g', '杂粮馒头1个'],
    },
    {
      type: 'snack',
      name: '养身加餐',
      calories: 180,
      items: ['温蜂蜜水1杯', '红枣5颗', '核桃2个'],
    },
  ],
};

const calorieAdjustment: Record<TrainingGoal, number> = {
  lose_fat: -400,
  muscle_gain: 500,
  shaping: 0,
  rehabilitation: 0,
};

const macroRatio: Record<TrainingGoal, { protein: number; carbs: number; fat: number }> = {
  lose_fat: { protein: 0.4, carbs: 0.35, fat: 0.25 },
  muscle_gain: { protein: 0.3, carbs: 0.5, fat: 0.2 },
  shaping: { protein: 0.3, carbs: 0.45, fat: 0.25 },
  rehabilitation: { protein: 0.25, carbs: 0.5, fat: 0.25 },
};

export function generatePlan(bodyData: MemberBodyData): { trainingPlan: TrainingPlan; dietPlan: DietPlan } {
  return {
    trainingPlan: generateTrainingPlan(bodyData),
    dietPlan: generateDietPlan(bodyData),
  };
}

export function generateDietPlan(bodyData: MemberBodyData): DietPlan {
  const bmr = calculateBMR(bodyData.height, bodyData.weight, bodyData.age, bodyData.gender);
  const tdee = calculateTDEE(bmr);
  const dailyCalories = tdee + calorieAdjustment[bodyData.goal];
  const ratio = macroRatio[bodyData.goal];

  const protein = Math.round((dailyCalories * ratio.protein) / 4);
  const carbs = Math.round((dailyCalories * ratio.carbs) / 4);
  const fat = Math.round((dailyCalories * ratio.fat) / 9);

  const meals = dietMealTemplates[bodyData.goal].map(meal => ({
    ...meal,
    calories: Math.round(meal.calories * (dailyCalories / 1500)),
  }));

  return {
    id: generateId(),
    memberId: bodyData.memberId,
    dailyCalories,
    protein,
    carbs,
    fat,
    meals,
  };
}
