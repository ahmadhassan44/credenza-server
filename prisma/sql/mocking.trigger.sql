-- First, create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION generate_creator_metrics()
RETURNS TRIGGER AS $$
DECLARE
    platform_record RECORD;
    metric_date DATE;
    views INTEGER;
    audience_size INTEGER;
    post_count INTEGER;
    avg_view_duration INTEGER;
    engagement_rate FLOAT;
    estimated_revenue FLOAT;
    ad_revenue FLOAT;
    other_revenue FLOAT;
    
    -- Base multipliers for different content categories
    category_multiplier FLOAT;
    
    -- Platform type multipliers
    platform_multiplier FLOAT;
    
    -- Lifecycle multiplier
    lifecycle_multiplier FLOAT;
    
    -- Random variation factor
    random_factor FLOAT;
BEGIN
    -- Generate a platform if none exists (basic platform setup)
    IF NOT EXISTS (SELECT 1 FROM "Platform" WHERE "creatorId" = NEW.id) THEN
        INSERT INTO "Platform" ("id", "type", "handle", "creatorId")
        VALUES (
            gen_random_uuid(), 
            'YOUTUBE', 
            LOWER(REPLACE(NEW.name, ' ', '')) || '_channel', 
            NEW.id
        )
        RETURNING * INTO platform_record;
    ELSE
        SELECT * INTO platform_record FROM "Platform" WHERE "creatorId" = NEW.id LIMIT 1;
    END IF;

    -- Set base metric values
    -- Apply category multipliers based on creator's content category
    CASE NEW."contentCategory"
        WHEN 'COMPUTER_SCIENCE_TECH' THEN category_multiplier := 1.3;
        WHEN 'GAMING_INTERACTIVE' THEN category_multiplier := 1.5;
        WHEN 'ENTERTAINMENT_MEDIA' THEN category_multiplier := 1.4;
        WHEN 'BUSINESS_FINANCE' THEN category_multiplier := 0.9;
        WHEN 'LIFESTYLE_PERSONAL' THEN category_multiplier := 1.1;
        WHEN 'MUSIC_AUDIO' THEN category_multiplier := 1.2;
        WHEN 'HEALTH_WELLNESS' THEN category_multiplier := 0.9;
        WHEN 'ARTS_CREATIVITY' THEN category_multiplier := 1.0;
        WHEN 'KNOWLEDGE_LEARNING' THEN category_multiplier := 0.8;
        WHEN 'SOCIETY_CULTURE' THEN category_multiplier := 0.7;
        ELSE category_multiplier := 1.0;
    END CASE;
    
    -- Apply platform multipliers
    CASE platform_record.type
        WHEN 'YOUTUBE' THEN platform_multiplier := 1.0;
        WHEN 'PATREON' THEN platform_multiplier := 0.4;
        WHEN 'INSTAGRAM' THEN platform_multiplier := 1.3;
        ELSE platform_multiplier := 1.0;
    END CASE;
    
    -- Apply lifecycle stage multiplier
    CASE NEW."lifecycleStage"
        WHEN 'NEW' THEN lifecycle_multiplier := 0.4;
        WHEN 'GROWTH' THEN lifecycle_multiplier := 1.2;
        WHEN 'STABLE' THEN lifecycle_multiplier := 1.8;
        WHEN 'DECLINE' THEN lifecycle_multiplier := 1.0;
        WHEN 'INACTIVE' THEN lifecycle_multiplier := 0.5;
        ELSE lifecycle_multiplier := 1.0;
    END CASE;
    
    -- Generate metrics for the past 6 months
    FOR i IN 0..5 LOOP
        -- Calculate date for this metric (current month - i months)
        metric_date := date_trunc('month', CURRENT_DATE - (i || ' month')::INTERVAL);
        
        -- Add random variation
        random_factor := 0.9 + random() * 0.2; -- Between 0.9 and 1.1
        
        -- Calculate metrics with all multipliers
        views := ROUND(5000 * category_multiplier * platform_multiplier * lifecycle_multiplier * random_factor);
        audience_size := ROUND(10000 * category_multiplier * lifecycle_multiplier);
        post_count := GREATEST(1, ROUND(8 * platform_multiplier * random_factor));
        avg_view_duration := ROUND(180 * platform_multiplier * random_factor);
        
        -- Calculate engagement rate (between 1.0% and 8.0% depending on platform)
        CASE platform_record.type
            WHEN 'YOUTUBE' THEN engagement_rate := (2.5 * random_factor)::FLOAT;
            WHEN 'PATREON' THEN engagement_rate := (8.5 * random_factor)::FLOAT;
            WHEN 'INSTAGRAM' THEN engagement_rate := (4.2 * random_factor)::FLOAT;
            ELSE engagement_rate := (3.0 * random_factor)::FLOAT;
        END CASE;
        
        -- Calculate estimated revenue
        -- Base CPM rates: YouTube=2.0, Patreon=50.0, Instagram=1.5
        CASE platform_record.type
            WHEN 'YOUTUBE' THEN 
                estimated_revenue := (views / 1000) * 2.0 * random_factor;
                ad_revenue := estimated_revenue * 0.8;
                other_revenue := estimated_revenue * 0.2;
            WHEN 'PATREON' THEN 
                estimated_revenue := (views / 1000) * 50.0 * random_factor;
                ad_revenue := estimated_revenue * 0.4;
                other_revenue := estimated_revenue * 0.6;
            WHEN 'INSTAGRAM' THEN 
                estimated_revenue := (views / 1000) * 1.5 * random_factor;
                ad_revenue := estimated_revenue * 0.7;
                other_revenue := estimated_revenue * 0.3;
            ELSE
                estimated_revenue := (views / 1000) * 2.0 * random_factor;
                ad_revenue := estimated_revenue * 0.7;
                other_revenue := estimated_revenue * 0.3;
        END CASE;
        
        -- Apply seasonal adjustments based on month
        CASE EXTRACT(MONTH FROM metric_date)
            WHEN 1 THEN -- January
                views := views * 1.1;
                estimated_revenue := estimated_revenue * 1.1;
            WHEN 7 THEN -- July (summer slump)
                views := views * 0.8;
                estimated_revenue := estimated_revenue * 0.8;
            WHEN 11, 12 THEN -- Holiday season
                views := views * 1.2;
                estimated_revenue := estimated_revenue * 1.2;
        END CASE;
        
        -- Insert the metric record
        INSERT INTO "Metric" (
            "id", "creatorId", "platformId", "date",
            "views", "audienceSize", "postCount", "avgViewDurationSec",
            "engagementRatePct", "estimatedRevenueUsd", "adRevenueUsd", "otherRevenueUsd",
            "createdAt", "updatedAt"
        ) VALUES (
            gen_random_uuid(), NEW.id, platform_record.id, metric_date,
            views, audience_size, post_count, avg_view_duration,
            engagement_rate, estimated_revenue, ad_revenue, other_revenue,
            NOW(), NOW()
        );
    END LOOP;
    
    -- Generate a credit score for the creator using data from CreditScoringService
    -- This would typically use data from the metrics we just created
    INSERT INTO "CreditScore" ("id", "creatorId", "score", "timestamp")
    VALUES (
        gen_random_uuid(), 
        NEW.id, 
        ROUND(60 + random() * 30)::INTEGER, -- Score between 60-90
        NOW()
    );
    
    -- Return the new creator record
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run after a new creator is inserted
CREATE TRIGGER generate_metrics_after_creator_insert
AFTER INSERT ON "Creator"
FOR EACH ROW
EXECUTE FUNCTION generate_creator_metrics();