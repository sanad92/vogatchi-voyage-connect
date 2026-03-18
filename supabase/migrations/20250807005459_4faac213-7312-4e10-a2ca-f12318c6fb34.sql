-- Create destinations table
CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  country TEXT NOT NULL,
  country_ar TEXT NOT NULL,
  image_url TEXT,
  rating NUMERIC DEFAULT 5.0,
  attractions JSONB DEFAULT '[]'::jsonb,
  attractions_ar JSONB DEFAULT '[]'::jsonb,
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create hotels table
CREATE TABLE IF NOT EXISTS public.hotels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  destination_id UUID REFERENCES public.destinations(id),
  location TEXT NOT NULL,
  location_ar TEXT NOT NULL,
  image_url TEXT,
  rating NUMERIC DEFAULT 5.0,
  star_rating INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  features_ar JSONB DEFAULT '[]'::jsonb,
  price_range TEXT,
  currency TEXT DEFAULT 'EGP',
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  contact_info JSONB DEFAULT '{}'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create media library table
CREATE TABLE IF NOT EXISTS public.media_library (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  caption TEXT,
  category TEXT DEFAULT 'general',
  tags JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage buckets
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES 
--   ('destinations', 'destinations', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
--   ('hotels', 'hotels', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp']),
--   ('media', 'media', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

-- Enable RLS
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_library ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for destinations
CREATE POLICY "Anyone can view active destinations" ON public.destinations
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage destinations" ON public.destinations
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create RLS policies for hotels
CREATE POLICY "Anyone can view active hotels" ON public.hotels
  FOR SELECT USING (is_active = true);

CREATE POLICY "Authenticated users can manage hotels" ON public.hotels
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create RLS policies for media library
CREATE POLICY "Anyone can view public media" ON public.media_library
  FOR SELECT USING (is_public = true);

CREATE POLICY "Authenticated users can manage their media" ON public.media_library
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Storage policies for destinations bucket
CREATE POLICY "Public Access for destinations" ON storage.objects
  FOR SELECT USING (bucket_id = 'destinations');

CREATE POLICY "Authenticated users can upload destinations" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'destinations' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their destinations uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'destinations' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for hotels bucket
CREATE POLICY "Public Access for hotels" ON storage.objects
  FOR SELECT USING (bucket_id = 'hotels');

CREATE POLICY "Authenticated users can upload hotels" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'hotels' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their hotels uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'hotels' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for media bucket
CREATE POLICY "Public Access for media" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'media' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their media uploads" ON storage.objects
  FOR UPDATE USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create indexes for performance
CREATE INDEX idx_destinations_active ON public.destinations(is_active);
CREATE INDEX idx_destinations_featured ON public.destinations(is_featured);
CREATE INDEX idx_destinations_sort_order ON public.destinations(sort_order);
CREATE INDEX idx_hotels_active ON public.hotels(is_active);
CREATE INDEX idx_hotels_destination ON public.hotels(destination_id);
CREATE INDEX idx_hotels_featured ON public.hotels(is_featured);
CREATE INDEX idx_media_category ON public.media_library(category);
CREATE INDEX idx_media_public ON public.media_library(is_public);

-- Create update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_destinations_updated_at
  BEFORE UPDATE ON public.destinations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hotels_updated_at
  BEFORE UPDATE ON public.hotels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_media_library_updated_at
  BEFORE UPDATE ON public.media_library
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for destinations
-- INSERT INTO public.destinations (name, name_ar, description, description_ar, country, country_ar, image_url, rating, attractions, attractions_ar, is_featured) VALUES
-- ('Dubai', 'دبي', 'A modern metropolis known for luxury shopping, ultramodern architecture and a lively nightlife scene.', 'مدينة عصرية معروفة بالتسوق الفاخر والهندسة المعمارية فائقة الحداثة والحياة الليلية النابضة بالحياة.', 'UAE', 'الإمارات العربية المتحدة', 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, '["Burj Khalifa", "Dubai Mall", "Burj Al Arab"]', '["برج خليفة", "دبي مول", "برج العرب"]', true),
-- ('Cairo', 'القاهرة', 'The capital of Egypt, home to ancient pyramids and rich Islamic architecture.', 'عاصمة مصر، موطن الأهرامات القديمة والعمارة الإسلامية الغنية.', 'Egypt', 'مصر', 'https://images.unsplash.com/photo-1539650116574-75c0c6d5b770?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, '["Pyramids of Giza", "Egyptian Museum", "Khan El Khalili"]', '["أهرامات الجيزة", "المتحف المصري", "خان الخليلي"]', true),
-- ('Istanbul', 'اسطنبول', 'A transcontinental city bridging Europe and Asia, rich in Byzantine and Ottoman heritage.', 'مدينة عابرة للقارات تربط بين أوروبا وآسيا، غنية بالتراث البيزنطي والعثماني.', 'Turkey', 'تركيا', 'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, '["Hagia Sophia", "Grand Bazaar", "Galata Tower"]', '["آيا صوفيا", "البازار الكبير", "برج غلطة"]', true);

-- Insert sample data for hotels
-- INSERT INTO public.hotels (name, name_ar, description, description_ar, destination_id, location, location_ar, image_url, rating, star_rating, features, features_ar, is_featured) VALUES
-- ('Four Seasons Hotel Cairo at Nile Plaza', 'فور سيزونز القاهرة في نايل بلازا', 'Luxury hotel with Nile views and world-class amenities.', 'فندق فاخر بإطلالات على النيل ووسائل راحة عالمية المستوى.', (SELECT id FROM destinations WHERE name = 'Cairo'), 'Nile Corniche, Cairo', 'كورنيش النيل، القاهرة', 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, 5, '["Nile View", "Luxury Spa", "Fine Dining", "Fitness Center"]', '["إطلالة على النيل", "سبا فاخر", "مطاعم راقية", "مركز لياقة بدنية"]', true),
-- ('Burj Al Arab Jumeirah', 'برج العرب جميرا', 'Iconic sail-shaped luxury hotel offering unparalleled service.', 'فندق فاخر مميز على شكل شراع يقدم خدمة لا مثيل لها.', (SELECT id FROM destinations WHERE name = 'Dubai'), 'Jumeirah Beach, Dubai', 'شاطئ جميرا، دبي', 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, 7, '["Private Beach", "Helipad", "Butler Service", "Michelin Dining"]', '["شاطئ خاص", "مهبط طائرات", "خدمة الخادم الشخصي", "مطاعم ميشلان"]', true),
-- ('Four Seasons Hotel Istanbul at Sultanahmet', 'فور سيزونز اسطنبول في السلطان أحمد', 'Historic hotel in the heart of old Istanbul with Ottoman influences.', 'فندق تاريخي في قلب اسطنبول القديمة بتأثيرات عثمانية.', (SELECT id FROM destinations WHERE name = 'Istanbul'), 'Sultanahmet Square, Istanbul', 'ميدان السلطان أحمد، اسطنبول', 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80', 5.0, 5, '["Historic Architecture", "Ottoman Design", "City Views", "Cultural Tours"]', '["عمارة تاريخية", "تصميم عثماني", "إطلالات المدينة", "جولات ثقافية"]', true);
