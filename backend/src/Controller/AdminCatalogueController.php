<?php

namespace App\Controller;

use App\Entity\DisabilityTaskAssessment;
use App\Entity\JobDefinition;
use App\Entity\JobDefinitionTask;
use App\Service\JobCatalogueImporter;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Process\Exception\ProcessFailedException;
use Symfony\Component\Routing\Attribute\Route;

final class AdminCatalogueController extends AbstractController
{
    #[Route('/api/admin/job-catalogue', name: 'api_admin_job_catalogue_list', methods: ['GET'])]
    public function list(
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $authError = $this->verifyAdmin($request, $jwtEncoder);
        if ($authError) {
            return $authError;
        }

        $definitions = $entityManager->getRepository(JobDefinition::class)->findBy([], ['name' => 'ASC']);

        return $this->json([
            'datasets' => array_map(fn (JobDefinition $definition): array => $this->formatDataset($definition), $definitions),
        ]);
    }

    #[Route('/api/admin/job-catalogue/{id}', name: 'api_admin_job_catalogue_show', requirements: ['id' => '\\d+'], methods: ['GET'])]
    public function show(
        int $id,
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        EntityManagerInterface $entityManager
    ): JsonResponse {
        $authError = $this->verifyAdmin($request, $jwtEncoder);
        if ($authError) {
            return $authError;
        }

        $definition = $entityManager->getRepository(JobDefinition::class)->find($id);
        if (!$definition) {
            return $this->json(['message' => 'Catalogue dataset not found.'], 404);
        }

        $dataset = $this->formatDataset($definition);
        $dataset['tasks'] = array_map(
            fn (JobDefinitionTask $task): array => $this->formatTask($task),
            $definition->getTasks()->toArray()
        );

        return $this->json(['dataset' => $dataset]);
    }

    #[Route('/api/admin/job-catalogue/import', name: 'api_admin_job_catalogue_import', methods: ['POST'])]
    public function import(
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        JobCatalogueImporter $importer
    ): JsonResponse {
        $authError = $this->verifyAdmin($request, $jwtEncoder);
        if ($authError) {
            return $authError;
        }

        $files = $request->files->all('workbooks');
        if ($files instanceof UploadedFile) {
            $files = [$files];
        }
        $files = array_values(array_filter((array) $files, fn ($file) => $file instanceof UploadedFile));

        try {
            $summary = $importer->import($files);
            return $this->json([
                'message' => sprintf(
                    'Imported %d job definition(s), %d task(s), and %d assessment(s).',
                    $summary['jobsImported'],
                    $summary['tasksImported'],
                    $summary['assessmentsImported']
                ),
                'summary' => $summary,
            ], 201);
        } catch (\InvalidArgumentException|\DomainException $error) {
            return $this->json(['message' => $error->getMessage()], 422);
        } catch (ProcessFailedException $error) {
            return $this->json([
                'message' => 'The workbook could not be parsed.',
                'details' => trim($error->getProcess()->getErrorOutput()),
            ], 422);
        } catch (\JsonException|\RuntimeException $error) {
            return $this->json(['message' => $error->getMessage()], 422);
        }
    }

    private function verifyAdmin(Request $request, JWTEncoderInterface $jwtEncoder): ?JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $decoded = $jwtEncoder->decode($token);
        } catch (\Throwable) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }

        $roles = $decoded['roles'] ?? [];
        if (!in_array('ROLE_ADMIN', $roles, true) && !in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Access denied. Admin role required.'], 403);
        }

        return null;
    }

    /** @return array<string, mixed> */
    private function formatDataset(JobDefinition $definition): array
    {
        $assessmentCount = 0;
        $sourceSheets = [];
        foreach ($definition->getTasks() as $task) {
            $assessmentCount += $task->getAssessments()->count();
            foreach ($task->getAssessments() as $assessment) {
                if ($assessment->getSourceSheet()) {
                    $sourceSheets[$assessment->getSourceSheet()] = true;
                }
            }
        }

        $description = $definition->getDescription();
        $sourceWorkbook = null;
        if ($description && preg_match('/^Catalogue definition imported from (.+)\.$/u', $description, $matches)) {
            $sourceWorkbook = $matches[1];
        }

        return [
            'id' => $definition->getId(),
            'name' => $definition->getName(),
            'slug' => $definition->getSlug(),
            'description' => $description,
            'sourceWorkbook' => $sourceWorkbook,
            'active' => $definition->isActive(),
            'taskCount' => $definition->getTasks()->count(),
            'assessmentCount' => $assessmentCount,
            'sourceSheets' => array_values(array_keys($sourceSheets)),
        ];
    }

    /** @return array<string, mixed> */
    private function formatTask(JobDefinitionTask $task): array
    {
        $counts = [
            DisabilityTaskAssessment::FEASIBLE => 0,
            DisabilityTaskAssessment::NEEDS_ASSISTANCE => 0,
            DisabilityTaskAssessment::AVOID => 0,
        ];
        $sourceSheets = [];
        foreach ($task->getAssessments() as $assessment) {
            $feasibility = $assessment->getFeasibility();
            if (isset($counts[$feasibility])) {
                ++$counts[$feasibility];
            }
            if ($assessment->getSourceSheet()) {
                $sourceSheets[$assessment->getSourceSheet()] = true;
            }
        }

        return [
            'id' => $task->getId(),
            'key' => $task->getTaskKey(),
            'name' => $task->getName(),
            'position' => $task->getPosition(),
            'weight' => $task->getWeight(),
            'mandatory' => $task->isMandatory(),
            'category' => $this->isPersonalEducationInput($task->getName()) ? 'personal_education' : 'operational',
            'assessmentCount' => $task->getAssessments()->count(),
            'assessmentCounts' => [
                'feasible' => $counts[DisabilityTaskAssessment::FEASIBLE],
                'needsAssistance' => $counts[DisabilityTaskAssessment::NEEDS_ASSISTANCE],
                'avoid' => $counts[DisabilityTaskAssessment::AVOID],
            ],
            'sourceSheets' => array_values(array_keys($sourceSheets)),
        ];
    }

    private function isPersonalEducationInput(?string $taskName): bool
    {
        $name = strtolower(trim((string) $taskName));

        return in_array($name, ['write', 'read', 'count', 'personal education'], true)
            || (str_starts_with($name, 'basic ') && str_ends_with($name, ' knowledge to position'));
    }
}
