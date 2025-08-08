import React from "react";
import type { BlockData } from "@/types/blocks";
import BookingRequest from "@/pages/BookingRequest";

interface BookingFormBlockContent {
  form_title: string;
  form_description?: string;
  booking_types: string[];
  success_message: string;
  whatsapp_integration?: boolean;
}

interface Props {
  block: BlockData;
}

const BookingFormBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as BookingFormBlockContent;

  const getContainerClasses = () => {
    const { container_width, padding_y } = block.layout_settings;
    
    let classes = "w-full ";
    
    // Container width
    if (container_width === 'full') classes += "w-full ";
    else if (container_width === 'narrow') classes += "max-w-4xl mx-auto px-4 ";
    else classes += "container mx-auto px-4 ";
    
    // Padding
    if (padding_y === 'none') classes += "py-0 ";
    else if (padding_y === 'sm') classes += "py-8 ";
    else if (padding_y === 'md') classes += "py-12 ";
    else if (padding_y === 'lg') classes += "py-16 ";
    else if (padding_y === 'xl') classes += "py-24 ";
    else classes += "py-16 ";
    
    return classes;
  };

  return (
    <section className="w-full">
      <div className={getContainerClasses()}>
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-foreground">
              {content.form_title}
            </h2>
            {content.form_description && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {content.form_description}
              </p>
            )}
          </div>
          <BookingRequest />
        </div>
      </div>
    </section>
  );
};

export default BookingFormBlock;