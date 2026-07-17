<?php

namespace App\Controller;

use App\Entity\CandidateProfile;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\HttpClient\HttpClientInterface;

class AiMatchController extends AbstractController
{
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

    #[Route('/api/candidate/ai-match', name: 'candidate_ai_match', methods: ['POST'])]
    public function getAiMatch(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwtEncoder,
        HttpClientInterface $httpClient
    ): JsonResponse {
        // Authenticate the user
        $user = $this->getUserFromToken($request, $jwtEncoder, $entityManager);

        if ($user instanceof JsonResponse) {
            return $user;
        }

        // Get disabilities from request body
        $data = json_decode($request->getContent(), true);

        if (!isset($data['disabilities']) || !is_array($data['disabilities'])) {
            return $this->json(['message' => 'disabilities must be an array.'], 400);
        }

        $disabilities = $data['disabilities'];

        try {
            // Call the Flask AI service
            $aiServiceUrl = $_ENV['AI_SERVICE_URL'] ?? 'http://127.0.0.1:5001/predict';
            $response = $httpClient->request('POST', $aiServiceUrl, [
                'json' => ['disabilities' => $disabilities],
                'timeout' => 10,
            ]);

            $aiResult = $response->toArray();

        } catch (\Throwable $e) {
            return $this->json([
                'message' => 'AI service unavailable. Please try again later.',
                'error'   => $e->getMessage(),
            ], 503);
        }

        // Save remaining abilities to the candidate profile
        $profile = $user->getCandidateProfile();

        if (!$profile) {
            $profile = new CandidateProfile();
            $profile->setUser($user);
        }

        $profile->setSelectedDisabilities($disabilities);
        $profile->setRemainingAbilities(
            $aiResult['results'][0]['remainingAbilities'] ?? []
        );
        $profile->setUpdatedAt(new \DateTimeImmutable());

        $entityManager->persist($profile);
        $entityManager->flush();

        // Return full AI results to the frontend
        return $this->json([
            'results'  => $aiResult['results'],
            'bestMatch'=> $aiResult['bestMatch'],
        ]);
    }
}
