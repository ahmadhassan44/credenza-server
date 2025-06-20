-- Create a function that will be called by the trigger
CREATE OR REPLACE FUNCTION calculate_credit_score_after_metric_insert()
RETURNS TRIGGER AS $$
DECLARE
    creator_record RECORD;
    platform_record RECORD;
    existing_score RECORD;
    latest_metrics RECORD[];
    metric_month VARCHAR;
    metric_date DATE;
    audience_size_score INTEGER;
    engagement_score INTEGER;
    income_level_score INTEGER;
    view_duration_score INTEGER;
    platform_score INTEGER;
    overall_score INTEGER;
    credit_score_id UUID;
    factors JSONB;
BEGIN
    -- Extract the month from the metric date for grouping
    metric_date := NEW.date;
    metric_month := TO_CHAR(metric_date, 'YYYY-MM');
    
    -- Get creator data
    SELECT * INTO creator_record FROM "Creator" 
    WHERE id = NEW."creatorId";
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Creator with ID % not found', NEW."creatorId";
    END IF;
    
    -- Get platform data
    SELECT * INTO platform_record FROM "Platform" 
    WHERE id = NEW."platformId";
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Platform with ID % not found', NEW."platformId";
    END IF;
    
    -- Check if we already have a credit score for this creator and month
    SELECT * INTO existing_score FROM "CreditScore" 
    WHERE "creatorId" = NEW."creatorId" 
    AND DATE_TRUNC('month', timestamp) = DATE_TRUNC('month', metric_date);
    
    -- If we have a score for this month, we'll update it; otherwise create new
    IF FOUND THEN
        -- We'll update the existing score
        credit_score_id := existing_score.id;
    ELSE
        -- We need to create a new credit score
        credit_score_id := gen_random_uuid();
    END IF;

    -- Calculate scoring factors based on the metrics
    -- 1. Audience Size Score
    audience_size_score := CASE
        WHEN NEW."audienceSize" >= 1000000 THEN 100
        WHEN NEW."audienceSize" >= 500000 THEN 90
        WHEN NEW."audienceSize" >= 100000 THEN 80
        WHEN NEW."audienceSize" >= 50000 THEN 70
        WHEN NEW."audienceSize" >= 10000 THEN 60
        WHEN NEW."audienceSize" >= 5000 THEN 50
        WHEN NEW."audienceSize" >= 1000 THEN 40
        WHEN NEW."audienceSize" >= 500 THEN 30
        WHEN NEW."audienceSize" >= 100 THEN 20
        ELSE 10
    END;
    
    -- 2. Engagement Score
    engagement_score := CASE
        WHEN NEW."engagementRatePct" >= 10 THEN 100
        WHEN NEW."engagementRatePct" >= 7 THEN 90
        WHEN NEW."engagementRatePct" >= 5 THEN 80
        WHEN NEW."engagementRatePct" >= 3 THEN 70
        WHEN NEW."engagementRatePct" >= 2 THEN 60
        WHEN NEW."engagementRatePct" >= 1.5 THEN 50
        WHEN NEW."engagementRatePct" >= 1 THEN 40
        WHEN NEW."engagementRatePct" >= 0.5 THEN 30
        WHEN NEW."engagementRatePct" >= 0.1 THEN 20
        ELSE 10
    END;
    
    -- 3. Income Level Score
    income_level_score := CASE
        WHEN NEW."estimatedRevenueUsd" >= 20000 THEN 100
        WHEN NEW."estimatedRevenueUsd" >= 10000 THEN 90
        WHEN NEW."estimatedRevenueUsd" >= 5000 THEN 80
        WHEN NEW."estimatedRevenueUsd" >= 3000 THEN 70
        WHEN NEW."estimatedRevenueUsd" >= 2000 THEN 60
        WHEN NEW."estimatedRevenueUsd" >= 1000 THEN 50
        WHEN NEW."estimatedRevenueUsd" >= 500 THEN 40
        WHEN NEW."estimatedRevenueUsd" >= 250 THEN 30
        WHEN NEW."estimatedRevenueUsd" >= 100 THEN 20
        ELSE 10
    END;
    
    -- 4. View Duration Score (for YouTube)
    IF platform_record.type = 'YOUTUBE' THEN
        view_duration_score := CASE
            WHEN NEW."avgViewDurationSec" >= 900 THEN 100 -- 15+ minutes
            WHEN NEW."avgViewDurationSec" >= 600 THEN 90  -- 10+ minutes
            WHEN NEW."avgViewDurationSec" >= 300 THEN 80  -- 5+ minutes
            WHEN NEW."avgViewDurationSec" >= 180 THEN 70  -- 3+ minutes
            WHEN NEW."avgViewDurationSec" >= 120 THEN 60  -- 2+ minutes
            WHEN NEW."avgViewDurationSec" >= 60 THEN 50   -- 1+ minute
            WHEN NEW."avgViewDurationSec" >= 30 THEN 40   -- 30+ seconds
            WHEN NEW."avgViewDurationSec" >= 6 THEN 20    -- 6+ seconds
            ELSE 10
        END;
    END IF;

    -- Create the factors JSON based on platform type
    CASE platform_record.type
        WHEN 'YOUTUBE' THEN
            -- YouTube factors with weights
            factors := jsonb_build_array(
                jsonb_build_object(
                    'factor', 'Audience Size',
                    'score', audience_size_score,
                    'weight', 0.2,
                    'description', format('Based on audience of %s', NEW."audienceSize")
                ),
                jsonb_build_object(
                    'factor', 'Engagement',
                    'score', engagement_score,
                    'weight', 0.3,
                    'description', format('Based on engagement rate of %.1f%%', NEW."engagementRatePct")
                ),
                jsonb_build_object(
                    'factor', 'Income Level',
                    'score', income_level_score,
                    'weight', 0.2,
                    'description', format('Based on monthly revenue of $%.2f', NEW."estimatedRevenueUsd")
                ),
                jsonb_build_object(
                    'factor', 'View Duration',
                    'score', view_duration_score,
                    'weight', 0.15,
                    'description', format('Based on avg view duration of %s minutes', round(NEW."avgViewDurationSec" / 60))
                )
            );
            
            -- Calculate platform score
            platform_score := round(
                (audience_size_score * 0.2) +
                (engagement_score * 0.3) +
                (income_level_score * 0.2) +
                (view_duration_score * 0.15) +
                (50 * 0.15)  -- Add default score for income stability (not calculated in trigger)
            );
        
        WHEN 'PATREON' THEN
            -- Patreon factors with weights
            factors := jsonb_build_array(
                jsonb_build_object(
                    'factor', 'Audience Size',
                    'score', audience_size_score,
                    'weight', 0.15,
                    'description', format('Based on audience of %s', NEW."audienceSize")
                ),
                jsonb_build_object(
                    'factor', 'Engagement',
                    'score', engagement_score,
                    'weight', 0.15,
                    'description', format('Based on engagement rate of %.1f%%', NEW."engagementRatePct")
                ),
                jsonb_build_object(
                    'factor', 'Income Level',
                    'score', income_level_score,
                    'weight', 0.35,
                    'description', format('Based on monthly revenue of $%.2f', NEW."estimatedRevenueUsd")
                )
            );
            
            -- Calculate platform score
            platform_score := round(
                (audience_size_score * 0.15) +
                (engagement_score * 0.15) +
                (income_level_score * 0.35) +
                (50 * 0.35)  -- Add default score for income stability (not calculated in trigger)
            );
            
        WHEN 'INSTAGRAM' THEN
            -- Instagram factors with weights
            factors := jsonb_build_array(
                jsonb_build_object(
                    'factor', 'Audience Size',
                    'score', audience_size_score,
                    'weight', 0.3,
                    'description', format('Based on audience of %s', NEW."audienceSize")
                ),
                jsonb_build_object(
                    'factor', 'Engagement',
                    'score', engagement_score,
                    'weight', 0.5,
                    'description', format('Based on engagement rate of %.1f%%', NEW."engagementRatePct")
                ),
                jsonb_build_object(
                    'factor', 'Income Level',
                    'score', income_level_score,
                    'weight', 0.1,
                    'description', format('Based on monthly revenue of $%.2f', NEW."estimatedRevenueUsd")
                )
            );
            
            -- Calculate platform score
            platform_score := round(
                (audience_size_score * 0.3) +
                (engagement_score * 0.5) +
                (income_level_score * 0.1) +
                (50 * 0.1)  -- Add default score for income stability (not calculated in trigger)
            );
            
        ELSE
            -- Default factors with equal weights
            factors := jsonb_build_array(
                jsonb_build_object(
                    'factor', 'Audience Size',
                    'score', audience_size_score,
                    'weight', 0.25,
                    'description', format('Based on audience of %s', NEW."audienceSize")
                ),
                jsonb_build_object(
                    'factor', 'Engagement',
                    'score', engagement_score,
                    'weight', 0.3,
                    'description', format('Based on engagement rate of %.1f%%', NEW."engagementRatePct")
                ),
                jsonb_build_object(
                    'factor', 'Income Level',
                    'score', income_level_score,
                    'weight', 0.25,
                    'description', format('Based on monthly revenue of $%.2f', NEW."estimatedRevenueUsd")
                )
            );
            
            -- Calculate platform score
            platform_score := round(
                (audience_size_score * 0.25) +
                (engagement_score * 0.3) +
                (income_level_score * 0.25) +
                (50 * 0.2)  -- Add default score for income stability (not calculated in trigger)
            );
    END CASE;

    -- Calculate overall score (simplified version)
    overall_score := CASE platform_record.type
        WHEN 'YOUTUBE' THEN platform_score * 0.35
        WHEN 'PATREON' THEN platform_score * 0.5
        WHEN 'INSTAGRAM' THEN platform_score * 0.15
        ELSE platform_score * 0.1
    END;
    
    -- Round to nearest integer
    overall_score := round(overall_score);
    
    -- Ensure overall score is between 0 and 100
    overall_score := GREATEST(0, LEAST(100, overall_score));

    -- Create or update credit score record
    IF NOT FOUND THEN
        -- Create new credit score
        INSERT INTO "CreditScore" ("id", "creatorId", "score", "timestamp")
        VALUES (credit_score_id, NEW."creatorId", overall_score, metric_date)
        RETURNING id INTO credit_score_id;
        
        -- Create platform score
        INSERT INTO "PlatformScore" (
            "id", "creditScoreId", "platformId", "platformType", 
            "platformHandle", "score", "factors"
        )
        VALUES (
            gen_random_uuid(),
            credit_score_id,
            NEW."platformId",
            platform_record.type,
            platform_record.handle,
            platform_score,
            factors
        );
    ELSE
        -- Update existing credit score
        UPDATE "CreditScore"
        SET score = overall_score
        WHERE id = credit_score_id;
        
        -- Update or create platform score
        IF EXISTS (SELECT 1 FROM "PlatformScore" 
                   WHERE "creditScoreId" = credit_score_id 
                   AND "platformId" = NEW."platformId") THEN
            
            UPDATE "PlatformScore"
            SET score = platform_score, factors = factors
            WHERE "creditScoreId" = credit_score_id 
            AND "platformId" = NEW."platformId";
        ELSE
            INSERT INTO "PlatformScore" (
                "id", "creditScoreId", "platformId", "platformType", 
                "platformHandle", "score", "factors"
            )
            VALUES (
                gen_random_uuid(),
                credit_score_id,
                NEW."platformId",
                platform_record.type,
                platform_record.handle,
                platform_score,
                factors
            );
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log error and continue (don't fail the metric insertion)
    RAISE NOTICE 'Error calculating credit score: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger to run after a new metric is inserted
CREATE TRIGGER calculate_credit_score_after_metric_insert
AFTER INSERT ON "Metric"
FOR EACH ROW
EXECUTE FUNCTION calculate_credit_score_after_metric_insert();