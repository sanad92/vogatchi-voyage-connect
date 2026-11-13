import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { ROOM, ROOM_SIZE } from './pilgrimage-documents';

type City = 'makkah' | 'madinah';
const CITIES: Record<City, string> = { makkah: 'مكة', madinah: 'المدينة' };
const GENDERS = { male: 'رجالي', female: 'حريمي' } as const;
const CITY_KEYS = ['makkah', 'madinah'] as const;
type Passenger = {
  id: string;
  full_name: string;
  gender: string | null;
  room_type: string;
  status: string;
  makkah_room?: string | null;
  madinah_room?: string | null;
  makkah_rooming_group_id?: string | null;
  madinah_rooming_group_id?: string | null;
};
export type UmrahRoomGroup = {
  id: string;
  city: City;
  gender: keyof typeof GENDERS;
  room_type: string;
  group_number: number;
  hotel_room_number: string | null;
};
export const umrahRoomGroupLabel = (group: UmrahRoomGroup) =>
  `${GENDERS[group.gender]} · ${ROOM[group.room_type]} · مجموعة ${group.group_number}`;

const ERRORS: Record<string, string> = {
  room_capacity_exceeded: 'المجموعة مكتملة. اختر مجموعة تانية.',
  room_category_conflict: 'فئة المجموعة تختلف عن فئة غرفة المعتمر.',
  umrah_rooming_gender_mismatch: 'نوع المجموعة لا يطابق النوع المسجل للمعتمر.',
  umrah_rooming_gender_required: 'حدد النوع في ملف المعتمر الأول.',
  umrah_rooming_group_mismatch: 'المجموعة لا تتبع هذه المدينة أو البرنامج.',
  umrah_hotel_room_in_use: 'رقم الفندق مستخدم في تسكين آخر في نفس المدينة.',
  pilgrimage_passenger_not_changeable: 'التسكين مقفل في الحالة الحالية.',
  pilgrimage_operation_denied: 'صلاحية تعديل الحجوزات مطلوبة.',
};

type DialogState =
  | { kind: 'assign'; person: Passenger; city: City; choice: string; newGroupId: string }
  | { kind: 'number'; group: UmrahRoomGroup; value: string };

