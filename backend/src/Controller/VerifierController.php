<?php

namespace App\Controller;

use App\Entity\CandidateVerificationRequest;
use App\Entity\User;
use App\Service\CandidateCardStorage;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Encoder\JWTEncoderInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Routing\Attribute\Route;

final class VerifierController extends AbstractController
{
    private function verifyAccess(Request $request, JWTEncoderInterface $jwt): array|JsonResponse
    {
        $token = $request->headers->get('X-Auth-Token');
        if (!$token) {
            return $this->json(['message' => 'Missing authentication token.'], 401);
        }

        try {
            $claims = $jwt->decode($token);
        } catch (\Throwable) {
            return $this->json(['message' => 'Invalid authentication token.'], 401);
        }

        $roles = $claims['roles'] ?? [];
        if (!in_array('ROLE_VERIFIER', $roles, true) && !in_array('ROLE_ADMIN', $roles, true)) {
            return $this->json(['message' => 'Authorized verifier access is required.'], 403);
        }

        return $claims;
    }

    private function findActor(array $claims, EntityManagerInterface $entityManager): ?User
    {
        $repository = $entityManager->getRepository(User::class);
        foreach (['sub', 'username', 'email', 'user_identifier', 'id'] as $claim) {
            $value = $claims[$claim] ?? null;
            if ($value === null || $value === '') {
                continue;
            }
            if (is_numeric($value) && ($user = $repository->find((int) $value)) instanceof User) {
                return $user;
            }
            foreach (['email', 'username'] as $field) {
                if (($user = $repository->findOneBy([$field => (string) $value])) instanceof User) {
                    return $user;
                }
            }
        }

        return null;
    }

    private function formatRequest(CandidateVerificationRequest $verification): array
    {
        $candidate = $verification->getCandidate();
        return [
            'id' => $verification->getId(),
            'candidate' => [
                'id' => $candidate?->getId(),
                'username' => $candidate?->getUsername(),
                'email' => $candidate?->getEmail(),
                'emailVerified' => $candidate?->isVerified(),
            ],
            'document' => [
                'originalName' => $verification->getDocumentOriginalName(),
                'mimeType' => $verification->getDocumentMimeType(),
                'size' => $verification->getDocumentSize(),
            ],
            'status' => $verification->getStatus(),
            'reviewer' => $verification->getReviewer()?->getUsername(),
            'reviewerNote' => $verification->getReviewerNote(),
            'submittedAt' => $verification->getSubmittedAt()?->format(DATE_ATOM),
            'reviewedAt' => $verification->getReviewedAt()?->format(DATE_ATOM),
        ];
    }

    #[Route('/api/verifier/requests', name: 'api_verifier_requests', methods: ['GET'])]
    public function list(
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwt
    ): JsonResponse {
        $access = $this->verifyAccess($request, $jwt);
        if ($access instanceof JsonResponse) {
            return $access;
        }

        $status = (string) $request->query->get('status', CandidateVerificationRequest::STATUS_PENDING);
        if ($status !== 'all' && !in_array($status, CandidateVerificationRequest::STATUSES, true)) {
            return $this->json(['message' => 'Invalid verification status filter.'], 400);
        }

        $repository = $entityManager->getRepository(CandidateVerificationRequest::class);
        $criteria = $status === 'all' ? [] : ['status' => $status];
        $items = $repository->findBy($criteria, ['submittedAt' => 'DESC']);
        $counts = [];
        foreach (CandidateVerificationRequest::STATUSES as $candidateStatus) {
            $counts[$candidateStatus] = $repository->count(['status' => $candidateStatus]);
        }

        return $this->json([
            'requests' => array_map(fn ($item) => $this->formatRequest($item), $items),
            'counts' => $counts,
        ]);
    }

