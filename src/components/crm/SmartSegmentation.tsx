
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCustomers } from '@/hooks/useCustomers';
import { useCRM } from '@/hooks/useCRM';
import SmartSegmentGrid from './segmentation/SmartSegmentGrid';
import ExistingSegments from './segmentation/ExistingSegments';
import SegmentBuilder from './segmentation/SegmentBuilder';

const SmartSegmentation = () => {
  const { customers } = useCustomers();
  const { customerSegments } = useCRM();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="smart-segments" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="smart-segments">القطاعات الذكية</TabsTrigger>
          <TabsTrigger value="existing-segments">القطاعات الحالية</TabsTrigger>
          <TabsTrigger value="segment-builder">منشئ القطاعات</TabsTrigger>
        </TabsList>

        <TabsContent value="smart-segments" className="space-y-4">
          <SmartSegmentGrid customers={customers} />
        </TabsContent>

        <TabsContent value="existing-segments" className="space-y-4">
          <ExistingSegments customerSegments={customerSegments} customers={customers} />
        </TabsContent>

        <TabsContent value="segment-builder" className="space-y-4">
          <SegmentBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SmartSegmentation;
