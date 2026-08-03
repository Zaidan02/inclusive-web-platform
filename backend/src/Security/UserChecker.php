<?php

namespace App\Security;

use App\Entity\CandidateVerificationRequest;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Exception\CustomUserMessageAccountStatusException;
use Symfony\Component\Security\Core\User\UserCheckerInterface;
use Symfony\Component\Security\Core\User\UserInterface;

class UserChecker implements UserCheckerInterface
{
    public function checkPreAuth(UserInterface $user): void
    {
        if (!$user instanceof User) {
            return;
        }
    }

    public function checkPostAuth(UserInterface $user, ?TokenInterface $token = null): void
    {
        if (!$user instanceof User) {
            return;
        }

        if ($user->isArchived()) {
            throw new CustomUserMessageAccountStatusException('This account is archived.');
        }

        if (!$user->isVerified()) {
            throw new CustomUserMessageAccountStatusException('Verify your email before signing in.');
        }

        $roles = $user->getRoles();
        $isCandidate = !in_array('ROLE_EMPLOYER', $roles, true)
            && !in_array('ROLE_ADMIN', $roles, true)
            && !in_array('ROLE_VERIFIER', $roles, true);
        $verification = $user->getCandidateVerificationRequest();

        // Existing candidate accounts without a request are grandfathered. Every
        // candidate registered after this feature has a request and is gated here.
        if ($isCandidate && $verification !== null && !$verification->isApproved()) {
            $message = $verification->getStatus() === CandidateVerificationRequest::STATUS_REJECTED
                ? 'Your disability-card verification was not approved. Please contact support.'
                : 'Your disability card is awaiting approval by an authorized verifier.';
            throw new CustomUserMessageAccountStatusException($message);
        }
    }
}
