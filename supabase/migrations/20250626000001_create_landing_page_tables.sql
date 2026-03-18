
-- Create service_requests table for landing page customer requests
CREATE TABLE IF NOT EXISTS service_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR NOT NULL,
    phone VARCHAR NOT NULL,
    email VARCHAR,
    service_type VARCHAR NOT NULL,
    message TEXT,
    preferred_contact VARCHAR DEFAULT 'phone',
    status VARCHAR DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create landing_content table for CMS functionality
CREATE TABLE IF NOT EXISTS landing_content (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    section VARCHAR NOT NULL,
    title VARCHAR NOT NULL,
    content TEXT NOT NULL,
    image_url VARCHAR,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_created_at ON service_requests(created_at);
CREATE INDEX IF NOT EXISTS idx_landing_content_section ON landing_content(section);
CREATE INDEX IF NOT EXISTS idx_landing_content_is_active ON landing_content(is_active);

-- Insert some default content
-- INSERT INTO landing_content (section, title, content, is_active) VALUES
-- ('hero', 'العنوان الرئيسي', 'رحلتك المميزة تبدأ من هنا', true),
-- ('hero_subtitle', 'العنوان الفرعي', 'نحن شركة السياحة الرائدة في مصر، نقدم أفضل الخدمات السياحية والسفر مع ضمان الجودة والأسعار التنافسية', true),
-- ('services_title', 'عنوان الخدمات', 'خدماتنا المميزة', true),
-- ('services_subtitle', 'وصف الخدمات', 'نقدم مجموعة شاملة من الخدمات السياحية لتلبية جميع احتياجاتك', true),
-- ('hotels_title', 'عنوان الفنادق', 'فنادق القاهرة الفاخرة', true),
-- ('hotels_subtitle', 'وصف الفنادق', 'اكتشف أفضل الفنادق الخمس نجوم في القاهرة مع إمكانية الدفع عند الوصول', true);

-- Enable RLS
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;

-- Create policies for service_requests
DROP POLICY IF EXISTS "Anyone can insert service requests" ON service_requests;
CREATE POLICY "Anyone can insert service requests" ON service_requests FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Only admins can view service requests" ON service_requests;
CREATE POLICY "Only admins can view service requests" ON service_requests FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
);
DROP POLICY IF EXISTS "Only admins can update service requests" ON service_requests;
CREATE POLICY "Only admins can update service requests" ON service_requests FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
);

-- Create policies for landing_content
DROP POLICY IF EXISTS "Anyone can view active landing content" ON landing_content;
CREATE POLICY "Anyone can view active landing content" ON landing_content FOR SELECT USING (is_active = true);
DROP POLICY IF EXISTS "Only super admins can manage landing content" ON landing_content;
CREATE POLICY "Only super admins can manage landing content" ON landing_content FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role = 'super_admin'
    )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_service_requests_updated_at ON service_requests;
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
DROP TRIGGER IF EXISTS update_landing_content_updated_at ON landing_content;
CREATE TRIGGER update_landing_content_updated_at BEFORE UPDATE ON landing_content FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
