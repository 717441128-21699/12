import { useState, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Layers,
  Tag,
  Crown,
  Percent,
  CalendarRange,
  Save,
  AlertTriangle,
  Dumbbell,
  Bike,
  Flame,
  Flower2,
  Activity,
  Sparkles,
} from 'lucide-react';
import { useManagerStore } from '@/store/managerStore';
import { cn } from '@/lib/utils';
import type { CourseCategory, PricingRule, MemberLevel } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  bike: Bike,
  flower2: Flower2,
  dumbbell: Dumbbell,
  flame: Flame,
  activity: Activity,
  sparkles: Sparkles,
};

const levelInfo: Record<MemberLevel, { name: string; icon: React.ComponentType<{ className?: string; size?: number | string; style?: React.CSSProperties }>; color: string }> = {
  normal: { name: '普通会员', icon: Layers, color: '#888888' },
  silver: { name: '白银会员', icon: Layers, color: '#C0C0C0' },
  gold: { name: '黄金会员', icon: Crown, color: '#FFD700' },
  diamond: { name: '钻石会员', icon: Crown, color: '#B9F2FF' },
};

const availableIcons = [
  { key: 'bike', Icon: Bike },
  { key: 'flower2', Icon: Flower2 },
  { key: 'dumbbell', Icon: Dumbbell },
  { key: 'flame', Icon: Flame },
  { key: 'activity', Icon: Activity },
  { key: 'sparkles', Icon: Sparkles },
];

const colorOptions = [
  '#FF5E1A',
  '#00C48C',
  '#3B82F6',
  '#FF4757',
  '#A855F7',
  '#06B6D4',
];

