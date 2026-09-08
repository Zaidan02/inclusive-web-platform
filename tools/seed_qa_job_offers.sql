BEGIN;

CREATE TEMP TABLE qa_sample_offer (
    slug text PRIMARY KEY,
    employer_id integer NOT NULL,
    location text NOT NULL,
    job_type text NOT NULL,
    opportunity_type text NOT NULL,
    description text NOT NULL,
    assistance_available boolean NOT NULL,
    education_requirement text NOT NULL,
    minimum_education_level text,
    reading_requirement text NOT NULL,
    writing_requirement text NOT NULL,
    numeracy_requirement text NOT NULL,
    position_knowledge_requirement text NOT NULL,
    task_limit integer NOT NULL
) ON COMMIT DROP;

INSERT INTO qa_sample_offer VALUES
('head-barman-barman', 3, 'Jounieh, Lebanon', 'Full-time', 'work',
 'Cedar Sweets is seeking a head barman or barman for guest service, beverage preparation, stock control, and safe workstation organization.',
 true, 'preferred', 'high_school', 'required', 'preferred', 'required', 'required', 10),
('cold-preparation-butcher-poultry', 5, 'Beirut, Lebanon', 'Internship', 'training',
 'Beirut Artisan Bakery offers a supervised hospitality training program in cold preparation, butcher and poultry handling, hygiene, and safe equipment use.',
 true, 'not_required', NULL, 'preferred', 'not_required', 'preferred', 'required', 8),
('cashier', 3, 'Jounieh, Lebanon', 'Part-time', 'work',
 'Cedar Sweets is recruiting a cashier to welcome customers, process orders and payments, check totals, and maintain accurate transaction records.',
 false, 'required', 'high_school', 'required', 'required', 'required', 'preferred', 7),
('rotating-chef-self-service-banquet-other', 5, 'Beirut, Lebanon', 'Internship', 'training',
 'Beirut Artisan Bakery provides a rotating kitchen training program covering self-service preparation, banquet support, food safety, and coordinated production tasks.',
 true, 'preferred', 'vocational', 'preferred', 'not_required', 'preferred', 'required', 12),
('cold-kitchen-garde-manger', 5, 'Beirut, Lebanon', 'Full-time', 'work',
 'Beirut Artisan Bakery is seeking a cold-kitchen team member for garde-manger preparation, portioning, presentation, hygiene, and workstation organization.',
 true, 'preferred', 'vocational', 'preferred', 'not_required', 'preferred', 'required', 10),
('food-service-point-of-sales-management', 4, 'Tripoli, Lebanon', 'Full-time', 'work',
 'North Scoop is recruiting a food-service point-of-sales coordinator to supervise transactions, daily records, customer flow, and basic stock reporting.',
 false, 'required', 'high_school', 'required', 'required', 'required', 'required', 9),
('host-hostess', 3, 'Jounieh, Lebanon', 'Part-time', 'work',
 'Cedar Sweets is seeking a host or hostess to welcome guests, manage seating and queues, communicate requests, and support an inclusive customer experience.',
 true, 'preferred', 'high_school', 'required', 'required', 'not_required', 'preferred', 6),
('pot-dish-glass-washing', 4, 'Tripoli, Lebanon', 'Internship', 'training',
 'North Scoop offers a supported training placement in pot, dish, and glass washing with safe chemical use, sorting, hygiene, and equipment routines.',
 true, 'not_required', NULL, 'preferred', 'not_required', 'not_required', 'preferred', 8),
('fish-preparation', 5, 'Beirut, Lebanon', 'Internship', 'training',
 'Beirut Artisan Bakery offers supervised food-preparation training covering fish handling, cleaning, portioning, hygiene, storage, and safe tool use.',
 true, 'preferred', 'primary', 'preferred', 'not_required', 'preferred', 'required', 8),
('vegetable-preparation', 4, 'Tripoli, Lebanon', 'Seasonal', 'work',
 'North Scoop is seeking seasonal preparation support for receiving, washing, cutting, storing, and organizing vegetables under documented hygiene procedures.',
 true, 'not_required', NULL, 'preferred', 'not_required', 'not_required', 'preferred', 7),
