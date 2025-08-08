
import type { LayoutSettings } from "@/types/blocks";

export const getContainerClass = (settings?: LayoutSettings) => {
  switch (settings?.container_width) {
    case "full":
      return "w-full";
    case "narrow":
      return "container max-w-3xl mx-auto";
    case "container":
    default:
      return "container mx-auto";
  }
};

export const getPaddingY = (settings?: LayoutSettings) => {
  switch (settings?.padding_y) {
    case "none":
      return "py-0";
    case "sm":
      return "py-6";
    case "md":
      return "py-10";
    case "lg":
      return "py-16";
    case "xl":
      return "py-24";
    default:
      return "py-10";
  }
};

export const getPaddingX = (settings?: LayoutSettings) => {
  switch (settings?.padding_x) {
    case "none":
      return "px-0";
    case "sm":
      return "px-4";
    case "md":
      return "px-6";
    case "lg":
      return "px-8";
    case "xl":
      return "px-10";
    default:
      return "px-4";
  }
};

export const getTextAlign = (settings?: LayoutSettings) => {
  switch (settings?.text_align) {
    case "left":
      return "text-left";
    case "right":
      return "text-right";
    case "center":
    default:
      return "text-center";
  }
};

export const getSectionClasses = (settings?: LayoutSettings) => {
  return [
    getPaddingY(settings),
    getPaddingX(settings),
    getTextAlign(settings),
  ].join(" ");
};

