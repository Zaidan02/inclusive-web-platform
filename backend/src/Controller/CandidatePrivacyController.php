<?php

namespace App\Controller;

use App\Entity\ConsentRecord;
use App\Entity\JobApplication;
use App\Entity\User;
use App\Privacy\PrivacyPolicy;
use App\Service\ApplicationDocumentStorage;
use App\Service\CandidateCardStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/candidate/privacy')]
final class CandidatePrivacyController extends AbstractController
{
    private function candidate(
        Request $request,
        JWTEncoderInterface $jwt,
        EntityManagerInterface $entityManager,
    ): User|JsonResponse {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }
        try {
            $claims = $jwt->decode($token);
        } catch (\Throwable) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }
        $repository = $entityManager->getRepository(User::class);
        foreach (['sub', 'username', 'email', 'user_identifier', 'id'] as $claim) {
            $value = $claims[$claim] ?? null;
            if ($value === null || $value === '') continue;
            if (is_numeric($value) && ($user = $repository->find((int) $value)) instanceof User) return $user;
            foreach (['email', 'username'] as $field) {
                if (($user = $repository->findOneBy([$field => (string) $value])) instanceof User) return $user;
            }
        }
        return $this->json(['message' => 'Candidate account not found.'], 401);
    }

    private function consentData(ConsentRecord $consent): array
    {
        return [
            'purpose' => $consent->getPurpose(),
            'policyVersion' => $consent->getPolicyVersion(),
            'details' => $consent->getDetails(),
            'grantedAt' => $consent->getGrantedAt()->format(DATE_ATOM),
            'withdrawnAt' => $consent->getWithdrawnAt()?->format(DATE_ATOM),
        ];
    }

    #[Route('', name: 'candidate_privacy_summary', methods: ['GET'])]
    public function summary(Request $request, EntityManagerInterface $entityManager, JWTEncoderInterface $jwt): JsonResponse
    {
        $candidate = $this->candidate($request, $jwt, $entityManager);
        if ($candidate instanceof JsonResponse) return $candidate;
        $verification = $candidate->getCandidateVerificationRequest();
        $consents = $entityManager->getRepository(ConsentRecord::class)->findBy(
            ['candidate' => $candidate],
            ['grantedAt' => 'DESC'],
        );

        return $this->json([
            'policy' => [
                'version' => PrivacyPolicy::VERSION,
                'cardRetentionDaysAfterReview' => PrivacyPolicy::CARD_RETENTION_DAYS_AFTER_REVIEW,
            ],
            'dataCategories' => [
                'account_contact',
                'candidate_profile',
                'applications_documents',
                'verification_temporary_card',
                'ai_consent_operational_events',
            ],
            'consents' => array_map(fn (ConsentRecord $consent) => $this->consentData($consent), $consents),
            'verificationDocument' => $verification === null ? null : [
                'status' => $verification->getStatus(),
                'available' => $verification->hasDocument(),
                'submittedAt' => $verification->getSubmittedAt()?->format(DATE_ATOM),
                'retentionUntil' => $verification->getDocumentRetentionUntil()?->format(DATE_ATOM),
                'deletedAt' => $verification->getDocumentDeletedAt()?->format(DATE_ATOM),
            ],
        ]);
    }

    #[Route('/export', name: 'candidate_privacy_export', methods: ['GET'])]
    public function export(Request $request, EntityManagerInterface $entityManager, JWTEncoderInterface $jwt): JsonResponse
    {
        $candidate = $this->candidate($request, $jwt, $entityManager);
        if ($candidate instanceof JsonResponse) return $candidate;
        $profile = $candidate->getCandidateProfile();
        $verification = $candidate->getCandidateVerificationRequest();
        $consents = $entityManager->getRepository(ConsentRecord::class)->findBy(['candidate' => $candidate]);
        $applications = $entityManager->getRepository(JobApplication::class)->findBy(['candidate' => $candidate]);

        $payload = [
            'exportedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
            'account' => [
                'id' => $candidate->getId(),
                'username' => $candidate->getUsername(),
                'email' => $candidate->getEmail(),
                'emailVerified' => $candidate->isVerified(),
                'roles' => $candidate->getRoles(),
            ],
            'profile' => $profile === null ? null : [
                'firstName' => $profile->getFirstName(),
                'lastName' => $profile->getLastName(),
                'phone' => $profile->getPhone(),
                'location' => $profile->getLocation(),
                'about' => $profile->getAbout(),
                'educationLevel' => $profile->getEducationLevel(),
                'readingAbility' => $profile->getReadingAbility(),
                'writingAbility' => $profile->getWritingAbility(),
                'numeracyAbility' => $profile->getNumeracyAbility(),
                'selectedDisabilities' => $profile->getSelectedDisabilities(),
                'taskSkills' => array_map(static fn ($skill) => [
                    'taskId' => $skill->getTask()?->getId(),
                    'taskName' => $skill->getTask()?->getName(),
                    'note' => $skill->getNote(),
                    'source' => $skill->getSource(),
                    'confirmedAt' => $skill->getConfirmedAt()->format(DATE_ATOM),
                ], $profile->getTaskSkills()->toArray()),
            ],
            'applications' => array_map(static fn (JobApplication $application) => [
                'id' => $application->getId(),
                'jobTitle' => $application->getJobPost()?->getJobDefinition()?->getName(),
                'status' => $application->getStatus(),
                'positionKnowledgeLevel' => $application->getPositionKnowledgeLevel(),
                'compatibilityScore' => $application->getCompatibilityScore(),
                'compatibilityEligible' => $application->isCompatibilityEligible(),
                'compatibilitySnapshot' => $application->getCompatibilitySnapshot(),
                'applicationDocumentOriginalName' => $application->getApplicationOriginalName(),
                'recommendationOriginalName' => $application->getRecommendationOriginalName(),
                'createdAt' => $application->getCreatedAt()?->format(DATE_ATOM),
                'updatedAt' => $application->getUpdatedAt()?->format(DATE_ATOM),
            ], $applications),
            'verification' => $verification === null ? null : [
                'status' => $verification->getStatus(),
                'submittedAt' => $verification->getSubmittedAt()?->format(DATE_ATOM),
                'reviewedAt' => $verification->getReviewedAt()?->format(DATE_ATOM),
                'documentAvailable' => $verification->hasDocument(),
                'documentRetentionUntil' => $verification->getDocumentRetentionUntil()?->format(DATE_ATOM),
                'documentDeletedAt' => $verification->getDocumentDeletedAt()?->format(DATE_ATOM),
            ],
            'consents' => array_map(fn (ConsentRecord $consent) => $this->consentData($consent), $consents),
        ];

        $response = $this->json($payload);
        $response->headers->set('Content-Disposition', 'attachment; filename="candidate-data-export.json"');
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        return $response;
    }

    #[Route('/ai-consent', name: 'candidate_privacy_withdraw_ai', methods: ['DELETE'])]
    public function withdrawAiConsent(Request $request, EntityManagerInterface $entityManager, JWTEncoderInterface $jwt): JsonResponse
    {
        $candidate = $this->candidate($request, $jwt, $entityManager);
        if ($candidate instanceof JsonResponse) return $candidate;
        $active = $entityManager->getRepository(ConsentRecord::class)->findBy([
            'candidate' => $candidate,
            'purpose' => PrivacyPolicy::PURPOSE_AI_PROFILE,
            'withdrawnAt' => null,
        ]);
        $now = new \DateTimeImmutable();
        foreach ($active as $consent) $consent->setWithdrawnAt($now);
        $entityManager->flush();
        return $this->json(['message' => 'AI profile consent was withdrawn. Future analysis requires new consent.', 'withdrawn' => count($active)]);
    }

    #[Route('/account', name: 'candidate_privacy_delete_account', methods: ['DELETE'])]
    public function deleteAccount(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwt,
        UserPasswordHasherInterface $passwordHasher,
        CandidateCardStorage $cardStorage,
        ApplicationDocumentStorage $documentStorage,
    ): JsonResponse {
        $candidate = $this->candidate($request, $jwt, $entityManager);
        if ($candidate instanceof JsonResponse) return $candidate;
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || ($data['confirmation'] ?? '') !== 'DELETE') {
            return $this->json(['message' => 'Type DELETE to confirm permanent account deletion.'], 400);
        }
        if (!$passwordHasher->isPasswordValid($candidate, (string) ($data['password'] ?? ''))) {
            return $this->json(['message' => 'The password is incorrect.'], 403);
        }

        foreach ($entityManager->getRepository(JobApplication::class)->findBy(['candidate' => $candidate]) as $application) {
            if ($application->getApplicationFileName()) $documentStorage->delete($application->getApplicationFileName());
            if ($application->getRecommendationFileName()) $documentStorage->delete($application->getRecommendationFileName());
            $entityManager->remove($application);
        }
        $verification = $candidate->getCandidateVerificationRequest();
        if ($verification?->hasDocument()) $cardStorage->delete((string) $verification->getDocumentStoredName());
        $entityManager->remove($candidate);
        $entityManager->flush();

        return $this->json(['message' => 'Your account and privately stored documents were deleted.']);
    }
}
