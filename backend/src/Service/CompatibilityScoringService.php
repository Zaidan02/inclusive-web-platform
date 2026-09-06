<?php

namespace App\Service;

use App\Entity\JobDefinitionTask;
use App\Entity\JobPost;
use App\Entity\User;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class CompatibilityScoringService
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $scoringEngineUrl,
        private readonly string $scoringEngineToken,
        private readonly float $scoringEngineTimeout,
    ) {}

    /**
     * @param list<JobPost> $jobs
     * @param array<int, string> $positionKnowledgeByJob
     * @return list<array<string, mixed>>
     */
    public function score(User $candidate, array $jobs, array $positionKnowledgeByJob = []): array
    {
        $profile = $candidate->getCandidateProfile();
        if (!$profile) {
            throw new \InvalidArgumentException('Complete the candidate profile before calculating matches.');
        }

        $payload = [
            'candidate' => [
                'id' => $candidate->getId(),
                'educationLevel' => $profile->getEducationLevel(),
                'readingAbility' => $profile->getReadingAbility(),
                'writingAbility' => $profile->getWritingAbility(),
                'numeracyAbility' => $profile->getNumeracyAbility(),
                'disabilities' => array_map(static fn ($item) => $item->getSlug(), $profile->getDisabilities()->toArray()),
            ],
            'jobs' => [],
        ];

        foreach ($jobs as $job) {
            $payload['jobs'][] = $this->jobPayload($job);
        }

        // Ordinary discovery remains one request. Application scoring uses a per-job request
        // because position knowledge is declared for that specific vacancy.
        if ($positionKnowledgeByJob === []) {
            $response = $this->request($payload);
            return $response['results'] ?? [];
        }

        $results = [];
        foreach ($jobs as $job) {
            $candidatePayload = $payload['candidate'];
            if (isset($positionKnowledgeByJob[(int) $job->getId()])) {
                $candidatePayload['positionKnowledgeLevel'] = $positionKnowledgeByJob[(int) $job->getId()];
            }
            $response = $this->request(['candidate' => $candidatePayload, 'jobs' => [$this->jobPayload($job)]]);
            if (isset($response['results'][0])) $results[] = $response['results'][0];
        }
        return $results;
    }

    /** @return array<string, mixed> */
    private function request(array $payload): array
    {
        $options = [
            'json' => $payload,
            'timeout' => $this->scoringEngineTimeout,
        ];
        if ($this->scoringEngineToken !== '') {
            $options['headers'] = ['X-Scoring-Token' => $this->scoringEngineToken];
        }
        $response = $this->httpClient->request('POST', rtrim($this->scoringEngineUrl, '/') . '/score', $options);
        $status = $response->getStatusCode();
        $data = $response->toArray(false);
        if ($status >= 400) {
            throw new \RuntimeException((string) ($data['message'] ?? 'The scoring service rejected the request.'));
        }
        return $data;
    }

    /** @return array<string, mixed> */
    private function jobPayload(JobPost $job): array
    {
        $highlightedIds = array_map(static fn ($item) => $item->getTask()?->getId(), $job->getHighlightedTasks()->toArray());
        $definition = $job->getJobDefinition();
        $tasks = array_values(array_filter(
            $definition?->getTasks()->toArray() ?? [],
            fn (JobDefinitionTask $task) => !$this->isEducationalSkillTask($task)
        ));

        return [
            'id' => $job->getId(),
            'title' => $definition?->getName(),
            'minimumEducationLevel' => $job->getMinimumEducationLevel() ?? 'none',
            'educationRequirement' => $job->getEducationRequirement(),
            'readingRequirement' => $job->getReadingRequirement(),
            'writingRequirement' => $job->getWritingRequirement(),
            'numeracyRequirement' => $job->getNumeracyRequirement(),
            'positionKnowledgeRequirement' => $job->getPositionKnowledgeRequirement(),
            'assistanceAvailable' => $job->isAssistanceAvailable(),
            'tasks' => array_map(static function (JobDefinitionTask $task) use ($highlightedIds): array {
                $assessments = [];
                foreach ($task->getAssessments() as $assessment) {
                    $slug = $assessment->getDisability()?->getSlug();
                    if ($slug) $assessments[$slug] = $assessment->getFeasibility();
                }
                return [
                    'id' => $task->getId(),
                    'name' => $task->getName(),
                    'weight' => $task->getWeight(),
                    'mandatory' => $task->isMandatory(),
                    'highlighted' => in_array($task->getId(), $highlightedIds, true),
                    'assessments' => $assessments,
                ];
            }, $tasks),
        ];
    }

    private function isEducationalSkillTask(JobDefinitionTask $task): bool
    {
        $name = mb_strtolower(trim((string) $task->getName()));
        return in_array($name, ['write', 'read', 'count', 'personal education'], true)
            || (str_starts_with($name, 'basic ') && str_ends_with($name, ' knowledge to position'));
    }
}
