<?php

namespace App\Controller;

use App\Entity\CandidateProfile;
use App\Entity\CandidatePositionInterest;
use App\Entity\Disability;
use App\Entity\JobDefinition;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

class CandidateProfileController extends AbstractController
{
    private const PRACTICAL_ABILITY_LEVELS = ['independent', 'with_support', 'not_yet'];
    private const OPPORTUNITY_PREFERENCES = ['work', 'training', 'both'];

    private function serializeProfile(User $user, ?CandidateProfile $profile): array
    {
        return [
            'username' => $user->getUsername(),
            'email' => $user->getEmail(),
            'selectedDisabilities' => $profile ? $profile->getSelectedDisabilities() : [],
            'educationLevel' => $profile?->getEducationLevel(),
            'readingAbility' => $profile?->getReadingAbility(),
            'writingAbility' => $profile?->getWritingAbility(),
            'numeracyAbility' => $profile?->getNumeracyAbility(),
            'firstName' => $profile?->getFirstName(),
            'lastName' => $profile?->getLastName(),
            'phone' => $profile?->getPhone(),
            'location' => $profile?->getLocation(),
            'about' => $profile?->getAbout(),
            'opportunityPreference' => $profile?->getOpportunityPreference() ?? 'both',
            'positionInterests' => $profile
                ? array_values($profile->getPositionInterests()->map(static function (CandidatePositionInterest $interest): array {
                    $definition = $interest->getJobDefinition();
                    return [
                        'jobDefinitionId' => $definition?->getId(),
                        'slug' => $definition?->getSlug(),
                        'name' => $definition?->getName(),
                        'knowledgeLevel' => $interest->getKnowledgeLevel(),
                    ];
                  })->toArray())
                : [],
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

        $roles = $user->getRoles();
        if (in_array('ROLE_EMPLOYER', $roles, true)
            || in_array('ROLE_ADMIN', $roles, true)
            || in_array('ROLE_VERIFIER', $roles, true)) {
            return $this->json(['message' => 'Candidate access is required.'], 403);
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
        $practicalAbilities = [];
        foreach (['readingAbility', 'writingAbility', 'numeracyAbility'] as $field) {
            $value = $data[$field] ?? null;
            if (!is_string($value) || !in_array($value, self::PRACTICAL_ABILITY_LEVELS, true)) {
                return $this->json(['message' => "$field must be independent, with_support, or not_yet."], 400);
            }
            $practicalAbilities[$field] = $value;
        }
        foreach (['firstName', 'lastName', 'location'] as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') return $this->json(['message' => "$field is required."], 400);
        }

        $opportunityPreference = (string) ($data['opportunityPreference'] ?? 'both');
        if (!in_array($opportunityPreference, self::OPPORTUNITY_PREFERENCES, true)) {
            return $this->json(['message' => 'opportunityPreference must be work, training, or both.'], 400);
        }

        $positionInterests = null;
        if (array_key_exists('positionInterests', $data)) {
            if (!is_array($data['positionInterests'])) {
                return $this->json(['message' => 'positionInterests must be an array.'], 400);
            }
            $positionInterests = [];
            $seenDefinitionIds = [];
            foreach ($data['positionInterests'] as $item) {
                $rawDefinitionId = is_array($item) ? ($item['jobDefinitionId'] ?? null) : null;
                if (!is_array($item) || (!is_int($rawDefinitionId) && !(is_string($rawDefinitionId) && ctype_digit($rawDefinitionId)))) {
                    return $this->json(['message' => 'Each position interest must identify a job definition.'], 400);
                }
                $definitionId = (int) $rawDefinitionId;
                if (isset($seenDefinitionIds[$definitionId])) {
                    return $this->json(['message' => 'Each interested position can be selected only once.'], 400);
                }
                $definition = $entityManager->getRepository(JobDefinition::class)->find($definitionId);
                if (!$definition || !$definition->isActive()) {
                    return $this->json(['message' => 'An interested position is unknown or inactive.'], 400);
                }
                $knowledgeLevel = $item['knowledgeLevel'] ?? null;
                if ($knowledgeLevel === '') $knowledgeLevel = null;
                if ($knowledgeLevel !== null && (!is_string($knowledgeLevel) || !in_array($knowledgeLevel, self::PRACTICAL_ABILITY_LEVELS, true))) {
                    return $this->json(['message' => 'Position knowledge must be independent, with_support, not_yet, or empty.'], 400);
                }
                $positionInterests[] = [$definition, $knowledgeLevel];
                $seenDefinitionIds[$definitionId] = true;
            }
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
        $profile->setReadingAbility($practicalAbilities['readingAbility']);
        $profile->setWritingAbility($practicalAbilities['writingAbility']);
        $profile->setNumeracyAbility($practicalAbilities['numeracyAbility']);
        $profile->setFirstName(trim((string) $data['firstName']));
        $profile->setLastName(trim((string) $data['lastName']));
        $profile->setPhone(trim((string) ($data['phone'] ?? '')) ?: null);
        $profile->setLocation(trim((string) $data['location']));
        $profile->setAbout(trim((string) ($data['about'] ?? '')) ?: null);
        $profile->setOpportunityPreference($opportunityPreference);
        if ($positionInterests !== null) {
            $requestedByDefinition = [];
            foreach ($positionInterests as [$definition, $knowledgeLevel]) {
                $requestedByDefinition[(int) $definition->getId()] = [$definition, $knowledgeLevel];
            }
            $existingByDefinition = [];
            foreach ($profile->getPositionInterests()->toArray() as $existingInterest) {
                $definitionId = (int) $existingInterest->getJobDefinition()?->getId();
                if (!isset($requestedByDefinition[$definitionId])) {
                    $profile->removePositionInterest($existingInterest);
                    continue;
                }
                $existingByDefinition[$definitionId] = $existingInterest;
            }
            foreach ($positionInterests as [$definition, $knowledgeLevel]) {
                $definitionId = (int) $definition->getId();
                $interest = $existingByDefinition[$definitionId] ?? (new CandidatePositionInterest())->setJobDefinition($definition);
                $interest->setKnowledgeLevel($knowledgeLevel);
                $profile->addPositionInterest($interest);
            }
        }
        $profile->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($profile);
        $entityManager->flush();

        return $this->json([
            'message' => 'Profile saved successfully.',
            'profile' => $this->serializeProfile($user, $profile),
        ]);
    }
}