    #[Route('/api/verifier/requests/{id}/document', name: 'api_verifier_request_document', methods: ['GET'], requirements: ['id' => '\\d+'])]
    public function document(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwt,
        CandidateCardStorage $storage
    ): Response {
        $access = $this->verifyAccess($request, $jwt);
        if ($access instanceof JsonResponse) {
            return $access;
        }

        $verification = $entityManager->getRepository(CandidateVerificationRequest::class)->find($id);
        if (!$verification instanceof CandidateVerificationRequest) {
            return $this->json(['message' => 'Verification request not found.'], 404);
        }

        $path = $storage->path((string) $verification->getDocumentStoredName());
        if (!is_file($path)) {
            return $this->json(['message' => 'The private verification document is unavailable.'], 404);
        }

        $response = new BinaryFileResponse($path);
        $response->headers->set('Content-Type', (string) $verification->getDocumentMimeType());
        $disposition = $request->query->getBoolean('download')
            ? ResponseHeaderBag::DISPOSITION_ATTACHMENT
            : ResponseHeaderBag::DISPOSITION_INLINE;
        $response->setContentDisposition(
            $disposition,
            (string) $verification->getDocumentOriginalName()
        );
        $response->headers->set('Cache-Control', 'private, no-store, max-age=0');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }

    #[Route('/api/verifier/requests/{id}', name: 'api_verifier_request_update', methods: ['PATCH'], requirements: ['id' => '\\d+'])]
    public function update(
        int $id,
        Request $request,
        EntityManagerInterface $entityManager,
        JWTEncoderInterface $jwt,
        MailerInterface $mailer
    ): JsonResponse {
        $access = $this->verifyAccess($request, $jwt);
        if ($access instanceof JsonResponse) {
            return $access;
        }

        $actor = $this->findActor($access, $entityManager);
        if (!$actor instanceof User) {
            return $this->json(['message' => 'Verifier account not found.'], 401);
        }

        $verification = $entityManager->getRepository(CandidateVerificationRequest::class)->find($id);
        if (!$verification instanceof CandidateVerificationRequest) {
            return $this->json(['message' => 'Verification request not found.'], 404);
        }

        $data = json_decode($request->getContent(), true);
        $status = is_array($data) ? ($data['status'] ?? null) : null;
        $note = is_array($data) ? trim((string) ($data['note'] ?? '')) : '';
        if (!in_array($status, [CandidateVerificationRequest::STATUS_APPROVED, CandidateVerificationRequest::STATUS_REJECTED], true)) {
            return $this->json(['message' => 'Status must be approved or rejected.'], 400);
        }
        if ($status === CandidateVerificationRequest::STATUS_REJECTED && $note === '') {
            return $this->json(['message' => 'Give the candidate a reason when rejecting a request.'], 400);
        }
        if (mb_strlen($note) > 2000) {
            return $this->json(['message' => 'The reviewer note must be 2,000 characters or fewer.'], 400);
        }

        $verification
            ->setStatus($status)
            ->setReviewer($actor)
            ->setReviewerNote($note !== '' ? $note : null)
            ->setReviewedAt(new \DateTimeImmutable());
        $entityManager->flush();

        $candidate = $verification->getCandidate();
        $notificationSent = false;
        if ($candidate instanceof User) {
            try {
                $approved = $status === CandidateVerificationRequest::STATUS_APPROVED;
                $body = $approved
                    ? "Your disability card was approved. If your email is verified, you can now sign in."
                    : "Your disability card could not be approved.\n\nReason: {$note}\n\nPlease contact platform support for help.";
                $mailer->send(
                    (new Email())
                        ->from($_ENV['MAILER_FROM'] ?? 'inclusive.web.platform@outlook.com')
                        ->to((string) $candidate->getEmail())
                        ->subject($approved ? 'Your candidate verification was approved' : 'Action needed for candidate verification')
                        ->text("Hello {$candidate->getUsername()},\n\n{$body}")
                );
                $notificationSent = true;
            } catch (\Throwable) {
                // The review decision remains saved even if email delivery is unavailable.
            }
        }

        return $this->json([
            'message' => $status === CandidateVerificationRequest::STATUS_APPROVED
                ? 'Candidate verification approved.'
                : 'Candidate verification rejected.',
            'notificationSent' => $notificationSent,
            'request' => $this->formatRequest($verification),
        ]);
    }
}
