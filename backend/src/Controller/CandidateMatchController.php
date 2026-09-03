<?php

namespace App\Controller;

use App\Entity\JobPost;
use App\Entity\User;
use App\Service\CompatibilityScoringService;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

final class CandidateMatchController extends AbstractController
{
    public function __construct(private readonly CompatibilityScoringService $scoringService) {}

    #[Route('/api/candidate/matches', name: 'api_candidate_matches', methods: ['GET'])]
    public function matches(Request $request, EntityManagerInterface $em, JWTEncoderInterface $jwt): JsonResponse
    {
        $candidate = $this->candidate($request, $jwt, $em);
        if ($candidate instanceof JsonResponse) return $candidate;
        $profile = $candidate->getCandidateProfile();
        if (!$profile || !$profile->getEducationLevel() || !$profile->getReadingAbility() || !$profile->getWritingAbility() || !$profile->getNumeracyAbility() || $profile->getDisabilities()->isEmpty()) {
            return $this->json(['message' => 'Complete the candidate profile before calculating matches.'], 400);
        }

        $jobs = $em->getRepository(JobPost::class)->findBy(['status' => 'published'], ['id' => 'DESC']);
        try {
            $data = ['results' => $this->scoringService->score($candidate, $jobs)];
        } catch (\Throwable) {
            return $this->json(['message' => 'The scoring service is currently unavailable.'], 503);
        }

        $metadata = [];
        foreach ($jobs as $job) {
            $metadata[(string) $job->getId()] = ['companyName' => $job->getEmployer()?->getEmployerProfile()?->getCompanyName(), 'assistanceAvailable' => $job->isAssistanceAvailable()];
        }
        foreach ($data['results'] ?? [] as $index => $result) {
            $data['results'][$index] = array_merge($result, $metadata[(string) ($result['job_id'] ?? '')] ?? []);
        }
        return $this->json(['results' => $data['results'] ?? []]);
    }

    private function candidate(Request $request, JWTEncoderInterface $jwt, EntityManagerInterface $em): User|JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) return $this->json(['message' => 'Missing authentication token.'], 401);
        try { $claims = $jwt->decode($token); } catch (\Throwable) { return $this->json(['message' => 'Invalid authentication token.'], 401); }
        $identifier = $claims['username'] ?? $claims['email'] ?? null;
        $user = $identifier ? $em->getRepository(User::class)->findOneBy(['email' => $identifier]) : null;
        $user ??= $identifier ? $em->getRepository(User::class)->findOneBy(['username' => $identifier]) : null;
        if (!$user) return $this->json(['message' => 'Candidate user not found.'], 404);
        if (in_array('ROLE_EMPLOYER', $user->getRoles(), true) || in_array('ROLE_ADMIN', $user->getRoles(), true) || in_array('ROLE_VERIFIER', $user->getRoles(), true)) return $this->json(['message' => 'Candidate role required.'], 403);
        return $user;
    }

}
