<?php

namespace App\Controller;

use App\Entity\EmployerProfile;
use App\Entity\User;
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
        echo("Profile changed");
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

    private function uploadLogo(UploadedFile $file): string
    {
        $allowedMimeTypes = ['image/jpeg', 'image/png'];

        if (!in_array($file->getMimeType(), $allowedMimeTypes, true)) {
            throw new \RuntimeException('Logo must be an image file.');
        }

        if ($file->getSize() > 3 * 1024 * 1024) {
            throw new \RuntimeException('Logo image must be smaller than 3MB.');
        }

        $uploadDir = $this->getParameter('kernel.project_dir') . '/public/uploads/employer-logos';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0775, true);
        }

        $extension = $file->guessExtension() ?: 'png';
        $fileName = uniqid('employer_logo_', true) . '.' . $extension;

        $file->move($uploadDir, $fileName);

        return '/uploads/employer-logos/' . $fileName;
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
                    $profile->setLogoUrl($this->uploadLogo($logoFile));
                } catch (\RuntimeException $e) {
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