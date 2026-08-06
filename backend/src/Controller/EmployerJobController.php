<?php

namespace App\Controller;

use App\Entity\JobDefinition;
use App\Entity\JobDefinitionTask;
use App\Entity\JobPost;
use App\Entity\JobPostHighlightedTask;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class EmployerJobController extends AbstractController
{
    private function employer(Request $request, JWTEncoderInterface $jwt, EntityManagerInterface $em): User|JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) return $this->json(['message' => 'Missing authentication token.'], 401);
        try { $claims = $jwt->decode($token); } catch (\Throwable) { return $this->json(['message' => 'Invalid authentication token.'], 401); }
        if (!in_array('ROLE_EMPLOYER', $claims['roles'] ?? [], true) && !in_array('ROLE_SUPER_ADMIN', $claims['roles'] ?? [], true)) {
            return $this->json(['message' => 'Employer role required.'], 403);
        }
        $identifier = $claims['username'] ?? $claims['email'] ?? $claims['sub'] ?? null;
        $user = $identifier ? $em->getRepository(User::class)->findOneBy(['email' => $identifier]) : null;
        $user ??= $identifier ? $em->getRepository(User::class)->findOneBy(['username' => $identifier]) : null;
        return $user ?: $this->json(['message' => 'Employer user not found.'], 404);
    }

    private function formatDefinition(JobDefinition $definition, bool $includeTasks = false): array
    {
        $data = ['id' => $definition->getId(), 'slug' => $definition->getSlug(), 'name' => $definition->getName(), 'description' => $definition->getDescription(), 'minimumEducationLevel' => $definition->getMinimumEducationLevel()];
        if ($includeTasks) {
            $data['tasks'] = array_map(static fn ($task) => ['id' => $task->getId(), 'taskName' => $task->getName(), 'position' => $task->getPosition(), 'weight' => $task->getWeight(), 'mandatory' => $task->isMandatory()], $definition->getTasks()->toArray());
        }
        return $data;
    }

    private function formatJob(JobPost $job): array
    {
        $definition = $job->getJobDefinition();
        $profile = $job->getEmployer()?->getEmployerProfile();
        return [
            'id' => $job->getId(), 'jobDefinitionId' => $definition?->getId(), 'title' => $definition?->getName(),
            'jobDefinition' => $definition ? $this->formatDefinition($definition) : null,
            'companyName' => $profile?->getCompanyName(), 'companyLogoUrl' => $profile?->getLogoUrl(),
            'employerProfile' => $profile ? ['companyName' => $profile->getCompanyName(), 'industry' => $profile->getIndustry(), 'location' => $profile->getLocation(), 'website' => $profile->getWebsite(), 'logoUrl' => $profile->getLogoUrl(), 'description' => $profile->getDescription(), 'accessibilityStatement' => $profile->getAccessibilityStatement()] : null,
            'location' => $job->getLocation(), 'jobType' => $job->getJobType(), 'workMode' => $job->getWorkMode(),
            'description' => $job->getDescription(), 'applicationDeadline' => $job->getApplicationDeadline()?->format('Y-m-d'),
            'cvRequired' => $job->isCvRequired(), 'coverLetterRequired' => $job->isCoverLetterRequired(),
            'assistanceAvailable' => $job->isAssistanceAvailable(), 'status' => $job->getStatus(),
            'createdAt' => $job->getCreatedAt()?->format('Y-m-d H:i:s'), 'updatedAt' => $job->getUpdatedAt()?->format('Y-m-d H:i:s'),
            'highlightedTasks' => array_map(static fn (JobPostHighlightedTask $highlight) => ['id' => $highlight->getTask()?->getId(), 'name' => $highlight->getTask()?->getName(), 'displayPosition' => $highlight->getDisplayPosition()], $job->getHighlightedTasks()->toArray()),
        ];
    }

    #[Route('/api/job-definitions', name: 'api_job_definitions', methods: ['GET'])]
    public function definitions(EntityManagerInterface $em): JsonResponse
    {
        $items = $em->getRepository(JobDefinition::class)->findBy(['active' => true], ['name' => 'ASC']);
        return $this->json(['jobs' => array_map(fn ($item) => $this->formatDefinition($item), $items)]);
    }

    #[Route('/api/employer/job-definitions/{id}', name: 'api_employer_job_definition', methods: ['GET'])]
    public function employerDefinition(int $id, Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $employer = $this->employer($request, $jwt, $em); if ($employer instanceof JsonResponse) return $employer;
        $definition = $em->getRepository(JobDefinition::class)->find($id);
        if (!$definition || !$definition->isActive()) return $this->json(['message' => 'Job definition not found.'], 404);
        return $this->json(['job' => $this->formatDefinition($definition, true)]);
    }

    private function applyPayload(JobPost $job, array $data, EntityManagerInterface $em): ?JsonResponse
    {
        foreach (['jobDefinitionId', 'location', 'jobType', 'workMode', 'description', 'applicationDeadline'] as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') return $this->json(['message' => "$field is required."], 400);
        }
        $definition = $em->getRepository(JobDefinition::class)->find((int) $data['jobDefinitionId']);
        if (!$definition || !$definition->isActive()) return $this->json(['message' => 'Select a valid active job from the catalogue.'], 400);
        $companyProfile = $job->getEmployer()?->getEmployerProfile();
        if (!$companyProfile || trim((string) $companyProfile->getCompanyName()) === '') return $this->json(['message' => 'Complete your company profile before posting a job.'], 400);
        $taskIds = array_values(array_unique(array_map('intval', is_array($data['highlightedTaskIds'] ?? null) ? $data['highlightedTaskIds'] : [])));
        if (count($taskIds) < 1) return $this->json(['message' => 'Select at least one important task.'], 400);
        $tasks = $em->getRepository(JobDefinitionTask::class)->findBy(['id' => $taskIds, 'jobDefinition' => $definition]);
        $tasksById = []; foreach ($tasks as $task) $tasksById[$task->getId()] = $task;
        if (count($tasksById) !== count($taskIds)) return $this->json(['message' => 'Every highlighted task must belong to the selected job.'], 400);
        try { $deadline = new \DateTimeImmutable($data['applicationDeadline']); } catch (\Throwable) { return $this->json(['message' => 'Invalid application deadline.'], 400); }
        $job->setJobDefinition($definition)->setLocation(trim($data['location']))
            ->setJobType(trim($data['jobType']))->setWorkMode(trim($data['workMode']))->setDescription(trim($data['description']))
            ->setApplicationDeadline($deadline)->setCvRequired(false)
            ->setCoverLetterRequired(false)
            ->setAssistanceAvailable((bool) ($data['assistanceAvailable'] ?? false))->setUpdatedAt(new \DateTimeImmutable());
        $job->clearHighlightedTasks();
        foreach ($taskIds as $position => $taskId) {
            $job->addHighlightedTask((new JobPostHighlightedTask())->setTask($tasksById[$taskId])->setDisplayPosition($position + 1));
        }
        return null;
    }

    #[Route('/api/employer/jobs', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $employer = $this->employer($request, $jwt, $em); if ($employer instanceof JsonResponse) return $employer;
        $data = json_decode($request->getContent(), true); if (!is_array($data)) return $this->json(['message' => 'Invalid request body.'], 400);
        $job = (new JobPost())->setEmployer($employer); if ($error = $this->applyPayload($job, $data, $em)) return $error;
        $em->persist($job); $em->flush(); return $this->json(['message' => 'Job posted successfully.', 'job' => $this->formatJob($job)], 201);
    }

    #[Route('/api/employer/jobs', methods: ['GET'])]
    public function mine(Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $employer = $this->employer($request, $jwt, $em); if ($employer instanceof JsonResponse) return $employer;
        return $this->json(['jobs' => array_map(fn ($job) => $this->formatJob($job), $em->getRepository(JobPost::class)->findBy(['employer' => $employer], ['id' => 'DESC']))]);
    }

    #[Route('/api/employer/jobs/{id}', methods: ['PUT'])]
    public function update(int $id, Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $employer = $this->employer($request, $jwt, $em); if ($employer instanceof JsonResponse) return $employer;
        $job = $em->getRepository(JobPost::class)->find($id); if (!$job) return $this->json(['message' => 'Job not found.'], 404);
        if ($job->getEmployer()?->getId() !== $employer->getId()) return $this->json(['message' => 'You cannot edit this job.'], 403);
        $data = json_decode($request->getContent(), true); if (!is_array($data)) return $this->json(['message' => 'Invalid request body.'], 400);
        if ($error = $this->applyPayload($job, $data, $em)) return $error; $em->flush();
        return $this->json(['message' => 'Job updated successfully.', 'job' => $this->formatJob($job)]);
    }

    #[Route('/api/employer/jobs/{id}', methods: ['DELETE'])]
    public function delete(int $id, Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $employer = $this->employer($request, $jwt, $em); if ($employer instanceof JsonResponse) return $employer;
        $job = $em->getRepository(JobPost::class)->find($id); if (!$job) return $this->json(['message' => 'Job not found.'], 404);
        if ($job->getEmployer()?->getId() !== $employer->getId()) return $this->json(['message' => 'You cannot delete this job.'], 403);
        $em->remove($job); $em->flush(); return $this->json(['message' => 'Job deleted successfully.']);
    }

    #[Route('/api/jobs', methods: ['GET'])]
    public function published(EntityManagerInterface $em): JsonResponse
    {
        return $this->json(['jobs' => array_map(fn ($job) => $this->formatJob($job), $em->getRepository(JobPost::class)->findBy(['status' => 'published'], ['id' => 'DESC']))]);
    }
}
