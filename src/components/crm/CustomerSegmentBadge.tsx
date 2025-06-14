
import { Badge } from "@/components/ui/badge";
import type { CustomerSegment } from "@/types/crm";

interface CustomerSegmentBadgeProps {
  segment?: CustomerSegment;
  size?: "sm" | "md" | "lg";
}

const CustomerSegmentBadge = ({ segment, size = "md" }: CustomerSegmentBadgeProps) => {
  if (!segment) {
    return <Badge variant="outline">غير محدد</Badge>;
  }

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1",
    lg: "text-base px-4 py-2"
  };

  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} border-2`}
      style={{ 
        borderColor: segment.color,
        color: segment.color,
        backgroundColor: `${segment.color}10`
      }}
    >
      {segment.name_ar}
    </Badge>
  );
};

export default CustomerSegmentBadge;
