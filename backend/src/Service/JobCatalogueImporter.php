<?php

namespace App\Service;

use App\Entity\Disability;
use App\Entity\DisabilityTaskAssessment;
use App\Entity\JobDefinition;
use App\Entity\JobDefinitionTask;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\Process\Process;

final class JobCatalogueImporter
{
    private const MAX_FILE_BYTES = 10_000_000;

    public function __construct(private readonly EntityManagerInterface $entityManager)
    {
    }

    /**
     * @param list<UploadedFile> $files
     * @return array{jobsImported: int, tasksImported: int, assessmentsImported: int, disabilitiesCreated: int, warnings: list<string>, jobs: list<array<string, mixed>>}
     */
    public function import(array $files): array
    {
        if ($files === []) {
            throw new \InvalidArgumentException('Select at least one .xlsx workbook.');
        }

        $temporaryDirectory = sys_get_temp_dir() . '/join-catalogue-' . bin2hex(random_bytes(8));
        if (!mkdir($temporaryDirectory, 0700, true) && !is_dir($temporaryDirectory)) {
            throw new \RuntimeException('Could not create a temporary import directory.');
        }

        $paths = [];
        foreach ($files as $file) {
            if (!$file->isValid()) {
                throw new \InvalidArgumentException(sprintf('Upload failed for %s.', $file->getClientOriginalName()));
            }
            if (strtolower((string) $file->getClientOriginalExtension()) !== 'xlsx') {
                throw new \InvalidArgumentException('Only .xlsx workbooks are supported.');
            }
            if (($file->getSize() ?: 0) > self::MAX_FILE_BYTES) {
                throw new \InvalidArgumentException(sprintf('%s exceeds the 10 MB limit.', $file->getClientOriginalName()));
            }
            $safeName = basename(str_replace('\\', '/', $file->getClientOriginalName()));
            $target = $temporaryDirectory . '/' . $safeName;
            if (is_file($target)) {
                throw new \InvalidArgumentException(sprintf('The filename %s was selected more than once.', $safeName));
            }
            if (!copy($file->getPathname(), $target)) {
                throw new \RuntimeException(sprintf('Could not prepare %s for import.', $file->getClientOriginalName()));
            }
            $paths[] = $target;
        }

        try {
            $process = new Process(['python3', '/tools/extract_job_catalogue.py', '--stdout', ...$paths]);
            $process->setTimeout(60);
            $process->mustRun();

            $catalogue = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
            if (($catalogue['schemaVersion'] ?? null) !== 1 || !is_array($catalogue['jobs'] ?? null)) {
                throw new \RuntimeException('The workbook extractor returned an unsupported catalogue.');
            }
        } finally {
            foreach ($paths as $path) {
                @unlink($path);
            }
            @rmdir($temporaryDirectory);
        }

        return $this->entityManager->wrapInTransaction(
            fn (): array => $this->persistCatalogue($catalogue)
        );
    }

    /** @param array<string, mixed> $catalogue */
    private function persistCatalogue(array $catalogue): array
    {
        $jobRepository = $this->entityManager->getRepository(JobDefinition::class);
        foreach ($catalogue['jobs'] as $record) {
            if ($jobRepository->findOneBy(['slug' => $record['slug']])
                || $jobRepository->findOneBy(['name' => $record['name']])) {
                throw new \DomainException(sprintf(
                    'Job definition "%s" already exists. Existing catalogue data was not changed.',
                    $record['name']
                ));
            }
        }

        $disabilities = [];
        $disabilitiesCreated = 0;
        $disabilityRepository = $this->entityManager->getRepository(Disability::class);
        foreach ($catalogue['disabilities'] ?? [] as $record) {
            $disability = $disabilityRepository->findOneBy(['slug' => $record['slug']]);
            if (!$disability) {
                $disability = (new Disability())
                    ->setSlug($record['slug'])
                    ->setName($record['name'])
                    ->setActive(true);
                $this->entityManager->persist($disability);
                ++$disabilitiesCreated;
            }
            $disabilities[$record['slug']] = $disability;
        }

        $tasksImported = 0;
        $assessmentsImported = 0;
        $importedJobs = [];
        foreach ($catalogue['jobs'] as $jobRecord) {
            $job = (new JobDefinition())
                ->setSlug($jobRecord['slug'])
                ->setName($jobRecord['name'])
                ->setDescription(sprintf('Catalogue definition imported from %s.', $jobRecord['sourceWorkbook']))
                ->setMinimumEducationLevel('none')
                ->setActive(true);
            $this->entityManager->persist($job);

            $tasks = [];
            foreach ($jobRecord['tasks'] as $taskRecord) {
                $task = (new JobDefinitionTask())
                    ->setJobDefinition($job)
                    ->setTaskKey($taskRecord['key'])
                    ->setName($taskRecord['name'])
                    ->setPosition((int) $taskRecord['position'])
                    ->setWeight(1.0)
                    ->setMandatory(false);
                $tasks[$taskRecord['key']] = $task;
                $this->entityManager->persist($task);
                ++$tasksImported;
            }

            foreach ($jobRecord['assessments'] as $assessmentRecord) {
                $task = $tasks[$assessmentRecord['taskKey']] ?? null;
                $disability = $disabilities[$assessmentRecord['disability']] ?? null;
                if (!$task || !$disability) {
                    throw new \RuntimeException('An assessment references an unknown task or disability.');
                }
                $this->entityManager->persist(
                    (new DisabilityTaskAssessment())
                        ->setTask($task)
                        ->setDisability($disability)
                        ->setFeasibility($assessmentRecord['feasibility'])
                        ->setSourceSheet($assessmentRecord['sourceSheet'])
                        ->setSourceRow((int) $assessmentRecord['sourceRow'])
                );
                ++$assessmentsImported;
            }

            $importedJobs[] = [
                'name' => $jobRecord['name'],
                'sourceWorkbook' => $jobRecord['sourceWorkbook'],
                'taskCount' => count($jobRecord['tasks']),
                'assessmentCount' => count($jobRecord['assessments']),
                'matrixComplete' => (bool) ($jobRecord['matrix']['complete'] ?? false),
            ];
        }

        $this->entityManager->flush();

        return [
            'jobsImported' => count($catalogue['jobs']),
            'tasksImported' => $tasksImported,
            'assessmentsImported' => $assessmentsImported,
            'disabilitiesCreated' => $disabilitiesCreated,
            'warnings' => array_values($catalogue['warnings'] ?? []),
            'jobs' => $importedJobs,
        ];
    }
}
