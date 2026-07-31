<?php

namespace App\Controller;

use App\Entity\CandidateProfile;
use App\Entity\Disability;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class CandidateProfileController extends AbstractController
{
    private function serializeProfile(User $user, ?CandidateProfile $profile): array
    {
        return [
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'selectedDisabilities' => $profile ? $profile->getSelectedDisabilities() : [],
            'educationLevel' => $profile?->getEducationLevel(),
            'firstName' => $profile?->getFirstName(),
            'lastName' => $profile?->getLastName(),
            'phone' => $profile?->getPhone(),
            'location' => $profile?->getLocation(),
            'about' => $profile?->getAbout(),
            'confirmedTaskSkills' => $profile
                ? $profile->getTaskSkills()->map(static function ($skill): array {
                    $task = $skill->getTask();
                    return [
                        'taskId' => $task?->getId(),
                        'taskName' => $task?->getName(),
                        'jobName' => $task?->getJobDefinition()?->getName(),
                        'note' => $skill->getNote(),
                        'source' => $skill->getSource(),
                        'confirmedAt' => $skill->getConfirmedAt()->format(\DateTimeInterface::ATOM),
                    ];
                })->toArray()
                : [],
            'updatedAt' => $profile && $profile->getUpdatedAt()
                ? $profile->getUpdatedAt()->format('Y-m-d H:i:s')
                : null,
        ];
    }

    private function getUserFromToken(
        Request $request,
        JWTEncoderInterface $jwtEncoder,
        EntityManagerInterface $entityManager
    ): User|JsonResponse {
        $token = $request->headers->get('X-Auth-Token');

        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $decodedToken = $jwtEncoder->decode($token);
        } catch (\Throwable $e) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }

        $identifier = $decodedToken['username'] ?? null;

        if (!$identifier) {
            return $this->json(['message' => 'Invalid token payload.'], 401);
        }

        $user = $entityManager
            ->getRepository(User::class)
            ->findOneBy(['email' => $identifier]);

        if (!$user) {
            $user = $entityManager
                ->getRepository(User::class)
                ->findOneBy(['username' => $identifier]);
        }

        if (!$user) {
            return $this->json(['message' => 'User not found.'], 404);
        }

        return $user;
    }

    #[Route('/api/candidate/profile', name: 'candidate_profile_get', methods: ['GET'])]
    public function getProfile(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $user = $this->getUserFromToken($request, $jwtEncoder, $entityManager);

        if ($user instanceof JsonResponse) {
            return $user;
        }

        $profile = $user->getCandidateProfile();

        return $this->json(['profile' => $this->serializeProfile($user, $profile)]);
    }

    #[Route('/api/candidate/profile', name: 'candidate_profile_update', methods: ['PATCH'])]
    public function updateProfile(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder
    ): JsonResponse {
        $user = $this->getUserFromToken($request, $jwtEncoder, $entityManager);

        if ($user instanceof JsonResponse) {
            return $user;
        }

        $data = json_decode($request->getContent(), true);

        if (!isset($data['selectedDisabilities']) || !is_array($data['selectedDisabilities'])) {
            return $this->json([
                'message' => 'selectedDisabilities must be an array.'
            ], 400);
        }

        $selectedDisabilities = [];
        foreach (array_unique($data['selectedDisabilities']) as $name) {
            $disability = $entityManager->getRepository(Disability::class)->findOneBy(['name' => $name]);
            if (!$disability || !$disability->isActive()) {
                return $this->json(['message' => "Unknown or inactive disability: {$name}"], 400);
            }
            $selectedDisabilities[] = $disability;
        }

        $educationLevels = ['none', 'primary', 'middle_school', 'high_school', 'vocational', 'university'];
        $educationLevel = $data['educationLevel'] ?? null;
        if (!is_string($educationLevel) || !in_array($educationLevel, $educationLevels, true)) {
            return $this->json(['message' => 'Select a valid education level.'], 400);
        }
        foreach (['firstName', 'lastName', 'location'] as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') return $this->json(['message' => "$field is required."], 400);
        }
        if (mb_strlen(trim((string) $data['firstName'])) > 100 || mb_strlen(trim((string) $data['lastName'])) > 100 || mb_strlen(trim((string) $data['location'])) > 255) {
            return $this->json(['message' => 'Candidate profile information is too long.'], 400);
        }

        $profile = $user->getCandidateProfile();

        if (!$profile) {
            $profile = new CandidateProfile();
            $profile->setUser($user);
        }

        $profile->replaceDisabilities($selectedDisabilities);
        $profile->setEducationLevel($educationLevel);
        $profile->setFirstName(trim((string) $data['firstName']));
        $profile->setLastName(trim((string) $data['lastName']));
        $profile->setPhone(trim((string) ($data['phone'] ?? '')) ?: null);
        $profile->setLocation(trim((string) $data['location']));
        $profile->setAbout(trim((string) ($data['about'] ?? '')) ?: null);
        $profile->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($profile);
        $entityManager->flush();

        return $this->json([
            'message' => 'Profile saved successfully.',
            'profile' => $this->serializeProfile($user, $profile),
        ]);
    }
}