('point-of-sales-manager-self-service', 4, 'Tripoli, Lebanon', 'Full-time', 'work',
 'North Scoop is recruiting a self-service point-of-sales manager to coordinate staff, customer flow, cash controls, reporting, and service standards.',
 false, 'required', 'high_school', 'required', 'required', 'required', 'required', 11),
('sommelier', 3, 'Jounieh, Lebanon', 'Full-time', 'work',
 'Cedar Sweets is seeking a sommelier for beverage guidance, product knowledge, stock monitoring, guest communication, and responsible service procedures.',
 true, 'required', 'vocational', 'required', 'required', 'required', 'required', 9);

INSERT INTO job_post (
    employer_id, job_definition_id, location, job_type, opportunity_type,
    work_mode, description, application_deadline, cv_required,
    cover_letter_required, status, created_at, updated_at,
    assistance_available, education_requirement, minimum_education_level,
    reading_requirement, writing_requirement, numeracy_requirement,
    position_knowledge_requirement
)
SELECT
    sample.employer_id,
    definition.id,
    sample.location,
    sample.job_type,
    sample.opportunity_type,
    'On-site',
    sample.description,
    CURRENT_TIMESTAMP + INTERVAL '120 days',
    false,
    false,
    'published',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    sample.assistance_available,
    sample.education_requirement,
    sample.minimum_education_level,
    sample.reading_requirement,
    sample.writing_requirement,
    sample.numeracy_requirement,
    sample.position_knowledge_requirement
FROM qa_sample_offer sample
JOIN job_definition definition ON definition.slug = sample.slug
WHERE NOT EXISTS (
    SELECT 1 FROM job_post existing
    WHERE existing.employer_id = sample.employer_id
      AND existing.job_definition_id = definition.id
      AND existing.description = sample.description
);

INSERT INTO job_post_highlighted_task (job_post_id, task_id, display_position)
SELECT post.id, chosen.id, chosen.display_position
FROM qa_sample_offer sample
JOIN job_definition definition ON definition.slug = sample.slug
JOIN job_post post
  ON post.employer_id = sample.employer_id
 AND post.job_definition_id = definition.id
 AND post.description = sample.description
CROSS JOIN LATERAL (
    SELECT task.id,
           ROW_NUMBER() OVER (ORDER BY task.position, task.id)::integer AS display_position
    FROM job_definition_task task
    WHERE task.job_definition_id = definition.id
      AND LOWER(TRIM(task.name)) NOT IN ('write', 'read', 'count', 'personal education')
      AND NOT (
          LOWER(TRIM(task.name)) LIKE 'basic % knowledge to position'
      )
    ORDER BY task.position, task.id
    LIMIT sample.task_limit
) chosen
ON CONFLICT (job_post_id, task_id) DO NOTHING;

CREATE TEMP TABLE qa_additional_offer ON COMMIT DROP AS
SELECT
    definition.slug,
    definition.id AS job_definition_id,
    profile.user_id AS employer_id,
    COALESCE(profile.location, 'Beirut, Lebanon') AS location,
    CASE
        WHEN MOD(definition.id + profile.user_id, 3) = 0 THEN 'Internship'
        WHEN MOD(definition.id + profile.user_id, 3) = 1 THEN 'Full-time'
        ELSE 'Part-time'
    END AS job_type,
    CASE
        WHEN MOD(definition.id + profile.user_id, 3) = 0 THEN 'training'
        ELSE 'work'
    END AS opportunity_type,
    profile.company_name || ' offers a demonstration ' || definition.name ||
        ' opportunity covering selected catalogue tasks, practical requirements, and documented workplace support options.' AS description,
    MOD(definition.id + profile.user_id, 2) = 0 AS assistance_available,
    CASE MOD(definition.id + profile.user_id, 3)
        WHEN 0 THEN 'not_required'
        WHEN 1 THEN 'preferred'
        ELSE 'required'
    END AS education_requirement,
    CASE MOD(definition.id + profile.user_id, 3)
        WHEN 0 THEN NULL
        WHEN 1 THEN 'primary'
        ELSE 'high_school'
    END AS minimum_education_level,
    CASE WHEN MOD(definition.id + profile.user_id, 2) = 0 THEN 'required' ELSE 'preferred' END AS reading_requirement,
    CASE MOD(definition.id + profile.user_id, 3)
        WHEN 0 THEN 'not_required'
        WHEN 1 THEN 'preferred'
        ELSE 'required'
    END AS writing_requirement,
    CASE MOD(definition.id + profile.user_id, 4)
        WHEN 0 THEN 'not_required'
        WHEN 1 THEN 'preferred'
        ELSE 'required'
    END AS numeracy_requirement,
    CASE WHEN MOD(definition.id + profile.user_id, 2) = 0 THEN 'required' ELSE 'preferred' END AS position_knowledge_requirement,
    5 + MOD(definition.id + profile.user_id, 8) AS task_limit
