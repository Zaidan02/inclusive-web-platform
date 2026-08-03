<?php

namespace App\Controller;

use App\Entity\JobApplication;
use App\Entity\User;
use App\Service\ApplicationDocumentStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Routing\Attribute\Route;

class EmployerApplicationController extends AbstractController
{
    private function verifyEmployer(Request $request, JWTEncoderInterface $jwtEncoder): array|JsonResponse
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

        $roles = $decodedToken['roles'] ?? [];

        if (!in_array('ROLE_EMPLOYER', $roles, true) && !in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Access denied. Employer role required.'], 403);
        }

        return $decodedToken;
    }

    private function getEmployerFromToken(array $decodedToken, EntityManagerInterface $entityManager): ?User
    {
        $userRepository = $entityManager->getRepository(User::class);

        $possibleValues = [
            $decodedToken['sub'] ?? null,
            $decodedToken['username'] ?? null,
            $decodedToken['email'] ?? null,
            $decodedToken['user_identifier'] ?? null,
        ];

        foreach ($possibleValues as $value) {
            if (!$value) {
                continue;
            }

            $user = $userRepository->findOneBy(['email' => (string) $value]);

            if ($user instanceof User) {
                return $user;
            }

            $user = $userRepository->findOneBy(['username' => (string) $value]);

            if ($user instanceof User) {
                return $user;
            }
        }

        return null;
    }

    private function employerOwnsApplication(JobApplication $application, User $employer): bool
    {
        return $application->getJobPost()?->getEmployer()?->getId() === $employer->getId()
            || in_array('ROLE_SUPER_ADMIN', $employer->getRoles(), true);
    }

    #[Route('/api/employer/applications', name: 'employer_applications_list', methods: ['GET'])]
    public function listApplications(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $employerCheck = $this->verifyEmployer($request, $jwtEncoder);

        if ($employerCheck instanceof JsonResponse) {
            return $employerCheck;
        }

        $employer = $this->getEmployerFromToken($employerCheck, $entityManager);

        if (!$employer) {
            return $this->json(['message' => 'Employer user not found.'], 404);
        }

        $applications = $entityManager->createQueryBuilder()
            ->select('a', 'j', 'c')
            ->from(JobApplication::class, 'a')
            ->join('a.jobPost', 'j')
            ->join('a.candidate', 'c')
            ->where('j.employer = :employer')
            ->setParameter('employer', $employer)
            ->orderBy('a.id', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->json([
            'applications' => array_map(function (JobApplication $application) {
                $candidate = $application->getCandidate();
                $job = $application->getJobPost();
                $profile = $candidate?->getCandidateProfile();

                return [
                    'id' => $application->getId(),
                    'candidateName' => $candidate?->getUsername(),
                    'candidateEmail' => $candidate?->getEmail(),
                    'candidateSelectedDisabilities' => $profile ? $profile->getSelectedDisabilities() : [],
                    'candidateEducationLevel' => $profile?->getEducationLevel(),
                    'candidateLocation' => $profile?->getLocation(),
                    'candidateAbout' => $profile?->getAbout(),
                    'jobTitle' => $job?->getJobDefinition()?->getName(),
                    'status' => $application->getStatus(),
                    'applicationOriginalName' => $application->getApplicationOriginalName(),
                    'hasApplicationDocument' => $application->getApplicationFileName() !== null,
                    'recommendationOriginalName' => $application->getRecommendationOriginalName(),
                    'hasRecommendationLetter' => $application->getRecommendationFileName() !== null,
                    'createdAt' => $application->getCreatedAt()?->format('Y-m-d H:i:s'),
                ];
            }, $applications),
        ]);
    }

    #[Route('/api/employer/applications/{id}/status', name: 'employer_application_status', methods: ['PATCH'])]
    public function updateStatus(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $employerCheck = $this->verifyEmployer($request, $jwtEncoder);

        if ($employerCheck instanceof JsonResponse) {
            return $employerCheck;
        }

        $employer = $this->getEmployerFromToken($employerCheck, $entityManager);

        if (!$employer) {
            return $this->json(['message' => 'Employer user not found.'], 404);
        }

        $application = $entityManager->getRepository(JobApplication::class)->find($id);

        if (!$application) {
            return $this->json(['message' => 'Application not found.'], 404);
        }

        if (!$this->employerOwnsApplication($application, $employer)) {
            return $this->json(['message' => 'You cannot update this application.'], 403);
        }

        $data = json_decode($request->getContent(), true);
        $status = $data['status'] ?? null;

        $allowedStatuses = ['pending', 'in_review', 'accepted', 'rejected'];

        if (!in_array($status, $allowedStatuses, true)) {
            return $this->json(['message' => 'Invalid status.'], 400);
        }

        $application->setStatus($status);
        $entityManager->flush();

        return $this->json([
            'message' => 'Application status updated successfully.',
            'status' => $application->getStatus(),
        ]);
    }

    #[Route('/api/employer/applications/{id}/download/{type}', name: 'employer_application_download', methods: ['GET'])]
    public function downloadFile(
        int $id,
        string $type,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        ApplicationDocumentStorage $documentStorage
    ): BinaryFileResponse|JsonResponse {
        $employerCheck = $this->verifyEmployer($request, $jwtEncoder);

        if ($employerCheck instanceof JsonResponse) {
            return $employerCheck;
        }

        $employer = $this->getEmployerFromToken($employerCheck, $entityManager);

        if (!$employer) {
            return $this->json(['message' => 'Employer user not found.'], 404);
        }

        $application = $entityManager->getRepository(JobApplication::class)->find($id);

        if (!$application) {
            return $this->json(['message' => 'Application not found.'], 404);
        }

        if (!$this->employerOwnsApplication($application, $employer)) {
            return $this->json(['message' => 'You cannot download this file.'], 403);
        }

        if ($type === 'application') {
            $storedName = $application->getApplicationFileName();
            $originalName = $application->getApplicationOriginalName() ?: 'application-document';
        } elseif ($type === 'recommendation') {
            $storedName = $application->getRecommendationFileName();
            $originalName = $application->getRecommendationOriginalName() ?: 'recommendation-letter';
        } else {
            return $this->json(['message' => 'Invalid file type.'], 400);
        }

        if (!$storedName) {
            return $this->json(['message' => 'File not provided.'], 404);
        }

        $filePath = $documentStorage->locate($storedName);
        if ($filePath === null) {
            return $this->json(['message' => 'File not found on server.'], 404);
        }

        $response = new BinaryFileResponse($filePath);
        $response->setContentDisposition(ResponseHeaderBag::DISPOSITION_INLINE, $originalName);
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }

    #[Route('/api/employer/applications/{id}', name: 'employer_application_delete', methods: ['DELETE'])]
    public function deleteApplication(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        ApplicationDocumentStorage $documentStorage
    ): JsonResponse {
        $employerCheck = $this->verifyEmployer($request, $jwtEncoder);

        if ($employerCheck instanceof JsonResponse) {
            return $employerCheck;
        }

        $employer = $this->getEmployerFromToken($employerCheck, $entityManager);

        if (!$employer) {
            return $this->json(['message' => 'Employer user not found.'], 404);
        }

        $application = $entityManager->getRepository(JobApplication::class)->find($id);

        if (!$application) {
            return $this->json(['message' => 'Application not found.'], 404);
        }

        if (!$this->employerOwnsApplication($application, $employer)) {
            return $this->json(['message' => 'You cannot delete this application.'], 403);
        }

        if ($application->getApplicationFileName()) {
            $documentStorage->delete($application->getApplicationFileName());
        }

        if ($application->getRecommendationFileName()) {
            $documentStorage->delete($application->getRecommendationFileName());
        }

        $entityManager->remove($application);
        $entityManager->flush();

        return $this->json([
            'message' => 'Application deleted successfully.',
        ]);
    }
}