export default function ManagerCourses() {
  const { categories, pricingRules, upsertCategory, deleteCategory, updatePricingRules } = useManagerStore();

  const [activeTab, setActiveTab] = useState<'categories' | 'pricing'>('categories');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'activity',
    description: '',
    basePrice: 100,
    color: '#FF5E1A',
  });

  const [localPricingRules, setLocalPricingRules] = useState<PricingRule[]>(pricingRules);
  const [pricingDirty, setPricingDirty] = useState(false);

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      icon: 'activity',
      description: '',
      basePrice: 100,
      color: '#FF5E1A',
    });
    setEditingCategory(null);
  };

  const openCreateCategory = () => {
    resetCategoryForm();
    setShowCategoryModal(true);
  };

  const openEditCategory = (cat: CourseCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      icon: cat.icon,
      description: cat.description,
      basePrice: cat.basePrice,
      color: cat.color,
    });
    setShowCategoryModal(true);
  };

  const handleSaveCategory = () => {
    if (!categoryForm.name.trim()) return;
    upsertCategory({
      id: editingCategory?.id,
      name: categoryForm.name.trim(),
      icon: categoryForm.icon,
      description: categoryForm.description.trim(),
      basePrice: categoryForm.basePrice,
      color: categoryForm.color,
    });
    setShowCategoryModal(false);
    resetCategoryForm();
  };

  const handleDeleteCategory = (id: string) => {
    deleteCategory(id);
    setShowDeleteConfirm(null);
  };

  const handlePricingChange = (level: MemberLevel, field: keyof PricingRule, value: number) => {
    setLocalPricingRules((prev) =>
      prev.map((rule) =>
        rule.level === level ? { ...rule, [field]: value } : rule
      )
    );
    setPricingDirty(true);
  };

  const handleSavePricing = () => {
    updatePricingRules(localPricingRules);
    setPricingDirty(false);
  };

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.basePrice - b.basePrice),
    [categories]
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold text-gradient">课程与收费管理</h1>
            <p className="text-muted mt-1">管理课程分类与会员价格体系</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('categories')}
            className={cn(
              'px-5 py-3 font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'categories'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <Layers size={16} />
              课程分类
            </span>
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={cn(
              'px-5 py-3 font-medium transition-colors border-b-2 -mb-px',
              activeTab === 'pricing'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-foreground'
            )}
          >
            <span className="flex items-center gap-2">
              <Tag size={16} />
              价格与折扣
            </span>
          </button>
        </div>

        {activeTab === 'categories' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreateCategory}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors shadow-glow"
              >
                <Plus size={18} />
                新增分类
              </button>
            </div>

            <div className="glass rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-surfaceAlt/50">
                    <th className="text-left py-4 px-6 text-sm font-medium text-muted">分类</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-muted">图标</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-muted">描述</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-muted">基础价格</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-muted">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCategories.map((cat) => {
                    const Icon = iconMap[cat.icon] || Activity;
                    return (
                      <tr
                        key={cat.id}
                        className="border-b border-border/50 hover:bg-surfaceAlt/30 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${cat.color}22` }}
                            >
                              <Icon size={18} style={{ color: cat.color }} />
                            </div>
                            <span className="font-medium">{cat.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-muted text-sm">{cat.icon}</td>
                        <td className="py-4 px-6 text-muted text-sm max-w-xs truncate">
                          {cat.description || '-'}
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-semibold text-accent">¥{cat.basePrice}</span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditCategory(cat)}
                              className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors text-muted hover:text-info"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(cat.id)}
                              className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors text-muted hover:text-danger"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedCategories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-16 text-center text-muted">
                        暂无课程分类
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={handleSavePricing}
                disabled={!pricingDirty}
                className="flex items-center gap-2 px-5 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors shadow-glow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save size={18} />
                保存修改
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {localPricingRules.map((rule) => {
                const info = levelInfo[rule.level];
                const LevelIcon = info.icon;
                const discountPct = Math.round(rule.discountRate * 100);
                return (
                  <div
                    key={rule.level}
                    className="glass rounded-2xl p-6 relative overflow-hidden"
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-1"
                      style={{ backgroundColor: info.color }}
                    />
                    <div className="flex items-center gap-3 mb-6">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${info.color}22` }}
                      >
                        <LevelIcon size={22} style={{ color: info.color }} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-lg">{info.name}</h3>
                        <p className="text-xs text-muted">等级代码: {rule.level}</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-muted block mb-1.5 flex items-center gap-1">
                          <Percent size={12} />
                          折扣率 ({discountPct}%)
                        </label>
                        <input
                          type="range"
                          min={50}
                          max={100}
                          value={discountPct}
                          onChange={(e) =>
                            handlePricingChange(rule.level, 'discountRate', Number(e.target.value) / 100)
                          }
                          className="w-full accent-accent"
                        />
                        <div className="flex justify-between text-xs text-muted mt-1">
                          <span>5折</span>
                          <span>原价</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1.5">单次课价格 (¥)</label>
                        <input
                          type="number"
                          min={0}
                          value={rule.singlePrice}
                          onChange={(e) =>
                            handlePricingChange(rule.level, 'singlePrice', Number(e.target.value))
                          }
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1.5 flex items-center gap-1">
                          <CalendarRange size={12} />
                          月卡价格 (¥)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={rule.monthlyPrice}
                          onChange={(e) =>
                            handlePricingChange(rule.level, 'monthlyPrice', Number(e.target.value))
                          }
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1.5 flex items-center gap-1">
                          <CalendarRange size={12} />
                          季卡价格 (¥)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={rule.quarterlyPrice}
                          onChange={(e) =>
                            handlePricingChange(rule.level, 'quarterlyPrice', Number(e.target.value))
                          }
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-muted block mb-1.5 flex items-center gap-1">
                          <Crown size={12} />
                          年卡价格 (¥)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={rule.yearlyPrice}
                          onChange={(e) =>
                            handlePricingChange(rule.level, 'yearlyPrice', Number(e.target.value))
                          }
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent text-sm"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-lg animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-display font-bold">
                {editingCategory ? '编辑分类' : '新增课程分类'}
              </h3>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="p-2 hover:bg-surfaceAlt rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted block mb-2">分类名称</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="例如：动感单车"
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">选择图标</label>
                <div className="flex flex-wrap gap-2">
                  {availableIcons.map(({ key, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setCategoryForm((p) => ({ ...p, icon: key }))}
                      className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                        categoryForm.icon === key
                          ? 'bg-accent text-white'
                          : 'bg-surface border border-border hover:border-accent'
                      )}
                    >
                      <Icon size={20} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">主题颜色</label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setCategoryForm((p) => ({ ...p, color }))}
                      className={cn(
                        'w-10 h-10 rounded-lg transition-all',
                        categoryForm.color === color && 'ring-2 ring-offset-2 ring-offset-background ring-accent scale-110'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">基础价格 (¥)</label>
                <input
                  type="number"
                  min={0}
                  value={categoryForm.basePrice}
                  onChange={(e) =>
                    setCategoryForm((p) => ({ ...p, basePrice: Number(e.target.value) }))
                  }
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="text-sm text-muted block mb-2">分类描述</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="可选，描述该分类课程的特点"
                  rows={3}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategoryForm();
                }}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveCategory}
                disabled={!categoryForm.name.trim()}
                className="flex-1 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Check size={16} />
                {editingCategory ? '保存修改' : '创建分类'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-danger/15 flex items-center justify-center shrink-0">
                <AlertTriangle className="text-danger" size={22} />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold">确认删除</h3>
                <p className="text-sm text-muted">此操作不可撤销</p>
              </div>
            </div>
            <p className="text-foreground/80 mb-6">
              确定要删除该课程分类吗？删除后将无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-2.5 bg-surfaceAlt hover:bg-surface rounded-lg font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteCategory(showDeleteConfirm)}
                className="flex-1 py-2.5 bg-danger hover:bg-danger/80 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={16} />
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
