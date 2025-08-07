export interface BlockData {
  id: string;
  type: BlockType;
  title: string;
  content: Record<string, any>;
  layout_settings: LayoutSettings;
  style_settings: StyleSettings;
  is_active: boolean;
  order_index: number;
  section: string;
  created_at: string;
  updated_at: string;
}

export type BlockType = 
  | 'hero' 
  | 'services' 
  | 'cities' 
  | 'hotels' 
  | 'contact' 
  | 'direct_contracts'
  | 'custom_text' 
  | 'image_gallery' 
  | 'statistics';

export interface LayoutSettings {
  container_width?: 'full' | 'container' | 'narrow';
  padding_y?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  padding_x?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  text_align?: 'left' | 'center' | 'right';
  background_type?: 'none' | 'color' | 'gradient' | 'image';
  columns?: number;
  grid_gap?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface StyleSettings {
  background_color?: string;
  text_color?: string;
  border_radius?: string;
  shadow?: string;
  animation?: string;
  custom_css?: string;
}

export interface HeroBlockContent {
  main_title: string;
  subtitle: string;
  description: string;
  primary_button_text: string;
  primary_button_action: string;
  secondary_button_text?: string;
  secondary_button_action?: string;
  background_image?: string;
  stats?: Array<{
    number: string;
    label: string;
  }>;
}

export interface ServicesBlockContent {
  section_title: string;
  section_description: string;
  services: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    color: string;
    button_text?: string;
    button_link?: string;
  }>;
}

export interface CitiesBlockContent {
  section_title: string;
  section_description: string;
  explore_button_text: string;
  destinations: Array<{
    id: string;
    name: string;
    image: string;
    rating: number;
    attractions: string[];
  }>;
}

export interface HotelsBlockContent {
  section_title: string;
  section_description: string;
  hotels: Array<{
    id: string;
    name: string;
    image: string;
    rating: number;
    location: string;
    features: string[];
  }>;
}

export interface ContactBlockContent {
  section_title: string;
  section_description: string;
  form_fields: Array<{
    name: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
  }>;
  submit_button_text: string;
  success_message: string;
}

export interface DirectContractsBlockContent {
  section_title: string;
  section_description: string;
  contracts: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    button_text: string;
  }>;
}

export interface CustomTextBlockContent {
  content: string;
  heading_level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface ImageGalleryBlockContent {
  section_title?: string;
  images: Array<{
    url: string;
    alt: string;
    caption?: string;
  }>;
  layout: 'grid' | 'carousel' | 'masonry';
}

export interface StatisticsBlockContent {
  section_title?: string;
  stats: Array<{
    number: string;
    label: string;
    description?: string;
    icon?: string;
  }>;
}