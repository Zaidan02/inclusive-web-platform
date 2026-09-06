<?php

namespace App\Controller;

use App\Entity\EmployerProfile;
use App\Entity\User;
use App\Service\EmployerLogoStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class EmployerProfileController extends AbstractController
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
            $decodedToken['id'] ?? null,
        ];

        foreach ($possibleValues as $value) {
            if (!$value) continue;

            if (is_numeric($value)) {
                $user = $userRepository->find((int) $value);
                if ($user instanceof User) return $user;
            }

            $user = $userRepository->findOneBy(['email' => (string) $value]);
            if ($user instanceof User) return $user;

            $user = $userRepository->findOneBy(['username' => (string) $value]);
            if ($user instanceof User) return $user;
        }

        return null;
    }

    private function formatProfile(EmployerProfile $profile): array
    {
        return [
            'id' => $profile->getId(),
            'companyName' => $profile->getCompanyName(),
            'industry' => $profile->getIndustry(),
            'location' => $profile->getLocation(),
            'website' => $profile->getWebsite(),
            'logoUrl' => $profile->getLogoUrl(),
            'description' => $profile->getDescription(),
            'accessibilityStatement' => $profile->getAccessibilityStatement(),
            'updatedAt' => $profile->getUpdatedAt()?->format('Y-m-d H:i:s'),
        ];
    }

    private function getOrCreateProfile(User $employer, EntityManagerInterface $entityManager): EmployerProfile
    {
        $profile = $employer->getEmployerProfile();

        if (!$profile) {
            $profile = new EmployerProfile();
            $profile->setUser($employer);
            $employer->setEmployerProfile($profile);
            $entityManager->persist($profile);
        }

        return $profile;
    }

    #[Route('/api/employer/profile', name: 'api_employer_profile_get', methods: ['GET'])]
    public function getProfile(
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

        $profile = $this->getOrCreateProfile($employer, $entityManager);
        $entityManager->flush();

        return $this->json([
            'profile' => $this->formatProfile($profile),
        ]);
    }

    #[Route('/api/employer/profile', name: 'api_employer_profile_update', methods: ['POST', 'PATCH'])]
    public function updateProfile(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        EmployerLogoStorage $logoStorage
    ): JsonResponse {
        $employerCheck = $this->verifyEmployer($request, $jwtEncoder);

        if ($employerCheck instanceof JsonResponse) {
            return $employerCheck;
        }

        $employer = $this->getEmployerFromToken($employerCheck, $entityManager);

        if (!$employer) {
            return $this->json(['message' => 'Employer user not found.'], 404);
        }

        $profile = $this->getOrCreateProfile($employer, $entityManager);

        $contentType = $request->headers->get('Content-Type', '');

        if (str_contains($contentType, 'multipart/form-data')) {
            $profile->setCompanyName(trim((string) $request->request->get('companyName')) ?: null);
            $profile->setIndustry(trim((string) $request->request->get('industry')) ?: null);
            $profile->setLocation(trim((string) $request->request->get('location')) ?: null);
            $profile->setWebsite(trim((string) $request->request->get('website')) ?: null);
            $profile->setDescription(trim((string) $request->request->get('description')) ?: null);
            $profile->setAccessibilityStatement(trim((string) $request->request->get('accessibilityStatement')) ?: null);

            $logoFile = $request->files->get('logo');

            if ($logoFile instanceof UploadedFile) {
                try {
                    $profile->setLogoUrl($logoStorage->store($logoFile));
                } catch (\InvalidArgumentException|\RuntimeException $e) {
                    return $this->json(['message' => $e->getMessage()], 400);
                }
            }
        } else {
            $data = json_decode($request->getContent(), true);

            if (!is_array($data)) {
                return $this->json(['message' => 'Invalid request body.'], 400);
            }

            $profile->setCompanyName(trim((string) ($data['companyName'] ?? '')) ?: null);
            $profile->setIndustry(trim((string) ($data['industry'] ?? '')) ?: null);
            $profile->setLocation(trim((string) ($data['location'] ?? '')) ?: null);
            $profile->setWebsite(trim((string) ($data['website'] ?? '')) ?: null);
            $profile->setDescription(trim((string) ($data['description'] ?? '')) ?: null);
            $profile->setAccessibilityStatement(trim((string) ($data['accessibilityStatement'] ?? '')) ?: null);

            if (array_key_exists('logoUrl', $data)) {
                $profile->setLogoUrl(trim((string) $data['logoUrl']) ?: null);
            }
        }

        $profile->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->flush();

        return $this->json([
            'message' => 'Employer profile saved successfully.',
            'profile' => $this->formatProfile($profile),
        ]);
    }
}
