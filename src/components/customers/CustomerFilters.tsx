
import { Button } from "@/components/ui/button";
import { useCRM } from "@/hooks/useCRM";

interface CustomerFiltersProps {
  activeSegment: string | null;
  onSegmentChange: (segmentId: string | null) => void;
}

const CustomerFilters = ({ activeSegment, onSegmentChange }: CustomerFiltersProps) => {
  const { customerSegments } = useCRM();

  return (
    <div className="flex gap-2 p-3 sm:p-4 bg-muted/40 rounded-lg overflow-x-auto whitespace-nowrap">
      <Button
        variant={activeSegment === null ? "default" : "outline"}
        onClick={() => onSegmentChange(null)}
        size="sm"
        className="shrink-0"
      >
        جميع العملاء
      </Button>
      {customerSegments?.map((segment) => (
        <Button
          key={segment.id}
          variant={activeSegment === segment.id ? "default" : "outline"}
          onClick={() => onSegmentChange(segment.id)}
          size="sm"
          className="shrink-0"
          style={{
            backgroundColor: activeSegment === segment.id ? segment.color : 'transparent',
            borderColor: segment.color,
            color: activeSegment === segment.id ? 'white' : segment.color
          }}
        >
          {segment.name_ar}
        </Button>
      ))}
    </div>
  );
};

export default CustomerFilters;
