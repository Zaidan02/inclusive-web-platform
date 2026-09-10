<?php

namespace App\Controller;

use App\Entity\CandidateProfile;
use App\Entity\CandidateProfileAiEvent;
use App\Entity\CandidatePositionInterest;
use App\Entity\ConsentRecord;
use App\Entity\CandidateTaskSkill;
use App\Entity\Disability;
use App\Entity\JobDefinitionTask;
use App\Entity\User;
use App\Privacy\PrivacyPolicy;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class CandidateProfileAiController extends AbstractController
{
    private const EDUCATION_LEVELS = [
        'none',
        'primary',
        'middle_school',
        'high_school',
        'vocational',
        'university',
    ];

    private const PROFILE_FIELD_LIMITS = [
        'firstName' => 100,
        'lastName' => 100,
        'phone' => 40,
        'location' => 255,
        'about' => 3000,
    ];

    private const PRACTICAL_ABILITY_LEVELS = ['independent', 'with_support', 'not_yet'];
    private const PRACTICAL_ABILITY_FIELDS = ['readingAbility', 'writingAbility', 'numeracyAbility'];
    private const OPPORTUNITY_PREFERENCES = ['work', 'training', 'both'];

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $profileAiUrl,
        private readonly string $profileAiToken,
    ) {
    }

    #[Route('/api/candidate/profile/ai-suggestions', name: 'candidate_profile_ai_suggestions', methods: ['POST'])]
    public function suggestions(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
    ): JsonResponse {
        $user = $this->candidate($request, $jwtEncoder, $entityManager);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'A valid JSON body is required.'], 400);
        }
        if (($data['consent'] ?? false) !== true) {
            return $this->json(['message' => 'Consent is required before AI profile analysis.'], 400);
        }
        if (($data['consentVersion'] ?? null) !== PrivacyPolicy::VERSION) {
            return $this->json([
                'message' => 'Please review and accept the current AI privacy notice.',
                'privacyVersion' => PrivacyPolicy::VERSION,
            ], 400);
        }

        $narrative = trim((string) ($data['narrative'] ?? ''));
        if (mb_strlen($narrative) < 10 || mb_strlen($narrative) > 4000) {
            return $this->json(['message' => 'Your profile description must contain 10 to 4000 characters.'], 400);
        }
        $language = strtolower(trim((string) ($data['language'] ?? 'en')));
        if (!in_array($language, ['en', 'fr', 'ar'], true)) {
            return $this->json(['message' => 'Language must be English, French, or Arabic.'], 400);
        }

        $disabilities = $entityManager->getRepository(Disability::class)->findBy(
            ['active' => true],
            ['name' => 'ASC'],
        );
        $tasks = $entityManager->createQueryBuilder()
            ->select('task', 'job')
            ->from(JobDefinitionTask::class, 'task')
            ->join('task.jobDefinition', 'job')
            ->where('job.active = true')
            ->orderBy('job.name', 'ASC')
            ->addOrderBy('task.position', 'ASC')
            ->getQuery()
            ->getResult();

        $profile = $user->getCandidateProfile();
        $payload = [
            'narrative' => $narrative,
            'language' => $language,
            'existingProfile' => [
                'firstName' => $profile?->getFirstName(),
                'lastName' => $profile?->getLastName(),
                'phone' => $profile?->getPhone(),
                'location' => $profile?->getLocation(),
                'about' => $profile?->getAbout(),
                'educationLevel' => $profile?->getEducationLevel(),
                'readingAbility' => $profile?->getReadingAbility(),
                'writingAbility' => $profile?->getWritingAbility(),
                'numeracyAbility' => $profile?->getNumeracyAbility(),
                'selectedDisabilities' => $profile?->getSelectedDisabilities() ?? [],
                'opportunityPreference' => $profile?->getOpportunityPreference() ?? 'both',
                'positionInterests' => $profile
                    ? array_values($profile->getPositionInterests()->map(static fn (CandidatePositionInterest $interest): array => [
                        'jobDefinitionId' => $interest->getJobDefinition()?->getId(),
                        'jobName' => $interest->getJobDefinition()?->getName(),
                        'knowledgeLevel' => $interest->getKnowledgeLevel(),
                    ])->toArray())
                    : [],
            ],
            'allowedDisabilities' => array_map(
                static fn (Disability $disability): array => [
                    'id' => $disability->getId(),
                    'name' => $disability->getName(),
                ],
                $disabilities,
            ),
            'taskVocabulary' => array_map(
                static fn (JobDefinitionTask $task): array => [
                    'taskId' => $task->getId(),
                    'jobDefinitionId' => $task->getJobDefinition()?->getId(),
                    'taskName' => $task->getName(),
                    'jobName' => $task->getJobDefinition()?->getName(),
                ],
                $tasks,
            ),
        ];

        $this->recordEvent($entityManager, $user, 'analysis_requested', $language, [
            'consent' => true,
            'consentVersion' => PrivacyPolicy::VERSION,
            'narrativeCharacters' => mb_strlen($narrative),
        ]);
        $entityManager->persist(
            (new ConsentRecord())
                ->setCandidate($user)
                ->setPurpose(PrivacyPolicy::PURPOSE_AI_PROFILE)
                ->setPolicyVersion(PrivacyPolicy::VERSION)
                ->setDetails([
                    'language' => $language,
                    'dataCategories' => ['editable_profile_transcript'],
                    'transcriptStoredByPlatform' => false,
                ])
        );
        $entityManager->flush();

        try {
            $response = $this->httpClient->request(
                'POST',
                rtrim($this->profileAiUrl, '/') . '/api/profile/extract',
                [
                    'headers' => ['X-Profile-AI-Token' => $this->profileAiToken],
                    'json' => $payload,
                    'timeout' => 90,
                ],
            );
            $result = $response->toArray(false);
        } catch (\Throwable) {
            $this->recordEvent($entityManager, $user, 'analysis_failed', $language, [
                'reason' => 'service_unavailable',
            ]);
            $entityManager->flush();
            return $this->json([
                'message' => 'The AI profile assistant is temporarily unavailable.',
            ], 503);
        }

        if ($response->getStatusCode() !== 200 || !is_array($result)) {
            $this->recordEvent($entityManager, $user, 'analysis_failed', $language, [
                'reason' => 'upstream_rejected',
                'statusCode' => $response->getStatusCode(),
            ]);
            $entityManager->flush();
            return $this->json([
                'message' => $result['message'] ?? 'The AI profile assistant could not analyse this description.',
            ], 502);
        }

        $filtered = $this->filterSuggestions($result, $disabilities, $tasks);
        $this->recordEvent($entityManager, $user, 'analysis_completed', $language, [
            'suggestionCounts' => [
                'profileFields' => count($filtered['profileFields']),
                'educationLevel' => $filtered['educationLevel'] ? 1 : 0,
                'practicalAbilities' => count($filtered['practicalAbilities']),
                'opportunityPreference' => $filtered['opportunityPreference'] ? 1 : 0,
                'positionInterests' => count($filtered['positionInterests']),
                'disabilities' => count($filtered['disabilities']),
                'taskSkills' => count($filtered['taskSkills']),
                'unmappedStatements' => count($filtered['unmappedStatements']),
            ],
        ]);
        $entityManager->flush();

        return $this->json([
            'message' => 'Suggestions are ready for your review. Nothing has been saved.',
            'notSaved' => true,
            'suggestions' => $filtered,
        ]);
    }

    #[Route('/api/candidate/profile/ai-confirm', name: 'candidate_profile_ai_confirm', methods: ['POST'])]
    public function confirm(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
    ): JsonResponse {
        $user = $this->candidate($request, $jwtEncoder, $entityManager);
        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return $this->json(['message' => 'A valid JSON body is required.'], 400);
        }

        $profileFields = $data['profileFields'] ?? [];
        $practicalAbilities = $data['practicalAbilities'] ?? [];
        $disabilityNames = $data['disabilities'] ?? [];
        $taskSkills = $data['taskSkills'] ?? [];
        $positionInterests = $data['positionInterests'] ?? [];
        if (!is_array($profileFields) || !is_array($practicalAbilities) || !is_array($disabilityNames) || !is_array($taskSkills) || !is_array($positionInterests)) {
            return $this->json(['message' => 'Confirmed suggestions have an invalid format.'], 400);
        }
        if (array_key_exists('replaceDisabilities', $data) && !is_bool($data['replaceDisabilities'])) {
            return $this->json(['message' => 'replaceDisabilities must be a boolean.'], 400);
        }

        $profile = $user->getCandidateProfile();
        if (!$profile) {
            $profile = (new CandidateProfile())->setUser($user);
            $entityManager->persist($profile);
        }

        foreach ($profileFields as $field => $rawValue) {
            if (!array_key_exists($field, self::PROFILE_FIELD_LIMITS) || !is_string($rawValue)) {
                return $this->json(['message' => 'A confirmed profile field is invalid.'], 400);
            }
            $value = trim($rawValue);
            if ($value === '' || mb_strlen($value) > self::PROFILE_FIELD_LIMITS[$field]) {
                return $this->json(['message' => "The confirmed {$field} value is invalid."], 400);
            }
            $setter = 'set' . ucfirst($field);
            $profile->{$setter}($value);
        }

        if (array_key_exists('educationLevel', $data) && $data['educationLevel'] !== null) {
            if (!is_string($data['educationLevel']) || !in_array($data['educationLevel'], self::EDUCATION_LEVELS, true)) {
                return $this->json(['message' => 'The confirmed education level is invalid.'], 400);
            }
            $profile->setEducationLevel($data['educationLevel']);
        }

        foreach ($practicalAbilities as $field => $value) {
            if (!in_array($field, self::PRACTICAL_ABILITY_FIELDS, true) || !is_string($value) || !in_array($value, self::PRACTICAL_ABILITY_LEVELS, true)) {
                return $this->json(['message' => 'A confirmed practical ability is invalid.'], 400);
            }
            $setter = 'set' . ucfirst($field);
            $profile->{$setter}($value);
        }

        if (array_key_exists('opportunityPreference', $data) && $data['opportunityPreference'] !== null) {
            if (!is_string($data['opportunityPreference']) || !in_array($data['opportunityPreference'], self::OPPORTUNITY_PREFERENCES, true)) {
                return $this->json(['message' => 'The confirmed opportunity preference is invalid.'], 400);
            }
            $profile->setOpportunityPreference($data['opportunityPreference']);
        }

        foreach ($positionInterests as $item) {
            $definitionId = is_array($item) ? ($item['jobDefinitionId'] ?? null) : null;
            $knowledgeLevel = is_array($item) ? ($item['knowledgeLevel'] ?? null) : null;
            if (!is_int($definitionId) || ($knowledgeLevel !== null && (!is_string($knowledgeLevel) || !in_array($knowledgeLevel, self::PRACTICAL_ABILITY_LEVELS, true)))) {
                return $this->json(['message' => 'A confirmed position interest is invalid.'], 400);
            }
            $definition = $entityManager->getRepository(\App\Entity\JobDefinition::class)->find($definitionId);
            if (!$definition || !$definition->isActive()) {
                return $this->json(['message' => 'A confirmed position interest is unknown or inactive.'], 400);
            }
            $interest = $entityManager->getRepository(CandidatePositionInterest::class)->findOneBy([
                'candidateProfile' => $profile,
                'jobDefinition' => $definition,
            ]) ?? (new CandidatePositionInterest())->setJobDefinition($definition);
            $interest->setKnowledgeLevel($knowledgeLevel);
            $profile->addPositionInterest($interest);
            $entityManager->persist($interest);
        }

        $confirmedDisabilities = [];
        foreach (array_unique($disabilityNames) as $name) {
            if (!is_string($name)) {
                return $this->json(['message' => 'A confirmed disability is invalid.'], 400);
            }
            $disability = $entityManager->getRepository(Disability::class)->findOneBy([
                'name' => $name,
                'active' => true,
            ]);
            if (!$disability) {
                return $this->json(['message' => "Unknown or inactive disability: {$name}"], 400);
            }
            $confirmedDisabilities[] = $disability;
        }
        if (($data['replaceDisabilities'] ?? false) === true) {
            $profile->replaceDisabilities($confirmedDisabilities);
        }

        foreach ($taskSkills as $confirmedSkill) {
            if (!is_array($confirmedSkill) || !is_int($confirmedSkill['taskId'] ?? null)) {
                return $this->json(['message' => 'A confirmed task skill is invalid.'], 400);
            }
            $task = $entityManager->getRepository(JobDefinitionTask::class)->find($confirmedSkill['taskId']);
            if (!$task || !$task->getJobDefinition()?->isActive()) {
                return $this->json(['message' => 'A confirmed task is unknown or inactive.'], 400);
            }
            $note = trim((string) ($confirmedSkill['note'] ?? ''));
            if (mb_strlen($note) > 500) {
                return $this->json(['message' => 'A confirmed task note is too long.'], 400);
            }

            $skill = $entityManager->getRepository(CandidateTaskSkill::class)->findOneBy([
                'candidateProfile' => $profile,
                'task' => $task,
            ]) ?? (new CandidateTaskSkill())
                ->setCandidateProfile($profile)
                ->setTask($task);
            $skill
                ->setNote($note !== '' ? $note : null)
                ->setSource('ai_confirmed')
                ->setConfirmedAt(new \DateTimeImmutable());
            $profile->addTaskSkill($skill);
            $entityManager->persist($skill);
        }

        $profile->setUpdatedAt(new \DateTimeImmutable());
        $language = in_array($data['language'] ?? null, ['en', 'fr', 'ar'], true)
            ? $data['language']
            : 'und';
        $this->recordEvent($entityManager, $user, 'suggestions_confirmed', $language, [
            'confirmedCounts' => [
                'profileFields' => count($profileFields),
                'educationLevel' => isset($data['educationLevel']) && $data['educationLevel'] !== null ? 1 : 0,
                'practicalAbilities' => count($practicalAbilities),
                'opportunityPreference' => isset($data['opportunityPreference']) && $data['opportunityPreference'] !== null ? 1 : 0,
                'positionInterests' => count($positionInterests),
                'disabilities' => count(array_unique($disabilityNames)),
                'taskSkills' => count($taskSkills),
            ],
        ]);
        $entityManager->flush();

        return $this->json([
            'message' => 'Your confirmed suggestions were added to your profile.',
            'profile' => $this->serializeProfile($user, $profile),
        ]);
    }

    private function candidate(
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        EntityManagerInterface $entityManager,
    ): User|JsonResponse {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }
        try {
            $decoded = $jwtEncoder->decode($token);
        } catch (\Throwable) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }
        $identifier = $decoded['username'] ?? null;
        if (!is_string($identifier) || $identifier === '') {
            return $this->json(['message' => 'Invalid token payload.'], 401);
        }
        $user = $entityManager->getRepository(User::class)->findOneBy(['email' => $identifier])
            ?? $entityManager->getRepository(User::class)->findOneBy(['username' => $identifier]);
        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }
        if (
            in_array('ROLE_EMPLOYER', $user->getRoles(), true)
            || in_array('ROLE_ADMIN', $user->getRoles(), true)
            || in_array('ROLE_VERIFIER', $user->getRoles(), true)
        ) {
            return $this->json(['message' => 'Candidate access is required.'], 403);
        }
        return $user;
    }

    /** Keep only catalogue-backed suggestions even if an upstream response is malformed. */
    private function filterSuggestions(array $result, array $disabilities, array $tasks): array
    {
        $allowedDisabilities = array_fill_keys(
            array_map(static fn (Disability $item): string => (string) $item->getName(), $disabilities),
            true,
        );
        $allowedTasks = [];
        $allowedJobs = [];
        foreach ($tasks as $task) {
            $allowedTasks[$task->getId()] = $task;
            $definition = $task->getJobDefinition();
            if ($definition) {
                $allowedJobs[$definition->getId()] = $definition;
            }
        }

        $profileFields = [];
        $seenFields = [];
        foreach (is_array($result['profile_fields'] ?? null) ? $result['profile_fields'] : [] as $item) {
            $field = is_array($item) ? ($item['field'] ?? '') : '';
            $value = is_array($item) ? ($item['value'] ?? null) : null;
            if (
                !array_key_exists($field, self::PROFILE_FIELD_LIMITS)
                || !is_string($value)
                || trim($value) === ''
                || mb_strlen(trim($value)) > self::PROFILE_FIELD_LIMITS[$field]
                || isset($seenFields[$field])
            ) {
                continue;
            }
            $seenFields[$field] = true;
            $profileFields[] = [
                'field' => $field,
                'value' => trim($value),
                'confidence' => $this->confidence($item['confidence'] ?? null),
                'evidence' => $this->boundedText($item['evidence'] ?? '', 500),
            ];
        }
        $education = $result['education_level'] ?? null;
        if (!is_array($education) || !in_array($education['value'] ?? null, self::EDUCATION_LEVELS, true)) {
            $education = null;
        } else {
            $education = [
                'value' => $education['value'],
                'confidence' => $this->confidence($education['confidence'] ?? null),
                'evidence' => $this->boundedText($education['evidence'] ?? '', 500),
            ];
        }
        $practicalAbilities = [];
        $seenAbilities = [];
        foreach (is_array($result['practical_abilities'] ?? null) ? $result['practical_abilities'] : [] as $item) {
            $field = is_array($item) ? ($item['field'] ?? null) : null;
            $value = is_array($item) ? ($item['value'] ?? null) : null;
            if (!in_array($field, self::PRACTICAL_ABILITY_FIELDS, true) || !in_array($value, self::PRACTICAL_ABILITY_LEVELS, true) || isset($seenAbilities[$field])) {
                continue;
            }
            $seenAbilities[$field] = true;
            $practicalAbilities[] = [
                'field' => $field,
                'value' => $value,
                'confidence' => $this->confidence($item['confidence'] ?? null),
                'evidence' => $this->boundedText($item['evidence'] ?? '', 500),
            ];
        }
        $opportunityPreference = $result['opportunity_preference'] ?? null;
        if (!is_array($opportunityPreference) || !in_array($opportunityPreference['value'] ?? null, self::OPPORTUNITY_PREFERENCES, true)) {
            $opportunityPreference = null;
        } else {
            $opportunityPreference = [
                'value' => $opportunityPreference['value'],
                'confidence' => $this->confidence($opportunityPreference['confidence'] ?? null),
                'evidence' => $this->boundedText($opportunityPreference['evidence'] ?? '', 500),
            ];
        }
        $positionInterests = [];
        $seenJobs = [];
        foreach (is_array($result['position_interests'] ?? null) ? $result['position_interests'] : [] as $item) {
            $definitionId = is_array($item) ? ($item['job_definition_id'] ?? null) : null;
            $knowledgeLevel = is_array($item) ? ($item['knowledge_level'] ?? null) : null;
            if (!is_int($definitionId) || !isset($allowedJobs[$definitionId]) || isset($seenJobs[$definitionId]) || ($knowledgeLevel !== null && !in_array($knowledgeLevel, self::PRACTICAL_ABILITY_LEVELS, true))) {
                continue;
            }
            $seenJobs[$definitionId] = true;
            $positionInterests[] = [
                'jobDefinitionId' => $definitionId,
                'jobName' => $allowedJobs[$definitionId]->getName(),
                'knowledgeLevel' => $knowledgeLevel,
                'confidence' => $this->confidence($item['confidence'] ?? null),
                'evidence' => $this->boundedText($item['evidence'] ?? '', 500),
            ];
        }
        $suggestedDisabilities = [];
        $seenDisabilities = [];
        foreach (is_array($result['disabilities'] ?? null) ? $result['disabilities'] : [] as $item) {
            if (
                !is_array($item)
                || ($item['explicit_statement'] ?? false) !== true
                || !isset($allowedDisabilities[$item['name'] ?? ''])
                || isset($seenDisabilities[$item['name']])
            ) {
                continue;
            }
            $seenDisabilities[$item['name']] = true;
            $suggestedDisabilities[] = [
                'name' => $item['name'],
                'confidence' => $this->confidence($item['confidence'] ?? null),
                'evidence' => $this->boundedText($item['evidence'] ?? '', 500),
                'explicit_statement' => true,
            ];
        }
        $taskSkills = [];
        $seenTasks = [];
        foreach (is_array($result['task_skills'] ?? null) ? $result['task_skills'] : [] as $item) {
            $taskId = is_array($item) ? ($item['task_id'] ?? null) : null;
            if (!is_int($taskId) || !isset($allowedTasks[$taskId]) || isset($seenTasks[$taskId])) {
                continue;
            }
            $seenTasks[$taskId] = true;
            $task = $allowedTasks[$taskId];
            $taskSkills[] = [
                'task_id' => $taskId,
                'task_name' => $task->getName(),
                'job_name' => $task->getJobDefinition()?->getName(),
                'confidence' => $this->confidence($item['confidence'] ?? null),
                'evidence' => $this->boundedText($item['evidence'] ?? '', 500),
                'note' => $this->boundedText($item['note'] ?? '', 500) ?: null,
            ];
        }

        return [
            'language' => $result['language'] ?? 'und',
            'profileFields' => $profileFields,
            'educationLevel' => $education,
            'practicalAbilities' => $practicalAbilities,
            'opportunityPreference' => $opportunityPreference,
            'positionInterests' => $positionInterests,
            'disabilities' => $suggestedDisabilities,
            'taskSkills' => $taskSkills,
            'unmappedStatements' => array_values(array_filter(array_map(
                fn ($item): string => $this->boundedText($item, 500),
                array_slice(
                    is_array($result['unmapped_statements'] ?? null)
                        ? $result['unmapped_statements']
                        : [],
                    0,
                    10,
                ),
            ))),
        ];
    }

    private function confidence(mixed $value): float
    {
        return is_numeric($value) ? max(0.0, min(1.0, (float) $value)) : 0.0;
    }

    private function boundedText(mixed $value, int $limit): string
    {
        return mb_substr(trim(is_string($value) ? $value : ''), 0, $limit);
    }

    private function serializeProfile(User $user, CandidateProfile $profile): array
    {
        return [
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'selectedDisabilities' => $profile->getSelectedDisabilities(),
            'educationLevel' => $profile->getEducationLevel(),
            'readingAbility' => $profile->getReadingAbility(),
            'writingAbility' => $profile->getWritingAbility(),
            'numeracyAbility' => $profile->getNumeracyAbility(),
            'firstName' => $profile->getFirstName(),
            'lastName' => $profile->getLastName(),
            'phone' => $profile->getPhone(),
            'location' => $profile->getLocation(),
            'about' => $profile->getAbout(),
            'opportunityPreference' => $profile->getOpportunityPreference(),
            'positionInterests' => array_values($profile->getPositionInterests()->map(static function ($interest): array {
                $definition = $interest->getJobDefinition();
                return [
                    'jobDefinitionId' => $definition?->getId(),
                    'slug' => $definition?->getSlug(),
                    'name' => $definition?->getName(),
                    'knowledgeLevel' => $interest->getKnowledgeLevel(),
                ];
            })->toArray()),
            'confirmedTaskSkills' => $profile->getTaskSkills()->map(static function (CandidateTaskSkill $skill): array {
                $task = $skill->getTask();
                return [
                    'taskId' => $task?->getId(),
                    'taskName' => $task?->getName(),
                    'jobName' => $task?->getJobDefinition()?->getName(),
                    'note' => $skill->getNote(),
                    'source' => $skill->getSource(),
                    'confirmedAt' => $skill->getConfirmedAt()->format(\DateTimeInterface::ATOM),
                ];
            })->toArray(),
            'updatedAt' => $profile->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    private function recordEvent(
        EntityManagerInterface $entityManager,
        User $candidate,
        string $eventType,
        string $language,
        array $details,
    ): void {
        $event = (new CandidateProfileAiEvent())
            ->setCandidate($candidate)
            ->setEventType($eventType)
            ->setLanguage($language)
            ->setDetails($details);
        $entityManager->persist($event);
    }
}
