-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'CREATOR', 'ADMIN');

-- CreateTable
CREATE TABLE "Creator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Creator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Metric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditScore" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformScore" (
    "id" TEXT NOT NULL,
    "creditScoreId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "platformType" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "factors" JSONB NOT NULL,

    CONSTRAINT "PlatformScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Creator_email_key" ON "Creator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Creator_userId_key" ON "Creator"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_token_key" ON "RefreshToken"("token");

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Metric" ADD CONSTRAINT "Metric_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "Platform"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditScore" ADD CONSTRAINT "CreditScore_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformScore" ADD CONSTRAINT "PlatformScore_creditScoreId_fkey" FOREIGN KEY ("creditScoreId") REFERENCES "CreditScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- -- CreateTrigger on Creator table for mock data 
-- CREATE OR REPLACE TRIGGER create_mock_data()
-- after insert on "Creator"
-- for each row 
-- execute procedure create_mock_data_func();

-- -- Function to create mock data
-- CREATE OR REPLACE FUNCTION create_mock_data_func()
-- RETURNS TRIGGER AS $$
-- DECLARE
-- -- Arrays for tags per category
--     content_category TEXT=NEW.contentCategory;
--     knowledge_learning_tags TEXT[] := ARRAY[
--         'online-courses', 'language-learning', 'academic-subjects', 'educational-research',
--         'study-techniques', 'professional-certification', 'scientific-education', 
--         'historical-education', 'skill-development', 'educational-technology'
--     ];
--     business_finance_tags TEXT[] := ARRAY[
--         'stock-market-analysis', 'venture-capital', 'personal-finance-management', 
--         'cryptocurrency-investment', 'business-strategy', 'financial-literacy', 
--         'tax-planning', 'retirement-planning', 'market-research', 'business-leadership'
--     ];
--     computer_science_tech_tags TEXT[] := ARRAY[
--         'frontend-development', 'backend-systems', 'machine-learning-applications', 
--         'cloud-architecture', 'mobile-app-development', 'database-management', 
--         'dev-ops-practices', 'enterprise-software', 'blockchain-technology', 'embedded-systems'
--     ];
--     arts_creativity_tags TEXT[] := ARRAY[
--         'oil-painting-techniques', 'digital-illustration', 'character-design', 
--         'sculptural-arts', 'concept-art-creation', 'visual-storytelling', 
--         'fine-art-practice', 'mixed-media-techniques', 'printmaking-methods', 'pottery-ceramics'
--     ];
--     entertainment_media_tags TEXT[] := ARRAY[
--         'film-critique', 'television-analysis', 'streaming-content-reviews', 
--         'entertainment-industry-insights', 'celebrity-interviews', 'film-production', 
--         'media-trend-analysis', 'award-show-coverage', 'behind-the-scenes-content', 
--         'nostalgia-retrospectives'
--     ];
--     gaming_interactive_tags TEXT[] := ARRAY[
--         'competitive-esports', 'game-development-insights', 'speedrunning-techniques', 
--         'gaming-hardware-reviews', 'retro-gaming-appreciation', 'gameplay-strategy-guides', 
--         'multiplayer-community', 'game-industry-analysis', 'indie-game-spotlight', 
--         'virtual-reality-gaming'
--     ];
--     music_audio_tags TEXT[] := ARRAY[
--         'music-composition-technique', 'audio-production-tutorials', 'instrument-performance', 
--         'music-theory-education', 'music-industry-business', 'artist-interviews-features', 
--         'genre-specific-analysis', 'recording-studio-techniques', 'live-performance-insights', 
--         'music-equipment-reviews'
--     ];
--     health_wellness_tags TEXT[] := ARRAY[
--         'strength-training-programs', 'nutritional-science', 'mindfulness-practices', 
--         'sleep-optimization', 'mental-health-strategies', 'holistic-wellness', 
--         'stress-management-techniques', 'preventative-healthcare', 'specialized-diets', 
--         'chronic-condition-management'
--     ];
--     lifestyle_personal_tags TEXT[] := ARRAY[
--         'sustainable-living-practices', 'minimalist-lifestyle', 'home-renovation-design', 
--         'culinary-techniques', 'travel-destination-guides', 'fashion-trend-analysis', 
--         'relationship-psychology', 'productivity-systems', 'luxury-lifestyle', 'family-parenting'
--     ];
--     society_culture_tags TEXT[] := ARRAY[
--         'political-analysis', 'social-justice-issues', 'anthropological-studies', 
--         'cultural-heritage-preservation', 'philosophical-discourse', 'religious-studies', 
--         'current-events-commentary', 'ethical-discussions', 'sociological-perspectives', 
--         'historical-contexts'
--     ];
--     reviews_products_tags TEXT[] := ARRAY[
--         'consumer-electronics-evaluation', 'smartphone-detailed-reviews', 'automotive-testing', 
--         'home-appliance-comparisons', 'tech-ecosystem-analysis', 'camera-equipment-testing', 
--         'software-application-reviews', 'gaming-gear-assessment', 'wearable-technology-critique', 
--         'high-end-audio-evaluation'
--     ];
    
--     -- Variables for random tag selection
--     selected_tags TEXT[] := ARRAY[]::TEXT[];
--     all_tags TEXT[] := ARRAY[]::TEXT[];
--     random_index INTEGER;
--     tag_count INTEGER := 3;
-- BEGIN
--     CASE content_category
--         WHEN 'KNOWLEDGE_LEARNING' THEN all_tags := knowledge_learning_tags;
--         WHEN 'BUSINESS_FINANCE' THEN all_tags := business_finance_tags;
--         WHEN 'COMPUTER_SCIENCE_TECH' THEN all_tags := computer_science_tech_tags;
--         WHEN 'ARTS_CREATIVITY' THEN all_tags := arts_creativity_tags;
--         WHEN 'ENTERTAINMENT_MEDIA' THEN all_tags := entertainment_media_tags;
--         WHEN 'GAMING_INTERACTIVE' THEN all_tags := gaming_interactive_tags;
--         WHEN 'MUSIC_AUDIO' THEN all_tags := music_audio_tags;
--         WHEN 'HEALTH_WELLNESS' THEN all_tags := health_wellness_tags;
--         WHEN 'LIFESTYLE_PERSONAL' THEN all_tags := lifestyle_personal_tags;
--         WHEN 'SOCIETY_CULTURE' THEN all_tags := society_culture_tags;
--         WHEN 'REVIEWS_PRODUCTS' THEN all_tags := reviews_products_tags;
--         ELSE all_tags := computer_science_tech_tags; -- Default to tech if unknown
--     END CASE;
--     -- Fisher-Yates shuffle algorithm in SQL to select 3 random tags
--     -- Initialize selected_tags array
--     FOR i IN 1..LEAST(tag_count, array_length(all_tags, 1)) LOOP
--         -- Generate random index between i and array length
--         random_index := floor(random() * (array_length(all_tags, 1) - i + 1) + i);
        
--         -- Swap elements at positions i and random_index
--         selected_tags := array_append(selected_tags, all_tags[random_index]);
--         all_tags[random_index] := all_tags[i];
--     END LOOP;
-- END;
-- $$ LANGUAGE plpgsql;