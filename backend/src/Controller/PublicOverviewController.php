<?php

namespace App\Controller;

use App\Entity\JobDefinition;
use App\Entity\JobPost;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class PublicOverviewController extends AbstractController
{
    #[Route('/api/public-overview', name: 'api_public_overview', methods: ['GET'])]
    public function __invoke(EntityManagerInterface $entityManager, UserRepository $users): JsonResponse
    {
        $jobPosts = $entityManager->getRepository(JobPost::class);
        $jobDefinitions = $entityManager->getRepository(JobDefinition::class);
        $latestJobs = $jobPosts->findBy(['status' => 'published'], ['createdAt' => 'DESC', 'id' => 'DESC'], 6);

        $response = $this->json([
            'stats' => [
                'registeredCandidates' => $users->countActiveCandidates(),
                'publishedJobPosts' => $jobPosts->count(['status' => 'published']),
                'activeJobDescriptions' => $jobDefinitions->count(['active' => true]),
            ],
            'latestJobs' => array_map(static function (JobPost $job): array {
                $profile = $job->getEmployer()?->getEmployerProfile();

                return [
                    'id' => $job->getId(),
                    'title' => $job->getJobDefinition()?->getName(),
                    'companyName' => $profile?->getCompanyName(),
                    'location' => $job->getLocation(),
                    'jobType' => $job->getJobType(),
                    'workMode' => $job->getWorkMode(),
                    'createdAt' => $job->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                ];
            }, $latestJobs),
        ]);

        $response->setPublic();
        $response->setMaxAge(60);

        return $response;
    }
}
