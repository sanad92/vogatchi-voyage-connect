import React from "react";
import type { BlockData } from "@/types/blocks";
import AuthPage from "@/components/auth/AuthPage";

interface AuthFormBlockContent {
  form_type: 'login_register' | 'login_only' | 'register_only';
  show_social_login?: boolean;
  redirect_after_login?: string;
  terms_text?: string;
}

interface Props {
  block: BlockData;
}

const AuthFormBlock: React.FC<Props> = ({ block }) => {
  const content = block.content as AuthFormBlockContent;

  const getContainerClasses = () => {
    const { container_width, padding_y, text_align } = block.layout_settings;
    
    let classes = "w-full ";
    
    // Container width
    if (container_width === 'full') classes += "w-full ";
    else if (container_width === 'narrow') classes += "max-w-md mx-auto px-4 ";
    else classes += "container mx-auto px-4 ";
    
    // Padding
    if (padding_y === 'none') classes += "py-0 ";
    else if (padding_y === 'sm') classes += "py-8 ";
    else if (padding_y === 'md') classes += "py-12 ";
    else if (padding_y === 'lg') classes += "py-16 ";
    else if (padding_y === 'xl') classes += "py-24 ";
    else classes += "py-16 ";
    
    // Text alignment
    if (text_align === 'center') classes += "text-center ";
    else if (text_align === 'right') classes += "text-right ";
    else classes += "text-left ";
    
    return classes;
  };

  return (
    <section className="w-full">
      <div className={getContainerClasses()}>
        <AuthPage />
        {content.terms_text && (
          <p className="text-sm text-muted-foreground mt-4 text-center">
            {content.terms_text}
          </p>
        )}
      </div>
    </section>
  );
};

export default AuthFormBlock;