FROM qa_sample_offer primary_offer
JOIN job_definition definition ON definition.slug = primary_offer.slug
CROSS JOIN employer_profile profile
WHERE profile.user_id <> primary_offer.employer_id;

INSERT INTO job_post (
    employer_id, job_definition_id, location, job_type, opportunity_type,
    work_mode, description, application_deadline, cv_required,
    cover_letter_required, status, created_at, updated_at,
    assistance_available, education_requirement, minimum_education_level,
    reading_requirement, writing_requirement, numeracy_requirement,
    position_knowledge_requirement
)
SELECT
    sample.employer_id,
    sample.job_definition_id,
    sample.location,
    sample.job_type,
    sample.opportunity_type,
    'On-site',
    sample.description,
    CURRENT_TIMESTAMP + INTERVAL '150 days',
    false,
    false,
    'published',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    sample.assistance_available,
    sample.education_requirement,
    sample.minimum_education_level,
    sample.reading_requirement,
    sample.writing_requirement,
    sample.numeracy_requirement,
    sample.position_knowledge_requirement
FROM qa_additional_offer sample
WHERE NOT EXISTS (
    SELECT 1 FROM job_post existing
    WHERE existing.employer_id = sample.employer_id
      AND existing.job_definition_id = sample.job_definition_id
      AND existing.description = sample.description
);

INSERT INTO job_post_highlighted_task (job_post_id, task_id, display_position)
SELECT post.id, chosen.id, chosen.display_position
FROM qa_additional_offer sample
JOIN job_post post
  ON post.employer_id = sample.employer_id
 AND post.job_definition_id = sample.job_definition_id
 AND post.description = sample.description
CROSS JOIN LATERAL (
    SELECT task.id,
           ROW_NUMBER() OVER (ORDER BY task.position, task.id)::integer AS display_position
    FROM job_definition_task task
    WHERE task.job_definition_id = sample.job_definition_id
      AND LOWER(TRIM(task.name)) NOT IN ('write', 'read', 'count', 'personal education')
      AND NOT (
          LOWER(TRIM(task.name)) LIKE 'basic % knowledge to position'
      )
    ORDER BY task.position, task.id
    LIMIT sample.task_limit
) chosen
ON CONFLICT (job_post_id, task_id) DO NOTHING;

SELECT
    post.id,
    definition.name AS position,
    profile.company_name,
    post.opportunity_type,
    post.job_type,
    post.assistance_available,
    COUNT(highlight.id) AS important_tasks
FROM job_post post
JOIN job_definition definition ON definition.id = post.job_definition_id
JOIN employer_profile profile ON profile.user_id = post.employer_id
LEFT JOIN job_post_highlighted_task highlight ON highlight.job_post_id = post.id
WHERE post.description IN (SELECT description FROM qa_sample_offer)
   OR post.description IN (SELECT description FROM qa_additional_offer)
GROUP BY post.id, definition.name, profile.company_name
ORDER BY post.id;

COMMIT;
