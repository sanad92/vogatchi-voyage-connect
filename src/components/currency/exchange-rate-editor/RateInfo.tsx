
interface RateInfoProps {
  effectiveDate: string;
  isEditing: boolean;
}

const RateInfo = ({ effectiveDate, isEditing }: RateInfoProps) => {
  return (
    <div className="text-center pt-2 border-t">
      <p className="text-xs text-gray-500">
        تاريخ السعر: {new Date(effectiveDate).toLocaleDateString('ar-SA')}
      </p>
      {isEditing && (
        <p className="text-xs text-blue-600 mt-1">
          💡 التحرير اليدوي يحدث السعر بنفس التاريخ
        </p>
      )}
    </div>
  );
};

export default RateInfo;