export default function UmrahRooming({ orgId, programId, hotels, passengers, groups, canEdit, onChange, onEditPassenger }: {
  orgId: string;
  programId: string;
  hotels: Partial<Record<City, string | null>>;
  passengers: Passenger[];
  groups: UmrahRoomGroup[];
  canEdit: boolean;
  onChange: () => void;
  onEditPassenger: (id: string) => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState<DialogState | null>(null);
  const active = passengers.filter((person) => person.status !== 'cancelled');
  const members = new Map<string, Passenger[]>();
  for (const person of active) {
    for (const city of CITY_KEYS) {
      const id = person[`${city}_rooming_group_id`];
      if (id) {
        const groupMembers = members.get(id) ?? [];
        groupMembers.push(person);
        members.set(id, groupMembers);
      }
    }
  }

  const save = useMutation({
    mutationFn: async (input: DialogState) => {
      const scope = { _organization_id: orgId, _program_id: programId };
      const result = input.kind === 'number'
        ? await callUntypedRpc('set_umrah_hotel_room_number', {
          ...scope, _group_id: input.group.id, _hotel_room_number: input.value.trim() || null,
        })
        : await callUntypedRpc('assign_umrah_rooming_group', {
          ...scope, _pilgrim_id: input.person.id, _city: input.city,
          _group_id: input.choice === 'new' ? input.newGroupId : input.choice === 'unassigned' ? null : input.choice,
          _new_group: input.choice === 'new',
        });
      if (result.error) throw result.error;
    },
    onSuccess: () => {
      onChange();
      setEditing(null);
      toast({ title: 'تم تحديث التسكين' });
    },
    onError: (error: { message: string; code?: string }) => {
      onChange();
      toast({
        title: 'تعذر تحديث التسكين',
        description: ERRORS[error.message] ?? (error.code === '23505' ? ERRORS.umrah_hotel_room_in_use : error.message),
        variant: 'destructive',
      });
    },
  });

  function personRow(person: Passenger, city: City) {
    const group = person[`${city}_rooming_group_id`];
    return <div key={person.id} className="flex flex-wrap items-center justify-between gap-2 py-1.5 text-sm">
      <div>
        <p className="font-medium">{person.full_name}</p>
        <p className="text-xs text-muted-foreground">
          {person.gender === 'male' || person.gender === 'female' ? GENDERS[person.gender] : 'النوع غير محدد'}
          {' · '}{ROOM[person.room_type]}
          {!group && person[`${city}_room`] && ` · غرفة الفندق ${person[`${city}_room`]}`}
        </p>
      </div>
      {canEdit && person.gender && !['traveled', 'completed'].includes(person.status) && <Button
        size="sm" variant="outline"
        aria-label={`${group ? 'نقل' : 'تسكين'} ${person.full_name} في ${CITIES[city]}`}
        onClick={() => setEditing({ kind: 'assign', person, city, choice: group || 'new', newGroupId: crypto.randomUUID() })}
      >{group ? 'نقل' : 'تسكين'}</Button>}
      {canEdit && !person.gender && !['traveled', 'completed'].includes(person.status) && <Button size="sm" variant="outline"
        onClick={() => onEditPassenger(person.id)}>تحديد النوع</Button>}
    </div>;
  }

  const options = editing?.kind === 'assign'
    ? groups.filter((group) => group.city === editing.city && group.gender === editing.person.gender && group.room_type === editing.person.room_type)
    : [];

  return <div className="space-y-4">
    {CITY_KEYS.map((city) => {
      const cityGroups = groups.filter((group) => group.city === city);
      const unmatched = active.filter((person) => !person[`${city}_rooming_group_id`]);
      return <section key={city} className="space-y-3 rounded-lg border p-4">
        <h3 className="font-semibold">{CITIES[city]}{hotels[city] && ` · ${hotels[city]}`}</h3>
        {active.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد معتمرون للتسكين.</p>}
        {unmatched.length > 0 && <Card className="divide-y p-3">
          <h4 className="pb-2 text-sm font-medium">بانتظار التوزيع على مجموعات</h4>
          {unmatched.map((person) => personRow(person, city))}
        </Card>}
        <div className="grid gap-4 lg:grid-cols-2">
          {(Object.entries(GENDERS) as [keyof typeof GENDERS, string][]).map(([gender, title]) => (
            <div key={gender} className="space-y-2">
              <h4 className="text-sm font-semibold">غرف {title}</h4>
              {cityGroups.filter((group) => group.gender === gender).map((group) => {
                const assigned = members.get(group.id) ?? [];
                return <Card key={group.id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-medium">{ROOM[group.room_type]} · مجموعة {group.group_number}</span>
                    <Badge variant="outline" dir="ltr">{assigned.length} / {ROOM_SIZE[group.room_type]}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">{group.hotel_room_number ? `غرفة الفندق ${group.hotel_room_number}` : 'رقم الفندق غير محدد'}</span>
                    {canEdit && <Button size="sm" variant="ghost" onClick={() => setEditing({ kind: 'number', group, value: group.hotel_room_number ?? '' })}>رقم غرفة الفندق</Button>}
                  </div>
                  {assigned.map((person) => personRow(person, city))}
                </Card>;
              })}
            </div>
          ))}
        </div>
      </section>;
    })}
    <Dialog open={!!editing} onOpenChange={(open) => { if (!open && !save.isPending) setEditing(null); }}>
      {editing && <DialogContent dir="rtl">
        {editing.kind === 'assign' ? <>
          <DialogHeader>
            <DialogTitle>تسكين {editing.person.full_name} في {CITIES[editing.city]}</DialogTitle>
            <DialogDescription>{editing.person.gender === 'female' ? 'غرف حريمي' : 'غرف رجالي'} · {ROOM[editing.person.room_type]}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="umrah-rooming-group">مجموعة الغرفة</Label>
          <Select value={editing.choice} onValueChange={(choice) => setEditing({ ...editing, choice })}>
            <SelectTrigger id="umrah-rooming-group"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="new">إنشاء مجموعة جديدة</SelectItem>
              {options.map((group) => {
                const assigned = members.get(group.id) ?? [];
                return <SelectItem key={group.id} value={group.id}
                  disabled={assigned.length >= ROOM_SIZE[group.room_type] && !assigned.some((person) => person.id === editing.person.id)}>
                  {umrahRoomGroupLabel(group)} ({assigned.length}/{ROOM_SIZE[group.room_type]})
                </SelectItem>;
              })}
              {editing.person[`${editing.city}_rooming_group_id`] && <SelectItem value="unassigned">إلغاء التسكين</SelectItem>}
            </SelectContent>
          </Select>
        </> : <>
          <DialogHeader>
            <DialogTitle>رقم غرفة الفندق في {CITIES[editing.group.city]}</DialogTitle>
            <DialogDescription>{umrahRoomGroupLabel(editing.group)}</DialogDescription>
          </DialogHeader>
          <Label htmlFor="umrah-hotel-room">رقم غرفة الفندق (اختياري)</Label>
          <Input id="umrah-hotel-room" maxLength={50} value={editing.value} onChange={(event) => setEditing({ ...editing, value: event.target.value })} />
        </>}
        <Button disabled={save.isPending} onClick={() => save.mutate(editing)}>{editing.kind === 'assign' ? 'حفظ التسكين' : 'حفظ رقم الفندق'}</Button>
      </DialogContent>}
    </Dialog>
  </div>;
}
