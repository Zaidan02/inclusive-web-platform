<?php

namespace App\Controller;

use App\Entity\ApplicationOutcomeEvent;
use App\Entity\JobApplication;
use App\Entity\JobPost;
use App\Entity\User;
use App\Service\ApplicationDocumentStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class CandidateApplicationController extends AbstractController
{
    private function getUserFromToken(Request $request, JWTEncoderInterface $jwtEncoder, EntityManagerInterface $entityManager): User|JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');

        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $decodedToken = $jwtEncoder->decode($token);
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }

        $identifier = $decodedToken['username'] ?? $decodedToken['email'] ?? $decodedToken['sub'] ?? null;

        if (!$identifier) {
            return $this->json(['message' => 'Invalid token payload.'], 401);
        }

        $user = $entityManager->getRepository(User::class)->findOneBy(['email' => $identifier]);

        if (!$user) {
            $user = $entityManager->getRepository(User::class)->findOneBy(['username' => $identifier]);
        }

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        $roles = $user->getRoles();
        if (in_array('ROLE_EMPLOYER', $roles, true)
            || in_array('ROLE_ADMIN', $roles, true)
            || in_array('ROLE_VERIFIER', $roles, true)) {
            return $this->json(['message' => 'Candidate access is required.'], 403);
        }

        return $user;
    }

    #[Route('/api/candidate/jobs/{id}/apply', name: 'candidate_apply_job', methods: ['POST'])]
    public function apply(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        ApplicationDocumentStorage $documentStorage
    ): JsonResponse {
        $candidate = $this->getUserFromToken($request, $jwtEncoder, $entityManager);

        if ($candidate instanceof JsonResponse) {
            return $candidate;
        }

        $job = $entityManager->getRepository(JobPost::class)->find($id);

        if (!$job) {
            return $this->json(['message' => 'Job not found.'], 404);
        }

        $existingApplication = $entityManager->getRepository(JobApplication::class)->findOneBy([
            'candidate' => $candidate,
            'jobPost' => $job,
        ]);

        if ($existingApplication) {
            return $this->json(['message' => 'You already applied to this job.'], 400);
        }

        $applicationDocument = $request->files->get('applicationDocument');
        $recommendationLetter = $request->files->get('recommendationLetter');

        $application = new JobApplication();
        $application->setCandidate($candidate);
        $application->setJobPost($job);
        $application->setStatus('pending');

        $storedNames = [];
        try {
            if ($applicationDocument instanceof UploadedFile) {
                $stored = $documentStorage->store($applicationDocument);
                $storedNames[] = $stored['storedName'];
                $application->setApplicationFileName($stored['storedName']);
                $application->setApplicationOriginalName($stored['originalName']);
            }

            if ($recommendationLetter instanceof UploadedFile) {
                $stored = $documentStorage->store($recommendationLetter);
                $storedNames[] = $stored['storedName'];
                $application->setRecommendationFileName($stored['storedName']);
                $application->setRecommendationOriginalName($stored['originalName']);
            }
            $entityManager->persist($application);
            $entityManager->persist(
                (new ApplicationOutcomeEvent())
                    ->setApplication($application)
                    ->setActor($candidate)
                    ->setPreviousStatus(null)
                    ->setNewStatus('pending')
                    ->setNotificationStatus('not_required')
            );
            $entityManager->flush();
        } catch (\InvalidArgumentException $e) {
            foreach ($storedNames as $storedName) {
                $documentStorage->delete($storedName);
            }
            return $this->json(['message' => $e->getMessage()], 400);
        } catch (\Throwable) {
            foreach ($storedNames as $storedName) {
                $documentStorage->delete($storedName);
            }
            return $this->json(['message' => 'The application could not be stored securely. Please try again.'], 500);
        }

        return $this->json([
            'message' => 'Application submitted successfully.',
        ], 201);
    }

    #[Route('/api/candidate/applications', name: 'candidate_my_applications', methods: ['GET'])]
    public function myApplications(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $candidate = $this->getUserFromToken($request, $jwtEncoder, $entityManager);

        if ($candidate instanceof JsonResponse) {
            return $candidate;
        }

        $applications = $entityManager->getRepository(JobApplication::class)->findBy(
            ['candidate' => $candidate],
            ['id' => 'DESC']
        );

        return $this->json([
            'applications' => array_map(function (JobApplication $application) {
                $job = $application->getJobPost();

                return [
                    'id' => $application->getId(),
                    'jobTitle' => $job?->getJobDefinition()?->getName(),
                    'companyName' => $job?->getEmployer()?->getEmployerProfile()?->getCompanyName(),
                    'companyLogoUrl' => $job?->getEmployer()?->getEmployerProfile()?->getLogoUrl(),
                    'location' => $job?->getLocation(),
                    'jobType' => $job?->getJobType(),
                    'status' => $application->getStatus(),
                    'createdAt' => $application->getCreatedAt()?->format('Y-m-d H:i:s'),
                    'statusUpdatedAt' => $application->getUpdatedAt()?->format('Y-m-d H:i:s'),
                ];
            }, $applications),
        ]);
    }
}
