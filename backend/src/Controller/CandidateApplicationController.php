<?php

namespace App\Controller;

use App\Entity\JobApplication;
use App\Entity\JobPost;
use App\Entity\User;
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

        return $user;
    }

    private function saveUploadedFile(UploadedFile $file, string $uploadDir): string
    {
        $extension = strtolower($file->guessExtension() ?: $file->getClientOriginalExtension());

        if (!in_array($extension, ['pdf', 'doc', 'docx'], true)) {
            throw new \RuntimeException('Only PDF, DOC, and DOCX files are allowed.');
        }

        $fileName = uniqid('application_', true) . '.' . $extension;
        $file->move($uploadDir, $fileName);

        return $fileName;
    }

    #[Route('/api/candidate/jobs/{id}/apply', name: 'candidate_apply_job', methods: ['POST'])]
    public function apply(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
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

        if ($job->isCvRequired() && !$applicationDocument) {
            return $this->json(['message' => 'Application document is required.'], 400);
        }

        if ($job->isCoverLetterRequired() && !$recommendationLetter) {
            return $this->json(['message' => 'Recommendation letter is required.'], 400);
        }

        $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/applications';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        $application = new JobApplication();
        $application->setCandidate($candidate);
        $application->setJobPost($job);
        $application->setStatus('pending');

        try {
            if ($applicationDocument instanceof UploadedFile) {
                $application->setApplicationFileName($this->saveUploadedFile($applicationDocument, $uploadDir));
                $application->setApplicationOriginalName($applicationDocument->getClientOriginalName());
            }

            if ($recommendationLetter instanceof UploadedFile) {
                $application->setRecommendationFileName($this->saveUploadedFile($recommendationLetter, $uploadDir));
                $application->setRecommendationOriginalName($recommendationLetter->getClientOriginalName());
            }
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], 400);
        }

        $entityManager->persist($application);
        $entityManager->flush();

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
                ];
            }, $applications),
        ]);
    }
}
