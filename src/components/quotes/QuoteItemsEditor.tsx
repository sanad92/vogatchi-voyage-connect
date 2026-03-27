import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { QuoteItem } from '@/hooks/useQuotes';

const itemTypes = [
  { value: 'hotel', label: 'فندق' },
  { value: 'flight', label: 'طيران' },
  { value: 'transport', label: 'نقل' },
  { value: 'car_rental', label: 'تأجير سيارة' },
  { value: 'service', label: 'خدمة أخرى' },
];

interface Props {
  items: QuoteItem[];
  onChange: (items: QuoteItem[]) => void;
}

export default function QuoteItemsEditor({ items, onChange }: Props) {
  const addItem = () => {
    onChange([
      ...items,
      {
        item_type: 'hotel',
        description: '',
        cost_price: 0,
        selling_price: 0,
        quantity: 1,
        total_cost: 0,
        total_selling: 0,
      },
    ]);
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, field: string, value: any) => {
    const updated = [...items];
    (updated[idx] as any)[field] = value;

    // Recalculate totals
    const item = updated[idx];
    item.total_cost = item.cost_price * item.quantity;
    item.total_selling = item.selling_price * item.quantity;

    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-semibold">عناصر العرض</Label>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="h-4 w-4 ml-1" />
          إضافة عنصر
        </Button>
      </div>

      {items.length === 0 && (
        <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
          لا توجد عناصر. اضغط "إضافة عنصر" للبدء.
        </div>
      )}

      {items.map((item, idx) => (
        <div key={idx} className="border rounded-lg p-4 space-y-3 bg-card">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">عنصر {idx + 1}</span>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(idx)} className="text-destructive h-8 w-8">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">النوع</Label>
              <Select value={item.item_type} onValueChange={(v) => updateItem(idx, 'item_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {itemTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 lg:col-span-3">
              <Label className="text-xs">الوصف</Label>
              <Input
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                placeholder="وصف العنصر..."
              />
            </div>

            <div>
              <Label className="text-xs">سعر التكلفة</Label>
              <Input
                type="number"
                min={0}
                value={item.cost_price}
                onChange={(e) => updateItem(idx, 'cost_price', Number(e.target.value))}
              />
            </div>

            <div>
              <Label className="text-xs">سعر البيع</Label>
              <Input
                type="number"
                min={0}
                value={item.selling_price}
                onChange={(e) => updateItem(idx, 'selling_price', Number(e.target.value))}
              />
            </div>

            <div>
              <Label className="text-xs">الكمية</Label>
              <Input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => updateItem(idx, 'quantity', Math.max(1, Number(e.target.value)))}
              />
            </div>

            <div className="flex items-end gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">إجمالي التكلفة: </span>
                <span className="font-semibold">{item.total_cost.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-muted-foreground">إجمالي البيع: </span>
                <span className="font-semibold text-primary">{item.total_selling.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {items.length > 0 && (
        <div className="flex justify-end gap-6 text-sm font-medium pt-2 border-t">
          <div>
            إجمالي التكلفة: <span className="text-destructive">{items.reduce((s, i) => s + i.total_cost, 0).toLocaleString()}</span>
          </div>
          <div>
            إجمالي البيع: <span className="text-primary">{items.reduce((s, i) => s + i.total_selling, 0).toLocaleString()}</span>
          </div>
          <div>
            الربح: <span className="text-green-600">{(items.reduce((s, i) => s + i.total_selling, 0) - items.reduce((s, i) => s + i.total_cost, 0)).toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
