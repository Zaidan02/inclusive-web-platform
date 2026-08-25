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

class AdminApplicationController extends AbstractController
{
    private function verifyAdmin(Request $request, JWTEncoderInterface $jwtEncoder): array|JsonResponse
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

        if (!in_array('ROLE_ADMIN', $roles, true) && !in_array('ROLE_SUPER_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Access denied. Admin role required.'], 403);
        }

        return $decodedToken;
    }

    private function getAdminFromToken(array $decodedToken, EntityManagerInterface $entityManager): ?User
    {
        $userRepository = $entityManager->getRepository(User::class);

        $possibleValues = [
            $decodedToken['sub'] ?? null,
            $decodedToken['username'] ?? null,
            $decodedToken['email'] ?? null,
            $decodedToken['user_identifier'] ?? null,
            $decodedToken['id'] ?? null,
        ];

        foreach ($possibleValues as $value) {
            if (!$value) {
                continue;
            }

            if (is_numeric($value)) {
                $user = $userRepository->find((int) $value);

                if ($user instanceof User) {
                    return $user;
                }
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

    private function formatApplication(JobApplication $application): array
    {
        $candidate = $application->getCandidate();
        $job = $application->getJobPost();

        return [
            'id' => $application->getId(),
            'candidateId' => $candidate?->getId(),
            'candidateName' => $candidate?->getUsername(),
            'candidateEmail' => $candidate?->getEmail(),
            'jobTitle' => $job?->getJobDefinition()?->getName(),
            'status' => $application->getStatus(),
            'positionKnowledgeLevel' => $application->getPositionKnowledgeLevel(),
            'compatibilityScore' => $application->getCompatibilityScore(),
            'compatibilityEligible' => $application->isCompatibilityEligible(),
            'applicationOriginalName' => $application->getApplicationOriginalName(),
            'hasApplicationDocument' => $application->getApplicationFileName() !== null,
            'recommendationOriginalName' => $application->getRecommendationOriginalName(),
            'hasRecommendationLetter' => $application->getRecommendationFileName() !== null,
            'createdAt' => $application->getCreatedAt()?->format('Y-m-d H:i:s'),
            'updatedAt' => $application->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    #[Route('/api/admin/applications', name: 'admin_applications_list', methods: ['GET'])]
    public function listApplications(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $admin = $this->getAdminFromToken($adminCheck, $entityManager);

        if (!$admin) {
            return $this->json(['message' => 'Admin user not found.'], 404);
        }

        $applications = $entityManager
            ->getRepository(JobApplication::class)
            ->findBy([], ['id' => 'DESC']);

        return $this->json([
            'applications' => array_map(
                fn (JobApplication $application) => $this->formatApplication($application),
                $applications
            ),
        ]);
    }

    #[Route('/api/admin/applications/{id}/download/{type}', name: 'admin_application_download', methods: ['GET'])]
    public function downloadFile(
        int $id,
        string $type,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        ApplicationDocumentStorage $documentStorage
    ): BinaryFileResponse|JsonResponse {
        $adminCheck = $this->verifyAdmin($request, $jwtEncoder);

        if ($adminCheck instanceof JsonResponse) {
            return $adminCheck;
        }

        $application = $entityManager
            ->getRepository(JobApplication::class)
            ->find($id);

        if (!$application) {
            return $this->json(['message' => 'Application not found.'], 404);
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

        $disposition = $request->query->get('download') === '1'
            ? ResponseHeaderBag::DISPOSITION_ATTACHMENT
            : ResponseHeaderBag::DISPOSITION_INLINE;

        $response->setContentDisposition($disposition, $originalName);
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
